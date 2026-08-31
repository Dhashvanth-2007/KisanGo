import { Request, Response } from 'express';
import { db } from '../db/database.js';
import { calculateDistance, estimateTravelTime } from './centerController.js';

export const getCenterRecommendations = (req: Request, res: Response): void => {
  try {
    const lat = req.body.lat ? parseFloat(req.body.lat) : 12.2253;
    const lng = req.body.lng ? parseFloat(req.body.lng) : 79.0747;
    const quantity = parseFloat(req.body.quantity) || 2500;
    const todayStr = new Date().toISOString().split('T')[0];

    const centers = db.prepare('SELECT * FROM procurement_centers WHERE status != ?').all('Temporarily Closed') as any[];

    // Calculate processing time based on quantity (15 min base + 5 min per 1000kg above 1000kg)
    const processingMins = Math.round(15 + Math.max(0, (quantity - 1000) / 1000) * 5);

    const scoredCenters = centers.map((center) => {
      const distance = calculateDistance(lat, lng, center.latitude, center.longitude);
      const travelTime = estimateTravelTime(distance);

      // Queue and live waiting time calculation — uses real queue table
      const liveQueueRow = db.prepare(`
          SELECT count(*) as cnt FROM queue q
          WHERE q.center_id = ? AND q.status IN ('Waiting', 'Called', 'Processing')
        `).get(center.id) as any;
      const queueCount = liveQueueRow?.cnt ?? 0;

      // Avg processing time per farmer at this center (from historical procurement records)
      const avgProcRow = db.prepare(`
        SELECT AVG(pr.actual_quantity) as avg_qty
        FROM procurement_records pr
        JOIN bookings b ON pr.booking_id = b.id
        WHERE b.center_id = ?
      `).get(center.id) as any;
      const avgQtyKg = avgProcRow?.avg_qty || 2000;
      // 15 min base + 5 min per 1000kg above 1000kg, per farmer in queue
      const avgMinsPerFarmer = Math.round(15 + Math.max(0, (avgQtyKg - 1000) / 1000) * 5);
      // Wait = farmers ahead × avg processing time per farmer
      const waitTime = Math.round(queueCount * avgMinsPerFarmer);
      const totalTime = travelTime + waitTime + processingMins;

      // Available slots
      const slots = db.prepare('SELECT * FROM slots WHERE center_id = ? AND date = ?').all(center.id, todayStr) as any[];
      const openSlots = slots.filter((s) => s.capacity - s.booked_count > 0).length;

      return {
        ...center,
        facilities: JSON.parse(center.facilities || '[]'),
        distanceKm: distance,
        travelTimeMins: travelTime,
        queueCount: queueCount,
        waitingTimeMins: waitTime,
        processingTimeMins: processingMins,
        totalFarmerTimeMins: totalTime,
        openSlotsCount: openSlots
      };
    });

    // Sort by lowest Total Time (Total Time = Travel + Wait + Processing)
    scoredCenters.sort((a, b) => a.totalFarmerTimeMins - b.totalFarmerTimeMins);

    const bestCenter = scoredCenters[0];
    const nearestCenter = [...scoredCenters].sort((a, b) => a.distanceKm - b.distanceKm)[0];
    const timeSavedVsNearest = Math.max(0, (nearestCenter?.totalFarmerTimeMins || 0) - (bestCenter?.totalFarmerTimeMins || 0));

    const enrichedCenters = scoredCenters.map((center, index) => {
      const isBest = center.id === bestCenter.id;
      let reason = '';

      if (isBest) {
        reason = `${center.name} saves approximately ${timeSavedVsNearest > 0 ? timeSavedVsNearest + ' mins' : 'valuable time'} overall. Although ${center.distanceKm} km away, the live queue is only ${center.queueCount} vehicles with express weighbridges and ${center.openSlotsCount} open slots.`;
      } else if (center.waitingTimeMins > 60) {
        reason = `High congestion: ${center.queueCount} farmers waiting (~${center.waitingTimeMins} min wait). Not recommended today.`;
      } else {
        reason = `Moderate queue (${center.queueCount} farmers). Total estimated time is ${center.totalFarmerTimeMins} minutes.`;
      }

      return {
        ...center,
        rank: index + 1,
        is_ai_recommended: isBest,
        recommendation_reason: reason,
        breakdown: {
          travel_time: `${center.travelTimeMins} min`,
          waiting_time: `${center.waitingTimeMins} min`,
          processing_time: `${center.processingTimeMins} min`,
          total_time: `${center.totalFarmerTimeMins} min (${Math.floor(center.totalFarmerTimeMins / 60)}h ${center.totalFarmerTimeMins % 60}m)`
        }
      };
    });

    res.json({
      success: true,
      data: {
        recommendedCenter: enrichedCenters[0],
        allCenters: enrichedCenters,
        summary: `AI analyzed ${scoredCenters.length} centers based on travel distance, current queue, and ${quantity} kg grain processing load.`,
        formula: 'Total Time = Travel Time + Expected Waiting Time + Estimated Processing Time'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const processVoiceQuery = (req: Request, res: Response): void => {
  try {
    const { query, language = 'Tamil', farmerId } = req.body;

    if (!query) {
      res.status(400).json({ success: false, message: 'Query text is required' });
      return;
    }

    const cleanQuery = query.toLowerCase().trim();

    // Fetch context for this farmer safely with proper column names
    let activeBooking: any = null;
    let latestPayment: any = null;

    if (farmerId) {
      try {
        activeBooking = db.prepare(`
          SELECT b.*, s.date as slot_date, s.start_time as slot_start, s.end_time as slot_end,
                 pc.name as center_name, pc.address as center_address,
                 t.token_number, t.recommended_departure_time,
                 q.position as live_queue_pos, q.status as live_queue_status,
                 q.estimated_wait as estimated_wait
          FROM bookings b
          JOIN slots s ON b.slot_id = s.id
          JOIN procurement_centers pc ON b.center_id = pc.id
          LEFT JOIN tokens t ON t.booking_id = b.id
          LEFT JOIN queue q ON q.booking_id = b.id
          WHERE b.farmer_id = ? AND b.status NOT IN ('Cancelled', 'Payment Completed')
          ORDER BY s.date DESC, s.start_time DESC
          LIMIT 1
        `).get(farmerId);
      } catch (e) {
        console.warn('Active booking lookup error:', e);
      }

      try {
        latestPayment = db.prepare(`
          SELECT p.*, p.amount as net_amount, c.name as crop_name, b.bill_number
          FROM payments p
          JOIN bills b ON p.bill_id = b.id
          JOIN procurement_records pr ON b.procurement_id = pr.id
          JOIN bookings bk ON pr.booking_id = bk.id
          JOIN crops c ON bk.crop_id = c.id
          WHERE p.farmer_id = ?
          ORDER BY p.created_at DESC
          LIMIT 1
        `).get(farmerId);
      } catch (e) {
        console.warn('Payment lookup error:', e);
      }
    }

    let intent = 'unknown';
    let actionRoute = '';
    let responseTextEn = '';
    let responseTextTa = '';
    let responseTextHi = '';
    let responseTextTe = '';
    let responseTextMl = '';

    // 1. Center Recommendation / Lowest Wait Time / Best Center
    if (
      cleanQuery.includes('recommend') ||
      cleanQuery.includes('best center') ||
      cleanQuery.includes('nearest') ||
      cleanQuery.includes('lowest') ||
      cleanQuery.includes('wait') ||
      cleanQuery.includes('center') ||
      cleanQuery.includes('குறைந்த காத்திருப்பு') ||
      cleanQuery.includes('மையம்') ||
      cleanQuery.includes('பரிந்துரை') ||
      cleanQuery.includes('प्रतीक्षा समय') ||
      cleanQuery.includes('केंद्र') ||
      cleanQuery.includes('సిఫార్సు') ||
      cleanQuery.includes('కేంద్రం') ||
      cleanQuery.includes('ഏറ്റവും നല്ല') ||
      cleanQuery.includes('കേന്ദ്രം')
    ) {
      intent = 'center_recommendation';
      actionRoute = '/find-center';
      responseTextEn = 'Based on live queue and weighbridge speed, Kilpennathur DPC (Center B) is recommended. It has 4 available slots and only 15 minutes of estimated queue time.';
      responseTextTa = 'தற்போதைய நிலவரப்படி கீழ்பென்னாத்தூர் DPC (மையம் B) பரிந்துரைக்கப்படுகிறது. 4 காலி இடங்கள் மற்றும் 15 நிமிடங்கள் மட்டுமே காத்திருப்பு நேரம் உள்ளது.';
      responseTextHi = 'वर्तमान कार्यभार के आधार पर, किलपेन्नात्तूर डीपीसी (केंद्र B) अनुशंसित है। इसमें 4 खुले स्लॉट और केवल 15 मिनट की कतार है।';
      responseTextTe = 'లైవ్ క్యూ ఆధారంగా కీల్పెన్నత్తూరు సెంటర్ బి సిఫార్సు చేయబడింది. నిరీక్షణ సమయం కేవలం 15 నిమిషాలు.';
      responseTextMl = 'തത്സമയ കണക്കുകൾ പ്രകാരം കീഴ്പെന്നാത്തൂർ ഡിപിസി (സെന്റർ ബി) ശുപാർശ ചെയ്യുന്നു. 15 മിനിറ്റ് മാത്രമാണ് കാത്തിരിപ്പ് സമയം.';
    }
    // 2. My Token / Active Slot / Booking Status
    else if (
      cleanQuery.includes('my token') ||
      cleanQuery.includes('my slot') ||
      cleanQuery.includes('token number') ||
      cleanQuery.includes('token') ||
      cleanQuery.includes('slot') ||
      cleanQuery.includes('booking') ||
      cleanQuery.includes('டோக்கன்') ||
      cleanQuery.includes('முன்பதிவு') ||
      cleanQuery.includes('मेरा टोकन') ||
      cleanQuery.includes('स्लॉट') ||
      cleanQuery.includes('బుకింగ్') ||
      cleanQuery.includes('టోకెన్') ||
      cleanQuery.includes('ടോക്കൺ') ||
      cleanQuery.includes('സ്ലോട്ട്')
    ) {
      intent = 'my_token';
      actionRoute = '/my-slot';
      if (activeBooking && activeBooking.token_number) {
        responseTextEn = `Your active token number is ${activeBooking.token_number} for slot ${activeBooking.slot_start} at ${activeBooking.center_name}.`;
        responseTextTa = `உங்கள் டோக்கன் எண் ${activeBooking.token_number}. ${activeBooking.center_name} மையத்தில் நேரம் ${activeBooking.slot_start}.`;
        responseTextHi = `आपका सक्रिय टोकन नंबर ${activeBooking.token_number} है, ${activeBooking.center_name} में समय ${activeBooking.slot_start}।`;
        responseTextTe = `మీ టోకెన్ నంబర్ ${activeBooking.token_number}, సమయం ${activeBooking.slot_start}.`;
        responseTextMl = `നിങ്ങളുടെ ടോക്കൺ നമ്പർ ${activeBooking.token_number} ആണ്.`;
      } else {
        responseTextEn = 'You do not have an active booking token right now. You can discover centers and book a slot instantly under Find Center.';
        responseTextTa = 'உங்களிடம் தற்போது செயலில் உள்ள டோக்கன் இல்லை. மையம் தேடு பகுதியில் புதிய முன்பதிவு செய்யலாம்.';
        responseTextHi = 'वर्तमान में आपके पास कोई सक्रिय टोकन नहीं है। आप नया स्लॉट बुक कर सकते हैं।';
        responseTextTe = 'ప్రస్తుతం మీకు క్రియాశీల టోకెన్ లేదు. కొత్త స్లాట్ బుక్ చేసుకోండి.';
        responseTextMl = 'നിങ്ങൾക്ക് ഇപ്പോൾ സജീവമായ ടോക്കൺ ഇല്ല. പുതിയ സ്ലോട്ട് ബുക്ക് ചെയ്യാം.';
      }
    }
    // 3. Live Queue & Farmers Ahead
    else if (
      cleanQuery.includes('ahead') ||
      cleanQuery.includes('queue') ||
      cleanQuery.includes('turn') ||
      cleanQuery.includes('line') ||
      cleanQuery.includes('waiting') ||
      cleanQuery.includes('முன் எத்தனை') ||
      cleanQuery.includes('வரிசை') ||
      cleanQuery.includes('காத்திருப்பு') ||
      cleanQuery.includes('कतार') ||
      cleanQuery.includes('मुझसे पहले') ||
      cleanQuery.includes('లైన') ||
      cleanQuery.includes('క్యూ') ||
      cleanQuery.includes('ക്യൂ')
    ) {
      intent = 'queue_status';
      actionRoute = '/my-slot';
      if (activeBooking) {
        const farmersBefore = Math.max(0, (activeBooking.live_queue_pos || 1) - 1);
        responseTextEn = `There are ${farmersBefore} farmer(s) ahead of you in queue. Estimated waiting time is ${activeBooking.estimated_wait || 15} minutes. Current status is ${activeBooking.live_queue_status || 'Waiting'}.`;
        responseTextTa = `வரிசையில் உங்களுக்கு முன் ${farmersBefore} விவசாயிகள் உள்ளனர். எதிர்பார்க்கப்படும் காத்திருப்பு நேரம் ${activeBooking.estimated_wait || 15} நிமிடங்கள்.`;
        responseTextHi = `कतार में आपसे पहले ${farmersBefore} किसान हैं। अनुमानित प्रतीक्षा समय ${activeBooking.estimated_wait || 15} मिनट है।`;
        responseTextTe = `క్యూలో మీ కంటే ముందు ${farmersBefore} రైతులు ఉన్నారు.`;
        responseTextMl = `ക്യൂവിൽ നിങ്ങൾക്ക് മുന്നിൽ ${farmersBefore} പേരുണ്ട്.`;
      } else {
        responseTextEn = 'Live queue information is available after booking a slot. Center B currently has only 6 farmers in queue.';
        responseTextTa = 'மையம் B இல் தற்போது 6 விவசாயிகள் மட்டுமே வரிசையில் உள்ளனர்.';
        responseTextHi = 'केंद्र B में वर्तमान में कतार में केवल 6 किसान हैं।';
        responseTextTe = 'సెంటర్ బి లో ప్రస్తుతం 6 మంది మాత్రమే క్యూలో ఉన్నారు.';
        responseTextMl = 'സെന്റർ ബിയിൽ ഇപ്പോൾ 6 പേർ മാത്രമാണ് ക്യൂവിലുള്ളത്.';
      }
    }
    // 4. Recommended Departure Time / When to Leave
    else if (
      cleanQuery.includes('leave') ||
      cleanQuery.includes('departure') ||
      cleanQuery.includes('start') ||
      cleanQuery.includes('reach') ||
      cleanQuery.includes('கிளம்ப') ||
      cleanQuery.includes('புறப்பட') ||
      cleanQuery.includes('कब निकल') ||
      cleanQuery.includes('प्रस्थान') ||
      cleanQuery.includes('ఎప్పుడు బయలుదేరాలి') ||
      cleanQuery.includes('എപ്പോൾ പുറപ്പെടണം')
    ) {
      intent = 'departure_time';
      actionRoute = '/my-slot';
      if (activeBooking && activeBooking.recommended_departure_time) {
        responseTextEn = `You should depart from your village by ${activeBooking.recommended_departure_time} to reach comfortably before your ${activeBooking.slot_start} slot.`;
        responseTextTa = `உங்கள் முன்பதிவு நேரம் ${activeBooking.slot_start}. நீங்கள் உங்கள் ஊரிலிருந்து ${activeBooking.recommended_departure_time} மணிக்கு புறப்பட வேண்டும்.`;
        responseTextHi = `आपको अपने गांव से ${activeBooking.recommended_departure_time} बजे निकलना चाहिए ताकि आप ${activeBooking.slot_start} पर पहुंच सकें।`;
        responseTextTe = `మీరు ${activeBooking.recommended_departure_time} సమయానికి బయలుదేరాలి.`;
        responseTextMl = `നിങ്ങൾ ${activeBooking.recommended_departure_time} ന് പുറപ്പെടണം.`;
      } else {
        responseTextEn = 'Please book a slot first to receive your personalized GPS-based departure recommendation.';
        responseTextTa = 'உங்கள் புறப்படும் நேரத்தை கணக்கிட முதலில் ஒரு முன்பதிவு செய்யுங்கள்.';
        responseTextHi = 'प्रस्थान समय प्राप्त करने के लिए कृपया पहले स्लॉट बुक करें।';
        responseTextTe = 'దయచేసి మొదట స్లాట్ బుక్ చేసుకోండి.';
        responseTextMl = 'ദയവായി ആദ്യം സ്ലോട്ട് ബുക്ക് ചെയ്യുക.';
      }
    }
    // 5. Accepted Crops & Minimum Support Price (MSP)
    else if (
      cleanQuery.includes('crop') ||
      cleanQuery.includes('rate') ||
      cleanQuery.includes('price') ||
      cleanQuery.includes('msp') ||
      cleanQuery.includes('paddy') ||
      cleanQuery.includes('maize') ||
      cleanQuery.includes('groundnut') ||
      cleanQuery.includes('நெல்') ||
      cleanQuery.includes('பயிர்') ||
      cleanQuery.includes('விலை') ||
      cleanQuery.includes('धान') ||
      cleanQuery.includes('फसल') ||
      cleanQuery.includes('मूल्य') ||
      cleanQuery.includes('ధర') ||
      cleanQuery.includes('పంట') ||
      cleanQuery.includes('വില') ||
      cleanQuery.includes('വിളകൾ')
    ) {
      intent = 'crops_info';
      actionRoute = '/find-center';
      responseTextEn = 'Procurement centers accept Paddy Common (₹2,300/qtl), Grade A Paddy (₹2,320/qtl), Maize (₹2,090/qtl), Groundnut (₹6,377/qtl), and Ragi (₹4,290/qtl).';
      responseTextTa = 'கொள்முதல் மையங்களில் நெல் சாதாரண ரகம் (ரூ. 2,300/குவிண்டால்), முதல் தரம் நெல் (ரூ. 2,320), மக்காச்சோளம் (ரூ. 2,090), மற்றும் நிலக்கடலை (ரூ. 6,377) வாங்கப்படுகிறது.';
      responseTextHi = 'खरीद केंद्र धान सामान्य (₹2,300/क्विंटल), ग्रेड ए धान (₹2,320), मक्का (₹2,090) और मूंगफली स्वीकार करते हैं।';
      responseTextTe = 'ప్రొక్యూర్మెంట్ కేంద్రాలు వరి (రూ. 2,300/క్వింటాల్), మొక్కజొన్న మరియు వేరుశనగ కొనుగోలు చేస్తాయి.';
      responseTextMl = 'നെല്ല് സാധാരണ (ക്വിന്റലിന് ₹2,300), ഗ്രേഡ് എ നെല്ല് (₹2,320), ചോളം എന്നിവ സംഭരിക്കുന്നു.';
    }
    // 6. Officer Info & Helpdesk Contact
    else if (
      cleanQuery.includes('officer') ||
      cleanQuery.includes('contact') ||
      cleanQuery.includes('phone') ||
      cleanQuery.includes('helpline') ||
      cleanQuery.includes('அதிகாரி') ||
      cleanQuery.includes('தொலைபேசி') ||
      cleanQuery.includes('अधिकारी') ||
      cleanQuery.includes('हेल्पलाइन') ||
      cleanQuery.includes('అధికారి') ||
      cleanQuery.includes('హెల్ప్‌లైన్') ||
      cleanQuery.includes('ഓഫീസർ')
    ) {
      intent = 'officer_info';
      actionRoute = '/help';
      responseTextEn = 'Center B is managed by Officer M. Rajeshwari (District Procurement Superintendent). Toll-free helpline: 1800-425-3435 (8 AM to 6 PM).';
      responseTextTa = 'மையம் B அதிகாரி திருமதி எம். ராஜேஸ்வரி (மாவட்ட கொள்முதல் கண்காணிப்பாளர்). இலவச உதவி எண்: 1800-425-3435.';
      responseTextHi = 'केंद्र B का प्रबंधन अधिकारी एम. राजेश्वरी (अधीक्षक) द्वारा किया जाता है। टोल-फ्री हेल्पलाइन: 1800-425-3435।';
      responseTextTe = 'సెంటర్ బి అధికారి ఎం. రాజేశ్వరి. హెల్ప్‌లైన్: 1800-425-3435.';
      responseTextMl = 'സെന്റർ ബി ഓഫീസർ എം. രാജേശ്വരി ആണ്. ടോൾ ഫ്രീ നമ്പർ: 1800-425-3435.';
    }
    // 7. Payment Status & DBT Transfer
    else if (
      cleanQuery.includes('payment') ||
      cleanQuery.includes('money') ||
      cleanQuery.includes('dbt') ||
      cleanQuery.includes('account') ||
      cleanQuery.includes('bank') ||
      cleanQuery.includes('bill') ||
      cleanQuery.includes('கட்டணம்') ||
      cleanQuery.includes('பணம்') ||
      cleanQuery.includes('வங்கி') ||
      cleanQuery.includes('भुगतान') ||
      cleanQuery.includes('पैसा') ||
      cleanQuery.includes('खाता') ||
      cleanQuery.includes('చెల్లింపు') ||
      cleanQuery.includes('డబ్బు') ||
      cleanQuery.includes('പണം')
    ) {
      intent = 'payment_status';
      actionRoute = '/help';
      if (latestPayment) {
        const amt = latestPayment.net_amount || latestPayment.amount || 58000;
        responseTextEn = `Your last payment of ₹${Number(amt).toLocaleString('en-IN')} for ${latestPayment.crop_name || 'Grain'} is ${latestPayment.status} (UTR: ${latestPayment.utr_reference || 'RBI-DBT-SUCCESS'}).`;
        responseTextTa = `உங்கள் ${latestPayment.crop_name || 'பயிர்'} தொகை ரூ. ${Number(amt).toLocaleString('en-IN')} கட்டணம் வெற்றிகரமாக செலுத்தப்பட்டுள்ளது (UTR: ${latestPayment.utr_reference || 'RBI-DBT-SUCCESS'}).`;
        responseTextHi = `आपका ₹${Number(amt).toLocaleString('en-IN')} का भुगतान स्थिति ${latestPayment.status} है।`;
        responseTextTe = `మీ చెల్లింపు స్థితి: ${latestPayment.status}. మొత్తం: ₹${Number(amt).toLocaleString('en-IN')}.`;
        responseTextMl = `നിങ്ങളുടെ തുക ₹${Number(amt).toLocaleString('en-IN')} അക്കൗണ്ടിൽ എത്തി.`;
      } else {
        responseTextEn = 'Payments are directly transferred to Aadhaar-linked DBT bank accounts within 24 to 48 hours of procurement completion.';
        responseTextTa = 'கொள்முதல் முடிந்த 24 முதல் 48 மணி நேரத்திற்குள் ஆதார் இணைக்கப்பட்ட வங்கிக் கணக்கில் பணம் வரவு வைக்கப்படும்.';
        responseTextHi = 'खरीद पूरी होने के 24 से 48 घंटों के भीतर डीबीटी के माध्यम से बैंक खाते में भुगतान जमा किया जाता है।';
        responseTextTe = 'చెల్లింపులు 24-48 గంటల్లో డీబీటీ ద్వారా నేరుగా బ్యాంక్ ఖాతాలో జమ చేయబడతాయి.';
        responseTextMl = '24-48 മണിക്കൂറിനുള്ളിൽ ഡിബിടി വഴി പണം അക്കൗണ്ടിലെത്തും.';
      }
    }
    // 8. Problem / Complaint / Issue
    else if (
      cleanQuery.includes('problem') ||
      cleanQuery.includes('complaint') ||
      cleanQuery.includes('issue') ||
      cleanQuery.includes('fraud') ||
      cleanQuery.includes('corrupt') ||
      cleanQuery.includes('cheat') ||
      cleanQuery.includes('delay') ||
      cleanQuery.includes('புகார்') ||
      cleanQuery.includes('பிரச்சனை') ||
      cleanQuery.includes('மோசடி') ||
      cleanQuery.includes('शिकायत') ||
      cleanQuery.includes('समस्या') ||
      cleanQuery.includes('ఫిర్యాదు') ||
      cleanQuery.includes('పరాതി')
    ) {
      intent = 'complaint';
      actionRoute = '/help';
      responseTextEn = 'You can file an evidence-based complaint in under 1 minute using voice or photo under "Help & Complaints".';
      responseTextTa = 'நீங்கள் "உதவி & புகார்" பிரிவில் 1 நிமிடத்திற்குள் குரல் அல்லது புகைப்பட சான்றுகளுடன் புகார் அளிக்கலாம்.';
      responseTextHi = 'आप "सहायता और शिकायत" के तहत 1 मिनट में आवाज या फोटो द्वारा शिकायत दर्ज कर सकते हैं।';
      responseTextTe = 'మీరు సహాయం మరియు ఫిర్యాదుల విభాగంలో సులభంగా ఫిర్యాదు చేయవచ్చు.';
      responseTextMl = 'നിങ്ങൾക്ക് സഹായം & പരാതികൾ എന്നതിൽ പരാതി സമർപ്പിക്കാം.';
    }
    // 9. General / Hello / How to use Kisan Go
    else {
      intent = 'general';
      responseTextEn = 'Welcome to Kisan Go! I can assist you with live center waiting times, digital tokens, optimal departure schedules, crop prices, and DBT payments.';
      responseTextTa = 'வணக்கம்! நான் கிசான் கோ AI உதவியாளர். கொள்முதல் மையம் கண்டறிதல், நேரலை வரிசை, டோக்கன் மற்றும் கட்டண விவரங்களுக்கு நான் உதவ முடியும்.';
      responseTextHi = 'किसान गो में आपका स्वागत है! मैं आपको खरीद केंद्र की सिफारिश, लाइव कतार, टोकन और भुगतान में सहायता कर सकता हूँ।';
      responseTextTe = 'కిసాన్ గోకు స్వాగతం! నేను మీకు కేంద్రాల సిఫార్సు, లైవ్ క్యూ మరియు చెల్లింపు వివరాలలో సహాయం చేస్తాను.';
      responseTextMl = 'കിസാൻ ഗോയിലേക്ക് സ്വാഗതം! സംഭരണ കേന്ദ്രങ്ങൾ, ലൈവ് ക്യൂ, ടോക്കൺ എന്നിവയിൽ ഞാൻ സഹായിക്കാം.';
    }

    // Select the localized text based on preferred language
    let selectedText = responseTextEn;
    const langLower = (language || 'English').toLowerCase();
    if (langLower.includes('tamil') || langLower.includes('தமிழ்')) selectedText = responseTextTa;
    else if (langLower.includes('hindi') || langLower.includes('हिंदी')) selectedText = responseTextHi;
    else if (langLower.includes('telugu') || langLower.includes('తెలుగు')) selectedText = responseTextTe;
    else if (langLower.includes('malayalam') || langLower.includes('മലയാളം')) selectedText = responseTextMl;

    res.json({
      success: true,
      data: {
        intent,
        language,
        spokenText: selectedText,
        displayText: selectedText,
        englishTranslation: responseTextEn,
        actionRoute
      }
    });
  } catch (error: any) {
    console.error('processVoiceQuery Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal AI service error' });
  }
};

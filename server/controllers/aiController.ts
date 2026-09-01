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

      // Avg processing time per farmer at this center
      const avgProcRow = db.prepare(`
        SELECT AVG(pr.actual_quantity) as avg_qty
        FROM procurement_records pr
        JOIN bookings b ON pr.booking_id = b.id
        WHERE b.center_id = ?
      `).get(center.id) as any;
      const avgQtyKg = avgProcRow?.avg_qty || 2000;
      const avgMinsPerFarmer = Math.round(15 + Math.max(0, (avgQtyKg - 1000) / 1000) * 5);
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

    // Sort by lowest Total Time
    scoredCenters.sort((a, b) => a.totalFarmerTimeMins - b.totalFarmerTimeMins);

    const bestCenter = scoredCenters[0];
    const nearestCenter = [...scoredCenters].sort((a, b) => a.distanceKm - b.distanceKm)[0];
    const timeSavedVsNearest = Math.max(0, (nearestCenter?.totalFarmerTimeMins || 0) - (bestCenter?.totalFarmerTimeMins || 0));

    const enrichedCenters = scoredCenters.map((center, index) => {
      const isBest = center.id === bestCenter.id;
      let reason = '';

      if (isBest) {
        reason = `${center.name} saves approximately ${timeSavedVsNearest > 0 ? timeSavedVsNearest + ' mins' : 'valuable time'} overall. Live queue is only ${center.queueCount} vehicles with express weighbridges and ${center.openSlotsCount} open slots.`;
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

    // Fetch context for this farmer safely
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
      cleanQuery.includes('குறைந்த') ||
      cleanQuery.includes('காத்திருப்பு') ||
      cleanQuery.includes('மையம்') ||
      cleanQuery.includes('பரிந்துரை') ||
      cleanQuery.includes('எந்த மையம்') ||
      cleanQuery.includes('கூட்டம்') ||
      cleanQuery.includes('प्रतीक्षा समय') ||
      cleanQuery.includes('केंद्र') ||
      cleanQuery.includes('सिफारिश') ||
      cleanQuery.includes('సిఫార్సు') ||
      cleanQuery.includes('కేంద్రం') ||
      cleanQuery.includes('ഏറ്റവും നല്ല') ||
      cleanQuery.includes('കേന്ദ്രം')
    ) {
      intent = 'center_recommendation';
      actionRoute = '/find-center';
      responseTextEn = 'Sir, right now Kilpennathur DPC (Center B) has very low rush with 4 open slots and just 15 minutes waiting time. You can book there smoothly!';
      responseTextTa = 'வணக்கம் ஐயா! இப்போதைக்கு கீழ்பென்னாத்தூர் கொள்முதல் நிலையத்துல கூட்டம் ரொம்ப கம்மி, வெறும் 15 நிமிஷத்துல எடை போட்டு வேலை முடிஞ்சிடும். அங்க 4 ஸ்லாட் காலியா இருக்கு, நீங்க தாராளமா புக் பண்ணலாம்!';
      responseTextHi = 'नमस्ते किसान भाई! इस समय किलपेन्नात्तूर खरीद केंद्र पर भीड़ बहुत कम है, सिर्फ 15 मिनट में काम हो जाएगा और 4 स्लॉट खाली हैं। आप तुरंत स्लॉट बुक कर सकते हैं!';
      responseTextTe = 'నమస్కారం అండీ! ప్రస్తుతం కీల్పెన్నత్తూరు కేంద్రంలో రద్దీ చాలా తక్కువగా ఉంది, కేవలం 15 నిమిషాల్లో పూర్తవుతుంది. మీరు ఇప్పుడే స్లాట్ బుక్ చేసుకోవచ్చు!';
      responseTextMl = 'നമസ്കാരം ചേട്ടാ! ഇപ്പോൾ കീഴ്പെന്നാത്തൂർ കേന്ദ്രത്തിൽ ഒട്ടും തിരക്കില്ല, 15 മിനിറ്റിനുള്ളിൽ കാര്യം നടക്കും. ഉടൻ തന്നെ സ്ലോട്ട് ബുക്ക് ചെയ്യാം!';
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
      cleanQuery.includes('என் டோக்கன்') ||
      cleanQuery.includes('ஸ்லாட்') ||
      cleanQuery.includes('मेरा टोकन') ||
      cleanQuery.includes('బుకింగ్') ||
      cleanQuery.includes('టోకెన్') ||
      cleanQuery.includes('ടോക്കൺ') ||
      cleanQuery.includes('സ്ലോട്ട്')
    ) {
      intent = 'my_token';
      actionRoute = '/my-slot';
      if (activeBooking && activeBooking.token_number) {
        responseTextEn = `Sir, your confirmed token number is ${activeBooking.token_number}. Your time slot is ${activeBooking.slot_start} at ${activeBooking.center_name}.`;
        responseTextTa = `ஐயா, உங்க உறுதியான டோக்கன் நம்பர் ${activeBooking.token_number}. ${activeBooking.center_name} மையத்துல உங்க ஸ்லாட் நேரம் ${activeBooking.slot_start} மணி. நீங்க நேரத்துக்கு வந்தா போதும்!`;
        responseTextHi = `किसान भाई, आपका पुष्ट टोकन नंबर ${activeBooking.token_number} है। आपका स्लॉट ${activeBooking.center_name} में समय ${activeBooking.slot_start} पर है।`;
        responseTextTe = `అండీ, మీ టోకెన్ నంబర్ ${activeBooking.token_number}, సమయం ${activeBooking.slot_start}.`;
        responseTextMl = `ചേട്ടാ, നിങ്ങളുടെ ടോക്കൺ നമ്പർ ${activeBooking.token_number} ആണ്, സമയം ${activeBooking.slot_start}.`;
      } else {
        responseTextEn = 'Sir, you do not have an active booking token right now. You can choose a convenient center and book a slot instantly under Find Center.';
        responseTextTa = 'ஐயா, உங்ககிட்ட இப்போதைக்கு எந்த டோக்கனும் முன்பதிவு ஆகல. மையம் தேடு பகுதியில போயி உங்க வசதியான நேரத்துல ஒரு ஸ்லாட் புக் பண்ணிக்கோங்க!';
        responseTextHi = 'किसान भाई, अभी आपके पास कोई सक्रिय टोकन नहीं है। आप केंद्र खोजें में जाकर तुरंत नया स्लॉट बुक कर सकते हैं।';
        responseTextTe = 'ప్రస్తుతం మీ దగ్గర యాక్టివ్ టోకెన్ లేదు. కొత్త స్లాట్ బుక్ చేసుకోండి.';
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
      cleanQuery.includes('எத்தனை வண்டி') ||
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
        responseTextEn = `Sir, there are ${farmersBefore} farmer vehicle(s) ahead of you in line. Your expected waiting time is around ${activeBooking.estimated_wait || 15} minutes.`;
        responseTextTa = `ஐயா, வரிசையில உங்களுக்கு முன்னாடி ${farmersBefore === 0 ? 'யாருமில்ல, நீங்க தான் அடுத்த ஆளு!' : `வெறும் ${farmersBefore} வண்டி தான் நிக்குது.`} இன்னும் ஒரு ${activeBooking.estimated_wait || 15} நிமிஷத்துல உங்க முறை வந்திடும்!`;
        responseTextHi = `किसान भाई, कतार में आपसे पहले ${farmersBefore === 0 ? 'कोई नहीं है, आपका ही नंबर है!' : `केवल ${farmersBefore} वाहन हैं।`} लगभग ${activeBooking.estimated_wait || 15} मिनट में आपका काम शुरू हो जाएगा।`;
        responseTextTe = `క్యూలో మీ కంటే ముందు ${farmersBefore} వాహనాలు ఉన్నాయి. సుమారు ${activeBooking.estimated_wait || 15} నిమిషాల్లో మీ వంతు వస్తుంది.`;
        responseTextMl = `ക്യൂവിൽ നിങ്ങൾക്ക് മുന്നിൽ ${farmersBefore} പേരുണ്ട്. ഏകദേശം ${activeBooking.estimated_wait || 15} മിനിറ്റിനുള്ളിൽ നിങ്ങളുടെ ഊഴം വരും.`;
      } else {
        responseTextEn = 'Sir, please book a slot to see your live queue position. Center B currently has a very small queue of just 6 vehicles.';
        responseTextTa = 'ஐயா, ஸ்லாட் புக் பண்ணுனா உங்க லைவ் வரிசை தெரியும். கீழ்பென்னாத்தூர் நிலையத்துல இப்போ 6 வண்டி தான் நிக்குது, கூட்டம் ரொம்ப கம்மி!';
        responseTextHi = 'किसान भाई, स्लॉट बुक करने पर आपकी लाइव स्थिति दिखेगी। केंद्र B में अभी सिर्फ 6 गाड़ियां हैं।';
        responseTextTe = 'స్లాట్ బుక్ చేసుకోండి. సెంటర్ బి లో ఇప్పుడు కేవలం 6 వాహనాలు మాత్రమే ఉన్నాయి.';
        responseTextMl = 'സ്ലോട്ട് ബുക്ക് ചെയ്താൽ ലൈവ് ക്യൂ കാണാം. സെന്റർ ബിയിൽ ഇപ്പോൾ 6 പേർ മാത്രമാണുള്ളത്.';
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
      cleanQuery.includes('எப்ப கெளம்ப') ||
      cleanQuery.includes('कब निकल') ||
      cleanQuery.includes('प्रस्थान') ||
      cleanQuery.includes('ఎప్పుడు బయలుదేరాలి') ||
      cleanQuery.includes('എപ്പോൾ പുറപ്പെടണം')
    ) {
      intent = 'departure_time';
      actionRoute = '/my-slot';
      if (activeBooking && activeBooking.recommended_departure_time) {
        responseTextEn = `Sir, your slot is at ${activeBooking.slot_start}. You should leave your village by ${activeBooking.recommended_departure_time} to reach comfortably without any rush.`;
        responseTextTa = `ஐயா, உங்க ஸ்லாட் நேரம் ${activeBooking.slot_start}. நீங்க ஊர்ல இருந்து கரெக்டா ${activeBooking.recommended_departure_time} மணிக்கு கெளம்புனா போதும், சாவகாசமா நேரத்துக்கு போயிடலாம்!`;
        responseTextHi = `किसान भाई, आपका स्लॉट समय ${activeBooking.slot_start} है। आप अपने गांव से आराम से ${activeBooking.recommended_departure_time} बजे निकलें ताकि समय पर पहुंच सकें।`;
        responseTextTe = `మీరు మీ గ్రామం నుండి ${activeBooking.recommended_departure_time} సమయానికి బయలుదేరితే సమయానికి చేరుకోవచ్చు.`;
        responseTextMl = `ചേട്ടാ, നിങ്ങൾ ${activeBooking.recommended_departure_time} ന് വീട്ടിൽ നിന്ന് പുറപ്പെട്ടാൽ സ്ലോട്ട് സമയത്ത് എത്താം.`;
      } else {
        responseTextEn = 'Sir, please book a slot first to receive your personalized GPS departure schedule.';
        responseTextTa = 'ஐயா, உங்க ஊர்ல இருந்து எப்ப கெளம்பணும்னு தெரிஞ்சுக்க முதல்ல ஒரு ஸ்லாட் புக் பண்ணிக்கோங்க!';
        responseTextHi = 'प्रस्थान समय जानने के लिए कृपया पहले एक स्लॉट बुक करें।';
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
      cleanQuery.includes('என்ன விலை') ||
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
      responseTextEn = 'Sir, current MSP rates are: Common Paddy ₹2,300 per quintal, Grade A Paddy ₹2,320, Maize ₹2,090, and Groundnut ₹6,377 per quintal with direct DBT payment.';
      responseTextTa = 'ஐயா, நம்ம அரசாங்க கொள்முதல் நிலையத்துல சாதாரண ரக நெல்லுக்கு குவிண்டாலுக்கு 2,300 ரூபாயும், சன்ன ரக முதல் தர நெல்லுக்கு 2,320 ரூபாயும் தராங்க. மக்காச்சோளம் 2,090 ரூபாய், நிலக்கடலை 6,377 ரூபாய்க்கு நேரடியா எடைபோட்டு எடுக்குறாங்க!';
      responseTextHi = 'किसान भाई, सरकारी खरीद दरें हैं: साधारण धान ₹2,300 प्रति क्विंटल, ग्रेड ए धान ₹2,320, मक्का ₹2,090 और मूंगफली ₹6,377 प्रति क्विंटल। पूरा पैसा सीधे बैंक खाते में आएगा!';
      responseTextTe = 'ప్రభుత్వ కొనుగోలు ధరలు: సాధారణ వరి క్వింటాల్‌కు ₹2,300, గ్రేడ్ ఎ వరి ₹2,320, మొక్కజొన్న ₹2,090 మరియు వేరుశనగ ₹6,377.';
      responseTextMl = 'നെല്ല് സാധാരണ ക്വിന്റലിന് ₹2,300, ഗ്രേഡ് എ നെല്ല് ₹2,320, ചോളം ₹2,090 എന്നിവയ്ക്കാണ് സംഭരണം നടക്കുന്നത്.';
    }
    // 6. Officer Info & Helpdesk Contact
    else if (
      cleanQuery.includes('officer') ||
      cleanQuery.includes('contact') ||
      cleanQuery.includes('phone') ||
      cleanQuery.includes('helpline') ||
      cleanQuery.includes('அதிகாரி') ||
      cleanQuery.includes('தொலைபேசி') ||
      cleanQuery.includes('போன்') ||
      cleanQuery.includes('अधिकारी') ||
      cleanQuery.includes('हेल्पलाइन') ||
      cleanQuery.includes('అధికారి') ||
      cleanQuery.includes('హెల్ప్‌లైన్') ||
      cleanQuery.includes('ഓഫീസർ')
    ) {
      intent = 'officer_info';
      actionRoute = '/help';
      responseTextEn = 'Sir, Center B is managed by Officer M. Rajeshwari. The toll-free helpline number is 1800 425 3435 available from 8 AM to 6 PM.';
      responseTextTa = 'ஐயா, கீழ்பென்னாத்தூர் மையத்தோட கண்காணிப்பாளர் அதிகாரி திருமதி ராஜேஸ்வரி அம்மா. இலவச உதவி எண் 1 8 0 0 4 2 5 3 4 3 5 காலை 8 முதல் மாலை 6 மணி வரை செயல்படுதுங்க!';
      responseTextHi = 'किसान भाई, केंद्र B की अधिकारी श्रीमती एम. राजेश्वरी हैं। टोल-फ्री हेल्पलाइन नंबर 1 8 0 0 4 2 5 3 4 3 5 सुबह 8 से शाम 6 बजे तक चालू रहता है।';
      responseTextTe = 'సెంటర్ బి అధికారి ఎం. రాజేశ్వరి. టోల్ ఫ్రీ నంబర్ 1800 425 3435.';
      responseTextMl = 'സെന്റർ ബി ഓഫീസർ എം. രാജേശ്വരി ആണ്. ടോൾ ഫ്രീ നമ്പർ 1800 425 3435.';
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
      cleanQuery.includes('காசு') ||
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
        responseTextEn = `Sir, your grain payment of ₹${Number(amt).toLocaleString('en-IN')} is ${latestPayment.status}. It is credited directly via DBT to your Aadhaar-linked bank account.`;
        responseTextTa = `ஐயா, உங்க நெல்லுக்கான தொகை ${Number(amt).toLocaleString('en-IN')} ரூபாய் உங்க ஆதார் இணைச்ச பேங்க் அக்கவுண்டுல நேரடியா டிபிடி வழியா வந்திடுச்சுங்க! UTR நம்பரும் பதிவாகிடுச்சு.`;
        responseTextHi = `किसान भाई, आपकी फसल का ₹${Number(amt).toLocaleString('en-IN')} का भुगतान सीधे आपके आधार से जुड़े बैंक खाते में डीबीटी द्वारा सफलतापूर्वक जमा हो गया है!`;
        responseTextTe = `మీ పంట మొత్తం ₹${Number(amt).toLocaleString('en-IN')} మీ ఆధార్ లింక్డ్ బ్యాంక్ ఖాతాలో డీబీటీ ద్వారా జమ చేయబడింది.`;
        responseTextMl = `നിങ്ങളുടെ തുക ₹${Number(amt).toLocaleString('en-IN')} ഡിബിടി വഴി അക്കൗണ്ടിൽ നേരിട്ടെത്തി.`;
      } else {
        responseTextEn = 'Sir, once your grain is weighed and approved, your full payment is credited directly to your bank account via DBT within 24 to 48 hours.';
        responseTextTa = 'ஐயா, கொள்முதல் நிலையத்துல எடை போட்டு பில் போட்ட உடனே, அடுத்த 24 முதல் 48 மணி நேரத்துல உங்க ஆதார் இணைச்ச பேங்க் அக்கவுண்ட்ல பணம் நேரடியா ஏறிடும்ங்க!';
        responseTextHi = 'किसान भाई, खरीद पूरी होने के 24 से 48 घंटे के अंदर पूरा पैसा सीधे आपके बैंक खाते में डीबीटी द्वारा आ जाता है!';
        responseTextTe = 'కొనుగోలు పూర్తయిన 24-48 గంటల్లో డబ్బులు నేరుగా మీ బ్యాంక్ ఖాతాలో జమ అవుతాయి.';
        responseTextMl = 'സംഭരണം കഴിഞ്ഞ് 24-48 മണിക്കൂറിനുള്ളിൽ പണം നേരിട്ട് ബാങ്ക് അക്കൗണ്ടിലെത്തും.';
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
      cleanQuery.includes('പരാതി')
    ) {
      intent = 'complaint';
      actionRoute = '/help';
      responseTextEn = 'Sir, if you face any problem or delay, you can file an instant voice or photo complaint under Help & Complaints. District officers resolve it within 24 hours.';
      responseTextTa = 'ஐயா, ஏதாச்சும் பிரச்சனைன்னா கவலைப்படாதீங்க! நம்ம உதவி மற்றும் புகார் பகுதியில போயி உங்க குரல் பதிவு மூலமாவே ஒரு நிமிஷத்துல புகார் பண்ணிடலாம். மாவட்ட அதிகாரிங்க உடனே நடவடிக்கை எடுப்பாங்க!';
      responseTextHi = 'किसान भाई, अगर कोई समस्या या परेशानी है, तो आप सहायता और शिकायत में जाकर बोलकर या फोटो डालकर 1 मिनट में शिकायत दर्ज कर सकते हैं। तुरंत समाधान होगा!';
      responseTextTe = 'ఏదైనా సమస్య ఉంటే సహాయం మరియు ఫిర్యాదుల విభాగంలో మీ వాయిస్ ద్వారా సులభంగా ఫిర్యాదు చేయవచ్చు.';
      responseTextMl = 'എന്തെങ്കിലും പ്രശ്നമുണ്ടെങ്കിൽ സഹായം & പരാതികൾ എന്നതിൽ ശബ്ദ സന്ദേശമായി പരാതി നൽകാം.';
    }
    // 9. General / Hello / How to use Kisan Go
    else {
      intent = 'general';
      responseTextEn = 'Welcome Sir! I am your Kisan Go farming assistant. Ask me anything about center wait times, tokens, live queue, grain prices, or bank payments!';
      responseTextTa = 'வணக்கம் ஐயா! நான் உங்க கிசான் கோ உதவியாளர். கொள்முதல் நிலையத்துல கூட்டம் எவ்ளோ இருக்கு, டோக்கன் நிலவரம், நெல் விலை, பேங்க் பணம் பத்தி என்ன வேணும்னாலும் என்கிட்ட தாராளமா கேளுங்க!';
      responseTextHi = 'राम राम किसान भाई! मैं आपका किसान गो सहायक हूँ। खरीद केंद्र की भीड़, टोकन, कतार, फसल के भाव या बैंक खाते के पैसे के बारे में मुझसे कुछ भी पूछिए!';
      responseTextTe = 'నమస్కారం అండీ! నేను మీ కిసాన్ గో సహాయకుడిని. కొనుగోలు కేంద్రాలు, టోకెన్లు, పంట ధరలు మరియు చెల్లింపుల గురించి నన్ను అడగండి!';
      responseTextMl = 'നമസ്കാരം ചേട്ടാ! ഞാൻ നിങ്ങളുടെ കിസാൻ ഗോ അസിസ്റ്റന്റാണ്. സംഭരണ കേന്ദ്രങ്ങൾ, ക്യൂ, വിളകളുടെ വില എന്നിവയെക്കുറിച്ച് എന്നോട് ചോദിക്കാം!';
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

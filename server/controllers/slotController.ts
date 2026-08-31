import { Request, Response } from 'express';
import { db } from '../db/database.js';
import { calculateDistance, estimateTravelTime } from './centerController.js';

// Convert 'HH:MM AM/PM' to minutes from midnight
function timeToMinutes(timeStr: string): number {
  const parts = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!parts) return 0;
  let hours = parseInt(parts[1], 10);
  const minutes = parseInt(parts[2], 10);
  const period = parts[3].toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// Convert minutes from midnight back to 'HH:MM AM/PM'
function minutesToTime(totalMins: number): string {
  let normalized = (totalMins + 1440) % 1440;
  let hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export const getCenterSlots = (req: Request, res: Response): void => {
  try {
    const { centerId } = req.params;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const cropId = req.query.cropId as string;
    const quantity = parseFloat(req.query.quantity as string) || 2000;
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : 12.2253;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : 79.0747;

    const center = db.prepare('SELECT * FROM procurement_centers WHERE id = ?').get(centerId) as any;
    if (!center) {
      res.status(404).json({ success: false, message: 'Center not found' });
      return;
    }

    const distance = calculateDistance(lat, lng, center.latitude, center.longitude);
    const travelTime = estimateTravelTime(distance);

    const slots = db
      .prepare('SELECT * FROM slots WHERE center_id = ? AND date = ? ORDER BY start_time ASC')
      .all(centerId, date) as any[];

    // Calculate processing time based on quantity (15 min base + 5 min per 1000kg above 1000kg)
    const processingMins = Math.round(15 + Math.max(0, (quantity - 1000) / 1000) * 5);

    // AI Slot Scoring & Recommendation
    let bestSlotId: string | null = null;
    let highestScore = -1;

    const scoredSlots = slots.map((slot) => {
      const remainingCapacity = slot.capacity - slot.booked_count;
      const isFull = remainingCapacity <= 0;

      // Slot start in minutes
      const slotStartMins = timeToMinutes(slot.start_time);
      // Departure needed = slot start - travel time - 15 mins buffer
      const departureMins = slotStartMins - travelTime - 15;
      const departureTime = minutesToTime(departureMins);

      // Score factors
      // 1. Capacity availability (0-40)
      const capScore = isFull ? 0 : Math.min(40, remainingCapacity * 6);
      // 2. Comfortable departure timing (0-30) - prefer mid-morning slots 10:00 AM - 11:30 AM
      const timingScore = slotStartMins >= 600 && slotStartMins <= 720 ? 30 : 20;
      // 3. Workload smoothing (0-30)
      const workloadScore = Math.max(0, 30 - slot.booked_count * 3);

      const totalScore = isFull ? 0 : capScore + timingScore + workloadScore;

      if (!isFull && totalScore > highestScore) {
        highestScore = totalScore;
        bestSlotId = slot.id;
      }

      return {
        ...slot,
        remaining_capacity: remainingCapacity,
        is_full: isFull,
        recommended_departure: departureTime,
        estimated_processing_mins: processingMins,
        score: totalScore
      };
    });

    const enriched = scoredSlots.map((slot) => ({
      ...slot,
      is_ai_recommended: slot.id === bestSlotId,
      recommendation_reason:
        slot.id === bestSlotId
          ? `AI Recommended: Optimal travel buffer of ${travelTime + 15} mins, smooth queue flow, and ${slot.remaining_capacity} open slots available.`
          : undefined
    }));

    res.json({
      success: true,
      data: {
        centerId,
        date,
        travelTimeMins: travelTime,
        distanceKm: distance,
        estimatedProcessingMins: processingMins,
        slots: enriched
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Transactional Slot Booking
export const bookSlot = (req: Request, res: Response): void => {
  try {
    const { farmerId, centerId, slotId, cropId, expectedQuantity, crops, lat, lng } = req.body;

    let computedQuantity = expectedQuantity;
    let targetCropId = cropId;
    let cropsBreakdownJson: string | null = null;

    if (Array.isArray(crops) && crops.length > 0) {
      computedQuantity = crops.reduce((sum: number, c: any) => sum + (Number(c.expectedQuantity) || 0), 0);
      targetCropId = crops[0].cropId || cropId;
      cropsBreakdownJson = JSON.stringify(crops);
    }

    if (!farmerId || !centerId || !slotId || !targetCropId || !computedQuantity) {
      res.status(400).json({ success: false, message: 'All booking fields and at least one crop are required' });
      return;
    }

    const farmerLat = lat || 12.2253;
    const farmerLng = lng || 79.0747;

    const center = db.prepare('SELECT * FROM procurement_centers WHERE id = ?').get(centerId) as any;
    if (!center) {
      res.status(404).json({ success: false, message: 'Procurement center not found' });
      return;
    }

    // Ensure farmer exists in DB
    let existingFarmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(farmerId) as any;
    if (!existingFarmer) {
      db.prepare(`
        INSERT OR IGNORE INTO farmers (id, name, mobile, language, village, district, state, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        farmerId,
        'Ravi Kumar',
        '9876543210',
        'Tamil',
        'Vengikkal Village',
        'Tiruvannamalai',
        'Tamil Nadu',
        farmerLat,
        farmerLng
      );
    }

    // Ensure crop exists in DB
    const existingCrop = db.prepare('SELECT * FROM crops WHERE id = ?').get(targetCropId) as any;
    if (!existingCrop) {
      const centerCrop = db.prepare('SELECT * FROM crops WHERE center_id = ? LIMIT 1').get(centerId) as any;
      if (centerCrop) {
        targetCropId = centerCrop.id;
      } else {
        targetCropId = `crop-${centerId}-1`;
        db.prepare(`
          INSERT OR IGNORE INTO crops (id, name, center_id, msp_rate, unit, processing_rate_mins_per_ton, active)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(targetCropId, 'Paddy (Common / நெல்)', centerId, 23.0, 'kg', 12, 1);
      }
    }

    const distance = calculateDistance(farmerLat, farmerLng, center.latitude, center.longitude);
    const travelTime = estimateTravelTime(distance);
    const processingMins = Math.round(15 + Math.max(0, (computedQuantity - 1000) / 1000) * 5);

    // Run ACID transaction for atomic reservation
    const bookingResult = db.transaction(() => {
      // 1. Lock and fetch the slot
      const slot = db.prepare('SELECT * FROM slots WHERE id = ?').get(slotId) as any;
      if (!slot) {
        throw new Error('Selected slot does not exist.');
      }

      let targetSlot = slot;

      // If slot is full, look for next available slot in same center
      if (targetSlot.capacity - targetSlot.booked_count <= 0) {
        const nextSlot = db
          .prepare(
            `
          SELECT * FROM slots 
          WHERE center_id = ? AND date = ? AND (capacity - booked_count) > 0
          ORDER BY start_time ASC LIMIT 1
        `
          )
          .get(centerId, slot.date) as any;

        if (!nextSlot) {
          throw new Error('All slots for this center are currently fully booked today.');
        }
        targetSlot = nextSlot;
      }

      // 2. Increment booked_count
      const newBookedCount = targetSlot.booked_count + 1;
      const newStatus = newBookedCount >= targetSlot.capacity ? 'Full' : newBookedCount >= targetSlot.capacity * 0.7 ? 'Filling Fast' : 'Available';

      db.prepare(`
        UPDATE slots
        SET booked_count = ?, status = ?
        WHERE id = ?
      `).run(newBookedCount, newStatus, targetSlot.id);

      // 3. Generate guaranteed unique Token Number (KM-XXXX format)
      let tokenNumber = '';
      for (let attempt = 0; attempt < 10; attempt++) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const candidateToken = `KM-${randomNum}`;
        const existingToken = db.prepare('SELECT 1 FROM tokens WHERE token_number = ?').get(candidateToken);
        if (!existingToken) {
          tokenNumber = candidateToken;
          break;
        }
      }
      if (!tokenNumber) {
        tokenNumber = `KM-${Date.now().toString().slice(-4)}`;
      }

      // 4. Calculate recommended departure time
      const slotStartMins = timeToMinutes(targetSlot.start_time);
      const departureMins = slotStartMins - travelTime - 15;
      const recommendedDeparture = minutesToTime(departureMins);

      // 5. Calculate queue position
      const activeQueueCount = (
        db.prepare(`
        SELECT count(*) as cnt FROM queue 
        WHERE center_id = ? AND status IN ('Waiting', 'Called', 'Processing')
      `).get(centerId) as any
      ).cnt || 0;
      const queuePosition = activeQueueCount + 1;
      const estimatedWaitMins = queuePosition * (centerId === 'center-b' ? 3 : 5);

      // 6. Create booking record
      const bookingId = `book-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      db.prepare(`
        INSERT INTO bookings (
          id, farmer_id, center_id, slot_id, crop_id, expected_quantity, 
          priority_score, estimated_processing_mins, estimated_waiting_mins, travel_time_mins, status, crops_breakdown
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bookingId,
        farmerId,
        centerId,
        targetSlot.id,
        targetCropId,
        computedQuantity,
        92.0,
        processingMins,
        estimatedWaitMins,
        travelTime,
        'Slot Booked',
        cropsBreakdownJson
      );

      // 7. Create Digital Token record
      const tokenId = `token-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      db.prepare(`
        INSERT INTO tokens (id, booking_id, token_number, queue_position, status, recommended_departure_time)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(tokenId, bookingId, tokenNumber, queuePosition, 'Active', recommendedDeparture);

      // 8. Add to Live Queue
      const queueId = `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      db.prepare(`
        INSERT INTO queue (id, center_id, booking_id, position, status, estimated_wait)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(queueId, centerId, bookingId, queuePosition, 'Waiting', estimatedWaitMins);

      // 9. Send Notification to Farmer
      const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      db.prepare(`
        INSERT INTO notifications (id, user_id, user_type, title, message, type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        notifId,
        farmerId,
        'farmer',
        `Slot Booked: ${tokenNumber}`,
        `Your slot at ${center.name} is confirmed for ${targetSlot.start_time} - ${targetSlot.end_time}. Recommended departure: ${recommendedDeparture}.`,
        'success'
      );

      return {
        bookingId,
        tokenNumber,
        slot: targetSlot,
        recommendedDeparture,
        queuePosition,
        estimatedWaitMins,
        travelTime,
        distance,
        center
      };
    })();

    res.json({
      success: true,
      message: 'Slot booked and Digital Token generated successfully!',
      data: bookingResult
    });
  } catch (error: any) {
    console.error('Book slot error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to book slot' });
  }
};

export const getFarmerActiveBooking = (req: Request, res: Response): void => {
  try {
    const { farmerId } = req.params;

    const booking = db
      .prepare(
        `
      SELECT 
        b.*,
        t.token_number,
        t.queue_position as original_queue_pos,
        t.recommended_departure_time,
        s.date as slot_date,
        s.start_time as slot_start,
        s.end_time as slot_end,
        c.name as center_name,
        c.address as center_address,
        c.latitude as center_latitude,
        c.longitude as center_longitude,
        c.working_hours,
        cr.name as crop_name,
        cr.msp_rate,
        q.position as live_queue_position,
        q.status as live_queue_status,
        q.estimated_wait as live_estimated_wait,
        o.name as officer_name,
        o.designation as officer_designation,
        o.official_contact as officer_contact
      FROM bookings b
      LEFT JOIN tokens t ON b.id = t.booking_id
      LEFT JOIN slots s ON b.slot_id = s.id
      LEFT JOIN procurement_centers c ON b.center_id = c.id
      LEFT JOIN crops cr ON b.crop_id = cr.id
      LEFT JOIN queue q ON b.id = q.booking_id
      LEFT JOIN officers o ON c.id = o.assigned_center_id
      WHERE b.farmer_id = ? AND b.status NOT IN ('Cancelled')
      ORDER BY b.created_at DESC
      LIMIT 1
    `
      )
      .get(farmerId) as any;

    if (!booking) {
      res.json({ success: true, data: null });
      return;
    }

    // Get center photos
    const photos = db.prepare('SELECT * FROM center_photos WHERE center_id = ?').all(booking.center_id) as any[];

    // Calculate farmers before farmer
    const farmersBefore = Math.max(0, (booking.live_queue_position || booking.original_queue_pos || 1) - 1);

    // Parse multi-crop breakdown if available
    let cropsList: any[] = [];
    if (booking.crops_breakdown) {
      try {
        cropsList = JSON.parse(booking.crops_breakdown);
      } catch (e) {}
    }

    if (cropsList.length === 0 && booking.crop_name) {
      cropsList = [
        {
          cropId: booking.crop_id,
          cropName: booking.crop_name,
          expectedQuantity: booking.expected_quantity,
          mspRate: booking.msp_rate || 23.0
        }
      ];
    }

    const cropsSummary = cropsList
      .map((c: any) => `${c.cropName} (${(c.expectedQuantity || 0).toLocaleString()} kg)`)
      .join(', ');

    const totalEstimatedValue = cropsList.reduce(
      (sum: number, c: any) => sum + (c.expectedQuantity || 0) * (c.mspRate || 0),
      0
    );

    res.json({
      success: true,
      data: {
        ...booking,
        crops: cropsList,
        crops_summary: cropsSummary,
        total_estimated_value: totalEstimatedValue,
        photos,
        photo: photos[0]?.image_url || 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1200&q=80',
        farmers_before: farmersBefore
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelBooking = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    db.transaction(() => {
      const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as any;
      if (!booking) throw new Error('Booking not found');

      db.prepare("UPDATE bookings SET status = 'Cancelled' WHERE id = ?").run(id);
      db.prepare("UPDATE tokens SET status = 'Cancelled' WHERE booking_id = ?").run(id);
      db.prepare('DELETE FROM queue WHERE booking_id = ?').run(id);

      // Decrement slot booked_count
      db.prepare(`
        UPDATE slots 
        SET booked_count = MAX(0, booked_count - 1),
            status = 'Available'
        WHERE id = ?
      `).run(booking.slot_id);
    })();

    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

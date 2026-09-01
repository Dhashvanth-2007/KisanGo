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

// Helper to ensure 1-Hour Master Windows + 4 15-Minute Sub-Slots exist for a center & date
export function ensureCenterSlotsForDate(centerId: string, date: string): void {
  const existingCount = db
    .prepare('SELECT count(*) as cnt FROM slots WHERE center_id = ? AND date = ?')
    .get(centerId, date) as { cnt: number };

  if (existingCount && existingCount.cnt > 0) return;

  // Fetch schedule configuration
  let schedule = db.prepare('SELECT * FROM center_schedules WHERE center_id = ?').get(centerId) as any;
  if (!schedule) {
    db.prepare(`
      INSERT OR IGNORE INTO center_schedules (center_id, opening_time, closing_time, break_start, break_end, farmers_per_sub_slot, master_slot_duration, sub_slot_duration)
      VALUES (?, '09:00 AM', '05:00 PM', '01:00 PM', '02:00 PM', 2, 60, 15)
    `).run(centerId);
    schedule = {
      opening_time: '09:00 AM',
      closing_time: '05:00 PM',
      break_start: '01:00 PM',
      break_end: '02:00 PM',
      farmers_per_sub_slot: 2,
      master_slot_duration: 60,
      sub_slot_duration: 15
    };
  }

  const openMins = timeToMinutes(schedule.opening_time || '09:00 AM');
  const closeMins = timeToMinutes(schedule.closing_time || '05:00 PM');
  const breakStartMins = schedule.break_start ? timeToMinutes(schedule.break_start) : -1;
  const breakEndMins = schedule.break_end ? timeToMinutes(schedule.break_end) : -1;
  const farmersPerSubSlot = schedule.farmers_per_sub_slot || 2;

  const insertSlot = db.prepare(`
    INSERT INTO slots (id, center_id, date, master_window, start_time, end_time, duration_mins, capacity, booked_count, status, reserved_reason, reserved_by, reserved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let slotIndex = 1;
  for (let currentHour = openMins; currentHour + 60 <= closeMins; currentHour += 60) {
    // Check if this entire hour is in break time
    if (breakStartMins >= 0 && breakEndMins >= 0 && currentHour >= breakStartMins && currentHour < breakEndMins) {
      continue;
    }

    const masterWindowLabel = `${minutesToTime(currentHour)} - ${minutesToTime(currentHour + 60)}`;

    for (let subMin = 0; subMin < 60; subMin += 15) {
      const subStart = currentHour + subMin;
      const subEnd = subStart + 15;
      const subStartLabel = minutesToTime(subStart);
      const subEndLabel = minutesToTime(subEnd);
      const slotId = `slot-${centerId}-${date.replace(/-/g, '')}-${subStart}`;

      // 4th sub-slot (e.g. :45 - :00) is reserved for Emergency / Buffer
      const isEmergencySlot = subMin === 45;
      const status = isEmergencySlot ? 'Reserved' : 'Available';
      const reason = isEmergencySlot ? 'Emergency / Buffer Reserve' : null;
      const by = isEmergencySlot ? 'System Emergency Allocation' : null;

      insertSlot.run(
        slotId,
        centerId,
        date,
        masterWindowLabel,
        subStartLabel,
        subEndLabel,
        15,
        farmersPerSubSlot,
        0,
        status,
        reason,
        by,
        isEmergencySlot ? `${date} 08:00:00` : null
      );
    }
  }
}

// 1. GET CENTER SLOTS (1-Hour Master Windows + 4x15-Min Sub-Slots)
export const getCenterSlots = (req: Request, res: Response): void => {
  try {
    const centerId = req.params.centerId as string;
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

    ensureCenterSlotsForDate(centerId, date);

    const distance = calculateDistance(lat, lng, center.latitude, center.longitude);
    const travelTime = estimateTravelTime(distance);

    const allSlots = db
      .prepare('SELECT * FROM slots WHERE center_id = ? AND date = ? ORDER BY start_time ASC')
      .all(centerId, date) as any[];

    // Calculate processing time based on quantity (15 min base + 5 min per 1000kg above 1000kg)
    const processingMins = Math.round(15 + Math.max(0, (quantity - 1000) / 1000) * 5);

    // AI Slot Scoring & Recommendation
    let bestSlotId: string | null = null;
    let highestScore = -1;

    const scoredSlots = allSlots.map((slot) => {
      const remainingCapacity = Math.max(0, slot.capacity - slot.booked_count);
      const isAvailable = slot.status === 'Available' && remainingCapacity > 0;
      const isFull = slot.status === 'Booked' || remainingCapacity <= 0;
      const isReserved = slot.status === 'Reserved';
      const isClosed = slot.status === 'Closed';

      // Slot start in minutes
      const slotStartMins = timeToMinutes(slot.start_time);
      // Departure needed = slot start - travel time - 15 mins buffer
      const departureMins = slotStartMins - travelTime - 15;
      const departureTime = minutesToTime(departureMins);

      // Score factors
      // 1. Capacity availability (0-40)
      const capScore = isAvailable ? Math.min(40, remainingCapacity * 20) : 0;
      // 2. Comfortable departure timing (0-30) - prefer mid-morning slots 10:00 AM - 11:30 AM
      const timingScore = slotStartMins >= 600 && slotStartMins <= 720 ? 30 : 20;
      // 3. Workload smoothing (0-30)
      const workloadScore = Math.max(0, 30 - slot.booked_count * 10);

      const totalScore = isAvailable ? capScore + timingScore + workloadScore : 0;

      if (isAvailable && totalScore > highestScore) {
        highestScore = totalScore;
        bestSlotId = slot.id;
      }

      return {
        ...slot,
        remaining_capacity: remainingCapacity,
        is_full: isFull,
        is_reserved: isReserved,
        is_closed: isClosed,
        recommended_departure: departureTime,
        estimated_processing_mins: processingMins,
        score: totalScore
      };
    });

    const enrichedSlots = scoredSlots.map((slot) => ({
      ...slot,
      is_ai_recommended: slot.id === bestSlotId,
      recommendation_reason:
        slot.id === bestSlotId
          ? `AI Recommended: Optimal buffer of ${travelTime + 15} mins travel time, smooth queue flow, and available bay capacity.`
          : undefined
    }));

    // Group into 1-Hour Master Windows
    const masterWindowsMap: Record<string, any> = {};

    enrichedSlots.forEach((subSlot) => {
      const masterLabel = subSlot.master_window || `${subSlot.start_time} - ${subSlot.end_time}`;
      if (!masterWindowsMap[masterLabel]) {
        const parts = masterLabel.split(' - ');
        masterWindowsMap[masterLabel] = {
          master_window: masterLabel,
          start_time: parts[0] || subSlot.start_time,
          end_time: parts[1] || subSlot.end_time,
          status: 'Available',
          available_sub_slots_count: 0,
          total_sub_slots_count: 0,
          sub_slots: []
        };
      }

      masterWindowsMap[masterLabel].sub_slots.push(subSlot);
      masterWindowsMap[masterLabel].total_sub_slots_count += 1;
      if (subSlot.status === 'Available' && subSlot.remaining_capacity > 0) {
        masterWindowsMap[masterLabel].available_sub_slots_count += 1;
      }
    });

    // Evaluate master window status
    const masterWindows = Object.values(masterWindowsMap).map((mw: any) => {
      if (mw.available_sub_slots_count === 0) {
        const allReserved = mw.sub_slots.every((s: any) => s.status === 'Reserved');
        const allClosed = mw.sub_slots.every((s: any) => s.status === 'Closed');
        mw.status = allReserved ? 'Reserved' : allClosed ? 'Closed' : 'Full';
      } else {
        mw.status = 'Available';
      }
      return mw;
    });

    const recommendedSlot = enrichedSlots.find((s) => s.is_ai_recommended) || enrichedSlots.find((s) => s.status === 'Available') || null;

    res.json({
      success: true,
      data: {
        centerId,
        date,
        travelTimeMins: travelTime,
        distanceKm: distance,
        estimatedProcessingMins: processingMins,
        masterWindows,
        slots: enrichedSlots,
        recommendedSlot
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. TRANSACTIONAL SLOT BOOKING
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
        VALUES (?, 'Registered Farmer', '9876543210', 'Tamil', 'Local Village', 'Tiruvannamalai', 'Tamil Nadu', ?, ?)
      `).run(farmerId, farmerLat, farmerLng);
      existingFarmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(farmerId) as any;
    }

    // Check if farmer already has an active booking
    const activeBooking = db
      .prepare(`
        SELECT b.*, t.token_number, t.status as token_status
        FROM bookings b
        LEFT JOIN tokens t ON b.id = t.booking_id
        WHERE b.farmer_id = ? AND b.status NOT IN ('Procurement Completed', 'Bill Generated', 'Payment Completed', 'Cancelled')
      `)
      .get(farmerId) as any;

    if (activeBooking) {
      res.status(400).json({
        success: false,
        message: `You already have an active booking (${activeBooking.token_number || 'Token Active'}) for today.`
      });
      return;
    }

    // Atomically book the 15-minute sub-slot
    let targetSlot = db.prepare('SELECT * FROM slots WHERE id = ?').get(slotId) as any;
    if (!targetSlot) {
      res.status(404).json({ success: false, message: 'Selected time slot not found' });
      return;
    }

    if (targetSlot.status === 'Reserved') {
      res.status(400).json({
        success: false,
        message: `This slot has been reserved by the center for ${targetSlot.reserved_reason || 'official requirements'}. Please choose another available slot.`
      });
      return;
    }

    if (targetSlot.status === 'Closed') {
      res.status(400).json({ success: false, message: 'This slot is temporarily closed. Please choose another slot.' });
      return;
    }

    if (targetSlot.booked_count >= targetSlot.capacity) {
      // Auto-fallback: Find next available 15-minute sub-slot
      const fallbackSlot = db
        .prepare(`
          SELECT * FROM slots 
          WHERE center_id = ? AND date = ? AND status = 'Available' AND booked_count < capacity
          ORDER BY start_time ASC
          LIMIT 1
        `)
        .get(centerId, targetSlot.date) as any;

      if (!fallbackSlot) {
        res.status(400).json({ success: false, message: 'All slots for this center are currently fully booked today.' });
        return;
      }
      targetSlot = fallbackSlot;
    }

    // Update slot capacity atomically
    const newBookedCount = targetSlot.booked_count + 1;
    const newStatus = newBookedCount >= targetSlot.capacity ? 'Booked' : 'Available';

    db.prepare(`
      UPDATE slots 
      SET booked_count = ?, status = ?
      WHERE id = ?
    `).run(newBookedCount, newStatus, targetSlot.id);

    // Calculate queue position & token
    const queueCount = db
      .prepare('SELECT count(*) as cnt FROM bookings WHERE center_id = ? AND status NOT IN (\'Procurement Completed\', \'Cancelled\')')
      .get(centerId) as { cnt: number };

    const queuePos = (queueCount?.cnt || 0) + 1;
    const tokenRandom = Math.floor(1000 + Math.random() * 9000);
    const tokenNumber = `FG-${tokenRandom}`;
    const bookingId = `book-${Date.now()}`;

    // Estimated travel and processing
    const distance = calculateDistance(farmerLat, farmerLng, center.latitude, center.longitude);
    const travelTime = estimateTravelTime(distance);
    const processingMins = Math.round(15 + Math.max(0, (computedQuantity - 1000) / 1000) * 5);
    const waitingMins = center.waitingTimeMins || 15;

    const slotStartMins = timeToMinutes(targetSlot.start_time);
    const departureMins = slotStartMins - travelTime - 15;
    const departureTime = minutesToTime(departureMins);

    // Insert booking
    db.prepare(`
      INSERT INTO bookings (
        id, farmer_id, center_id, slot_id, crop_id, expected_quantity,
        priority_score, estimated_processing_mins, estimated_waiting_mins,
        travel_time_mins, planned_start_time, planned_end_time, estimated_start_time,
        delay_minutes, status, crops_breakdown, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Slot Booked', ?, CURRENT_TIMESTAMP)
    `).run(
      bookingId,
      farmerId,
      centerId,
      targetSlot.id,
      targetCropId,
      computedQuantity,
      85.0,
      processingMins,
      waitingMins,
      travelTime,
      targetSlot.start_time,
      targetSlot.end_time,
      targetSlot.start_time,
      cropsBreakdownJson
    );

    // Insert digital token
    db.prepare(`
      INSERT INTO tokens (id, booking_id, token_number, queue_position, status, recommended_departure_time)
      VALUES (?, ?, ?, ?, 'Active', ?)
    `).run(`token-${Date.now()}`, bookingId, tokenNumber, queuePos, departureTime);

    // Insert live queue
    db.prepare(`
      INSERT INTO queue (id, center_id, booking_id, position, status, estimated_wait)
      VALUES (?, ?, ?, ?, 'Waiting', ?)
    `).run(`q-${Date.now()}`, centerId, bookingId, queuePos, waitingMins);

    // Notification
    db.prepare(`
      INSERT INTO notifications (id, recipient_id, recipient_type, title, message, type)
      VALUES (?, ?, 'farmer', ?, ?, 'slot_confirmation')
    `).run(
      `notif-${Date.now()}`,
      farmerId,
      `Slot Confirmed: ${tokenNumber}`,
      `Your 15-minute booking slot at ${center.name} is confirmed for ${targetSlot.start_time} - ${targetSlot.end_time} (${targetSlot.master_window || '1-Hour Window'}). Token: ${tokenNumber}`
    );

    res.json({
      success: true,
      message: '15-Minute Slot successfully booked!',
      data: {
        bookingId,
        tokenNumber,
        queuePosition: queuePos,
        masterWindow: targetSlot.master_window,
        slotTime: `${targetSlot.start_time} - ${targetSlot.end_time}`,
        centerName: center.name,
        centerAddress: center.address,
        recommendedDepartureTime: departureTime,
        estimatedWaitingMins: waitingMins,
        status: 'Confirmed'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. OFFICER: RESERVE SLOTS (Block 15-minute sub-slots for maintenance, emergency, break, official requirements)
export const reserveSlots = (req: Request, res: Response): void => {
  try {
    const { centerId, slotIds, reason = 'Centre Maintenance', officerName = 'Procurement Officer' } = req.body;

    if (!centerId || !Array.isArray(slotIds) || slotIds.length === 0) {
      res.status(400).json({ success: false, message: 'centerId and an array of slotIds are required' });
      return;
    }

    const updateStmt = db.prepare(`
      UPDATE slots 
      SET status = 'Reserved', reserved_reason = ?, reserved_by = ?, reserved_at = CURRENT_TIMESTAMP
      WHERE id = ? AND center_id = ?
    `);

    slotIds.forEach((id) => {
      updateStmt.run(reason, officerName, id, centerId);
    });

    res.json({
      success: true,
      message: `Successfully reserved ${slotIds.length} sub-slot(s) for ${reason}.`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. OFFICER: RELEASE RESERVED SLOTS
export const releaseReservedSlots = (req: Request, res: Response): void => {
  try {
    const { centerId, slotIds } = req.body;

    if (!centerId || !Array.isArray(slotIds) || slotIds.length === 0) {
      res.status(400).json({ success: false, message: 'centerId and an array of slotIds are required' });
      return;
    }

    const updateStmt = db.prepare(`
      UPDATE slots 
      SET status = CASE WHEN booked_count >= capacity THEN 'Booked' ELSE 'Available' END,
          reserved_reason = NULL,
          reserved_by = NULL,
          reserved_at = NULL
      WHERE id = ? AND center_id = ?
    `);

    slotIds.forEach((id) => {
      updateStmt.run(id, centerId);
    });

    res.json({
      success: true,
      message: `Successfully released ${slotIds.length} reserved slot(s).`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. OFFICER: TOGGLE SLOT STATUS (Open / Close)
export const toggleSlotStatus = (req: Request, res: Response): void => {
  try {
    const { centerId, slotId, status } = req.body;

    if (!centerId || !slotId || !status) {
      res.status(400).json({ success: false, message: 'centerId, slotId and status are required' });
      return;
    }

    db.prepare(`
      UPDATE slots 
      SET status = ?
      WHERE id = ? AND center_id = ?
    `).run(status, slotId, centerId);

    res.json({
      success: true,
      message: `Slot status updated to ${status}.`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. OFFICER: GET SLOT MANAGEMENT SUMMARY & SCHEDULE CONFIG
export const getOfficerSlotSummary = (req: Request, res: Response): void => {
  try {
    const centerId = (req.query.centerId as string) || 'center-b';
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    ensureCenterSlotsForDate(centerId, date);

    const slots = db
      .prepare('SELECT * FROM slots WHERE center_id = ? AND date = ? ORDER BY start_time ASC')
      .all(centerId, date) as any[];

    let schedule = db.prepare('SELECT * FROM center_schedules WHERE center_id = ?').get(centerId) as any;
    if (!schedule) {
      schedule = {
        opening_time: '09:00 AM',
        closing_time: '05:00 PM',
        break_start: '01:00 PM',
        break_end: '02:00 PM',
        farmers_per_sub_slot: 2,
        master_slot_duration: 60,
        sub_slot_duration: 15
      };
    }

    const totalSlots = slots.length;
    const bookedSlots = slots.filter((s) => s.status === 'Booked' || s.booked_count >= s.capacity).length;
    const reservedSlots = slots.filter((s) => s.status === 'Reserved').length;
    const availableSlots = slots.filter((s) => s.status === 'Available' && s.booked_count < s.capacity).length;

    const totalCapacity = slots.reduce((sum, s) => sum + (s.capacity || 2), 0);
    const bookedCapacity = slots.reduce((sum, s) => sum + (s.booked_count || 0), 0);
    const reservedCapacity = slots.filter((s) => s.status === 'Reserved').reduce((sum, s) => sum + (s.capacity || 2), 0);
    const remainingCapacity = Math.max(0, totalCapacity - bookedCapacity - reservedCapacity);

    // Group into 1-hour master windows for officer calendar view
    const masterWindowsMap: Record<string, any> = {};

    slots.forEach((subSlot) => {
      const masterLabel = subSlot.master_window || `${subSlot.start_time} - ${subSlot.end_time}`;
      if (!masterWindowsMap[masterLabel]) {
        const parts = masterLabel.split(' - ');
        masterWindowsMap[masterLabel] = {
          master_window: masterLabel,
          start_time: parts[0] || subSlot.start_time,
          end_time: parts[1] || subSlot.end_time,
          status: 'Available',
          available_sub_slots_count: 0,
          total_sub_slots_count: 0,
          sub_slots: []
        };
      }

      masterWindowsMap[masterLabel].sub_slots.push(subSlot);
      masterWindowsMap[masterLabel].total_sub_slots_count += 1;
      if (subSlot.status === 'Available' && subSlot.booked_count < subSlot.capacity) {
        masterWindowsMap[masterLabel].available_sub_slots_count += 1;
      }
    });

    const masterWindows = Object.values(masterWindowsMap);

    res.json({
      success: true,
      data: {
        centerId,
        date,
        summary: {
          total_slots: totalSlots,
          booked_slots: bookedSlots,
          reserved_slots: reservedSlots,
          available_slots: availableSlots,
          total_capacity: totalCapacity,
          booked_capacity: bookedCapacity,
          reserved_capacity: reservedCapacity,
          remaining_capacity: remainingCapacity,
          farmers_per_sub_slot: schedule.farmers_per_sub_slot || 2,
          max_hourly_capacity: (schedule.farmers_per_sub_slot || 2) * 4
        },
        scheduleConfig: schedule,
        masterWindows,
        slots
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. OFFICER: UPDATE SCHEDULE CONFIGURATION (Opening, Closing, Capacity)
export const updateCenterScheduleConfig = (req: Request, res: Response): void => {
  try {
    const {
      centerId,
      openingTime = '09:00 AM',
      closingTime = '05:00 PM',
      breakStart = '01:00 PM',
      breakEnd = '02:00 PM',
      farmersPerSubSlot = 2
    } = req.body;

    if (!centerId) {
      res.status(400).json({ success: false, message: 'centerId is required' });
      return;
    }

    db.prepare(`
      INSERT INTO center_schedules (center_id, opening_time, closing_time, break_start, break_end, farmers_per_sub_slot, master_slot_duration, sub_slot_duration, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 60, 15, CURRENT_TIMESTAMP)
      ON CONFLICT(center_id) DO UPDATE SET
        opening_time = excluded.opening_time,
        closing_time = excluded.closing_time,
        break_start = excluded.break_start,
        break_end = excluded.break_end,
        farmers_per_sub_slot = excluded.farmers_per_sub_slot,
        updated_at = CURRENT_TIMESTAMP
    `).run(centerId, openingTime, closingTime, breakStart, breakEnd, farmersPerSubSlot);

    // Update capacity on existing unbooked slots
    db.prepare(`
      UPDATE slots 
      SET capacity = ?
      WHERE center_id = ? AND booked_count = 0 AND status != 'Reserved'
    `).run(farmersPerSubSlot, centerId);

    res.json({
      success: true,
      message: 'Center operating schedule and capacity updated successfully.',
      data: {
        centerId,
        openingTime,
        closingTime,
        breakStart,
        breakEnd,
        farmersPerSubSlot,
        maxHourlyCapacity: farmersPerSubSlot * 4
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. GET FARMER ACTIVE BOOKING
export const getFarmerActiveBooking = (req: Request, res: Response): void => {
  try {
    const { farmerId } = req.params;

    const booking = db
      .prepare(`
        SELECT 
          b.*,
          c.name as center_name,
          c.address as center_address,
          c.district as center_district,
          c.latitude as center_latitude,
          c.longitude as center_longitude,
          c.working_hours,
          cr.name as crop_name,
          cr.msp_rate,
          s.master_window,
          s.start_time as slot_start,
          s.end_time as slot_end,
          t.token_number,
          t.status as token_status,
          t.recommended_departure_time,
          q.position as live_queue_position,
          q.status as live_queue_status,
          q.estimated_wait as live_estimated_wait,
          o.name as officer_name,
          o.designation as officer_designation,
          o.official_contact as officer_contact
        FROM bookings b
        JOIN procurement_centers c ON b.center_id = c.id
        JOIN crops cr ON b.crop_id = cr.id
        LEFT JOIN slots s ON b.slot_id = s.id
        LEFT JOIN tokens t ON b.id = t.booking_id
        LEFT JOIN queue q ON b.id = q.booking_id
        LEFT JOIN officers o ON c.id = o.assigned_center_id
        WHERE b.farmer_id = ? AND b.status NOT IN ('Procurement Completed', 'Cancelled')
        ORDER BY b.created_at DESC
        LIMIT 1
      `)
      .get(farmerId) as any;

    if (!booking) {
      res.json({ success: true, data: null });
      return;
    }

    // Parse multi-crops breakdown if present
    let parsedCrops: any[] = [];
    if (booking.crops_breakdown) {
      try {
        parsedCrops = JSON.parse(booking.crops_breakdown);
      } catch (e) {
        parsedCrops = [];
      }
    }

    if (parsedCrops.length === 0 && booking.crop_id) {
      parsedCrops = [
        {
          cropId: booking.crop_id,
          cropName: booking.crop_name,
          expectedQuantity: booking.expected_quantity,
          mspRate: booking.msp_rate
        }
      ];
    }

    const totalEstimatedValue = parsedCrops.reduce(
      (sum, item) => sum + (item.expectedQuantity || 0) * (item.mspRate || 0),
      0
    );

    const cropsSummary = parsedCrops
      .map((c) => `${c.cropName} (${(c.expectedQuantity || 0).toLocaleString()} kg)`)
      .join(', ');

    res.json({
      success: true,
      data: {
        ...booking,
        crops: parsedCrops,
        crops_summary: cropsSummary,
        total_estimated_value: totalEstimatedValue,
        sub_slot: `${booking.slot_start} - ${booking.slot_end}`
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 9. CANCEL BOOKING
export const cancelBooking = (req: Request, res: Response): void => {
  try {
    const { bookingId } = req.params;

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as any;
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    // Free slot capacity
    const slot = db.prepare('SELECT * FROM slots WHERE id = ?').get(booking.slot_id) as any;
    if (slot) {
      const newBookedCount = Math.max(0, slot.booked_count - 1);
      const newStatus = slot.status === 'Reserved' ? 'Reserved' : 'Available';
      db.prepare('UPDATE slots SET booked_count = ?, status = ? WHERE id = ?').run(
        newBookedCount,
        newStatus,
        slot.id
      );
    }

    // Update booking status
    db.prepare('UPDATE bookings SET status = \'Cancelled\' WHERE id = ?').run(bookingId);

    // Cancel token
    db.prepare('UPDATE tokens SET status = \'Cancelled\' WHERE booking_id = ?').run(bookingId);

    // Remove from queue
    db.prepare('DELETE FROM queue WHERE booking_id = ?').run(bookingId);

    res.json({ success: true, message: 'Booking successfully cancelled' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

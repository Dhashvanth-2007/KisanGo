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

export function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

export function getFormattedDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}

export function isPastDate(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr < today;
}

// Helper to ensure 1-Hour Master Windows + 4 15-Minute Sub-Slots exist for a center & date
export function ensureCenterSlotsForDate(centerId: string, date: string, scheduleId?: string): void {
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
    INSERT INTO slots (
      id, center_id, schedule_id, date, master_window, master_start_time, master_end_time,
      start_time, end_time, sub_start_time, sub_end_time, duration_mins, capacity,
      booked_count, reserved_count, available_count, status, reserved_reason, reserved_by, reserved_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let currentHour = openMins; currentHour + 60 <= closeMins; currentHour += 60) {
    // Check if this entire hour is in break time
    if (breakStartMins >= 0 && breakEndMins >= 0 && currentHour >= breakStartMins && currentHour < breakEndMins) {
      continue;
    }

    const masterStartLabel = minutesToTime(currentHour);
    const masterEndLabel = minutesToTime(currentHour + 60);
    const masterWindowLabel = `${masterStartLabel} - ${masterEndLabel}`;

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
      const reservedCount = isEmergencySlot ? farmersPerSubSlot : 0;
      const availableCount = isEmergencySlot ? 0 : farmersPerSubSlot;

      insertSlot.run(
        slotId,
        centerId,
        scheduleId || `sched-${centerId}-${date}`,
        date,
        masterWindowLabel,
        masterStartLabel,
        masterEndLabel,
        subStartLabel,
        subEndLabel,
        subStartLabel,
        subEndLabel,
        15,
        farmersPerSubSlot,
        0,
        reservedCount,
        availableCount,
        status,
        reason,
        by,
        isEmergencySlot ? `${date} 08:00:00` : null
      );
    }
  }
}

// Helper to ensure a multi-day schedule entry exists for a specific date and center
export function ensureCenterScheduleForDate(centerId: string, date: string): any {
  let existing = db.prepare('SELECT * FROM centre_date_schedules WHERE centre_id = ? AND date = ?').get(centerId, date) as any;

  if (existing) {
    // Recalculate dynamic capacity and status
    const counts = db.prepare(`
      SELECT 
        SUM(capacity) as total_cap,
        SUM(booked_count) as booked_cap,
        SUM(CASE WHEN status = 'Reserved' THEN capacity ELSE 0 END) as res_cap
      FROM slots 
      WHERE center_id = ? AND date = ?
    `).get(centerId, date) as any;

    const totalCap = counts?.total_cap || existing.daily_capacity || 60;
    const bookedCap = counts?.booked_cap || 0;
    const resCap = counts?.res_cap || 0;
    const remainingCap = Math.max(0, totalCap - bookedCap - resCap);

    let calculatedStatus = existing.status;
    if (existing.is_working_day === 0) {
      calculatedStatus = existing.status === 'HOLIDAY' ? 'HOLIDAY' : 'CLOSED';
    } else if (existing.status !== 'RESERVED' && existing.status !== 'HOLIDAY' && existing.status !== 'CLOSED') {
      if (remainingCap === 0) {
        calculatedStatus = 'FULL';
      } else if (remainingCap <= totalCap * 0.25) {
        calculatedStatus = 'LIMITED_AVAILABILITY';
      } else {
        calculatedStatus = 'AVAILABLE';
      }
    }

    db.prepare(`
      UPDATE centre_date_schedules
      SET daily_capacity = ?, booked_capacity = ?, reserved_capacity = ?, remaining_capacity = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE schedule_id = ?
    `).run(totalCap, bookedCap, resCap, remainingCap, calculatedStatus, existing.schedule_id);

    return {
      ...existing,
      daily_capacity: totalCap,
      booked_capacity: bookedCap,
      reserved_capacity: resCap,
      remaining_capacity: remainingCap,
      status: calculatedStatus
    };
  }

  // Create new schedule record
  const scheduleId = `sched-${centerId}-${date}`;
  const dayName = getDayName(date);

  // Read base center configuration
  let baseConfig = db.prepare('SELECT * FROM center_schedules WHERE center_id = ?').get(centerId) as any;
  if (!baseConfig) {
    baseConfig = {
      opening_time: '09:00 AM',
      closing_time: '05:00 PM',
      farmers_per_sub_slot: 2
    };
  }

  // Sunday or holidays check
  const isSunday = dayName === 'Sunday';
  const isWorkingDay = isSunday ? 1 : 1; // Can be configured by officer; default 1
  const initialStatus = isWorkingDay ? 'AVAILABLE' : 'CLOSED';
  const dailyCapacity = 60;

  db.prepare(`
    INSERT OR IGNORE INTO centre_date_schedules (
      schedule_id, centre_id, date, day_name, is_working_day,
      opening_time, closing_time, daily_capacity, booked_capacity, reserved_capacity, remaining_capacity,
      status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 15, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    scheduleId,
    centerId,
    date,
    dayName,
    isWorkingDay,
    baseConfig.opening_time || '09:00 AM',
    baseConfig.closing_time || '05:00 PM',
    dailyCapacity,
    dailyCapacity - 15,
    initialStatus
  );

  // Generate slots for date
  ensureCenterSlotsForDate(centerId, date, scheduleId);

  return db.prepare('SELECT * FROM centre_date_schedules WHERE schedule_id = ?').get(scheduleId);
}

// Ensure 14-day schedule horizon exists
export function ensureMultiDaySchedules(centerId: string, daysAhead: number = 14): any[] {
  const results: any[] = [];
  const today = new Date();

  for (let i = 0; i < daysAhead; i++) {
    const targetDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = targetDate.toISOString().split('T')[0];
    const sched = ensureCenterScheduleForDate(centerId, dateStr);
    results.push(sched);
  }

  return results;
}

// 1. GET 14-DAY CALENDAR SCHEDULE FOR A CENTER
export const getCenterCalendar = (req: Request, res: Response): void => {
  try {
    const centerId = req.params.centerId as string;
    const days = parseInt(req.query.days as string, 10) || 14;

    const center = db.prepare('SELECT * FROM procurement_centers WHERE id = ?').get(centerId) as any;
    if (!center) {
      res.status(404).json({ success: false, message: 'Center not found' });
      return;
    }

    ensureMultiDaySchedules(centerId, days);

    const todayStr = new Date().toISOString().split('T')[0];
    const schedules = db.prepare(`
      SELECT * FROM centre_date_schedules
      WHERE centre_id = ? AND date >= ?
      ORDER BY date ASC
      LIMIT ?
    `).all(centerId, todayStr, days) as any[];

    const calendar = schedules.map((s) => ({
      scheduleId: s.schedule_id,
      centerId: s.centre_id,
      date: s.date,
      formattedDate: getFormattedDate(s.date),
      dayName: s.day_name,
      isWorkingDay: Boolean(s.is_working_day),
      openingTime: s.opening_time,
      closingTime: s.closing_time,
      dailyCapacity: s.daily_capacity,
      bookedCapacity: s.booked_capacity,
      reservedCapacity: s.reserved_capacity,
      remainingSlots: s.remaining_capacity,
      status: s.status, // AVAILABLE, LIMITED_AVAILABILITY, FULL, CLOSED, HOLIDAY, RESERVED
      notes: s.notes
    }));

    res.json({
      success: true,
      data: {
        centerId,
        centerName: center.name,
        bookingHorizonDays: days,
        calendar
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. MULTI-CENTRE PROCUREMENT OPTIONS FOR SELECTED CROP & DATE
export const getProcurementOptions = (req: Request, res: Response): void => {
  try {
    const cropId = (req.query.cropId as string) || '';
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const quantity = parseFloat(req.query.quantity as string) || 2000;
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : 12.2253;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : 79.0747;

    const centers = db.prepare('SELECT * FROM procurement_centers').all() as any[];

    const processingMins = Math.round(15 + Math.max(0, (quantity - 1000) / 1000) * 5);

    let lowestTotalTime = Infinity;
    let recommendedCenterId: string | null = null;

    const evaluatedCenters = centers.map((center) => {
      // Ensure date schedule & slots exist
      const schedule = ensureCenterScheduleForDate(center.id, date);

      // Distance and travel time
      const distance = calculateDistance(lat, lng, center.latitude, center.longitude);
      const travelTime = estimateTravelTime(distance);
      const waitingMins = center.waitingTimeMins || 15;
      const totalJourneyTime = travelTime + waitingMins + processingMins;

      // Crop acceptance
      const centerCrops = db.prepare('SELECT * FROM crops WHERE center_id = ?').all(center.id) as any[];
      const acceptsSelectedCrop = !cropId || centerCrops.some((c) => c.id === cropId || c.name.toLowerCase().includes(cropId.toLowerCase()));

      const isOperable = schedule.is_working_day === 1 && schedule.status !== 'CLOSED' && schedule.status !== 'HOLIDAY';
      const hasSlots = schedule.remaining_capacity > 0;

      if (isOperable && hasSlots && acceptsSelectedCrop && totalJourneyTime < lowestTotalTime) {
        lowestTotalTime = totalJourneyTime;
        recommendedCenterId = center.id;
      }

      return {
        id: center.id,
        name: center.name,
        code: center.code,
        address: center.address,
        district: center.district,
        state: center.state,
        latitude: center.latitude,
        longitude: center.longitude,
        workingHours: schedule.opening_time + ' - ' + schedule.closing_time,
        rating: 4.8,
        distanceKm: distance,
        travelTimeMins: travelTime,
        waitingTimeMins: waitingMins,
        processingTimeMins: processingMins,
        totalJourneyTimeMins: totalJourneyTime,
        dailyCapacity: schedule.daily_capacity,
        remainingSlots: schedule.remaining_capacity,
        dateStatus: schedule.status,
        isWorkingDay: Boolean(schedule.is_working_day),
        crops: centerCrops,
        acceptsSelectedCrop,
        is_ai_recommended: false
      };
    });

    const centersWithRecommendation = evaluatedCenters.map((c) => ({
      ...c,
      is_ai_recommended: c.id === recommendedCenterId,
      recommendationReason: c.id === recommendedCenterId
        ? `Lowest total journey time (${c.totalJourneyTimeMins} mins: ${c.travelTimeMins}m travel + ${c.waitingTimeMins}m wait + ${c.processingTimeMins}m processing) and open capacity.`
        : undefined
    }));

    res.json({
      success: true,
      data: {
        date,
        dayName: getDayName(date),
        quantityKg: quantity,
        processingMins,
        centers: centersWithRecommendation
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. AI RECOMMENDED DATE & SLOT (Total Time Optimization Engine)
export const getAiRecommendedDateAndSlot = (req: Request, res: Response): void => {
  try {
    const cropId = (req.body.cropId as string) || (req.query.cropId as string) || '';
    const quantity = parseFloat(req.body.quantity as string || req.query.quantity as string) || 2000;
    const lat = parseFloat(req.body.lat as string || req.query.lat as string) || 12.2253;
    const lng = parseFloat(req.body.lng as string || req.query.lng as string) || 79.0747;

    const centers = db.prepare('SELECT * FROM procurement_centers').all() as any[];
    const today = new Date();
    const processingMins = Math.round(15 + Math.max(0, (quantity - 1000) / 1000) * 5);

    let bestOption: any = null;
    let lowestTotalTime = Infinity;

    // Evaluate candidate dates over next 7-14 days
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const targetDate = new Date(today.getTime() + dayOffset * 86400000);
      const dateStr = targetDate.toISOString().split('T')[0];

      for (const center of centers) {
        const schedule = ensureCenterScheduleForDate(center.id, dateStr);
        if (!schedule || schedule.is_working_day === 0 || schedule.status === 'CLOSED' || schedule.status === 'HOLIDAY' || schedule.remaining_capacity <= 0) {
          continue;
        }

        const distance = calculateDistance(lat, lng, center.latitude, center.longitude);
        const travelTime = estimateTravelTime(distance);
        const waitingTime = center.waitingTimeMins || 15;
        const totalJourneyTime = travelTime + waitingTime + processingMins;

        // Fetch candidate available slots
        const availableSlots = db.prepare(`
          SELECT * FROM slots 
          WHERE center_id = ? AND date = ? AND status = 'Available' AND booked_count < capacity
          ORDER BY start_time ASC
        `).all(center.id, dateStr) as any[];

        if (availableSlots.length === 0) continue;

        // Prefer mid-morning slots (10:00 AM - 11:30 AM)
        const idealSlot = availableSlots.find((s) => {
          const mins = timeToMinutes(s.start_time);
          return mins >= 600 && mins <= 690;
        }) || availableSlots[0];

        if (totalJourneyTime < lowestTotalTime) {
          lowestTotalTime = totalJourneyTime;
          bestOption = {
            recommendedDate: dateStr,
            recommendedDateFormatted: getFormattedDate(dateStr),
            recommendedDay: getDayName(dateStr),
            recommendedCenterId: center.id,
            recommendedCenterName: center.name,
            recommendedCenterAddress: center.address,
            recommendedSlotId: idealSlot.id,
            recommendedMasterWindow: idealSlot.master_window,
            recommendedTime: `${idealSlot.start_time} - ${idealSlot.end_time}`,
            travelTimeMins: travelTime,
            estimatedWaitingMins: waitingTime,
            processingMins,
            totalJourneyTimeMins: totalJourneyTime,
            reason: `Lowest estimated total journey time (${totalJourneyTime} mins) based on distance (${distance.toFixed(1)} km), smooth queue flow, and available bay capacity.`
          };
        }
      }

      // If we found a great match within the first 3 days, break early
      if (bestOption && dayOffset >= 3) break;
    }

    if (!bestOption) {
      // Fallback to center-a tomorrow
      const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
      const fallbackCenter = centers[0] || { id: 'center-a', name: 'Kilpennathur DPC', address: 'Kilpennathur' };
      bestOption = {
        recommendedDate: tomorrowStr,
        recommendedDateFormatted: getFormattedDate(tomorrowStr),
        recommendedDay: getDayName(tomorrowStr),
        recommendedCenterId: fallbackCenter.id,
        recommendedCenterName: fallbackCenter.name,
        recommendedCenterAddress: fallbackCenter.address,
        recommendedSlotId: `slot-${fallbackCenter.id}-${tomorrowStr.replace(/-/g, '')}-615`,
        recommendedMasterWindow: '10:00 AM - 11:00 AM',
        recommendedTime: '10:15 AM - 10:30 AM',
        travelTimeMins: 20,
        estimatedWaitingMins: 15,
        processingMins: 20,
        totalJourneyTimeMins: 55,
        reason: 'Recommended default slot based on standard travel time and bay capacity.'
      };
    }

    res.json({
      success: true,
      data: bestOption
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. GET CENTER SLOTS (1-Hour Master Windows + 4x15-Min Sub-Slots)
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

    ensureCenterScheduleForDate(centerId, date);
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
      const capScore = isAvailable ? Math.min(40, remainingCapacity * 20) : 0;
      const timingScore = slotStartMins >= 600 && slotStartMins <= 720 ? 30 : 20;
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
        dayName: getDayName(date),
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

// 5. TRANSACTIONAL ADVANCE SLOT BOOKING WITH OVERBOOKING PROTECTION
export const bookSlot = (req: Request, res: Response): void => {
  try {
    const { farmerId, centerId, slotId, cropId, expectedQuantity, crops, lat, lng, date } = req.body;

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

    // CRITICAL: Recheck slot and capacity atomically (Concurrency Control & Overbooking Protection)
    const targetSlot = db.prepare('SELECT * FROM slots WHERE id = ?').get(slotId) as any;
    if (!targetSlot) {
      res.status(404).json({ success: false, message: 'Selected time slot not found.' });
      return;
    }

    const targetDate = targetSlot.date || date || new Date().toISOString().split('T')[0];

    // Validate past dates
    if (isPastDate(targetDate)) {
      res.status(400).json({ success: false, message: 'Cannot book a slot for a past date. Please select a future date.' });
      return;
    }

    // Check center schedule status for that date
    const dateSchedule = ensureCenterScheduleForDate(centerId, targetDate);
    if (dateSchedule.is_working_day === 0 || dateSchedule.status === 'CLOSED' || dateSchedule.status === 'HOLIDAY') {
      res.status(400).json({
        success: false,
        message: `Procurement center is marked as ${dateSchedule.status || 'Closed'} on ${getFormattedDate(targetDate)} (${dateSchedule.day_name}). Please select another date.`
      });
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

    // Overbooking check: if already at full capacity
    if (targetSlot.booked_count >= targetSlot.capacity || targetSlot.status === 'Booked') {
      // Find next available slot on that day
      const fallbackSlot = db.prepare(`
        SELECT * FROM slots 
        WHERE center_id = ? AND date = ? AND status = 'Available' AND booked_count < capacity
        ORDER BY start_time ASC
        LIMIT 1
      `).get(centerId, targetDate) as any;

      res.status(409).json({
        success: false,
        message: 'This slot was just booked by another farmer.',
        slotFull: true,
        suggestedSlot: fallbackSlot ? {
          id: fallbackSlot.id,
          time: `${fallbackSlot.start_time} - ${fallbackSlot.end_time}`,
          masterWindow: fallbackSlot.master_window
        } : null,
        alternativeAvailable: Boolean(fallbackSlot)
      });
      return;
    }

    // Prevent duplicate active booking: cancel and supersede any active booking for the farmer
    const activeBooking = db
      .prepare(`
        SELECT b.*, t.token_number, t.status as token_status
        FROM bookings b
        LEFT JOIN tokens t ON b.id = t.booking_id
        WHERE b.farmer_id = ? AND b.status NOT IN ('Procurement Completed', 'Bill Generated', 'Payment Completed', 'Cancelled')
      `)
      .get(farmerId) as any;

    if (activeBooking) {
      db.prepare(`
        UPDATE slots 
        SET booked_count = MAX(0, booked_count - 1),
            available_count = MIN(capacity, available_count + 1),
            status = CASE WHEN status = 'Booked' THEN 'Available' ELSE status END
        WHERE id = ?
      `).run(activeBooking.slot_id);

      db.prepare("UPDATE bookings SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(activeBooking.id);
      db.prepare("UPDATE tokens SET status = 'Cancelled' WHERE booking_id = ?").run(activeBooking.id);
      db.prepare("DELETE FROM queue WHERE booking_id = ?").run(activeBooking.id);
    }

    // Update slot capacity atomically
    const newBookedCount = targetSlot.booked_count + 1;
    const newStatus = newBookedCount >= targetSlot.capacity ? 'Booked' : 'Available';
    const newAvailableCount = Math.max(0, targetSlot.capacity - newBookedCount);

    db.prepare(`
      UPDATE slots 
      SET booked_count = ?, status = ?, available_count = ?
      WHERE id = ?
    `).run(newBookedCount, newStatus, newAvailableCount, targetSlot.id);

    // Update centre date schedule
    db.prepare(`
      UPDATE centre_date_schedules
      SET booked_capacity = booked_capacity + 1,
          remaining_capacity = MAX(0, remaining_capacity - 1),
          status = CASE WHEN remaining_capacity - 1 <= 0 THEN 'FULL' WHEN remaining_capacity - 1 <= daily_capacity * 0.25 THEN 'LIMITED_AVAILABILITY' ELSE status END,
          updated_at = CURRENT_TIMESTAMP
      WHERE centre_id = ? AND date = ?
    `).run(centerId, targetDate);

    // Calculate queue position & token
    const queueCount = db
      .prepare('SELECT count(*) as cnt FROM bookings WHERE center_id = ? AND date = ? AND status NOT IN (\'Procurement Completed\', \'Cancelled\')')
      .get(centerId, targetDate) as { cnt: number };

    const queuePos = (queueCount?.cnt || 0) + 1;
    const dateCompact = targetDate.replace(/-/g, '');
    const bookingRand = Math.floor(100000 + Math.random() * 900000);
    const bookingId = `KG-${dateCompact}-${bookingRand}`;

    const centerCode = center.code ? center.code.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase() : 'CEN';
    const tokenNumber = `KG-${centerCode}-${String(queuePos).padStart(3, '0')}`;

    // Estimated travel and processing
    const distance = calculateDistance(farmerLat, farmerLng, center.latitude, center.longitude);
    const travelTime = estimateTravelTime(distance);
    const processingMins = Math.round(15 + Math.max(0, (computedQuantity - 1000) / 1000) * 5);
    const waitingMins = center.waitingTimeMins || 15;
    const totalJourneyTime = travelTime + waitingMins + processingMins;

    const slotStartMins = timeToMinutes(targetSlot.start_time);
    const departureMins = slotStartMins - travelTime - 15;
    const departureTime = minutesToTime(departureMins);
    const dayName = getDayName(targetDate);

    // Insert booking
    db.prepare(`
      INSERT INTO bookings (
        id, farmer_id, center_id, slot_id, crop_id, date, day_name,
        master_slot_id, sub_slot_id, token_number, expected_quantity,
        priority_score, estimated_processing_mins, estimated_waiting_mins,
        travel_time_mins, planned_start_time, planned_end_time, estimated_start_time,
        delay_minutes, status, crops_breakdown, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Slot Booked', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      bookingId,
      farmerId,
      centerId,
      targetSlot.id,
      targetCropId,
      targetDate,
      dayName,
      targetSlot.master_window,
      `${targetSlot.start_time} - ${targetSlot.end_time}`,
      tokenNumber,
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

    // In-app & Simulated SMS Notification
    const notifMessage = `Your procurement slot at ${center.name} is confirmed for ${getFormattedDate(targetDate)} (${dayName}) at ${targetSlot.start_time} - ${targetSlot.end_time}. Token: ${tokenNumber}`;

    db.prepare(`
      INSERT INTO notifications (id, user_id, user_type, title, message, type)
      VALUES (?, ?, 'farmer', ?, ?, 'slot_confirmation')
    `).run(
      `notif-${Date.now()}`,
      farmerId,
      `Slot Confirmed: ${tokenNumber}`,
      notifMessage
    );

    res.json({
      success: true,
      message: 'Procurement slot successfully booked!',
      data: {
        bookingId,
        tokenNumber,
        queuePosition: queuePos,
        date: targetDate,
        dayName,
        dateFormatted: getFormattedDate(targetDate),
        masterWindow: targetSlot.master_window,
        slotTime: `${targetSlot.start_time} - ${targetSlot.end_time}`,
        centerName: center.name,
        centerAddress: center.address,
        recommendedDepartureTime: departureTime,
        travelTimeMins: travelTime,
        estimatedWaitingMins: waitingMins,
        processingMins,
        totalJourneyTimeMins: totalJourneyTime,
        status: 'Slot Booked'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. RESCHEDULE BOOKING
export const rescheduleBooking = (req: Request, res: Response): void => {
  try {
    const { bookingId } = req.params;
    const { newCenterId, newSlotId, newDate, lat, lng } = req.body;

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as any;
    if (!booking) {
      res.status(404).json({ success: false, message: 'Existing booking not found.' });
      return;
    }

    if (booking.status.includes('Completed') || booking.status === 'Cancelled') {
      res.status(400).json({ success: false, message: `Cannot reschedule a booking with status '${booking.status}'.` });
      return;
    }

    const targetCenterId = newCenterId || booking.center_id;
    const center = db.prepare('SELECT * FROM procurement_centers WHERE id = ?').get(targetCenterId) as any;
    if (!center) {
      res.status(404).json({ success: false, message: 'Target procurement center not found.' });
      return;
    }

    const newSlot = db.prepare('SELECT * FROM slots WHERE id = ?').get(newSlotId) as any;
    if (!newSlot) {
      res.status(404).json({ success: false, message: 'New slot not found.' });
      return;
    }

    const targetDate = newSlot.date || newDate || booking.date;
    if (isPastDate(targetDate)) {
      res.status(400).json({ success: false, message: 'Cannot reschedule to a past date.' });
      return;
    }

    // Check slot availability
    if (newSlot.booked_count >= newSlot.capacity || newSlot.status === 'Booked' || newSlot.status === 'Reserved') {
      res.status(409).json({ success: false, message: 'The selected new slot is no longer available. Please choose another.' });
      return;
    }

    // 1. Release previous slot
    db.prepare(`
      UPDATE slots 
      SET booked_count = MAX(0, booked_count - 1),
          available_count = MIN(capacity, available_count + 1),
          status = CASE WHEN status = 'Booked' THEN 'Available' ELSE status END
      WHERE id = ?
    `).run(booking.slot_id);

    // 2. Reserve new slot
    const newBookedCount = newSlot.booked_count + 1;
    const newStatus = newBookedCount >= newSlot.capacity ? 'Booked' : 'Available';
    const newAvailCount = Math.max(0, newSlot.capacity - newBookedCount);

    db.prepare(`
      UPDATE slots 
      SET booked_count = ?, status = ?, available_count = ?
      WHERE id = ?
    `).run(newBookedCount, newStatus, newAvailCount, newSlot.id);

    // 3. Recalculate travel & waiting times
    const farmerLat = lat || 12.2253;
    const farmerLng = lng || 79.0747;
    const distance = calculateDistance(farmerLat, farmerLng, center.latitude, center.longitude);
    const travelTime = estimateTravelTime(distance);
    const slotStartMins = timeToMinutes(newSlot.start_time);
    const departureMins = slotStartMins - travelTime - 15;
    const departureTime = minutesToTime(departureMins);
    const dayName = getDayName(targetDate);

    // 4. Update booking
    db.prepare(`
      UPDATE bookings 
      SET center_id = ?, slot_id = ?, date = ?, day_name = ?,
          master_slot_id = ?, sub_slot_id = ?,
          planned_start_time = ?, planned_end_time = ?, estimated_start_time = ?,
          travel_time_mins = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      targetCenterId,
      newSlot.id,
      targetDate,
      dayName,
      newSlot.master_window,
      `${newSlot.start_time} - ${newSlot.end_time}`,
      newSlot.start_time,
      newSlot.end_time,
      newSlot.start_time,
      travelTime,
      bookingId
    );

    // 5. Update token departure time
    db.prepare('UPDATE tokens SET recommended_departure_time = ? WHERE booking_id = ?').run(departureTime, bookingId);

    // 6. Rescheduling notification
    const reschedMessage = `Your appointment has been successfully rescheduled to ${getFormattedDate(targetDate)} (${dayName}) at ${newSlot.start_time} - ${newSlot.end_time} at ${center.name}.`;
    db.prepare(`
      INSERT INTO notifications (id, user_id, user_type, title, message, type)
      VALUES (?, ?, 'farmer', ?, ?, 'slot_rescheduled')
    `).run(`notif-${Date.now()}`, booking.farmer_id, 'Slot Rescheduled', reschedMessage);

    res.json({
      success: true,
      message: 'Procurement slot successfully rescheduled!',
      data: {
        bookingId,
        centerName: center.name,
        date: targetDate,
        dayName,
        slotTime: `${newSlot.start_time} - ${newSlot.end_time}`,
        masterWindow: newSlot.master_window,
        departureTime
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

// 10. OFFICER: BULK GENERATE SCHEDULE (e.g. Next 14 Days)
export const bulkGenerateSchedule = (req: Request, res: Response): void => {
  try {
    const {
      centerId,
      days = 14,
      openingTime = '09:00 AM',
      closingTime = '05:00 PM',
      farmersPerSubSlot = 2,
      workingDays = [1, 2, 3, 4, 5, 6] // 0=Sun, 1=Mon, ..., 6=Sat
    } = req.body;

    if (!centerId) {
      res.status(400).json({ success: false, message: 'centerId is required' });
      return;
    }

    const today = new Date();
    const createdSchedules: any[] = [];

    for (let i = 0; i < days; i++) {
      const targetDate = new Date(today.getTime() + i * 86400000);
      const dateStr = targetDate.toISOString().split('T')[0];
      const dayOfWeek = targetDate.getDay();
      const isWorking = workingDays.includes(dayOfWeek) ? 1 : 0;
      const status = isWorking ? 'AVAILABLE' : 'CLOSED';
      const dayName = getDayName(dateStr);
      const scheduleId = `sched-${centerId}-${dateStr}`;
      const dailyCapacity = farmersPerSubSlot * 32; // ~32 sub-slots in 8-hour day

      db.prepare(`
        INSERT INTO centre_date_schedules (
          schedule_id, centre_id, date, day_name, is_working_day,
          opening_time, closing_time, daily_capacity, booked_capacity, reserved_capacity, remaining_capacity,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(centre_id, date) DO UPDATE SET
          opening_time = excluded.opening_time,
          closing_time = excluded.closing_time,
          daily_capacity = excluded.daily_capacity,
          is_working_day = excluded.is_working_day,
          status = CASE WHEN centre_date_schedules.status IN ('HOLIDAY', 'RESERVED') THEN centre_date_schedules.status ELSE excluded.status END,
          updated_at = CURRENT_TIMESTAMP
      `).run(scheduleId, centerId, dateStr, dayName, isWorking, openingTime, closingTime, dailyCapacity, dailyCapacity, status);

      // Ensure slots exist
      ensureCenterSlotsForDate(centerId, dateStr, scheduleId);

      // Adjust slot capacity
      db.prepare(`
        UPDATE slots 
        SET capacity = ?, available_count = CASE WHEN status = 'Available' THEN MAX(0, ? - booked_count) ELSE available_count END
        WHERE center_id = ? AND date = ? AND booked_count = 0
      `).run(farmersPerSubSlot, farmersPerSubSlot, centerId, dateStr);

      createdSchedules.push({ date: dateStr, dayName, isWorking, status });
    }

    res.json({
      success: true,
      message: `Successfully generated ${days}-day multi-day schedule for center.`,
      data: {
        centerId,
        daysGenerated: days,
        schedules: createdSchedules
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 11. OFFICER: UPDATE DATE SCHEDULE STATUS (Toggle Holiday, Closure, Working Day)
export const updateDateScheduleStatus = (req: Request, res: Response): void => {
  try {
    const { centerId, date, status, isWorkingDay, notes } = req.body;

    if (!centerId || !date || !status) {
      res.status(400).json({ success: false, message: 'centerId, date and status are required' });
      return;
    }

    const workingFlag = typeof isWorkingDay === 'boolean' ? (isWorkingDay ? 1 : 0) : (status === 'CLOSED' || status === 'HOLIDAY' ? 0 : 1);

    db.prepare(`
      INSERT INTO centre_date_schedules (
        schedule_id, centre_id, date, day_name, is_working_day,
        status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(centre_id, date) DO UPDATE SET
        is_working_day = excluded.is_working_day,
        status = excluded.status,
        notes = excluded.notes,
        updated_at = CURRENT_TIMESTAMP
    `).run(`sched-${centerId}-${date}`, centerId, date, getDayName(date), workingFlag, status, notes || null);

    // If day is marked as CLOSED or HOLIDAY, mark non-booked slots as Closed
    if (workingFlag === 0) {
      db.prepare(`
        UPDATE slots 
        SET status = 'Closed' 
        WHERE center_id = ? AND date = ? AND booked_count = 0
      `).run(centerId, date);
    } else {
      // Reopen closed slots that had 0 bookings
      db.prepare(`
        UPDATE slots 
        SET status = 'Available' 
        WHERE center_id = ? AND date = ? AND booked_count = 0 AND status = 'Closed'
      `).run(centerId, date);
    }

    res.json({
      success: true,
      message: `Date ${date} status updated to ${status}.`,
      data: { centerId, date, status, isWorkingDay: workingFlag === 1 }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

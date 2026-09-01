import { Request, Response } from 'express';
import { db } from '../db/database.js';

// Convert 'HH:MM AM/PM' to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
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
export function minutesToTime(totalMins: number): string {
  let normalized = (totalMins + 1440) % 1440;
  let hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function getCurrentTimeFormatted(): string {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Recalculates dynamic queue, active delay, and propagates updated estimated times to all waiting farmers
export function recalculateCenterDynamicQueue(centerId: string): any {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Get Active Processing Farmer
  const activeFarmer = db
    .prepare(`
      SELECT 
        b.*,
        f.name as farmer_name,
        f.mobile as farmer_mobile,
        f.village as farmer_village,
        cr.name as crop_name,
        cr.msp_rate,
        t.token_number,
        s.master_window,
        s.start_time as slot_start,
        s.end_time as slot_end
      FROM bookings b
      JOIN farmers f ON b.farmer_id = f.id
      JOIN crops cr ON b.crop_id = cr.id
      LEFT JOIN slots s ON b.slot_id = s.id
      LEFT JOIN tokens t ON b.id = t.booking_id
      WHERE b.center_id = ? AND b.status IN ('Processing', 'Called')
      ORDER BY b.created_at ASC
      LIMIT 1
    `)
    .get(centerId) as any;

  let currentCenterDelayMins = 0;
  let activeElapsedMins = 0;
  let activeRemainingMins = 0;

  if (activeFarmer) {
    const plannedStart = activeFarmer.planned_start_time || activeFarmer.slot_start || '09:00 AM';
    const plannedEnd = activeFarmer.planned_end_time || activeFarmer.slot_end || '09:15 AM';
    const plannedStartMins = timeToMinutes(plannedStart);
    const plannedEndMins = timeToMinutes(plannedEnd);
    const plannedDuration = Math.max(15, plannedEndMins - plannedStartMins);

    const actualStartMins = activeFarmer.actual_start_time
      ? timeToMinutes(activeFarmer.actual_start_time)
      : plannedStartMins;

    // Compute active delay from either manual expected completion or elapsed timer
    if (activeFarmer.expected_completion_time) {
      const expCompMins = timeToMinutes(activeFarmer.expected_completion_time);
      currentCenterDelayMins = Math.max(0, expCompMins - plannedEndMins);
      activeElapsedMins = Math.max(0, expCompMins - actualStartMins);
      activeRemainingMins = Math.max(2, currentCenterDelayMins);
    } else if (activeFarmer.delay_minutes && activeFarmer.delay_minutes > 0) {
      currentCenterDelayMins = activeFarmer.delay_minutes;
      activeElapsedMins = plannedDuration + currentCenterDelayMins;
      activeRemainingMins = Math.max(2, currentCenterDelayMins);
    } else {
      // Default: check if activeFarmer has planned duration
      currentCenterDelayMins = 0;
      activeElapsedMins = 8; // demo active progress
      activeRemainingMins = Math.max(2, plannedDuration - activeElapsedMins);
    }

    // Update active booking delay in DB
    db.prepare(`
      UPDATE bookings
      SET delay_minutes = ?,
          status = CASE WHEN ? > 0 THEN 'Delayed' ELSE status END
      WHERE id = ?
    `).run(currentCenterDelayMins, currentCenterDelayMins, activeFarmer.id);
  }

  // 2. Fetch Waiting Farmers in Queue
  const waitingFarmers = db
    .prepare(`
      SELECT 
        b.*,
        f.name as farmer_name,
        f.mobile as farmer_mobile,
        f.village as farmer_village,
        cr.name as crop_name,
        cr.msp_rate,
        t.token_number,
        s.master_window,
        s.start_time as slot_start,
        s.end_time as slot_end,
        q.position as queue_position
      FROM bookings b
      JOIN farmers f ON b.farmer_id = f.id
      JOIN crops cr ON b.crop_id = cr.id
      LEFT JOIN slots s ON b.slot_id = s.id
      LEFT JOIN tokens t ON b.id = t.booking_id
      LEFT JOIN queue q ON b.id = q.booking_id
      WHERE b.center_id = ? 
        AND b.status IN ('Waiting', 'Delayed', 'Slot Booked', 'Arrived')
      ORDER BY q.position ASC, b.created_at ASC
    `)
    .all(centerId) as any[];

  // 3. Propagate Delay to all waiting farmers
  const updateBookingStmt = db.prepare(`
    UPDATE bookings 
    SET estimated_start_time = ?,
        estimated_waiting_mins = ?,
        delay_minutes = ?,
        status = CASE WHEN ? > 0 AND status = 'Waiting' THEN 'Delayed' ELSE status END
    WHERE id = ?
  `);

  const updateQueueStmt = db.prepare(`
    UPDATE queue
    SET position = ?,
        estimated_wait = ?,
        status = CASE WHEN ? > 0 AND status = 'Waiting' THEN 'Delayed' ELSE status END,
        updated_at = CURRENT_TIMESTAMP
    WHERE booking_id = ?
  `);

  const enrichedWaitingQueue = waitingFarmers.map((farmer, index) => {
    const plannedStart = farmer.planned_start_time || farmer.slot_start || '09:30 AM';
    const plannedStartMins = timeToMinutes(plannedStart);

    // Dynamic start calculation with delay offset
    const delayOffset = currentCenterDelayMins;
    const estStartMins = plannedStartMins + delayOffset;
    const estStartTime = minutesToTime(estStartMins);

    // Waiting time = active remaining + (index * 15)
    const estWaitMins = Math.max(5, (activeRemainingMins || 7) + index * 15);
    const newPosition = index + 1 + (activeFarmer ? 1 : 0);

    updateBookingStmt.run(estStartTime, estWaitMins, delayOffset, delayOffset, farmer.id);
    updateQueueStmt.run(newPosition, estWaitMins, delayOffset, farmer.id);

    return {
      ...farmer,
      queue_position: newPosition,
      planned_start_time: plannedStart,
      planned_end_time: farmer.planned_end_time || farmer.slot_end,
      estimated_start_time: estStartTime,
      estimated_waiting_time: estWaitMins,
      delay_minutes: delayOffset,
      is_delayed: delayOffset > 0,
      status: delayOffset > 0 && farmer.status === 'Waiting' ? 'Delayed' : farmer.status
    };
  });

  // 4. Fetch Completed Farmers for Today
  const completedFarmers = db
    .prepare(`
      SELECT 
        b.*,
        f.name as farmer_name,
        cr.name as crop_name,
        t.token_number
      FROM bookings b
      JOIN farmers f ON b.farmer_id = f.id
      JOIN crops cr ON b.crop_id = cr.id
      LEFT JOIN tokens t ON b.id = t.booking_id
      WHERE b.center_id = ? AND b.status IN ('Procurement Completed', 'Bill Generated', 'Payment Completed')
      ORDER BY b.created_at DESC
      LIMIT 10
    `)
    .all(centerId) as any[];

  return {
    centerId,
    currentDelayMins: currentCenterDelayMins,
    hasActiveDelay: currentCenterDelayMins > 0,
    activeProcessingFarmer: activeFarmer
      ? {
          ...activeFarmer,
          planned_start_time: activeFarmer.planned_start_time || activeFarmer.slot_start,
          planned_end_time: activeFarmer.planned_end_time || activeFarmer.slot_end,
          elapsed_processing_mins: activeElapsedMins,
          delay_minutes: currentCenterDelayMins,
          is_delayed: currentCenterDelayMins > 0,
          expected_completion_time:
            activeFarmer.expected_completion_time ||
            minutesToTime(timeToMinutes(activeFarmer.planned_end_time || activeFarmer.slot_end || '09:30 AM') + currentCenterDelayMins)
        }
      : null,
    waitingQueue: enrichedWaitingQueue,
    completedToday: completedFarmers,
    totalWaiting: enrichedWaitingQueue.length,
    averageProcessingMins: 15
  };
}

// 1. GET DYNAMIC QUEUE & REAL-TIME DELAYS
export const getDynamicQueue = (req: Request, res: Response): void => {
  try {
    const centerId = req.params.centerId as string;
    const center = db.prepare('SELECT * FROM procurement_centers WHERE id = ?').get(centerId) as any;
    if (!center) {
      res.status(404).json({ success: false, message: 'Center not found' });
      return;
    }

    const data = recalculateCenterDynamicQueue(centerId);

    res.json({
      success: true,
      data: {
        ...data,
        centerName: center.name,
        centerAddress: center.address
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. OFFICER: START PROCESSING (Mark arrival at bay & begin live processing timer)
export const startFarmerProcessing = (req: Request, res: Response): void => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      res.status(400).json({ success: false, message: 'bookingId is required' });
      return;
    }

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as any;
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    const currentTime = getCurrentTimeFormatted();

    db.transaction(() => {
      db.prepare(`
        UPDATE bookings 
        SET status = 'Processing',
            actual_start_time = COALESCE(actual_start_time, ?),
            delay_minutes = 0
        WHERE id = ?
      `).run(currentTime, bookingId);

      db.prepare(`
        UPDATE queue 
        SET status = 'Processing', updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = ?
      `).run(bookingId);

      db.prepare(`
        UPDATE tokens 
        SET status = 'Called'
        WHERE booking_id = ?
      `).run(bookingId);
    })();

    const updatedData = recalculateCenterDynamicQueue(booking.center_id);

    res.json({
      success: true,
      message: `Farmer processing started at ${currentTime}`,
      data: updatedData
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. OFFICER: UPDATE EXPECTED COMPLETION TIME OR ADD DELAY BUFFER
export const updateExpectedCompletion = (req: Request, res: Response): void => {
  try {
    const { bookingId, addMinutes, expectedCompletionTime } = req.body;

    if (!bookingId) {
      res.status(400).json({ success: false, message: 'bookingId is required' });
      return;
    }

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as any;
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    const plannedEnd = booking.planned_end_time || '09:30 AM';
    const plannedEndMins = timeToMinutes(plannedEnd);

    let newExpCompletionTime = expectedCompletionTime;
    let newDelayMins = 0;

    if (addMinutes) {
      const currentDelay = booking.delay_minutes || 0;
      newDelayMins = currentDelay + Number(addMinutes);
      newExpCompletionTime = minutesToTime(plannedEndMins + newDelayMins);
    } else if (expectedCompletionTime) {
      const expMins = timeToMinutes(expectedCompletionTime);
      newDelayMins = Math.max(0, expMins - plannedEndMins);
    }

    db.prepare(`
      UPDATE bookings 
      SET expected_completion_time = ?,
          delay_minutes = ?,
          status = CASE WHEN ? > 0 THEN 'Delayed' ELSE status END
      WHERE id = ?
    `).run(newExpCompletionTime, newDelayMins, newDelayMins, bookingId);

    const updatedData = recalculateCenterDynamicQueue(booking.center_id);

    res.json({
      success: true,
      message: `Expected completion updated to ${newExpCompletionTime} (+${newDelayMins} mins delay propagated)`,
      data: updatedData
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. OFFICER: SKIP FARMER (Farmer not present or delayed arrival)
export const skipFarmer = (req: Request, res: Response): void => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      res.status(400).json({ success: false, message: 'bookingId is required' });
      return;
    }

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as any;
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE bookings 
        SET status = 'Skipped'
        WHERE id = ?
      `).run(bookingId);

      db.prepare(`
        DELETE FROM queue WHERE booking_id = ?
      `).run(bookingId);
    })();

    const updatedData = recalculateCenterDynamicQueue(booking.center_id);

    res.json({
      success: true,
      message: 'Farmer skipped from active turn. Remaining queue recalculated.',
      data: updatedData
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. OFFICER: NOTIFY AFFECTED FARMERS OF DELAY
export const notifyAffectedFarmersOfDelay = (req: Request, res: Response): void => {
  try {
    const { centerId, customMessage } = req.body;
    if (!centerId) {
      res.status(400).json({ success: false, message: 'centerId is required' });
      return;
    }

    const queueData = recalculateCenterDynamicQueue(centerId);
    const affectedFarmers = queueData.waitingQueue;

    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, user_id, user_type, title, message, type)
      VALUES (?, ?, 'farmer', ?, ?, 'queue_delay')
    `);

    affectedFarmers.forEach((farmer: any) => {
      const msg =
        customMessage ||
        `FarmeGo Alert: Your procurement slot is experiencing a ~${farmer.delay_minutes || queueData.currentDelayMins} min delay. Your booking remains confirmed with updated estimated arrival: ${farmer.estimated_start_time}.`;

      insertNotif.run(
        `notif-delay-${Date.now()}-${farmer.farmer_id}`,
        farmer.farmer_id,
        '⏱️ Queue Delay Update - Booking Confirmed',
        msg
      );
    });

    res.json({
      success: true,
      message: `Delay alert broadcasted to ${affectedFarmers.length} waiting farmers.`,
      notifiedCount: affectedFarmers.length
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Legacy compatibility
export const getLiveQueue = getDynamicQueue;
export const updateQueueItemStatus = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const queueItem = db.prepare('SELECT * FROM queue WHERE id = ?').get(id) as any;
    if (queueItem) {
      db.prepare('UPDATE queue SET status = ? WHERE id = ?').run(status, id);
      db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, queueItem.booking_id);
    }

    res.json({ success: true, message: `Status updated to ${status}` });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

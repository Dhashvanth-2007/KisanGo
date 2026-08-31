import { Request, Response } from 'express';
import { db } from '../db/database.js';

export const getOfficerDashboardData = (req: Request, res: Response): void => {
  try {
    const { centerId } = req.params;

    const center = db.prepare('SELECT * FROM procurement_centers WHERE id = ?').get(centerId) as any;
    if (!center) {
      res.status(404).json({ success: false, message: 'Center not found' });
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Today's total bookings
    const bookings = db
      .prepare(
        `
      SELECT 
        b.*,
        t.token_number,
        t.queue_position,
        t.recommended_departure_time,
        f.name as farmer_name,
        f.mobile as farmer_mobile,
        f.village as farmer_village,
        cr.name as crop_name,
        cr.msp_rate,
        s.start_time as slot_start,
        s.end_time as slot_end,
        pr.actual_quantity,
        pr.moisture_percentage,
        pr.foreign_matter_percentage,
        pr.quality_grade,
        pr.quality_status,
        bl.bill_number,
        bl.net_amount,
        pay.status as payment_status,
        pay.utr_reference
      FROM bookings b
      LEFT JOIN tokens t ON b.id = t.booking_id
      LEFT JOIN farmers f ON b.farmer_id = f.id
      LEFT JOIN crops cr ON b.crop_id = cr.id
      LEFT JOIN slots s ON b.slot_id = s.id
      LEFT JOIN procurement_records pr ON b.id = pr.booking_id
      LEFT JOIN bills bl ON pr.id = bl.procurement_id
      LEFT JOIN payments pay ON bl.id = pay.bill_id
      WHERE b.center_id = ? AND s.date = ?
      ORDER BY 
        CASE 
          WHEN b.status = 'Processing' THEN 1
          WHEN b.status = 'Called' THEN 2
          WHEN b.status = 'Waiting' THEN 3
          WHEN b.status = 'Slot Booked' THEN 4
          WHEN b.status LIKE '%Procurement Completed%' OR b.status LIKE '%Bill%' OR b.status LIKE '%Payment%' THEN 5
          ELSE 6
        END,
        s.start_time ASC
    `
      )
      .all(centerId, todayStr) as any[];

    // Metrics
    const totalFarmers = bookings.length;
    const waitingFarmers = bookings.filter((b) => b.status === 'Waiting' || b.status === 'Slot Booked' || b.status === 'Called').length;
    const currentlyProcessing = bookings.filter((b) => b.status === 'Processing' || b.status === 'Weight Recorded' || b.status === 'Quality Checked').length;
    const completedFarmers = bookings.filter((b) => b.status.includes('Completed') || b.status.includes('Payment') || b.status.includes('Bill')).length;
    const totalQuantityKg = bookings
      .filter((b) => b.actual_quantity)
      .reduce((sum, b) => sum + (b.actual_quantity || 0), 0);

    res.json({
      success: true,
      data: {
        center,
        stats: {
          totalFarmers,
          waitingFarmers,
          currentlyProcessing,
          completedFarmers,
          totalQuantityKg,
          dailyCapacity: center.daily_capacity,
          currentCapacity: center.current_capacity
        },
        farmers: bookings
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Step 1: Officer Verifies Farmer
export const verifyFarmer = (req: Request, res: Response): void => {
  try {
    const { bookingId } = req.body;
    db.prepare("UPDATE bookings SET status = 'Called' WHERE id = ?").run(bookingId);
    db.prepare("UPDATE queue SET status = 'Called' WHERE booking_id = ?").run(bookingId);

    res.json({ success: true, message: 'Farmer verified and called to counter.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Step 2 & 3: Record Weight and Quality Inspection
export const recordWeightAndQuality = (req: Request, res: Response): void => {
  try {
    const {
      bookingId,
      officerId,
      actualQuantity,
      moisturePercentage,
      foreignMatterPercentage,
      qualityGrade,
      remarks
    } = req.body;

    if (!bookingId || !actualQuantity) {
      res.status(400).json({ success: false, message: 'Booking ID and actual weight are required' });
      return;
    }

    const booking = db
      .prepare(
        `
      SELECT b.*, cr.msp_rate, f.id as farmer_id, f.name as farmer_name
      FROM bookings b
      JOIN crops cr ON b.crop_id = cr.id
      JOIN farmers f ON b.farmer_id = f.id
      WHERE b.id = ?
    `
      )
      .get(bookingId) as any;

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    const result = db.transaction(() => {
      // 1. Create or update procurement record
      const procId = `proc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const moisture = parseFloat(moisturePercentage) || 12.0;
      const foreignMatter = parseFloat(foreignMatterPercentage) || 0.5;
      const grade = qualityGrade || 'Grade A';

      // Grade deduction logic if moisture > 14%
      let deductionPerKg = 0;
      if (moisture > 14.0) {
        deductionPerKg = (moisture - 14.0) * 0.25; // 25 paise per kg per excess moisture %
      }

      const qualityStatus = deductionPerKg > 0 ? 'Deduction Applied' : 'Accepted';

      db.prepare(`
        INSERT INTO procurement_records (
          id, booking_id, officer_id, actual_quantity, moisture_percentage, 
          foreign_matter_percentage, quality_grade, quality_status, remarks
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        procId,
        bookingId,
        officerId || 'officer-1',
        actualQuantity,
        moisture,
        foreignMatter,
        grade,
        qualityStatus,
        remarks || 'Standard verified consignment'
      );

      // 2. Generate Bill automatically
      const billId = `bill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const billNumber = `KM-BILL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const ratePerKg = booking.msp_rate;
      const grossAmount = Math.round(actualQuantity * ratePerKg * 100) / 100;
      const totalDeductions = Math.round(actualQuantity * deductionPerKg * 100) / 100;
      const netAmount = Math.round((grossAmount - totalDeductions) * 100) / 100;

      db.prepare(`
        INSERT INTO bills (id, bill_number, procurement_id, rate_per_kg, gross_amount, deductions, net_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(billId, billNumber, procId, ratePerKg, grossAmount, totalDeductions, netAmount);

      // 3. Initiate Payment Record
      const payId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const utrRef = `RBI-DBT-${new Date().getFullYear()}${Math.floor(100000000 + Math.random() * 900000000)}`;
      db.prepare(`
        INSERT INTO payments (id, bill_id, farmer_id, amount, status, payment_mode, utr_reference, payment_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(payId, billId, booking.farmer_id, netAmount, 'Payment Processing', 'Direct Benefit Transfer (DBT)', utrRef, null);

      // 4. Update Booking and Token and Queue status
      db.prepare("UPDATE bookings SET status = 'Procurement Completed' WHERE id = ?").run(bookingId);
      db.prepare("UPDATE tokens SET status = 'Completed' WHERE booking_id = ?").run(bookingId);
      db.prepare("UPDATE queue SET status = 'Completed' WHERE booking_id = ?").run(bookingId);

      // 5. Notify farmer
      const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      db.prepare(`
        INSERT INTO notifications (id, user_id, user_type, title, message, type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        notifId,
        booking.farmer_id,
        'farmer',
        `Procurement Complete: Bill #${billNumber}`,
        `Procurement of ${actualQuantity} kg completed. Bill amount ₹${netAmount.toLocaleString('en-IN')} has been sent for DBT bank credit.`,
        'success'
      );

      return {
        procurementId: procId,
        billNumber,
        netAmount,
        grossAmount,
        deductions: totalDeductions,
        ratePerKg,
        actualQuantity,
        grade,
        utrRef
      };
    })();

    res.json({
      success: true,
      message: 'Procurement finalized and official bill generated successfully!',
      data: result
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Officer marks Payment as Completed
export const markPaymentCompleted = (req: Request, res: Response): void => {
  try {
    const { billId } = req.body;
    const todayStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    db.transaction(() => {
      const payment = db.prepare('SELECT * FROM payments WHERE bill_id = ?').get(billId) as any;
      if (!payment) throw new Error('Payment record not found');

      db.prepare(`
        UPDATE payments 
        SET status = 'Payment Completed', payment_date = ?
        WHERE bill_id = ?
      `).run(todayStr, billId);

      // Notify farmer
      db.prepare(`
        INSERT INTO notifications (id, user_id, user_type, title, message, type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        `notif-${Date.now()}`,
        payment.farmer_id,
        'farmer',
        'DBT Payment Credited',
        `₹${payment.amount.toLocaleString('en-IN')} has been successfully credited via DBT (UTR: ${payment.utr_reference}).`,
        'payment'
      );
    })();

    res.json({ success: true, message: 'Payment status updated to Completed' });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Farmer payments and bills history
export const getFarmerPayments = (req: Request, res: Response): void => {
  try {
    const { farmerId } = req.params;

    const payments = db
      .prepare(
        `
      SELECT 
        pay.*,
        bl.bill_number,
        bl.gross_amount,
        bl.deductions,
        bl.net_amount,
        bl.rate_per_kg,
        bl.created_at as bill_date,
        pr.actual_quantity,
        pr.quality_grade,
        pr.moisture_percentage,
        pr.quality_status,
        b.expected_quantity,
        c.name as center_name,
        cr.name as crop_name,
        t.token_number
      FROM payments pay
      JOIN bills bl ON pay.bill_id = bl.id
      JOIN procurement_records pr ON bl.procurement_id = pr.id
      JOIN bookings b ON pr.booking_id = b.id
      JOIN procurement_centers c ON b.center_id = c.id
      JOIN crops cr ON b.crop_id = cr.id
      JOIN tokens t ON b.id = t.booking_id
      WHERE pay.farmer_id = ?
      ORDER BY pay.created_at DESC
    `
      )
      .all(farmerId) as any[];

    res.json({ success: true, data: payments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Officer Center Management Updates (Working hours, capacity, closure)
export const updateCenterSettings = (req: Request, res: Response): void => {
  try {
    const { centerId } = req.params;
    const { workingHours, dailyCapacity, status, facilities } = req.body;

    db.prepare(`
      UPDATE procurement_centers
      SET working_hours = COALESCE(?, working_hours),
          daily_capacity = COALESCE(?, daily_capacity),
          status = COALESCE(?, status),
          facilities = COALESCE(?, facilities)
      WHERE id = ?
    `).run(
      workingHours,
      dailyCapacity,
      status,
      facilities ? JSON.stringify(facilities) : null,
      centerId
    );

    const updated = db.prepare('SELECT * FROM procurement_centers WHERE id = ?').get(centerId);
    res.json({ success: true, message: 'Center settings updated successfully', data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

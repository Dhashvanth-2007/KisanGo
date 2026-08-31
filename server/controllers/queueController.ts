import { Request, Response } from 'express';
import { db } from '../db/database.js';

export const getLiveQueue = (req: Request, res: Response): void => {
  try {
    const { centerId } = req.params;
    const bookingId = req.query.bookingId as string;

    const center = db.prepare('SELECT * FROM procurement_centers WHERE id = ?').get(centerId) as any;
    if (!center) {
      res.status(404).json({ success: false, message: 'Center not found' });
      return;
    }

    // Get active queue items
    const queueItems = db
      .prepare(
        `
      SELECT 
        q.*,
        t.token_number,
        b.expected_quantity,
        b.status as booking_status,
        f.name as farmer_name,
        cr.name as crop_name,
        s.start_time as slot_start,
        s.end_time as slot_end
      FROM queue q
      JOIN bookings b ON q.booking_id = b.id
      JOIN tokens t ON b.id = t.booking_id
      JOIN farmers f ON b.farmer_id = f.id
      JOIN crops cr ON b.crop_id = cr.id
      JOIN slots s ON b.slot_id = s.id
      WHERE q.center_id = ?
      ORDER BY q.position ASC
    `
      )
      .all(centerId) as any[];

    // Currently processing token
    const currentlyProcessing = queueItems.find((item) => item.status === 'Processing') || queueItems.find((item) => item.status === 'Called') || null;

    let farmerQueueInfo = null;
    let alerts: string[] = [];

    if (bookingId) {
      const farmerItemIndex = queueItems.findIndex((item) => item.booking_id === bookingId);
      if (farmerItemIndex !== -1) {
        const farmerItem = queueItems[farmerItemIndex];
        const farmersBefore = farmerItemIndex;
        const estimatedWait = Math.max(5, farmersBefore * (centerId === 'center-b' ? 3 : 5));

        if (farmerItem.status === 'Called') {
          alerts.push('📢 Your token has been called! Please proceed to Weighbridge Counter #1.');
        } else if (farmerItem.status === 'Processing') {
          alerts.push('⚖️ Your grain weighment & quality inspection is actively in progress.');
        } else if (farmersBefore === 0) {
          alerts.push('🟢 You are NEXT in line! Please prepare your vehicle at the entry bay.');
        } else if (farmersBefore <= 2) {
          alerts.push(`🟡 Your slot is approaching. Only ${farmersBefore} vehicle(s) ahead of you.`);
        }

        farmerQueueInfo = {
          ...farmerItem,
          farmers_before: farmersBefore,
          calculated_wait_mins: estimatedWait
        };
      }
    }

    res.json({
      success: true,
      data: {
        centerId,
        centerName: center.name,
        currentServingToken: currentlyProcessing?.token_number || (queueItems.length > 0 ? queueItems[0].token_number : 'None'),
        currentProcessingStatus: currentlyProcessing?.status || 'Active',
        totalInQueue: queueItems.length,
        waitingCount: queueItems.filter((i) => i.status === 'Waiting').length,
        queue: queueItems,
        farmerQueueInfo,
        alerts
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Officer updates queue status (e.g. Call token, Start processing)
export const updateQueueItemStatus = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Waiting', 'Called', 'Processing', 'Completed'

    db.transaction(() => {
      const queueItem = db.prepare('SELECT * FROM queue WHERE id = ?').get(id) as any;
      if (!queueItem) throw new Error('Queue item not found');

      db.prepare(`
        UPDATE queue 
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, id);

      // Also sync booking status
      const bookingStatus =
        status === 'Called'
          ? 'Called'
          : status === 'Processing'
          ? 'Processing'
          : status === 'Completed'
          ? 'Procurement Completed'
          : 'Waiting';

      db.prepare(`
        UPDATE bookings
        SET status = ?
        WHERE id = ?
      `).run(bookingStatus, queueItem.booking_id);

      db.prepare(`
        UPDATE tokens
        SET status = ?
        WHERE booking_id = ?
      `).run(status === 'Completed' ? 'Completed' : 'Active', queueItem.booking_id);
    })();

    res.json({ success: true, message: `Queue item status updated to ${status}` });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

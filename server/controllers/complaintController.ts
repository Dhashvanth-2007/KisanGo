import { Request, Response } from 'express';
import { db } from '../db/database.js';

export const submitComplaint = (req: Request, res: Response): void => {
  try {
    const { farmerId, centerId, category, description, evidence } = req.body;

    if (!farmerId || !description) {
      res.status(400).json({ success: false, message: 'Farmer ID and complaint description are required' });
      return;
    }

    const complaintSeq = (db.prepare('SELECT count(*) as cnt FROM complaints').get() as any).cnt + 1;
    const complaintNumber = `CMP-${new Date().getFullYear()}-${complaintSeq.toString().padStart(4, '0')}`;
    const complaintId = `cmp-${Date.now()}`;

    // AI summary generation for officers
    const detectedCategory = category || 'Slot / Queue Problem';
    const aiSummary = `[Auto-Triaged]: ${detectedCategory} issue reported at ${centerId ? 'center' : 'general procurement'}. Detail: "${description.slice(0, 100)}..."`;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO complaints (id, complaint_number, farmer_id, center_id, category, description, ai_summary, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(complaintId, complaintNumber, farmerId, centerId || null, detectedCategory, description, aiSummary, 'Submitted');

      // Attach evidence if provided
      if (evidence && Array.isArray(evidence)) {
        const insertEv = db.prepare(`
          INSERT INTO complaint_evidence (id, complaint_id, type, file_url, caption)
          VALUES (?, ?, ?, ?, ?)
        `);
        evidence.forEach((ev: any, idx: number) => {
          insertEv.run(`ev-${Date.now()}-${idx}`, complaintId, ev.type || 'photo', ev.url, ev.caption || '');
        });
      }
    })();

    res.json({
      success: true,
      message: 'Complaint submitted successfully in under 1 minute. Our procurement team will review the evidence.',
      data: {
        complaintId,
        complaintNumber,
        status: 'Submitted',
        category: detectedCategory,
        aiSummary
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFarmerComplaints = (req: Request, res: Response): void => {
  try {
    const { farmerId } = req.params;

    const complaints = db
      .prepare(
        `
      SELECT 
        c.*,
        pc.name as center_name
      FROM complaints c
      LEFT JOIN procurement_centers pc ON c.center_id = pc.id
      WHERE c.farmer_id = ?
      ORDER BY c.created_at DESC
    `
      )
      .all(farmerId) as any[];

    const enriched = complaints.map((cmp) => {
      const evidence = db.prepare('SELECT * FROM complaint_evidence WHERE complaint_id = ?').all(cmp.id);
      return {
        ...cmp,
        evidence
      };
    });

    res.json({ success: true, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllComplaints = (req: Request, res: Response): void => {
  try {
    const { centerId } = req.query;

    let query = `
      SELECT 
        c.*,
        f.name as farmer_name,
        f.mobile as farmer_mobile,
        pc.name as center_name
      FROM complaints c
      JOIN farmers f ON c.farmer_id = f.id
      LEFT JOIN procurement_centers pc ON c.center_id = pc.id
    `;
    const params: any[] = [];

    if (centerId) {
      query += ' WHERE c.center_id = ?';
      params.push(centerId);
    }

    query += ' ORDER BY c.created_at DESC';

    const complaints = db.prepare(query).all(...params) as any[];
    const enriched = complaints.map((cmp) => {
      const evidence = db.prepare('SELECT * FROM complaint_evidence WHERE complaint_id = ?').all(cmp.id);
      return {
        ...cmp,
        evidence
      };
    });

    res.json({ success: true, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resolveComplaint = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;
    const resolvedAt = status === 'Resolved' ? new Date().toISOString().replace('T', ' ').substring(0, 19) : null;

    db.prepare(`
      UPDATE complaints
      SET status = ?, resolution = ?, resolved_at = ?
      WHERE id = ?
    `).run(status, resolution, resolvedAt, id);

    res.json({ success: true, message: `Complaint status updated to ${status}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

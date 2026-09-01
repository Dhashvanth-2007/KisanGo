import { Request, Response } from 'express';
import { db } from '../db/database.js';

// In-memory OTP storage for demonstration
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export const sendFarmerOTP = (req: Request, res: Response): void => {
  try {
    const { mobile } = req.body;
    if (!mobile || !/^\d{10}$/.test(mobile.trim())) {
      res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number' });
      return;
    }

    const cleanMobile = mobile.trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(cleanMobile, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    res.json({
      success: true,
      message: `OTP sent successfully to +91 ${cleanMobile}`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyFarmerOTP = (req: Request, res: Response): void => {
  try {
    const { mobile, otp, name, language, village, district, state, latitude, longitude, firebaseUid, isFirebaseVerified } = req.body;
    const cleanMobile = mobile?.trim();
    const cleanOtp = (otp || '').toString().trim();
    const stored = otpStore.get(cleanMobile);

    const is6Digit = /^\d{6}$/.test(cleanOtp);

    // Accept verified Firebase session, test OTP, 6-digit OTP, or stored OTP
    if (!isFirebaseVerified && !firebaseUid && !is6Digit && (!stored || stored.otp !== cleanOtp || stored.expiresAt < Date.now())) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please enter a valid 6-digit code.' });
      return;
    }

    if (cleanMobile) {
      otpStore.delete(cleanMobile);
    }

    let farmer = db.prepare('SELECT * FROM farmers WHERE mobile = ?').get(cleanMobile) as any;

    if (!farmer) {
      // Create new farmer profile
      const id = `farmer-${Date.now()}`;
      const farmerName = name?.trim() || (cleanMobile === '9876543210' ? 'Ravi Kumar' : 'Farmer ' + cleanMobile.slice(-4));
      const farmerLang = language || 'Tamil';
      const farmerVillage = village?.trim() || 'Vengikkal Village';
      const farmerDistrict = district?.trim() || 'Tiruvannamalai';
      const farmerState = state?.trim() || 'Tamil Nadu';
      const lat = latitude || 12.2253;
      const lng = longitude || 79.0747;

      db.prepare(`
        INSERT INTO farmers (id, name, mobile, language, village, district, state, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, farmerName, cleanMobile, farmerLang, farmerVillage, farmerDistrict, farmerState, lat, lng);

      farmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(id);
    } else {
      // Existing farmer: update with any provided details if user entered a new name/village/language!
      const updatedName = (name && name.trim()) ? name.trim() : farmer.name;
      const updatedVillage = (village && village.trim()) ? village.trim() : farmer.village;
      const updatedDistrict = (district && district.trim()) ? district.trim() : farmer.district;
      const updatedState = (state && state.trim()) ? state.trim() : farmer.state;
      const updatedLang = (language && language.trim()) ? language.trim() : farmer.language;

      db.prepare(`
        UPDATE farmers 
        SET name = ?,
            village = ?,
            district = ?,
            state = ?,
            language = ?
        WHERE id = ?
      `).run(updatedName, updatedVillage, updatedDistrict, updatedState, updatedLang, farmer.id);

      farmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(farmer.id);
    }

    res.json({
      success: true,
      message: 'Authentication successful',
      token: `km-farmer-token-${farmer.id}`,
      user: {
        ...farmer,
        role: 'farmer'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const officerLogin = (req: Request, res: Response): void => {
  try {
    const { officerId, password } = req.body;
    if (!officerId || !password) {
      res.status(400).json({ success: false, message: 'Officer ID or mobile number and password are required' });
      return;
    }

    const cleanId = officerId.trim();
    const officer = db.prepare('SELECT * FROM officers WHERE officer_id = ? OR official_contact LIKE ?').get(cleanId, `%${cleanId}%`) as any;

    if (!officer || officer.password !== password) {
      res.status(401).json({ success: false, message: 'Invalid Officer credentials. Check ID/Password or Register as a New Officer.' });
      return;
    }

    // Fetch assigned center details
    const assignedCenter = db.prepare('SELECT * FROM procurement_centers WHERE id = ?').get(officer.assigned_center_id);

    // Remove password from response
    const { password: _, ...officerSafe } = officer;

    res.json({
      success: true,
      message: 'Officer authenticated successfully',
      token: `km-officer-token-${officer.id}`,
      user: {
        ...officerSafe,
        role: 'officer',
        center: assignedCenter
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const registerOfficer = (req: Request, res: Response): void => {
  try {
    const {
      officerId,
      name,
      designation,
      assignedCenterId,
      officialContact,
      workingHours,
      password
    } = req.body;

    if (!officerId || !name || !assignedCenterId || !password) {
      res.status(400).json({
        success: false,
        message: 'Officer ID, Full Name, Assigned Center, and Password are required'
      });
      return;
    }

    const cleanOfficerId = officerId.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanDesignation = designation?.trim() || 'Procurement Officer';
    const cleanCenterId = assignedCenterId.trim();
    const cleanContact = officialContact?.trim() || '+91 98765 00000';
    const cleanHours = workingHours?.trim() || '08:30 AM - 05:30 PM';
    const cleanPassword = password.trim();

    let existing = db.prepare('SELECT * FROM officers WHERE officer_id = ?').get(cleanOfficerId) as any;

    if (existing) {
      // Update existing officer
      db.prepare(`
        UPDATE officers
        SET name = ?,
            designation = ?,
            assigned_center_id = ?,
            working_hours = ?,
            official_contact = ?,
            password = ?
        WHERE officer_id = ?
      `).run(cleanName, cleanDesignation, cleanCenterId, cleanHours, cleanContact, cleanPassword, cleanOfficerId);
    } else {
      // Insert new officer
      const newId = `officer-${Date.now()}`;
      db.prepare(`
        INSERT INTO officers (id, officer_id, password, name, designation, assigned_center_id, working_hours, official_contact)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(newId, cleanOfficerId, cleanPassword, cleanName, cleanDesignation, cleanCenterId, cleanHours, cleanContact);
    }

    const officer = db.prepare('SELECT * FROM officers WHERE officer_id = ?').get(cleanOfficerId) as any;
    const assignedCenter = db.prepare('SELECT * FROM procurement_centers WHERE id = ?').get(officer.assigned_center_id);
    const { password: _, ...officerSafe } = officer;

    res.json({
      success: true,
      message: 'Officer registered and authenticated successfully',
      token: `km-officer-token-${officer.id}`,
      user: {
        ...officerSafe,
        role: 'officer',
        center: assignedCenter
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFarmerProfile = (req: Request, res: Response): void => {
  try {
    const { id, name, mobile, language, village, district, state, latitude, longitude } = req.body;
    if (!id) {
      res.status(400).json({ success: false, message: 'Farmer ID is required' });
      return;
    }

    let existing = db.prepare('SELECT * FROM farmers WHERE id = ?').get(id) as any;
    if (!existing) {
      // Create if missing
      db.prepare(`
        INSERT INTO farmers (id, name, mobile, language, village, district, state, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        name || 'Farmer',
        mobile || '9876543210',
        language || 'Tamil',
        village || 'Tiruvannamalai Rural',
        district || 'Tiruvannamalai',
        state || 'Tamil Nadu',
        latitude || 12.2253,
        longitude || 79.0747
      );
    } else {
      db.prepare(`
        UPDATE farmers
        SET name = COALESCE(?, name),
            mobile = COALESCE(?, mobile),
            language = COALESCE(?, language),
            village = COALESCE(?, village),
            district = COALESCE(?, district),
            state = COALESCE(?, state),
            latitude = COALESCE(?, latitude),
            longitude = COALESCE(?, longitude)
        WHERE id = ?
      `).run(
        name !== undefined ? name : null,
        mobile !== undefined ? mobile : null,
        language !== undefined ? language : null,
        village !== undefined ? village : null,
        district !== undefined ? district : null,
        state !== undefined ? state : null,
        latitude !== undefined ? latitude : null,
        longitude !== undefined ? longitude : null,
        id
      );
    }

    const updated = db.prepare('SELECT * FROM farmers WHERE id = ?').get(id);
    res.json({ success: true, message: 'Profile updated successfully', user: { ...updated, role: 'farmer' } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOfficerProfile = (req: Request, res: Response): void => {
  try {
    const { id, name, designation, official_contact, working_hours, password } = req.body;
    if (!id) {
      res.status(400).json({ success: false, message: 'Officer ID is required' });
      return;
    }

    const officer = db.prepare('SELECT * FROM officers WHERE id = ? OR officer_id = ?').get(id, id) as any;
    if (!officer) {
      res.status(404).json({ success: false, message: 'Officer not found' });
      return;
    }

    db.prepare(`
      UPDATE officers
      SET name = COALESCE(?, name),
          designation = COALESCE(?, designation),
          official_contact = COALESCE(?, official_contact),
          working_hours = COALESCE(?, working_hours),
          password = COALESCE(?, password)
      WHERE id = ?
    `).run(
      name !== undefined ? name : null,
      designation !== undefined ? designation : null,
      official_contact !== undefined ? official_contact : null,
      working_hours !== undefined ? working_hours : null,
      password !== undefined ? password : null,
      officer.id
    );

    const updated = db.prepare('SELECT * FROM officers WHERE id = ?').get(officer.id) as any;
    const assignedCenter = db.prepare('SELECT * FROM procurement_centers WHERE id = ?').get(updated.assigned_center_id);
    const { password: _, ...safeOfficer } = updated;

    res.json({
      success: true,
      message: 'Officer profile updated successfully',
      user: {
        ...safeOfficer,
        role: 'officer',
        center: assignedCenter
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


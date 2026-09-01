import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';

// Environment / Config settings
export const getAdminPhone = (): string => {
  const raw = process.env.ADMIN_PHONE || process.env.VITE_ADMIN_PHONE || '8903732621';
  return raw.trim().replace(/\D/g, '');
};

export const isHackathonOtpMode = (): boolean => {
  return process.env.HACKATHON_OTP_MODE === 'true' || process.env.VITE_HACKATHON_OTP_MODE === 'true';
};

interface AdminOtpRecord {
  phone: string;
  otp: string;
  createdAt: number;
  expiresAt: number; // 5 minutes
  used: boolean;
  attempts: number; // Max 5 attempts
  lastSentAt: number; // 60s cooldown
}

// Secure in-memory store for Hackathon Admin OTP sessions (never saved plaintext in DB)
let activeAdminOtp: AdminOtpRecord | null = null;

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;

/**
 * Mask phone number for security (e.g. +91 ******2621)
 */
function maskPhoneNumber(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 4) return clean;
  const visible = clean.slice(-4);
  return `+91 ******${visible}`;
}

/**
 * Generate a Cryptographically Secure 6-Digit OTP on Backend
 */
export const generateAdminOTP = (req: Request, res: Response): void => {
  try {
    const { mobile } = req.body;
    const cleanMobile = (mobile || '').toString().trim().replace(/\D/g, '');
    const configuredAdminPhone = getAdminPhone();

    // Check if the provided phone matches the configured ADMIN_PHONE
    if (cleanMobile !== configuredAdminPhone) {
      res.status(400).json({
        success: false,
        message: 'Phone number does not match configured Admin Phone number.'
      });
      return;
    }

    const now = Date.now();

    // Enforce 60-second cooldown
    if (activeAdminOtp && activeAdminOtp.phone === cleanMobile && (now - activeAdminOtp.lastSentAt) < RESEND_COOLDOWN_MS) {
      const remainingSecs = Math.ceil((RESEND_COOLDOWN_MS - (now - activeAdminOtp.lastSentAt)) / 1000);
      res.status(429).json({
        success: false,
        message: `Please wait ${remainingSecs} seconds before requesting a new OTP.`
      });
      return;
    }

    // Generate cryptographically secure 6-digit random number (100000 - 999999)
    const secureOtp = crypto.randomInt(100000, 1000000).toString();

    // Store new record and replace any previous OTP
    activeAdminOtp = {
      phone: cleanMobile,
      otp: secureOtp,
      createdAt: now,
      expiresAt: now + OTP_EXPIRY_MS,
      used: false,
      attempts: 0,
      lastSentAt: now
    };

    res.json({
      success: true,
      message: 'OTP generated successfully',
      expiresInSeconds: 300,
      maskedPhone: maskPhoneNumber(cleanMobile)
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to generate Admin OTP' });
  }
};

/**
 * Get Active Admin OTP Status for Protected Hackathon Dev Panel
 */
export const getAdminOtpStatus = (req: Request, res: Response): void => {
  try {
    if (!isHackathonOtpMode()) {
      res.status(403).json({
        success: false,
        message: 'Hackathon OTP testing panel is disabled in production.'
      });
      return;
    }

    const configuredAdminPhone = getAdminPhone();

    if (!activeAdminOtp || activeAdminOtp.phone !== configuredAdminPhone) {
      res.json({
        success: true,
        hasActiveOtp: false,
        maskedPhone: maskPhoneNumber(configuredAdminPhone),
        hackathonMode: true
      });
      return;
    }

    const now = Date.now();
    const isExpired = now > activeAdminOtp.expiresAt;
    const remainingSeconds = Math.max(0, Math.floor((activeAdminOtp.expiresAt - now) / 1000));
    const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - activeAdminOtp.attempts);

    res.json({
      success: true,
      hasActiveOtp: true,
      maskedPhone: maskPhoneNumber(activeAdminOtp.phone),
      otp: isExpired || activeAdminOtp.used ? 'EXPIRED' : activeAdminOtp.otp,
      expiresAt: activeAdminOtp.expiresAt,
      createdAt: activeAdminOtp.createdAt,
      remainingSeconds,
      isExpired,
      isUsed: activeAdminOtp.used,
      attemptsRemaining,
      hackathonMode: true
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Verify Admin OTP on Backend
 */
export const verifyAdminOTP = (req: Request, res: Response): void => {
  try {
    const { mobile, otp, name } = req.body;
    const cleanMobile = (mobile || '').toString().trim().replace(/\D/g, '');
    const cleanOtp = (otp || '').toString().trim();
    const configuredAdminPhone = getAdminPhone();

    if (cleanMobile !== configuredAdminPhone) {
      res.status(400).json({
        success: false,
        message: 'Invalid Admin Phone number.'
      });
      return;
    }

    if (!activeAdminOtp || activeAdminOtp.phone !== cleanMobile) {
      res.status(400).json({
        success: false,
        message: 'No active OTP found. Please click Send OTP first.'
      });
      return;
    }

    // 1. Check max verification attempts
    if (activeAdminOtp.attempts >= MAX_ATTEMPTS) {
      res.status(429).json({
        success: false,
        message: 'Maximum verification attempts exceeded (5/5). Please request a new OTP.'
      });
      return;
    }

    // 2. Check if already used
    if (activeAdminOtp.used) {
      res.status(400).json({
        success: false,
        message: 'This OTP has already been used. Please request a new OTP.'
      });
      return;
    }

    // 3. Check expiration (5 minutes)
    if (Date.now() > activeAdminOtp.expiresAt) {
      res.status(400).json({
        success: false,
        message: 'The OTP has expired. Please request a new OTP.'
      });
      return;
    }

    // 4. Verify exact OTP match
    if (activeAdminOtp.otp !== cleanOtp) {
      activeAdminOtp.attempts += 1;
      const remaining = MAX_ATTEMPTS - activeAdminOtp.attempts;
      res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${remaining} attempt(s) remaining.`
      });
      return;
    }

    // 5. Mark OTP as used
    activeAdminOtp.used = true;

    // 6. Look up or create Admin user in database
    let adminFarmer = db.prepare('SELECT * FROM farmers WHERE mobile = ?').get(cleanMobile) as any;
    const adminId = adminFarmer?.id || `admin-${cleanMobile}`;
    const adminName = name?.trim() || adminFarmer?.name || 'KisanGo Admin';

    if (!adminFarmer) {
      db.prepare(`
        INSERT INTO farmers (id, name, mobile, language, village, district, state, latitude, longitude)
        VALUES (?, ?, ?, 'English', 'Admin HQ', 'Tiruvannamalai', 'Tamil Nadu', 12.2253, 79.0747)
      `).run(adminId, adminName, cleanMobile);
      adminFarmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(adminId);
    }

    const token = `km-admin-token-${adminId}-${Date.now()}`;

    res.json({
      success: true,
      message: 'Admin authentication successful',
      token,
      user: {
        ...adminFarmer,
        name: adminName,
        role: 'admin',
        isAdmin: true,
        permissions: ['all', 'manage_slots', 'manage_queue', 'procurement', 'redressal', 'analytics']
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Admin verification failed' });
  }
};

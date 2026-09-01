import { Request, Response } from 'express';

// In-memory store for admin OTP
let adminOTP = {
  otp: '',
  expiresAt: 0,
};

export const generateAdminOtp = (req: Request, res: Response): void => {
  if (process.env.HACKATHON_OTP_MODE !== 'true') {
    res.status(403).json({ success: false, message: 'Hackathon mode disabled.' });
    return;
  }
  
  // Generate secure 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  adminOTP = {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  };

  res.json({
    success: true,
    otp,
    expiresIn: 300,
  });
};

export const getCurrentAdminOtp = (req: Request, res: Response): void => {
  if (process.env.HACKATHON_OTP_MODE !== 'true') {
    res.status(403).json({ success: false, message: 'Hackathon mode disabled.' });
    return;
  }

  if (adminOTP.expiresAt > Date.now()) {
    res.json({ success: true, otp: adminOTP.otp, expiresIn: Math.floor((adminOTP.expiresAt - Date.now()) / 1000) });
  } else {
    res.json({ success: false, message: 'No active OTP' });
  }
};

export const verifyAdminOtp = (req: Request, res: Response): void => {
  if (process.env.HACKATHON_OTP_MODE !== 'true') {
    res.status(403).json({ success: false, message: 'Hackathon mode disabled.' });
    return;
  }
  
  const { otp } = req.body;
  if (adminOTP.expiresAt > Date.now() && adminOTP.otp === otp) {
    adminOTP = { otp: '', expiresAt: 0 }; // Invalidate after use
    res.json({ success: true, role: 'admin' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }
};

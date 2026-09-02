import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  UserCredential,
  Auth
} from 'firebase/auth';

// Your web app's Firebase configuration with Vite environment variable support
const env = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyArt5DJLhK5po-K1nUnZMiqPW0ATNw8tso",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "kisango-ff87c.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "kisango-ff87c",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "kisango-ff87c.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "342052602974",
  appId: env.VITE_FIREBASE_APP_ID || "1:342052602974:web:cd8ea460f007b3b636a0cf",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-LSK561EQ7X"
};

// Initialize Firebase app singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

// Configure language for SMS OTP
auth.useDeviceLanguage();

/**
 * Format Indian 10-digit mobile number to E.164 (+91XXXXXXXXXX)
 */
export function formatToE164(mobileNumber: string): string {
  const clean = mobileNumber.trim().replace(/\D/g, '');
  if (clean.length === 10) {
    return `+91${clean}`;
  }
  if (clean.length === 12 && clean.startsWith('91')) {
    return `+${clean}`;
  }
  if (mobileNumber.trim().startsWith('+91')) {
    const digits = mobileNumber.trim().slice(3).replace(/\D/g, '');
    if (digits.length === 10) {
      return `+91${digits}`;
    }
  }
  return `+91${clean}`;
}

/**
 * Mask mobile number for farmer privacy, e.g. +91 ******3210
 */
export function maskPhoneNumber(mobileNumber: string): string {
  const clean = mobileNumber.trim().replace(/\D/g, '');
  const last4 = clean.slice(-4);
  return `+91 ******${last4}`;
}

/**
 * Create or reuse RecaptchaVerifier instance safely
 */
export function initRecaptchaVerifier(
  containerId: string | HTMLElement = 'recaptcha-container',
  onExpired?: () => void,
  onSuccess?: () => void,
  size: 'normal' | 'invisible' = 'invisible'
): RecaptchaVerifier {
  // Clear any existing global verifier if present
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch (e) {
      // Ignore cleanup error
    }
    (window as any).recaptchaVerifier = null;
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: size,
    callback: () => {
      // reCAPTCHA solved
      if (onSuccess) onSuccess();
    },
    'expired-callback': () => {
      if (onExpired) onExpired();
    }
  });

  (window as any).recaptchaVerifier = verifier;
  return verifier;
}

/**
 * Send Phone OTP using Firebase Authentication
 */
export async function sendFirebasePhoneOTP(
  phoneNumber: string,
  appVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const formattedPhone = formatToE164(phoneNumber);
  return await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
}

/**
 * Verify Phone OTP using ConfirmationResult
 */
export async function confirmFirebaseOTP(
  confirmationResult: ConfirmationResult,
  verificationCode: string
): Promise<UserCredential> {
  return await confirmationResult.confirm(verificationCode.trim());
}

/**
 * User-friendly farmer error message parser for Firebase Auth error codes
 */
export function parseFirebasePhoneAuthError(err: any): string {
  if (!err) return 'Authentication failed. Please try again.';

  const code = err.code || '';
  const message = err.message || '';

  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Please enter a valid mobile number.';
    case 'auth/invalid-verification-code':
      return 'Incorrect OTP. Please try again.';
    case 'auth/code-expired':
      return 'OTP expired. Please request a new OTP.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/quota-exceeded':
      return 'OTP service limit reached. Please try again later.';
    case 'auth/captcha-check-failed':
      return 'reCAPTCHA verification failed. Please try again.';
    case 'auth/unauthorized-domain':
      return 'Domain not authorized. Please add this domain in Firebase Console > Authentication > Settings > Authorized domains.';
    case 'auth/configuration-not-found':
      return 'Firebase Phone Auth is not enabled in Firebase Console.';
    case 'auth/missing-verification-code':
      return 'Please enter the 6-digit verification code.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    default:
      if (message.includes('reCAPTCHA')) {
        return 'reCAPTCHA verification failed. Please try again.';
      }
      return message || 'Authentication failed. Please try again.';
  }
}

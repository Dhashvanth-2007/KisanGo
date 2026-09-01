import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  UserCredential,
  Auth
} from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyArt5DJLhK5po-K1nUnZMiqPW0ATNw8tso",
  authDomain: "kisango-ff87c.firebaseapp.com",
  projectId: "kisango-ff87c",
  storageBucket: "kisango-ff87c.firebasestorage.app",
  messagingSenderId: "342052602974",
  appId: "1:342052602974:web:cd8ea460f007b3b636a0cf",
  measurementId: "G-LSK561EQ7X"
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
 * Create or reuse RecaptchaVerifier instance safely
 */
export function initRecaptchaVerifier(
  containerId: string = 'recaptcha-container',
  onExpired?: () => void
): RecaptchaVerifier {
  // Clear any existing global verifier if present
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch (e) {
      console.warn('Error clearing existing recaptchaVerifier:', e);
    }
    (window as any).recaptchaVerifier = null;
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved - allow signInWithPhoneNumber
    },
    'expired-callback': () => {
      console.warn('reCAPTCHA expired, resetting...');
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
 * User-friendly error message parser for Firebase Auth error codes
 */
export function parseFirebasePhoneAuthError(err: any): string {
  if (!err) return 'Authentication failed. Please try again.';

  const code = err.code || '';
  const message = err.message || '';

  switch (code) {
    case 'auth/configuration-not-found':
      return 'Firebase Phone Auth is not enabled for this project or domain. Please enable "Phone" in Firebase Console > Authentication > Sign-in method, and add "kisango-eta.vercel.app" under Settings > Authorized domains.';
    case 'auth/unauthorized-domain':
      return 'Domain not authorized. Please add "kisango-eta.vercel.app" in Firebase Console > Authentication > Settings > Authorized domains.';
    case 'auth/invalid-phone-number':
      return 'The phone number is invalid. Please enter a valid 10-digit Indian mobile number.';
    case 'auth/invalid-verification-code':
      return 'Incorrect verification code. Please enter the correct 6-digit OTP.';
    case 'auth/code-expired':
      return 'The verification code has expired. Please click Resend OTP to request a new code.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes before requesting another OTP.';
    case 'auth/captcha-check-failed':
      return 'reCAPTCHA verification failed. Please refresh the page and try again.';
    case 'auth/network-request-failed':
      return 'Network error occurred. Please check your internet connection.';
    case 'auth/quota-exceeded':
      return 'SMS quota exceeded for today. Please contact support or use demo login.';
    case 'auth/missing-verification-code':
      return 'Please enter the 6-digit verification code.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    default:
      if (message.includes('reCAPTCHA')) {
        return 'reCAPTCHA verification failed. Please try again.';
      }
      return message || 'Failed to authenticate phone number. Please try again.';
  }
}

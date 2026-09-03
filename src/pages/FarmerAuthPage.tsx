import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import {
  initRecaptchaVerifier,
  sendFirebasePhoneOTP,
  confirmFirebaseOTP,
  parseFirebasePhoneAuthError,
  formatToE164,
  maskPhoneNumber
} from '../services/firebase';
import { ConfirmationResult } from 'firebase/auth';
import { Sprout, Phone, ShieldCheck, ArrowLeft, ArrowRight, User, RotateCcw } from 'lucide-react';
import { FarmerRegistrationForm } from '../components/auth/FarmerRegistrationForm';

interface FarmerAuthPageProps {
  onBack: () => void;
}

export const FarmerAuthPage: React.FC<FarmerAuthPageProps> = ({ onBack }) => {
  const { loginAsFarmer, quickDemoFarmerLogin } = useAuth();
  const { language, setLanguage, languagesList, t } = useLanguage();
  const { showToast } = useToast();

  const [step, setStep] = useState<'mobile' | 'otp' | 'registration'>('mobile');
  const [tempSession, setTempSession] = useState<{ user: any; token: string } | null>(null);
  const [mobile, setMobile] = useState('');
  
  // 6 separate digits for OTP input
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Store the active Firebase ConfirmationResult safely
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  // 30-Second Resend Countdown Timer
  useEffect(() => {
    let timer: any = null;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  // Only allow numbers for mobile number
  const handleMobileChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setMobile(clean);
  };

  // Setup / get RecaptchaVerifier
  const getOrCreateVerifier = (containerId: string = 'recaptcha-container') => {
    return initRecaptchaVerifier(
      containerId,
      () => {
        showToast('reCAPTCHA expired. Please try sending OTP again.', 'warning');
      },
      undefined,
      'invisible'
    );
  };

  const handleSendOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanMobile = mobile.trim().replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      showToast('Please enter a valid 10-digit Indian mobile number', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Initialize Firebase RecaptchaVerifier
      const verifier = getOrCreateVerifier('recaptcha-container');

      // 2. Call Firebase signInWithPhoneNumber (E.164: +91XXXXXXXXXX)
      const confirmation = await sendFirebasePhoneOTP(cleanMobile, verifier);
      confirmationResultRef.current = confirmation;

      showToast(`OTP sent successfully to ${maskPhoneNumber(cleanMobile)}`, 'success');
      setCountdown(30);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setStep('otp');
    } catch (err: any) {
      console.warn('Firebase Phone Auth returned error, activating fallback gateway:', err);

      // If Firebase provider is not enabled in console or fails due to network/config, provide seamless gateway fallback
      try {
        const fallbackRes = await api.sendFarmerOTP(cleanMobile);
        if (fallbackRes.success) {
          showToast(`OTP sent successfully to ${maskPhoneNumber(cleanMobile)}`, 'success');
          confirmationResultRef.current = null; // Mark that fallback session is active
          setCountdown(30);
          setCanResend(false);
          setOtpDigits(['', '', '', '', '', '']);
          setStep('otp');
          return;
        }
      } catch (fallbackErr) {
        console.error('Fallback OTP error:', fallbackErr);
      }

      const friendlyMsg = parseFirebasePhoneAuthError(err);
      showToast(friendlyMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || isLoading) return;

    const cleanMobile = mobile.trim().replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      showToast('Please enter a valid 10-digit Indian mobile number', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      // Reset previous confirmation session and reinitialize verifier
      confirmationResultRef.current = null;
      const verifier = getOrCreateVerifier('recaptcha-container');

      const confirmation = await sendFirebasePhoneOTP(cleanMobile, verifier);
      confirmationResultRef.current = confirmation;

      showToast(`OTP resent successfully to ${maskPhoneNumber(cleanMobile)}`, 'success');
      setCountdown(30);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      console.warn('Firebase resend failed, trying fallback:', err);
      try {
        const fallbackRes = await api.sendFarmerOTP(cleanMobile);
        if (fallbackRes.success) {
          showToast(`OTP resent successfully to ${maskPhoneNumber(cleanMobile)}`, 'success');
          confirmationResultRef.current = null;
          setCountdown(30);
          setCanResend(false);
          setOtpDigits(['', '', '', '', '', '']);
          return;
        }
      } catch (fallbackErr) {}

      const friendlyMsg = parseFirebasePhoneAuthError(err);
      showToast(friendlyMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle 6-Box OTP Inputs
  const handleOtpDigitChange = (index: number, val: string) => {
    const numericVal = val.replace(/\D/g, '');
    if (!numericVal) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    // Handle paste of full or multi-digit OTP
    if (numericVal.length > 1) {
      const pastedDigits = numericVal.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      pastedDigits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pastedDigits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    // Single digit input
    const newDigits = [...otpDigits];
    newDigits[index] = numericVal.slice(-1);
    setOtpDigits(newDigits);

    // Auto-focus next box
    if (index < 5 && numericVal) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    }
  };

  const fullOtp = otpDigits.join('');

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanMobile = mobile.trim().replace(/\D/g, '');
    const cleanOtp = fullOtp.trim();

    if (cleanOtp.length !== 6) {
      showToast('Please enter the full 6-digit verification code', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Verify OTP with Firebase confirmationResult if active
      let firebaseUid = '';
      let userPhoneNumber = '';

      if (confirmationResultRef.current) {
        try {
          const userCredential = await confirmFirebaseOTP(confirmationResultRef.current, cleanOtp);
          if (userCredential && userCredential.user) {
            firebaseUid = userCredential.user.uid;
            userPhoneNumber = userCredential.user.phoneNumber || formatToE164(cleanMobile);
          }
        } catch (firebaseErr: any) {
          console.error('Firebase OTP Confirmation Error:', firebaseErr);
          const errMessage = parseFirebasePhoneAuthError(firebaseErr);
          showToast(errMessage, 'error');
          setIsLoading(false);
          return;
        }
      }

      // 2. Connect verified session to KisanGo Backend Database
      const res = await api.verifyFarmerOTP({
        mobile: cleanMobile,
        otp: cleanOtp,
        firebaseUid,
        isFirebaseVerified: Boolean(firebaseUid)
      });

      if (res.success && res.user) {
        showToast(`Phone number verified successfully! Welcome, ${res.user.name || 'Farmer'}`, 'success');

        // Check if user is newly registered or needs profile onboarding
        const isNewUser = !res.user.name || res.user.name.startsWith('Farmer ') || res.user.name === 'Ravi Kumar';

        if (isNewUser) {
          setTempSession({ user: res.user, token: res.token });
          setStep('registration');
        } else {
          loginAsFarmer(res.user, res.token);
        }
      } else {
        showToast(res.message || 'Invalid OTP. Please check the OTP and try again.', 'error');
      }
    } catch (err: any) {
      console.error('Verify OTP Error:', err);
      const friendlyMsg = parseFirebasePhoneAuthError(err);
      showToast(friendlyMsg || 'Verification failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      if (tempSession) {
        await api.updateFarmerProfile({
          id: tempSession.user.id,
          name: data.farmer.personal_details.farmer_name,
          mobile: data.farmer.personal_details.mobile_number,
          village: data.farmer.land_details.village,
          district: data.farmer.land_details.district,
          state: data.farmer.land_details.state
        });

        showToast('Farmer registration completed successfully.', 'success');

        loginAsFarmer(
          {
            ...tempSession.user,
            name: data.farmer.personal_details.farmer_name,
            mobile: data.farmer.personal_details.mobile_number,
            village: data.farmer.land_details.village,
            district: data.farmer.land_details.district,
            state: data.farmer.land_details.state
          },
          tempSession.token
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-km-bg flex flex-col justify-center p-4 sm:p-6">
      <div className="max-w-md w-full mx-auto bg-white rounded-3xl border border-emerald-100 shadow-km-md p-6 sm:p-8 space-y-6">
        {/* Back and Brand Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white border border-emerald-100 flex items-center justify-center p-0.5 shadow-2xs overflow-hidden">
              <img src="/logo.png" alt="Kisan Go Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-sm text-km-primary">{t('app_name')}</span>
          </div>
          <div className="w-8" />
        </div>

        {/* Step 1: Mobile Number Input */}
        {step === 'mobile' && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-km-textPrimary">{t('enter_mobile')}</h2>
              <p className="text-xs text-km-textSecondary">
                Enter your 10-digit mobile number for Firebase OTP verification
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-km-textPrimary">{t('enter_mobile')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 font-bold text-xs">
                  +91
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  placeholder="9876543210"
                  autoFocus
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-300 text-sm font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-km-primary"
                />
              </div>
            </div>

            {/* Invisible/Visible reCAPTCHA container */}
            <div id="recaptcha-container" className="flex justify-center" />

            <button
              type="submit"
              disabled={isLoading || mobile.length !== 10}
              className="w-full py-3.5 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-800/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? 'Sending OTP...' : t('send_otp')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Demo Bypass */}
            <div className="pt-3 border-t border-gray-100 text-center">
              <button
                type="button"
                onClick={quickDemoFarmerLogin}
                className="text-xs font-bold text-km-primary hover:underline cursor-pointer"
              >
                ⚡ 1-Click Fast Login as Ravi Kumar
              </button>
            </div>
          </form>
        )}

        {/* Step 2: OTP Verification Screen */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-km-textPrimary">{t('verify_otp')}</h2>
              <p className="text-xs text-km-textSecondary">
                Enter the 6-digit verification code sent to {maskPhoneNumber(mobile)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-km-textPrimary">{t('enter_otp')}</label>
                {/* Resend OTP Button with Countdown */}
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={!canResend || isLoading}
                  className={`text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    canResend
                      ? 'text-km-primary hover:underline'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{canResend ? 'Resend OTP' : `Resend in ${countdown}s`}</span>
                </button>
              </div>

              {/* 6 Separate OTP Digit Boxes */}
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedData = e.clipboardData.getData('text');
                      handleOtpDigitChange(index, pastedData);
                    }}
                    autoFocus={index === 0}
                    className="w-11 h-12 sm:w-12 sm:h-14 rounded-xl border border-gray-300 text-center text-xl font-black font-mono focus:outline-none focus:ring-2 focus:ring-km-primary text-km-textPrimary bg-gray-50 focus:bg-white transition-all"
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3">
              <button
                type="button"
                onClick={() => {
                  setStep('mobile');
                  setOtpDigits(['', '', '', '', '', '']);
                }}
                className="w-1/3 py-3 border border-gray-200 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Change Phone
              </button>
              <button
                type="submit"
                disabled={isLoading || fullOtp.length !== 6}
                className="flex-1 py-3.5 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-800/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Verifying...' : t('verify_otp')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Farmer Registration Form */}
        {step === 'registration' && (
          <FarmerRegistrationForm
            initialMobile={mobile.replace(/\D/g, '')}
            onSubmit={handleRegistrationSubmit}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

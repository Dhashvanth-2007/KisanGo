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
  formatToE164
} from '../services/firebase';
import { ConfirmationResult } from 'firebase/auth';
import { Sprout, Phone, ShieldCheck, ArrowLeft, ArrowRight, User, RotateCcw } from 'lucide-react';
import { AdminOTPPanel } from '../components/auth/AdminOTPPanel';

interface FarmerAuthPageProps {
  onBack: () => void;
}

export const FarmerAuthPage: React.FC<FarmerAuthPageProps> = ({ onBack }) => {
  const { loginAsFarmer, loginAsAdmin, quickDemoFarmerLogin } = useAuth();
  const { language, setLanguage, languagesList, t } = useLanguage();
  const { showToast } = useToast();

  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('9876543210');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('Ravi Kumar');
  const [village, setVillage] = useState('Vengikkal Village');
  const [district, setDistrict] = useState('Tiruvannamalai');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  // 60-Second Resend Countdown Timer
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

  const handleMobileChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setMobile(clean);
    if (clean === '9876543210') {
      setName('Ravi Kumar');
      setVillage('Vengikkal Village');
    } else if (clean.length === 10 && name === 'Ravi Kumar') {
      setName('');
      setVillage('');
    }
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
      if ((import.meta as any).env.VITE_HACKATHON_OTP_MODE === 'true' && cleanMobile === '8903732621') {
        await fetch('/api/admin/generate-otp', { method: 'POST' });
      }

      // 1. Initialize Firebase RecaptchaVerifier
      const verifier = initRecaptchaVerifier('recaptcha-container', () => {
        showToast('reCAPTCHA expired. Please try sending OTP again.', 'warning');
      });

      // 2. Call Firebase signInWithPhoneNumber (E.164: +91XXXXXXXXXX)
      const confirmation = await sendFirebasePhoneOTP(cleanMobile, verifier);
      confirmationResultRef.current = confirmation;

      showToast(`OTP sent successfully to +91 ${cleanMobile}`, 'success');
      setCountdown(60);
      setCanResend(false);
      setOtp('');
      setStep('otp');
    } catch (err: any) {
      console.warn('Firebase Phone Auth Error, trying fallback OTP gateway:', err);

      try {
        const fallbackRes = await api.sendFarmerOTP(cleanMobile);
        if (fallbackRes.success) {
          showToast(`OTP sent successfully to +91 ${cleanMobile}`, 'success');
          if (fallbackRes.demoOtp) {
            setOtp(fallbackRes.demoOtp);
          }
          setStep('otp');
          setCountdown(60);
          setCanResend(false);
        } else {
          showToast(fallbackRes.message || parseFirebasePhoneAuthError(err), 'error');
        }
      } catch (fallbackErr: any) {
        showToast(parseFirebasePhoneAuthError(err), 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || isLoading) return;
    await handleSendOTP();
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanMobile = mobile.trim().replace(/\D/g, '');
    const cleanOtp = otp.trim();

    if (cleanOtp.length < 6) {
      showToast('Please enter the full 6-digit verification code', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      if ((import.meta as any).env.VITE_HACKATHON_OTP_MODE === 'true' && cleanMobile === '8903732621') {
        const adminRes = await fetch('/api/admin/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otp: cleanOtp })
        });
        const adminData = await adminRes.json();
        
        if (adminData.success) {
          showToast(`Welcome Admin!`, 'success');
          // Using loginAsAdmin
          loginAsAdmin({
            id: 'admin-1',
            name: 'Hackathon Admin',
            mobile: cleanMobile,
            role: 'admin'
          }, 'admin-token');
          return;
        } else {
          showToast(adminData.message || 'Invalid Admin OTP', 'error');
          return;
        }
      }

      let firebaseUid: string | undefined = undefined;

      // 1. Verify OTP with Firebase if confirmationResult is active
      if (confirmationResultRef.current) {
        try {
          const userCredential = await confirmFirebaseOTP(confirmationResultRef.current, cleanOtp);
          if (userCredential && userCredential.user) {
            firebaseUid = userCredential.user.uid;
          }
        } catch (firebaseErr: any) {
          console.warn('Firebase confirmation error:', firebaseErr);
          const errMessage = parseFirebasePhoneAuthError(firebaseErr);
          if (firebaseErr.code === 'auth/invalid-verification-code' || firebaseErr.code === 'auth/code-expired') {
            showToast(errMessage, 'error');
            setIsLoading(false);
            return;
          }
          showToast(errMessage, 'warning');
        }
      }

      // 2. Complete KisanGo Backend Profile & Session Onboarding
      const res = await api.verifyFarmerOTP({
        mobile: cleanMobile,
        otp: cleanOtp,
        name: name.trim() || undefined,
        language,
        village: village.trim() || undefined,
        district: district.trim() || 'Tiruvannamalai',
        state: 'Tamil Nadu',
        firebaseUid,
        isFirebaseVerified: Boolean(firebaseUid)
      });

      if (res.success && res.user) {
        showToast(`Welcome, ${res.user.name}!`, 'success');
        loginAsFarmer(res.user, res.token);
      } else {
        showToast(res.message || 'Invalid verification code', 'error');
      }
    } catch (err: any) {
      console.error('Verify OTP Error:', err);
      const friendlyMsg = parseFirebasePhoneAuthError(err);
      showToast(friendlyMsg || 'Verification failed. Please try again.', 'error');
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
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-300 text-sm font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-km-primary"
                />
              </div>
            </div>

            {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
            <div id="recaptcha-container" />

            <button
              type="submit"
              disabled={isLoading || mobile.length !== 10}
              className="w-full py-3.5 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-800/20 transition-all disabled:opacity-50"
            >
              <span>{isLoading ? 'Sending OTP...' : t('send_otp')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Demo Bypass */}
            <div className="pt-3 border-t border-gray-100 text-center">
              <button
                type="button"
                onClick={quickDemoFarmerLogin}
                className="text-xs font-bold text-km-primary hover:underline"
              >
                ⚡ 1-Click Fast Login as Ravi Kumar
              </button>
            </div>
          </form>
        )}

        {/* Step 2: OTP Verification & Profile Info */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-km-textPrimary">{t('verify_otp')}</h2>
              <p className="text-xs text-km-textSecondary">
                Enter the 6-digit verification code sent to +91 {mobile}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-km-textPrimary">{t('enter_otp')}</label>
                {/* Resend OTP Button with 60-Second Countdown */}
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={!canResend || isLoading}
                  className={`text-[11px] font-bold flex items-center gap-1 transition-colors ${
                    canResend
                      ? 'text-km-primary hover:underline'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{canResend ? 'Resend OTP' : `Resend in ${countdown}s`}</span>
                </button>
              </div>

              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-center text-xl font-black tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-km-primary"
              />
            </div>

            {/* Invisible reCAPTCHA container for Resend */}
            <div id="recaptcha-container" />

            {/* Profile Fields on Registration / Login */}
            <div className="space-y-2 pt-1 border-t border-gray-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                Farmer Profile Details
              </span>

              <div>
                <label className="font-bold text-xs text-km-textPrimary block mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name (e.g. Ramesh Kumar)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:ring-2 focus:ring-km-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="font-bold text-km-textPrimary block mb-1">Village / Town</label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="Village Name"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-km-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-km-textPrimary block mb-1">District</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="District"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-km-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('mobile');
                  setOtp('');
                }}
                className="w-1/3 py-3 border border-gray-200 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Change Phone
              </button>
              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="flex-1 py-3.5 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-800/20 transition-all disabled:opacity-50"
              >
                <span>{isLoading ? 'Verifying...' : t('verify_otp')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
        
        {step === 'otp' && (import.meta as any).env.VITE_HACKATHON_OTP_MODE === 'true' && mobile.replace(/\D/g, '') === '8903732621' && (
          <AdminOTPPanel onFillOTP={(code) => setOtp(code)} />
        )}
      </div>
    </div>
  );
};

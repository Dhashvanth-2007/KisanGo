import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Sprout, Phone, ShieldCheck, ArrowLeft, ArrowRight, User } from 'lucide-react';

interface FarmerAuthPageProps {
  onBack: () => void;
}

export const FarmerAuthPage: React.FC<FarmerAuthPageProps> = ({ onBack }) => {
  const { loginAsFarmer, quickDemoFarmerLogin } = useAuth();
  const { language, setLanguage, languagesList, t } = useLanguage();
  const { showToast } = useToast();

  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('9876543210');
  const [otp, setOtp] = useState('123456');
  const [name, setName] = useState('Ravi Kumar');
  const [village, setVillage] = useState('Vengikkal Village');
  const [district, setDistrict] = useState('Tiruvannamalai');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(mobile.trim())) {
      showToast('Please enter a valid 10-digit mobile number', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.sendFarmerOTP(mobile);
      if (res.success) {
        showToast(res.message, 'success');
        if (res.demoOtp) {
          setOtp(res.demoOtp);
        }
        setStep('otp');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to send OTP', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.verifyFarmerOTP({
        mobile,
        otp,
        name: name.trim() || undefined,
        language,
        village: village.trim() || undefined,
        district: district.trim() || 'Tiruvannamalai',
        state: 'Tamil Nadu'
      });

      if (res.success && res.user) {
        showToast(`Welcome, ${res.user.name}!`, 'success');
        loginAsFarmer(res.user, res.token);
      } else {
        showToast(res.message || 'Invalid OTP', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Verification failed', 'error');
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
              <p className="text-xs text-km-textSecondary">We will send a 6-digit verification code</p>
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

            <button
              type="submit"
              disabled={isLoading || mobile.length !== 10}
              className="w-full py-3.5 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-800/20 transition-all disabled:opacity-50"
            >
              <span>{isLoading ? 'Sending...' : t('send_otp')}</span>
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
                Enter code sent to +91 {mobile} ({t('demo_otp_hint')})
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-km-textPrimary">{t('enter_otp')}</label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-center text-lg font-black tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-km-primary"
              />
            </div>

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
                onClick={() => setStep('mobile')}
                className="w-1/3 py-3 border border-gray-200 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Change Phone
              </button>
              <button
                type="submit"
                disabled={isLoading || otp.length < 4}
                className="flex-1 py-3.5 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                <span>{isLoading ? 'Verifying...' : t('verify_otp')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

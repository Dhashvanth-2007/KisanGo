import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { ShieldCheck, Lock, User, ArrowLeft, ArrowRight } from 'lucide-react';

interface OfficerAuthPageProps {
  onBack: () => void;
}

export const OfficerAuthPage: React.FC<OfficerAuthPageProps> = ({ onBack }) => {
  const { loginAsOfficer, quickDemoOfficerLogin } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [officerId, setOfficerId] = useState('OFFICER-B');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerId || !password) {
      showToast('Please enter Officer ID and Password', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.officerLogin(officerId, password);
      if (res.success && res.user) {
        showToast(`Welcome ${res.user.name}!`, 'success');
        loginAsOfficer(res.user, res.token);
      } else {
        showToast(res.message || 'Invalid Officer Credentials', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-km-bg flex flex-col justify-center p-4 sm:p-6">
      <div className="max-w-md w-full mx-auto bg-white rounded-3xl border border-amber-200 shadow-km-md p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white border border-amber-200 flex items-center justify-center p-0.5 shadow-2xs overflow-hidden">
              <img src="/logo.png" alt="Kisan Go Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-sm text-km-textPrimary">Procurement Officer</span>
          </div>
          <div className="w-8" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-km-textPrimary">{t('role_officer')} {t('login')}</h2>
            <p className="text-xs text-km-textSecondary">Manage assigned center queue and procurement records</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-km-textPrimary">{t('officer_id')}</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value)}
                placeholder="e.g. OFFICER-B"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <span className="text-[10px] text-gray-400">Demo IDs: OFFICER-A, OFFICER-B, OFFICER-C</span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-km-textPrimary">{t('password')}</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
          >
            <span>{isLoading ? 'Authenticating...' : t('login')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Fast Switch Buttons */}
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <span className="text-[10px] uppercase font-bold text-gray-400 block text-center">
            Quick Center Logins
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <button
              onClick={() => quickDemoOfficerLogin('OFFICER-A')}
              className="p-2 rounded-xl bg-gray-100 hover:bg-amber-100 text-km-textPrimary font-bold truncate"
            >
              Center A
            </button>
            <button
              onClick={() => quickDemoOfficerLogin('OFFICER-B')}
              className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold border border-amber-300 truncate"
            >
              Center B (DPC)
            </button>
            <button
              onClick={() => quickDemoOfficerLogin('OFFICER-C')}
              className="p-2 rounded-xl bg-gray-100 hover:bg-amber-100 text-km-textPrimary font-bold truncate"
            >
              Center C
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Sprout, User, ShieldCheck, ArrowRight, Globe, Sparkles, CheckCircle2 } from 'lucide-react';
import { LanguageCode } from '../types';

interface RoleSelectPageProps {
  onSelectFarmer: () => void;
  onSelectOfficer: () => void;
}

export const RoleSelectPage: React.FC<RoleSelectPageProps> = ({
  onSelectFarmer,
  onSelectOfficer
}) => {
  const { quickDemoFarmerLogin, quickDemoOfficerLogin } = useAuth();
  const { language, setLanguage, languagesList, t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-km-primaryDark to-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Bar with Language Selector */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center p-0.5 shadow-sm overflow-hidden">
            <img src="/logo.png" alt="Kisan Go Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-white">{t('app_name')}</span>
        </div>

        {/* Language selector chips */}
        <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/15">
          {languagesList.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code as LanguageCode)}
              className={`px-2 py-0.5 rounded-xl text-[11px] font-bold transition-all ${
                language === lang.code
                  ? 'bg-amber-400 text-black shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {lang.native}
            </button>
          ))}
        </div>
      </div>

      {/* Main Hero & Role Selection */}
      <div className="max-w-md w-full mx-auto my-auto py-6 space-y-6">
        {/* Brand Hero Logo & Title */}
        <div className="text-center space-y-3">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-white p-2 shadow-2xl flex items-center justify-center border-2 border-emerald-400/40">
            <img src="/logo.png" alt="Kisan Go Logo" className="w-full h-full object-contain" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Agricultural Procurement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            {t('tagline')}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Question */}
        <div className="text-center">
          <h2 className="text-base font-bold text-white/90">{t('role_question')}</h2>
        </div>

        {/* Role Options */}
        <div className="space-y-3.5">
          {/* Farmer Card */}
          <button
            onClick={onSelectFarmer}
            className="w-full text-left p-5 rounded-3xl bg-white text-km-textPrimary shadow-2xl hover:shadow-emerald-500/20 border-2 border-transparent hover:border-emerald-400 transition-all duration-300 transform hover:scale-[1.02] active:scale-98 group flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-km-primary to-km-secondary text-white flex items-center justify-center shadow-lg shadow-emerald-700/30 group-hover:rotate-6 transition-transform">
                <User className="w-7 h-7" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-lg text-km-textPrimary">{t('role_farmer')}</h3>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-km-textSecondary leading-snug">{t('role_farmer_desc')}</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-50 group-hover:bg-km-primary group-hover:text-white text-km-primary flex items-center justify-center transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Officer Card */}
          <button
            onClick={onSelectOfficer}
            className="w-full text-left p-5 rounded-3xl bg-white/10 backdrop-blur-md text-white shadow-xl hover:bg-white/15 border border-white/20 transition-all duration-300 transform hover:scale-[1.02] active:scale-98 group flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-600/30 group-hover:rotate-6 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-lg text-white">{t('role_officer')}</h3>
                <p className="text-xs text-emerald-200/80 leading-snug">{t('role_officer_desc')}</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-amber-400 group-hover:text-black text-white flex items-center justify-center transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* Quick Demo Fast-Logins Box */}
        <div className="pt-2">
          <div className="bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 block text-center">
              ⚡ 1-Click Fast Prototype Login
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={quickDemoFarmerLogin}
                className="py-2.5 px-3 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-[11px] font-bold border border-emerald-400/40 transition-colors shadow-sm text-center truncate"
              >
                Farmer: Ravi Kumar
              </button>
              <button
                onClick={() => quickDemoOfficerLogin('OFFICER-B')}
                className="py-2.5 px-3 rounded-xl bg-amber-600/80 hover:bg-amber-600 text-white text-[11px] font-bold border border-amber-400/40 transition-colors shadow-sm text-center truncate"
              >
                Officer B: Kilpennathur
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-[10px] text-emerald-200/60 max-w-md mx-auto">
        Kisan Go 2.0 • Smart AI Agricultural Procurement & Direct Purchase Platform
      </div>
    </div>
  );
};

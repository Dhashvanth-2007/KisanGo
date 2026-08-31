import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Booking, ProcurementCenter } from '../types';
import {
  MapPin,
  Ticket,
  Activity,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Mic,
  Calendar,
  Clock,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { RatingStars } from '../components/common/RatingStars';
import { Badge } from '../components/common/Badge';

interface FarmerHomePageProps {
  activeBooking: Booking | null;
  recommendedCenter: ProcurementCenter | null;
  onNavigate: (tab: string) => void;
  onOpenVoiceAssistant: () => void;
  onOpenReportProblem: () => void;
  onOpenConcurrencySimulator: () => void;
}

export const FarmerHomePage: React.FC<FarmerHomePageProps> = ({
  activeBooking,
  recommendedCenter,
  onNavigate,
  onOpenVoiceAssistant,
  onOpenReportProblem,
  onOpenConcurrencySimulator
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-km-textSecondary font-semibold">Welcome back,</span>
          <h1 className="text-xl sm:text-2xl font-black text-km-textPrimary">{user?.name || 'Farmer'}</h1>
          <p className="text-xs text-km-primary font-medium">📍 {(user as any)?.village || 'Tiruvannamalai Rural'}, {(user as any)?.district || 'Tiruvannamalai'}</p>
        </div>

        <button
          onClick={() => onNavigate('profile')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-bold text-km-primary shadow-2xs transition-all active:scale-95"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-km-primary text-[10px] font-extrabold">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'F'}
          </div>
          <span>{t('my_profile')}</span>
        </button>
      </div>

      {/* Prominent Hero Voice Assistant Button */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-emerald-600 to-km-primary rounded-3xl p-5 sm:p-6 text-white shadow-km-md">
        <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-md">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/20 text-amber-200 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Voice-First AI Assistance in 5 Languages</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black leading-tight">
              {t('voice_assistant_btn')}
            </h2>
            <p className="text-xs text-emerald-100 leading-snug">
              Ask in Tamil, Hindi, English, Telugu or Malayalam for center wait times, tokens, and payment status.
            </p>
          </div>

          <button
            onClick={onOpenVoiceAssistant}
            className="px-5 py-3.5 rounded-2xl bg-white text-km-primary hover:bg-emerald-50 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2.5 shadow-xl transition-all transform hover:scale-105 active:scale-95 shrink-0"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-km-primary">
              <Mic className="w-4 h-4 animate-pulse" />
            </div>
            <span>{t('voice_assistant_btn')}</span>
          </button>
        </div>
      </div>

      {/* Active Booking Banner (if present) */}
      {activeBooking && activeBooking.status !== 'Cancelled' && (
        <div className="bg-white rounded-3xl border-2 border-emerald-500 shadow-km-md p-5 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                Active Slot Token
              </span>
              <span className="font-mono text-base font-black text-km-primary">{activeBooking.token_number}</span>
            </div>
            <Badge variant="success" size="sm">
              {activeBooking.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
              <span className="text-gray-400 block font-semibold text-[10px]">Center</span>
              <span className="font-bold text-km-textPrimary block truncate">{activeBooking.center_name}</span>
              <span className="text-gray-500">{activeBooking.slot_start} - {activeBooking.slot_end}</span>
            </div>

            <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100">
              <span className="text-emerald-800 block font-semibold text-[10px]">Queue Position</span>
              <span className="font-black text-lg text-emerald-950">
                #{activeBooking.live_queue_position || activeBooking.original_queue_pos || 1}
              </span>
              <span className="text-emerald-700 block font-medium">
                {Math.max(0, (activeBooking.live_queue_position || 1) - 1)} vehicles ahead
              </span>
            </div>

            <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-100">
              <span className="text-blue-800 block font-semibold text-[10px]">Recommended Departure</span>
              <span className="font-black text-lg text-blue-950 font-mono">
                {activeBooking.recommended_departure_time || '09:05 AM'}
              </span>
              <span className="text-blue-700 block font-medium">GPS dynamic routing</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('my-slot')}
            className="w-full py-3 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-800/20 transition-all"
          >
            <span>View Digital Token & Live Queue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI Recommended Center Card (shown when no active booking) */}
      {(!activeBooking || activeBooking.status === 'Cancelled') && recommendedCenter && (
        <div className="bg-white rounded-3xl border-2 border-emerald-400 shadow-km-md p-5 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                AI Recommended Center
              </span>
            </div>
            <RatingStars rating={recommendedCenter.rating} size="sm" />
          </div>

          <div className="flex items-start gap-3">
            {recommendedCenter.photo && (
              <img
                src={recommendedCenter.photo}
                alt={recommendedCenter.name}
                className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-gray-100"
              />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-black text-sm text-km-textPrimary leading-tight truncate">{recommendedCenter.name}</h3>
              <p className="text-xs text-km-textSecondary mt-0.5 truncate">{recommendedCenter.address}</p>
              {recommendedCenter.ai_recommendation_reason && (
                <p className="text-xs text-emerald-700 font-medium mt-1 leading-snug">
                  ✨ {recommendedCenter.ai_recommendation_reason}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-gray-50 rounded-2xl py-2">
              <span className="block font-bold text-km-textPrimary">{recommendedCenter.distance}</span>
              <span className="text-[10px] text-km-textSecondary">Distance</span>
            </div>
            <div className="bg-emerald-50 rounded-2xl py-2">
              <span className="block font-bold text-emerald-800">{recommendedCenter.waiting_time}</span>
              <span className="text-[10px] text-emerald-600">Est. Wait</span>
            </div>
            <div className="bg-blue-50 rounded-2xl py-2">
              <span className="block font-bold text-blue-800">{recommendedCenter.available_slots}</span>
              <span className="text-[10px] text-blue-600">Open Slots</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('find-center')}
            className="w-full py-3 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-800/20 transition-all"
          >
            <span>View & Book This Center</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Action Discovery Card */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-km-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-black text-lg text-km-textPrimary">{t('find_center')}</h3>
          <p className="text-xs text-km-textSecondary leading-relaxed">
            Compare real-time queues, travel distances, available slots, and AI recommendations to minimize waiting time.
          </p>
        </div>
        <button
          onClick={() => onNavigate('find-center')}
          className="px-6 py-3.5 rounded-2xl bg-km-primary hover:bg-km-primaryDark text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-800/20 transition-all transform hover:scale-105 active:scale-95 shrink-0"
        >
          <span>Find Procurement Center</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('find-center')}
          className="p-4 rounded-3xl bg-white border border-gray-200 hover:border-emerald-300 shadow-km-sm hover:shadow-km-md text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-km-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <MapPin className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-km-textPrimary block">{t('find_center')}</span>
          <span className="text-[10px] text-km-textSecondary">Map & comparison</span>
        </button>

        <button
          onClick={() => onNavigate('my-slot')}
          className="p-4 rounded-3xl bg-white border border-gray-200 hover:border-emerald-300 shadow-km-sm hover:shadow-km-md text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Ticket className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-km-textPrimary block">{t('my_slot')}</span>
          <span className="text-[10px] text-km-textSecondary">Token & departure</span>
        </button>

        <button
          onClick={() => onNavigate('my-slot')}
          className="p-4 rounded-3xl bg-white border border-gray-200 hover:border-emerald-300 shadow-km-sm hover:shadow-km-md text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-km-textPrimary block">{t('live_queue')}</span>
          <span className="text-[10px] text-km-textSecondary">Real-time status</span>
        </button>

        <button
          onClick={onOpenReportProblem}
          className="p-4 rounded-3xl bg-white border border-gray-200 hover:border-rose-300 shadow-km-sm hover:shadow-km-md text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-km-textPrimary block">{t('report_problem')}</span>
          <span className="text-[10px] text-km-textSecondary">1-minute complaint</span>
        </button>
      </div>

      {/* Interactive Concurrency Simulation Tester Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>High-Concurrency System Verification</span>
          </div>
          <p className="text-xs text-slate-300">
            Simulate 25 farmers simultaneously reserving slots against limited capacity to verify database isolation and zero-overbooking.
          </p>
        </div>
        <button
          onClick={onOpenConcurrencySimulator}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors shrink-0"
        >
          {t('concurrency_test_btn')}
        </button>
      </div>
    </div>
  );
};

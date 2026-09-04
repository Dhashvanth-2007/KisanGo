import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Booking, ProcurementCenter } from '../types';
import { api } from '../services/api';
import { RescheduleModal } from '../components/booking/RescheduleModal';
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
  ShieldCheck,
  CalendarClock,
  Navigation,
  XCircle,
  Wheat
} from 'lucide-react';
import { RatingStars } from '../components/common/RatingStars';
import { Badge } from '../components/common/Badge';

interface FarmerHomePageProps {
  activeBooking: Booking | null;
  recommendedCenter: ProcurementCenter | null;
  centers?: ProcurementCenter[];
  onRefreshBooking?: () => void;
  onNavigate: (tab: string) => void;
  onOpenVoiceAssistant: () => void;
  onOpenReportProblem: () => void;
}

export const FarmerHomePage: React.FC<FarmerHomePageProps> = ({
  activeBooking,
  recommendedCenter,
  centers = [],
  onRefreshBooking,
  onNavigate,
  onOpenVoiceAssistant,
  onOpenReportProblem
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelBooking = async () => {
    if (!activeBooking) return;
    if (!window.confirm('Are you sure you want to cancel this procurement slot booking?')) return;

    setIsCancelling(true);
    try {
      const res = await api.cancelBooking(activeBooking.id);
      if (res.success) {
        showToast('Booking cancelled successfully', 'info');
        if (onRefreshBooking) onRefreshBooking();
      } else {
        showToast(res.message || 'Failed to cancel', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to cancel booking', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleOpenDirections = () => {
    if (!activeBooking) return;
    const centerObj = centers.find((c) => c.id === activeBooking.center_id);
    const lat = centerObj?.latitude || 12.2253;
    const lng = centerObj?.longitude || 79.0747;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  // Calculate days/hours until appointment
  const getAppointmentCountdown = () => {
    if (!activeBooking?.date) return 'Scheduled for Today';
    const targetDate = new Date(`${activeBooking.date}T${activeBooking.sub_start_time || activeBooking.slot_start || '09:00'}:00`);
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    if (diffMs <= 0) return 'Appointment Window Active Now';
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''} (${diffHours % 24} hrs)`;
    return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-km-textSecondary font-semibold">{t('welcome_back')}</span>
          <h1 className="text-xl sm:text-2xl font-black text-km-textPrimary">{user?.name || t('role_farmer')}</h1>
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
              <span>{t('voice_hero_badge')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black leading-tight">
              {t('voice_assistant_btn')}
            </h2>
            <p className="text-xs text-emerald-100 leading-snug">
              {t('voice_hero_desc')}
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

      {/* My Upcoming Procurement Banner (if active booking exists) */}
      {activeBooking && activeBooking.status !== 'Cancelled' && (
        <div className="bg-white rounded-3xl border-2 border-emerald-500 shadow-km-md p-5 space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-700" />
                <span>My Upcoming Procurement</span>
              </span>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                ⏳ {getAppointmentCountdown()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-km-primary bg-gray-100 px-2.5 py-1 rounded-xl">
                {activeBooking.token_number}
              </span>
              <Badge variant="success" size="sm">
                {activeBooking.status}
              </Badge>
            </div>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {/* Date & Time */}
            <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100">
              <span className="text-emerald-800 block font-semibold text-[10px]">📅 Date & Time Window</span>
              <span className="font-black text-sm text-emerald-950 block">
                {activeBooking.date ? `${activeBooking.date} (${activeBooking.day_name || 'Day'})` : 'Today'}
              </span>
              <span className="text-xs text-emerald-700 font-bold">
                {activeBooking.sub_start_time ? `${activeBooking.sub_start_time} - ${activeBooking.sub_end_time}` : `${activeBooking.slot_start} - ${activeBooking.slot_end}`}
              </span>
            </div>

            {/* Center Info */}
            <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
              <span className="text-gray-400 block font-semibold text-[10px]">{t('procurement_center')}</span>
              <span className="font-bold text-km-textPrimary block truncate">{activeBooking.center_name}</span>
              <span className="text-gray-500 truncate block">{activeBooking.crop_name || 'Multi-Crop'} ({activeBooking.expected_quantity || 1000} kg)</span>
            </div>

            {/* Current Queue */}
            <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-100">
              <span className="text-amber-800 block font-semibold text-[10px]">{t('current_queue')}</span>
              <span className="font-black text-lg text-amber-950">
                #{activeBooking.live_queue_position || activeBooking.original_queue_pos || 1}
              </span>
              <span className="text-amber-700 block font-medium">
                {Math.max(0, (activeBooking.live_queue_position || 1) - 1)} {t('vehicles_ahead')}
              </span>
            </div>

            {/* Recommended Departure */}
            <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-100">
              <span className="text-blue-800 block font-semibold text-[10px]">{t('recommended_departure')}</span>
              <span className="font-black text-lg text-blue-950 font-mono">
                {activeBooking.recommended_departure_time || '09:05 AM'}
              </span>
              <span className="text-blue-700 block font-medium">Auto-Optimized Routing</span>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {/* Reschedule Button */}
            <button
              onClick={() => setIsRescheduleOpen(true)}
              className="py-2.5 px-3 bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-2xs transition-all"
            >
              <CalendarClock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Reschedule Slot</span>
            </button>

            {/* Directions Button */}
            <button
              onClick={handleOpenDirections}
              className="py-2.5 px-3 bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-2xs transition-all"
            >
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              <span>Directions</span>
            </button>

            {/* View Queue Button */}
            <button
              onClick={() => onNavigate('my-slot')}
              className="py-2.5 px-3 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <span>{t('view_token_queue')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Cancel Button */}
            <button
              onClick={handleCancelBooking}
              disabled={isCancelling}
              className="py-2.5 px-3 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-2xs transition-all disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Recommended Center Card (shown when no active booking) */}
      {(!activeBooking || activeBooking.status === 'Cancelled') && recommendedCenter && (
        <div className="bg-white rounded-3xl border-2 border-emerald-400 shadow-km-md p-5 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                {t('ai_recommended_badge')}
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
              <span className="text-[10px] text-km-textSecondary">{t('distance')}</span>
            </div>
            <div className="bg-emerald-50 rounded-2xl py-2">
              <span className="block font-bold text-emerald-800">{recommendedCenter.waiting_time}</span>
              <span className="text-[10px] text-emerald-600">{t('waiting_time')}</span>
            </div>
            <div className="bg-blue-50 rounded-2xl py-2">
              <span className="block font-bold text-blue-800">{recommendedCenter.available_slots}</span>
              <span className="text-[10px] text-blue-600">{t('available_slots')}</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('find-center')}
            className="w-full py-3 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-800/20 transition-all"
          >
            <span>{t('view_book_btn')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Action Discovery Card */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-km-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-black text-lg text-km-textPrimary">{t('find_center')}</h3>
          <p className="text-xs text-km-textSecondary leading-relaxed">
            {t('find_centers_desc')}
          </p>
        </div>
        <button
          onClick={() => onNavigate('find-center')}
          className="px-6 py-3.5 rounded-2xl bg-km-primary hover:bg-km-primaryDark text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-800/20 transition-all transform hover:scale-105 active:scale-95 shrink-0"
        >
          <span>{t('find_center_btn')}</span>
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
          <span className="text-[10px] text-km-textSecondary">{t('map_and_comparison')}</span>
        </button>

        <button
          onClick={() => onNavigate('my-slot')}
          className="p-4 rounded-3xl bg-white border border-gray-200 hover:border-emerald-300 shadow-km-sm hover:shadow-km-md text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Ticket className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-km-textPrimary block">{t('my_slot')}</span>
          <span className="text-[10px] text-km-textSecondary">{t('token_and_departure')}</span>
        </button>

        <button
          onClick={() => onNavigate('my-slot')}
          className="p-4 rounded-3xl bg-white border border-gray-200 hover:border-emerald-300 shadow-km-sm hover:shadow-km-md text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-km-textPrimary block">{t('live_queue')}</span>
          <span className="text-[10px] text-km-textSecondary">{t('realtime_status')}</span>
        </button>

        <button
          onClick={onOpenReportProblem}
          className="p-4 rounded-3xl bg-white border border-gray-200 hover:border-rose-300 shadow-km-sm hover:shadow-km-md text-left transition-all group"
        >
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <span className="font-bold text-xs text-km-textPrimary block">{t('report_problem')}</span>
          <span className="text-[10px] text-km-textSecondary">{t('one_min_complaint')}</span>
        </button>
      </div>

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        booking={activeBooking}
        centers={centers}
        onRescheduled={() => {
          setIsRescheduleOpen(false);
          if (onRefreshBooking) onRefreshBooking();
        }}
      />
    </div>
  );
};

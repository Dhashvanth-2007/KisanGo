import React, { useState } from 'react';
import { Booking } from '../../types';
import { Badge } from '../common/Badge';
import {
  QrCode,
  MapPin,
  Clock,
  ShieldCheck,
  User,
  Calendar,
  Wheat,
  Navigation,
  AlertTriangle,
  CheckCircle,
  Timer,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

interface DigitalTokenCardProps {
  booking: Booking;
  onViewLiveQueue?: () => void;
  onViewAlternatives?: () => void;
}

export const DigitalTokenCard: React.FC<DigitalTokenCardProps> = ({
  booking,
  onViewLiveQueue,
  onViewAlternatives
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [keptConfirmed, setKeptConfirmed] = useState(false);

  const delayMins = booking.delay_minutes || 0;
  const isDelayed =
    booking.status === 'Delayed' ||
    booking.is_delayed ||
    delayMins > 0;

  const isLargeDelay = delayMins >= 25;

  const handleKeepBooking = () => {
    setKeptConfirmed(true);
    showToast('Your booking remains confirmed! You will receive priority weighing upon arrival.', 'success');
  };

  return (
    <div className="relative bg-white rounded-3xl border-2 border-emerald-500/80 shadow-km-lg overflow-hidden flex flex-col">
      {/* Decorative Top Accent */}
      <div className={`px-5 py-3 flex items-center justify-between text-white ${
        isDelayed
          ? 'bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700'
          : 'bg-gradient-to-r from-km-primary via-emerald-600 to-km-primary'
      }`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-200" />
          <span className="font-extrabold text-sm tracking-wide uppercase">Official Procurement Token</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isDelayed ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white text-rose-800 shadow-xs flex items-center gap-1">
              <Clock className="w-3 h-3" /> Delayed • Confirmed
            </span>
          ) : (
            <Badge variant="success" size="sm" className="bg-white/20 text-white border-white/30">
              {booking.status}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* REASSURING DELAY NOTICE BANNER */}
        {isDelayed && (
          <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-white p-4 rounded-2xl border border-amber-300 shadow-2xs space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-black text-xs sm:text-sm text-amber-950">
                  Procurement Centre Experiencing a ~{delayMins} Min Delay
                </h4>
                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  Your procurement centre is currently experiencing a delay. <strong>Your booking is still confirmed</strong> and your estimated arrival & processing time has been automatically updated.
                </p>
              </div>
            </div>

            {/* LARGE DELAY OPTIONS (> 25 mins) */}
            {isLargeDelay && !keptConfirmed && (
              <div className="pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-amber-950">
                  Delay is significant (~{delayMins} mins). Choose an option:
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleKeepBooking}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl shadow-2xs transition-all"
                  >
                    Keep Current Booking
                  </button>
                  {onViewAlternatives && (
                    <button
                      type="button"
                      onClick={onViewAlternatives}
                      className="flex-1 sm:flex-initial px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black rounded-xl transition-all"
                    >
                      View Alternative Slots
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Token Number & QR Code Header */}
        <div className="flex items-center justify-between gap-4 bg-gradient-to-tr from-emerald-50/90 via-teal-50/50 to-amber-50/40 p-4 sm:p-5 rounded-3xl border border-emerald-200 shadow-inner">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 block mb-0.5">
              {t('token_number')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-km-primary font-mono tracking-wider">
              {booking.token_number || 'FG-1042'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-km-textSecondary font-semibold mt-1">
              <span>Queue Position: <strong className="text-km-primary font-bold">#{booking.queue_position || booking.live_queue_position || 2}</strong></span>
              <span>•</span>
              <span>Est. Wait: <strong className="text-km-primary font-bold">{booking.estimated_waiting_time || booking.live_estimated_wait || 14} mins</strong></span>
            </div>
          </div>

          {/* QR Code Graphic Box */}
          <div className="bg-white p-3 rounded-2xl border border-emerald-200 shadow-sm flex flex-col items-center justify-center shrink-0">
            <QrCode className="w-16 h-16 text-emerald-950" />
            <span className="text-[9px] font-mono text-gray-500 mt-1 uppercase font-bold">Scan at gate</span>
          </div>
        </div>

        {/* Dynamic Timing Card */}
        <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-gray-500 uppercase block">Planned Processing Window</span>
            <div className="flex items-center gap-1.5 font-extrabold text-km-textPrimary text-sm">
              <Clock className="w-4 h-4 text-km-primary" />
              <span>{booking.planned_start_time || booking.slot_start || '09:30 AM'} - {booking.planned_end_time || booking.slot_end || '09:45 AM'}</span>
              <span className="text-[10px] text-gray-500 font-medium">(15 mins)</span>
            </div>
            {booking.master_window && (
              <span className="text-[11px] text-gray-500 block font-medium">
                1-Hour Window: {booking.master_window}
              </span>
            )}
          </div>

          {/* Updated Estimated Time Badge */}
          {booking.estimated_start_time && (
            <div className={`p-2.5 rounded-xl border text-right sm:text-left ${
              isDelayed
                ? 'bg-rose-100/90 border-rose-300 text-rose-950'
                : 'bg-emerald-100 border-emerald-300 text-emerald-950'
            }`}>
              <span className="text-[10px] uppercase font-extrabold block">Updated Estimated Start</span>
              <span className="text-base font-black font-mono block">{booking.estimated_start_time}</span>
              {isDelayed && (
                <span className="text-[9px] font-bold text-rose-700">+{delayMins} mins delay adjusted</span>
              )}
            </div>
          )}
        </div>

        {/* Center & Consignment Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Center Details */}
          <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-gray-400 font-semibold text-[10px] uppercase block">Procurement Center</span>
            <h4 className="font-bold text-sm text-km-textPrimary">{booking.center_name}</h4>
            <p className="text-[11px] text-km-textSecondary line-clamp-2">{booking.center_address}</p>
          </div>

          {/* Consignment */}
          <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 space-y-1.5">
            <span className="text-gray-400 font-semibold text-[10px] uppercase block">Consignment Details</span>
            {booking.crops && booking.crops.length > 0 ? (
              <div className="space-y-1">
                {booking.crops.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-km-textPrimary flex items-center gap-1">
                      <Wheat className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>{c.cropName}</span>
                    </span>
                    <span className="font-mono font-bold text-km-primary">
                      {c.expectedQuantity.toLocaleString()} kg
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-km-primary font-bold flex items-center gap-1">
                <Wheat className="w-3.5 h-3.5 text-amber-600" />
                <span>{booking.crop_name} • {booking.expected_quantity?.toLocaleString()} kg</span>
              </p>
            )}
          </div>
        </div>

        {/* Officer in Charge */}
        {booking.officer_name && (
          <div className="flex items-center justify-between text-xs bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-km-primary shrink-0" />
              <div>
                <span className="text-gray-500 block text-[10px]">Officer in Charge</span>
                <span className="font-bold text-km-textPrimary">{booking.officer_name}</span>
              </div>
            </div>
            {booking.officer_contact && (
              <span className="text-[11px] text-km-primary font-semibold">{booking.officer_contact}</span>
            )}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          {booking.center_latitude && booking.center_longitude && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${booking.center_latitude},${booking.center_longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 px-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-km-textPrimary flex items-center justify-center gap-1.5 transition-colors text-center"
            >
              <Navigation className="w-4 h-4 text-km-primary" />
              <span>{t('get_directions')}</span>
            </a>
          )}

          {onViewLiveQueue && (
            <button
              onClick={onViewLiveQueue}
              className="flex-1 py-3 px-4 rounded-2xl bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-800/20 transition-all active:scale-95"
            >
              <span>{t('live_queue')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Booking } from '../../types';
import { Badge } from '../common/Badge';
import { QrCode, MapPin, Clock, ShieldCheck, User, Calendar, Wheat, Navigation } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface DigitalTokenCardProps {
  booking: Booking;
  onViewLiveQueue?: () => void;
}

export const DigitalTokenCard: React.FC<DigitalTokenCardProps> = ({
  booking,
  onViewLiveQueue
}) => {
  const { t } = useLanguage();

  return (
    <div className="relative bg-white rounded-3xl border-2 border-emerald-500/80 shadow-km-lg overflow-hidden flex flex-col">
      {/* Decorative Top Accent */}
      <div className="bg-gradient-to-r from-km-primary via-emerald-600 to-km-primary text-white px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-200" />
          <span className="font-extrabold text-sm tracking-wide uppercase">Official Procurement Token</span>
        </div>
        <Badge variant="success" size="sm" className="bg-white/20 text-white border-white/30">
          {booking.status}
        </Badge>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Token Number & QR Code Header */}
        <div className="flex items-center justify-between gap-4 bg-gradient-to-tr from-emerald-50/90 via-teal-50/50 to-amber-50/40 p-4 sm:p-5 rounded-3xl border border-emerald-200 shadow-inner">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 block mb-0.5">
              {t('token_number')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-km-primary font-mono tracking-wider">
              {booking.token_number || 'KM-0421'}
            </h2>
            <p className="text-xs text-km-textSecondary font-semibold mt-1">
              Queue Position: <span className="text-km-primary font-bold">#{booking.live_queue_position || booking.original_queue_pos || 1}</span>
            </p>
          </div>

          {/* QR Code Graphic Box */}
          <div className="bg-white p-3 rounded-2xl border border-emerald-200 shadow-sm flex flex-col items-center justify-center shrink-0">
            <QrCode className="w-16 h-16 text-emerald-950" />
            <span className="text-[9px] font-mono text-gray-500 mt-1 uppercase font-bold">Scan at gate</span>
          </div>
        </div>

        {/* Center & Slot Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Center Details */}
          <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-gray-400 font-semibold text-[10px] uppercase block">Procurement Center</span>
            <h4 className="font-bold text-sm text-km-textPrimary">{booking.center_name}</h4>
            <p className="text-[11px] text-km-textSecondary line-clamp-2">{booking.center_address}</p>
          </div>

          {/* Slot & Consignment */}
          <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 space-y-1.5">
            <span className="text-gray-400 font-semibold text-[10px] uppercase block">Slot & Consignment</span>
            <div className="flex items-center gap-1.5 font-bold text-km-textPrimary text-sm">
              <Calendar className="w-3.5 h-3.5 text-km-primary" />
              <span>{booking.slot_start} - {booking.slot_end}</span>
            </div>

            {/* If multi-crop */}
            {booking.crops && booking.crops.length > 0 ? (
              <div className="space-y-1 pt-1 border-t border-gray-200/60">
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

import React from 'react';
import { Booking } from '../../types';
import { Navigation, Car, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface TravelGuidanceCardProps {
  booking: Booking;
}

export const TravelGuidanceCard: React.FC<TravelGuidanceCardProps> = ({ booking }) => {
  const { t } = useLanguage();

  const departureTime = booking.recommended_departure_time || '09:05 AM';
  const travelTime = booking.travel_time_mins || 40;

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 p-5 sm:p-6 shadow-km-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
          <Car className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-km-textPrimary">Smart Travel Guidance</h3>
          <p className="text-[11px] text-km-textSecondary">Calculated using live distance, road speed, and unloading window</p>
        </div>
      </div>

      {/* Hero Departure Time Box */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-emerald-50/50 p-4 sm:p-5 rounded-2xl border border-blue-200 flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
            {t('recommended_departure')}
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-blue-950 font-mono">
            {departureTime}
          </span>
          <p className="text-[11px] text-km-textSecondary mt-0.5">
            Arrive by {booking.slot_start} (includes 15-min vehicle check buffer)
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs font-bold text-km-primary bg-white px-2.5 py-1 rounded-xl border border-blue-200 shadow-2xs block">
            {travelTime} mins drive
          </span>
        </div>
      </div>

      {/* Travel Tips Checklist */}
      <div className="space-y-2 text-xs text-km-textSecondary">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>Keep your digital token <strong>{booking.token_number}</strong> or mobile screen ready at the entry gate.</span>
        </div>
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>Ensure moisture content is within permissible 12% - 14% range for zero deduction.</span>
        </div>
      </div>
    </div>
  );
};

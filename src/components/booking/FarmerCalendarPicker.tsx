import React from 'react';
import { DateAvailability, DateStatus } from '../../types';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle, XCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface FarmerCalendarPickerProps {
  dates: DateAvailability[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  isLoading?: boolean;
}

export const FarmerCalendarPicker: React.FC<FarmerCalendarPickerProps> = ({
  dates,
  selectedDate,
  onSelectDate,
  isLoading = false
}) => {
  const { t } = useLanguage();

  const getStatusBadge = (status: DateStatus, remaining: number) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>{remaining} slots</span>
          </span>
        );
      case 'LIMITED_AVAILABILITY':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <span>{remaining} left</span>
          </span>
        );
      case 'FULL':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
            <span>Full</span>
          </span>
        );
      case 'CLOSED':
      case 'HOLIDAY':
      case 'RESERVED':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
            <span>{status === 'HOLIDAY' ? 'Holiday' : 'Closed'}</span>
          </span>
        );
    }
  };

  // Find next available date
  const nextAvailable = dates.find(
    (d) => (d.status === 'AVAILABLE' || d.status === 'LIMITED_AVAILABILITY') && d.remainingSlots > 0
  );

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 p-4 sm:p-6 shadow-km-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-2xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-base sm:text-lg text-km-textPrimary flex items-center gap-2">
              <span>{t('choose_procurement_date') || 'Choose Procurement Date'}</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                14-Day Horizon
              </span>
            </h3>
            <p className="text-xs text-km-textSecondary mt-0.5">
              Choose a date and time convenient for you. Pre-booking avoids congestion.
            </p>
          </div>
        </div>

        {nextAvailable && nextAvailable.date !== selectedDate && (
          <button
            type="button"
            onClick={() => onSelectDate(nextAvailable.date)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-km-primary text-xs font-bold rounded-xl border border-emerald-200 transition-all self-start sm:self-auto cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Next Available: {nextAvailable.formattedDate}</span>
          </button>
        )}
      </div>

      {/* 14-Day Horizontal Scrollable / Grid Calendar Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        {dates.map((item) => {
          const isSelected = item.date === selectedDate;
          const isFull = item.status === 'FULL' || item.remainingSlots <= 0;
          const isClosed = item.status === 'CLOSED' || item.status === 'HOLIDAY' || item.status === 'RESERVED' || !item.isWorkingDay;
          const isDisabled = isFull || isClosed;

          return (
            <button
              key={item.date}
              type="button"
              disabled={isDisabled || isLoading}
              onClick={() => onSelectDate(item.date)}
              className={`relative flex flex-col items-center justify-between p-3 rounded-2xl border text-center transition-all min-h-[105px] cursor-pointer ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/30 scale-[1.02]'
                  : isDisabled
                  ? 'bg-gray-50/80 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                  : item.status === 'LIMITED_AVAILABILITY'
                  ? 'bg-amber-50/60 hover:bg-amber-50 text-km-textPrimary border-amber-200 hover:border-amber-300'
                  : 'bg-white hover:bg-emerald-50/50 text-km-textPrimary border-gray-200 hover:border-emerald-300'
              }`}
            >
              {/* Day Name */}
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isSelected ? 'text-emerald-100' : 'text-gray-500'}`}>
                {item.dayName.slice(0, 3)}
              </span>

              {/* Date */}
              <span className="text-base sm:text-lg font-black tracking-tight my-1">
                {item.formattedDate}
              </span>

              {/* Status Badge */}
              <div className="mt-1">
                {isSelected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-white">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Selected</span>
                  </span>
                ) : (
                  getStatusBadge(item.status, item.remainingSlots)
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend & Help note */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-gray-500 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Available</span>
          </span>
          <span className="flex items-center gap-1 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Filling Fast</span>
          </span>
          <span className="flex items-center gap-1 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Full</span>
          </span>
          <span className="flex items-center gap-1 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
            <span>Closed / Holiday</span>
          </span>
        </div>

        <span className="text-[10px] text-gray-400 font-medium">
          🔒 Overbooking Protection Active • Real-time DB capacity verified
        </span>
      </div>
    </div>
  );
};

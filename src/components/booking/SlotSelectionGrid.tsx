import React from 'react';
import { Slot, MasterSlotWindow } from '../../types';
import {
  Sparkles,
  Clock,
  Car,
  CheckCircle,
  Lock,
  AlertCircle,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface SlotSelectionGridProps {
  slots: Slot[];
  masterWindows?: MasterSlotWindow[];
  selectedSlotId: string | null;
  onSelectSlot: (slot: Slot) => void;
  travelTimeMins?: number;
  centerName?: string;
  queueCount?: number;
  waitingTime?: string;
}

export const SlotSelectionGrid: React.FC<SlotSelectionGridProps> = ({
  slots,
  masterWindows,
  selectedSlotId,
  onSelectSlot,
  travelTimeMins = 35,
  centerName,
  queueCount,
  waitingTime
}) => {
  const { t } = useLanguage();

  // If masterWindows wasn't directly passed from backend, reconstruct it from slots
  const groupedWindows: MasterSlotWindow[] =
    masterWindows && masterWindows.length > 0
      ? masterWindows
      : (() => {
          const map: Record<string, MasterSlotWindow> = {};
          slots.forEach((s) => {
            const label = s.master_window || `${s.start_time} - ${s.end_time}`;
            if (!map[label]) {
              const parts = label.split(' - ');
              map[label] = {
                master_window: label,
                start_time: parts[0] || s.start_time,
                end_time: parts[1] || s.end_time,
                status: 'Available',
                available_sub_slots_count: 0,
                total_sub_slots_count: 0,
                sub_slots: []
              };
            }
            map[label].sub_slots.push(s);
            map[label].total_sub_slots_count += 1;
            const isAvail = s.status === 'Available' && (s.remaining_capacity ?? (s.capacity - s.booked_count)) > 0;
            if (isAvail) map[label].available_sub_slots_count += 1;
          });

          return Object.values(map).map((mw) => {
            if (mw.available_sub_slots_count === 0) {
              const allReserved = mw.sub_slots.every((s) => s.status === 'Reserved');
              const allClosed = mw.sub_slots.every((s) => s.status === 'Closed');
              mw.status = allReserved ? 'Reserved' : allClosed ? 'Closed' : 'Full';
            } else {
              mw.status = 'Available';
            }
            return mw;
          });
        })();

  const recommendedSlot =
    slots.find((s) => s.is_ai_recommended) ||
    slots.find((s) => s.status === 'Available' && (s.remaining_capacity ?? (s.capacity - s.booked_count)) > 0) ||
    null;

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 p-4 sm:p-6 shadow-km-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-base sm:text-lg text-km-textPrimary flex items-center gap-2">
              <span>{t('choose_slot_title') || 'Choose Your 15-Minute Slot'}</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                1-Hour Windows
              </span>
            </h3>
            <p className="text-xs text-km-textSecondary mt-0.5">
              {t('choose_slot_subtitle') || 'Select a convenient 15-minute window to avoid congestion and wait times'}
            </p>
          </div>
        </div>

        {/* Legend pills */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl">
            <Lock className="w-2.5 h-2.5 text-amber-600" /> Reserved
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-500 border border-gray-200 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span> Booked
          </span>
        </div>
      </div>

      {/* AI Smart Slot Recommendation Hero Card */}
      {recommendedSlot && (
        <div className="bg-gradient-to-br from-amber-50 via-emerald-50/60 to-white p-4 sm:p-5 rounded-3xl border-2 border-amber-300 shadow-km-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-500 to-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-full shadow-xs">
                <Sparkles className="w-3 h-3 animate-pulse" />
                <span>AI Smart Slot Recommendation</span>
              </div>
              <h4 className="text-base sm:text-lg font-black text-km-textPrimary flex items-center gap-2">
                <span>{recommendedSlot.start_time} - {recommendedSlot.end_time}</span>
                <span className="text-xs font-bold text-gray-500 bg-white/80 px-2 py-0.5 rounded-lg border border-amber-200">
                  {recommendedSlot.master_window || '1-Hour Window'}
                </span>
              </h4>
              <p className="text-xs text-km-textSecondary font-medium">
                {recommendedSlot.recommendation_reason ||
                  `Recommended for minimum queue wait and comfortable arrival buffer of ${travelTimeMins + 15} mins.`}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onSelectSlot(recommendedSlot)}
                className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 shadow-md ${
                  selectedSlotId === recommendedSlot.id
                    ? 'bg-emerald-700 text-white ring-4 ring-emerald-600/30'
                    : 'bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white'
                }`}
              >
                {selectedSlotId === recommendedSlot.id ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Selected</span>
                  </>
                ) : (
                  <>
                    <span>Select Recommended Slot</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-Hour Master Windows & Sub-Slots Container */}
      <div className="space-y-5">
        {groupedWindows.map((mw, wIdx) => {
          const isWindowFull = mw.available_sub_slots_count === 0;

          return (
            <div
              key={mw.master_window || `mw-${wIdx}`}
              className={`rounded-3xl border transition-all p-4 sm:p-5 ${
                isWindowFull
                  ? 'bg-gray-50/70 border-gray-200 opacity-80'
                  : 'bg-white border-emerald-100 hover:border-emerald-300 shadow-2xs'
              }`}
            >
              {/* Master Window Header Banner */}
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-black text-xs">
                    {wIdx + 1}
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-extrabold text-km-textPrimary block">
                      {mw.master_window}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">
                      4 Sub-Slots (15 mins each)
                    </span>
                  </div>
                </div>

                <div>
                  {isWindowFull ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700 border border-rose-200">
                      Full / Unavailable
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {mw.available_sub_slots_count} of 4 Available
                    </span>
                  )}
                </div>
              </div>

              {/* 4x 15-Minute Sub-Slots Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {mw.sub_slots.map((subSlot) => {
                  const isSelected = selectedSlotId === subSlot.id;
                  const remaining =
                    subSlot.remaining_capacity !== undefined
                      ? subSlot.remaining_capacity
                      : Math.max(0, subSlot.capacity - subSlot.booked_count);

                  const isBooked = subSlot.status === 'Booked' || remaining <= 0;
                  const isReserved = subSlot.status === 'Reserved';
                  const isClosed = subSlot.status === 'Closed';
                  const isAvailable = !isBooked && !isReserved && !isClosed;

                  return (
                    <button
                      key={subSlot.id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => onSelectSlot(subSlot)}
                      className={`relative p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[90px] ${
                        isSelected
                          ? 'border-2 border-km-primary bg-emerald-50/90 shadow-md ring-4 ring-km-primary/15'
                          : isReserved
                          ? 'border-amber-200 bg-amber-50/60 cursor-not-allowed opacity-85'
                          : isBooked
                          ? 'border-gray-200 bg-gray-100/70 cursor-not-allowed opacity-60'
                          : isClosed
                          ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                          : subSlot.is_ai_recommended
                          ? 'border-2 border-amber-400 bg-amber-50/40 hover:bg-amber-50 shadow-2xs hover:scale-[1.02]'
                          : 'border-gray-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/30 hover:scale-[1.02] shadow-2xs'
                      }`}
                    >
                      {/* Sub-Slot AI Tag */}
                      {subSlot.is_ai_recommended && (
                        <div className="absolute -top-2 right-2 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-emerald-600 text-[8px] font-extrabold uppercase text-white rounded-full shadow-2xs flex items-center gap-0.5">
                          <Sparkles className="w-2 h-2" />
                          <span>AI Choice</span>
                        </div>
                      )}

                      {/* Time Label */}
                      <div className="flex items-start justify-between gap-1 w-full">
                        <div>
                          <span className="font-extrabold text-xs sm:text-sm text-km-textPrimary block">
                            {subSlot.start_time} - {subSlot.end_time}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">15 mins</span>
                        </div>

                        {isSelected && (
                          <span className="p-1 rounded-full bg-km-primary text-white shrink-0">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>

                      {/* Status Display Pill */}
                      <div className="mt-2 pt-2 border-t border-gray-100/80 flex items-center justify-between text-[10px]">
                        {isReserved ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Reserved by Centre</span>
                          </span>
                        ) : isBooked ? (
                          <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                            Booked
                          </span>
                        ) : isClosed ? (
                          <span className="font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-md">
                            Closed
                          </span>
                        ) : (
                          <span className="font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            {remaining} {remaining === 1 ? 'Slot' : 'Slots'} Open
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

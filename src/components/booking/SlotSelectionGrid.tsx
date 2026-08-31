import React from 'react';
import { Slot } from '../../types';
import { Sparkles, Clock, Car, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface SlotSelectionGridProps {
  slots: Slot[];
  selectedSlotId: string | null;
  onSelectSlot: (slot: Slot) => void;
  travelTimeMins?: number;
}

export const SlotSelectionGrid: React.FC<SlotSelectionGridProps> = ({
  slots,
  selectedSlotId,
  onSelectSlot,
  travelTimeMins = 40
}) => {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 p-5 sm:p-6 shadow-km-sm space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-km-textPrimary">Select Procurement Time Slot</h3>
            <p className="text-[11px] text-km-textSecondary">Smart allocation minimizes waiting & avoids congestion</p>
          </div>
        </div>
      </div>

      {/* Slots Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {slots.map((slot) => {
          const isSelected = selectedSlotId === slot.id;
          const remaining = slot.remaining_capacity !== undefined ? slot.remaining_capacity : (slot.capacity - slot.booked_count);
          const isFull = remaining <= 0;

          return (
            <button
              key={slot.id}
              type="button"
              disabled={isFull}
              onClick={() => onSelectSlot(slot)}
              className={`relative p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                isFull
                  ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                  : isSelected
                  ? 'border-2 border-km-primary bg-emerald-50/80 shadow-md ring-4 ring-km-primary/10'
                  : slot.is_ai_recommended
                  ? 'border-2 border-amber-400 bg-amber-50/50 hover:bg-amber-50 shadow-sm'
                  : 'border-gray-200 hover:border-emerald-300 bg-white'
              }`}
            >
              {/* AI Recommended Badge */}
              {slot.is_ai_recommended && (
                <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-500 to-emerald-600 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>AI Recommended</span>
                </div>
              )}

              {/* Time Window & Status */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-extrabold text-sm text-km-textPrimary block">
                    {slot.start_time} - {slot.end_time}
                  </span>
                  <span className="text-[11px] text-km-textSecondary">
                    {isFull ? (
                      <span className="text-rose-600 font-bold">Fully Booked</span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">{remaining} slots available</span>
                    )}
                  </span>
                </div>

                {isSelected && (
                  <span className="p-1 rounded-full bg-km-primary text-white">
                    <CheckCircle className="w-4 h-4" />
                  </span>
                )}
              </div>

              {/* Recommended Departure Helper */}
              {slot.recommended_departure && !isFull && (
                <div className="mt-3 pt-2.5 border-t border-gray-100/80 flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Car className="w-3 h-3 text-km-primary" />
                    <span>Depart by:</span>
                  </span>
                  <span className="font-bold text-km-textPrimary bg-white px-2 py-0.5 rounded-md border border-gray-100 shadow-2xs">
                    {slot.recommended_departure}
                  </span>
                </div>
              )}

              {/* Capacity Progress Bar */}
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isFull ? 'bg-rose-500 w-full' : remaining <= 3 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, ((slot.capacity - remaining) / slot.capacity) * 100)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';
import { Modal } from '../common/Modal';
import { ProcurementCenter, Slot, Crop } from '../../types';
import { RatingStars } from '../common/RatingStars';
import { MapPin, Clock, Calendar, Wheat, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface SlotConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  center: ProcurementCenter | null;
  slot: Slot | null;
  crop: Crop | null;
  quantity: number;
  onConfirm: () => void;
  isConfirming?: boolean;
}

export const SlotConfirmationModal: React.FC<SlotConfirmationModalProps> = ({
  isOpen,
  onClose,
  center,
  slot,
  crop,
  quantity,
  onConfirm,
  isConfirming = false
}) => {
  const { t } = useLanguage();

  if (!center || !slot || !crop) return null;

  const travelTime = center.travelTimeMins || 40;
  const waitingTime = center.waitingTimeMins || 15;
  const processingTime = slot.estimated_processing_mins || 20;
  const totalTime = travelTime + waitingTime + processingTime;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Your Procurement Slot"
      subtitle="Verify your booking details before token generation"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Center Summary Header */}
        <div className="flex items-center gap-3 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100">
          <img
            src={center.photo}
            alt={center.name}
            className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
          />
          <div>
            <h4 className="font-bold text-sm text-km-textPrimary leading-tight">{center.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <RatingStars rating={center.rating} size="sm" showNumber={false} />
              <span className="text-xs text-km-textSecondary">• {center.distance}</span>
            </div>
            <p className="text-[11px] text-km-textSecondary line-clamp-1 mt-0.5">{center.address}</p>
          </div>
        </div>

        {/* Booking Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Crop & Quantity */}
          <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-gray-400 block font-semibold text-[10px] uppercase">Consignment</span>
            <span className="font-bold text-km-textPrimary block text-sm">{crop.name}</span>
            <span className="text-km-primary font-extrabold">{quantity.toLocaleString()} kg ({(quantity / 100).toFixed(1)} Quintals)</span>
          </div>

          {/* Slot & Departure */}
          <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-gray-400 block font-semibold text-[10px] uppercase">Slot Window</span>
            <span className="font-bold text-km-textPrimary block text-sm">{slot.start_time} - {slot.end_time}</span>
            <span className="text-blue-700 font-bold block">Depart by: {slot.recommended_departure || '09:05 AM'}</span>
          </div>
        </div>

        {/* Total Time Breakdown Banner */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-4 rounded-2xl border border-emerald-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-950 uppercase tracking-wider text-[10px]">
              Total Estimated Farmer Time
            </span>
            <span className="font-extrabold text-km-primary text-sm">
              ~{totalTime} mins ({Math.floor(totalTime / 60)}h {totalTime % 60}m)
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-100/80 text-center text-[11px]">
            <div>
              <span className="text-gray-500 block text-[10px]">Travel</span>
              <span className="font-bold text-km-textPrimary">{travelTime} min</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">Wait Queue</span>
              <span className="font-bold text-km-textPrimary">{waitingTime} min</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">Processing</span>
              <span className="font-bold text-km-textPrimary">{processingTime} min</span>
            </div>
          </div>
        </div>

        {/* Guarantees */}
        <div className="flex items-center gap-2 text-xs text-km-textSecondary bg-gray-50 p-2.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-km-primary shrink-0" />
          <span>Priority bay reservation guaranteed with digital token on arrival.</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-3 px-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-km-textPrimary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex-1 py-3 px-4 rounded-2xl bg-km-primary hover:bg-km-primaryDark text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-800/25 transition-all disabled:opacity-50"
          >
            {isConfirming ? (
              <span>Reserving Slot...</span>
            ) : (
              <>
                <span>{t('confirm_slot')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

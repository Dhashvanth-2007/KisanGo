import React from 'react';
import { Modal } from '../common/Modal';
import { ProcurementCenter, Slot, Crop, SelectedCropItem } from '../../types';
import { RatingStars } from '../common/RatingStars';
import { MapPin, Clock, Calendar, Wheat, Check, ArrowRight, ShieldCheck, Scale, DollarSign } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface SlotConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  center: ProcurementCenter | null;
  slot: Slot | null;
  crop?: Crop | null;
  quantity?: number;
  selectedCrops?: SelectedCropItem[];
  onConfirm: () => void;
  isConfirming?: boolean;
}

export const SlotConfirmationModal: React.FC<SlotConfirmationModalProps> = ({
  isOpen,
  onClose,
  center,
  slot,
  crop,
  quantity = 2500,
  selectedCrops,
  onConfirm,
  isConfirming = false
}) => {
  const { t } = useLanguage();

  if (!center || !slot) return null;

  // Multi-crop fallback list
  const cropsList: SelectedCropItem[] =
    selectedCrops && selectedCrops.length > 0
      ? selectedCrops
      : crop
      ? [
          {
            cropId: crop.id,
            cropName: crop.name,
            expectedQuantity: quantity,
            mspRate: crop.msp_rate
          }
        ]
      : [];

  const totalQuantity = cropsList.reduce((sum, item) => sum + (item.expectedQuantity || 0), 0);
  const totalEstimatedMsp = cropsList.reduce(
    (sum, item) => sum + (item.expectedQuantity || 0) * (item.mspRate || 0),
    0
  );

  const travelTime = center.travelTimeMins || 40;
  const waitingTime = center.waitingTimeMins || 15;
  const processingTime = slot.estimated_processing_mins || 20;
  const totalTime = travelTime + waitingTime + processingTime;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('confirm_procurement_slot')}
      subtitle={t('verify_multi_crop_desc')}
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

        {/* Multi-Crop Itemized Breakdown Box */}
        <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <span className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">
              {cropsList.length} {t('grains_selected')}
            </span>
            <span className="font-extrabold text-km-primary font-mono text-xs">
              {t('total_weight')}: {totalQuantity.toLocaleString()} kg ({(totalQuantity / 100).toFixed(1)} Qtl)
            </span>
          </div>

          <div className="space-y-2 divide-y divide-gray-100">
            {cropsList.map((item) => {
              const subtotal = item.expectedQuantity * item.mspRate;
              return (
                <div key={item.cropId} className="pt-2 first:pt-0 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-km-textPrimary block">{item.cropName}</span>
                    <span className="text-[11px] text-gray-500 font-medium">
                      {item.expectedQuantity.toLocaleString()} kg @ ₹{item.mspRate.toFixed(2)}/kg
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-emerald-950">
                      ₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[10px] text-gray-400 block font-medium">MSP</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-200 bg-emerald-50/60 p-2.5 rounded-xl text-emerald-950">
            <span className="font-bold text-xs">{t('estimated_msp_value')}:</span>
            <span className="font-extrabold text-sm font-mono text-km-primary">
              ₹{totalEstimatedMsp.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Slot Window & Departure Guidance */}
        <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100 flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="text-blue-900 font-bold block text-sm">
              {slot.start_time} - {slot.end_time}
            </span>
            <span className="text-blue-700 font-semibold text-[11px]">
              {t('recommended_departure')}: <strong>{slot.recommended_departure || '09:05 AM'}</strong>
            </span>
          </div>
          <Clock className="w-5 h-5 text-blue-600 shrink-0" />
        </div>

        {/* Total Time Breakdown Banner */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-4 rounded-2xl border border-emerald-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-950 uppercase tracking-wider text-[10px]">
              {t('total_estimated_farmer_time')}
            </span>
            <span className="font-extrabold text-km-primary text-sm">
              ~{totalTime} mins ({Math.floor(totalTime / 60)}h {totalTime % 60}m)
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-100/80 text-center text-[11px]">
            <div>
              <span className="text-gray-500 block text-[10px]">{t('travel_label')}</span>
              <span className="font-bold text-km-textPrimary">{travelTime} min</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">{t('wait_queue_label')}</span>
              <span className="font-bold text-km-textPrimary">{waitingTime} min</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">{t('processing_label')}</span>
              <span className="font-bold text-km-textPrimary">{processingTime} min</span>
            </div>
          </div>
        </div>

        {/* Guarantees */}
        <div className="flex items-center gap-2 text-xs text-km-textSecondary bg-gray-50 p-2.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-km-primary shrink-0" />
          <span>{t('priority_bay_guarantee')}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-3 px-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-km-textPrimary transition-colors"
          >
            {t('cancel_btn')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex-1 py-3 px-4 rounded-2xl bg-km-primary hover:bg-km-primaryDark text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-800/25 transition-all disabled:opacity-50"
          >
            {isConfirming ? (
              <span>{t('reserving_slot')}</span>
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

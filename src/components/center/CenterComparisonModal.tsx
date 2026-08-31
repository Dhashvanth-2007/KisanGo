import React from 'react';
import { Modal } from '../common/Modal';
import { ProcurementCenter } from '../../types';
import { RatingStars } from '../common/RatingStars';
import { Badge } from '../common/Badge';
import { Sparkles, Check, ArrowRight, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface CenterComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  centers: ProcurementCenter[];
  onBookSlot: (center: ProcurementCenter) => void;
}

export const CenterComparisonModal: React.FC<CenterComparisonModalProps> = ({
  isOpen,
  onClose,
  centers,
  onBookSlot
}) => {
  const { t } = useLanguage();

  if (centers.length === 0) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('compare_modal_title')}
      subtitle={`${t('compare_modal_sub')} (${centers.length})`}
      maxWidth="4xl"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="p-3 font-bold text-gray-500 uppercase tracking-wider bg-gray-50/80 sticky left-0 min-w-[140px]">
                {t('criteria')}
              </th>
              {centers.map((center) => (
                <th key={center.id} className="p-3 min-w-[200px] align-top bg-white">
                  <div className="flex flex-col gap-1.5">
                    {center.ai_recommended && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full w-max">
                        <Sparkles className="w-3 h-3 text-amber-600" /> {t('ai_recommended')}
                      </span>
                    )}
                    <h4 className="font-bold text-sm text-km-textPrimary leading-tight">
                      {center.name}
                    </h4>
                    <span className="text-[11px] text-gray-500 font-normal">
                      {center.district}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Status */}
            <tr>
              <td className="p-3 font-semibold text-gray-700 bg-gray-50/50 sticky left-0">{t('status_label')}</td>
              {centers.map((center) => (
                <td key={center.id} className="p-3">
                  <Badge
                    variant={
                      center.status === 'Operating Normally'
                        ? 'success'
                        : center.status === 'High Waiting Time'
                        ? 'danger'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {center.status}
                  </Badge>
                </td>
              ))}
            </tr>

            {/* Distance & Travel Time */}
            <tr>
              <td className="p-3 font-semibold text-gray-700 bg-gray-50/50 sticky left-0">{t('distance')}</td>
              {centers.map((center) => (
                <td key={center.id} className="p-3 font-bold text-km-textPrimary">
                  {center.distance} <span className="text-gray-500 font-normal">({center.travel_time})</span>
                </td>
              ))}
            </tr>

            {/* Current Queue */}
            <tr>
              <td className="p-3 font-semibold text-gray-700 bg-gray-50/50 sticky left-0">{t('current_queue')}</td>
              {centers.map((center) => (
                <td key={center.id} className="p-3 font-bold text-km-textPrimary">
                  {center.queue} {t('vehicles_label')}
                </td>
              ))}
            </tr>

            {/* Estimated Waiting Time */}
            <tr>
              <td className="p-3 font-semibold text-gray-700 bg-gray-50/50 sticky left-0">{t('waiting_time')}</td>
              {centers.map((center) => (
                <td
                  key={center.id}
                  className={`p-3 font-extrabold ${
                    center.waitingTimeMins <= 20
                      ? 'text-emerald-700'
                      : center.waitingTimeMins > 60
                      ? 'text-rose-600'
                      : 'text-amber-700'
                  }`}
                >
                  {center.waiting_time}
                </td>
              ))}
            </tr>

            {/* Available Slots */}
            <tr>
              <td className="p-3 font-semibold text-gray-700 bg-gray-50/50 sticky left-0">{t('available_slots')}</td>
              {centers.map((center) => (
                <td key={center.id} className="p-3 font-bold text-km-primary">
                  {center.available_slots} {t('slots_label')}
                </td>
              ))}
            </tr>

            {/* Farmer Rating */}
            <tr>
              <td className="p-3 font-semibold text-gray-700 bg-gray-50/50 sticky left-0">{t('facilities_rating')}</td>
              {centers.map((center) => (
                <td key={center.id} className="p-3">
                  <RatingStars rating={center.rating} reviewCount={center.review_count} size="sm" />
                </td>
              ))}
            </tr>

            {/* Working Hours */}
            <tr>
              <td className="p-3 font-semibold text-gray-700 bg-gray-50/50 sticky left-0">{t('working_hours_label')}</td>
              {centers.map((center) => (
                <td key={center.id} className="p-3 text-km-textSecondary">
                  {center.working_hours}
                </td>
              ))}
            </tr>

            {/* Key Facilities */}
            <tr>
              <td className="p-3 font-semibold text-gray-700 bg-gray-50/50 sticky left-0">{t('tab_center_facilities')}</td>
              {centers.map((center) => (
                <td key={center.id} className="p-3 text-xs text-km-textSecondary">
                  <ul className="space-y-1">
                    {(center.facilities || []).slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{f}</span>
                      </li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>

            {/* Officer In-Charge */}
            <tr>
              <td className="p-3 font-semibold text-gray-700 bg-gray-50/50 sticky left-0">{t('officer_in_charge')}</td>
              {centers.map((center) => (
                <td key={center.id} className="p-3 text-xs font-medium text-km-textPrimary">
                  {center.officer}
                </td>
              ))}
            </tr>

            {/* Action Row */}
            <tr className="bg-gray-50/70">
              <td className="p-3 font-semibold text-gray-700 sticky left-0">{t('action_label')}</td>
              {centers.map((center) => (
                <td key={center.id} className="p-3">
                  <button
                    onClick={() => {
                      onClose();
                      onBookSlot(center);
                    }}
                    disabled={center.available_slots === 0}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      center.available_slots > 0
                        ? 'bg-km-primary hover:bg-km-primaryDark text-white shadow-sm'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <span>{t('book_slot')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
};

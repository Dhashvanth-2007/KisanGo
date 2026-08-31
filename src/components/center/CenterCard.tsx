import React from 'react';
import { ProcurementCenter } from '../../types';
import { RatingStars } from '../common/RatingStars';
import { Badge } from '../common/Badge';
import { Sparkles, MapPin, Clock, Users, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface CenterCardProps {
  center: ProcurementCenter;
  onViewProfile: (center: ProcurementCenter) => void;
  onBookSlot: (center: ProcurementCenter) => void;
  onCompareToggle?: (center: ProcurementCenter) => void;
  isCompared?: boolean;
}

export const CenterCard: React.FC<CenterCardProps> = ({
  center,
  onViewProfile,
  onBookSlot,
  onCompareToggle,
  isCompared = false
}) => {
  const { t } = useLanguage();

  const isGreen = center.id === 'center-b' || (center.waitingTimeMins <= 20 && center.available_slots > 0);
  const isRed = center.id === 'center-c' || center.waitingTimeMins > 60 || center.available_slots === 0;

  return (
    <div
      className={`group relative bg-white rounded-3xl border transition-all duration-300 overflow-hidden shadow-km-sm hover:shadow-km-md flex flex-col ${
        center.ai_recommended
          ? 'border-2 border-emerald-500 ring-4 ring-emerald-500/10'
          : 'border-gray-200 hover:border-emerald-300'
      }`}
    >
      {/* Top Banner for AI Recommendation */}
      {center.ai_recommended && (
        <div className="bg-gradient-to-r from-amber-500 via-emerald-600 to-emerald-700 text-white px-4 py-1.5 flex items-center justify-between text-xs font-bold shadow-inner">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 fill-amber-300 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
            <span>{t('ai_recommended')} • {t('optimal_choice')}</span>
          </div>
          <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-mono">
            Saves ~45 mins
          </span>
        </div>
      )}

      {/* Image & Header */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-gray-100">
        <img
          src={center.photo}
          alt={center.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Top Badges on Image */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
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

          {onCompareToggle && (
            <label className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-xl text-white text-xs font-semibold cursor-pointer select-none hover:bg-black/70 transition-colors">
              <input
                type="checkbox"
                checked={isCompared}
                onChange={() => onCompareToggle(center)}
                className="w-3.5 h-3.5 rounded text-km-primary focus:ring-emerald-500 accent-km-primary cursor-pointer"
              />
              <span>Compare</span>
            </label>
          )}
        </div>

        {/* Bottom Title on Image */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h3 className="font-extrabold text-base sm:text-lg leading-tight drop-shadow-md">
            {center.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <RatingStars rating={center.rating} reviewCount={center.review_count} size="sm" />
            <span className="text-white/60 text-xs">•</span>
            <span className="text-xs text-white/90 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
              {center.distance} ({center.travel_time})
            </span>
          </div>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* Natural Language AI Reason Explanation */}
        {center.ai_recommendation_reason && (
          <div
            className={`p-3 rounded-2xl text-xs leading-relaxed ${
              center.ai_recommended
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium'
                : center.waitingTimeMins > 60
                ? 'bg-rose-50 border border-rose-200 text-rose-900'
                : 'bg-gray-50 border border-gray-100 text-km-textSecondary'
            }`}
          >
            <p className="flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>{center.ai_recommendation_reason}</span>
            </p>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Current Queue */}
          <div className="bg-gray-50/80 p-2.5 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-center gap-1 text-[11px] text-km-textSecondary mb-0.5">
              <Users className="w-3 h-3 text-emerald-700" />
              <span>{t('current_queue')}</span>
            </div>
            <span className="font-extrabold text-sm sm:text-base text-km-textPrimary">
              {center.queue} <span className="text-[10px] font-normal text-gray-500">Vehicles</span>
            </span>
          </div>

          {/* Waiting Time */}
          <div
            className={`p-2.5 rounded-2xl border ${
              isGreen
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : isRed
                ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                : 'bg-amber-50/70 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-[11px] mb-0.5">
              <Clock className="w-3 h-3" />
              <span>{t('waiting_time')}</span>
            </div>
            <span className="font-extrabold text-sm sm:text-base">
              {center.waiting_time}
            </span>
          </div>

          {/* Available Slots */}
          <div className="bg-gray-50/80 p-2.5 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-center gap-1 text-[11px] text-km-textSecondary mb-0.5">
              <Calendar className="w-3 h-3 text-blue-700" />
              <span>{t('available_slots')}</span>
            </div>
            <span className={`font-extrabold text-sm sm:text-base ${center.available_slots > 0 ? 'text-km-primary' : 'text-rose-600'}`}>
              {center.available_slots} <span className="text-[10px] font-normal text-gray-500">Slots</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => onViewProfile(center)}
            className="flex-1 py-3 px-3 rounded-2xl border border-gray-200 bg-white hover:bg-km-hoverBg text-xs font-bold text-km-textPrimary transition-all duration-200 text-center"
          >
            {t('view_details')}
          </button>
          <button
            onClick={() => onBookSlot(center)}
            disabled={center.available_slots === 0}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all duration-200 ${
              center.available_slots > 0
                ? 'bg-km-primary hover:bg-km-primaryDark text-white shadow-emerald-800/20 active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
            }`}
          >
            <span>{t('book_slot')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

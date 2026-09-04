import React, { useState, useEffect } from 'react';
import { ProcurementCenter, Slot, MasterSlotWindow, Crop, SelectedCropItem } from '../types';
import { CenterDiscoveryMap } from '../components/map/CenterDiscoveryMap';
import { CenterCard } from '../components/center/CenterCard';
import { CenterComparisonModal } from '../components/center/CenterComparisonModal';
import { CenterProfileView } from '../components/center/CenterProfileView';
import { ProcurementBookingWizard } from '../components/booking/ProcurementBookingWizard';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import {
  MapPin,
  List,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  RefreshCw,
  Clock,
  ShieldCheck,
  Wheat,
  Calendar
} from 'lucide-react';

interface FindCenterPageProps {
  centers: ProcurementCenter[];
  onBookingSuccess: () => void;
  onRefreshCenters: () => void;
}

export const FindCenterPage: React.FC<FindCenterPageProps> = ({
  centers,
  onBookingSuccess,
  onRefreshCenters
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [filterMode, setFilterMode] = useState<
    'all' | 'ai' | 'nearest' | 'lowest_wait' | 'highest_rated' | 'most_slots'
  >('all');

  const [selectedCenter, setSelectedCenter] = useState<ProcurementCenter | null>(null);
  const [profileCenter, setProfileCenter] = useState<ProcurementCenter | null>(null);
  const [comparedCenterIds, setComparedCenterIds] = useState<string[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  // Multi-Day Advance Booking Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [bookingCenter, setBookingCenter] = useState<ProcurementCenter | null>(null);

  // AI Center recommendation highlight
  const aiRecommendedCenter = centers.find((c) => c.ai_recommended) || centers[0];

  // Filter centers
  const filteredCenters = [...centers].sort((a, b) => {
    if (filterMode === 'ai') return (b.ai_recommended ? 1 : 0) - (a.ai_recommended ? 1 : 0);
    if (filterMode === 'nearest') return a.distanceKm - b.distanceKm;
    if (filterMode === 'lowest_wait') return a.waitingTimeMins - b.waitingTimeMins;
    if (filterMode === 'highest_rated') return b.rating - a.rating;
    if (filterMode === 'most_slots') return b.available_slots - a.available_slots;
    return 0;
  });

  const handleStartBooking = (center: ProcurementCenter) => {
    setBookingCenter(center);
    setIsWizardOpen(true);
  };

  const handleCompareToggle = (center: ProcurementCenter) => {
    setComparedCenterIds((prev) =>
      prev.includes(center.id) ? prev.filter((id) => id !== center.id) : [...prev, center.id]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5 pb-24">
      {/* Header & Mode Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-km-textPrimary">{t('find_center')}</h1>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              {centers.length} Centers Online
            </span>
          </div>
          <p className="text-xs text-km-textSecondary mt-0.5">
            Compare travel time, real-time queues, available slots & AI recommendations
          </p>
        </div>

        {/* View Toggle & Compare Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Multi-Day Advance Booking Action */}
          <button
            onClick={() => {
              setBookingCenter(null);
              setIsWizardOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Calendar className="w-4 h-4 text-emerald-200" />
            <span>📅 {t('book_slot') || 'Book Advance Slot'}</span>
          </button>

          {/* Comparison Modal Trigger */}
          <button
            onClick={() => setIsComparisonOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-bold text-km-textPrimary shadow-2xs transition-colors"
          >
            <Layers className="w-4 h-4 text-km-primary" />
            <span>{t('compare_centers')}</span>
            {comparedCenterIds.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-km-primary text-white text-[10px] flex items-center justify-center">
                {comparedCenterIds.length}
              </span>
            )}
          </button>

          {/* Map vs List Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'map' ? 'bg-white text-km-primary shadow-xs' : 'text-gray-500 hover:text-km-textPrimary'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{t('map_view')}</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'list' ? 'bg-white text-km-primary shadow-xs' : 'text-gray-500 hover:text-km-textPrimary'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>{t('cards_view')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] pl-1 mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> {t('filters_label')}:
        </span>
        {[
          { id: 'all', label: t('all_filters') },
          { id: 'ai', label: `✨ ${t('ai_recommended')}` },
          { id: 'lowest_wait', label: t('filter_lowest_wait') },
          { id: 'nearest', label: t('filter_nearest') },
          { id: 'highest_rated', label: t('filter_highest_rated') },
          { id: 'most_slots', label: t('filter_most_slots') }
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => setFilterMode(chip.id as any)}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              filterMode === chip.id
                ? 'bg-km-primary text-white shadow-sm'
                : 'bg-white text-km-textPrimary border border-gray-200 hover:bg-km-hoverBg'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* MAP VIEW */}
      {viewMode === 'map' && (
        <div className="space-y-4">
          <CenterDiscoveryMap
            centers={filteredCenters}
            selectedCenter={selectedCenter}
            onSelectCenter={(c) => setSelectedCenter(c)}
            onViewProfile={(c) => setProfileCenter(c)}
            onBookSlot={(c) => handleStartBooking(c)}
            farmerLat={user && 'latitude' in user ? user.latitude : 12.2253}
            farmerLng={user && 'longitude' in user ? user.longitude : 79.0747}
          />
        </div>
      )}

      {/* CARDS LIST VIEW */}
      {viewMode === 'list' && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
        {filteredCenters.map((center) => (
          <CenterCard
            key={center.id}
            center={center}
            onViewProfile={(c) => setProfileCenter(c)}
            onBookSlot={(c) => handleStartBooking(c)}
            onCompareToggle={(c) => handleCompareToggle(c)}
            isCompared={comparedCenterIds.includes(center.id)}
          />
        ))}
      </div>
      )}

      {/* FULL CENTER PROFILE MODAL */}
      <CenterProfileView
        isOpen={!!profileCenter}
        onClose={() => setProfileCenter(null)}
        center={profileCenter}
        onBookSlot={(c) => {
          setProfileCenter(null);
          handleStartBooking(c);
        }}
      />

      {/* SIDE-BY-SIDE COMPARISON MODAL */}
      <CenterComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        centers={
          comparedCenterIds.length > 0
            ? centers.filter((c) => comparedCenterIds.includes(c.id))
            : centers
        }
        onBookSlot={(c) => handleStartBooking(c)}
      />

      {/* ADVANCE 14-DAY PROCUREMENT BOOKING WIZARD */}
      <ProcurementBookingWizard
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setBookingCenter(null);
        }}
        centers={centers}
        initialCenter={bookingCenter}
        onBookingSuccess={() => {
          setIsWizardOpen(false);
          setBookingCenter(null);
          onBookingSuccess();
        }}
      />
    </div>
  );
};

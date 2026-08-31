import React, { useState, useEffect } from 'react';
import { ProcurementCenter, Slot, Crop, SelectedCropItem } from '../types';
import { CenterDiscoveryMap } from '../components/map/CenterDiscoveryMap';
import { CenterCard } from '../components/center/CenterCard';
import { CenterComparisonModal } from '../components/center/CenterComparisonModal';
import { CenterProfileView } from '../components/center/CenterProfileView';
import { CropQuantityForm } from '../components/booking/CropQuantityForm';
import { SlotSelectionGrid } from '../components/booking/SlotSelectionGrid';
import { SlotConfirmationModal } from '../components/booking/SlotConfirmationModal';
import { Modal } from '../components/common/Modal';
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
  Wheat
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

  // Booking Wizard State
  const [bookingCenter, setBookingCenter] = useState<ProcurementCenter | null>(null);
  const [bookingStep, setBookingStep] = useState<'crop_qty' | 'slots'>('crop_qty');
  const [selectedCrops, setSelectedCrops] = useState<SelectedCropItem[]>([]);
  const [centerSlots, setCenterSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

  const totalConsignmentQuantity = selectedCrops.reduce((s, c) => s + (c.expectedQuantity || 0), 0);

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

  const handleStartBooking = async (center: ProcurementCenter) => {
    setBookingCenter(center);
    setBookingStep('crop_qty');

    const defaultCrops = center.crops && center.crops.length > 0 ? center.crops : [
      { id: `crop-${center.id}-1`, name: 'Paddy (Common / நெல்)', center_id: center.id, msp_rate: 23.0, unit: 'kg', processing_rate_mins_per_ton: 12, active: 1 }
    ];

    const firstCrop = defaultCrops[0];
    setSelectedCrops([
      {
        cropId: firstCrop.id,
        cropName: firstCrop.name,
        expectedQuantity: 2000,
        mspRate: firstCrop.msp_rate
      }
    ]);

    // Fetch live slots with processing calculation
    try {
      const res = await api.getCenterSlots(center.id, undefined, 2000);
      if (res.success && res.data.slots) {
        setCenterSlots(res.data.slots);
        const aiSlot = res.data.slots.find((s: Slot) => s.is_ai_recommended);
        setSelectedSlot(aiSlot || res.data.slots[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmBooking = async () => {
    if (!bookingCenter || !selectedSlot || selectedCrops.length === 0) return;

    setIsBookingSubmitting(true);
    try {
      const totalQty = selectedCrops.reduce((sum, c) => sum + (c.expectedQuantity || 0), 0);
      const res = await api.bookSlot({
        farmerId: user?.id || 'farmer-1',
        centerId: bookingCenter.id,
        slotId: selectedSlot.id,
        cropId: selectedCrops[0]?.cropId || 'crop-1',
        expectedQuantity: totalQty,
        crops: selectedCrops,
        lat: user && 'latitude' in user ? user.latitude : 12.2253,
        lng: user && 'longitude' in user ? user.longitude : 79.0747
      });

      if (res.success) {
        showToast(`Slot Confirmed for ${selectedCrops.length} ${selectedCrops.length === 1 ? 'Grain' : 'Grains'}! Digital Token: ${res.data.tokenNumber}`, 'success');
        setIsConfirmationOpen(false);
        setBookingCenter(null);
        onBookingSuccess();
      } else {
        showToast(res.message || 'Failed to book slot', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Booking transaction failed', 'error');
    } finally {
      setIsBookingSubmitting(false);
    }
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
        <div className="flex items-center gap-2">
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
              <span>Map</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'list' ? 'bg-white text-km-primary shadow-xs' : 'text-gray-500 hover:text-km-textPrimary'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] pl-1 mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Filters:
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

      {/* SLOT BOOKING WIZARD MODAL */}
      {bookingCenter && (
        <Modal
          isOpen={!!bookingCenter}
          onClose={() => setBookingCenter(null)}
          title={`Book Slot at ${bookingCenter.name}`}
          subtitle={`Distance: ${bookingCenter.distance} (${bookingCenter.travel_time}) • Queue: ${bookingCenter.queue} vehicles`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Step 1: Crop & Expected Quantity */}
            {bookingStep === 'crop_qty' && (
              <div className="space-y-4">
                <CropQuantityForm
                  crops={
                    bookingCenter.crops && bookingCenter.crops.length > 0
                      ? bookingCenter.crops
                      : [
                          { id: `crop-${bookingCenter.id}-1`, name: 'Paddy (Common / நெல்)', center_id: bookingCenter.id, msp_rate: 23.0, unit: 'kg', processing_rate_mins_per_ton: 12, active: 1 },
                          { id: `crop-${bookingCenter.id}-2`, name: 'Paddy (Grade A / முதல் தரம்)', center_id: bookingCenter.id, msp_rate: 23.2, unit: 'kg', processing_rate_mins_per_ton: 10, active: 1 },
                          { id: `crop-${bookingCenter.id}-3`, name: 'Maize (மக்காச்சோளம்)', center_id: bookingCenter.id, msp_rate: 20.9, unit: 'kg', processing_rate_mins_per_ton: 14, active: 1 },
                          { id: `crop-${bookingCenter.id}-4`, name: 'Groundnut (நிலக்கடலை)', center_id: bookingCenter.id, msp_rate: 63.77, unit: 'kg', processing_rate_mins_per_ton: 15, active: 1 },
                          { id: `crop-${bookingCenter.id}-5`, name: 'Ragi (கேழ்வரகு)', center_id: bookingCenter.id, msp_rate: 42.9, unit: 'kg', processing_rate_mins_per_ton: 12, active: 1 },
                          { id: `crop-${bookingCenter.id}-6`, name: 'Black Gram / Urad (உளுந்து)', center_id: bookingCenter.id, msp_rate: 74.0, unit: 'kg', processing_rate_mins_per_ton: 16, active: 1 }
                        ]
                  }
                  selectedCrops={selectedCrops}
                  onChangeSelectedCrops={(crops) => setSelectedCrops(crops)}
                  estimatedProcessingMins={Math.round(15 + Math.max(0, (totalConsignmentQuantity - 1000) / 1000) * 5)}
                />

                <button
                  type="button"
                  onClick={() => setBookingStep('slots')}
                  disabled={selectedCrops.length === 0}
                  className="w-full py-3.5 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-50"
                >
                  <span>Proceed to Available Time Slots ({selectedCrops.length} {selectedCrops.length === 1 ? 'Grain' : 'Grains'})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 2: Slot Selection */}
            {bookingStep === 'slots' && (
              <div className="space-y-4">
                <SlotSelectionGrid
                  slots={centerSlots}
                  selectedSlotId={selectedSlot?.id || null}
                  onSelectSlot={(slot) => setSelectedSlot(slot)}
                  travelTimeMins={bookingCenter.travelTimeMins}
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingStep('crop_qty')}
                    className="w-1/3 py-3 border border-gray-200 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                  >
                    Back to Crops
                  </button>
                  <button
                    type="button"
                    disabled={!selectedSlot}
                    onClick={() => setIsConfirmationOpen(true)}
                    className="flex-1 py-3.5 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                  >
                    <span>Review & Confirm Booking</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* CONFIRMATION MODAL */}
      <SlotConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        center={bookingCenter}
        slot={selectedSlot}
        selectedCrops={selectedCrops}
        onConfirm={handleConfirmBooking}
        isConfirming={isBookingSubmitting}
      />
    </div>
  );
};

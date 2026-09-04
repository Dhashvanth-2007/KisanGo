import React, { useState, useEffect } from 'react';
import {
  ProcurementCenter,
  Slot,
  MasterSlotWindow,
  SelectedCropItem,
  DateAvailability,
  AiSlotRecommendation,
  Booking
} from '../../types';
import { FarmerCalendarPicker } from './FarmerCalendarPicker';
import { SlotSelectionGrid } from './SlotSelectionGrid';
import { CropQuantityForm } from './CropQuantityForm';
import { Modal } from '../common/Modal';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import {
  Wheat,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Car,
  Hourglass,
  Ticket,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Check
} from 'lucide-react';

interface ProcurementBookingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  centers: ProcurementCenter[];
  initialCenter?: ProcurementCenter | null;
  onBookingSuccess: () => void;
}

export const ProcurementBookingWizard: React.FC<ProcurementBookingWizardProps> = ({
  isOpen,
  onClose,
  centers,
  initialCenter,
  onBookingSuccess
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();

  // 10-step wizard:
  // Step 1: select_crop
  // Step 2: select_date
  // Step 3 & 4: select_centre & view_availability
  // Step 5 & 6: select_time_window & select_sub_slot
  // Step 7: confirm_booking
  // Step 8 & 9 & 10: token_generated & live_tracking
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [selectedCrops, setSelectedCrops] = useState<SelectedCropItem[]>([
    { cropId: 'crop-paddy', cropName: 'Paddy (Common / நெல்)', expectedQuantity: 2000, mspRate: 23.0 }
  ]);

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedCenter, setSelectedCenter] = useState<ProcurementCenter | null>(initialCenter || centers[0] || null);

  const [calendarDates, setCalendarDates] = useState<DateAvailability[]>([]);
  const [procurementCenterOptions, setProcurementCenterOptions] = useState<any[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [masterWindows, setMasterWindows] = useState<MasterSlotWindow[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [aiRecommendation, setAiRecommendation] = useState<AiSlotRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Confirmation State (Step 8, 9, 10)
  const [confirmedBookingData, setConfirmedBookingData] = useState<any | null>(null);

  // Initialize center when opened
  useEffect(() => {
    if (initialCenter) {
      setSelectedCenter(initialCenter);
    } else if (centers.length > 0 && !selectedCenter) {
      setSelectedCenter(centers[0]);
    }
  }, [initialCenter, centers]);

  // Fetch 14-day calendar for current selected center
  useEffect(() => {
    if (!selectedCenter || !isOpen) return;

    let isMounted = true;
    const fetchCalendar = async () => {
      try {
        const res = await api.getCenterCalendar(selectedCenter.id, 14);
        if (res.success && isMounted) {
          setCalendarDates(res.data.calendar || []);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchCalendar();
    return () => {
      isMounted = false;
    };
  }, [selectedCenter, isOpen]);

  // Fetch procurement centre options for selected date & crops
  useEffect(() => {
    if (!isOpen || !selectedDate) return;

    let isMounted = true;
    const fetchCenterOptions = async () => {
      try {
        const primaryCropId = selectedCrops[0]?.cropId || '';
        const totalQty = selectedCrops.reduce((s, c) => s + (c.expectedQuantity || 0), 0);
        const res = await api.getProcurementOptions(primaryCropId, selectedDate, totalQty);
        if (res.success && res.data && isMounted) {
          setProcurementCenterOptions(res.data.centers || []);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchCenterOptions();
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedDate, selectedCrops]);

  // Fetch slots whenever center or date changes
  useEffect(() => {
    if (!selectedCenter || !selectedDate || !isOpen) return;

    let isMounted = true;
    const fetchSlots = async () => {
      setIsLoading(true);
      try {
        const totalQty = selectedCrops.reduce((s, c) => s + (c.expectedQuantity || 0), 0);
        const res = await api.getCenterSlots(selectedCenter.id, selectedDate, totalQty);
        if (res.success && res.data && isMounted) {
          setSlots(res.data.slots || []);
          setMasterWindows(res.data.masterWindows || []);

          const aiSlot = res.data.slots?.find((s: Slot) => s.is_ai_recommended);
          const firstAvail = res.data.slots?.find((s: Slot) => s.status === 'Available' && (s.remaining_capacity ?? 1) > 0);
          setSelectedSlot(aiSlot || firstAvail || res.data.slots?.[0] || null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedCenter, selectedDate, selectedCrops, isOpen]);

  // Fetch AI smart recommendation
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchAiRec = async () => {
      try {
        const totalQty = selectedCrops.reduce((s, c) => s + (c.expectedQuantity || 0), 0);
        const res = await api.getAiRecommendedDateAndSlot({
          cropId: selectedCrops[0]?.cropId,
          quantity: totalQty
        });
        if (res.success && res.data && isMounted) {
          setAiRecommendation(res.data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchAiRec();
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedCrops]);

  const totalQuantityKg = selectedCrops.reduce((s, c) => s + (c.expectedQuantity || 0), 0);
  const totalEstimatedValue = selectedCrops.reduce((s, c) => s + (c.expectedQuantity || 0) * (c.mspRate || 0), 0);

  // Total journey time calculation
  const travelTime = selectedCenter?.travelTimeMins || 20;
  const waitingTime = selectedCenter?.waitingTimeMins || 15;
  const processingMins = Math.round(15 + Math.max(0, (totalQuantityKg - 1000) / 1000) * 5);
  const totalJourneyTimeMins = travelTime + waitingTime + processingMins;

  const handleApplyAiRecommendation = () => {
    if (!aiRecommendation) return;

    setSelectedDate(aiRecommendation.recommendedDate);
    const matchedCenter = centers.find((c) => c.id === aiRecommendation.recommendedCenterId);
    if (matchedCenter) setSelectedCenter(matchedCenter);

    showToast(`AI Recommended: ${aiRecommendation.recommendedDateFormatted} at ${aiRecommendation.recommendedCenterName}`, 'info');
    setCurrentStep(3); // Jump to time window
  };

  const handleConfirmBooking = async () => {
    if (!selectedCenter || !selectedSlot || selectedCrops.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await api.bookSlot({
        farmerId: user?.id || 'farmer-1',
        centerId: selectedCenter.id,
        slotId: selectedSlot.id,
        cropId: selectedCrops[0].cropId,
        expectedQuantity: totalQuantityKg,
        crops: selectedCrops,
        date: selectedDate
      });

      if (res.success && res.data) {
        setConfirmedBookingData(res.data);
        setCurrentStep(5); // Show success & token screen
        showToast('Procurement slot successfully booked!', 'success');
        onBookingSuccess();
      } else {
        showToast(res.message || 'Booking could not be confirmed', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error occurred while booking', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepLabels = [
    { num: 1, title: 'Crop & Qty' },
    { num: 2, title: 'Procurement Date' },
    { num: 3, title: 'Choose Centre' },
    { num: 4, title: '15-Min Slot' },
    { num: 5, title: 'Token & Queue' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-km-primaryDark via-km-primary to-emerald-700 text-white p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-xs">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black">Multi-Day Advance Slot Booking</h2>
              <p className="text-xs text-emerald-100">
                10-Step Procurement Scheduling • 14-Day Advance Calendar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="bg-emerald-50/70 border-b border-emerald-100 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {stepLabels.map((s, idx) => {
              const isPassed = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <div key={s.num} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      isPassed
                        ? 'bg-km-primary text-white'
                        : isCurrent
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-200'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isPassed ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span
                    className={`hidden md:inline text-xs font-bold ${
                      isCurrent ? 'text-km-primary font-black' : isPassed ? 'text-gray-700' : 'text-gray-400'
                    }`}
                  >
                    {s.title}
                  </span>
                  {idx < stepLabels.length - 1 && (
                    <div className="hidden sm:block w-6 md:w-12 h-0.5 bg-gray-200 mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Total Time Recommendation Banner */}
        {aiRecommendation && currentStep < 5 && (
          <div className="mx-4 sm:mx-6 mt-4 p-3.5 bg-gradient-to-r from-amber-50 to-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                  AI Recommended Date & Slot
                </span>
                <p className="text-xs font-bold text-km-textPrimary mt-0.5">
                  {aiRecommendation.recommendedDateFormatted} ({aiRecommendation.recommendedDay}) • {aiRecommendation.recommendedCenterName} • {aiRecommendation.recommendedTime}
                </p>
                <p className="text-[11px] text-gray-600">{aiRecommendation.reason}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyAiRecommendation}
              className="px-4 py-2 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 cursor-pointer self-start sm:self-center"
            >
              1-Click Pick AI Slot
            </button>
          </div>
        )}

        {/* Modal Body: Steps */}
        <div className="p-4 sm:p-6 max-h-[62vh] overflow-y-auto space-y-6">
          {/* STEP 1: SELECT CROP & ESTIMATED QUANTITY */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <CropQuantityForm
                crops={selectedCenter?.crops && selectedCenter.crops.length > 0 ? selectedCenter.crops : [
                  { id: 'crop-paddy', name: 'Paddy (Common / நெல்)', center_id: 'c1', msp_rate: 23.0, unit: 'kg', processing_rate_mins_per_ton: 12, active: 1 },
                  { id: 'crop-cotton', name: 'Cotton (பருத்தி)', center_id: 'c1', msp_rate: 71.0, unit: 'kg', processing_rate_mins_per_ton: 18, active: 1 },
                  { id: 'crop-maize', name: 'Maize (மக்காச்சோளம்)', center_id: 'c1', msp_rate: 20.9, unit: 'kg', processing_rate_mins_per_ton: 10, active: 1 },
                  { id: 'crop-ragi', name: 'Ragi (கேழ்வரகு)', center_id: 'c1', msp_rate: 38.5, unit: 'kg', processing_rate_mins_per_ton: 15, active: 1 }
                ]}
                selectedCrops={selectedCrops}
                onChangeSelectedCrops={setSelectedCrops}
                estimatedProcessingMins={Math.round(15 + Math.max(0, (totalQuantityKg - 1000) / 1000) * 5)}
              />
            </div>
          )}

          {/* STEP 2: SELECT FUTURE PROCUREMENT DATE (14-DAY HORIZON) */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <FarmerCalendarPicker
                dates={calendarDates}
                selectedDate={selectedDate}
                onSelectDate={(d) => setSelectedDate(d)}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* STEP 3: SELECT PROCUREMENT CENTRE & VIEW AVAILABILITY */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-km-textPrimary">
                    Select Suitable Procurement Centre ({selectedDate})
                  </h3>
                  <p className="text-xs text-km-textSecondary">
                    Centres accepting your crops with live capacity on {selectedDate}
                  </p>
                </div>
                <span className="text-xs font-bold text-km-primary bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
                  {procurementCenterOptions.length || centers.length} Available
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(procurementCenterOptions.length > 0 ? procurementCenterOptions : centers).map((c: any) => {
                  const isSelected = selectedCenter?.id === c.id;
                  const isAiBest = c.is_ai_recommended;

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        const matched = centers.find((cen) => cen.id === c.id) || c;
                        setSelectedCenter(matched);
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/30 shadow-sm'
                          : 'border-gray-200 hover:border-emerald-200 bg-white'
                      }`}
                    >
                      {isAiBest && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                          <Sparkles className="w-3 h-3" />
                          <span>AI Best Total Time</span>
                        </div>
                      )}

                      <div className="pr-16">
                        <h4 className="font-bold text-sm text-km-textPrimary">{c.name}</h4>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span>{c.address}</span>
                        </p>
                      </div>

                      {/* Distance, Travel, Waiting, Capacity Breakdown */}
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100 text-xs">
                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">Distance</span>
                          <span className="font-bold text-km-textPrimary">{c.distanceKm || c.distance} km</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">Travel Time</span>
                          <span className="font-bold text-blue-700">~{c.travelTimeMins || 20}m</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-medium">Open Slots</span>
                          <span className="font-bold text-emerald-800">{c.remainingSlots || c.available_slots || 42}</span>
                        </div>
                      </div>

                      <div className="mt-2 text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-1 rounded-lg inline-block">
                        Total Journey: ~{(c.travelTimeMins || 20) + (c.waitingTimeMins || 15) + processingMins} mins (Travel + Queue + Processing)
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: 1-HOUR MASTER WINDOWS & 15-MINUTE SUB-SLOTS */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <SlotSelectionGrid
                slots={slots}
                masterWindows={masterWindows}
                selectedSlotId={selectedSlot?.id || null}
                onSelectSlot={(s) => setSelectedSlot(s)}
                travelTimeMins={travelTime}
                centerName={selectedCenter?.name}
              />

              {/* Booking Confirmation Summary Card */}
              {selectedSlot && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                      Procurement Booking Summary
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      {selectedDate} ({selectedSlot.start_time} - {selectedSlot.end_time})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500 block text-[10px]">Farmer</span>
                      <span className="font-bold text-km-textPrimary">{user?.name || 'Registered Farmer'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Centre</span>
                      <span className="font-bold text-km-textPrimary truncate block">{selectedCenter?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Crops & Quantity</span>
                      <span className="font-bold text-km-textPrimary">{totalQuantityKg.toLocaleString()} kg</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Total Journey Time</span>
                      <span className="font-black text-emerald-800">{totalJourneyTimeMins} mins</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: TOKEN GENERATED & LIVE TRACKING */}
          {currentStep === 5 && confirmedBookingData && (
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-km-primary flex items-center justify-center mx-auto shadow-md shadow-emerald-800/10">
                <CheckCircle2 className="w-10 h-10 text-km-primary" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  Slot Confirmed & Digital Token Issued
                </span>
                <h3 className="text-2xl font-black text-km-textPrimary">
                  {confirmedBookingData.tokenNumber}
                </h3>
                <p className="text-xs text-km-textSecondary">
                  Booking ID: <strong>{confirmedBookingData.bookingId}</strong>
                </p>
              </div>

              {/* Appointment Card */}
              <div className="max-w-md mx-auto bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Procurement Date:</span>
                  <span className="font-bold text-km-textPrimary">{confirmedBookingData.dateFormatted} ({confirmedBookingData.dayName})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Booked Slot:</span>
                  <span className="font-bold text-km-textPrimary font-mono">{confirmedBookingData.slotTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Centre:</span>
                  <span className="font-bold text-km-textPrimary">{confirmedBookingData.centerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Departure Guidance:</span>
                  <span className="font-bold text-blue-700 font-mono">Leave by {confirmedBookingData.recommendedDepartureTime}</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                  <span className="text-gray-500">Queue Position:</span>
                  <span className="font-black text-emerald-800">#{confirmedBookingData.queuePosition}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                📱 Confirmation notification sent. You can track countdown and queue position in your KisanGo dashboard under <strong>My Slot</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Modal Bottom Navigation */}
        <div className="border-t border-gray-100 p-4 sm:p-6 bg-gray-50 flex items-center justify-between">
          {currentStep > 1 && currentStep < 5 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold shadow-md shadow-emerald-800/20 transition-all cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : currentStep === 4 ? (
              <button
                type="button"
                disabled={isSubmitting || !selectedSlot}
                onClick={handleConfirmBooking}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold shadow-lg shadow-emerald-800/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>{isSubmitting ? 'Securing Slot...' : 'Confirm & Generate Token'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-2xl bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold transition-all cursor-pointer"
              >
                Go to My Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

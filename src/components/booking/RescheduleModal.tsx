import React, { useState, useEffect } from 'react';
import { Booking, ProcurementCenter, Slot, MasterSlotWindow, DateAvailability } from '../../types';
import { Modal } from '../common/Modal';
import { FarmerCalendarPicker } from './FarmerCalendarPicker';
import { SlotSelectionGrid } from './SlotSelectionGrid';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import {
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Building2,
  CheckCircle2
} from 'lucide-react';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  centers: ProcurementCenter[];
  onRescheduled: () => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  booking,
  centers,
  onRescheduled
}) => {
  const { showToast } = useToast();

  const [rescheduleMode, setRescheduleMode] = useState<'same_center_time' | 'same_center_date' | 'diff_center_same_date' | 'diff_center_diff_date'>('same_center_time');
  const [selectedCenterId, setSelectedCenterId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [calendarDates, setCalendarDates] = useState<DateAvailability[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [masterWindows, setMasterWindows] = useState<MasterSlotWindow[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize from existing booking
  useEffect(() => {
    if (booking) {
      setSelectedCenterId(booking.center_id);
      setSelectedDate(booking.date || new Date().toISOString().split('T')[0]);
      setRescheduleMode('same_center_time');
    }
  }, [booking]);

  // Fetch calendar for selected center
  useEffect(() => {
    if (!selectedCenterId || !isOpen) return;

    let isMounted = true;
    const fetchCalendar = async () => {
      try {
        const res = await api.getCenterCalendar(selectedCenterId, 14);
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
  }, [selectedCenterId, isOpen]);

  // Fetch slots when center or date changes
  useEffect(() => {
    if (!selectedCenterId || !selectedDate || !isOpen) return;

    let isMounted = true;
    const fetchSlots = async () => {
      setIsLoading(true);
      try {
        const res = await api.getCenterSlots(selectedCenterId, selectedDate);
        if (res.success && res.data && isMounted) {
          setSlots(res.data.slots || []);
          setMasterWindows(res.data.masterWindows || []);

          // Auto-select first available slot if not selected
          const firstAvail = res.data.slots?.find((s: Slot) => s.status === 'Available' && (s.remaining_capacity ?? 1) > 0);
          setSelectedSlot(firstAvail || null);
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
  }, [selectedCenterId, selectedDate, isOpen]);

  if (!booking) return null;

  const currentCenter = centers.find((c) => c.id === booking.center_id);
  const targetCenter = centers.find((c) => c.id === selectedCenterId) || currentCenter;

  const handleConfirmReschedule = async () => {
    if (!selectedSlot) {
      showToast('Please select a new time slot', 'warning');
      return;
    }

    if (selectedSlot.id === booking.slot_id && selectedCenterId === booking.center_id && selectedDate === booking.date) {
      showToast('You have selected the same slot. Please select a different date or time.', 'info');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.rescheduleBooking(booking.id, {
        newCenterId: selectedCenterId,
        newSlotId: selectedSlot.id,
        newDate: selectedDate
      });

      if (res.success) {
        showToast('Procurement slot successfully rescheduled!', 'success');
        onRescheduled();
        onClose();
      } else {
        showToast(res.message || 'Failed to reschedule booking', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Error occurred while rescheduling', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reschedule Procurement Appointment" maxWidth="3xl">
      <div className="space-y-6">
        {/* Current Booking Summary */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">Current Booking</span>
            <h4 className="font-bold text-km-textPrimary text-sm mt-0.5">{booking.center_name || currentCenter?.name}</h4>
            <p className="text-gray-600">
              📅 {booking.date || 'Today'} • ⏰ {booking.slot_start} - {booking.slot_end}
            </p>
          </div>
          <div className="text-right sm:text-right">
            <span className="text-[10px] font-bold text-gray-500 block">Token Number</span>
            <span className="font-mono text-base font-black text-km-primary">{booking.token_number}</span>
          </div>
        </div>

        {/* 4 Rescheduling Alternatives */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-km-textPrimary">Choose Reschedule Option:</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'same_center_time', label: 'Same Centre, New Time', desc: 'Keep centre & date' },
              { id: 'same_center_date', label: 'Same Centre, New Date', desc: 'Change day/date' },
              { id: 'diff_center_same_date', label: 'New Centre, Same Date', desc: 'Choose nearby centre' },
              { id: 'diff_center_diff_date', label: 'New Centre, New Date', desc: 'Full flexibility' }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setRescheduleMode(opt.id as any);
                  if (opt.id === 'same_center_time' || opt.id === 'same_center_date') {
                    setSelectedCenterId(booking.center_id);
                  }
                  if (opt.id === 'same_center_time' || opt.id === 'diff_center_same_date') {
                    setSelectedDate(booking.date || new Date().toISOString().split('T')[0]);
                  }
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  rescheduleMode === opt.id
                    ? 'border-emerald-600 bg-emerald-50/80 ring-1 ring-emerald-600'
                    : 'border-gray-200 hover:border-emerald-200 bg-white'
                }`}
              >
                <span className="text-xs font-bold block text-km-textPrimary leading-tight">{opt.label}</span>
                <span className="text-[10px] text-gray-500 block mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center Selector (if different centre mode) */}
        {(rescheduleMode === 'diff_center_same_date' || rescheduleMode === 'diff_center_diff_date') && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-km-textPrimary">Select Alternative Procurement Centre:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {centers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCenterId(c.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedCenterId === c.id
                      ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-km-textPrimary">{c.name}</span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {c.distanceKm} km
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 block mt-1">
                    🚗 ~{c.travelTimeMins} mins travel • ⏳ ~{c.waitingTimeMins} mins wait
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 14-Day Calendar (if different date mode) */}
        {(rescheduleMode === 'same_center_date' || rescheduleMode === 'diff_center_diff_date') && (
          <FarmerCalendarPicker
            dates={calendarDates}
            selectedDate={selectedDate}
            onSelectDate={(d) => setSelectedDate(d)}
            isLoading={isLoading}
          />
        )}

        {/* Slots Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-km-textPrimary">
              Available 1-Hour Windows & 15-Minute Sub-Slots ({selectedDate}):
            </label>
            {isLoading && <span className="text-[10px] text-km-primary font-bold animate-pulse">Loading live slots...</span>}
          </div>

          <SlotSelectionGrid
            slots={slots}
            masterWindows={masterWindows}
            selectedSlotId={selectedSlot?.id || null}
            onSelectSlot={(s) => setSelectedSlot(s)}
            travelTimeMins={targetCenter?.travelTimeMins || 20}
            centerName={targetCenter?.name}
          />
        </div>

        {/* Reschedule Confirmation Action */}
        <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {selectedSlot ? (
              <span>
                New Slot: <strong>{selectedSlot.start_time} - {selectedSlot.end_time}</strong> on <strong>{selectedDate}</strong> at <strong>{targetCenter?.name}</strong>
              </span>
            ) : (
              <span>Please choose an available 15-minute slot.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Keep Current Slot
            </button>
            <button
              type="button"
              disabled={isSubmitting || !selectedSlot}
              onClick={handleConfirmReschedule}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-2xl bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold shadow-md shadow-emerald-800/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>{isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

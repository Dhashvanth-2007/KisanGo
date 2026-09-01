import React, { useState, useEffect } from 'react';
import { Officer, Slot, MasterSlotWindow, SlotSummary, ScheduleConfig } from '../../types';
import {
  Calendar,
  Clock,
  Lock,
  Unlock,
  Plus,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Users,
  ShieldCheck,
  Ban,
  Layers,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

interface OfficerSlotManagementProps {
  officer: Officer;
  centerId: string;
}

export const OfficerSlotManagement: React.FC<OfficerSlotManagementProps> = ({
  officer,
  centerId
}) => {
  const { showToast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [isLoading, setIsLoading] = useState(false);
  const [slotData, setSlotData] = useState<{
    summary: SlotSummary;
    scheduleConfig: ScheduleConfig;
    masterWindows: MasterSlotWindow[];
    slots: Slot[];
  } | null>(null);

  // Reserve Modal State
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [targetSlot, setTargetSlot] = useState<Slot | null>(null);
  const [reservationReason, setReservationReason] = useState<string>('Centre Maintenance');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);

  // Schedule Config Modal State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configOpeningTime, setConfigOpeningTime] = useState<string>('09:00 AM');
  const [configClosingTime, setConfigClosingTime] = useState<string>('05:00 PM');
  const [configBreakStart, setConfigBreakStart] = useState<string>('01:00 PM');
  const [configBreakEnd, setConfigBreakEnd] = useState<string>('02:00 PM');
  const [configFarmersPerSubSlot, setConfigFarmersPerSubSlot] = useState<number>(2);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const fetchSlotSummary = async () => {
    setIsLoading(true);
    try {
      const res = await api.getOfficerSlotSummary(centerId, selectedDate);
      if (res.success && res.data) {
        setSlotData(res.data);
        if (res.data.scheduleConfig) {
          setConfigOpeningTime(res.data.scheduleConfig.opening_time || '09:00 AM');
          setConfigClosingTime(res.data.scheduleConfig.closing_time || '05:00 PM');
          setConfigBreakStart(res.data.scheduleConfig.break_start || '01:00 PM');
          setConfigBreakEnd(res.data.scheduleConfig.break_end || '02:00 PM');
          setConfigFarmersPerSubSlot(res.data.scheduleConfig.farmers_per_sub_slot || 2);
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load slot summary', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlotSummary();
  }, [centerId, selectedDate]);

  const handleOpenReserveModal = (slot: Slot) => {
    setTargetSlot(slot);
    setReservationReason('Centre Maintenance');
    setCustomReason('');
    setIsReserveModalOpen(true);
  };

  const handleConfirmReservation = async () => {
    if (!targetSlot) return;
    setIsSubmittingReservation(true);
    const finalReason = reservationReason === 'Other' ? customReason || 'Other Requirement' : reservationReason;

    try {
      const res = await api.reserveSlots({
        centerId,
        slotIds: [targetSlot.id],
        reason: finalReason,
        officerName: officer?.name || 'Authorized Officer'
      });

      if (res.success) {
        showToast(`Sub-slot ${targetSlot.start_time} reserved for ${finalReason}`, 'success');
        setIsReserveModalOpen(false);
        setTargetSlot(null);
        fetchSlotSummary();
      } else {
        showToast(res.message || 'Failed to reserve slot', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error executing reservation', 'error');
    } finally {
      setIsSubmittingReservation(false);
    }
  };

  const handleReleaseReservation = async (slot: Slot) => {
    if (!confirm(`Are you sure you want to release the reservation for sub-slot ${slot.start_time} - ${slot.end_time}?`)) {
      return;
    }

    try {
      const res = await api.releaseReservedSlots({
        centerId,
        slotIds: [slot.id]
      });

      if (res.success) {
        showToast(`Sub-slot ${slot.start_time} released back to Available!`, 'success');
        fetchSlotSummary();
      } else {
        showToast(res.message || 'Failed to release slot', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error releasing reservation', 'error');
    }
  };

  const handleToggleSlotStatus = async (slot: Slot) => {
    const nextStatus = slot.status === 'Closed' ? 'Available' : 'Closed';
    try {
      const res = await api.toggleSlotStatus({
        centerId,
        slotId: slot.id,
        status: nextStatus
      });

      if (res.success) {
        showToast(`Sub-slot ${slot.start_time} is now ${nextStatus}`, 'success');
        fetchSlotSummary();
      } else {
        showToast(res.message || 'Failed to toggle status', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error toggling slot', 'error');
    }
  };

  const handleSaveScheduleConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await api.updateScheduleConfig({
        centerId,
        openingTime: configOpeningTime,
        closingTime: configClosingTime,
        breakStart: configBreakStart,
        breakEnd: configBreakEnd,
        farmersPerSubSlot: Number(configFarmersPerSubSlot)
      });

      if (res.success) {
        showToast('Schedule & capacity configuration updated successfully!', 'success');
        setIsConfigModalOpen(false);
        fetchSlotSummary();
      } else {
        showToast(res.message || 'Failed to update schedule config', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating schedule', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const summary = slotData?.summary || {
    total_slots: 28,
    booked_slots: 0,
    reserved_slots: 0,
    available_slots: 28,
    total_capacity: 56,
    booked_capacity: 0,
    reserved_capacity: 0,
    remaining_capacity: 56,
    farmers_per_sub_slot: 2,
    max_hourly_capacity: 8
  };

  const masterWindows = slotData?.masterWindows || [];

  return (
    <div className="space-y-6">
      {/* Header & Date / Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-gray-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-km-textPrimary flex items-center gap-2">
            <Layers className="w-5 h-5 text-km-primary" />
            <span>1-Hour Smart Slot & Schedule Management</span>
          </h2>
          <p className="text-xs text-km-textSecondary mt-0.5">
            Configure 1-hour windows (4 × 15-min sub-slots), reserve maintenance windows, and manage bay capacity
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-2xl text-xs font-bold">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-km-textPrimary font-bold outline-none cursor-pointer text-xs"
            />
          </div>

          {/* Schedule Config Button */}
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-2xl text-xs font-bold transition-colors"
          >
            <Sliders className="w-4 h-4 text-emerald-700" />
            <span>Schedule Config</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchSlotSummary}
            disabled={isLoading}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-colors disabled:opacity-50"
            title="Refresh Slots"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Slot Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Slots */}
        <div className="bg-white p-4 rounded-3xl border border-gray-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">
            Total 15-Min Slots
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-km-textPrimary font-mono">
              {summary.total_slots}
            </span>
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {masterWindows.length} Hours
            </span>
          </div>
          <p className="text-[11px] text-gray-500">4 sub-slots per hour</p>
        </div>

        {/* Booked Slots */}
        <div className="bg-white p-4 rounded-3xl border border-emerald-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
            Booked by Farmers
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-900 font-mono">
              {summary.booked_slots}
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              {summary.booked_capacity} Farmers
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium">Confirmed farmer tokens</p>
        </div>

        {/* Reserved Slots */}
        <div className="bg-white p-4 rounded-3xl border border-amber-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 block">
            Reserved / Blocked
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-amber-900 font-mono">
              {summary.reserved_slots}
            </span>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              Officer Lock
            </span>
          </div>
          <p className="text-[11px] text-amber-700 font-medium">Maintenance & Official</p>
        </div>

        {/* Available Slots */}
        <div className="bg-white p-4 rounded-3xl border border-blue-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
            Available Slots
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-blue-950 font-mono">
              {summary.available_slots}
            </span>
            <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
              {summary.remaining_capacity} Cap
            </span>
          </div>
          <p className="text-[11px] text-blue-700 font-medium">Open for public booking</p>
        </div>
      </div>

      {/* Capacity & Throughput Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white p-5 rounded-3xl shadow-km-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-800/80 px-2.5 py-0.5 rounded-full text-emerald-200">
            <Users className="w-3 h-3" /> Dynamic Capacity Control
          </div>
          <h3 className="text-base font-black">
            Bay Throughput: {summary.farmers_per_sub_slot || 2} Farmers per 15 Mins ({summary.max_hourly_capacity || 8} Farmers/Hour)
          </h3>
          <p className="text-xs text-emerald-200/80">
            Current Day Total Capacity: {summary.total_capacity} farmers ({summary.booked_capacity} Booked, {summary.reserved_capacity} Reserved, {summary.remaining_capacity} Remaining)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs rounded-2xl shadow-sm transition-all"
          >
            Adjust Farmers Per Sub-Slot
          </button>
        </div>
      </div>

      {/* Daily Master 1-Hour Windows Calendar Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-km-textPrimary flex items-center gap-2">
            <Clock className="w-4 h-4 text-km-primary" />
            <span>Master 1-Hour Schedule ({selectedDate})</span>
          </h3>
          <span className="text-xs text-gray-500 font-medium">
            Click on any 15-minute sub-slot to Reserve, Release, or Close
          </span>
        </div>

        <div className="space-y-4">
          {masterWindows.map((mw, wIdx) => {
            return (
              <div
                key={mw.master_window || `mw-${wIdx}`}
                className="bg-white rounded-3xl border border-gray-200/80 p-4 sm:p-5 shadow-2xs space-y-3"
              >
                {/* 1-Hour Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-900 font-black text-xs flex items-center justify-center">
                      {wIdx + 1}
                    </span>
                    <span className="font-black text-sm text-km-textPrimary">{mw.master_window}</span>
                    <span className="text-xs text-gray-400 font-medium">
                      ({mw.available_sub_slots_count} of 4 Available)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {mw.status === 'Full' && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-extrabold text-[10px] rounded-full uppercase">
                        Full
                      </span>
                    )}
                    {mw.status === 'Reserved' && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-extrabold text-[10px] rounded-full uppercase">
                        Reserved
                      </span>
                    )}
                    {mw.status === 'Available' && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full uppercase">
                        Open
                      </span>
                    )}
                  </div>
                </div>

                {/* 4x 15-Minute Sub-Slots */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {mw.sub_slots.map((subSlot) => {
                    const remaining = Math.max(0, subSlot.capacity - subSlot.booked_count);
                    const isBooked = subSlot.status === 'Booked' || remaining <= 0;
                    const isReserved = subSlot.status === 'Reserved';
                    const isClosed = subSlot.status === 'Closed';

                    return (
                      <div
                        key={subSlot.id}
                        className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2 transition-all ${
                          isReserved
                            ? 'bg-amber-50/80 border-amber-300'
                            : isBooked
                            ? 'bg-emerald-50/60 border-emerald-300'
                            : isClosed
                            ? 'bg-gray-100 border-gray-300 opacity-70'
                            : 'bg-white border-gray-200 hover:border-emerald-300 shadow-2xs'
                        }`}
                      >
                        {/* Top Time & Status */}
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <span className="font-black text-xs sm:text-sm text-km-textPrimary block">
                              {subSlot.start_time} - {subSlot.end_time}
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">
                              Cap: {subSlot.booked_count} / {subSlot.capacity}
                            </span>
                          </div>

                          <div>
                            {isReserved ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-200/80 text-amber-900 text-[9px] font-extrabold rounded-md uppercase">
                                <Lock className="w-2.5 h-2.5" /> Reserved
                              </span>
                            ) : isBooked ? (
                              <span className="px-1.5 py-0.5 bg-emerald-200/80 text-emerald-950 text-[9px] font-extrabold rounded-md uppercase">
                                Booked
                              </span>
                            ) : isClosed ? (
                              <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-[9px] font-extrabold rounded-md uppercase">
                                Closed
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-900 text-[9px] font-extrabold rounded-md uppercase">
                                Available
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Reservation Reason if any */}
                        {isReserved && subSlot.reserved_reason && (
                          <div className="bg-amber-100/70 p-1.5 rounded-lg text-[10px] text-amber-900 font-medium leading-tight">
                            <strong>Reason:</strong> {subSlot.reserved_reason}
                            {subSlot.reserved_by && (
                              <span className="block text-[9px] text-amber-800/80">By: {subSlot.reserved_by}</span>
                            )}
                          </div>
                        )}

                        {/* Officer Actions */}
                        <div className="pt-2 border-t border-gray-200/60 flex items-center gap-1 text-[10px] font-bold">
                          {isReserved ? (
                            <button
                              type="button"
                              onClick={() => handleReleaseReservation(subSlot)}
                              className="flex-1 py-1 px-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg flex items-center justify-center gap-1 transition-colors"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Release</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenReserveModal(subSlot)}
                              className="flex-1 py-1 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg flex items-center justify-center gap-1 transition-colors"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Reserve</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleSlotStatus(subSlot)}
                            className="p-1 px-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg transition-colors"
                            title={isClosed ? 'Open Slot' : 'Close Slot'}
                          >
                            {isClosed ? 'Open' : 'Close'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RESERVE SLOT MODAL */}
      {targetSlot && (
        <Modal
          isOpen={isReserveModalOpen}
          onClose={() => {
            setIsReserveModalOpen(false);
            setTargetSlot(null);
          }}
          title="Reserve 15-Minute Sub-Slot"
          subtitle={`Block slot capacity for center operations (${targetSlot.start_time} - ${targetSlot.end_time})`}
          maxWidth="md"
        >
          <div className="space-y-4">
            {/* Slot Info Badge */}
            <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 uppercase tracking-wider text-[10px]">
                  Target Sub-Slot
                </span>
                <span className="font-bold text-amber-800">{selectedDate}</span>
              </div>
              <p className="font-black text-sm text-amber-950">
                {targetSlot.start_time} - {targetSlot.end_time} ({targetSlot.master_window || '1-Hour Window'})
              </p>
              <p className="text-[11px] text-amber-800">
                Reserving this slot will disable farmer bookings and display "Reserved by Centre".
              </p>
            </div>

            {/* Reason Selection */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-km-textPrimary block">
                Select Reservation Reason:
              </label>
              <select
                value={reservationReason}
                onChange={(e) => setReservationReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-bold text-xs text-km-textPrimary outline-none focus:border-km-primary"
              >
                <option value="Centre Maintenance">Centre Maintenance (Weighbridge / Equipment Calibration)</option>
                <option value="Official Requirement">Official Requirement (Government Inspection / VIP Visit)</option>
                <option value="Emergency">Emergency (Power Outage / Technical Glitch)</option>
                <option value="Break">Official Staff Break / Lunch</option>
                <option value="Staff Requirement">Staff Requirement (Shift Handover / Bag Supply)</option>
                <option value="Capacity Control">Capacity Control (Yard Space Management)</option>
                <option value="Other">Other Custom Reason</option>
              </select>
            </div>

            {reservationReason === 'Other' && (
              <div className="space-y-1 text-xs">
                <label className="font-bold text-km-textPrimary block">Custom Reason Description:</label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="e.g. Weighbridge load sensor replacement"
                  className="w-full p-2.5 rounded-xl border border-gray-300 font-medium text-xs text-km-textPrimary outline-none focus:border-km-primary"
                />
              </div>
            )}

            {/* Officer Name Verification */}
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-[11px] text-gray-600">
              <strong>Authorized Officer:</strong> {officer?.name || 'Procurement Officer'} ({officer?.officer_id || 'ID-B'})
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsReserveModalOpen(false);
                  setTargetSlot(null);
                }}
                className="w-1/3 py-2.5 rounded-2xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReservation}
                disabled={isSubmittingReservation}
                className="flex-1 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-colors disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmittingReservation ? 'Reserving...' : 'Confirm Reservation'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* SCHEDULE CONFIGURATION MODAL */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Procurement Schedule & Capacity Configuration"
        subtitle="Configure center operating hours and farmers processed per 15-minute sub-slot"
        maxWidth="md"
      >
        <form onSubmit={handleSaveScheduleConfig} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-km-textPrimary block">Opening Time</label>
              <input
                type="text"
                value={configOpeningTime}
                onChange={(e) => setConfigOpeningTime(e.target.value)}
                placeholder="09:00 AM"
                className="w-full p-2.5 rounded-xl border border-gray-300 font-bold text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-km-textPrimary block">Closing Time</label>
              <input
                type="text"
                value={configClosingTime}
                onChange={(e) => setConfigClosingTime(e.target.value)}
                placeholder="05:00 PM"
                className="w-full p-2.5 rounded-xl border border-gray-300 font-bold text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-km-textPrimary block">Break Start</label>
              <input
                type="text"
                value={configBreakStart}
                onChange={(e) => setConfigBreakStart(e.target.value)}
                placeholder="01:00 PM"
                className="w-full p-2.5 rounded-xl border border-gray-300 font-bold text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-km-textPrimary block">Break End</label>
              <input
                type="text"
                value={configBreakEnd}
                onChange={(e) => setConfigBreakEnd(e.target.value)}
                placeholder="02:00 PM"
                className="w-full p-2.5 rounded-xl border border-gray-300 font-bold text-xs"
              />
            </div>
          </div>

          <div className="space-y-1 bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
            <label className="font-bold text-emerald-950 block">
              Farmers Capacity Per 15-Minute Sub-Slot
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={configFarmersPerSubSlot}
              onChange={(e) => setConfigFarmersPerSubSlot(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-emerald-300 font-black text-sm text-emerald-900 bg-white"
              required
            />
            <p className="text-[11px] text-emerald-800 mt-1 font-medium">
              Maximum Hourly Capacity = {configFarmersPerSubSlot} × 4 = <strong>{configFarmersPerSubSlot * 4} Farmers/Hour</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(false)}
              className="w-1/3 py-2.5 rounded-2xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingConfig}
              className="flex-1 py-2.5 rounded-2xl bg-km-primary hover:bg-km-primaryDark text-white font-bold flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSavingConfig ? 'Saving Schedule...' : 'Save & Update Schedule'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

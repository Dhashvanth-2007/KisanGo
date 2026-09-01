import React, { useState, useEffect } from 'react';
import { Booking } from '../../types';
import { Badge } from '../common/Badge';
import {
  Search,
  Filter,
  Wheat,
  Clock,
  CheckCircle,
  Scale,
  ArrowRight,
  UserCheck,
  AlertTriangle,
  Send,
  Plus,
  Play,
  SkipForward,
  Timer,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

interface TodayFarmersListProps {
  farmers: Booking[];
  activeProcessingFarmer?: Booking | null;
  currentDelayMins?: number;
  centerId?: string;
  onProcessFarmer: (farmer: Booking) => void;
  onVerifyFarmer: (farmer: Booking) => void;
  onRefresh?: () => void;
}

export const TodayFarmersList: React.FC<TodayFarmersListProps> = ({
  farmers,
  activeProcessingFarmer,
  currentDelayMins = 0,
  centerId = 'center-b',
  onProcessFarmer,
  onVerifyFarmer,
  onRefresh
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isNotifying, setIsNotifying] = useState(false);
  const [isUpdatingDelay, setIsUpdatingDelay] = useState(false);

  // Active processing farmer fallback
  const activeFarmer =
    activeProcessingFarmer ||
    farmers.find((f) => f.status === 'Processing' || f.status === 'Called') ||
    null;

  const activeDelay = activeFarmer?.delay_minutes || currentDelayMins || 0;
  const waitingAffectedCount = farmers.filter(
    (f) => f.status === 'Waiting' || f.status === 'Delayed' || f.status === 'Slot Booked'
  ).length;

  const handleAddDelayBuffer = async (mins: number) => {
    if (!activeFarmer) return;
    setIsUpdatingDelay(true);
    try {
      const res = await api.updateExpectedCompletion({
        bookingId: activeFarmer.id,
        addMinutes: mins
      });
      if (res.success) {
        showToast(`Added +${mins}m buffer. All downstream waiting farmers updated!`, 'success');
        if (onRefresh) onRefresh();
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to update buffer', 'error');
    } finally {
      setIsUpdatingDelay(false);
    }
  };

  const handleNotifyAffectedFarmers = async () => {
    setIsNotifying(true);
    try {
      const res = await api.notifyDelayToFarmers(centerId);
      if (res.success) {
        showToast(`Delay alert notification broadcasted to ${res.notifiedCount || waitingAffectedCount} farmers!`, 'success');
      } else {
        showToast(res.message || 'Notification broadcast failed', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to send notification', 'error');
    } finally {
      setIsNotifying(false);
    }
  };

  const handleSkipFarmer = async (farmer: Booking) => {
    if (!confirm(`Are you sure you want to skip farmer ${farmer.farmer_name} (${farmer.token_number})?`)) {
      return;
    }
    try {
      const res = await api.skipFarmer(farmer.id);
      if (res.success) {
        showToast(`Farmer ${farmer.token_number} skipped. Remaining queue recalculated!`, 'info');
        if (onRefresh) onRefresh();
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to skip farmer', 'error');
    }
  };

  const filteredFarmers = farmers.filter((f) => {
    const matchesSearch =
      (f.token_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.farmer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.farmer_mobile || '').includes(searchQuery);

    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Waiting'
        ? f.status === 'Waiting' || f.status === 'Delayed' || f.status === 'Slot Booked'
        : statusFilter === 'Processing'
        ? f.status === 'Processing' || f.status === 'Called'
        : statusFilter === 'Completed'
        ? f.status.includes('Completed') || f.status.includes('Bill') || f.status.includes('Payment')
        : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* 1. ACTIVE CURRENT PROCESSING CARD WITH LIVE TIMER */}
      {activeFarmer && (
        <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-white rounded-3xl border-2 border-amber-300 p-5 sm:p-6 shadow-km-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-mono font-black text-sm shadow-md animate-pulse">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-amber-500 text-white rounded-full">
                    Active in Weighbridge Bay
                  </span>
                  {activeDelay > 0 && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-rose-600 text-white rounded-full flex items-center gap-1 shadow-2xs">
                      <AlertTriangle className="w-3 h-3" /> +{activeDelay} Mins Delay
                    </span>
                  )}
                </div>
                <h3 className="font-black text-lg text-km-textPrimary mt-0.5">
                  {activeFarmer.farmer_name} ({activeFarmer.token_number || 'FG-1041'})
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onProcessFarmer(activeFarmer)}
                className="px-4 py-2 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl flex items-center gap-1.5 shadow-md shadow-emerald-800/20 transition-all"
              >
                <Scale className="w-4 h-4" />
                <span>Record Weights & Complete Bill</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Current Processing Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/90 p-3 rounded-2xl border border-amber-200">
              <span className="text-[10px] text-gray-500 block">Planned Sub-Slot</span>
              <span className="font-extrabold text-km-textPrimary text-sm block">
                {activeFarmer.planned_start_time || activeFarmer.slot_start} - {activeFarmer.planned_end_time || activeFarmer.slot_end}
              </span>
              <span className="text-[10px] text-gray-400">15-min window</span>
            </div>

            <div className="bg-white/90 p-3 rounded-2xl border border-amber-200">
              <span className="text-[10px] text-gray-500 block">Actual Start Time</span>
              <span className="font-extrabold text-blue-900 text-sm block">
                {activeFarmer.actual_start_time || activeFarmer.slot_start || '09:15 AM'}
              </span>
              <span className="text-[10px] text-blue-600 font-medium">Bay occupied</span>
            </div>

            <div className="bg-white/90 p-3 rounded-2xl border border-amber-200">
              <span className="text-[10px] text-gray-500 block">Elapsed Processing</span>
              <span className="font-extrabold text-amber-900 text-sm block">
                {activeFarmer.elapsed_processing_mins || 22} mins
              </span>
              <span className="text-[10px] text-amber-700 font-medium">Live timer</span>
            </div>

            <div className="bg-white/90 p-3 rounded-2xl border border-amber-200">
              <span className="text-[10px] text-gray-500 block">Expected Completion</span>
              <span className="font-extrabold text-emerald-950 text-sm block">
                {activeFarmer.expected_completion_time || '09:37 AM'}
              </span>
              <span className="text-[10px] text-emerald-700 font-medium">Auto-propagated</span>
            </div>
          </div>

          {/* Quick Delay Adjustment Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/60 text-xs">
            <span className="font-bold text-amber-950 flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-amber-700" />
              <span>Extend Expected Duration:</span>
            </span>
            <div className="flex items-center gap-1.5">
              {[5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  disabled={isUpdatingDelay}
                  onClick={() => handleAddDelayBuffer(mins)}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs rounded-xl shadow-2xs transition-all disabled:opacity-50"
                >
                  +{mins} mins
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. DELAY ALERT BANNER (Shown when active delay exists) */}
      {activeDelay > 0 && (
        <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-white rounded-3xl border-2 border-rose-300 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-rose-950 flex items-center gap-2">
                <span>Queue Delay Detected (+{activeDelay} Mins)</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-rose-200 text-rose-900 rounded-full">
                  {waitingAffectedCount} Farmers Affected
                </span>
              </h4>
              <p className="text-xs text-rose-800 mt-0.5">
                Current weighing is taking longer. Estimated start times for all waiting farmers have been updated automatically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleNotifyAffectedFarmers}
              disabled={isNotifying || waitingAffectedCount === 0}
              className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isNotifying ? 'Broadcasting...' : 'Notify Affected Farmers'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. DYNAMIC TODAY'S FARMERS QUEUE TABLE */}
      <div className="bg-white rounded-3xl border border-emerald-100 p-5 sm:p-6 shadow-km-sm space-y-4">
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h3 className="font-bold text-base text-km-textPrimary flex items-center gap-2">
              <span>{t('today_farmers')}</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                Dynamic Delay Engine
              </span>
            </h3>
            <p className="text-xs text-km-textSecondary">
              {filteredFarmers.length} farmer(s) matching criteria • Times adjust dynamically with real-world delays
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search token / name / phone..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-km-primary"
              />
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              {['All', 'Waiting', 'Processing', 'Completed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === st
                      ? 'bg-white text-km-primary shadow-xs font-bold'
                      : 'text-gray-500 hover:text-km-textPrimary'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Farmers List */}
        {filteredFarmers.length === 0 ? (
          <div className="text-center py-12 text-km-textSecondary">
            <Clock className="w-10 h-10 mx-auto text-gray-300 mb-2 stroke-1" />
            <p className="text-xs font-semibold">No farmers found in queue</p>
            <p className="text-[11px] text-gray-400">Farmers booking slots will appear here in real time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFarmers.map((farmer) => {
              const isCompleted = farmer.status.includes('Completed') || farmer.status.includes('Payment');
              const isProcessing = farmer.status === 'Processing' || farmer.status === 'Called';
              const isDelayed = farmer.status === 'Delayed' || (farmer.delay_minutes && farmer.delay_minutes > 0);

              return (
                <div
                  key={farmer.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isProcessing
                      ? 'bg-amber-50/70 border-amber-300 shadow-sm'
                      : isDelayed
                      ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                      : isCompleted
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-white border-gray-200 hover:border-emerald-200'
                  }`}
                >
                  {/* Farmer Info */}
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-950 text-center shrink-0 border border-emerald-200">
                      <span className="font-mono text-xs font-black block">{farmer.token_number || 'FG-1042'}</span>
                      <span className="text-[9px] text-emerald-800 uppercase font-bold">Pos #{farmer.queue_position || 1}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-km-textPrimary">{farmer.farmer_name || 'Farmer'}</h4>
                        
                        {isDelayed && !isProcessing && !isCompleted ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> Delayed (+{farmer.delay_minutes || activeDelay}m)
                          </span>
                        ) : (
                          <Badge
                            variant={isCompleted ? 'success' : isProcessing ? 'warning' : 'info'}
                            size="sm"
                          >
                            {farmer.status}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-km-textSecondary">
                        <span>+91 {farmer.farmer_mobile || '9876543210'}</span>
                        <span>•</span>
                        <span>{farmer.farmer_village || 'Tiruvannamalai'}</span>
                      </div>

                      {/* Timing Comparison Banner */}
                      <div className="flex items-center gap-3 pt-1 text-xs flex-wrap">
                        <div className="bg-gray-100 px-2 py-0.5 rounded-lg text-gray-600 font-medium text-[11px]">
                          Planned: <strong>{farmer.planned_start_time || farmer.slot_start} - {farmer.planned_end_time || farmer.slot_end}</strong>
                        </div>

                        {farmer.estimated_start_time && (
                          <div className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${
                            isDelayed ? 'bg-rose-100 text-rose-900 border border-rose-200' : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            Est. Arrival: <strong>{farmer.estimated_start_time}</strong>
                          </div>
                        )}

                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500 font-semibold text-[11px]">
                          Wait: ~{farmer.estimated_waiting_time || farmer.estimated_waiting_mins || 15} mins
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    {farmer.status === 'Slot Booked' || farmer.status === 'Waiting' || farmer.status === 'Delayed' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onVerifyFarmer(farmer)}
                          className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Call Bay</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSkipFarmer(farmer)}
                          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                          title="Skip Farmer"
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : null}

                    {!isCompleted ? (
                      <button
                        type="button"
                        onClick={() => onProcessFarmer(farmer)}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-800/20 transition-all active:scale-95"
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>{t('process_farmer')}</span>
                      </button>
                    ) : (
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 block">Bill #{farmer.bill_number}</span>
                        <span className="text-xs font-bold text-emerald-800 block">
                          ₹{farmer.net_amount?.toLocaleString('en-IN') || '58,000'} (DBT Ready)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

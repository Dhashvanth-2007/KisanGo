import React, { useState, useEffect } from 'react';
import { Booking } from '../types';
import { DigitalTokenCard } from '../components/token/DigitalTokenCard';
import { TravelGuidanceCard } from '../components/token/TravelGuidanceCard';
import { LiveQueueTracker } from '../components/queue/LiveQueueTracker';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Ticket, RefreshCw, XCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface MySlotPageProps {
  booking: Booking | null;
  onNavigateToFindCenter: () => void;
  onRefreshBooking: () => void;
}

export const MySlotPage: React.FC<MySlotPageProps> = ({
  booking,
  onNavigateToFindCenter,
  onRefreshBooking
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [liveQueueData, setLiveQueueData] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Poll live queue every 5 seconds if booking is active
  useEffect(() => {
    if (!booking || !booking.center_id) return;

    let isMounted = true;
    const fetchLive = async () => {
      try {
        const res = await api.getLiveQueue(booking.center_id, booking.id);
        if (res.success && isMounted) {
          setLiveQueueData(res.data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [booking]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (booking?.center_id) {
        const res = await api.getLiveQueue(booking.center_id, booking.id);
        if (res.success) setLiveQueueData(res.data);
      }
      onRefreshBooking();
      showToast('Live queue data updated', 'info');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    if (!window.confirm('Are you sure you want to cancel this procurement slot booking?')) return;

    setIsCancelling(true);
    try {
      const res = await api.cancelBooking(booking.id);
      if (res.success) {
        showToast('Booking cancelled successfully', 'info');
        onRefreshBooking();
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to cancel booking', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  if (!booking || booking.status === 'Cancelled') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5 pb-24">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-km-primary mx-auto flex items-center justify-center border border-emerald-100 shadow-km-sm">
          <Ticket className="w-10 h-10" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-km-textPrimary">No Active Slot Booked</h2>
          <p className="text-xs text-km-textSecondary leading-relaxed">
            Book a slot at a procurement center to receive your KM-XXXX Digital Token, departure guidance, and live queue tracking.
          </p>
        </div>
        <button
          onClick={onNavigateToFindCenter}
          className="px-6 py-3.5 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-800/20 flex items-center justify-center gap-2 mx-auto transition-all"
        >
          <span>{t('find_center')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-km-textPrimary">{t('my_slot')}</h1>
          <p className="text-xs text-km-textSecondary">
            Digital Token, departure schedule & real-time queue position
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-km-textPrimary transition-colors disabled:opacity-50"
            title="Refresh Live Status"
          >
            <RefreshCw className={`w-4 h-4 text-km-primary ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleCancelBooking}
            disabled={isCancelling || booking.status.includes('Completed')}
            className="flex items-center gap-1 px-3 py-2 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors disabled:opacity-40"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancel Slot</span>
          </button>
        </div>
      </div>

      {/* Digital Token Card */}
      <DigitalTokenCard booking={booking} />

      {/* Travel Guidance */}
      <TravelGuidanceCard booking={booking} />

      {/* Live Queue Tracker */}
      <LiveQueueTracker booking={booking} liveQueueData={liveQueueData} />
    </div>
  );
};

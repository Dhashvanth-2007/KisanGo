import React from 'react';
import { Booking } from '../../types';
import { Badge } from '../common/Badge';
import { Users, Clock, CheckCircle2, AlertTriangle, ArrowRight, Activity, BellRing } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface LiveQueueTrackerProps {
  booking: Booking;
  liveQueueData?: any;
}

export const LiveQueueTracker: React.FC<LiveQueueTrackerProps> = ({
  booking,
  liveQueueData
}) => {
  const { t } = useLanguage();

  const currentServing = liveQueueData?.currentServingToken || 'KM-0418';
  const farmersBefore = liveQueueData?.farmerQueueInfo?.farmers_before !== undefined
    ? liveQueueData.farmerQueueInfo.farmers_before
    : (booking.farmers_before !== undefined ? booking.farmers_before : 1);

  const estimatedWait = liveQueueData?.farmerQueueInfo?.calculated_wait_mins || booking.live_estimated_wait || 15;
  const status = liveQueueData?.farmerQueueInfo?.status || booking.live_queue_status || booking.status || 'Waiting';
  const alerts = liveQueueData?.alerts || [];

  const stages = [
    { key: 'Slot Booked', label: 'Slot Booked' },
    { key: 'Traveling', label: 'Traveling' },
    { key: 'Arrived', label: 'Arrived at Gate' },
    { key: 'Waiting', label: 'In Queue' },
    { key: 'Called', label: 'Called to Bay' },
    { key: 'Processing', label: 'Weighing & Quality' },
    { key: 'Completed', label: 'Procurement Done' }
  ];

  const getStageIndex = (currStatus: string) => {
    if (currStatus.includes('Completed') || currStatus.includes('Payment') || currStatus.includes('Bill')) return 6;
    if (currStatus.includes('Processing') || currStatus.includes('Weight') || currStatus.includes('Quality')) return 5;
    if (currStatus.includes('Called')) return 4;
    if (currStatus.includes('Waiting')) return 3;
    if (currStatus.includes('Arrived')) return 2;
    if (currStatus.includes('Traveling')) return 1;
    return 0;
  };

  const currentStageIndex = getStageIndex(status);

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 p-5 sm:p-6 shadow-km-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-km-textPrimary">{t('live_queue')}</h3>
            <p className="text-[11px] text-km-textSecondary">Real-time status updates from procurement center</p>
          </div>
        </div>
        <Badge
          variant={
            status === 'Processing'
              ? 'warning'
              : status === 'Called'
              ? 'ai'
              : status.includes('Completed')
              ? 'success'
              : 'info'
          }
          size="sm"
        >
          {status}
        </Badge>
      </div>

      {/* Real-time Alerts Banner if present */}
      {alerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-transparent p-4 rounded-2xl border border-amber-300 flex items-start gap-3 animate-pulse">
          <BellRing className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            {alerts.map((alt: string, i: number) => (
              <p key={i} className="text-xs font-bold text-km-textPrimary leading-snug">
                {alt}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Queue Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
        {/* Currently Serving Token */}
        <div className="bg-gray-50/90 border border-gray-200 p-3.5 rounded-2xl">
          <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">
            Now Serving
          </span>
          <span className="text-xl sm:text-2xl font-black text-km-textPrimary font-mono">
            {currentServing}
          </span>
          <span className="text-[10px] text-emerald-700 block font-semibold mt-0.5">At Weighbridge Bay #1</span>
        </div>

        {/* Farmers Ahead */}
        <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl">
          <span className="text-[10px] text-emerald-800 uppercase font-bold block mb-0.5">
            {t('farmers_ahead')}
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-950 font-mono">
            {farmersBefore}
          </span>
          <span className="text-[10px] text-emerald-700 block font-semibold mt-0.5">
            {farmersBefore === 0 ? 'You are NEXT!' : 'Vehicles ahead'}
          </span>
        </div>

        {/* Estimated Wait Time */}
        <div className="col-span-2 sm:col-span-1 bg-blue-50/80 border border-blue-200 p-3.5 rounded-2xl">
          <span className="text-[10px] text-blue-800 uppercase font-bold block mb-0.5">
            {t('waiting_time')}
          </span>
          <span className="text-xl sm:text-2xl font-black text-blue-950 font-mono">
            ~{estimatedWait} min
          </span>
          <span className="text-[10px] text-blue-700 block font-semibold mt-0.5">Dynamic calculation</span>
        </div>
      </div>

      {/* 7-Stage Workflow Progression Stepper */}
      <div className="space-y-2 pt-2">
        <h4 className="text-xs font-bold text-km-textPrimary uppercase tracking-wider">
          Procurement Journey
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 pt-1">
          {stages.map((stage, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <div
                key={stage.key}
                className={`p-2 rounded-xl border text-center transition-all ${
                  isCurrent
                    ? 'bg-km-primary text-white border-km-primary shadow-sm font-bold scale-105 z-10'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                    : 'bg-gray-50 text-gray-400 border-gray-100 font-normal'
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                </div>
                <span className="text-[10px] block leading-tight truncate">{stage.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

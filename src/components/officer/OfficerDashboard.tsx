import React from 'react';
import { Officer } from '../../types';
import { Users, Clock, CheckCircle2, Scale, Calendar, AlertTriangle, Settings, RefreshCw } from 'lucide-react';
import { Badge } from '../common/Badge';

interface OfficerDashboardProps {
  officer: Officer;
  stats: {
    totalFarmers: number;
    waitingFarmers: number;
    currentlyProcessing: number;
    completedFarmers: number;
    totalQuantityKg: number;
    dailyCapacity: number;
    currentCapacity: number;
  };
  onOpenSettings?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const OfficerDashboard: React.FC<OfficerDashboardProps> = ({
  officer,
  stats,
  onOpenSettings,
  onRefresh,
  isRefreshing = false
}) => {
  const centerName = officer.center?.name || 'Assigned Center';

  return (
    <div className="space-y-5">
      {/* Officer Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-km-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-full border border-amber-300/30">
              Procurement Officer Portal
            </span>
            <Badge variant="success" size="sm" className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
              Active Shift
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-1.5">{officer.name}</h2>
          <p className="text-xs text-emerald-200 mt-0.5">{officer.designation} • {centerName}</p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/20 transition-all active:scale-95 disabled:opacity-50"
              title="Refresh Live Queue"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl border border-white/20 transition-all active:scale-95"
            >
              <Settings className="w-4 h-4" />
              <span>Center Settings</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Total */}
        <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-km-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Today's Total</span>
            <Users className="w-4 h-4 text-km-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-km-textPrimary font-mono">
            {stats.totalFarmers}
          </div>
          <span className="text-[10px] text-gray-400 block font-medium">Slots allocated today</span>
        </div>

        {/* In Queue / Waiting */}
        <div className="bg-white p-4 rounded-3xl border border-amber-200 shadow-km-sm space-y-1 bg-amber-50/30">
          <div className="flex items-center justify-between text-xs text-amber-900 font-semibold">
            <span>Waiting in Queue</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-950 font-mono">
            {stats.waitingFarmers}
          </div>
          <span className="text-[10px] text-amber-800 block font-medium">Vehicles in line</span>
        </div>

        {/* Currently Processing */}
        <div className="bg-white p-4 rounded-3xl border border-blue-200 shadow-km-sm space-y-1 bg-blue-50/30">
          <div className="flex items-center justify-between text-xs text-blue-900 font-semibold">
            <span>Currently Processing</span>
            <Scale className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-950 font-mono">
            {stats.currentlyProcessing}
          </div>
          <span className="text-[10px] text-blue-800 block font-medium">At weighbridge</span>
        </div>

        {/* Completed Today */}
        <div className="bg-white p-4 rounded-3xl border border-emerald-200 shadow-km-sm space-y-1 bg-emerald-50/30">
          <div className="flex items-center justify-between text-xs text-emerald-900 font-semibold">
            <span>Completed Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-950 font-mono">
            {stats.completedFarmers}
          </div>
          <span className="text-[10px] text-emerald-800 block font-medium">
            {(stats.totalQuantityKg / 100).toFixed(0)} Qtl Procured
          </span>
        </div>
      </div>
    </div>
  );
};

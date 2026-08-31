import React, { useState } from 'react';
import { Booking } from '../../types';
import { Badge } from '../common/Badge';
import { Search, Filter, Wheat, Clock, CheckCircle, Scale, ArrowRight, UserCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface TodayFarmersListProps {
  farmers: Booking[];
  onProcessFarmer: (farmer: Booking) => void;
  onVerifyFarmer: (farmer: Booking) => void;
}

export const TodayFarmersList: React.FC<TodayFarmersListProps> = ({
  farmers,
  onProcessFarmer,
  onVerifyFarmer
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filteredFarmers = farmers.filter((f) => {
    const matchesSearch =
      (f.token_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.farmer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.farmer_mobile || '').includes(searchQuery);

    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Waiting'
        ? f.status === 'Waiting' || f.status === 'Slot Booked'
        : statusFilter === 'Processing'
        ? f.status === 'Processing' || f.status === 'Called'
        : statusFilter === 'Completed'
        ? f.status.includes('Completed') || f.status.includes('Bill') || f.status.includes('Payment')
        : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 p-5 sm:p-6 shadow-km-sm space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h3 className="font-bold text-base text-km-textPrimary">{t('today_farmers')}</h3>
          <p className="text-xs text-km-textSecondary">
            {filteredFarmers.length} farmer(s) matching criteria
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

            return (
              <div
                key={farmer.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isProcessing
                    ? 'bg-amber-50/60 border-amber-300 shadow-sm'
                    : isCompleted
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-white border-gray-200 hover:border-emerald-200'
                }`}
              >
                {/* Farmer Info */}
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-950 text-center shrink-0 border border-emerald-200">
                    <span className="font-mono text-xs font-black block">{farmer.token_number || 'KM-0420'}</span>
                    <span className="text-[9px] text-emerald-800 uppercase font-bold">Pos #{farmer.queue_position || 1}</span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-km-textPrimary">{farmer.farmer_name || 'Farmer'}</h4>
                      <Badge
                        variant={isCompleted ? 'success' : isProcessing ? 'warning' : 'info'}
                        size="sm"
                      >
                        {farmer.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-km-textSecondary">
                      <span>+91 {farmer.farmer_mobile || '9876543210'}</span>
                      <span>•</span>
                      <span>{farmer.farmer_village || 'Tiruvannamalai'}</span>
                    </div>

                    <div className="flex items-center gap-3 pt-1 text-xs flex-wrap">
                      {(() => {
                        let parsedCrops: any[] = [];
                        if (farmer.crops_breakdown) {
                          try {
                            parsedCrops = JSON.parse(farmer.crops_breakdown);
                          } catch (e) {}
                        }
                        if (parsedCrops.length > 0) {
                          return (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {parsedCrops.map((c, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-km-primary border border-emerald-200 text-[11px] font-bold">
                                  <Wheat className="w-3 h-3 text-amber-600" />
                                  <span>{c.cropName}: {c.expectedQuantity.toLocaleString()}kg</span>
                                </span>
                              ))}
                            </div>
                          );
                        }
                        return (
                          <span className="font-bold text-km-primary flex items-center gap-1">
                            <Wheat className="w-3.5 h-3.5 text-amber-600" />
                            <span>{farmer.crop_name} • {(farmer.actual_quantity || farmer.expected_quantity)?.toLocaleString()} kg</span>
                          </span>
                        );
                      })()}
                      <span className="text-gray-500 font-semibold text-[11px]">
                        Slot: {farmer.slot_start} - {farmer.slot_end}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  {farmer.status === 'Slot Booked' || farmer.status === 'Waiting' ? (
                    <button
                      onClick={() => onVerifyFarmer(farmer)}
                      className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Verify & Call</span>
                    </button>
                  ) : null}

                  {!isCompleted ? (
                    <button
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
  );
};

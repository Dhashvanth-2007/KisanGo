import React from 'react';
import { Crop, SelectedCropItem } from '../../types';
import { Wheat, Scale, Clock, Sparkles, Plus, Trash2, CheckCircle2, DollarSign } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface CropQuantityFormProps {
  crops: Crop[];
  selectedCrops: SelectedCropItem[];
  onChangeSelectedCrops: (crops: SelectedCropItem[]) => void;
  estimatedProcessingMins: number;
}

export const CropQuantityForm: React.FC<CropQuantityFormProps> = ({
  crops,
  selectedCrops,
  onChangeSelectedCrops,
  estimatedProcessingMins
}) => {
  const { t } = useLanguage();

  const totalQuantity = selectedCrops.reduce((sum, item) => sum + (item.expectedQuantity || 0), 0);
  const totalEstimatedMspValue = selectedCrops.reduce(
    (sum, item) => sum + (item.expectedQuantity || 0) * (item.mspRate || 0),
    0
  );

  const isCropSelected = (cropId: string) => selectedCrops.some((item) => item.cropId === cropId);

  const toggleCrop = (crop: Crop) => {
    if (isCropSelected(crop.id)) {
      // If only 1 crop is selected, do not remove it (keep at least 1)
      if (selectedCrops.length <= 1) return;
      onChangeSelectedCrops(selectedCrops.filter((item) => item.cropId !== crop.id));
    } else {
      onChangeSelectedCrops([
        ...selectedCrops,
        {
          cropId: crop.id,
          cropName: crop.name,
          expectedQuantity: 1000,
          mspRate: crop.msp_rate
        }
      ]);
    }
  };

  const updateCropQuantity = (cropId: string, newQty: number) => {
    const validQty = Math.max(100, isNaN(newQty) ? 100 : newQty);
    onChangeSelectedCrops(
      selectedCrops.map((item) =>
        item.cropId === cropId ? { ...item, expectedQuantity: validQty } : item
      )
    );
  };

  const addQuickQuantity = (cropId: string, addAmount: number) => {
    onChangeSelectedCrops(
      selectedCrops.map((item) =>
        item.cropId === cropId
          ? { ...item, expectedQuantity: Math.min(50000, item.expectedQuantity + addAmount) }
          : item
      )
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 p-5 sm:p-6 shadow-km-sm space-y-5">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
            <Wheat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-km-textPrimary">Crop & Quantity Consignment</h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Multi-Product Supported
              </span>
            </div>
            <p className="text-[11px] text-km-textSecondary">
              Select one or multiple grains to sell in this single booking slot
            </p>
          </div>
        </div>
      </div>

      {/* Select Available Crops / Grains Multi-Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-km-textPrimary flex items-center justify-between">
          <span>Select Grains to Sell (Click to Add / Remove):</span>
          <span className="text-[11px] text-emerald-700 font-semibold">
            {selectedCrops.length} {selectedCrops.length === 1 ? 'Grain' : 'Grains'} Selected
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {crops.map((crop) => {
            const selected = isCropSelected(crop.id);
            return (
              <button
                key={crop.id}
                type="button"
                onClick={() => toggleCrop(crop)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  selected
                    ? 'border-km-primary bg-emerald-50/80 shadow-xs ring-2 ring-km-primary/20'
                    : 'border-gray-200 hover:border-emerald-200 bg-white'
                }`}
              >
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-km-textPrimary block">{crop.name}</span>
                  <span className="text-[11px] text-km-textSecondary font-medium">
                    Govt MSP: <strong className="text-emerald-800">₹{crop.msp_rate.toFixed(2)}/kg</strong>
                  </span>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    selected ? 'bg-km-primary text-white shadow-xs' : 'border border-gray-300 text-gray-300'
                  }`}
                >
                  {selected ? '✓' : '+'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Individual Quantity Adjustments for each selected crop */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        <label className="block text-xs font-bold text-km-textPrimary">
          Specify Quantities for Selected Grains:
        </label>

        <div className="space-y-3">
          {selectedCrops.map((item) => {
            const subtotalMsp = item.expectedQuantity * item.mspRate;
            return (
              <div
                key={item.cropId}
                className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/90 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-km-primary" />
                    <span className="font-bold text-xs text-km-textPrimary">{item.cropName}</span>
                    <span className="text-[11px] font-mono text-gray-500 font-semibold">
                      (@ ₹{item.mspRate.toFixed(2)}/kg)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-km-primary">
                      ₹{subtotalMsp.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    {selectedCrops.length > 1 && (
                      <button
                        type="button"
                        onClick={() => toggleCrop({ id: item.cropId, name: item.cropName, msp_rate: item.mspRate } as any)}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Remove Grain"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Scale className="w-4 h-4" />
                    </div>
                    <input
                      type="number"
                      value={item.expectedQuantity || ''}
                      onChange={(e) => updateCropQuantity(item.cropId, parseInt(e.target.value, 10))}
                      step="100"
                      min="100"
                      max="50000"
                      className="w-full pl-9 pr-14 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-km-textPrimary focus:outline-none focus:ring-2 focus:ring-km-primary bg-white"
                      placeholder="e.g. 2000"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-bold text-gray-400">
                      KG
                    </div>
                  </div>

                  {/* Quick increment chips */}
                  <div className="flex items-center gap-1">
                    {[500, 1000, 2500].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => addQuickQuantity(item.cropId, inc)}
                        className="px-2 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 text-[10px] font-bold text-km-textPrimary transition-all"
                      >
                        +{inc >= 1000 ? `${inc / 1000}T` : `${inc}kg`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
                  <span>{(item.expectedQuantity / 100).toFixed(1)} Quintals ({(item.expectedQuantity / 1000).toFixed(2)} Tons)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Combined Total Summary Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200 space-y-2.5">
        <div className="flex items-center justify-between text-xs pb-1 border-b border-emerald-100">
          <span className="font-bold text-emerald-900 uppercase tracking-wider text-[10px]">
            Combined Consignment Total
          </span>
          <span className="text-[11px] font-bold text-emerald-800">
            {selectedCrops.length} {selectedCrops.length === 1 ? 'Crop' : 'Crops Included'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
            <span className="text-[10px] text-gray-500 block">Total Weight</span>
            <span className="font-extrabold text-km-primary text-sm font-mono">
              {totalQuantity.toLocaleString()} kg
            </span>
            <span className="text-[10px] text-gray-400 block">
              {(totalQuantity / 100).toFixed(1)} Quintals
            </span>
          </div>

          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
            <span className="text-[10px] text-gray-500 block">Estimated MSP Value</span>
            <span className="font-extrabold text-emerald-950 text-sm font-mono">
              ₹{totalEstimatedMspValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-emerald-600 block font-medium">
              Direct DBT Payout
            </span>
          </div>

          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-gray-500 block">Est. Processing</span>
            <span className="font-extrabold text-blue-900 text-sm flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              ~{estimatedProcessingMins} mins
            </span>
            <span className="text-[10px] text-gray-400 block">
              Weighbridge & Testing
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

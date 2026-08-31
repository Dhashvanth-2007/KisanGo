import React from 'react';
import { Crop } from '../../types';
import { Wheat, Scale, Clock, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface CropQuantityFormProps {
  crops: Crop[];
  selectedCropId: string;
  onSelectCrop: (cropId: string) => void;
  quantity: number;
  onChangeQuantity: (quantity: number) => void;
  estimatedProcessingMins: number;
}

export const CropQuantityForm: React.FC<CropQuantityFormProps> = ({
  crops,
  selectedCropId,
  onSelectCrop,
  quantity,
  onChangeQuantity,
  estimatedProcessingMins
}) => {
  const { t } = useLanguage();
  const selectedCrop = crops.find((c) => c.id === selectedCropId) || crops[0];

  const quickQuantities = [1000, 2000, 2500, 5000, 8000];

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 p-5 sm:p-6 shadow-km-sm space-y-5">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
          <Wheat className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-km-textPrimary">Crop & Quantity Details</h3>
          <p className="text-[11px] text-km-textSecondary">AI calculates processing and slot availability based on load</p>
        </div>
      </div>

      {/* Crop Selector Grid */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-km-textPrimary">{t('select_crop')}</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {crops.map((crop) => (
            <button
              key={crop.id}
              type="button"
              onClick={() => onSelectCrop(crop.id)}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                selectedCropId === crop.id
                  ? 'border-km-primary bg-emerald-50/70 shadow-sm ring-2 ring-km-primary/20'
                  : 'border-gray-200 hover:border-emerald-200 bg-white'
              }`}
            >
              <div>
                <span className="font-bold text-xs text-km-textPrimary block">{crop.name}</span>
                <span className="text-[11px] text-km-textSecondary">MSP: ₹{crop.msp_rate.toFixed(2)}/kg</span>
              </div>
              {selectedCropId === crop.id && (
                <span className="w-4 h-4 rounded-full bg-km-primary text-white flex items-center justify-center text-[10px] font-bold">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity Input with Quick Add Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-km-textPrimary">{t('enter_quantity')}</label>
          <span className="text-xs font-bold text-km-primary bg-emerald-50 px-2 py-0.5 rounded-md">
            {(quantity / 100).toFixed(1)} Quintals ({quantity.toLocaleString()} kg)
          </span>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Scale className="w-4 h-4" />
          </div>
          <input
            type="number"
            value={quantity || ''}
            onChange={(e) => onChangeQuantity(Math.max(100, parseInt(e.target.value, 10) || 0))}
            step="100"
            min="100"
            max="50000"
            className="w-full pl-10 pr-16 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-km-textPrimary focus:outline-none focus:ring-2 focus:ring-km-primary focus:border-transparent"
            placeholder="e.g. 2500"
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-xs font-bold text-gray-400">
            KG
          </div>
        </div>

        {/* Quick Add Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] text-gray-400 mr-1">Quick Select:</span>
          {quickQuantities.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onChangeQuantity(q)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                quantity === q
                  ? 'bg-km-primary text-white shadow-sm'
                  : 'bg-gray-100 text-km-textPrimary hover:bg-gray-200'
              }`}
            >
              {q >= 1000 ? `${q / 1000} Tons` : `${q} kg`}
            </button>
          ))}
        </div>
      </div>

      {/* AI Processing Calculation Preview */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-km-primary shrink-0" />
          <div>
            <span className="font-bold text-km-textPrimary block">{t('estimated_processing_time')}</span>
            <span className="text-[11px] text-km-textSecondary">Weighbridge & Moisture grading</span>
          </div>
        </div>
        <span className="font-extrabold text-km-primary text-sm">
          ~{estimatedProcessingMins} mins
        </span>
      </div>
    </div>
  );
};

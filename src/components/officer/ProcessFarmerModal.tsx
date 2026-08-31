import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Booking } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { Scale, CheckCircle2, AlertCircle, FileText, ArrowRight, ShieldCheck, DollarSign } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ProcessFarmerModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmer: Booking | null;
  onProcessed?: () => void;
}

export const ProcessFarmerModal: React.FC<ProcessFarmerModalProps> = ({
  isOpen,
  onClose,
  farmer,
  onProcessed
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [actualQuantity, setActualQuantity] = useState<number>(farmer?.expected_quantity || 2500);
  const [moisture, setMoisture] = useState<number>(12.0);
  const [foreignMatter, setForeignMatter] = useState<number>(0.5);
  const [qualityGrade, setQualityGrade] = useState<string>('Grade A');
  const [remarks, setRemarks] = useState<string>('Sample verified against electronic moisture standard.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedBill, setGeneratedBill] = useState<any>(null);

  if (!farmer) return null;

  const ratePerKg = farmer.msp_rate || 23.2;
  const grossAmount = actualQuantity * ratePerKg;
  const moistureDeductionRate = moisture > 14.0 ? (moisture - 14.0) * 0.25 : 0;
  const totalDeductions = actualQuantity * moistureDeductionRate;
  const netAmount = grossAmount - totalDeductions;

  const handleFinalizeProcurement = async () => {
    setIsProcessing(true);
    try {
      const res = await api.recordProcurement({
        bookingId: farmer.id,
        officerId: user?.id || 'officer-1',
        actualQuantity,
        moisturePercentage: moisture,
        foreignMatterPercentage: foreignMatter,
        qualityGrade,
        remarks
      });

      if (res.success) {
        setGeneratedBill(res.data);
        setStep(4);
        showToast('Procurement finalized and official bill generated!', 'success');
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to record procurement', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompletePayment = async () => {
    if (!generatedBill) return;
    setIsProcessing(true);
    try {
      await api.markPaymentComplete(generatedBill.procurementId || 'proc-1');
      showToast('DBT Payment marked as COMPLETED!', 'success');
      if (onProcessed) onProcessed();
      onClose();
    } catch (e: any) {
      showToast(e.message || 'Failed to update payment status', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-km-primary" />
          <span>Process Farmer Consignment: {farmer.token_number}</span>
        </div>
      }
      subtitle={`Farmer: ${farmer.farmer_name || 'Farmer'} • Crop: ${farmer.crop_name}`}
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Step Indicator */}
        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold uppercase tracking-wider">
          <div className={`p-2 rounded-xl border ${step >= 1 ? 'bg-km-primary text-white border-km-primary' : 'bg-gray-100 text-gray-400'}`}>
            1. Verify
          </div>
          <div className={`p-2 rounded-xl border ${step >= 2 ? 'bg-km-primary text-white border-km-primary' : 'bg-gray-100 text-gray-400'}`}>
            2. Weigh
          </div>
          <div className={`p-2 rounded-xl border ${step >= 3 ? 'bg-km-primary text-white border-km-primary' : 'bg-gray-100 text-gray-400'}`}>
            3. Quality
          </div>
          <div className={`p-2 rounded-xl border ${step >= 4 ? 'bg-km-primary text-white border-km-primary' : 'bg-gray-100 text-gray-400'}`}>
            4. Bill & DBT
          </div>
        </div>

        {/* STEP 1: VERIFICATION */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 space-y-2 text-xs">
              <span className="font-bold text-emerald-950 uppercase block text-[10px]">Verification Checklist</span>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Token Number:</strong> {farmer.token_number}</div>
                <div><strong>Mobile:</strong> +91 {farmer.farmer_mobile || '9876543210'}</div>
                <div><strong>Slot:</strong> {farmer.slot_start} - {farmer.slot_end}</div>
                <div><strong>Declared Quantity:</strong> {farmer.expected_quantity?.toLocaleString()} kg</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-km-textSecondary">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Aadhaar ID matched and vehicle entered weighbridge entry bay.</span>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <span>Verify & Proceed to Weighment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: WEIGHMENT */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-km-textPrimary">
                Actual Net Weight (from Digital Electronic Weighbridge)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={actualQuantity}
                  onChange={(e) => setActualQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full pl-4 pr-16 py-3 rounded-2xl border border-gray-300 text-base font-bold font-mono focus:ring-2 focus:ring-km-primary"
                />
                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs font-bold text-gray-400">
                  KG
                </span>
              </div>
              <span className="text-[11px] text-km-textSecondary">
                Equivalent to {(actualQuantity / 100).toFixed(2)} Quintals
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3 border border-gray-200 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md"
              >
                <span>Record Weight & Grade Sample</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: QUALITY GRADING */}
        {step === 3 && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              {/* Moisture */}
              <div className="space-y-1">
                <label className="font-bold text-km-textPrimary block">Moisture Content (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={moisture}
                  onChange={(e) => setMoisture(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 font-bold focus:ring-2 focus:ring-km-primary"
                />
                <span className="text-[10px] text-gray-400">Standard: 12.0% - 14.0%</span>
              </div>

              {/* Foreign Matter */}
              <div className="space-y-1">
                <label className="font-bold text-km-textPrimary block">Foreign Matter (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={foreignMatter}
                  onChange={(e) => setForeignMatter(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 font-bold focus:ring-2 focus:ring-km-primary"
                />
                <span className="text-[10px] text-gray-400">Max limit: 1.0%</span>
              </div>
            </div>

            {/* Quality Grade */}
            <div className="space-y-1">
              <label className="font-bold text-km-textPrimary block">Quality Grade</label>
              <select
                value={qualityGrade}
                onChange={(e) => setQualityGrade(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 font-bold focus:ring-2 focus:ring-km-primary"
              >
                <option value="Grade A">Grade A (Premium)</option>
                <option value="Grade B">Grade B (Standard)</option>
                <option value="Grade C">Grade C (Allowable)</option>
              </select>
            </div>

            {/* Live Calculation Preview */}
            <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200 space-y-1">
              <div className="flex justify-between font-bold">
                <span>Gross MSP (₹{ratePerKg.toFixed(2)}/kg):</span>
                <span>₹{grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {totalDeductions > 0 && (
                <div className="flex justify-between text-rose-700 font-semibold">
                  <span>Moisture Deduction:</span>
                  <span>-₹{totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-km-primary text-sm pt-1 border-t border-emerald-200">
                <span>Net Payable Amount:</span>
                <span>₹{netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 py-3 border border-gray-200 rounded-2xl text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleFinalizeProcurement}
                className="flex-1 py-3 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {isProcessing ? 'Generating Bill...' : 'Finalize & Generate Official Bill'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: BILL & DBT PAYMENT COMPLETE */}
        {step === 4 && (
          <div className="space-y-4 text-xs">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-300 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-extrabold text-base text-emerald-950">Procurement Successfully Completed!</h4>
              <p className="text-xs text-km-textSecondary">
                Bill #{generatedBill?.billNumber} issued for {actualQuantity} kg of {farmer.crop_name}.
              </p>
              <div className="text-xl font-black text-km-primary font-mono pt-1">
                Net Amount: ₹{generatedBill?.netAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-gray-500 font-mono">DBT Reference UTR: {generatedBill?.utrRef}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onProcessed) onProcessed();
                  onClose();
                }}
                className="w-1/2 py-3 border border-gray-200 rounded-2xl text-xs font-bold text-km-textPrimary hover:bg-gray-50"
              >
                Keep in Processing
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleCompletePayment}
                className="w-1/2 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                <DollarSign className="w-4 h-4" />
                <span>Mark DBT as Completed</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

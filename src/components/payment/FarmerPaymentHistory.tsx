import React, { useState } from 'react';
import { FarmerPayment } from '../../types';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { DollarSign, CheckCircle2, Clock, FileText, Download, ShieldCheck, Wheat } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface FarmerPaymentHistoryProps {
  payments: FarmerPayment[];
}

export const FarmerPaymentHistory: React.FC<FarmerPaymentHistoryProps> = ({ payments }) => {
  const { t } = useLanguage();
  const [selectedBill, setSelectedBill] = useState<FarmerPayment | null>(null);

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 p-5 sm:p-6 shadow-km-sm space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <h3 className="font-bold text-sm text-km-textPrimary">{t('payments_history')}</h3>
          <p className="text-[11px] text-km-textSecondary">Direct Benefit Transfer (DBT) records & official purchase bills</p>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-8 text-km-textSecondary">
          <DollarSign className="w-10 h-10 mx-auto text-gray-300 mb-2 stroke-1" />
          <p className="text-xs font-semibold">No payment records yet</p>
          <p className="text-[11px] text-gray-400">Completed procurements and DBT credits will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((pay) => (
            <div
              key={pay.id}
              className="p-4 rounded-2xl border border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-200 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-km-textPrimary">{pay.bill_number}</span>
                  <Badge
                    variant={pay.status === 'Payment Completed' ? 'success' : 'warning'}
                    size="sm"
                  >
                    {pay.status}
                  </Badge>
                </div>
                <h4 className="font-bold text-sm text-km-textPrimary flex items-center gap-1.5">
                  <Wheat className="w-3.5 h-3.5 text-amber-600" />
                  <span>{pay.crop_name} • {pay.actual_quantity?.toLocaleString()} kg ({pay.quality_grade})</span>
                </h4>
                <p className="text-[11px] text-km-textSecondary">
                  {pay.center_name} • {pay.bill_date || pay.created_at}
                </p>
                {pay.utr_reference && (
                  <p className="text-[10px] font-mono text-emerald-800 font-semibold">
                    UTR: {pay.utr_reference}
                  </p>
                )}
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                <div className="sm:text-right">
                  <span className="text-[10px] text-gray-500 block">Total Amount</span>
                  <span className="font-extrabold text-base text-km-primary font-mono">
                    ₹{pay.net_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBill(pay)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-emerald-50 text-xs font-bold text-km-primary flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Bill</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Official Bill View Modal */}
      {selectedBill && (
        <Modal
          isOpen={!!selectedBill}
          onClose={() => setSelectedBill(null)}
          title="Official Procurement Bill"
          subtitle="Government Minimum Support Price (MSP) Certified Consignment Receipt"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {/* Header Box */}
            <div className="border border-emerald-200 rounded-2xl p-4 bg-emerald-50/50 space-y-2">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800">Bill Number</span>
                  <p className="font-mono font-bold text-sm text-emerald-950">{selectedBill.bill_number}</p>
                </div>
                <Badge variant={selectedBill.status === 'Payment Completed' ? 'success' : 'warning'} size="sm">
                  {selectedBill.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-gray-500 block">Center:</span>
                  <span className="font-bold text-km-textPrimary">{selectedBill.center_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Date:</span>
                  <span className="font-bold text-km-textPrimary">{selectedBill.bill_date || selectedBill.created_at}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Commodity:</span>
                  <span className="font-bold text-km-textPrimary">{selectedBill.crop_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Quality Grade:</span>
                  <span className="font-bold text-km-textPrimary">{selectedBill.quality_grade} (Moisture: {selectedBill.moisture_percentage}%)</span>
                </div>
              </div>
            </div>

            {/* Calculations Breakdown Table */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700">
                  <tr>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  <tr>
                    <td className="p-3">
                      Actual Quantity Procured: <strong>{selectedBill.actual_quantity?.toLocaleString()} kg</strong> @ ₹{selectedBill.rate_per_kg?.toFixed(2)}/kg
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      ₹{selectedBill.gross_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 text-rose-700">
                      Quality Deductions (Moisture/Foreign matter)
                    </td>
                    <td className="p-3 text-right font-mono text-rose-700 font-bold">
                      -₹{selectedBill.deductions?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/80 font-extrabold text-emerald-950 text-sm">
                    <td className="p-3">Net DBT Payable Amount:</td>
                    <td className="p-3 text-right font-mono text-km-primary text-base">
                      ₹{selectedBill.net_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bank Transfer Info */}
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <ShieldCheck className="w-4 h-4 text-km-primary" />
                <span>DBT Payment Mode: Direct Benefit Transfer to Aadhaar-linked Bank</span>
              </div>
              {selectedBill.utr_reference && (
                <p className="font-mono text-gray-600">Transaction Reference UTR: {selectedBill.utr_reference}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                window.print();
              }}
              className="w-full py-3 rounded-2xl bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Print / Download Official Receipt</span>
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

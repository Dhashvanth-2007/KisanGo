import React, { useState, useEffect } from 'react';
import { Complaint, FarmerPayment } from '../types';
import { ReportProblemModal } from '../components/complaint/ReportProblemModal';
import { ComplaintTrackingView } from '../components/complaint/ComplaintTrackingView';
import { FarmerPaymentHistory } from '../components/payment/FarmerPaymentHistory';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import { ShieldAlert, DollarSign, HelpCircle, PhoneCall, CheckCircle2 } from 'lucide-react';

export const HelpPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'complaints' | 'payments' | 'faqs'>('complaints');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [payments, setPayments] = useState<FarmerPayment[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchHelpData = async () => {
    if (!user) return;
    try {
      const [cmpRes, payRes] = await Promise.all([
        api.getFarmerComplaints(user.id),
        api.getFarmerPayments(user.id)
      ]);
      if (cmpRes.success) setComplaints(cmpRes.data);
      if (payRes.success) setPayments(payRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHelpData();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-km-textPrimary">{t('help')}</h1>
          <p className="text-xs text-km-textSecondary">
            Evidence-based problem reporting, DBT payment tracking, and official assistance
          </p>
        </div>

        <button
          onClick={() => setIsReportModalOpen(true)}
          className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md transition-colors shrink-0"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{t('report_problem')}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab('complaints')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'complaints'
              ? 'bg-white text-km-primary shadow-xs'
              : 'text-gray-600 hover:text-km-textPrimary'
          }`}
        >
          Complaints & Issues ({complaints.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'payments'
              ? 'bg-white text-km-primary shadow-xs'
              : 'text-gray-600 hover:text-km-textPrimary'
          }`}
        >
          DBT Payments & Bills ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('faqs')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'faqs'
              ? 'bg-white text-km-primary shadow-xs'
              : 'text-gray-600 hover:text-km-textPrimary'
          }`}
        >
          FAQs & Contacts
        </button>
      </div>

      {/* TAB 1: COMPLAINTS */}
      {activeTab === 'complaints' && (
        <ComplaintTrackingView
          complaints={complaints}
          onFileNewComplaint={() => setIsReportModalOpen(true)}
        />
      )}

      {/* TAB 2: PAYMENTS */}
      {activeTab === 'payments' && <FarmerPaymentHistory payments={payments} />}

      {/* TAB 3: FAQS & CONTACTS */}
      {activeTab === 'faqs' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-km-sm space-y-4">
            <h3 className="font-bold text-sm text-km-textPrimary">Frequently Asked Questions</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                <h4 className="font-bold text-km-textPrimary">How does Kisan Go choose the AI Recommended center?</h4>
                <p className="text-km-textSecondary leading-relaxed">
                  The AI uses the formula <code>Total Time = Travel Time + Expected Waiting Time + Estimated Processing Time</code>. If a farther center has a much shorter queue, it saves you time overall and is recommended.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                <h4 className="font-bold text-km-textPrimary">How does DBT payment credit work?</h4>
                <p className="text-km-textSecondary leading-relaxed">
                  Upon completion of weighment and grading, an official computerized bill is issued. The net amount is credited directly to your Aadhaar-linked bank account within 24–48 hours.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                <h4 className="font-bold text-km-textPrimary">What happens if I arrive earlier or later than my slot?</h4>
                <p className="text-km-textSecondary leading-relaxed">
                  Arriving within your slot window guarantees priority entry. If delayed, your digital token remains valid and is scheduled in the next open queue position.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-3xl border border-emerald-200 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-km-primary text-white flex items-center justify-center">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-emerald-950">District Procurement Committee Helpline</h4>
                <p className="text-xs text-km-primary font-semibold">Toll Free: 1800-425-3435 (08:00 AM - 06:00 PM)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT PROBLEM MODAL */}
      <ReportProblemModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitted={fetchHelpData}
      />
    </div>
  );
};

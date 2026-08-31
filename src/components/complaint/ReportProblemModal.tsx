import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { AlertCircle, Camera, Mic, Upload, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export const ReportProblemModal: React.FC<ReportProblemModalProps> = ({
  isOpen,
  onClose,
  onSubmitted
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const categories = [
    'Slot / Queue Problem',
    'Weight Problem',
    'Quality Problem',
    'Payment Problem',
    'Center Problem',
    'Officer / Staff Problem',
    'Other'
  ];

  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      showToast('Please describe your issue', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        farmerId: user?.id || 'farmer-1',
        category: selectedCategory,
        description,
        evidence: evidenceUrl ? [{ url: evidenceUrl, type: 'photo', caption: 'Farmer evidence photo' }] : []
      };

      const res = await api.submitComplaint(payload);
      if (res.success) {
        showToast('Complaint submitted successfully! Tracking ID generated.', 'success');
        setDescription('');
        setEvidenceUrl('');
        setPreviewMode(false);
        onClose();
        if (onSubmitted) onSubmitted();
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to submit complaint', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <span>{t('report_problem')}</span>
        </div>
      }
      subtitle="Fast 1-minute submission with voice or photo evidence"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {!previewMode ? (
          <>
            {/* Category Selector Chips */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-km-textPrimary">{t('complaint_category')}</label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedCategory === cat
                        ? 'bg-rose-700 text-white shadow-sm ring-2 ring-rose-300'
                        : 'bg-gray-100 text-km-textPrimary hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-km-textPrimary">{t('complaint_desc')}</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what happened at the center or with your slot/weight..."
                className="w-full p-3 text-xs rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Evidence Attachment */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-km-textPrimary">{t('complaint_evidence')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="Paste photo URL or use demo photo..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setEvidenceUrl('https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=600&q=80')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-km-textPrimary rounded-xl transition-colors shrink-0"
                >
                  Add Demo Photo
                </button>
              </div>
              {evidenceUrl && (
                <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-gray-200">
                  <img src={evidenceUrl} alt="evidence preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Continue to Preview Button */}
            <button
              type="button"
              onClick={() => {
                if (!description.trim()) {
                  showToast('Please enter a description', 'warning');
                  return;
                }
                setPreviewMode(true);
              }}
              className="w-full py-3 px-4 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-md transition-colors"
            >
              Preview & Verify
            </button>
          </>
        ) : (
          /* Preview Mode */
          <div className="space-y-4">
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 space-y-2 text-xs">
              <span className="font-bold text-rose-900 block uppercase text-[10px]">Complaint Summary</span>
              <p><strong>Category:</strong> {selectedCategory}</p>
              <p><strong>Description:</strong> {description}</p>
              {evidenceUrl && (
                <div>
                  <strong>Attached Evidence:</strong>
                  <img src={evidenceUrl} alt="evidence" className="w-32 h-20 object-cover rounded-xl mt-1 border border-gray-300" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode(false)}
                className="w-1/3 py-2.5 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-km-textPrimary"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-md transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : t('submit_complaint')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

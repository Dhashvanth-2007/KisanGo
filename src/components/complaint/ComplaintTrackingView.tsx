import React from 'react';
import { Complaint } from '../../types';
import { Badge } from '../common/Badge';
import { ShieldCheck, Clock, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ComplaintTrackingViewProps {
  complaints: Complaint[];
  onFileNewComplaint?: () => void;
}

export const ComplaintTrackingView: React.FC<ComplaintTrackingViewProps> = ({
  complaints,
  onFileNewComplaint
}) => {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 p-5 sm:p-6 shadow-km-sm space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <h3 className="font-bold text-sm text-km-textPrimary">{t('track_complaints')}</h3>
          <p className="text-[11px] text-km-textSecondary">Monitor status & review resolutions from marketing committee</p>
        </div>
        {onFileNewComplaint && (
          <button
            onClick={onFileNewComplaint}
            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors"
          >
            + File Problem
          </button>
        )}
      </div>

      {complaints.length === 0 ? (
        <div className="text-center py-8 text-km-textSecondary">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 stroke-1" />
          <p className="text-xs font-semibold">No complaints reported</p>
          <p className="text-[11px] text-gray-400">Your procurement operations have no active issues.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((cmp) => (
            <div
              key={cmp.id}
              className="p-4 rounded-2xl border border-gray-100 bg-gray-50/60 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-gray-400 block">{cmp.complaint_number}</span>
                  <h4 className="font-bold text-xs text-km-textPrimary">{cmp.category}</h4>
                  <span className="text-[10px] text-gray-500">{cmp.center_name || 'General Procurement'} • {cmp.created_at}</span>
                </div>
                <Badge
                  variant={
                    cmp.status === 'Resolved'
                      ? 'success'
                      : cmp.status === 'Under Review'
                      ? 'warning'
                      : 'info'
                  }
                  size="sm"
                >
                  {cmp.status}
                </Badge>
              </div>

              <p className="text-xs text-km-textSecondary leading-relaxed bg-white p-2.5 rounded-xl border border-gray-100">
                {cmp.description}
              </p>

              {/* Evidence if attached */}
              {cmp.evidence && cmp.evidence.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-gray-400 font-semibold">Evidence:</span>
                  {cmp.evidence.map((ev) => (
                    <a
                      key={ev.id}
                      href={ev.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      <span>View Photo</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Resolution Note if resolved */}
              {cmp.resolution && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-0.5">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Official Committee Resolution:</span>
                  <p>{cmp.resolution}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

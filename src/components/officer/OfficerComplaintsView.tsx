import React, { useState, useEffect } from 'react';
import { Complaint, Officer } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Filter,
  Check,
  Building2,
  RefreshCw
} from 'lucide-react';
import { Modal } from '../common/Modal';

interface OfficerComplaintsViewProps {
  officer: Officer;
  centerId: string;
}

export const OfficerComplaintsView: React.FC<OfficerComplaintsViewProps> = ({
  officer,
  centerId
}) => {
  const { showToast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionText, setResolutionText] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<'Resolved' | 'Under Review'>('Resolved');
  const [isResolving, setIsResolving] = useState(false);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.getAllComplaints(centerId);
      if (res.success && res.data) {
        setComplaints(res.data);
      }
    } catch (e: any) {
      console.warn('Failed to load center complaints:', e);
      showToast(e.message || 'Failed to load complaints', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [centerId]);

  const handleOpenResolveModal = (cmp: Complaint) => {
    setSelectedComplaint(cmp);
    setResolutionText(cmp.resolution || '');
    setResolutionStatus((cmp.status as any) === 'Resolved' ? 'Resolved' : 'Resolved');
    setIsResolveModalOpen(true);
  };

  const handleSaveResolution = async () => {
    if (!selectedComplaint) return;
    if (!resolutionText.trim()) {
      showToast('Please enter resolution remarks', 'warning');
      return;
    }

    setIsResolving(true);
    try {
      const res = await api.resolveComplaint(
        selectedComplaint.id,
        resolutionStatus,
        resolutionText.trim()
      );
      if (res.success) {
        showToast(`Complaint ${selectedComplaint.complaint_number} updated to ${resolutionStatus}!`, 'success');
        setIsResolveModalOpen(false);
        setSelectedComplaint(null);
        setResolutionText('');
        fetchComplaints();
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to update complaint', 'error');
    } finally {
      setIsResolving(false);
    }
  };

  const totalCount = complaints.length;
  const pendingCount = complaints.filter((c) => c.status === 'Submitted' || c.status === 'Under Review').length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;

  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      c.complaint_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.farmer_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Pending'
        ? c.status === 'Submitted' || c.status === 'Under Review'
        : c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Center Complaints */}
        <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 block">
            Total Center Grievances
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 font-mono">
              {totalCount}
            </span>
            <span className="text-xs text-gray-400 font-bold">Filed by farmers</span>
          </div>
        </div>

        {/* Pending Action */}
        <div className="bg-rose-50/70 p-4 rounded-3xl border border-rose-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800 block">
            Pending Officer Action
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-rose-950 font-mono">
              {pendingCount}
            </span>
            <span className="text-xs text-rose-700 font-bold">Requires Redressal</span>
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-emerald-50/70 p-4 rounded-3xl border border-emerald-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
            Resolved Grievances
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono">
              {resolvedCount}
            </span>
            <span className="text-xs text-emerald-700 font-bold">Closed with remarks</span>
          </div>
        </div>
      </div>

      {/* 2. Search & Controls */}
      <div className="bg-white rounded-3xl border border-emerald-100 p-5 shadow-km-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <div>
              <h3 className="font-extrabold text-base text-km-textPrimary">
                Grievances & Problem Reports ({officer.assigned_center_name || 'Assigned Center'})
              </h3>
              <p className="text-xs text-km-textSecondary">
                Live farmer complaints routed specifically to your procurement center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracking ID / farmer..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-km-primary"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              {['All', 'Pending', 'Resolved'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === st
                      ? 'bg-white text-km-primary shadow-xs font-bold'
                      : 'text-gray-500 hover:text-km-textPrimary'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              onClick={fetchComplaints}
              className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
              title="Refresh Complaints"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 3. Complaints List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-km-primary mb-2" />
            <span>Loading complaints for {officer.assigned_center_name || 'Center'}...</span>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="py-12 text-center text-gray-400 space-y-1">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-1" />
            <h4 className="font-bold text-sm text-gray-700">No Complaints Found</h4>
            <p className="text-xs text-gray-400">
              There are currently no matching grievance reports for this center.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredComplaints.map((cmp) => {
              const isResolved = cmp.status === 'Resolved';
              const isPending = cmp.status === 'Submitted' || cmp.status === 'Under Review';

              return (
                <div
                  key={cmp.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    isResolved
                      ? 'bg-emerald-50/30 border-emerald-200'
                      : 'bg-white border-gray-200 hover:border-rose-300 shadow-2xs'
                  }`}
                >
                  {/* Top Bar: Tracking ID, Category, Status, Timestamp */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100/80 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-xs text-km-textPrimary bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">
                        {cmp.complaint_number}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                        {cmp.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[11px] text-gray-400">
                        {cmp.created_at?.substring(0, 16)}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        isResolved
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {cmp.status}
                      </span>
                    </div>
                  </div>

                  {/* Farmer Info Banner */}
                  <div className="flex items-center gap-3 text-xs bg-gray-50/80 p-2.5 rounded-xl border border-gray-200/60">
                    <div className="flex items-center gap-1.5 font-bold text-km-textPrimary">
                      <User className="w-3.5 h-3.5 text-km-primary" />
                      <span>{cmp.farmer_name || 'Farmer'}</span>
                    </div>
                    {cmp.farmer_mobile && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>+91 {cmp.farmer_mobile}</span>
                      </div>
                    )}
                  </div>

                  {/* Description & AI Summary */}
                  <div className="space-y-1 text-xs">
                    <p className="text-km-textPrimary font-medium leading-relaxed">
                      <strong>Issue:</strong> {cmp.description}
                    </p>
                    {cmp.ai_summary && (
                      <div className="flex items-start gap-1.5 bg-blue-50/60 p-2 rounded-xl border border-blue-200 text-blue-900 text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>{cmp.ai_summary}</span>
                      </div>
                    )}
                  </div>

                  {/* Evidence Photo Preview */}
                  {cmp.evidence && cmp.evidence.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Evidence:</span>
                      {cmp.evidence.map((ev, idx) => (
                        <a
                          key={idx}
                          href={ev.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group w-16 h-12 rounded-xl overflow-hidden border border-gray-300 shadow-2xs block"
                        >
                          <img src={ev.file_url} alt="evidence" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Resolution Notes if Resolved */}
                  {isResolved && cmp.resolution && (
                    <div className="bg-emerald-100/60 p-3 rounded-xl border border-emerald-300 text-xs text-emerald-950 space-y-1">
                      <div className="flex items-center gap-1 font-black text-emerald-900">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Officer Redressal Action & Resolution:</span>
                      </div>
                      <p className="font-medium leading-relaxed">{cmp.resolution}</p>
                      {cmp.resolved_at && (
                        <span className="block text-[10px] text-emerald-800/80">
                          Resolved on: {cmp.resolved_at}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Officer Action Button */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenResolveModal(cmp)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 ${
                        isResolved
                          ? 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                          : 'bg-rose-700 hover:bg-rose-800 text-white shadow-md'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{isResolved ? 'Edit Resolution' : 'Resolve Grievance'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RESOLUTION MODAL */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Resolve Grievance #{selectedComplaint?.complaint_number}</span>
          </div>
        }
        subtitle="Provide official action remarks to update the farmer and resolve this issue"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-1">
            <span className="font-bold text-gray-500 uppercase text-[10px]">Farmer's Report:</span>
            <p className="font-semibold text-km-textPrimary">{selectedComplaint?.description}</p>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-km-textPrimary">Resolution Status:</label>
            <div className="flex items-center gap-2">
              {(['Resolved', 'Under Review'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setResolutionStatus(st)}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all border ${
                    resolutionStatus === st
                      ? 'bg-km-primary text-white border-km-primary shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-km-textPrimary">Official Resolution Remarks:</label>
            <textarea
              rows={3}
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              placeholder="e.g. Weighbridge re-calibrated by quality inspector. Farmer's slot expedited and verified..."
              className="w-full p-3 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-km-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsResolveModalOpen(false)}
              className="w-1/3 py-2.5 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-km-textPrimary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveResolution}
              disabled={isResolving || !resolutionText.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              {isResolving ? 'Saving...' : 'Submit Resolution'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

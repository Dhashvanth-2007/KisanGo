import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ProcurementCenter } from '../../types';
import { Settings, Save, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface CenterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  center: ProcurementCenter | null;
  onUpdated?: () => void;
}

export const CenterSettingsModal: React.FC<CenterSettingsModalProps> = ({
  isOpen,
  onClose,
  center,
  onUpdated
}) => {
  const { showToast } = useToast();
  const [workingHours, setWorkingHours] = useState(center?.working_hours || '08:00 AM - 06:00 PM');
  const [dailyCapacity, setDailyCapacity] = useState(center?.daily_capacity || 80);
  const [status, setStatus] = useState(center?.status || 'Operating Normally');
  const [isSaving, setIsSaving] = useState(false);

  if (!center) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateCenterSettings(center.id, {
        workingHours,
        dailyCapacity,
        status
      });
      showToast('Center operational settings updated successfully', 'success');
      if (onUpdated) onUpdated();
      onClose();
    } catch (e: any) {
      showToast(e.message || 'Failed to update center settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-km-primary" />
          <span>Center Operational Settings</span>
        </div>
      }
      subtitle={center.name}
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="space-y-4 text-xs">
        <div className="space-y-1.5">
          <label className="font-bold text-km-textPrimary block">Operating Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full p-2.5 rounded-xl border border-gray-300 font-bold focus:ring-2 focus:ring-km-primary"
          >
            <option value="Operating Normally">Operating Normally (Green)</option>
            <option value="Busy">Busy / Moderate Queue (Yellow)</option>
            <option value="High Waiting Time">High Waiting Time (Red)</option>
            <option value="Temporarily Closed">Temporarily Closed</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-km-textPrimary block">Daily Farmer Capacity</label>
          <input
            type="number"
            value={dailyCapacity}
            onChange={(e) => setDailyCapacity(parseInt(e.target.value, 10) || 60)}
            className="w-full p-2.5 rounded-xl border border-gray-300 font-bold focus:ring-2 focus:ring-km-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-km-textPrimary block">Working Hours</label>
          <input
            type="text"
            value={workingHours}
            onChange={(e) => setWorkingHours(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-gray-300 font-bold focus:ring-2 focus:ring-km-primary"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 py-2.5 bg-km-primary hover:bg-km-primaryDark text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

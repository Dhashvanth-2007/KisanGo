import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Officer } from '../types';
import {
  ShieldCheck,
  User,
  Phone,
  Clock,
  Building2,
  MapPin,
  Save,
  Key,
  LogOut,
  Award,
  BarChart3,
  Scale,
  CheckCircle2,
  Layers,
  ArrowRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

interface OfficerProfilePageProps {
  onNavigateToDashboard?: () => void;
}

export const OfficerProfilePage: React.FC<OfficerProfilePageProps> = ({ onNavigateToDashboard }) => {
  const { user, updateUser, logout } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const officer = user as Officer;

  // Form State
  const [name, setName] = useState(officer?.name || 'M. Rajeshwari');
  const [designation, setDesignation] = useState(officer?.designation || 'District Procurement Superintendent');
  const [officialContact, setOfficialContact] = useState(officer?.official_contact || '+91 94433 12345');
  const [workingHours, setWorkingHours] = useState(officer?.working_hours || '08:30 AM - 05:30 PM');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Center & Dashboard Stats
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const centerId = officer?.assigned_center_id || 'center-b';

  const loadOfficerData = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.getOfficerDashboard(centerId);
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Failed to load officer dashboard:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (officer) {
      setName(officer.name || 'M. Rajeshwari');
      setDesignation(officer.designation || 'District Procurement Superintendent');
      setOfficialContact(officer.official_contact || '+91 94433 12345');
      setWorkingHours(officer.working_hours || '08:30 AM - 05:30 PM');
    }
    loadOfficerData();
  }, [officer?.id, centerId]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('Officer name is required', 'warning');
      return;
    }

    if (password && password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        id: officer?.id || 'officer-b',
        name: name.trim(),
        designation: designation.trim(),
        official_contact: officialContact.trim(),
        working_hours: workingHours.trim()
      };

      if (password) {
        payload.password = password;
      }

      const res = await api.updateOfficerProfile(payload);
      if (res.success && res.user) {
        updateUser(res.user);
        setPassword('');
        setConfirmPassword('');
        showToast('Officer credentials & profile updated successfully!', 'success');
      } else {
        showToast(res.message || 'Failed to update profile', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update officer profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const center = dashboardData?.center || officer?.center;
  const stats = dashboardData?.stats;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-28">
      {/* Officer Header Card */}
      <div className="bg-gradient-to-r from-amber-800 via-amber-700 to-emerald-900 rounded-3xl p-6 text-white shadow-km-md relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/20 backdrop-blur-md border-2 border-amber-300/50 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-inner">
              <ShieldCheck className="w-10 h-10 text-amber-200" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-amber-400/30 text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300/40">
                  ID: {officer?.officer_id || 'OFFICER-B'}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider bg-emerald-400/30 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-300/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Authorized Officer
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{name}</h2>
              <p className="text-xs text-amber-100/90 font-medium flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>{designation}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToDashboard && (
              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-bold text-white flex items-center gap-1.5 transition-all border border-white/30"
              >
                <span>Live Operations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="p-2.5 rounded-2xl bg-black/30 hover:bg-rose-600/80 text-white transition-colors"
              title="Logout Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Officer Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-amber-600" />
            Farmers Today
          </span>
          <div className="text-2xl font-black text-km-textPrimary font-mono">
            {stats?.totalFarmers || 12}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold block">
            ✓ {stats?.completedFarmers || 4} Procured
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-km-primary" />
            Grain Procured
          </span>
          <div className="text-2xl font-black text-km-primary font-mono">
            {((stats?.totalQuantityKg || 12400) / 1000).toFixed(1)} MT
          </div>
          <span className="text-[10px] text-gray-400">
            {(stats?.totalQuantityKg || 12400).toLocaleString()} kg recorded
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            Bay Capacity
          </span>
          <div className="text-2xl font-black text-blue-900 font-mono">
            {stats?.currentCapacity || 64}/{stats?.dailyCapacity || 80}
          </div>
          <span className="text-[10px] text-blue-600 font-medium">Vehicles / Day</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-purple-600" />
            Center Code
          </span>
          <div className="text-lg font-black text-purple-950 font-mono truncate">
            {center?.code || 'DPC-KLP-02'}
          </div>
          <span className="text-[10px] text-purple-700 truncate block">
            {center?.district || 'Tiruvannamalai'}
          </span>
        </div>
      </div>

      {/* Main Profile Edit Form & Center Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Editable Officer Profile Form */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-emerald-100 p-6 shadow-km-sm space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-km-textPrimary flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600" />
                <span>Officer Account & Duty Details</span>
              </h3>
              <p className="text-xs text-km-textSecondary">
                Manage your government designation, official contact, and station hours.
              </p>
            </div>
            <button
              type="button"
              onClick={loadOfficerData}
              className="p-2 text-gray-400 hover:text-km-primary rounded-xl hover:bg-gray-50 transition-colors"
              title="Reload"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-km-textPrimary focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="e.g. M. Rajeshwari"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-gray-400" />
                  <span>Designation / Role</span>
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-km-textPrimary focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="e.g. District Procurement Superintendent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>Official Contact Number</span>
                </label>
                <input
                  type="text"
                  value={officialContact}
                  onChange={(e) => setOfficialContact(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-km-textPrimary focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="+91 94433 12345"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Duty Working Hours</span>
                </label>
                <input
                  type="text"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-km-textPrimary focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="08:30 AM - 05:30 PM"
                  required
                />
              </div>
            </div>

            {/* Change Access Password */}
            <div className="pt-3 border-t border-gray-100 space-y-3">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-600" />
                <span>Security & Password (Optional)</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New Password (leave empty to keep current)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-km-textPrimary focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-km-textPrimary focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Officer Profile'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right 1 Col: Assigned Center Info Box */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-emerald-100 p-5 shadow-km-sm space-y-4">
            <h4 className="font-bold text-sm text-km-textPrimary flex items-center gap-2">
              <Building2 className="w-4 h-4 text-km-primary" />
              <span>Stationed Center</span>
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-800">Assigned Facility</span>
                <p className="font-bold text-sm text-emerald-950">{center?.name || 'Kilpennathur DPC'}</p>
                <p className="text-[11px] text-emerald-700 flex items-start gap-1">
                  <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{center?.address || 'SH-4A, Tiruvannamalai'}</span>
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] py-1 border-b border-gray-100">
                  <span className="text-gray-500">Center Code:</span>
                  <span className="font-mono font-bold text-km-textPrimary">{center?.code || 'DPC-KLP-02'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] py-1 border-b border-gray-100">
                  <span className="text-gray-500">Operating Status:</span>
                  <span className="font-bold text-emerald-700">{center?.status || 'Operating Normally'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] py-1 border-b border-gray-100">
                  <span className="text-gray-500">Daily Capacity:</span>
                  <span className="font-bold text-km-textPrimary">{center?.daily_capacity || 80} Vehicles</span>
                </div>
                <div className="flex items-center justify-between text-[11px] py-1">
                  <span className="text-gray-500">Working Hours:</span>
                  <span className="font-bold text-km-textPrimary">{center?.working_hours || '08:30 AM - 05:30 PM'}</span>
                </div>
              </div>
            </div>

            {onNavigateToDashboard && (
              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-emerald-50 text-km-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-gray-200"
              >
                <span>Open Operations Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

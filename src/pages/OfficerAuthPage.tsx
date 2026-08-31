import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { ProcurementCenter } from '../types';
import {
  ShieldCheck,
  Lock,
  User,
  Phone,
  Building2,
  Clock,
  Award,
  ArrowLeft,
  ArrowRight,
  UserPlus,
  LogIn,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface OfficerAuthPageProps {
  onBack: () => void;
}

export const OfficerAuthPage: React.FC<OfficerAuthPageProps> = ({ onBack }) => {
  const { loginAsOfficer, quickDemoOfficerLogin } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  // Mode: 'login' or 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login Form State
  const [loginId, setLoginId] = useState('OFFICER-B');
  const [loginPassword, setLoginPassword] = useState('password123');

  // Register Form State
  const [regOfficerId, setRegOfficerId] = useState('');
  const [regName, setRegName] = useState('');
  const [regDesignation, setRegDesignation] = useState('Senior Procurement Officer');
  const [regContact, setRegContact] = useState('');
  const [regCenterId, setRegCenterId] = useState('center-b');
  const [regWorkingHours, setRegWorkingHours] = useState('08:30 AM - 05:30 PM');
  const [regPassword, setRegPassword] = useState('password123');

  // Center list for selection
  const [centers, setCenters] = useState<ProcurementCenter[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load live centers for dropdown
    api.getCenters().then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setCenters(res.data);
        if (!regCenterId) {
          setRegCenterId(res.data[0].id);
        }
      }
    }).catch((err) => console.warn('Could not load centers:', err));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !loginPassword.trim()) {
      showToast('Please enter your Officer ID and Password', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.officerLogin(loginId.trim(), loginPassword.trim());
      if (res.success && res.user) {
        showToast(`Welcome back, Officer ${res.user.name}!`, 'success');
        loginAsOfficer(res.user, res.token);
      } else {
        showToast(res.message || 'Invalid Officer Credentials. Try registering below.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regOfficerId.trim()) {
      showToast('Please enter a Government Officer ID', 'warning');
      return;
    }
    if (!regName.trim()) {
      showToast('Please enter Officer Full Name', 'warning');
      return;
    }
    if (!regCenterId) {
      showToast('Please select an assigned procurement center', 'warning');
      return;
    }
    if (!regPassword) {
      showToast('Please enter an account password', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.registerOfficer({
        officerId: regOfficerId.trim(),
        name: regName.trim(),
        designation: regDesignation.trim(),
        assignedCenterId: regCenterId,
        officialContact: regContact.trim() || '+91 94433 00000',
        workingHours: regWorkingHours.trim(),
        password: regPassword.trim()
      });

      if (res.success && res.user) {
        showToast(`Officer ${res.user.name} successfully registered!`, 'success');
        loginAsOfficer(res.user, res.token);
      } else {
        showToast(res.message || 'Registration failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-km-bg flex flex-col justify-center p-4 sm:p-6 py-10">
      <div className="max-w-md w-full mx-auto bg-white rounded-3xl border border-amber-200 shadow-km-md p-6 sm:p-8 space-y-6">
        {/* Header & Logo */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white border border-amber-200 flex items-center justify-center p-0.5 shadow-2xs overflow-hidden">
              <img src="/logo.png" alt="Kisan Go Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-sm text-km-textPrimary">Procurement Officer Portal</span>
          </div>
          <div className="w-8" />
        </div>

        {/* Tab Switcher: Login vs Register */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'login'
                ? 'bg-white text-amber-900 shadow-sm'
                : 'text-gray-600 hover:text-amber-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Officer Login</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'register'
                ? 'bg-white text-amber-900 shadow-sm'
                : 'text-gray-600 hover:text-amber-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New Officer Register</span>
          </button>
        </div>

        {/* MODE 1: LOGIN FORM */}
        {authMode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-km-textPrimary">Authorized Officer Sign In</h2>
              <p className="text-xs text-km-textSecondary">
                Enter your Officer ID or registered phone number to manage live bay queue
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-km-textPrimary">{t('officer_id')}</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="e.g. OFFICER-B or Mobile"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-km-textPrimary">{t('password')}</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Center Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Switch to Register */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline"
              >
                Need to register a new Officer profile? Click here
              </button>
            </div>

            {/* 1-Click Fast Switch Buttons */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 block text-center">
                ⚡ 1-Click Demo Center Logins
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                <button
                  type="button"
                  onClick={() => quickDemoOfficerLogin('OFFICER-A')}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-amber-100 text-km-textPrimary font-bold truncate"
                >
                  Center A
                </button>
                <button
                  type="button"
                  onClick={() => quickDemoOfficerLogin('OFFICER-B')}
                  className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold border border-amber-300 truncate"
                >
                  Center B (DPC)
                </button>
                <button
                  type="button"
                  onClick={() => quickDemoOfficerLogin('OFFICER-C')}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-amber-100 text-km-textPrimary font-bold truncate"
                >
                  Center C
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* MODE 2: REGISTRATION FORM (Like Farmer Details Registration) */
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300 mb-0.5">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>New Officer Onboarding</span>
              </div>
              <h2 className="text-xl font-bold text-km-textPrimary">Register Officer Profile</h2>
              <p className="text-xs text-km-textSecondary">
                Create your official government account to oversee weighing & procurement
              </p>
            </div>

            {/* Officer ID & Full Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-km-textPrimary flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Officer ID / Code</span>
                </label>
                <input
                  type="text"
                  value={regOfficerId}
                  onChange={(e) => setRegOfficerId(e.target.value)}
                  placeholder="e.g. OFF-8492"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-km-textPrimary flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Dr. K. Rajeshwari"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            {/* Designation & Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-km-textPrimary flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-gray-400" />
                  <span>Designation</span>
                </label>
                <input
                  type="text"
                  value={regDesignation}
                  onChange={(e) => setRegDesignation(e.target.value)}
                  placeholder="e.g. Procurement Superintendent"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-km-textPrimary flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>Official Mobile Number</span>
                </label>
                <input
                  type="tel"
                  value={regContact}
                  onChange={(e) => setRegContact(e.target.value)}
                  placeholder="e.g. 9443312345"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            {/* Assigned Center Selection Dropdown */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-km-textPrimary flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Stationed Procurement Center</span>
              </label>
              <select
                value={regCenterId}
                onChange={(e) => setRegCenterId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                required
              >
                {centers.length > 0 ? (
                  centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code || c.district})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="center-b">Kilpennathur Direct Purchase Center (Center B)</option>
                    <option value="center-a">Thiruvannamalai Regulated Market (Center A)</option>
                    <option value="center-c">Polur Regulated Market (Center C)</option>
                  </>
                )}
              </select>
            </div>

            {/* Working Hours & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-km-textPrimary flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Duty Working Hours</span>
                </label>
                <input
                  type="text"
                  value={regWorkingHours}
                  onChange={(e) => setRegWorkingHours(e.target.value)}
                  placeholder="08:30 AM - 05:30 PM"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-km-textPrimary flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Access Password</span>
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition-all disabled:opacity-50 pt-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isLoading ? 'Registering...' : 'Register & Launch Officer Station'}</span>
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="text-xs font-bold text-gray-500 hover:text-km-primary hover:underline"
              >
                Already have an officer account? Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

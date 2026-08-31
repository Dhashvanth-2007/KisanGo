import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { LanguageCode, FarmerPayment } from '../types';
import { FarmerPaymentHistory } from '../components/payment/FarmerPaymentHistory';
import {
  User,
  Phone,
  MapPin,
  Globe,
  Wheat,
  ShieldCheck,
  CreditCard,
  Save,
  Navigation,
  LogOut,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  FileText,
  DollarSign,
  Scale
} from 'lucide-react';

interface FarmerProfilePageProps {
  onNavigateToTab?: (tab: string) => void;
}

export const FarmerProfilePage: React.FC<FarmerProfilePageProps> = ({ onNavigateToTab }) => {
  const { user, updateUser, logout } = useAuth();
  const { language, setLanguage, languagesList, t } = useLanguage();
  const { showToast } = useToast();

  const farmer = user && 'mobile' in user ? user : null;

  // Active Subtab inside Profile: 'details' or 'billing'
  const [profileTab, setProfileTab] = useState<'details' | 'billing'>('details');

  // Form State
  const [name, setName] = useState(user?.name || '');
  const [mobile, setMobile] = useState(farmer?.mobile || '9876543210');
  const [village, setVillage] = useState(farmer?.village || 'Vengikkal Village');
  const [district, setDistrict] = useState(farmer?.district || 'Tiruvannamalai');
  const [state, setState] = useState(farmer?.state || 'Tamil Nadu');
  const [latitude, setLatitude] = useState<number>(farmer?.latitude || 12.2253);
  const [longitude, setLongitude] = useState<number>(farmer?.longitude || 79.0747);
  const [preferredLang, setPreferredLang] = useState<LanguageCode>(
    (farmer?.language as LanguageCode) || language || 'Tamil'
  );

  // Farming preferences
  const [landHolding, setLandHolding] = useState('4.5');
  const [selectedCrops, setSelectedCrops] = useState<string[]>([
    'Paddy (Common / நெல்)',
    'Paddy (Grade A / முதல் தரம் நெல்)'
  ]);

  // Payment & Billing History State
  const [payments, setPayments] = useState<FarmerPayment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Fetch billing history for this farmer
  const fetchPayments = async () => {
    setIsLoadingPayments(true);
    try {
      const res = await api.getFarmerPayments(user?.id || 'farmer-1');
      if (res.success && res.data) {
        setPayments(res.data);
      }
    } catch (err) {
      console.error('Failed to load farmer payments:', err);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [user?.id]);

  // Keep state synced if user changes in context
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      if ('mobile' in user) {
        setMobile(user.mobile || '');
        setVillage(user.village || 'Vengikkal Village');
        setDistrict(user.district || 'Tiruvannamalai');
        setState(user.state || 'Tamil Nadu');
        if (user.latitude) setLatitude(user.latitude);
        if (user.longitude) setLongitude(user.longitude);
        if (user.language) setPreferredLang(user.language as LanguageCode);
      }
    }
  }, [user]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'warning');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(parseFloat(pos.coords.latitude.toFixed(4)));
        setLongitude(parseFloat(pos.coords.longitude.toFixed(4)));
        showToast('GPS location updated from device sensors!', 'success');
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geo error:', err);
        showToast('Using default center coordinates (Tiruvannamalai)', 'info');
        setLatitude(12.2253);
        setLongitude(79.0747);
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  };

  const handleToggleCrop = (cropName: string) => {
    setSelectedCrops((prev) =>
      prev.includes(cropName) ? prev.filter((c) => c !== cropName) : [...prev, cropName]
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter your full name', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.updateFarmerProfile({
        id: user?.id || 'farmer-1',
        name: name.trim(),
        mobile: mobile.trim(),
        language: preferredLang,
        village: village.trim(),
        district: district.trim(),
        state: state.trim(),
        latitude,
        longitude
      });

      if (res.success && res.user) {
        updateUser(res.user);
        setLanguage(preferredLang);
        showToast('Profile updated successfully!', 'success');
      } else {
        showToast(res.message || 'Failed to update profile', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const availableCropsList = [
    'Paddy (Common / நெல்)',
    'Paddy (Grade A / முதல் தரம் நெல்)',
    'Maize (மக்காச்சோளம்)',
    'Groundnut (நிலக்கடலை)',
    'Ragi (கேழ்வரகு)',
    'Black Gram / Urad (உளுந்து)'
  ];

  // Totals for Billing Metrics
  const totalAmountReceived = payments.reduce((acc, p) => acc + (p.net_amount || p.amount || 0), 0);
  const totalQuantityKg = payments.reduce((acc, p) => acc + (p.actual_quantity || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-28">
      {/* Header Profile Hero */}
      <div className="bg-gradient-to-r from-emerald-800 via-km-primary to-teal-700 rounded-3xl p-6 text-white shadow-km-md relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-inner">
              {name ? name.charAt(0).toUpperCase() : 'F'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full border border-white/30">
                  PM-KISAN ID: TN-TVM-8492
                </span>
                <span className="text-xs font-bold uppercase tracking-wider bg-amber-400/30 text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Verified Farmer
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{name || 'Farmer Profile'}</h2>
              <p className="text-xs text-emerald-100/90 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>
                  {village}, {district}, {state}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={logout}
              className="p-2.5 rounded-2xl bg-white/15 hover:bg-rose-600/80 text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Top Overview Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-km-primary" />
            {t('total_dbt_credited')}
          </span>
          <div className="text-xl sm:text-2xl font-black text-km-primary font-mono">
            ₹{totalAmountReceived.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold block">
            ✓ {t('direct_dbt_payout')}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-amber-600" />
            {t('total_grain_sold')}
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-900 font-mono">
            {(totalQuantityKg / 100).toFixed(1)} Qtl
          </div>
          <span className="text-[10px] text-gray-400">
            {totalQuantityKg.toLocaleString()} kg
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            {t('verified_bills')}
          </span>
          <div className="text-xl sm:text-2xl font-black text-blue-900 font-mono">
            {payments.length}
          </div>
          <span className="text-[10px] text-blue-600 font-medium">Receipts</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            {t('land_area')}
          </span>
          <div className="text-xl sm:text-2xl font-black text-purple-950 font-mono">
            {landHolding} Acres
          </div>
          <span className="text-[10px] text-purple-700">Registered</span>
        </div>
      </div>

      {/* Navigation Switcher between Details and Billing History */}
      <div className="flex items-center gap-2 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200">
        <button
          type="button"
          onClick={() => setProfileTab('details')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            profileTab === 'details'
              ? 'bg-white text-km-primary shadow-sm'
              : 'text-gray-600 hover:text-km-primary'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{t('farmer_details')}</span>
        </button>
        <button
          type="button"
          onClick={() => setProfileTab('billing')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            profileTab === 'billing'
              ? 'bg-white text-km-primary shadow-sm'
              : 'text-gray-600 hover:text-km-primary'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t('billing_dbt_history')} ({payments.length})</span>
        </button>
      </div>

      {/* Tab 1: Farmer Details & Form */}
      {profileTab === 'details' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="bg-white rounded-3xl border border-emerald-100 p-6 shadow-km-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-km-textPrimary flex items-center gap-2">
                  <User className="w-4 h-4 text-km-primary" />
                  <span>Personal & Contact Information</span>
                </h3>
                <p className="text-xs text-km-textSecondary">
                  Enter your official name and mobile number for procurement receipts and digital tokens.
                </p>
              </div>
            </div>

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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-km-textPrimary focus:ring-2 focus:ring-km-primary focus:outline-none"
                  placeholder="e.g. Ravi Kumar"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>Registered Mobile Number</span>
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-km-textPrimary focus:ring-2 focus:ring-km-primary focus:outline-none"
                  placeholder="10-digit mobile number"
                  required
                />
              </div>
            </div>

            {/* Preferred Language Selector */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-gray-400" />
                <span>Preferred Language for Voice AI & Interface</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {languagesList.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setPreferredLang(lang.code as LanguageCode)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      preferredLang === lang.code
                        ? 'bg-km-primary text-white shadow-sm'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {lang.native} ({lang.label})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Location & GPS Settings */}
          <div className="bg-white rounded-3xl border border-emerald-100 p-6 shadow-km-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-km-textPrimary flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-km-primary" />
                  <span>Village & Farm Location</span>
                </h3>
                <p className="text-xs text-km-textSecondary">
                  Used by AI to calculate accurate road distance, travel duration, and departure warnings.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-km-primary text-xs font-bold flex items-center gap-1.5 border border-emerald-200 transition-colors"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Detecting GPS...' : 'Detect Live GPS'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Village / Town</label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-km-textPrimary focus:ring-2 focus:ring-km-primary focus:outline-none"
                  placeholder="e.g. Vengikkal"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">District</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-km-textPrimary focus:ring-2 focus:ring-km-primary focus:outline-none"
                  placeholder="e.g. Tiruvannamalai"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-km-textPrimary focus:ring-2 focus:ring-km-primary focus:outline-none"
                  placeholder="Tamil Nadu"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                <span className="text-gray-500 font-medium">Latitude:</span>
                <span className="font-mono font-bold text-km-textPrimary">{latitude}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                <span className="text-gray-500 font-medium">Longitude:</span>
                <span className="font-mono font-bold text-km-textPrimary">{longitude}</span>
              </div>
            </div>
          </div>

          {/* Farm Details & Preferred Crops */}
          <div className="bg-white rounded-3xl border border-emerald-100 p-6 shadow-km-sm space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-bold text-base text-km-textPrimary flex items-center gap-2">
                <Wheat className="w-4 h-4 text-amber-600" />
                <span>Agricultural Crops & Land Holding</span>
              </h3>
              <p className="text-xs text-km-textSecondary">
                Select the commodities you cultivate for tailored procurement centers and slot recommendations.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Total Cultivated Area (in Acres)</label>
              <input
                type="number"
                step="0.1"
                value={landHolding}
                onChange={(e) => setLandHolding(e.target.value)}
                className="w-full sm:w-1/2 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-km-textPrimary focus:ring-2 focus:ring-km-primary focus:outline-none"
                placeholder="4.5"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">Primary Crops:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableCropsList.map((crop) => {
                  const isSelected = selectedCrops.includes(crop);
                  return (
                    <button
                      key={crop}
                      type="button"
                      onClick={() => handleToggleCrop(crop)}
                      className={`p-3 rounded-2xl text-left text-xs font-semibold flex items-center justify-between border transition-all ${
                        isSelected
                          ? 'bg-emerald-50/80 border-km-primary text-km-primary font-bold shadow-2xs'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-200'
                      }`}
                    >
                      <span>{crop}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-km-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-km-primary hover:bg-km-primaryDark text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? '...' : t('save_profile')}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Billing & DBT Payment History */}
      {profileTab === 'billing' && (
        <div className="space-y-6">
          <FarmerPaymentHistory payments={payments} />
        </div>
      )}
    </div>
  );
};

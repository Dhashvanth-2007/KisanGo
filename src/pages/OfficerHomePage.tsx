import React, { useState, useEffect } from 'react';
import { Officer, Booking } from '../types';
import { OfficerDashboard } from '../components/officer/OfficerDashboard';
import { TodayFarmersList } from '../components/officer/TodayFarmersList';
import { ProcessFarmerModal } from '../components/officer/ProcessFarmerModal';
import { CenterSettingsModal } from '../components/officer/CenterSettingsModal';
import { OfficerSlotManagement } from '../components/officer/OfficerSlotManagement';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Users, Layers, Sliders, Calendar } from 'lucide-react';

interface OfficerHomePageProps {
  onNavigateToProfile?: () => void;
}

export const OfficerHomePage: React.FC<OfficerHomePageProps> = ({ onNavigateToProfile }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const officer = user as Officer;

  const [activeTab, setActiveTab] = useState<'operations' | 'slots'>('operations');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedFarmer, setSelectedFarmer] = useState<Booking | null>(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const centerId = officer?.assigned_center_id || 'center-b';

  const fetchDashboard = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.getOfficerDashboard(centerId);
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, [centerId]);

  const handleVerifyFarmer = async (farmer: Booking) => {
    try {
      const res = await api.verifyFarmer(farmer.id);
      if (res.success) {
        showToast(`Farmer ${farmer.token_number} called to bay!`, 'success');
        fetchDashboard();
      }
    } catch (e: any) {
      showToast(e.message || 'Verification failed', 'error');
    }
  };

  const handleStartProcessing = (farmer: Booking) => {
    setSelectedFarmer(farmer);
    setIsProcessModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* Officer View Mode Switcher Tab Bar */}
      <div className="flex items-center justify-between bg-white p-2 rounded-3xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('operations')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
              activeTab === 'operations'
                ? 'bg-km-primary text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100 hover:text-km-textPrimary'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Live Bay & Queue Operations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('slots')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
              activeTab === 'slots'
                ? 'bg-km-primary text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100 hover:text-km-textPrimary'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1-Hour Slot & Schedule Management</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-gray-500 pr-2">
          <span>Center: <strong>{officer?.assigned_center_name || 'Kilpennathur DPC'}</strong></span>
        </div>
      </div>

      {/* TAB 1: LIVE OPERATIONS & QUEUE */}
      {activeTab === 'operations' && (
        <div className="space-y-6">
          {officer && (
            <OfficerDashboard
              officer={officer}
              stats={
                dashboardData?.stats || {
                  totalFarmers: 0,
                  waitingFarmers: 0,
                  currentlyProcessing: 0,
                  completedFarmers: 0,
                  totalQuantityKg: 0,
                  dailyCapacity: 80,
                  currentCapacity: 64
                }
              }
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              onRefresh={fetchDashboard}
              isRefreshing={isRefreshing}
            />
          )}

          {/* Today's Farmers Queue Table */}
          <TodayFarmersList
            farmers={dashboardData?.farmers || []}
            onProcessFarmer={handleStartProcessing}
            onVerifyFarmer={handleVerifyFarmer}
          />
        </div>
      )}

      {/* TAB 2: 1-HOUR SLOT & SCHEDULE MANAGEMENT */}
      {activeTab === 'slots' && (
        <OfficerSlotManagement officer={officer} centerId={centerId} />
      )}

      {/* PROCESS FARMER MODAL */}
      <ProcessFarmerModal
        isOpen={isProcessModalOpen}
        onClose={() => {
          setIsProcessModalOpen(false);
          setSelectedFarmer(null);
        }}
        farmer={selectedFarmer}
        onProcessed={fetchDashboard}
      />

      {/* CENTER SETTINGS MODAL */}
      <CenterSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        center={dashboardData?.center || null}
        onUpdated={fetchDashboard}
      />
    </div>
  );
};

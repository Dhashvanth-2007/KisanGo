import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { VoiceAssistantModal } from './components/voice/VoiceAssistantModal';
import { ReportProblemModal } from './components/complaint/ReportProblemModal';

import { RoleSelectPage } from './pages/RoleSelectPage';
import { FarmerAuthPage } from './pages/FarmerAuthPage';
import { OfficerAuthPage } from './pages/OfficerAuthPage';
import { FarmerHomePage } from './pages/FarmerHomePage';
import { FindCenterPage } from './pages/FindCenterPage';
import { MySlotPage } from './pages/MySlotPage';
import { FarmerProfilePage } from './pages/FarmerProfilePage';
import { HelpPage } from './pages/HelpPage';
import { OfficerHomePage } from './pages/OfficerHomePage';
import { OfficerProfilePage } from './pages/OfficerProfilePage';

import { ProcurementCenter, Booking, NotificationItem } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const { user, role, isAuthenticated } = useAuth();
  const { language } = useLanguage();

  // Navigation and Auth screens
  const [authScreen, setAuthScreen] = useState<'role' | 'farmer_login' | 'officer_login'>('role');
  const [activeTab, setActiveTab] = useState<'home' | 'find-center' | 'my-slot' | 'profile' | 'help'>('home');
  const [officerTab, setOfficerTab] = useState<'dashboard' | 'profile'>('dashboard');

  // Modals
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isReportProblemOpen, setIsReportProblemOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // App Data
  const [centers, setCenters] = useState<ProcurementCenter[]>([]);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Fetch Procurement Centers
  const fetchCenters = async () => {
    try {
      const lat = user && 'latitude' in user && user.latitude ? user.latitude : 12.2253;
      const lng = user && 'longitude' in user && user.longitude ? user.longitude : 79.0747;
      const res = await api.getCenters(lat, lng);
      if (res.success && res.data) {
        setCenters(res.data);
      }
    } catch (e) {
      console.error('Failed to load centers:', e);
    }
  };

  // Fetch Farmer Active Booking
  const fetchActiveBooking = async () => {
    if (!user || role !== 'farmer') return;
    try {
      const res = await api.getFarmerActiveBooking(user.id);
      if (res.success) {
        setActiveBooking(res.data);
      }
    } catch (e) {
      console.error('Failed to load active booking:', e);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && role === 'farmer') {
      fetchActiveBooking();
      const interval = setInterval(fetchActiveBooking, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, role, user]);

  // Demo Notifications
  useEffect(() => {
    setNotifications([
      {
        id: '1',
        user_id: user?.id || '1',
        user_type: role || 'farmer',
        title: 'Kilpennathur DPC: Fast Express Unloading',
        message: 'Center B has only 15 min waiting time today with dual 60MT digital weighbridges.',
        type: 'info',
        read: 0,
        created_at: 'Just now'
      },
      {
        id: '2',
        user_id: user?.id || '1',
        user_type: role || 'farmer',
        title: 'DBT Payment Completed ₹58,000',
        message: 'Consignment bill KM-BILL-2026-8941 credited via DBT (UTR: RBI-DBT-20260826901844).',
        type: 'payment',
        read: 1,
        created_at: '2 days ago'
      }
    ]);
  }, [user, role]);

  // Unauthenticated screen routing
  if (!isAuthenticated) {
    if (authScreen === 'farmer_login') {
      return <FarmerAuthPage onBack={() => setAuthScreen('role')} />;
    }
    if (authScreen === 'officer_login') {
      return <OfficerAuthPage onBack={() => setAuthScreen('role')} />;
    }
    return (
      <RoleSelectPage
        onSelectFarmer={() => setAuthScreen('farmer_login')}
        onSelectOfficer={() => setAuthScreen('officer_login')}
      />
    );
  }

  // Officer View
  if (role === 'officer') {
    return (
      <div className="min-h-screen flex flex-col bg-km-bg">
        <Header
          onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
          onNavigateToProfile={() => setOfficerTab('profile')}
          unreadCount={notifications.filter((n) => !n.read).length}
        />

        {/* Officer Navigation Switcher Bar */}
        <div className="bg-white border-b border-amber-100 shadow-2xs">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOfficerTab('dashboard')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  officerTab === 'dashboard'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>⚡ Live Bay Operations</span>
              </button>
              <button
                type="button"
                onClick={() => setOfficerTab('profile')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  officerTab === 'profile'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>🛡️ Officer Profile & Station</span>
              </button>
            </div>

            <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 hidden sm:inline">
              {(user as any)?.officer_id || 'OFFICER-B'} • {(user as any)?.name}
            </span>
          </div>
        </div>

        <main className="flex-1">
          {officerTab === 'dashboard' ? (
            <OfficerHomePage onNavigateToProfile={() => setOfficerTab('profile')} />
          ) : (
            <OfficerProfilePage onNavigateToDashboard={() => setOfficerTab('dashboard')} />
          )}
        </main>

        <NotificationDrawer
          isOpen={isNotificationDrawerOpen}
          onClose={() => setIsNotificationDrawerOpen(false)}
          notifications={notifications}
          onMarkAllAsRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })))}
        />
      </div>
    );
  }

  // Farmer View
  return (
    <div className="min-h-screen flex flex-col bg-km-bg">
      <Header
        onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        onNavigateToProfile={() => setActiveTab('profile')}
        unreadCount={notifications.filter((n) => !n.read).length}
      />

      <main className="flex-1">
        {activeTab === 'home' && (
          <FarmerHomePage
            activeBooking={activeBooking}
            recommendedCenter={centers.find((c) => c.ai_recommended) || centers[0] || null}
            onNavigate={(tab) => setActiveTab(tab as any)}
            onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
            onOpenReportProblem={() => setIsReportProblemOpen(true)}
          />
        )}

        {activeTab === 'find-center' && (
          <FindCenterPage
            centers={centers}
            onBookingSuccess={() => {
              fetchActiveBooking();
              setActiveTab('my-slot');
            }}
            onRefreshCenters={fetchCenters}
          />
        )}

        {activeTab === 'my-slot' && (
          <MySlotPage
            booking={activeBooking}
            onNavigateToFindCenter={() => setActiveTab('find-center')}
            onRefreshBooking={fetchActiveBooking}
          />
        )}

        {activeTab === 'profile' && (
          <FarmerProfilePage onNavigateToTab={(tab) => setActiveTab(tab as any)} />
        )}

        {activeTab === 'help' && <HelpPage />}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={(tab) => setActiveTab(tab as any)} />

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onNavigate={(route) => {
          if (route === '/find-center') setActiveTab('find-center');
          else if (route === '/my-slot') setActiveTab('my-slot');
          else if (route === '/profile') setActiveTab('profile');
          else if (route === '/help') setActiveTab('help');
        }}
      />

      {/* Report Problem Modal */}
      <ReportProblemModal
        isOpen={isReportProblemOpen}
        onClose={() => setIsReportProblemOpen(false)}
      />

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })))}
      />
    </div>
  );
};

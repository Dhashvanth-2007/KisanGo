import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Sprout, Globe, Bell, User, LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import { LanguageCode } from '../../types';

interface HeaderProps {
  onOpenVoiceAssistant?: () => void;
  onOpenNotifications?: () => void;
  onNavigateToProfile?: () => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenVoiceAssistant,
  onOpenNotifications,
  onNavigateToProfile,
  unreadCount = 2
}) => {
  const { user, role, logout } = useAuth();
  const { language, setLanguage, languagesList, t } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-km-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-md shadow-emerald-700/15 overflow-hidden border border-emerald-100 p-0.5">
            <img src="/logo.png" alt="Kisan Go Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl text-km-primary tracking-tight">
                {t('app_name')}
              </span>
              {role === 'officer' ? (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                  OFFICER
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                  FARMER
                </span>
              )}
            </div>
            <p className="text-[11px] text-km-textSecondary hidden sm:block">
              {t('tagline')}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Voice Assistant Shortcut Button */}
          {role === 'farmer' && onOpenVoiceAssistant && (
            <button
              onClick={onOpenVoiceAssistant}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-emerald-600 text-white text-xs font-bold shadow-sm hover:opacity-95 transition-all transform hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden md:inline">{t('voice_assistant_btn')}</span>
              <span className="md:hidden">AI Voice</span>
            </button>
          )}

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-km-hoverBg text-xs font-semibold text-km-textPrimary transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-km-primary" />
              <span>{languagesList.find((l) => l.code === language)?.native || language}</span>
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  Select Language
                </div>
                {languagesList.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code as LanguageCode);
                      setShowLangMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-km-hoverBg transition-colors ${
                      language === lang.code ? 'font-bold text-km-primary bg-emerald-50/70' : 'text-km-textPrimary'
                    }`}
                  >
                    <span>{lang.native}</span>
                    <span className="text-[11px] text-gray-400">{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Button */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl border border-gray-200 bg-white hover:bg-km-hoverBg text-km-textPrimary transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 text-km-textSecondary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-sm">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          {/* User Profile / Logout */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-xs font-semibold text-km-primary transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-km-primary text-white flex items-center justify-center font-bold text-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="hidden sm:inline max-w-[100px] truncate">{user?.name || 'Profile'}</span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-bold text-km-textPrimary truncate">{user?.name}</p>
                  <p className="text-[11px] text-km-textSecondary truncate">
                    {role === 'officer'
                      ? (user as any)?.designation || 'Procurement Officer'
                      : (user as any)?.mobile ? `+91 ${(user as any)?.mobile}` : 'Farmer'}
                  </p>
                </div>

                {onNavigateToProfile && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigateToProfile();
                    }}
                    className="w-full mt-1.5 px-3 py-2 text-xs font-semibold text-km-primary hover:bg-emerald-50 rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{role === 'officer' ? 'Officer Profile' : t('my_profile')}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full mt-1 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

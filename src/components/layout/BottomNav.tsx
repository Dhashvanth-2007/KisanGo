import React from 'react';
import { Home, MapPin, Ticket, User, HelpCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useLanguage();

  const navItems = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'find-center', label: t('find_center'), icon: MapPin },
    { id: 'my-slot', label: t('my_slot'), icon: Ticket },
    { id: 'profile', label: t('profile'), icon: User },
    { id: 'help', label: t('help'), icon: HelpCircle }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-emerald-100 shadow-[0_-4px_16px_rgba(46,125,50,0.08)] py-1.5 px-3">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-km-primary font-bold scale-105 bg-emerald-50/80'
                  : 'text-km-textSecondary hover:text-km-primary hover:bg-km-hoverBg/50'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5px] scale-110' : 'stroke-[1.75px]'}`} />
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-bold text-km-primary' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

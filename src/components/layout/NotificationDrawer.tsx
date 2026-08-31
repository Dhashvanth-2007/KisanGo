import React from 'react';
import { X, Bell, CheckCircle2, Clock, DollarSign, AlertTriangle } from 'lucide-react';
import { NotificationItem } from '../../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead?: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 border-l border-emerald-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-km-primary text-white">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-km-textPrimary text-base">Notifications</h3>
              <p className="text-xs text-km-textSecondary">Real-time alerts & queue updates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-km-textSecondary">
              <Bell className="w-12 h-12 mx-auto text-gray-300 mb-2 stroke-1" />
              <p className="text-sm font-medium">No new notifications</p>
              <p className="text-xs text-gray-400 mt-1">You will receive live queue and payment updates here</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl border transition-all ${
                  notif.read
                    ? 'bg-white border-gray-100 opacity-80'
                    : 'bg-emerald-50/50 border-emerald-200 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {notif.type === 'payment' && (
                      <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                        <DollarSign className="w-4 h-4" />
                      </div>
                    )}
                    {notif.type === 'queue' && (
                      <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                        <Clock className="w-4 h-4" />
                      </div>
                    )}
                    {notif.type === 'success' && (
                      <div className="p-2 rounded-xl bg-green-100 text-green-800">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                    {notif.type === 'warning' && (
                      <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    )}
                    {(!notif.type || notif.type === 'info') && (
                      <div className="p-2 rounded-xl bg-gray-100 text-gray-700">
                        <Bell className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-km-textPrimary">{notif.title}</h4>
                    <p className="text-xs text-km-textSecondary mt-1 leading-relaxed">{notif.message}</p>
                    <span className="text-[10px] text-gray-400 mt-2 block">{notif.created_at || 'Just now'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && onMarkAllAsRead && (
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={onMarkAllAsRead}
              className="w-full py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-xs font-semibold text-km-textPrimary transition-colors"
            >
              Mark all as read
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

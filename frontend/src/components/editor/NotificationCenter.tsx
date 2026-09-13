import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, X, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiFetch } from '../../services/apiClient';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export const NotificationCenter: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch {
      // Ignore network errors in preview
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' });
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Fallback local update
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-violet-400" />
          <h3 className="font-bold text-sm text-zinc-100">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleMarkAllRead}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Mark all as read"
          >
            <CheckCheck className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="text-center text-xs text-zinc-500 py-8">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Bell className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-400">All caught up!</p>
            <p className="text-[11px] text-zinc-600 mt-1">No notifications at this time.</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-xl border text-xs transition-all ${
                item.is_read
                  ? 'bg-zinc-950/40 border-zinc-800/60 opacity-75'
                  : 'bg-zinc-800/60 border-violet-500/30'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {item.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : item.type === 'warning' ? (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-semibold text-zinc-200">{item.title}</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{item.message}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

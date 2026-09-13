import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, X, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../../services/apiClient';

interface EventItem {
  id: string;
  title: string;
  platform: string;
  scheduled_at: string;
  status: string;
  notes?: string;
}

export const ContentPlannerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await apiFetch('/api/content-calendar');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch {
      // Ignore network errors in draft mode
    }
  };

  useEffect(() => {
    if (isOpen) fetchEvents();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScheduleEvent = async () => {
    if (!title || !scheduledAt) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/content-calendar', {
        method: 'POST',
        body: JSON.stringify({
          title,
          platform,
          scheduled_at: new Date(scheduledAt).toISOString(),
        }),
      });
      if (res.ok) {
        setTitle('');
        setScheduledAt('');
        fetchEvents();
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await apiFetch(`/api/content-calendar/${id}`, { method: 'DELETE' });
      setEvents(events.filter((e) => e.id !== id));
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-400">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-100">Social Media Content Planner</h3>
            <p className="text-xs text-zinc-400">Schedule poster releases across social channels</p>
          </div>
        </div>

        {/* Create schedule event form */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-6 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Post Title / Campaign</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Discount Promo"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-pink-500"
              >
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="linkedin">LinkedIn</option>
                <option value="twitter">X (Twitter)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Release Date & Time</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <button
            onClick={handleScheduleEvent}
            disabled={loading || !title || !scheduledAt}
            className="w-full bg-pink-600 hover:bg-pink-500 text-white py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Schedule Release
          </button>
        </div>

        {/* Scheduled list */}
        <div>
          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Scheduled Calendar</h4>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {events.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-4">No content scheduled yet.</p>
            ) : (
              events.map((e) => (
                <div key={e.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-zinc-200 block">{e.title}</span>
                    <span className="text-[10px] text-pink-400 uppercase font-mono">{e.platform} • {new Date(e.scheduled_at).toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(e.id)}
                    className="text-zinc-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

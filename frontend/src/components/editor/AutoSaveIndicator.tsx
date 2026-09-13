import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export const AutoSaveIndicator: React.FC = () => {
  const { projectId, projectUpdatedAt } = useEditorStore();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState('');

  useEffect(() => {
    if (projectUpdatedAt) {
      const date = new Date(projectUpdatedAt);
      const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSaved(time);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [projectUpdatedAt]);

  // Listen for save events
  useEffect(() => {
    const handleSave = () => {
      setStatus('saving');
    };
    window.addEventListener('teckstudio:saving', handleSave);
    return () => window.removeEventListener('teckstudio:saving', handleSave);
  }, []);

  if (!projectId) return null;

  const isLocal = projectId.startsWith('local_');

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px]">
      {status === 'saving' ? (
        <>
          <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
          <span className="text-amber-400">Saving...</span>
        </>
      ) : status === 'saved' ? (
        <>
          {isLocal ? (
            <CloudOff className="w-3 h-3 text-zinc-500" />
          ) : (
            <Cloud className="w-3 h-3 text-emerald-400" />
          )}
          <span className="text-zinc-500">
            {isLocal ? 'Saved locally' : `Saved at ${lastSaved}`}
          </span>
        </>
      ) : status === 'error' ? (
        <>
          <CloudOff className="w-3 h-3 text-red-400" />
          <span className="text-red-400">Save failed</span>
        </>
      ) : (
        <>
          {isLocal ? (
            <CloudOff className="w-3 h-3 text-zinc-600" />
          ) : (
            <Cloud className="w-3 h-3 text-zinc-600" />
          )}
          <span className="text-zinc-600">
            {isLocal ? 'Local' : lastSaved ? `Saved ${lastSaved}` : 'Not saved yet'}
          </span>
        </>
      )}
    </div>
  );
};

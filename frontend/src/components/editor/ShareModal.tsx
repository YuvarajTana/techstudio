import React, { useState, useEffect } from 'react';
import {
  X,
  Link,
  Copy,
  Check,
  Mail,
  Download,
  Share2,
  Globe,
  Lock,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { apiFetch } from '../../services/apiClient';

type ShareAccess = 'private' | 'link' | 'public';

type ShareResponse = {
  share_token?: string;
};

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const { canvas, projectName, projectId } = useEditorStore();
  const displayProjectName = projectName.trim() || 'New Design';
  const [accessLevel, setAccessLevel] = useState<ShareAccess>('private');
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const buildShareLink = (shareToken: string) => `${window.location.origin}/view/${shareToken}`;

  const createShare = async (sharedWithEmail: string, level: ShareAccess) => {
    if (!projectId) {
      throw new Error('Project must be saved before sharing.');
    }

    const response = await apiFetch('/api/shared', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        shared_with_email: sharedWithEmail,
        access_level: level === 'public' ? 'view' : 'edit'
      })
    });
    const payload = await response.json().catch(() => null) as ShareResponse | null;
    if (!response.ok) {
      throw new Error(payload && 'detail' in payload ? String(payload.detail) : `Share failed (${response.status})`);
    }
    if (!payload?.share_token) {
      throw new Error('Backend did not return a share token.');
    }
    const nextShareLink = buildShareLink(payload.share_token);
    setShareLink(nextShareLink);
    return nextShareLink;
  };

  // Save access level to backend
  const handleAccessChange = async (level: ShareAccess) => {
    setAccessLevel(level);
    if (level === 'private') {
      setShareLink('');
      return;
    }

    try {
      await createShare('public', level);
    } catch {
      setShareLink('');
    }
  };

  // Generate preview thumbnail
  useEffect(() => {
    if (canvas && isOpen) {
      try {
        const thumbnail = canvas.toDataURL({
          format: 'png',
          multiplier: 0.3,
          quality: 0.8,
        });
        setPreviewUrl(thumbnail);
      } catch {
        setPreviewUrl('');
      }
    }
  }, [canvas, isOpen]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareViaEmail = async () => {
    if (!email.trim() || !projectId) return;

    try {
      const nextShareLink = await createShare(email.trim(), accessLevel);
      const subject = encodeURIComponent(`Check out my design: ${displayProjectName}`);
      const body = encodeURIComponent(
        `I'd like to share my design "${displayProjectName}" with you.\n\nView it here: ${nextShareLink}`
      );
      window.open(`mailto:${email}?subject=${subject}&body=${body}`);
      setEmail('');
    } catch {
      // Fallback: just open mailto
      const subject = encodeURIComponent(`Check out my design: ${displayProjectName}`);
      const body = encodeURIComponent(
        `I'd like to share my design "${displayProjectName}" with you.\n\nView it here: ${shareLink}`
      );
      window.open(`mailto:${email}?subject=${subject}&body=${body}`);
      setEmail('');
    }
  };

  const handleDownloadPreview = () => {
    if (!canvas) return;

    const dataURL = canvas.toDataURL({
      format: 'png',
      multiplier: 1,
    });

    const link = document.createElement('a');
    link.download = `${displayProjectName}-preview.png`;
    link.href = dataURL;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#101018] border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-600/20">
              <Share2 className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Share Design</h2>
              <p className="text-xs text-zinc-500">{displayProjectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="px-6 py-4 border-b border-white/[0.08]">
            <div className="relative aspect-video bg-zinc-900 rounded-xl overflow-hidden border border-white/[0.08]">
              <img
                src={previewUrl}
                alt="Design preview"
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button
                  onClick={handleDownloadPreview}
                  className="p-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title="Download preview"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          {/* Access Level */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-400">Access Level</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'private' as ShareAccess, label: 'Private', icon: Lock, desc: 'Only you' },
                { id: 'link' as ShareAccess, label: 'Anyone with link', icon: Link, desc: 'View only' },
                { id: 'public' as ShareAccess, label: 'Public', icon: Globe, desc: 'Anyone can view' },
              ].map((level) => {
                const Icon = level.icon;
                return (
                  <button
                    key={level.id}
                    onClick={() => handleAccessChange(level.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all cursor-pointer ${
                      accessLevel === level.id
                        ? 'bg-violet-600/20 border border-violet-500/30 text-violet-400'
                        : 'bg-zinc-900/50 border border-white/[0.08] text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-semibold">{level.label}</span>
                    <span className="text-[8px] text-zinc-500">{level.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Share Link */}
          {accessLevel !== 'private' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-400">Share Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono"
                />
                <button
                  onClick={() => copyToClipboard(shareLink)}
                  disabled={!shareLink}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    copied
                      ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                      : 'bg-violet-600 hover:bg-violet-500 text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Email Share */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-400">Share via Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleShareViaEmail()}
                className="flex-1 bg-zinc-900 border border-white/[0.08] focus:border-violet-500 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
              />
              <button
                onClick={handleShareViaEmail}
                disabled={!email.trim()}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
              >
                <Mail className="w-3.5 h-3.5" />
                Send
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleDownloadPreview}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] rounded-lg text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download PNG
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: projectName,
                    text: `Check out my design: ${projectName}`,
                    url: shareLink,
                  }).catch(() => {});
                } else {
                  // Fallback: copy link to clipboard
                  copyToClipboard(shareLink);
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/[0.08] rounded-lg text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
                  {typeof navigator.share === 'function' ? 'Native Share' : 'Copy Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

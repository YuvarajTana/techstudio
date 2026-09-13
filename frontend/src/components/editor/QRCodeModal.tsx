import React, { useState } from 'react';
import { QrCode, X, Sparkles, Globe, Wifi, User, Type } from 'lucide-react';
import { apiFetch } from '../../services/apiClient';
import { useEditorStore } from '../../store/useEditorStore';
import { fabric } from 'fabric';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose }) => {
  const canvas = useEditorStore((state) => state.canvas);
  const [qrType, setQrType] = useState<'url' | 'text' | 'wifi' | 'vcard'>('url');
  const [content, setContent] = useState('https://teckstudio.ai');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [vcardName, setVcardName] = useState('');
  const [vcardEmail, setVcardEmail] = useState('');
  const [vcardPhone, setVcardPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGenerateAndInsert = async () => {
    if (!canvas) {
      setError('Please open or create a canvas design first');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/qrcode/generate', {
        method: 'POST',
        body: JSON.stringify({
          content,
          qr_type: qrType,
          foreground_color: fgColor,
          background_color: bgColor,
          wifi_ssid: wifiSsid,
          wifi_password: wifiPass,
          vcard_name: vcardName,
          vcard_email: vcardEmail,
          vcard_phone: vcardPhone,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.detail || data?.error || 'Failed to generate QR code';
        throw new Error(typeof msg === 'string' ? msg : 'Failed to generate QR code');
      }

      if (data?.data_url && canvas) {
        fabric.Image.fromURL(
          data.data_url,
          (img) => {
            if (!img) {
              setError('Failed to load QR code image onto canvas');
              return;
            }

            const canvasW = canvas.width || 800;
            const canvasH = canvas.height || 800;

            img.set({
              left: canvasW / 2 - 100,
              top: canvasH / 2 - 100,
              scaleX: 0.8,
              scaleY: 0.8,
              id: `qr_${Date.now()}`,
              name: `QR Code (${qrType.toUpperCase()})`,
            } as any);

            img.setCoords();
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();

            // Refresh history store
            useEditorStore.getState().saveHistory();

            onClose();
          },
          { crossOrigin: 'anonymous' }
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to insert QR Code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-100">QR Code Generator</h3>
            <p className="text-xs text-zinc-400">Create vector QR codes for canvas designs</p>
          </div>
        </div>

        {/* Type selector */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { id: 'url', label: 'URL', icon: Globe },
            { id: 'text', label: 'Text', icon: Type },
            { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
            { id: 'vcard', label: 'Contact', icon: User },
          ].map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setQrType(type.id as any)}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  qrType === type.id
                    ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                    : 'bg-zinc-800/50 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Content inputs */}
        <div className="space-y-4 mb-6">
          {qrType === 'url' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Website URL</label>
              <input
                type="url"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
              />
            </div>
          )}

          {qrType === 'text' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Plain Text</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter text message..."
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
              />
            </div>
          )}

          {qrType === 'wifi' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Network Name (SSID)</label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder="My Home WiFi"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Password</label>
                <input
                  type="password"
                  value={wifiPass}
                  onChange={(e) => setWifiPass(e.target.value)}
                  placeholder="WiFi password"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          )}

          {qrType === 'vcard' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={vcardName}
                  onChange={(e) => setVcardName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={vcardEmail}
                    onChange={(e) => setVcardEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={vcardPhone}
                    onChange={(e) => setVcardPhone(e.target.value)}
                    placeholder="+1 234 567 890"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Color customization */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Foreground</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                />
                <span className="text-xs text-zinc-300 font-mono">{fgColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Background</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
                />
                <span className="text-xs text-zinc-300 font-mono">{bgColor}</span>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-red-400 mb-4">{error}</p>}

        <button
          onClick={handleGenerateAndInsert}
          disabled={loading}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/25 disabled:opacity-50"
        >
          {loading ? (
            <span>Generating...</span>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Insert into Canvas</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import {
  Palette,
  Type,
  Image,
  Plus,
  Trash2,
  Check,
  X,
  Upload,
  Copy,
  Sparkles,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { fabric } from 'fabric';
import { apiFetch, getAuthToken } from '../../services/apiClient';

interface BrandColor {
  id: string;
  name: string;
  hex: string;
  role: string;
  description?: string | null;
  isPrimary?: boolean;
}

interface BrandFont {
  id: string;
  name: string;
  family: string;
  weight: string;
  role: string;
  style?: string | null;
  fallback?: string | null;
}

interface BrandLogo {
  id: string;
  name: string;
  src: string;
  fileType: string;
  role: string;
  width?: number | null;
  height?: number | null;
}

interface BrandKitModel {
  id?: string;
  colors: BrandColor[];
  fonts: BrandFont[];
  logos: BrandLogo[];
  name: string;
  companyName?: string | null;
  description?: string | null;
  industry?: string | null;
  website?: string | null;
}

interface ApiBrandKit {
  id: string;
  name: string;
  company_name?: string | null;
  description?: string | null;
  industry?: string | null;
  website?: string | null;
  colors: Array<{ id: string; name: string; hex_value: string; role?: string; description?: string | null; is_primary?: boolean }>;
  fonts: Array<{ id: string; name: string; family: string; weight: string; role?: string; style?: string | null; fallback?: string | null }>;
  logos: Array<{ id: string; name: string; file_data: string; file_type: string; role?: string; width?: number | null; height?: number | null }>;
}

interface ApiBrandKitList {
  brand_kits: ApiBrandKit[];
}

interface PendingBrandKitPayload {
  kit?: ApiBrandKit;
  autoApply?: boolean;
}

const DEFAULT_BRAND_KIT: BrandKitModel = {
  name: 'My Brand',
  colors: [
    { id: '1', name: 'Primary', hex: '#8B5CF6', role: 'primary', isPrimary: true },
    { id: '2', name: 'Secondary', hex: '#EC4899', role: 'secondary' },
    { id: '3', name: 'Accent', hex: '#06B6D4', role: 'accent' },
    { id: '4', name: 'Dark', hex: '#18181B', role: 'text' },
    { id: '5', name: 'Light', hex: '#FAFAFA', role: 'background' },
  ],
  fonts: [
    { id: '1', name: 'Heading', family: 'Outfit', weight: 'bold', role: 'heading' },
    { id: '2', name: 'Body', family: 'Inter', weight: 'normal', role: 'body' },
    { id: '3', name: 'Accent', family: 'Georgia', weight: 'normal', role: 'accent' },
  ],
  logos: [],
};

const AVAILABLE_FONTS = [
  'Outfit',
  'Inter',
  'system-ui',
  'Arial',
  'Georgia',
  'Courier New',
  'Times New Roman',
  'Verdana',
  'Helvetica',
  'Roboto',
  'Montserrat',
];

const normalizeBrandKit = (kit: ApiBrandKit): BrandKitModel => ({
  id: kit.id,
  name: kit.name,
  companyName: kit.company_name,
  description: kit.description,
  industry: kit.industry,
  website: kit.website,
  colors: (kit.colors || []).map((color) => ({
    id: color.id,
    name: color.name,
    hex: color.hex_value,
    role: color.role || 'custom',
    description: color.description,
    isPrimary: Boolean(color.is_primary),
  })),
  fonts: (kit.fonts || []).map((font) => ({
    id: font.id,
    name: font.name,
    family: font.family,
    weight: font.weight || 'normal',
    role: font.role || 'body',
    style: font.style,
    fallback: font.fallback,
  })),
  logos: (kit.logos || []).map((logo) => ({
    id: logo.id,
    name: logo.name,
    src: logo.file_data,
    fileType: logo.file_type || 'image/png',
    role: logo.role || 'primary',
    width: logo.width,
    height: logo.height,
  })),
});

const readApiError = async (response: Response, fallback: string) => {
  const payload = await response.json().catch(() => null);
  if (Array.isArray(payload?.detail)) {
    return payload.detail.map((item: { msg?: string; message?: string }) => item?.msg || item?.message || String(item)).join(', ');
  }
  return payload?.detail || payload?.error || fallback;
};

const getColorByRole = (kit: BrandKitModel, role: string) => kit.colors.find((color) => color.role === role);
const getPrimaryColor = (kit: BrandKitModel) => kit.colors.find((color) => color.isPrimary) || getColorByRole(kit, 'primary') || kit.colors[0];
const getFontByRole = (kit: BrandKitModel, role: string) => kit.fonts.find((font) => font.role === role) || kit.fonts[0];
const getPrimaryLogo = (kit: BrandKitModel) => kit.logos.find((logo) => logo.role === 'primary') || kit.logos[0];

export const BrandKit: React.FC = () => {
  const { canvas, saveHistory, setFillColor, setFontFamily, setFontWeight, setSelectedObject } = useEditorStore();
  const [brandKits, setBrandKits] = useState<BrandKitModel[]>([]);
  const [selectedKitId, setSelectedKitId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [pendingAutoApplyKitId, setPendingAutoApplyKitId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'colors' | 'fonts' | 'logos'>('colors');
  const [newColor, setNewColor] = useState('#8B5CF6');
  const [newColorName, setNewColorName] = useState('');
  const [newColorRole, setNewColorRole] = useState('custom');
  const [newColorPrimary, setNewColorPrimary] = useState(false);
  const [showAddColor, setShowAddColor] = useState(false);
  const [showAddFont, setShowAddFont] = useState(false);
  const [newFont, setNewFont] = useState({ name: '', family: 'Outfit', weight: 'normal', role: 'body' });
  const [logoRole, setLogoRole] = useState('primary');

  const selectedKit = brandKits.find((kit) => kit.id === selectedKitId);
  const brandKit = selectedKit || brandKits[0] || DEFAULT_BRAND_KIT;

  const headingFont = useMemo(() => getFontByRole(brandKit, 'heading'), [brandKit]);
  const bodyFont = useMemo(() => getFontByRole(brandKit, 'body'), [brandKit]);
  const primaryLogo = useMemo(() => getPrimaryLogo(brandKit), [brandKit]);

  const updateBrandKit = (updatedKit: BrandKitModel) => {
    setBrandKits((current) => {
      if (!updatedKit.id) return current;
      const exists = current.some((kit) => kit.id === updatedKit.id);
      return exists ? current.map((kit) => (kit.id === updatedKit.id ? updatedKit : kit)) : [updatedKit, ...current];
    });
    if (updatedKit.id) setSelectedKitId(updatedKit.id);
  };

  const loadPendingBrandKit = () => {
    const raw = localStorage.getItem('teckstudio_pending_brand_kit');
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as PendingBrandKitPayload;
      if (!payload.kit?.id) return;
      const pendingKit = normalizeBrandKit(payload.kit);
      updateBrandKit(pendingKit);
      if (payload.autoApply) setPendingAutoApplyKitId(pendingKit.id || null);
      window.dispatchEvent(new CustomEvent('teckstudio:open-panel', { detail: { panel: 'brand' } }));
    } catch {
      localStorage.removeItem('teckstudio_pending_brand_kit');
    }
  };

  const fetchBrandKits = async () => {
    const token = getAuthToken();
    if (!token) {
      setBrandKits([]);
      setSelectedKitId('');
      setError('Sign in to use persistent brand kits in the editor.');
      setIsLoading(false);
      loadPendingBrandKit();
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const response = await apiFetch('/api/brand-kits');
      if (!response.ok) {
        throw new Error(await readApiError(response, `Failed to load brand kits (${response.status})`));
      }
      const payload = (await response.json()) as ApiBrandKitList;
      const kits = (payload.brand_kits || []).map(normalizeBrandKit);
      setBrandKits(kits);
      setSelectedKitId((current) => current || kits[0]?.id || '');
      if (kits.length === 0) {
        setError('No backend brand kit found. Add a color, font, or logo to create one.');
      }
    } catch (err) {
      setBrandKits([]);
      setSelectedKitId('');
      setError(err instanceof Error ? err.message : 'Failed to load brand kits.');
    } finally {
      setIsLoading(false);
      loadPendingBrandKit();
    }
  };

  useEffect(() => {
    fetchBrandKits();
  }, []);

  const applyBrandKitToCanvas = (sourceKit: BrandKitModel = brandKit) => {
    if (!canvas) {
      setError('Canvas is not ready yet.');
      return;
    }

    const kitPrimary = getPrimaryColor(sourceKit);
    const background = getColorByRole(sourceKit, 'background');
    const textColor = getColorByRole(sourceKit, 'text') || kitPrimary;
    const accent = getColorByRole(sourceKit, 'accent') || kitPrimary;
    const kitHeadingFont = getFontByRole(sourceKit, 'heading');
    const kitBodyFont = getFontByRole(sourceKit, 'body');
    const now = new Date().toISOString();

    if (background?.hex) {
      canvas.setBackgroundColor(background.hex, canvas.renderAll.bind(canvas));
    }

    const objects = canvas.getObjects();
    let updatedCount = 0;
    objects.forEach((object) => {
      const type = object.type;
      const role = String(object.get('brandRole' as keyof fabric.Object) || object.get('posterRole' as keyof fabric.Object) || object.get('textRole' as keyof fabric.Object) || '').toLowerCase();
      const metadata = {
        brandKitId: sourceKit.id,
        brandKitName: sourceKit.name,
        brandAppliedAt: now,
      };

      if (type === 'text' || type === 'textbox' || type === 'i-text') {
        const font = role.includes('heading') || role.includes('title') || role.includes('headline') ? kitHeadingFont : kitBodyFont;
        object.set({
          ...metadata,
          brandRole: role || (font?.role || 'body'),
          fontFamily: font?.family || object.get('fontFamily' as keyof fabric.Object),
          fontWeight: font?.weight || object.get('fontWeight' as keyof fabric.Object),
          fill: textColor?.hex || kitPrimary?.hex || object.get('fill' as keyof fabric.Object),
        } as Record<string, unknown>);
        updatedCount += 1;
        return;
      }

      if (role.includes('background') && background?.hex) {
        object.set({ ...metadata, brandRole: 'background', fill: background.hex } as Record<string, unknown>);
        updatedCount += 1;
        return;
      }

      if ((role.includes('accent') || role.includes('shape') || role.includes('badge')) && accent?.hex) {
        object.set({ ...metadata, brandRole: role || 'accent', fill: accent.hex } as Record<string, unknown>);
        updatedCount += 1;
      }
    });

    if (objects.length === 0) {
      const title = new fabric.Textbox(sourceKit.companyName || sourceKit.name || 'Your Brand Poster', {
        left: Math.max(40, canvas.getWidth() * 0.08),
        top: Math.max(48, canvas.getHeight() * 0.12),
        width: Math.max(240, canvas.getWidth() * 0.75),
        fontFamily: kitHeadingFont?.family || 'Outfit',
        fontWeight: kitHeadingFont?.weight || 'bold',
        fontSize: Math.max(42, Math.min(88, canvas.getWidth() * 0.09)),
        fill: textColor?.hex || kitPrimary?.hex || '#18181B',
        brandKitId: sourceKit.id,
        brandKitName: sourceKit.name,
        brandRole: 'heading',
        brandAppliedAt: now,
        name: `${sourceKit.name} Title`,
      } as fabric.ITextboxOptions & Record<string, unknown>);
      canvas.add(title);
      canvas.setActiveObject(title);
      setSelectedObject(title);
      updatedCount += 1;
    }

    if (kitPrimary?.hex) {
      setFillColor(kitPrimary.hex);
    }
    if (kitHeadingFont) {
      setFontFamily(kitHeadingFont.family);
      setFontWeight(kitHeadingFont.weight);
    }

    canvas.renderAll();
    saveHistory();
    setFeedback(`Applied ${sourceKit.name} to ${updatedCount || 'the'} canvas layer${updatedCount === 1 ? '' : 's'}.`);
    setError('');
    localStorage.setItem('teckstudio_recent_brand_kit_id', sourceKit.id || sourceKit.name);
  };

  useEffect(() => {
    if (!pendingAutoApplyKitId || !canvas) return;
    const kit = brandKits.find((item) => item.id === pendingAutoApplyKitId);
    if (!kit) return;
    applyBrandKitToCanvas(kit);
    localStorage.removeItem('teckstudio_pending_brand_kit');
    setPendingAutoApplyKitId(null);
  }, [pendingAutoApplyKitId, canvas, brandKits]);

  const ensurePersistentKit = async () => {
    if (brandKit.id) return brandKit;

    const response = await apiFetch('/api/brand-kits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: brandKit.name || 'My Brand' }),
    });
    if (!response.ok) {
      throw new Error(await readApiError(response, `Failed to create brand kit (${response.status})`));
    }
    const createdKit = normalizeBrandKit((await response.json()) as ApiBrandKit);
    updateBrandKit(createdKit);
    return createdKit;
  };

  const addColor = async () => {
    if (!newColorName.trim()) return;
    setIsSaving(true);
    setError('');
    try {
      const kit = await ensurePersistentKit();
      const response = await apiFetch(`/api/brand-kits/${kit.id}/colors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newColorName.trim(), hex_value: newColor, role: newColorRole, is_primary: newColorPrimary }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, `Failed to add color (${response.status})`));
      }
      const created = await response.json();
      updateBrandKit({
        ...kit,
        colors: [...kit.colors, { id: created.id, name: created.name, hex: created.hex_value, role: created.role || 'custom', isPrimary: Boolean(created.is_primary) }],
      });
      setNewColorName('');
      setNewColor('#8B5CF6');
      setNewColorRole('custom');
      setNewColorPrimary(false);
      setShowAddColor(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add color.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeColor = async (id: string) => {
    if (!brandKit.id) return;
    setIsSaving(true);
    setError('');
    try {
      const response = await apiFetch(`/api/brand-kits/${brandKit.id}/colors/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(await readApiError(response, `Failed to remove color (${response.status})`));
      }
      updateBrandKit({
        ...brandKit,
        colors: brandKit.colors.filter((color) => color.id !== id),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove color.');
    } finally {
      setIsSaving(false);
    }
  };

  const applyColor = (hex: string) => {
    setFillColor(hex);
    if (canvas) {
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        activeObject.set({ fill: hex, brandKitId: brandKit.id, brandKitName: brandKit.name, brandRole: 'custom-color', brandAppliedAt: new Date().toISOString() } as Record<string, unknown>);
        canvas.renderAll();
        saveHistory();
      }
    }
  };

  const addFont = async () => {
    if (!newFont.name.trim()) return;
    setIsSaving(true);
    setError('');
    try {
      const kit = await ensurePersistentKit();
      const response = await apiFetch(`/api/brand-kits/${kit.id}/fonts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFont.name.trim(), family: newFont.family, weight: newFont.weight, role: newFont.role }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, `Failed to add font (${response.status})`));
      }
      const created = await response.json();
      updateBrandKit({
        ...kit,
        fonts: [...kit.fonts, { id: created.id, name: created.name, family: created.family, weight: created.weight, role: created.role || 'body' }],
      });
      setNewFont({ name: '', family: 'Outfit', weight: 'normal', role: 'body' });
      setShowAddFont(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add font.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeFont = async (id: string) => {
    if (!brandKit.id) return;
    setIsSaving(true);
    setError('');
    try {
      const response = await apiFetch(`/api/brand-kits/${brandKit.id}/fonts/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(await readApiError(response, `Failed to remove font (${response.status})`));
      }
      updateBrandKit({
        ...brandKit,
        fonts: brandKit.fonts.filter((font) => font.id !== id),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove font.');
    } finally {
      setIsSaving(false);
    }
  };

  const applyFont = (family: string, weight: string) => {
    setFontFamily(family);
    setFontWeight(weight);
    if (canvas) {
      const activeObject = canvas.getActiveObject();
      if (activeObject && (activeObject.type === 'text' || activeObject.type === 'textbox' || activeObject.type === 'i-text')) {
        activeObject.set({ fontFamily: family, fontWeight: weight, brandKitId: brandKit.id, brandKitName: brandKit.name, brandRole: 'custom-font', brandAppliedAt: new Date().toISOString() } as Record<string, unknown>);
        canvas.renderAll();
        saveHistory();
      }
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Logo must be an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo must be 5MB or smaller.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (fileEvent) => {
      const src = fileEvent.target?.result as string;
      setIsSaving(true);
      setError('');
      try {
        const kit = await ensurePersistentKit();
        const response = await apiFetch(`/api/brand-kits/${kit.id}/logos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, file_data: src, file_type: file.type || 'image/png', role: logoRole }),
        });
        if (!response.ok) {
          throw new Error(await readApiError(response, `Failed to upload logo (${response.status})`));
        }
        const created = await response.json();
        updateBrandKit({
          ...kit,
          logos: [...kit.logos, { id: created.id, name: created.name, src: created.file_data, fileType: created.file_type, role: created.role || logoRole }],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload logo.');
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = async (id: string) => {
    if (!brandKit.id) return;
    setIsSaving(true);
    setError('');
    try {
      const response = await apiFetch(`/api/brand-kits/${brandKit.id}/logos/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(await readApiError(response, `Failed to remove logo (${response.status})`));
      }
      updateBrandKit({
        ...brandKit,
        logos: brandKit.logos.filter((logo) => logo.id !== id),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove logo.');
    } finally {
      setIsSaving(false);
    }
  };

  const addLogoToCanvas = (src: string) => {
    if (!canvas) return;

    fabric.Image.fromURL(
      src,
      (img) => {
        if (!img) return;

        const maxSize = 200;
        const scale = Math.min(maxSize / (img.width || 1), maxSize / (img.height || 1), 1);

        img.set({
          left: canvas.getWidth() / 2 - ((img.width || 0) * scale) / 2,
          top: canvas.getHeight() / 2 - ((img.height || 0) * scale) / 2,
          scaleX: scale,
          scaleY: scale,
          brandKitId: brandKit.id,
          brandKitName: brandKit.name,
          brandRole: 'logo',
          brandAppliedAt: new Date().toISOString(),
          name: `${brandKit.name} Logo`,
        } as Record<string, unknown>);

        canvas.add(img);
        canvas.setActiveObject(img);
        setSelectedObject(img);
        canvas.renderAll();
        saveHistory();
      },
      { crossOrigin: 'anonymous' }
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-100">Brand Kit</h3>
          <span className="text-[10px] text-zinc-500">{brandKit.id ? 'Synced' : 'Backend ready'}</span>
        </div>
        <p className="text-[10px] text-zinc-500">Apply reusable colors, typography, and logos to the current poster.</p>
        {brandKits.length > 1 && (
          <select
            value={selectedKitId}
            onChange={(event) => setSelectedKitId(event.target.value)}
            className="mt-3 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none"
          >
            {brandKits.map((kit) => (
              <option key={kit.id} value={kit.id}>{kit.name}</option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => applyBrandKitToCanvas()}
          disabled={!canvas || isLoading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5" /> Apply Kit to Canvas
        </button>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] text-zinc-500">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2"><strong className="block text-zinc-200">{brandKit.colors.length}</strong>Colors</div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2"><strong className="block text-zinc-200">{brandKit.fonts.length}</strong>Fonts</div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2"><strong className="block text-zinc-200">{brandKit.logos.length}</strong>Logos</div>
        </div>
      </div>

      <div className="border-b border-zinc-800 p-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="mb-3 flex items-center gap-2">
            {primaryLogo ? <img src={primaryLogo.src} alt={primaryLogo.name} className="h-10 w-10 rounded-lg bg-white object-contain p-1" /> : <Palette className="h-8 w-8 rounded-lg bg-violet-500/10 p-2 text-violet-300" />}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{brandKit.name}</p>
              <p className="truncate text-[10px] text-zinc-500">{brandKit.companyName || brandKit.industry || 'Reusable brand identity'}</p>
            </div>
          </div>
          <div className="mb-2 flex gap-1.5">
            {brandKit.colors.slice(0, 6).map((color) => <span key={color.id} className="h-5 flex-1 rounded border border-zinc-700" style={{ backgroundColor: color.hex }} title={`${color.name} ${color.hex}`} />)}
          </div>
          <p className="text-[10px] text-zinc-500">{headingFont?.family || 'No heading font'} / {bodyFont?.family || 'No body font'}</p>
        </div>
      </div>

      <div className="flex border-b border-zinc-800">
        {[
          { id: 'colors' as const, label: 'Colors', icon: Palette },
          { id: 'fonts' as const, label: 'Fonts', icon: Type },
          { id: 'logos' as const, label: 'Logos', icon: Image },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-3 text-[10px] font-semibold transition-colors ${activeTab === tab.id ? 'border-b-2 border-violet-400 text-violet-400' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-24">
        {isLoading && <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-[11px] text-zinc-400">Loading brand kits from backend...</div>}
        {error && <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-200">{error}</div>}
        {feedback && <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[11px] text-emerald-200">{feedback}</div>}

        {activeTab === 'colors' && (
          <div className="flex flex-col gap-3">
            {brandKit.colors.map((color) => (
              <div key={color.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <button type="button" onClick={() => applyColor(color.hex)} className="h-10 w-10 cursor-pointer rounded-lg border-2 border-zinc-700 shadow-md transition-all hover:scale-110 hover:border-white/60" style={{ backgroundColor: color.hex }} title={`Apply ${color.name}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-zinc-200">{color.name}</p>
                  <p className="font-mono text-[10px] text-zinc-500">{color.hex} • {color.role}</p>
                </div>
                <button type="button" onClick={() => navigator.clipboard.writeText(color.hex)} className="cursor-pointer rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300" title="Copy hex code"><Copy className="h-3 w-3" /></button>
                <button type="button" onClick={() => removeColor(color.id)} disabled={!brandKit.id || isSaving} className="cursor-pointer rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-rose-400 disabled:opacity-40" title="Remove color"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}

            {showAddColor ? (
              <div className="flex flex-col gap-2 rounded-xl border border-violet-500/30 bg-zinc-900/50 p-3">
                <input type="text" placeholder="Color name" value={newColorName} onChange={(event) => setNewColorName(event.target.value)} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-violet-500" autoFocus />
                <div className="flex items-center gap-2">
                  <input type="color" value={newColor} onChange={(event) => setNewColor(event.target.value)} className="h-10 w-10 cursor-pointer rounded-lg border border-zinc-700 bg-transparent" />
                  <input type="text" value={newColor.toUpperCase()} onChange={(event) => setNewColor(event.target.value)} className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-200 outline-none" />
                </div>
                <select value={newColorRole} onChange={(event) => setNewColorRole(event.target.value)} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none cursor-pointer">
                  {['primary', 'secondary', 'accent', 'background', 'text', 'custom'].map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
                <label className="flex items-center gap-2 text-[10px] text-zinc-400"><input type="checkbox" checked={newColorPrimary} onChange={(event) => setNewColorPrimary(event.target.checked)} /> Mark as primary</label>
                <div className="flex gap-2">
                  <button type="button" onClick={addColor} disabled={!newColorName.trim() || isSaving} className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg bg-violet-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"><Check className="h-3 w-3" /> Add</button>
                  <button type="button" onClick={() => setShowAddColor(false)} className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg bg-zinc-800 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-700"><X className="h-3 w-3" /> Cancel</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowAddColor(true)} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-800 py-3 text-zinc-500 transition-colors hover:border-violet-500/50 hover:text-violet-400"><Plus className="h-4 w-4" /><span className="text-xs font-semibold">Add Color</span></button>
            )}
          </div>
        )}

        {activeTab === 'fonts' && (
          <div className="flex flex-col gap-3">
            {brandKit.fonts.map((font) => (
              <div key={font.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20"><Type className="h-5 w-5 text-violet-400" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-zinc-200">{font.name}</p><p className="text-[10px] text-zinc-500">{font.family} • {font.weight} • {font.role}</p></div>
                <button type="button" onClick={() => applyFont(font.family, font.weight)} className="cursor-pointer rounded bg-violet-600/20 px-2 py-1 text-[10px] font-semibold text-violet-400 transition-colors hover:bg-violet-600/30">Apply</button>
                <button type="button" onClick={() => removeFont(font.id)} disabled={!brandKit.id || isSaving} className="cursor-pointer rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-rose-400 disabled:opacity-40"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}

            {showAddFont ? (
              <div className="flex flex-col gap-2 rounded-xl border border-violet-500/30 bg-zinc-900/50 p-3">
                <input type="text" placeholder="Font name" value={newFont.name} onChange={(event) => setNewFont({ ...newFont, name: event.target.value })} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-violet-500" autoFocus />
                <select value={newFont.family} onChange={(event) => setNewFont({ ...newFont, family: event.target.value })} className="w-full cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none">{AVAILABLE_FONTS.map((font) => <option key={font} value={font}>{font}</option>)}</select>
                <select value={newFont.weight} onChange={(event) => setNewFont({ ...newFont, weight: event.target.value })} className="w-full cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none"><option value="normal">Normal</option><option value="bold">Bold</option><option value="lighter">Light</option></select>
                <select value={newFont.role} onChange={(event) => setNewFont({ ...newFont, role: event.target.value })} className="w-full cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none">{['heading', 'body', 'accent', 'caption', 'custom'].map((role) => <option key={role} value={role}>{role}</option>)}</select>
                <div className="flex gap-2"><button type="button" onClick={addFont} disabled={!newFont.name.trim() || isSaving} className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg bg-violet-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"><Check className="h-3 w-3" /> Add</button><button type="button" onClick={() => setShowAddFont(false)} className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg bg-zinc-800 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-700"><X className="h-3 w-3" /> Cancel</button></div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowAddFont(true)} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-800 py-3 text-zinc-500 transition-colors hover:border-violet-500/50 hover:text-violet-400"><Plus className="h-4 w-4" /><span className="text-xs font-semibold">Add Font</span></button>
            )}
          </div>
        )}

        {activeTab === 'logos' && (
          <div className="flex flex-col gap-3">
            {brandKit.logos.length > 0 ? brandKit.logos.map((logo) => (
              <div key={logo.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <img src={logo.src} alt={logo.name} className="h-10 w-10 rounded-lg bg-white object-contain p-1" />
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-zinc-200">{logo.name}</p><p className="text-[10px] text-zinc-500">{logo.role} • {logo.fileType}</p></div>
                <button type="button" onClick={() => addLogoToCanvas(logo.src)} className="cursor-pointer rounded bg-violet-600/20 px-2 py-1 text-[10px] font-semibold text-violet-400 transition-colors hover:bg-violet-600/30">Add</button>
                <button type="button" onClick={() => removeLogo(logo.id)} disabled={!brandKit.id || isSaving} className="cursor-pointer rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-rose-400 disabled:opacity-40"><Trash2 className="h-3 w-3" /></button>
              </div>
            )) : (
              <div className="py-8 text-center text-zinc-500"><Image className="mx-auto mb-3 h-10 w-10 opacity-40" /><p className="text-xs font-semibold">No logos yet</p><p className="mt-1 text-[10px]">Upload your brand logos</p></div>
            )}

            <select value={logoRole} onChange={(event) => setLogoRole(event.target.value)} className="w-full cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none">{['primary', 'secondary', 'icon', 'watermark', 'custom'].map((role) => <option key={role} value={role}>{role}</option>)}</select>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-800 py-3 text-zinc-500 transition-colors hover:border-violet-500/50 hover:text-violet-400">
              <Upload className="h-4 w-4" />
              <span className="text-xs font-semibold">Upload Logo</span>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={handleLogoUpload} disabled={isSaving} className="hidden" />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

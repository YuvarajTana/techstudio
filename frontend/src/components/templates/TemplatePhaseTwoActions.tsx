import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Loader2, Palette, RefreshCcw, Sparkles, Wand2 } from 'lucide-react';
import {
  createProjectFromTemplate,
  listTemplateBrandKits,
  quickReplaceTemplate,
  remixTemplate,
} from '../../services/templatesApi';
import type { TemplateAsset, TemplateBrandKit, TemplateProject } from './templateTypes';

interface TemplatePhaseTwoActionsProps {
  template: TemplateAsset;
  onProjectCreated: (project: TemplateProject) => void;
  notify?: (message: string, type?: 'success' | 'error') => void;
}

const PALETTE_PRESETS = [
  { id: 'violet', label: 'Violet Premium', colors: ['#8b5cf6', '#111827', '#ec4899', '#f8fafc'] },
  { id: 'tech', label: 'Tech Neon', colors: ['#06b6d4', '#0f172a', '#a855f7', '#ecfeff'] },
  { id: 'gold', label: 'Luxury Gold', colors: ['#d4af37', '#111111', '#f5e7a3', '#fffaf0'] },
  { id: 'fresh', label: 'Fresh Green', colors: ['#22c55e', '#052e16', '#86efac', '#f0fdf4'] },
  { id: 'warm', label: 'Warm Launch', colors: ['#f97316', '#1f2937', '#facc15', '#fff7ed'] },
];

const FONT_PRESETS = [
  { id: 'modern', label: 'Modern Sans', heading: 'Inter', body: 'Inter' },
  { id: 'bold', label: 'Bold Social', heading: 'Montserrat', body: 'Inter' },
  { id: 'editorial', label: 'Editorial', heading: 'Georgia', body: 'Inter' },
  { id: 'friendly', label: 'Friendly', heading: 'Outfit', body: 'Inter' },
];

const defaultDetails = {
  business_name: '',
  event_name: '',
  event_date: '',
  phone_number: '',
  offer: '',
  website: '',
};

const readError = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

function BrandKitPreview({ kit }: { kit: TemplateBrandKit }) {
  const primaryLogo = kit.logos.find((logo) => logo.role === 'primary') || kit.logos[0];
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{kit.name}</p>
          <p className="mt-1 truncate text-xs text-zinc-500">{kit.company_name || kit.industry || 'Saved brand identity'}</p>
        </div>
        {primaryLogo && <img src={primaryLogo.file_data} alt={`${kit.name} logo`} className="h-10 w-10 rounded-xl object-contain" />}
      </div>
      <div className="mt-3 flex gap-1.5">
        {kit.colors.slice(0, 6).map((color) => (
          <span key={color.id} className="h-6 flex-1 rounded-lg border border-zinc-700" style={{ backgroundColor: color.hex_value }} title={`${color.name} ${color.hex_value}`} />
        ))}
        {kit.colors.length === 0 && <span className="text-xs text-zinc-500">No brand colours saved</span>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
        <span className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1">{kit.fonts.find((font) => font.role === 'heading')?.family || kit.fonts[0]?.family || 'No heading font'}</span>
        <span className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1">{kit.fonts.find((font) => font.role === 'body')?.family || kit.fonts[1]?.family || 'No body font'}</span>
      </div>
    </div>
  );
}

export function TemplatePhaseTwoActions({ template, onProjectCreated, notify }: TemplatePhaseTwoActionsProps) {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [remixPrompt, setRemixPrompt] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [selectedPaletteId, setSelectedPaletteId] = useState(PALETTE_PRESETS[0].id);
  const [selectedFontId, setSelectedFontId] = useState(FONT_PRESETS[0].id);
  const [details, setDetails] = useState(defaultDetails);
  const [brandKits, setBrandKits] = useState<TemplateBrandKit[]>([]);
  const [selectedBrandKitId, setSelectedBrandKitId] = useState('');
  const [brandKitsLoading, setBrandKitsLoading] = useState(true);
  const [brandKitError, setBrandKitError] = useState('');

  const selectedPalette = useMemo(() => PALETTE_PRESETS.find((item) => item.id === selectedPaletteId) || PALETTE_PRESETS[0], [selectedPaletteId]);
  const selectedFont = useMemo(() => FONT_PRESETS.find((item) => item.id === selectedFontId) || FONT_PRESETS[0], [selectedFontId]);
  const selectedBrandKit = useMemo(() => brandKits.find((kit) => kit.id === selectedBrandKitId) || brandKits[0] || null, [brandKits, selectedBrandKitId]);
  const isBusy = Boolean(busyAction);

  useEffect(() => {
    const controller = new AbortController();
    listTemplateBrandKits(controller.signal)
      .then((payload) => {
        const kits = payload.brand_kits || [];
        setBrandKits(kits);
        setSelectedBrandKitId((current) => current || kits[0]?.id || '');
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) return;
        setBrandKits([]);
        setBrandKitError(readError(fetchError, 'Failed to load brand kits.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBrandKitsLoading(false);
      });
    return () => controller.abort();
  }, []);

  const completeWithProject = (project: TemplateProject, message: string) => {
    notify?.(message);
    onProjectCreated(project);
  };

  const runRemix = async (promptOverride?: string) => {
    const prompt = (promptOverride || remixPrompt).trim();
    if (!prompt) {
      setError('Enter a remix prompt before creating an AI remix.');
      return;
    }
    setBusyAction('remix');
    setError('');
    try {
      const response = await remixTemplate(template.id, {
        prompt,
        project_name: `${template.name} AI Remix`,
      });
      completeWithProject(response.project, 'AI remix created as a separate editable design.');
    } catch (remixError) {
      const message = readError(remixError, 'Failed to create AI remix.');
      setError(message);
      notify?.(message, 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const runQuickReplace = async () => {
    setBusyAction('quick-replace');
    setError('');
    try {
      const response = await quickReplaceTemplate(template.id, {
        project_name: `${template.name} Quick Replace`,
        image_prompt: imagePrompt.trim() || `${template.name} refreshed images`,
        palette: selectedPalette.colors,
        heading_font: selectedFont.heading,
        body_font: selectedFont.body,
        text_replacements: details,
        replace_images: Boolean(imagePrompt.trim()),
        apply_palette: true,
        apply_fonts: true,
        replace_text: true,
      });
      completeWithProject(response.project, 'Quick Replace created as a separate editable design.');
    } catch (replaceError) {
      const message = readError(replaceError, 'Failed to run Quick Replace.');
      setError(message);
      notify?.(message, 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const runBrandKitApply = async () => {
    if (!selectedBrandKit) {
      setError('Create a Brand Kit before applying it to a template.');
      return;
    }
    setBusyAction('brand-kit');
    setError('');
    try {
      localStorage.setItem('teckstudio_pending_brand_kit', JSON.stringify({ kit: selectedBrandKit, autoApply: true, createdAt: Date.now() }));
      const response = await createProjectFromTemplate(template.id, {
        project_name: `${template.name} + ${selectedBrandKit.name}`,
      });
      completeWithProject(response.project, 'Template opened with Brand Kit queued for editable application.');
    } catch (brandError) {
      localStorage.removeItem('teckstudio_pending_brand_kit');
      const message = readError(brandError, 'Failed to apply Brand Kit.');
      setError(message);
      notify?.(message, 'error');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <section className="mt-8 space-y-4 rounded-[1.5rem] border border-violet-500/20 bg-violet-500/[0.04] p-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">Phase 2 Tools</p>
        <h4 className="mt-1 text-base font-black text-white">Remix, replace, or brand this template</h4>
        <p className="mt-1 text-xs leading-5 text-zinc-500">Each action creates a separate editable project and never changes the master template.</p>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><Sparkles className="h-4 w-4 text-violet-300" />AI Remix</div>
          <textarea
            id="template-ai-remix-prompt"
            value={remixPrompt}
            onChange={(event) => setRemixPrompt(event.target.value)}
            rows={4}
            placeholder="e.g. Turn this into a luxury launch poster for an AI product"
            className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-violet-400"
          />
          <button type="button" onClick={() => runRemix()} disabled={isBusy} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60">
            {busyAction === 'remix' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Create AI Remix
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><RefreshCcw className="h-4 w-4 text-cyan-300" />Quick Replace</div>
          <input value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} placeholder="Image direction, optional" className="mb-2 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-cyan-400" />
          <select value={selectedPaletteId} onChange={(event) => setSelectedPaletteId(event.target.value)} className="mb-2 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-100 outline-none">
            {PALETTE_PRESETS.map((palette) => <option key={palette.id} value={palette.id}>{palette.label}</option>)}
          </select>
          <select value={selectedFontId} onChange={(event) => setSelectedFontId(event.target.value)} className="mb-2 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-100 outline-none">
            {FONT_PRESETS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(defaultDetails).map((key) => (
              <input
                key={key}
                value={details[key as keyof typeof details]}
                onChange={(event) => setDetails((current) => ({ ...current, [key]: event.target.value }))}
                placeholder={key.replace(/_/g, ' ')}
                className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-[11px] text-zinc-100 outline-none focus:border-cyan-400"
              />
            ))}
          </div>
          <button type="button" onClick={runQuickReplace} disabled={isBusy} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-cyan-500 disabled:cursor-wait disabled:opacity-60">
            {busyAction === 'quick-replace' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            Create Quick Replace
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><Palette className="h-4 w-4 text-pink-300" />Apply Brand Kit</div>
          {brandKitsLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-3 text-xs text-zinc-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading brand kits…</div>
          ) : brandKitError ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{brandKitError}</div>
          ) : brandKits.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-3 text-xs text-zinc-400">No saved Brand Kits found.</div>
          ) : (
            <>
              <select value={selectedBrandKit?.id || ''} onChange={(event) => setSelectedBrandKitId(event.target.value)} className="mb-3 w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-100 outline-none">
                {brandKits.map((kit) => <option key={kit.id} value={kit.id}>{kit.name}</option>)}
              </select>
              {selectedBrandKit && <BrandKitPreview kit={selectedBrandKit} />}
              <button type="button" onClick={runBrandKitApply} disabled={isBusy || !selectedBrandKit} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-pink-500 disabled:cursor-wait disabled:opacity-60">
                {busyAction === 'brand-kit' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                Open With Brand Kit
              </button>
            </>
          )}
          <p className="mt-2 text-[10px] leading-4 text-zinc-500">Preview the selected kit here; the editor Brand panel applies it with undo support after opening.</p>
        </div>
      </div>
    </section>
  );
}

import {useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {ArrowLeft, CalendarHeart, ChevronDown, ClipboardCopy, Download, Film, LayoutTemplate, Presentation, Search, Store} from 'lucide-react';
import {
  FORMATS,
  THEMES,
  applyBusinessProfile,
  getFormat,
  layoutPage,
  linkedInCaption,
  requireLayoutFamily,
  usesBusinessProfile,
  validateDesignSpec,
  type DesignSpec,
  type FormatDef,
  type SlotDef,
  type ThemeTokens,
  type Vertical,
} from '@teckstudio/design-spec';
import {instantiateTemplate, searchTemplates, upcomingTemplates, type DesignTemplate} from '@teckstudio/design-spec/catalog';
import {DESIGN_TEMPLATES, findDesignTemplate} from './designTemplates';
import {createDesignProject, designThumbnail, downloadDesignPng} from './designProject';
import {createDesignVideo} from './designVideo';
import {hasProfile, loadBusinessProfile, saveBusinessProfile, type StoredProfile} from './businessProfile';

type VerticalFilter = 'all' | Vertical;
type OutputFilter = 'all' | 'poster' | 'deck' | 'video';

const VERTICALS: {id: VerticalFilter; label: string}[] = [
  {id: 'all', label: 'All'},
  {id: 'festival', label: 'Festivals'},
  {id: 'business', label: 'Offers & shops'},
  {id: 'events', label: 'Invitations'},
  {id: 'hiring', label: 'Hiring'},
  {id: 'education', label: 'Education'},
  {id: 'real-estate', label: 'Real estate'},
  {id: 'tech', label: 'Tech teaching'},
];
const VERTICAL_LABEL = new Map(VERTICALS.map((item) => [item.id, item.label]));
const OUTPUTS: {id: OutputFilter; label: string}[] = [
  {id: 'all', label: 'Any output'},
  {id: 'poster', label: 'Posters'},
  {id: 'deck', label: 'Slide decks'},
  {id: 'video', label: 'Video'},
];

const isVertical = (value: string | null): value is VerticalFilter => VERTICALS.some((item) => item.id === value);

/** Short, stable hash so live previews get a cache key per content version. */
function hashKey(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

function Thumbnail({cacheKey, spec, className, pageIndex = 0, maxEdge, eager, preview, alt = ''}: {cacheKey: string; spec: DesignSpec; className?: string; pageIndex?: number; maxEdge?: number; eager?: boolean; preview?: boolean; alt?: string}) {
  const ref = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState<{key: string; url: string}>();
  const [visible, setVisible] = useState(Boolean(eager));
  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, {rootMargin: '200px'});
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    designThumbnail(cacheKey, spec, maxEdge, pageIndex, {preview, isStale: () => !alive}).then((url) => alive && setRendered({key: cacheKey, url})).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [cacheKey, spec, visible, maxEdge, pageIndex, preview]);
  const format = getFormat(spec.format);
  // Keep showing the previous render while the next one is prepared (no flicker while typing).
  const url = rendered?.url;
  return (
    <div ref={ref} className={`flex items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-[#0E0E16] ${className ?? ''}`}>
      {url ? (
        <img src={url} alt={alt} className={`max-h-full max-w-full object-contain transition-opacity ${rendered?.key === cacheKey ? 'opacity-100' : 'opacity-70'}`} />
      ) : (
        <div className="flex max-h-full max-w-full items-center justify-center bg-white/[0.04]" style={{aspectRatio: format ? `${format.width} / ${format.height}` : '4 / 5', height: '80%'}}>
          <LayoutTemplate className="h-7 w-7 text-[#6d6d80]" />
        </div>
      )}
    </div>
  );
}

function Chip({active, onClick, children}: {active: boolean; onClick: () => void; children: ReactNode}) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`h-8 shrink-0 rounded-full border px-3 text-xs font-semibold transition-all ${active ? 'border-violet-400/70 bg-violet-500/20 text-white' : 'border-white/[0.10] text-[#A8A8B8] hover:border-white/[0.20] hover:text-white'}`}>
      {children}
    </button>
  );
}

function FormatPicker({formats, value, onChange}: {formats: FormatDef[]; value: string; onChange: (id: string) => void}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-xs font-semibold text-[#A8A8B8]">Size</legend>
      <div className="grid grid-cols-3 gap-1.5">
        {formats.map((format) => {
          const scale = 26 / Math.max(format.width, format.height);
          return (
            <button key={format.id} type="button" aria-pressed={value === format.id} onClick={() => onChange(format.id)} title={`${format.width}×${format.height}`} className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[10px] font-semibold leading-tight ${value === format.id ? 'border-violet-400/70 bg-violet-500/15 text-white' : 'border-white/[0.10] text-[#A8A8B8] hover:border-white/[0.22] hover:text-white'}`}>
              <span className="flex h-7 items-center justify-center"><span className="block rounded-[3px] border border-current" style={{width: format.width * scale, height: format.height * scale}} /></span>
              <span className="text-center">{format.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ThemePicker({themes, value, onChange}: {themes: ThemeTokens[]; value: string; onChange: (id: string) => void}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-xs font-semibold text-[#A8A8B8]">Colours</legend>
      <div className="grid grid-cols-3 gap-1.5">
        {themes.map((theme) => (
          <button key={theme.id} type="button" aria-pressed={value === theme.id} onClick={() => onChange(theme.id)} className={`flex items-center gap-2 rounded-lg border p-1.5 text-left text-[10px] font-semibold leading-tight ${value === theme.id ? 'border-violet-400/70 bg-violet-500/15 text-white' : 'border-white/[0.10] text-[#A8A8B8] hover:border-white/[0.22] hover:text-white'}`}>
            <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/20" style={{background: theme.color.background}} aria-hidden="true">
              <span className="absolute bottom-1 left-1 h-2.5 w-2.5 rounded-full" style={{background: theme.color.primary}} />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full" style={{background: theme.color.accent}} />
            </span>
            <span className="min-w-0">{theme.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const fieldInput = 'w-full rounded-lg border border-white/[0.12] bg-[#0E0E16] px-3 py-2 text-sm text-white placeholder:text-[#6d6d80] focus:border-violet-400/60 focus:outline-none';

function QuickField({slot, value, onChange}: {slot: SlotDef; value: string; onChange: (value: string) => void}) {
  const long = (slot.maxChars ?? 0) > 90;
  const over = slot.maxChars !== undefined && value.length > slot.maxChars;
  const id = `quick-${slot.name}`;
  const field = {id, value, 'aria-describedby': slot.maxChars ? `${id}-count` : undefined, 'aria-invalid': over || undefined, onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value)};
  return (
    <div className="flex flex-col gap-1 text-xs font-semibold text-[#A8A8B8]">
      <span className="flex justify-between gap-2">
        <label htmlFor={id}>{slot.label}{slot.required ? ' *' : ''}</label>
        {slot.maxChars && <span id={`${id}-count`} className={over ? 'text-red-300' : 'text-[#6d6d80]'}>{over ? `Too long: ${value.length} of ${slot.maxChars}` : `${value.length}/${slot.maxChars}`}</span>}
      </span>
      {long ? <textarea rows={2} {...field} className={`${fieldInput} resize-y`} /> : <input {...field} className={fieldInput} />}
    </div>
  );
}

function ProfileFields({profile, onChange}: {profile: StoredProfile; onChange: (next: StoredProfile) => void}) {
  const [open, setOpen] = useState(!hasProfile(profile));
  const set = (key: 'name' | 'phone' | 'address') => (event: ChangeEvent<HTMLInputElement>) => onChange({...profile, [key]: event.target.value});
  return (
    <section className="rounded-xl border border-white/[0.10] bg-[#0E0E16] p-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="flex w-full items-center gap-2 text-left text-xs font-semibold text-white">
        <Store className="h-4 w-4 text-violet-300" />
        <span className="flex-1">My business details{hasProfile(profile) && !open ? `: ${profile.name || profile.phone}` : ''}</span>
        <ChevronDown className={`h-4 w-4 text-[#A8A8B8] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[11px] leading-5 text-[#8b8b9c]">Saved on this device and filled into every new greeting, offer and listing.</p>
          <input value={profile.name} onChange={set('name')} placeholder="Shop, business or family name" aria-label="Business name" className={fieldInput} />
          <input value={profile.phone} onChange={set('phone')} placeholder="Phone / WhatsApp" aria-label="Business phone" inputMode="tel" className={fieldInput} />
          <input value={profile.address} onChange={set('address')} placeholder="Area, city" aria-label="Business address" className={fieldInput} />
        </div>
      )}
      {hasProfile(profile) && (
        <label className="mt-2 flex items-center gap-2 text-[11px] text-[#A8A8B8]">
          <input type="checkbox" checked={profile.autoApply} onChange={(event) => onChange({...profile, autoApply: event.target.checked})} className="accent-violet-500" />
          Use my details on this design
        </label>
      )}
    </section>
  );
}

function TemplateChooser({template, onClose}: {template: DesignTemplate; onClose: () => void}) {
  const navigate = useNavigate();
  const [format, setFormat] = useState(template.spec.format);
  const [theme, setTheme] = useState(template.spec.theme);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState(loadBusinessProfile);
  const [previewPage, setPreviewPage] = useState(0);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const isDeck = template.spec.pages.length > 1;
  const usesProfile = usesBusinessProfile(template.spec);
  const isJob = template.spec.pages[0].layout === 'job-posting';
  const [copied, setCopied] = useState(false);
  // Move focus into the dialog (so Escape works at once) and give it back to the card on close.
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  // Template → saved business details → what the user typed here.
  const spec = useMemo(() => {
    const base = instantiateTemplate(template, {format, theme, id: template.spec.id});
    const next = usesProfile && profile.autoApply ? applyBusinessProfile(base, profile) : base;
    for (const [name, value] of Object.entries(edits)) next.pages[0].slots[name] = value;
    return next;
  }, [template, format, theme, edits, profile, usesProfile]);
  const validation = useMemo(() => validateDesignSpec(spec), [spec]);
  // A quick download is only offered once no photo placeholder is left on the page.
  const emptyPhotos = useMemo(() => (isDeck || validation.errors.length ? 0 : layoutPage(spec, 0).filter((item) => item.type === 'image' && !item.src).length), [spec, isDeck, validation.errors.length]);

  // Re-render the preview shortly after typing stops.
  const [preview, setPreview] = useState(spec);
  useEffect(() => {
    const timer = window.setTimeout(() => setPreview(spec), 350);
    return () => window.clearTimeout(timer);
  }, [spec]);
  const previewKey = useMemo(() => `${template.id}:${hashKey(JSON.stringify(preview))}`, [template.id, preview]);
  // Slide thumbnails change only when their own page (or size/colours) changes.
  const pageKeys = useMemo(() => preview.pages.map((page, i) => `${template.id}:${i}:${hashKey(JSON.stringify({...preview, pages: undefined, page}))}`), [template.id, preview]);
  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(linkedInCaption(spec));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Could not copy. Your browser blocked clipboard access.');
    }
  };

  const updateProfile = (next: StoredProfile) => {
    setProfile(next);
    saveBusinessProfile(next);
  };

  const formats = useMemo(() => [...new Set([template.spec.format, ...template.altFormats])].map((id) => FORMATS.find((f) => f.id === id)).filter((f): f is FormatDef => Boolean(f)), [template]);
  const themes = useMemo(() => {
    const rank = (t: ThemeTokens) => (t.id === template.spec.theme ? 3 : t.vertical === template.vertical ? 2 : template.region === 'india' && ['festival', 'events', 'business'].includes(t.vertical) ? 1 : 0);
    return [...THEMES].sort((a, b) => rank(b) - rank(a));
  }, [template]);
  const quickSlots = useMemo(() => {
    const page = template.spec.pages[0];
    return requireLayoutFamily(page.layout).slots.filter((slot) => slot.kind === 'text' && (typeof page.slots[slot.name] === 'string' || slot.required));
  }, [template]);

  const run = async (label: string, task: () => Promise<string>) => {
    setBusy(label);
    setError(undefined);
    try {
      navigate(await task());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create the design.');
      setBusy(undefined);
    }
  };
  const fresh = (): DesignSpec => ({...JSON.parse(JSON.stringify(spec)) as DesignSpec, id: `${template.spec.id}-${Date.now().toString(36)}`});

  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 outline-none sm:p-4" role="dialog" aria-modal="true" aria-label={template.name} onClick={onClose} onKeyDown={(event) => event.key === 'Escape' && onClose()}>
      <div className="grid max-h-[94vh] w-full max-w-6xl gap-5 overflow-y-auto rounded-2xl border border-white/[0.10] bg-[#12121B] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_380px]" onClick={(event) => event.stopPropagation()}>
        <div className="flex min-h-[300px] flex-col gap-3 lg:sticky lg:top-0">
          <Thumbnail key={previewPage} cacheKey={pageKeys[previewPage] ?? previewKey} spec={preview} pageIndex={previewPage} maxEdge={1000} eager preview alt={`Preview of ${template.name}${isDeck ? `, slide ${previewPage + 1}` : ''}`} className="h-[48vh] min-h-[280px] p-3 lg:h-[72vh]" />
          {isDeck && (
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Slides">
              {template.spec.pages.map((page, index) => (
                <button key={page.id} type="button" role="tab" aria-selected={previewPage === index} onClick={() => setPreviewPage(index)} className={`shrink-0 rounded-lg border p-1 ${previewPage === index ? 'border-violet-400/70' : 'border-white/[0.08] hover:border-white/[0.2]'}`}>
                  <Thumbnail cacheKey={pageKeys[index]} spec={preview} pageIndex={index} maxEdge={220} eager preview className="h-16 w-24 border-0" />
                  <span className="mt-1 block text-[10px] font-semibold text-[#A8A8B8]">Slide {index + 1}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C4B5FD]">{VERTICAL_LABEL.get(template.vertical) ?? template.vertical} · {template.category}</p>
            <h2 className="mt-1 text-xl font-bold text-white">{template.name}</h2>
            <p className="mt-2 text-sm leading-6 text-[#A8A8B8]">{template.description}</p>
          </div>
          <ol className="flex gap-2 text-[11px] font-semibold text-[#8b8b9c]" aria-label="Steps">
            <li className="rounded-full bg-violet-500/15 px-2 py-1 text-violet-200">1 · Your details</li>
            <li className="rounded-full bg-white/[0.05] px-2 py-1">2 · Size &amp; colours</li>
            <li className="rounded-full bg-white/[0.05] px-2 py-1">3 · Create</li>
          </ol>
          {usesProfile && <ProfileFields profile={profile} onChange={updateProfile} />}
          <section className="flex flex-col gap-2.5" aria-label="Text">
            {quickSlots.map((slot) => {
              const current = spec.pages[0].slots[slot.name];
              return <QuickField key={slot.name} slot={slot} value={typeof current === 'string' ? current : ''} onChange={(value) => setEdits((previous) => ({...previous, [slot.name]: value}))} />;
            })}
            <p className="text-[11px] leading-5 text-[#8b8b9c]">{isDeck ? 'This edits the first slide. ' : ''}Photos, prices and lists are edited in the editor’s Content tab after you create the design.</p>
          </section>
          <FormatPicker formats={formats} value={format} onChange={setFormat} />
          <ThemePicker themes={themes} value={theme} onChange={setTheme} />
          {validation.warnings.length > 0 && validation.errors.length === 0 && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">Some text is long for this size and will be shrunk. Shorten it or pick a larger size. ({validation.warnings.length} note{validation.warnings.length === 1 ? '' : 's'})</p>
          )}
          {validation.errors.length > 0 && <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-100" role="alert">{validation.errors[0]}</p>}
          <div className="sticky bottom-0 -mx-1 mt-auto flex flex-col gap-2 bg-[#12121B] px-1 pb-1 pt-2">
            {(template.outputs.includes('poster') || template.outputs.includes('deck')) && (
              <button type="button" disabled={Boolean(busy) || validation.errors.length > 0} onClick={() => run('design', async () => `/editor/${await createDesignProject(fresh(), template.id)}`)} className="flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{background: 'linear-gradient(135deg, #7C3AED, #A855F7)'}}>
                {isDeck ? <Presentation className="h-4 w-4" /> : <LayoutTemplate className="h-4 w-4" />}
                {busy === 'design' ? 'Creating…' : isDeck ? 'Create slide deck' : 'Create poster'}
              </button>
            )}
            {!isDeck && (
              <button type="button" disabled={Boolean(busy) || validation.errors.length > 0 || emptyPhotos > 0} title={emptyPhotos ? 'Add the photo in the editor first, or pick a design without a photo.' : 'Full-size PNG, ready for WhatsApp and Instagram'} onClick={async () => {
                setBusy('png');
                setError(undefined);
                try {
                  await downloadDesignPng(fresh(), template.name);
                } catch (reason) {
                  setError(reason instanceof Error ? reason.message : 'Could not render the PNG.');
                } finally {
                  setBusy(undefined);
                }
              }} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.14] text-sm font-semibold text-white hover:bg-white/[0.05] disabled:opacity-50">
                <Download className="h-4 w-4" />
                {busy === 'png' ? 'Rendering…' : emptyPhotos ? 'Download PNG (add photo first)' : 'Download PNG'}
              </button>
            )}
            {isJob && (
              <button type="button" onClick={() => void copyCaption()} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.14] text-sm font-semibold text-white hover:bg-white/[0.05]">
                <ClipboardCopy className="h-4 w-4" />
                <span aria-live="polite">{copied ? 'Caption copied: paste it with the image' : 'Copy LinkedIn caption'}</span>
              </button>
            )}
            {template.outputs.includes('video') && (
              <button type="button" disabled={Boolean(busy) || validation.errors.length > 0} onClick={() => run('video', async () => `/video/${await createDesignVideo(fresh(), template.id)}`)} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-400/40 text-sm font-semibold text-white hover:bg-violet-500/10 disabled:opacity-60">
                <Film className="h-4 w-4" />
                {busy === 'video' ? 'Creating…' : 'Create motion video'}
              </button>
            )}
            <button type="button" onClick={onClose} className="h-10 rounded-xl text-sm font-semibold text-[#A8A8B8] hover:text-white">Cancel</button>
            {error && <p className="text-xs text-red-300" role="alert">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({template, onSelect}: {template: DesignTemplate; onSelect: (template: DesignTemplate) => void}) {
  return (
    <button type="button" onClick={() => onSelect(template)} className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-[#12121B] p-3 text-left transition-all hover:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-400/40">
      <Thumbnail cacheKey={template.id} spec={template.spec} className="aspect-square p-2" />
      <span className="truncate text-sm font-semibold text-white">{template.name}</span>
      <span className="flex flex-wrap gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#8b8b9c]">
        <span>{getFormat(template.spec.format)?.label}</span>
        {template.spec.pages.length > 1 && <span className="text-violet-300">· {template.spec.pages.length} slides</span>}
        {template.outputs.includes('video') && <span className="text-emerald-300">· video</span>}
        {template.season && <span className="text-amber-300">· {template.season.label}</span>}
      </span>
    </button>
  );
}

function Section({title, icon, children}: {title: string; icon?: ReactNode; children: ReactNode}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#C4B5FD]">{icon}{title}</h2>
      {children}
    </section>
  );
}

export default function DesignStudio() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const vertical: VerticalFilter = isVertical(params.get('vertical')) ? params.get('vertical') as VerticalFilter : 'all';
  const indiaOnly = params.get('region') === 'india';
  const [output, setOutput] = useState<OutputFilter>('all');
  const [query, setQuery] = useState('');
  const selected = findDesignTemplate(params.get('template'));

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, {replace: true});
  };
  const select = (template?: DesignTemplate) => setParam('template', template?.id);

  const visible = useMemo(() => {
    const filtered = DESIGN_TEMPLATES.filter((template) =>
      (vertical === 'all' || template.vertical === vertical)
      && (output === 'all' || template.outputs.includes(output))
      && (!indiaOnly || template.region === 'india'));
    return searchTemplates(filtered, query);
  }, [vertical, output, query, indiaOnly]);
  const upcoming = useMemo(() => (query ? [] : upcomingTemplates(visible, new Date())), [visible, query]);
  const upcomingIds = new Set(upcoming.map((template) => template.id));
  const starters = visible.filter((template) => template.source === 'starter' && !upcomingIds.has(template.id));
  const legacy = visible.filter((template) => template.source === 'legacy');
  const seasonNames = [...new Set(upcoming.map((template) => template.season!.label))].slice(0, 3).join(', ');

  const grid = (templates: DesignTemplate[]) => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {templates.map((template) => <TemplateCard key={template.id} template={template} onSelect={select} />)}
    </div>
  );
  // With no filter or search, group starters by use case so the page reads like a menu.
  const grouped = vertical === 'all' && !query
    ? VERTICALS.filter((item) => item.id !== 'all').map((item) => ({...item, templates: starters.filter((template) => template.vertical === item.id)})).filter((group) => group.templates.length)
    : [{id: vertical, label: 'Starter templates', templates: starters}];

  return (
    <div className="min-h-screen bg-[#0A0A12] px-4 py-6 text-white sm:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
        <header className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => navigate('/')} className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.10] px-3 text-sm text-[#A8A8B8] hover:text-white"><ArrowLeft className="h-4 w-4" />Dashboard</button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">Design Studio</h1>
            <p className="text-sm text-[#A8A8B8]">Pick a template, add your details, create. Festival wishes, shop offers, invitations, admissions, property and tech lessons as posters, slide decks or motion videos.</p>
          </div>
        </header>
        <div className="flex flex-col gap-2">
          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
            {VERTICALS.map((item) => <Chip key={item.id} active={vertical === item.id} onClick={() => setParam('vertical', item.id === 'all' ? undefined : item.id)}>{item.label}</Chip>)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip active={indiaOnly} onClick={() => setParam('region', indiaOnly ? undefined : 'india')}>Made for India</Chip>
            <span className="mx-1 h-5 w-px bg-white/[0.12]" />
            {OUTPUTS.map((item) => <Chip key={item.id} active={output === item.id} onClick={() => setOutput(item.id)}>{item.label}</Chip>)}
            <label className="relative ml-auto w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#71717F]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search: Diwali, hiring, menu, 3 BHK…" aria-label="Search templates" className="h-9 w-full rounded-lg border border-white/[0.10] bg-[#12121B] pl-9 pr-3 text-sm text-white placeholder:text-[#71717F]" />
            </label>
          </div>
        </div>
        {upcoming.length > 0 && (
          <Section title={`Coming up · ${seasonNames}`} icon={<CalendarHeart className="h-4 w-4" />}>
            {grid(upcoming)}
          </Section>
        )}
        {grouped.map((group) => <Section key={group.id} title={group.label}>{grid(group.templates)}</Section>)}
        {legacy.length > 0 && <Section title="Tech poster library">{grid(legacy)}</Section>}
        {!visible.length && (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-[#A8A8B8]">
            <p>No templates match these filters.</p>
            <button type="button" onClick={() => { setQuery(''); setOutput('all'); setParams(new URLSearchParams(), {replace: true}); }} className="rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs font-semibold text-white hover:border-violet-400/50">Clear filters</button>
          </div>
        )}
      </div>
      {selected && <TemplateChooser key={selected.id} template={selected} onClose={() => select(undefined)} />}
    </div>
  );
}

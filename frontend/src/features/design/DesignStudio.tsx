import {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {ArrowLeft, Film, LayoutTemplate, Presentation, Search} from 'lucide-react';
import {FORMATS, THEMES, getFormat, validateDesignSpec, type DesignSpec} from '@teckstudio/design-spec';
import {instantiateTemplate, searchTemplates, type DesignTemplate} from '@teckstudio/design-spec/catalog';
import {DESIGN_TEMPLATES, findDesignTemplate} from './designTemplates';
import {createDesignProject, designThumbnail} from './designProject';
import {createDesignVideo} from './designVideo';

type VerticalFilter = 'all' | 'tech' | 'real-estate';
type OutputFilter = 'all' | 'poster' | 'deck' | 'video';

const VERTICALS: {id: VerticalFilter; label: string}[] = [
  {id: 'all', label: 'All'},
  {id: 'tech', label: 'Tech teaching'},
  {id: 'real-estate', label: 'Real estate'},
];
const OUTPUTS: {id: OutputFilter; label: string}[] = [
  {id: 'all', label: 'Any output'},
  {id: 'poster', label: 'Posters'},
  {id: 'deck', label: 'Slide decks'},
  {id: 'video', label: 'Video'},
];

function Thumbnail({cacheKey, spec, className}: {cacheKey: string; spec: DesignSpec; className?: string}) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string>();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, {rootMargin: '200px'});
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    designThumbnail(cacheKey, spec).then((next) => alive && setUrl(next)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [cacheKey, spec, visible]);
  const format = getFormat(spec.format);
  return (
    <div ref={ref} className={`flex items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-[#0E0E16] ${className ?? ''}`}>
      {url ? (
        <img src={url} alt="" className="max-h-full max-w-full object-contain" />
      ) : (
        <div className="flex max-h-full max-w-full items-center justify-center bg-white/[0.04]" style={{aspectRatio: format ? `${format.width} / ${format.height}` : '4 / 5', height: '80%'}}>
          <LayoutTemplate className="h-7 w-7 text-[#6d6d80]" />
        </div>
      )}
    </div>
  );
}

function Chip({active, onClick, children}: {active: boolean; onClick: () => void; children: React.ReactNode}) {
  return (
    <button type="button" onClick={onClick} className={`h-8 rounded-full border px-3 text-xs font-semibold transition-all ${active ? 'border-violet-400/70 bg-violet-500/20 text-white' : 'border-white/[0.10] text-[#A8A8B8] hover:border-white/[0.20] hover:text-white'}`}>
      {children}
    </button>
  );
}

function TemplateChooser({template, onClose}: {template: DesignTemplate; onClose: () => void}) {
  const navigate = useNavigate();
  const [format, setFormat] = useState(template.spec.format);
  const [theme, setTheme] = useState(template.spec.theme);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const spec = useMemo(() => instantiateTemplate(template, {format, theme, id: `${template.spec.id}-${format}-${theme}`}), [template, format, theme]);
  const validation = useMemo(() => validateDesignSpec(spec), [spec]);
  const formats = useMemo(() => [...new Set([template.spec.format, ...template.altFormats])].map((id) => FORMATS.find((f) => f.id === id)).filter((f): f is (typeof FORMATS)[number] => Boolean(f)), [template]);
  const themes = useMemo(() => [...THEMES].sort((a, b) => Number(b.vertical === template.vertical) - Number(a.vertical === template.vertical)), [template.vertical]);
  const isDeck = template.spec.pages.length > 1;

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
  const fresh = () => instantiateTemplate(template, {format, theme});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={template.name} onClick={onClose}>
      <div className="grid max-h-[92vh] w-full max-w-5xl gap-6 overflow-y-auto rounded-2xl border border-white/[0.10] bg-[#12121B] p-5 md:grid-cols-[minmax(0,1fr)_320px]" onClick={(event) => event.stopPropagation()}>
        <div className="flex min-h-[320px] flex-col gap-3">
          <Thumbnail cacheKey={`${spec.id}:preview`} spec={spec} className="h-[60vh] min-h-[320px] p-3" />
          {isDeck && <p className="text-xs text-[#A8A8B8]">{template.spec.pages.length} slides. The preview shows the first slide.</p>}
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C4B5FD]">{template.vertical === 'real-estate' ? 'Real estate' : 'Tech teaching'} · {template.category}</p>
            <h2 className="mt-1 text-xl font-bold text-white">{template.name}</h2>
            <p className="mt-2 text-sm leading-6 text-[#A8A8B8]">{template.description}</p>
          </div>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[#A8A8B8]">
            Format
            <select value={format} onChange={(event) => setFormat(event.target.value)} className="h-10 rounded-lg border border-white/[0.12] bg-[#0E0E16] px-3 text-sm text-white">
              {formats.map((f) => <option key={f.id} value={f.id}>{f.label} ({f.width}×{f.height})</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[#A8A8B8]">
            Theme
            <select value={theme} onChange={(event) => setTheme(event.target.value)} className="h-10 rounded-lg border border-white/[0.12] bg-[#0E0E16] px-3 text-sm text-white">
              {themes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          {validation.warnings.length > 0 && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">Some text may be shrunk in this format. You can shorten it in the editor. ({validation.warnings.length} note{validation.warnings.length === 1 ? '' : 's'})</p>
          )}
          {validation.errors.length > 0 && <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-100">{validation.errors[0]}</p>}
          <div className="mt-auto flex flex-col gap-2">
            {(template.outputs.includes('poster') || template.outputs.includes('deck')) && (
              <button type="button" disabled={Boolean(busy) || validation.errors.length > 0} onClick={() => run('design', async () => `/editor/${await createDesignProject(fresh(), template.id)}`)} className="flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{background: 'linear-gradient(135deg, #7C3AED, #A855F7)'}}>
                {isDeck ? <Presentation className="h-4 w-4" /> : <LayoutTemplate className="h-4 w-4" />}
                {busy === 'design' ? 'Creating…' : isDeck ? 'Create slide deck' : 'Create poster'}
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

export default function DesignStudio() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [vertical, setVertical] = useState<VerticalFilter>((params.get('vertical') as VerticalFilter) || 'all');
  const [output, setOutput] = useState<OutputFilter>('all');
  const [query, setQuery] = useState('');
  const selected = findDesignTemplate(params.get('template'));

  const visible = useMemo(() => {
    const filtered = DESIGN_TEMPLATES.filter((template) => (vertical === 'all' || template.vertical === vertical) && (output === 'all' || template.outputs.includes(output)));
    return searchTemplates(filtered, query);
  }, [vertical, output, query]);
  const starters = visible.filter((template) => template.source === 'starter');
  const legacy = visible.filter((template) => template.source === 'legacy');

  const select = (template?: DesignTemplate) => {
    const next = new URLSearchParams(params);
    if (template) next.set('template', template.id);
    else next.delete('template');
    setParams(next, {replace: true});
  };

  const grid = (templates: DesignTemplate[]) => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {templates.map((template) => (
        <button key={template.id} type="button" onClick={() => select(template)} className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-[#12121B] p-3 text-left transition-all hover:border-violet-400/50 focus:outline-none focus:ring-2 focus:ring-violet-400/40">
          <Thumbnail cacheKey={template.id} spec={template.spec} className="aspect-square p-2" />
          <span className="truncate text-sm font-semibold text-white">{template.name}</span>
          <span className="flex flex-wrap gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#8b8b9c]">
            <span>{getFormat(template.spec.format)?.label}</span>
            {template.spec.pages.length > 1 && <span className="text-violet-300">· {template.spec.pages.length} slides</span>}
            {template.outputs.includes('video') && <span className="text-emerald-300">· video</span>}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A12] px-4 py-6 text-white sm:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
        <header className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => navigate('/')} className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.10] px-3 text-sm text-[#A8A8B8] hover:text-white"><ArrowLeft className="h-4 w-4" />Dashboard</button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">Design Studio</h1>
            <p className="text-sm text-[#A8A8B8]">One template, any output: posters, slide decks and motion videos for teaching tech and marketing property.</p>
          </div>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          {VERTICALS.map((item) => <Chip key={item.id} active={vertical === item.id} onClick={() => setVertical(item.id)}>{item.label}</Chip>)}
          <span className="mx-1 h-5 w-px bg-white/[0.12]" />
          {OUTPUTS.map((item) => <Chip key={item.id} active={output === item.id} onClick={() => setOutput(item.id)}>{item.label}</Chip>)}
          <label className="relative ml-auto w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#71717F]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search templates" aria-label="Search templates" className="h-9 w-full rounded-lg border border-white/[0.10] bg-[#12121B] pl-9 pr-3 text-sm text-white placeholder:text-[#71717F]" />
          </label>
        </div>
        {starters.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#C4B5FD]">Starter templates</h2>
            {grid(starters)}
          </section>
        )}
        {legacy.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#C4B5FD]">Tech poster library</h2>
            {grid(legacy)}
          </section>
        )}
        {!visible.length && <p className="py-16 text-center text-sm text-[#A8A8B8]">No templates match these filters.</p>}
      </div>
      {selected && <TemplateChooser key={selected.id} template={selected} onClose={() => select(undefined)} />}
    </div>
  );
}

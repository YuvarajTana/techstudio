import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';
import {fabric} from 'fabric';
import {ImagePlus, LayoutTemplate, RefreshCw, Trash2, Plus} from 'lucide-react';
import {
  FORMATS,
  listIcons,
  requireLayoutFamily,
  specFromPages,
  validateDesignSpec,
  type AgentValue,
  type CardValue,
  type CodeValue,
  type DesignPage,
  type DesignSpec,
  type FactsValue,
  type FlowValue,
  type ImageValue,
  type SideValue,
  type SlotDef,
  type StatValue,
} from '@teckstudio/design-spec';
import {loadDesignFonts, renderDesignPage} from '@teckstudio/design-spec/fabric';
import {useEditorStore} from '../../store/useEditorStore';
import {CUSTOM_FABRIC_PROPERTIES} from '../../utils/editorElementFactory';
import {resolveAssetUrl} from '../../utils/assetUrlResolver';
import {enqueueProjectSave} from '../../services/projectSaveQueue';
import {listUploadedImages} from '../../services/uploadsApi';
import type {UploadedImageAsset} from '../../types/uploads';
import {createDesignProject, type DesignContext} from './designProject';
import {designSpecFromContext} from './designVideo';
import {findDesignTemplate} from './designTemplates';

const input = 'w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[11px] text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:outline-none';
const label = 'flex flex-col gap-1 text-[10px] font-semibold text-zinc-400';
const smallButton = 'flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-[10px] font-semibold text-zinc-300 hover:border-violet-500/50 hover:text-white disabled:opacity-50';
const ICON_IDS = listIcons().map(({id}) => id);
/** Unique-enough suffix for new flow nodes and copied specs. */
const freshId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
const renderOptions = {serializationProps: CUSTOM_FABRIC_PROPERTIES, resolveImageUrl: (src: string) => (src.startsWith('blob:') ? src : resolveAssetUrl(src))};

/** Current canvas pages without mutating the store (active page serialised live). */
function currentPages() {
  const {pages, activePageId, canvas} = useEditorStore.getState();
  return pages.map((page) => (page.id === activePageId && canvas ? {id: page.id, data: JSON.stringify(canvas.toJSON(CUSTOM_FABRIC_PROPERTIES))} : {id: page.id, data: page.data}));
}

function Text({slot, value, onChange}: {slot: SlotDef; value: string; onChange: (value: string) => void}) {
  const long = (slot.maxChars ?? 0) > 100;
  return (
    <label className={label}>
      <span className="flex justify-between">{slot.label}{slot.maxChars ? <span className={value.length > slot.maxChars ? 'text-red-400' : 'text-zinc-600'}>{value.length}/{slot.maxChars}</span> : null}</span>
      {long ? <textarea className={`${input} min-h-[56px]`} value={value} onChange={(event) => onChange(event.target.value)} /> : <input className={input} value={value} onChange={(event) => onChange(event.target.value)} />}
    </label>
  );
}

function Lines({slot, value, onChange}: {slot: SlotDef; value: string[]; onChange: (value: string[]) => void}) {
  return (
    <label className={label}>
      {slot.label} · one per line{slot.maxItems ? ` (max ${slot.maxItems})` : ''}
      <textarea className={`${input} min-h-[64px]`} value={value.join('\n')} onChange={(event) => onChange(event.target.value.split('\n').slice(0, slot.maxItems ?? 50))} />
    </label>
  );
}

function IconSelect({value, onChange}: {value?: string; onChange: (value?: string) => void}) {
  return (
    <select className={`${input} w-24`} value={value ?? ''} onChange={(event) => onChange(event.target.value || undefined)} aria-label="Icon">
      <option value="">No icon</option>
      {ICON_IDS.map((id) => <option key={id} value={id}>{id}</option>)}
    </select>
  );
}

function ImagePicker({value, uploads, onChange, labelText}: {value?: ImageValue; uploads: UploadedImageAsset[]; onChange: (value: ImageValue) => void; labelText: string}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1 rounded-md border border-zinc-800 p-2">
      <div className="flex items-center gap-2">
        {value?.src ? <img src={resolveAssetUrl(value.src)} alt="" className="h-10 w-14 rounded object-cover" /> : <div className="flex h-10 w-14 items-center justify-center rounded bg-zinc-900 text-zinc-600"><ImagePlus className="h-4 w-4" /></div>}
        <div className="min-w-0 flex-1 text-[10px] text-zinc-400">
          <div className="font-semibold text-zinc-300">{labelText}</div>
          <div className="truncate">{value?.src ? (value.assetId ? 'Your upload' : value.src) : 'Placeholder'}</div>
        </div>
        <button type="button" className={smallButton} onClick={() => setOpen(!open)}>{open ? 'Close' : 'Choose'}</button>
        {value?.src && <button type="button" className={smallButton} onClick={() => onChange({...value, src: '', assetId: undefined})} aria-label="Clear image"><Trash2 className="h-3 w-3" /></button>}
      </div>
      {open && (
        <div className="grid max-h-40 grid-cols-4 gap-1 overflow-y-auto">
          {uploads.length === 0 && <p className="col-span-4 text-[10px] text-zinc-500">Upload images in the Uploads panel first; they appear here.</p>}
          {uploads.map((asset) => (
            <button key={asset.id} type="button" className="overflow-hidden rounded border border-zinc-800 hover:border-violet-400" onClick={() => { onChange({...value, src: asset.url, assetId: asset.id, alt: value?.alt ?? asset.filename}); setOpen(false); }} title={asset.filename}>
              <img src={asset.thumbnailUrl} alt={asset.filename} className="h-12 w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Rows<T>({items, max, make, onChange, render}: {items: T[]; max?: number; make: () => T; onChange: (items: T[]) => void; render: (item: T, update: (item: T) => void) => ReactNode}) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-1">
          <div className="min-w-0 flex-1">{render(item, (next) => onChange(items.map((current, i) => (i === index ? next : current))))}</div>
          <button type="button" className={smallButton} onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label="Remove"><Trash2 className="h-3 w-3" /></button>
        </div>
      ))}
      {(max === undefined || items.length < max) && <button type="button" className={`${smallButton} self-start`} onClick={() => onChange([...items, make()])}><Plus className="h-3 w-3" />Add</button>}
    </div>
  );
}

function SlotField({slot, page, uploads, onChange}: {slot: SlotDef; page: DesignPage; uploads: UploadedImageAsset[]; onChange: (value: unknown) => void}) {
  const value = page.slots[slot.name];
  switch (slot.kind) {
    case 'text':
      return <Text slot={slot} value={typeof value === 'string' ? value : ''} onChange={onChange} />;
    case 'list':
      return <Lines slot={slot} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />;
    case 'image':
      return <ImagePicker labelText={slot.label} value={value as ImageValue | undefined} uploads={uploads} onChange={onChange} />;
    case 'images': {
      const images = Array.isArray(value) ? (value as ImageValue[]) : [];
      return <div className={label}>{slot.label}<Rows items={images} max={slot.maxItems} make={() => ({src: ''})} onChange={onChange} render={(image, update) => <ImagePicker labelText="Photo" value={image} uploads={uploads} onChange={update} />} /></div>;
    }
    case 'cards': {
      const cards = Array.isArray(value) ? (value as CardValue[]) : [];
      return (
        <div className={label}>{slot.label}
          <Rows items={cards} max={slot.maxItems} make={() => ({title: 'New item', body: ''})} onChange={onChange} render={(card, update) => (
            // Offer items are name + price and have no icon.
            slot.name === 'items' ? (
              <div className="flex gap-1">
                <input className={input} value={card.title} onChange={(event) => update({...card, title: event.target.value})} aria-label="Item" />
                <input className={`${input} w-28`} value={card.body ?? ''} placeholder="₹ price" onChange={(event) => update({...card, body: event.target.value || undefined})} aria-label="Price" />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex gap-1"><input className={input} value={card.title} onChange={(event) => update({...card, title: event.target.value})} aria-label="Title" /><IconSelect value={card.icon} onChange={(icon) => update({...card, icon})} /></div>
                <textarea className={`${input} min-h-[40px]`} value={card.body ?? ''} placeholder="Details (optional)" onChange={(event) => update({...card, body: event.target.value || undefined})} />
              </div>
            )
          )} />
        </div>
      );
    }
    case 'stats': {
      const stats = Array.isArray(value) ? (value as StatValue[]) : [];
      return <div className={label}>{slot.label}<Rows items={stats} max={slot.maxItems} make={() => ({value: '0', label: 'Label'})} onChange={onChange} render={(stat, update) => <div className="flex gap-1"><input className={`${input} w-20`} value={stat.value} onChange={(event) => update({...stat, value: event.target.value})} aria-label="Value" /><input className={input} value={stat.label} onChange={(event) => update({...stat, label: event.target.value})} aria-label="Label" /></div>} /></div>;
    }
    case 'facts': {
      const facts = (value && typeof value === 'object' ? value : {}) as FactsValue;
      const number = (key: 'bhk' | 'beds' | 'baths' | 'sqft' | 'parking', text: string) => <label key={key} className={label}>{text}<input className={input} type="number" min={0} value={facts[key] ?? ''} onChange={(event) => onChange({...facts, [key]: event.target.value === '' ? undefined : Number(event.target.value)})} /></label>;
      const text = (key: 'lot' | 'facing', title: string, placeholder: string) => <label key={key} className={label}>{title}<input className={input} placeholder={placeholder} value={facts[key] ?? ''} onChange={(event) => onChange({...facts, [key]: event.target.value || undefined})} /></label>;
      // BHK replaces Beds on the design when both are set (Indian listings).
      return <div className={label}>{slot.label}<div className="grid grid-cols-2 gap-1">{number('bhk', 'BHK')}{number('beds', 'Beds')}{number('baths', 'Baths')}{number('sqft', 'Sq ft')}{number('parking', 'Parking')}{text('facing', 'Facing', 'East facing')}<span className="col-span-2">{text('lot', 'Lot / plot size', '150 – 400 sq yd')}</span></div></div>;
    }
    case 'code': {
      const code = (value && typeof value === 'object' ? value : {language: 'text', source: ''}) as CodeValue;
      return (
        <div className={label}>{slot.label}
          <select className={input} value={code.language} onChange={(event) => onChange({...code, language: event.target.value as CodeValue['language']})}>{['python', 'javascript', 'typescript', 'sql', 'bash', 'json', 'text'].map((language) => <option key={language}>{language}</option>)}</select>
          <textarea className={`${input} min-h-[110px] font-mono`} value={code.source} onChange={(event) => onChange({...code, source: event.target.value})} />
        </div>
      );
    }
    case 'flow': {
      const flow = (value && typeof value === 'object' ? value : {nodes: [], edges: []}) as FlowValue;
      const setNodes = (nodes: FlowValue['nodes']) => {
        const ids = new Set(nodes.map((node) => node.id));
        onChange({nodes, edges: flow.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to))});
      };
      const connectInOrder = () => onChange({nodes: flow.nodes, edges: flow.nodes.slice(1).map((node, i) => ({from: flow.nodes[i].id, to: node.id}))});
      return (
        <div className={label}>{slot.label}
          <Rows<FlowValue['nodes'][number]> items={flow.nodes} max={slot.maxItems} make={() => ({id: freshId('n'), label: 'Step'})} onChange={setNodes} render={(node, update) => <div className="flex gap-1"><input className={input} value={node.label} onChange={(event) => update({...node, label: event.target.value})} aria-label="Label" /><IconSelect value={node.icon} onChange={(icon) => update({...node, icon})} /></div>} />
          <button type="button" className={`${smallButton} self-start`} onClick={connectInOrder}>Connect in order ({flow.edges.length} links)</button>
        </div>
      );
    }
    case 'side': {
      const side = (value && typeof value === 'object' ? value : {title: '', points: []}) as SideValue;
      return <div className={label}>{slot.label}<input className={input} value={side.title} onChange={(event) => onChange({...side, title: event.target.value})} aria-label={`${slot.label} title`} /><textarea className={`${input} min-h-[64px]`} value={side.points.join('\n')} onChange={(event) => onChange({...side, points: event.target.value.split('\n').slice(0, slot.maxItems ?? 6)})} aria-label={`${slot.label} points`} /></div>;
    }
    case 'agent': {
      const agent = (value && typeof value === 'object' ? value : {name: ''}) as AgentValue;
      const field = (key: keyof AgentValue, text: string) => <label key={key} className={label}>{text}<input className={input} value={agent[key] ?? ''} onChange={(event) => onChange({...agent, [key]: event.target.value || undefined, name: key === 'name' ? event.target.value : agent.name})} /></label>;
      return <div className={label}>{slot.label}<div className="grid grid-cols-2 gap-1">{field('name', 'Name')}{field('title', 'Title')}{field('phone', 'Phone')}{field('email', 'Email')}</div></div>;
    }
  }
}

export default function DesignContentPanel() {
  const navigate = useNavigate();
  const creativeContext = useEditorStore((state) => state.creativeContext);
  const activePageId = useEditorStore((state) => state.activePageId);
  const projectId = useEditorStore((state) => state.projectId);
  const stored = designSpecFromContext(creativeContext);
  const [draft, setDraft] = useState<DesignSpec | undefined>(() => (stored ? specFromPages(stored, currentPages()).spec : undefined));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState<UploadedImageAsset[]>([]);
  const [format, setFormat] = useState(stored?.format ?? '');

  useEffect(() => {
    const controller = new AbortController();
    listUploadedImages('', controller.signal).then((result) => setUploads(result.items)).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const pageIndex = draft ? draft.pages.findIndex((page) => `page-${page.id}` === activePageId || page.id === activePageId) : -1;
  const page = draft && pageIndex >= 0 ? draft.pages[pageIndex] : undefined;
  const validation = useMemo(() => (draft ? validateDesignSpec(draft) : {errors: [], warnings: []}), [draft]);
  const pageNotes = [...validation.errors, ...validation.warnings].filter((note) => page && note.startsWith(`/pages/${pageIndex}`));

  if (!stored || !draft) return <p className="text-xs text-zinc-500">This design was not created from a Design Studio template.</p>;
  if (!page) return <p className="text-xs text-zinc-500">This page is not part of the template. Content editing applies to template pages only.</p>;
  const family = requireLayoutFamily(page.layout);
  const template = findDesignTemplate(typeof creativeContext?.template_id === 'string' ? creativeContext.template_id : undefined);
  const formats = template ? FORMATS.filter((f) => [template.spec.format, ...template.altFormats].includes(f.id)) : FORMATS;

  const updatePage = (next: DesignPage) => setDraft({...draft, pages: draft.pages.map((current, i) => (i === pageIndex ? next : current))});
  const reloadFromCanvas = () => { setDraft(specFromPages(stored, currentPages()).spec); setStatus('Loaded the text currently on the canvas.'); };

  const saveContext = async (spec: DesignSpec) => {
    const context: DesignContext = {...(creativeContext as unknown as DesignContext), schema: 'design-context/v1', design_spec: spec};
    useEditorStore.getState().setCreativeContext(context as unknown as Record<string, unknown>);
    if (projectId) await enqueueProjectSave(projectId, {creative_context: context});
  };

  const apply = async () => {
    if (validation.errors.length) return;
    if (!window.confirm('Re-layout replaces manual position and style changes on this page. Continue?')) return;
    setBusy(true);
    setStatus('Laying out…');
    try {
      await loadDesignFonts(draft);
      const data = await renderDesignPage(fabric, draft, pageIndex, renderOptions);
      await useEditorStore.getState().replaceActivePageData(data);
      await saveContext(draft);
      setStatus('Page updated.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not update the page.');
    } finally {
      setBusy(false);
    }
  };

  const reformat = async () => {
    if (!format || format === draft.format) return;
    setBusy(true);
    setStatus('Creating a copy in the new format…');
    try {
      // The draft already holds the canvas text plus any form edits.
      const copy: DesignSpec = {...draft, format, id: freshId(`${draft.id.replace(/-[a-z0-9]{6,}$/, '')}-`)};
      navigate(`/editor/${await createDesignProject(copy, template?.id)}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not create the copy.');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-zinc-100">Content</h3>
          <p className="text-[10px] text-zinc-500">{family.label} · page {pageIndex + 1} of {draft.pages.length}</p>
        </div>
        <button type="button" className={smallButton} onClick={reloadFromCanvas} title="Discard form changes and read the text on the canvas"><RefreshCw className="h-3 w-3" />Canvas</button>
      </div>
      {family.variants.length > 1 && (
        <label className={label}>Layout variant
          <select className={input} value={page.variant ?? family.variants[0]} onChange={(event) => updatePage({...page, variant: event.target.value})}>{family.variants.map((variant) => <option key={variant}>{variant}</option>)}</select>
        </label>
      )}
      {family.slots.map((slot) => (
        <SlotField key={slot.name} slot={slot} page={page} uploads={uploads} onChange={(value) => updatePage({...page, slots: {...page.slots, [slot.name]: value as never}})} />
      ))}
      <div className="flex flex-col gap-1.5 border-t border-zinc-800 pt-3">
        <p className="text-[10px] font-semibold text-zinc-400">Brand (all pages, applied when you re-layout a page)</p>
        <label className={label}>Name<input className={input} value={draft.brand?.name ?? ''} placeholder="Company name" onChange={(event) => setDraft({...draft, brand: {...draft.brand, name: event.target.value || undefined}})} /></label>
        <ImagePicker labelText="Logo (replaces the name)" value={draft.brand?.logo} uploads={uploads} onChange={(logo) => setDraft({...draft, brand: {...draft.brand, logo: logo?.src ? logo : undefined}})} />
      </div>
      <label className={label}>Speaker notes / narration
        <textarea className={`${input} min-h-[56px]`} value={page.notes ?? ''} onChange={(event) => updatePage({...page, notes: event.target.value || undefined})} />
      </label>
      {pageNotes.length > 0 && (
        <ul className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] leading-4 text-amber-100">
          {pageNotes.slice(0, 5).map((note) => <li key={note}>{note.replace(/^\/pages\/\d+\/?/, '')}</li>)}
        </ul>
      )}
      <button type="button" disabled={busy || validation.errors.length > 0} onClick={() => void apply()} className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-violet-600 text-[11px] font-semibold text-white hover:bg-violet-500 disabled:opacity-50">
        <LayoutTemplate className="h-3.5 w-3.5" />Apply to page
      </button>
      <div className="flex flex-col gap-1 border-t border-zinc-800 pt-3">
        <label className={label}>Change format (creates a copy)
          <select className={input} value={format} onChange={(event) => setFormat(event.target.value)}>
            {formats.map((f) => <option key={f.id} value={f.id}>{f.label} ({f.width}×{f.height})</option>)}
          </select>
        </label>
        <button type="button" disabled={busy || format === draft.format} onClick={() => void reformat()} className={`${smallButton} justify-center py-1.5`}>Create copy in this format</button>
      </div>
      {status && <p className="text-[10px] text-zinc-400" role="status">{status}</p>}
    </div>
  );
}

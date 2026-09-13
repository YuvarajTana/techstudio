import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Heart, Loader2, Search, Trash2, Upload } from 'lucide-react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { deleteFont, listFonts, recordFontUse, setFontFavourite, uploadFont, type FontListItem } from '../../services/fontsApi';
import { getAuthToken } from '../../services/apiClient';
import { useEditorStore } from '../../store/useEditorStore';
import { ensureFontLoaded, type FontReference } from '../../utils/fontLoader';
import { isEditableTextObject } from '../../utils/textSelectionStyles';

export const FontBrowserPanel: React.FC = () => {
  const { canvas, selectedObject, applyTextSelectionStyles } = useEditorStore();
  const [fonts, setFonts] = useState<FontListItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [category, setCategory] = useState('');
  const [collection, setCollection] = useState<'all' | 'favorites' | 'recent'>('all');
  const [selectedFontId, setSelectedFontId] = useState('');
  const [weight, setWeight] = useState(400);
  const [style, setStyle] = useState<'normal' | 'italic'>('normal');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState('');
  const [error, setError] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFamily, setUploadFamily] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listFonts({ query: debouncedQuery || undefined, category: category || undefined, collection });
      setFonts(result.fonts);
      setCategories(result.categories);
    } catch (reason) {
      setFonts([]);
      setError(reason instanceof Error ? reason.message : 'Unable to load fonts.');
    } finally {
      setLoading(false);
    }
  }, [category, collection, debouncedQuery]);

  useEffect(() => { void load(); }, [load]);

  const selectedFont = useMemo(() => fonts.find((font) => font.id === selectedFontId), [fonts, selectedFontId]);
  useEffect(() => {
    if (!selectedFont) return;
    setWeight(selectedFont.weights[0] || 400);
    setStyle(selectedFont.styles[0] || 'normal');
  }, [selectedFont]);

  const applyFont = async (font: FontListItem) => {
    if (!canvas || !isEditableTextObject(selectedObject)) {
      setError('Select a text layer or selected characters first.');
      return;
    }
    setApplying(font.id);
    setError('');
    try {
      const reference: FontReference = { id: font.id, family: font.family, source: font.source, url: font.url, licence: font.licence, weight, style };
      await ensureFontLoaded(reference);
      const currentReferences = Array.isArray(selectedObject.get('fontReferences' as keyof typeof selectedObject))
        ? selectedObject.get('fontReferences' as keyof typeof selectedObject) as unknown as FontReference[]
        : [];
      const references = [...new Map([...currentReferences, reference].map((item) => [`${item.family}|${item.url || ''}`, item])).values()];
      selectedObject.set({ fontId: font.id, fontSource: font.source, fontUrl: font.url, fontLicence: font.licence, fontReferences: references } as Record<string, unknown>);
      applyTextSelectionStyles({ fontFamily: font.family, fontWeight: weight, fontStyle: style });
      useEditorStore.setState({ fontFamily: font.family, fontWeight: String(weight), fontStyle: style });
      setSelectedFontId(font.id);
      if (getAuthToken()) void recordFontUse(font.id).catch(() => undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The selected font could not be loaded.');
    } finally {
      setApplying('');
    }
  };

  const toggleFavourite = async (font: FontListItem) => {
    if (!getAuthToken()) {
      setError('Sign in to save font favourites.');
      return;
    }
    const next = !font.isFavourite;
    setFonts((items) => items.map((item) => item.id === font.id ? { ...item, isFavourite: next } : item));
    try {
      await setFontFavourite(font.id, next);
    } catch (reason) {
      setFonts((items) => items.map((item) => item.id === font.id ? { ...item, isFavourite: !next } : item));
      setError(reason instanceof Error ? reason.message : 'Unable to update font favourite.');
    }
  };

  const submitUpload = async () => {
    if (!uploadFile || !uploadFamily.trim()) {
      setError('Choose a font file and enter its family name.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      await uploadFont({ file: uploadFile, family: uploadFamily.trim(), displayName: uploadName.trim() || uploadFamily.trim(), category: 'uploaded', weight: 400, style: 'normal', licence: 'User-provided; user confirms font usage rights' });
      setUploadOpen(false);
      setUploadFile(null);
      setUploadFamily('');
      setUploadName('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Font upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/45 p-3">
      <div className="flex items-center justify-between">
        <div><div className="text-xs font-black text-zinc-100">Fonts</div><div className="text-[9px] text-zinc-500">Loaded before applying to Fabric text</div></div>
        <button type="button" onClick={() => setUploadOpen((value) => !value)} className="flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1 text-[9px] font-bold text-violet-300"><Upload className="h-3 w-3" /> Upload</button>
      </div>

      {uploadOpen && (
        <div className="grid gap-2 rounded-xl border border-violet-500/25 bg-violet-500/5 p-3">
          <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} className="text-[10px] text-zinc-400" />
          <input value={uploadFamily} onChange={(event) => setUploadFamily(event.target.value)} placeholder="Font family name" className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs outline-none focus:border-violet-500" />
          <input value={uploadName} onChange={(event) => setUploadName(event.target.value)} placeholder="Display label (optional)" className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs outline-none focus:border-violet-500" />
          <div className="text-[9px] text-amber-200/80">Upload only fonts you are licensed to use.</div>
          <button type="button" disabled={uploading} onClick={() => void submitUpload()} className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 py-2 text-[10px] font-bold text-white disabled:opacity-50">{uploading && <Loader2 className="h-3 w-3 animate-spin" />} Upload font</button>
        </div>
      )}

      <div className="relative"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" /><input aria-label="Search fonts" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fonts..." className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-8 pr-2 text-[10px] outline-none focus:border-violet-500" /></div>
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(['all', 'favorites', 'recent'] as const).map((item) => <button key={item} type="button" onClick={() => setCollection(item)} className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-bold capitalize ${collection === item ? 'border-violet-500/50 bg-violet-500/15 text-violet-200' : 'border-zinc-800 text-zinc-500'}`}>{item}</button>)}
      </div>
      <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-300"><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>

      {selectedFont && (
        <div className="grid grid-cols-2 gap-2">
          <select value={weight} onChange={(event) => setWeight(Number(event.target.value))} className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[10px]">{selectedFont.weights.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={style} onChange={(event) => setStyle(event.target.value as 'normal' | 'italic')} className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[10px]">{selectedFont.styles.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        </div>
      )}

      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-[10px] text-rose-200">{error}</div>}
      {loading ? <div className="flex items-center justify-center py-5 text-[10px] text-zinc-500"><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Loading fonts…</div> : fonts.length === 0 ? <div className="rounded-xl border border-dashed border-zinc-800 p-5 text-center text-[10px] text-zinc-500">No fonts found. Try another search.</div> : (
        <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
          {fonts.map((font) => (
            <div key={font.id} className={`rounded-xl border p-2 ${selectedFontId === font.id ? 'border-violet-500/60 bg-violet-500/10' : 'border-zinc-800 bg-zinc-900/50'}`}>
              <button type="button" disabled={applying === font.id} onClick={() => { setSelectedFontId(font.id); void applyFont(font); }} className="w-full text-left" style={{ fontFamily: font.family }}><span className="block text-base text-zinc-100">{font.displayName}</span><span className="block text-[10px] text-zinc-500">{font.previewText || 'The quick brown fox'}</span></button>
              <div className="mt-2 flex items-center justify-between text-[8px] uppercase tracking-wide text-zinc-600"><span>{font.source} · {font.category}</span><div className="flex gap-1"><button type="button" onClick={() => void toggleFavourite(font)} aria-label={font.isFavourite ? `Unfavorite ${font.displayName}` : `Favorite ${font.displayName}`} className={font.isFavourite ? 'text-rose-300' : 'text-zinc-500'}><Heart className="h-3 w-3" fill={font.isFavourite ? 'currentColor' : 'none'} /></button>{font.canDelete && <button type="button" aria-label={`Delete ${font.displayName}`} onClick={() => void deleteFont(font.id).then(load).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to delete font.'))} className="text-zinc-500 hover:text-rose-300"><Trash2 className="h-3 w-3" /></button>}</div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
  Merge,
  Plus,
  ScanText,
  Scissors,
  Trash2,
  X,
} from 'lucide-react';
import {
  cancelPosterAnalysis,
  finalizePosterAnalysis,
  getPosterAnalysis,
  startPosterAnalysis,
} from '../../../services/uploadsApi';
import type {
  PosterAnalysisJob,
  PosterAnalysisMode,
  PosterAnalysisResult,
  PosterReferenceMode,
  PosterTextBlock,
} from '../../../types/uploads';

type PosterConversionDialogProps = {
  open: boolean;
  assetId: string;
  sourceUrl: string;
  onClose: () => void;
  onCreate: (
    result: PosterAnalysisResult,
    blocks: PosterTextBlock[],
    referenceMode: PosterReferenceMode,
  ) => Promise<void>;
};

type DialogStep = 'setup' | 'processing' | 'review' | 'creating' | 'error';

const wait = (milliseconds: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const timer = window.setTimeout(resolve, milliseconds);
  signal.addEventListener('abort', () => {
    window.clearTimeout(timer);
    reject(new DOMException('Cancelled', 'AbortError'));
  }, { once: true });
});

const normalizeBox = (
  box: PosterTextBlock['bounding_box'],
  result: PosterAnalysisResult,
): PosterTextBlock['normalized_bounding_box'] => ({
  x: box.x / result.source.width,
  y: box.y / result.source.height,
  width: box.width / result.source.width,
  height: box.height / result.source.height,
});

const createManualBlock = (result: PosterAnalysisResult, index: number): PosterTextBlock => ({
  id: `manual-${Date.now()}-${index}`,
  text: 'New text',
  confidence: 1,
  reading_order: result.text_blocks.length + index,
  bounding_box: {
    x: Math.round(result.source.width * 0.25),
    y: Math.round(result.source.height * 0.45),
    width: Math.round(result.source.width * 0.5),
    height: Math.round(result.source.height * 0.08),
  },
  normalized_bounding_box: {
    x: 0.25,
    y: 0.45,
    width: 0.5,
    height: 0.08,
  },
  polygon: [],
  style: {
    font_family_guess: 'Inter',
    font_size: Math.max(18, Math.round(result.source.height * 0.045)),
    font_weight: 'normal',
    font_style: 'normal',
    fill: '#FFFFFF',
    stroke: null,
    stroke_width: 0,
    background_color: null,
    text_align: 'center',
    letter_spacing: 0,
    line_height: 1.2,
    rotation: 0,
  },
  accepted: true,
});

export const PosterConversionDialog: React.FC<PosterConversionDialogProps> = ({
  open,
  assetId,
  sourceUrl,
  onClose,
  onCreate,
}) => {
  const [step, setStep] = useState<DialogStep>('setup');
  const [mode, setMode] = useState<PosterAnalysisMode>('quick');
  const [job, setJob] = useState<PosterAnalysisJob | null>(null);
  const [result, setResult] = useState<PosterAnalysisResult | null>(null);
  const [blocks, setBlocks] = useState<PosterTextBlock[]>([]);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const controllerRef = useRef<AbortController | null>(null);

  const reset = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStep('setup');
    setJob(null);
    setResult(null);
    setBlocks([]);
    setSelectedBlockIds([]);
    setError('');
  };

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  const beginAnalysis = async () => {
    if (!assetId) {
      setError('Select an uploaded poster before starting conversion.');
      setStep('error');
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setStep('processing');
    setError('');
    try {
      const deadline = Date.now() + 120_000;
      let currentJob = await startPosterAnalysis(assetId, mode, 'auto', controller.signal);
      setJob(currentJob);
      while (currentJob.status === 'queued' || currentJob.status === 'processing') {
        if (Date.now() > deadline) {
          await cancelPosterAnalysis(currentJob.job_id).catch(() => undefined);
          throw new Error('Editable import timed out. Retry with Quick Text Edit or a smaller image.');
        }
        await wait(650, controller.signal);
        currentJob = await getPosterAnalysis(currentJob.job_id, controller.signal);
        setJob(currentJob);
      }
      if (currentJob.status === 'cancelled') throw new Error('Poster conversion was cancelled.');
      if (currentJob.status === 'failed' || !currentJob.result) {
        throw new Error(currentJob.error || 'Poster analysis did not return a usable result.');
      }
      setResult(currentJob.result);
      setBlocks(currentJob.result.text_blocks.map((block) => ({
        ...block,
        accepted: block.confidence >= 0.55,
      })));
      setStep('review');
    } catch (reason) {
      if (controller.signal.aborted) return;
      setError(reason instanceof Error ? reason.message : 'Poster analysis failed.');
      setStep('error');
    } finally {
      controllerRef.current = null;
    }
  };

  const cancelProcessing = async () => {
    controllerRef.current?.abort();
    if (job?.job_id) {
      await cancelPosterAnalysis(job.job_id).catch(() => undefined);
    }
    setStep('setup');
  };

  const updateBlock = (id: string, update: Partial<PosterTextBlock>) => {
    setBlocks((current) => current.map((block) => block.id === id ? { ...block, ...update } : block));
  };

  const updateBlockStyle = (id: string, update: Partial<PosterTextBlock['style']>) => {
    setBlocks((current) => current.map((block) => (
      block.id === id ? { ...block, style: { ...block.style, ...update } } : block
    )));
  };

  const toggleReviewSelection = (id: string) => {
    setSelectedBlockIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const deleteSelectedBlocks = () => {
    setBlocks((current) => current.filter((block) => !selectedBlockIds.includes(block.id)));
    setSelectedBlockIds([]);
  };

  const mergeSelectedBlocks = () => {
    const selected = blocks
      .filter((block) => selectedBlockIds.includes(block.id))
      .sort((left, right) => left.reading_order - right.reading_order);
    if (selected.length < 2 || !result) return;
    const left = Math.min(...selected.map((block) => block.bounding_box.x));
    const top = Math.min(...selected.map((block) => block.bounding_box.y));
    const right = Math.max(...selected.map((block) => block.bounding_box.x + block.bounding_box.width));
    const bottom = Math.max(...selected.map((block) => block.bounding_box.y + block.bounding_box.height));
    const merged: PosterTextBlock = {
      ...selected[0],
      id: `merged-${Date.now()}`,
      text: selected.map((block) => block.text).join('\n'),
      confidence: Math.min(...selected.map((block) => block.confidence)),
      bounding_box: { x: left, y: top, width: right - left, height: bottom - top },
      normalized_bounding_box: normalizeBox(
        { x: left, y: top, width: right - left, height: bottom - top },
        result,
      ),
      polygon: [[left, top], [right, top], [right, bottom], [left, bottom]],
      accepted: true,
    };
    setBlocks((current) => [
      ...current.filter((block) => !selectedBlockIds.includes(block.id)),
      merged,
    ].sort((first, second) => first.reading_order - second.reading_order));
    setSelectedBlockIds([merged.id]);
  };

  const splitSelectedBlock = () => {
    if (selectedBlockIds.length !== 1 || !result) return;
    const source = blocks.find((block) => block.id === selectedBlockIds[0]);
    if (!source) return;
    const parts = source.text.includes('\n')
      ? source.text.split(/\n+/).filter(Boolean)
      : [
          source.text.split(/\s+/).slice(0, Math.ceil(source.text.split(/\s+/).length / 2)).join(' '),
          source.text.split(/\s+/).slice(Math.ceil(source.text.split(/\s+/).length / 2)).join(' '),
        ].filter(Boolean);
    if (parts.length < 2) return;
    const partHeight = source.bounding_box.height / parts.length;
    const replacements = parts.map((text, index): PosterTextBlock => {
      const boundingBox = {
        ...source.bounding_box,
        y: Math.round(source.bounding_box.y + partHeight * index),
        height: Math.max(1, Math.round(partHeight)),
      };
      return {
        ...source,
        id: `${source.id}-split-${index + 1}-${Date.now()}`,
        text,
        reading_order: source.reading_order + index / 10,
        bounding_box: boundingBox,
        normalized_bounding_box: normalizeBox(boundingBox, result),
        accepted: true,
      };
    });
    setBlocks((current) => [
      ...current.filter((block) => block.id !== source.id),
      ...replacements,
    ].sort((first, second) => first.reading_order - second.reading_order));
    setSelectedBlockIds(replacements.map((block) => block.id));
  };

  const createDesign = async () => {
    if (!result) return;
    const accepted = blocks.filter((block) => block.accepted && block.text.trim());
    if (!accepted.length) {
      setError('Accept at least one text block or add a missing text block.');
      return;
    }
    setStep('creating');
    setError('');
    try {
      const finalResult = await finalizePosterAnalysis(result.job_id, accepted);
      await onCreate(finalResult, finalResult.text_blocks, 'lock');
      reset();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Editable design creation failed.');
      setStep('review');
    }
  };

  const acceptedCount = useMemo(
    () => blocks.filter((block) => block.accepted && block.text.trim()).length,
    [blocks],
  );

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="poster-conversion-title">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-violet-500/30 bg-[#101017] shadow-2xl">
        <header className="flex items-start gap-3 border-b border-zinc-800 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <ScanText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="poster-conversion-title" className="text-sm font-bold text-zinc-100">Edit text in uploaded image</h2>
            <p className="mt-1 max-w-3xl text-[11px] leading-5 text-zinc-400">
              TECKSTUDIO keeps the original image visually untouched and marks detected text regions for editing.
            </p>
          </div>
          <button type="button" disabled={step === 'creating'} onClick={() => { reset(); onClose(); }} className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white disabled:opacity-30" aria-label="Close poster conversion">
            <X className="h-4 w-4" />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-5">
          {step === 'setup' && (
            <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Conversion mode</h3>
                <div className="mt-3 grid gap-3">
                  {([
                    ['quick', 'Quick Text Edit', 'Detect text and keep the original poster visible. Local clean patches are created only when you edit a region.'],
                    ['full', 'Detailed Text Edit', 'Also analyse colours for reference while preserving all graphics and backgrounds as the original image.'],
                  ] as const).map(([value, label, description]) => (
                    <button key={value} type="button" onClick={() => setMode(value)} className={`rounded-xl border p-4 text-left transition ${mode === value ? 'border-violet-500/60 bg-violet-500/10' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'}`}>
                      <span className="flex items-center gap-2 text-xs font-bold text-zinc-100">{mode === value && <Check className="h-4 w-4 text-violet-300" />}{label}</span>
                      <span className="mt-2 block text-[10px] leading-5 text-zinc-500">{description}</span>
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Original-preserving output</h3>
                <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-200"><Check className="h-4 w-4" /> Original image + editable text</div>
                  <ul className="mt-3 space-y-2 text-[10px] leading-5 text-zinc-400">
                    <li>The uploaded image remains visible and locked as the base layer</li>
                    <li>Detected regions are invisible until selected, so the poster does not change</li>
                    <li>Double-click a region to create a local clean patch and editable text</li>
                  </ul>
                </div>
              </section>
            </div>
          )}

          {step === 'processing' && (
            <div className="mx-auto max-w-xl py-12 text-center">
              <Loader2 className="mx-auto h-9 w-9 animate-spin text-violet-400" />
              <h3 className="mt-5 text-sm font-bold text-zinc-100">{job?.stage || 'Preparing image'}</h3>
              <p className="mt-2 text-[10px] text-zinc-500">Progress comes directly from the poster-analysis worker.</p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-900">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-emerald-400 transition-[width]" style={{ width: `${job?.progress || 2}%` }} />
              </div>
              <div className="mt-2 text-right text-[10px] font-bold text-zinc-400">{job?.progress || 2}%</div>
            </div>
          )}

          {step === 'review' && result && (
            <div className="grid min-h-0 gap-5 lg:grid-cols-[minmax(320px,0.9fr)_minmax(420px,1.1fr)]">
              <section className="space-y-4">
                <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-black">
                  <img src={sourceUrl || result.source.url} alt="Poster OCR review" className="block h-auto w-full" />
                  {blocks.filter((block) => block.accepted).map((block) => (
                    <button
                      key={block.id}
                      type="button"
                      aria-label={`Review ${block.text}`}
                      onClick={() => toggleReviewSelection(block.id)}
                      className={`absolute border-2 ${selectedBlockIds.includes(block.id) ? 'border-amber-300 bg-amber-300/15' : 'border-emerald-400 bg-emerald-400/10'}`}
                      style={{
                        left: `${block.bounding_box.x * 100 / result.source.width}%`,
                        top: `${block.bounding_box.y * 100 / result.source.height}%`,
                        width: `${block.bounding_box.width * 100 / result.source.width}%`,
                        height: `${block.bounding_box.height * 100 / result.source.height}%`,
                      }}
                    />
                  ))}
                </div>
                {result.mode === 'full' && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Poster Colours</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {result.palette.map((item) => (
                        <div key={item.color} className="flex items-center gap-2 rounded-lg border border-zinc-800 px-2 py-1.5">
                          <span className="h-5 w-5 rounded border border-white/10" style={{ backgroundColor: item.color }} />
                          <span className="font-mono text-[9px] text-zinc-300">{item.color}</span>
                          <span className="text-[8px] text-zinc-600">{item.percentage}% · {item.region_count} regions</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 space-y-1 text-[9px] text-zinc-500">
                      {result.colour_regions.map((region) => (
                        <div key={region.id} className="flex items-center justify-between rounded bg-zinc-900 px-2 py-1.5">
                          <span>{region.name}</span>
                          <span>{Math.round(region.confidence * 100)}% confidence</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="min-h-0">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setBlocks((current) => [...current, createManualBlock(result, current.length)])} className="flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[9px] font-bold text-zinc-300 hover:bg-zinc-800"><Plus className="h-3 w-3" /> Add missing text</button>
                  <button type="button" disabled={selectedBlockIds.length < 2} onClick={mergeSelectedBlocks} className="flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[9px] font-bold text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"><Merge className="h-3 w-3" /> Merge</button>
                  <button type="button" disabled={selectedBlockIds.length !== 1} onClick={splitSelectedBlock} className="flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[9px] font-bold text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"><Scissors className="h-3 w-3" /> Split</button>
                  <button type="button" disabled={!selectedBlockIds.length} onClick={deleteSelectedBlocks} className="flex items-center gap-1 rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-[9px] font-bold text-rose-300 hover:bg-rose-500/10 disabled:opacity-30"><Trash2 className="h-3 w-3" /> Delete detection</button>
                </div>
                <div className="mt-3 max-h-[48vh] space-y-2 overflow-y-auto pr-1">
                  {blocks.length === 0 && <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-[10px] text-amber-200">No text was detected. Add missing text manually or cancel conversion.</div>}
                  {blocks.map((block) => (
                    <article key={block.id} className={`rounded-xl border p-3 ${selectedBlockIds.includes(block.id) ? 'border-violet-500/50 bg-violet-500/5' : 'border-zinc-800 bg-zinc-950'}`}>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={Boolean(block.accepted)} onChange={(event) => updateBlock(block.id, { accepted: event.target.checked })} aria-label={`Accept ${block.text}`} className="accent-violet-500" />
                        <button type="button" onClick={() => toggleReviewSelection(block.id)} className="flex-1 text-left text-[9px] font-bold text-zinc-500">Select for merge/split</button>
                      <span className={`text-[9px] font-bold ${block.confidence < 0.55 ? 'text-amber-300' : 'text-emerald-300'}`}>{Math.round(block.confidence * 100)}%</span>
                      </div>
                      <textarea value={block.text} onChange={(event) => updateBlock(block.id, { text: event.target.value })} aria-label="Detected text" rows={Math.min(3, Math.max(1, block.text.split('\n').length))} className="mt-2 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-100 outline-none focus:border-violet-500" />
                      <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
                        <input type="color" value={block.style.fill} onChange={(event) => updateBlockStyle(block.id, { fill: event.target.value })} aria-label="Detected text colour" className="h-8 w-10 rounded border border-zinc-700 bg-transparent" />
                        <select value={block.style.text_align} onChange={(event) => updateBlockStyle(block.id, { text_align: event.target.value })} aria-label="Detected text alignment" className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-[9px] text-zinc-300">
                          <option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option><option value="justify">Justify</option>
                        </select>
                      </div>
                    </article>
                  ))}
                </div>
                {result.warnings.length > 0 && (
                  <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[9px] leading-4 text-amber-100/75">
                    {result.warnings.map((warning) => <div key={warning} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{warning}</div>)}
                  </div>
                )}
              </section>
            </div>
          )}

          {step === 'creating' && (
            <div className="py-14 text-center">
              <Loader2 className="mx-auto h-9 w-9 animate-spin text-emerald-400" />
              <h3 className="mt-5 text-sm font-bold text-zinc-100">Enabling editable regions</h3>
              <p className="mt-2 text-[10px] text-zinc-500">Saving normalized OCR metadata and transparent interaction hotspots without changing the visible poster.</p>
            </div>
          )}

          {step === 'error' && (
            <div className="mx-auto max-w-lg py-12 text-center">
              <AlertTriangle className="mx-auto h-9 w-9 text-rose-400" />
              <h3 className="mt-4 text-sm font-bold text-zinc-100">Poster conversion could not continue</h3>
              <p className="mt-2 text-[10px] leading-5 text-rose-200/75">{error}</p>
            </div>
          )}
          {step === 'review' && error && <div role="alert" className="mt-3 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-200">{error}</div>}
        </main>

        <footer className="flex items-center justify-between border-t border-zinc-800 px-5 py-3">
          <div className="text-[9px] text-zinc-600">{step === 'review' ? `${acceptedCount} editable text region${acceptedCount === 1 ? '' : 's'}` : 'Original upload is never overwritten.'}</div>
          <div className="flex gap-2">
            {step === 'processing' ? (
              <button type="button" onClick={() => void cancelProcessing()} className="rounded-lg border border-zinc-700 px-4 py-2 text-[10px] font-bold text-zinc-300 hover:bg-zinc-800">Cancel processing</button>
            ) : (
              <button type="button" disabled={step === 'creating'} onClick={() => { reset(); onClose(); }} className="rounded-lg border border-zinc-800 px-4 py-2 text-[10px] font-bold text-zinc-400 hover:text-white disabled:opacity-30">Cancel</button>
            )}
            {step === 'setup' && <button type="button" onClick={() => void beginAnalysis()} className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-[10px] font-bold text-white hover:bg-violet-500"><ScanText className="h-3.5 w-3.5" /> Analyze poster</button>}
            {step === 'review' && (
              <>
                <button type="button" onClick={() => setStep('setup')} className="flex items-center gap-1 rounded-lg border border-zinc-700 px-4 py-2 text-[10px] font-bold text-zinc-300 hover:bg-zinc-800"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
                <button type="button" disabled={!acceptedCount} onClick={() => void createDesign()} className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-[10px] font-bold text-white hover:bg-violet-500 disabled:opacity-40"><ScanText className="h-3.5 w-3.5" /> Enable editable regions</button>
              </>
            )}
            {step === 'error' && <button type="button" onClick={() => { setError(''); setStep('setup'); }} className="rounded-lg bg-violet-600 px-4 py-2 text-[10px] font-bold text-white hover:bg-violet-500">Retry</button>}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

import React, { useEffect, useState } from 'react';
import {
  Undo2,
  Redo2,
  Trash2,
  Copy,
  RotateCcw,
  Download,
  Sparkles,
  ChevronDown,
  Home,
  Share2,
  Keyboard,
  QrCode,
  BarChart3,
  Calendar,
  Bell,
  Film,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '../../store/useEditorStore';
import { ShareModal } from './ShareModal';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { QRCodeModal } from './QRCodeModal';
import { ChartGeneratorModal } from './ChartGeneratorModal';
import { ContentPlannerModal } from './ContentPlannerModal';
import { NotificationCenter } from './NotificationCenter';
import { VideoExportDialog } from './export/VideoExportDialog';
import type { VideoExportFormat } from '../../types/videoExport';
import { removeStrayConnectorMarkers } from '../../utils/posterLayoutTools';
import { calculateMainPreviewFit } from '../../utils/canvasPreviewFit';

const toolbarGroupClass = 'flex h-10 shrink-0 items-center gap-1 rounded-xl border border-white/[0.08] bg-black/25 p-0.5 shadow-sm';
const iconButtonClass = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:text-zinc-700 disabled:hover:bg-transparent';

export const Toolbar: React.FC = () => {
  const navigate = useNavigate();
  const {
    canvas,
    selectedObject,
    undo,
    redo,
    history,
    historyIndex,
    deleteSelected,
    duplicateSelected,
    clearCanvas,
    projectName,
    setProjectName,
    editorMode,
    setEditorMode,
    zoom,
    setZoom,
    canvasWidth,
    canvasHeight,
  } = useEditorStore();

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [videoExportFormat, setVideoExportFormat] = useState<VideoExportFormat | null>(null);

  useEffect(() => {
    const openVideoExport = (event: Event) => {
      const format = (event as CustomEvent<{ format?: VideoExportFormat }>).detail?.format;
      setVideoExportFormat(format === 'webm' ? 'webm' : 'mp4');
    };
    window.addEventListener('teckstudio:open-video-export', openVideoExport);
    return () => window.removeEventListener('teckstudio:open-video-export', openVideoExport);
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleExport = (type: 'png' | 'jpg' | 'svg') => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    removeStrayConnectorMarkers(canvas);
    const viewportTransform = canvas.viewportTransform
      ? [...canvas.viewportTransform]
      : [1, 0, 0, 1, 0, 0];
    const editorOnlyObjects = canvas.getObjects().filter((object) => (
      object.get('editorOnly' as keyof typeof object) === true ||
      object.get('teckstudioObjectType' as keyof typeof object) === 'editorGuide' ||
      object.get('excludeFromExport' as keyof typeof object) === true
    ));
    const editorOnlyVisibility = editorOnlyObjects.map((object) => object.visible);
    canvas.discardActiveObject();
    editorOnlyObjects.forEach((object) => object.set('visible', false));
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();

    setTimeout(() => {
      if (type === 'png') {
        const dataURL = canvas.toDataURL({
          format: 'png',
          multiplier: 2,
        });
        triggerDownload(dataURL, `${projectName}.png`);
      } else if (type === 'jpg') {
        const oldBg = canvas.backgroundColor;
        if (!oldBg || oldBg === 'transparent') {
          canvas.setBackgroundColor('#000000', () => {});
        }

        const dataURL = canvas.toDataURL({
          format: 'jpeg',
          quality: 0.95,
          multiplier: 2,
        });
        triggerDownload(dataURL, `${projectName}.jpg`);

        if (!oldBg || oldBg === 'transparent') {
          canvas.setBackgroundColor(oldBg as string, () => {});
        }
      } else if (type === 'svg') {
        const svgContent = canvas.toSVG();
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `${projectName}.svg`);
        URL.revokeObjectURL(url);
      }

      editorOnlyObjects.forEach((object, index) => object.set('visible', editorOnlyVisibility[index]));
      canvas.setViewportTransform(viewportTransform);
      if (activeObject) {
        canvas.setActiveObject(activeObject);
      }
      canvas.renderAll();
      setShowExportMenu(false);
    }, 50);
  };

  const triggerDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.download = name;
    link.href = url;
    link.click();
  };

  return (
    <header className="grid h-16 shrink-0 grid-cols-[minmax(220px,0.9fr)_minmax(0,1.2fr)_auto] items-center gap-3 border-b border-white/[0.08] bg-[#0f0f17] px-3 select-none shadow-[0_1px_0_rgba(255,255,255,0.02)] xl:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.3fr)_auto] xl:px-5">
      <section className="flex min-w-0 items-center gap-2" aria-label="Project and save status">
        <button
          onClick={() => navigate('/')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          title="Back to Home"
          aria-label="Back to Home"
        >
          <Home className="h-5 w-5" />
        </button>
        <div className="hidden shrink-0 items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 lg:flex">
          <Sparkles className="h-5 w-5 text-violet-400" />
          <span className="font-extrabold text-lg tracking-wider">TECKSTUDIO</span>
        </div>
        <div className="hidden h-6 w-px shrink-0 bg-zinc-800 xl:block" />
        <input
          type="text"
          value={projectName}
          placeholder="Name your design"
          onChange={(e) => setProjectName(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-zinc-100 transition-colors hover:border-white/[0.08] focus:border-violet-500 focus:bg-[#12121B] focus:outline-none"
          title="Click to rename project"
          aria-label="Project name"
        />
        <div className="hidden shrink-0 md:block">
          <AutoSaveIndicator />
        </div>
      </section>

      <section className="min-w-0 overflow-hidden" aria-label="Editor controls">
        <div className="flex min-w-0 items-center gap-3 overflow-x-auto whitespace-nowrap py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className={toolbarGroupClass} aria-label="History controls">
            <button
              onClick={undo}
              disabled={!canUndo}
              className={iconButtonClass}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className={iconButtonClass}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          <div className={toolbarGroupClass} aria-label="Object actions">
            {selectedObject && (
              <>
                <button
                  onClick={duplicateSelected}
                  className={iconButtonClass}
                  title="Duplicate Selected (Ctrl+D)"
                  aria-label="Duplicate selected object"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={deleteSelected}
                  className={`${iconButtonClass} text-rose-400 hover:bg-rose-500/10 hover:text-rose-300`}
                  title="Delete Selected (Delete/Backspace)"
                  aria-label="Delete selected object"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={clearCanvas}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              title="Clear Entire Canvas"
              aria-label="Clear entire canvas"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          </div>

          {/* Advanced Module Quick Tools */}
          <div className={toolbarGroupClass} aria-label="Advanced Modules">
            <button
              onClick={() => setShowQRModal(true)}
              className={iconButtonClass}
              title="QR Code Generator"
              aria-label="QR Code Generator"
            >
              <QrCode className="h-4 w-4 text-violet-400" />
            </button>
            <button
              onClick={() => setShowChartModal(true)}
              className={iconButtonClass}
              title="Chart & Infographic Builder"
              aria-label="Chart & Infographic Builder"
            >
              <BarChart3 className="h-4 w-4 text-indigo-400" />
            </button>
            <button
              onClick={() => setShowPlannerModal(true)}
              className={iconButtonClass}
              title="Social Media Content Planner"
              aria-label="Social Media Content Planner"
            >
              <Calendar className="h-4 w-4 text-pink-400" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className={toolbarGroupClass} aria-label="Zoom Controls">
            <button
              onClick={() => {
                if (!canvas) return;
                const nextZoom = Math.max(0.25, Math.round((zoom - 0.1) * 100) / 100);
                canvas.setZoom(nextZoom);
                setZoom(nextZoom);
                canvas.requestRenderAll();
              }}
              className={iconButtonClass}
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <select
              value={Math.round(zoom * 100)}
              onChange={(e) => {
                if (!canvas) return;
                const val = e.target.value;
                const workspaceEl = canvas.getElement().closest('[data-canvas-area]') as HTMLElement | null;
                const cw = canvas.getWidth() || canvasWidth || 800;
                const ch = canvas.getHeight() || canvasHeight || 800;
                if (val === 'fit') {
                  if (workspaceEl) {
                    const previewFit = calculateMainPreviewFit(workspaceEl.clientWidth, workspaceEl.clientHeight, cw, ch);
                    canvas.setViewportTransform([previewFit.scale, 0, 0, previewFit.scale, previewFit.left, previewFit.top]);
                    setZoom(previewFit.scale);
                    canvas.requestRenderAll();
                  }
                  return;
                }
                const targetZoom = Number(val) / 100;
                const offsetX = workspaceEl ? (workspaceEl.clientWidth - cw * targetZoom) / 2 : 0;
                const offsetY = workspaceEl ? (workspaceEl.clientHeight - ch * targetZoom) / 2 : 0;
                canvas.setViewportTransform([targetZoom, 0, 0, targetZoom, offsetX, offsetY]);
                setZoom(targetZoom);
                canvas.requestRenderAll();
              }}
              className="h-8 bg-[#101018] text-[10px] font-bold text-zinc-200 border border-white/[0.08] rounded-lg px-1.5 outline-none cursor-pointer"
              title="Preset Zoom Level"
            >
              <option value="fit">Fit</option>
              <option value="25">25%</option>
              <option value="50">50%</option>
              <option value="75">75%</option>
              <option value="100">100%</option>
              <option value="150">150%</option>
              <option value="200">200%</option>
            </select>

            <button
              onClick={() => {
                if (!canvas) return;
                const nextZoom = Math.min(3.0, Math.round((zoom + 0.1) * 100) / 100);
                canvas.setZoom(nextZoom);
                setZoom(nextZoom);
                canvas.requestRenderAll();
              }}
              className={iconButtonClass}
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="flex shrink-0 items-center gap-2" aria-label="Main editor actions">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-colors relative"
          title="Notification Center"
          aria-label="Notification Center"
        >
          <Bell className="h-4 w-4 text-amber-400" />
        </button>

        <div className="flex h-10 shrink-0 rounded-xl border border-white/[0.08] bg-zinc-950/80 p-0.5">
          <button
            onClick={() => setEditorMode('design')}
            className={`flex h-9 items-center rounded-lg px-3 text-xs font-bold transition-all ${
              editorMode === 'design'
                ? 'bg-zinc-800 text-violet-400 shadow-sm'
                : 'text-zinc-500 hover:bg-[#12121B] hover:text-zinc-300'
            }`}
            aria-label="Design mode"
          >
            Design
          </button>
          <button
            onClick={() => setEditorMode('dev')}
            className={`flex h-9 items-center gap-1 rounded-lg px-3 text-xs font-bold transition-all ${
              editorMode === 'dev'
                ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                : 'text-zinc-500 hover:bg-[#12121B] hover:text-zinc-300'
            }`}
            aria-label="Dev mode"
          >
            <Sparkles className="h-3 w-3 text-emerald-400" />
            <span className="hidden xl:inline">Dev Mode</span>
            <span className="xl:hidden">Dev</span>
          </button>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white shadow-lg shadow-violet-600/10 transition-colors hover:bg-violet-500 focus:outline-none"
            aria-label="Export design"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)} />
              <div className="absolute right-0 z-40 mt-2 w-44 rounded-xl border border-white/[0.08] bg-[#101018] p-1 shadow-2xl">
                <button
                  onClick={() => handleExport('png')}
                  className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <span className="font-semibold">PNG Image</span>
                  <span className="text-[10px] text-zinc-500">Best for sharing (Transparent)</span>
                </button>
                <button
                  onClick={() => handleExport('jpg')}
                  className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <span className="font-semibold">JPG Image</span>
                  <span className="text-[10px] text-zinc-500">Good for web (Black bg)</span>
                </button>
                <button
                  onClick={() => handleExport('svg')}
                  className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <span className="font-semibold">SVG Vector</span>
                  <span className="text-[10px] text-zinc-500">Scalable vector graphics</span>
                </button>
                <div className="my-1 border-t border-white/[0.08]" />
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    setVideoExportFormat('mp4');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <Film className="h-3.5 w-3.5 text-violet-400" />
                  <div>
                    <span className="block font-semibold">MP4 Video</span>
                    <span className="text-[10px] text-zinc-500">H.264 · Best compatibility</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    setVideoExportFormat('webm');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <Film className="h-3.5 w-3.5 text-cyan-400" />
                  <div>
                    <span className="block font-semibold">WebM Video</span>
                    <span className="text-[10px] text-zinc-500">VP9 · Efficient web video</span>
                  </div>
                </button>
                <div className="my-1 border-t border-white/[0.08]" />
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    setShowShareModal(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="font-semibold">Share Design</span>
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setShowShareModal(true)}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 text-xs font-bold text-white transition-colors hover:bg-zinc-700"
          title="Share Design"
          aria-label="Share Design"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Share</span>
        </button>

        <button
          onClick={() => setShowShortcuts(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          title="Keyboard Shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </button>
      </section>

      {/* Modals & Drawers */}
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
      <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <QRCodeModal isOpen={showQRModal} onClose={() => setShowQRModal(false)} />
      <ChartGeneratorModal isOpen={showChartModal} onClose={() => setShowChartModal(false)} />
      <ContentPlannerModal isOpen={showPlannerModal} onClose={() => setShowPlannerModal(false)} />
      <NotificationCenter isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
      {videoExportFormat && (
        <VideoExportDialog
          isOpen
          initialFormat={videoExportFormat}
          onClose={() => setVideoExportFormat(null)}
        />
      )}
    </header>
  );
};

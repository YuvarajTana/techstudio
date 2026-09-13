import React, { useLayoutEffect, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Toolbar } from './components/editor/Toolbar';
import { Sidebar } from './components/editor/Sidebar';
import { AIAssistant } from './components/editor/AIAssistant';
import { RoyaltyFreeAssets } from './components/editor/RoyaltyFreeAssets';
import { BrandKit } from './components/editor/BrandKit';
import { CanvasWorkspace } from './components/editor/CanvasWorkspace';
import { PropertiesPanel } from './components/editor/PropertiesPanel';
import { ZoomController } from './components/editor/ZoomController';
import { KeyboardShortcutsModal } from './components/editor/KeyboardShortcutsModal';
import { SmartResize } from './components/editor/SmartResize';
import { EffectsPanel } from './components/editor/EffectsPanel';
import { DesignQualityPanel } from './components/editor/DesignQualityPanel';
import { ElementToolbar } from './components/editor/ElementToolbar';
import { ContextMenu } from './components/editor/ContextMenu';
import { ColorPaletteGenerator } from './components/editor/ColorPaletteGenerator';
import { TextStylesPanel } from './components/editor/TextStylesPanel';
import { EnhancedExportPanel } from './components/editor/EnhancedExportPanel';
import { SaveAsTemplate } from './components/editor/SaveAsTemplate';
import { BackgroundPatterns } from './components/editor/BackgroundPatterns';
import { TimelinePanel } from './components/editor/TimelinePanel';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useEditorStore } from './store/useEditorStore';
import { Sparkles, Image, Layers, Palette, Wand2, Maximize, ShieldCheck, Download, Grid3x3, PanelRightClose, PanelRightOpen } from 'lucide-react';

type RightPanel = 'ai' | 'assets' | 'brand' | 'properties' | 'effects' | 'resize' | 'audit' | 'colors' | 'text-styles' | 'export' | 'templates' | 'patterns';
const RIGHT_PANELS: RightPanel[] = ['ai', 'assets', 'brand', 'properties', 'effects', 'resize', 'audit', 'colors', 'text-styles', 'export', 'templates', 'patterns'];

const App: React.FC = () => {
  // Initialize canvas-level keyboard listeners
  useKeyboardShortcuts();
  const { id } = useParams<{ id: string }>();
  const setProjectId = useEditorStore((state) => state.setProjectId);
  const selectedObject = useEditorStore((state) => state.selectedObject);
  const [rightPanel, setRightPanel] = useState<RightPanel>('ai');
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const isTextSelected = Boolean(
    selectedObject
    && ['text', 'i-text', 'textbox'].includes(selectedObject.type || ''),
  );

  useLayoutEffect(() => {
    if (id) {
      setProjectId(id);
    }
  }, [id, setProjectId]);

  // Listen for ? key to open shortcuts modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputActive = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as any).contentEditable === 'true'
      );

      if (!isInputActive && e.key === '?') {
        e.preventDefault();
        setShowShortcuts(true);
      }

      if (e.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShortcuts]);

  useEffect(() => {
    const handleOpenPanel = (event: Event) => {
      const panel = (event as CustomEvent<{ panel?: RightPanel }>).detail?.panel;
      if (panel && RIGHT_PANELS.includes(panel)) {
        setRightPanel(panel);
      }
    };

    window.addEventListener('teckstudio:open-panel', handleOpenPanel);
    return () => window.removeEventListener('teckstudio:open-panel', handleOpenPanel);
  }, []);

  useEffect(() => {
    if (localStorage.getItem('teckstudio_pending_brand_kit')) {
      setRightPanel('brand');
      return;
    }

    const pendingPanel = sessionStorage.getItem('teckstudio_pending_editor_panel');
    if (!pendingPanel) return;
    try {
      const payload = JSON.parse(pendingPanel) as { panel?: RightPanel };
      if (payload.panel && RIGHT_PANELS.includes(payload.panel)) {
        setRightPanel(payload.panel);
      }
    } finally {
      sessionStorage.removeItem('teckstudio_pending_editor_panel');
    }
  }, []);

  return (
    <div className="teckstudio-editor-shell grid h-screen w-screen grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden font-sans text-zinc-100">
      {/* Top action toolbar */}
      <Toolbar />

      {/* Main editor workspace panel */}
      <div className="relative flex min-h-0 w-full overflow-hidden bg-[#0b0b12]">
        {/* Left Side: Element insertion and Layer managers */}
        <Sidebar />

        {/* Center: Interactive design canvas */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <CanvasWorkspace />
          {/* Floating selection toolbar — appears above selected elements */}
          <ElementToolbar />
          {/* Floating zoom widgets inside canvas workspace */}
          <ZoomController />
        </div>

        {/* Right Side: Properties, AI Tools, and Assets */}
        <div className={`${rightPanelCollapsed ? 'w-11' : 'w-[320px]'} teckstudio-panel-surface flex min-h-0 flex-col border-l transition-[width] duration-200`}>
          {/* Panel Tabs */}
          <div className="flex shrink-0 items-center gap-1 border-b border-white/[0.08] px-2 py-2">
            <button
              type="button"
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              title={rightPanelCollapsed ? 'Expand properties panel' : 'Collapse properties panel'}
              aria-label={rightPanelCollapsed ? 'Expand properties panel' : 'Collapse properties panel'}
            >
              {rightPanelCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
            </button>
            {!rightPanelCollapsed && (
              <div className="teckstudio-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-black/20 p-1">
                {[
                  { id: 'ai' as RightPanel, label: 'AI', icon: Sparkles, accent: 'text-violet-300 bg-violet-500/10 border-violet-400/30' },
                  { id: 'colors' as RightPanel, label: 'Colors', icon: Palette, accent: 'text-orange-300 bg-orange-500/10 border-orange-400/30' },
                  { id: 'assets' as RightPanel, label: 'Assets', icon: Image, accent: 'text-cyan-300 bg-cyan-500/10 border-cyan-400/30' },
                  { id: 'effects' as RightPanel, label: 'Effects', icon: Wand2, accent: 'text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-400/30' },
                  { id: 'patterns' as RightPanel, label: 'Pattern', icon: Grid3x3, accent: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30' },
                  { id: 'resize' as RightPanel, label: 'Resize', icon: Maximize, accent: 'text-cyan-300 bg-cyan-500/10 border-cyan-400/30' },
                  { id: 'brand' as RightPanel, label: 'Brand', icon: Palette, accent: 'text-pink-300 bg-pink-500/10 border-pink-400/30' },
                  { id: 'export' as RightPanel, label: 'Export', icon: Download, accent: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30' },
                  { id: 'audit' as RightPanel, label: 'Audit', icon: ShieldCheck, accent: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30' },
                  { id: 'properties' as RightPanel, label: 'Props', icon: Layers, accent: 'text-amber-300 bg-amber-500/10 border-amber-400/30' },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = rightPanel === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setRightPanel(tab.id)}
                      className={`flex shrink-0 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[9px] font-semibold transition-colors whitespace-nowrap ${
                        isActive
                          ? tab.accent
                          : 'border-transparent text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel Content */}
          {!rightPanelCollapsed && <div className="flex-1 min-h-0 overflow-hidden">
            {rightPanel === 'ai' && (
              <div className="teckstudio-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain p-3 pb-24">
                <AIAssistant />
              </div>
            )}
            {rightPanel === 'colors' && (
              <div className="teckstudio-scrollbar h-full overflow-y-auto">
                <ColorPaletteGenerator />
              </div>
            )}
            {rightPanel === 'text-styles' && (
              <div className="teckstudio-scrollbar h-full overflow-y-auto">
                {isTextSelected ? <PropertiesPanel /> : <TextStylesPanel />}
              </div>
            )}
            {rightPanel === 'assets' && <RoyaltyFreeAssets />}
            {rightPanel === 'audit' && (
              <div className="teckstudio-scrollbar h-full overflow-y-auto">
                <DesignQualityPanel />
              </div>
            )}
            {rightPanel === 'effects' && (
              <div className="teckstudio-scrollbar h-full overflow-y-auto p-4">
                <EffectsPanel />
              </div>
            )}
            {rightPanel === 'patterns' && (
              <div className="teckstudio-scrollbar h-full overflow-y-auto">
                <BackgroundPatterns />
              </div>
            )}
            {rightPanel === 'resize' && (
              <div className="teckstudio-scrollbar h-full overflow-y-auto p-4">
                <SmartResize />
              </div>
            )}
            {rightPanel === 'brand' && <BrandKit />}
            {rightPanel === 'templates' && (
              <div className="teckstudio-scrollbar h-full overflow-y-auto p-3">
                <SaveAsTemplate />
              </div>
            )}
            {rightPanel === 'export' && (
              <div className="teckstudio-scrollbar h-full overflow-y-auto">
                <EnhancedExportPanel />
              </div>
            )}
            {rightPanel === 'properties' && (
              <div className="teckstudio-scrollbar h-full overflow-y-auto">
                <PropertiesPanel />
              </div>
            )}
          </div>}
        </div>
      </div>

      <TimelinePanel />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Right-click context menu */}
      <ContextMenu />
    </div>
  );
};

export default App;

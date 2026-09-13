import React, { useState, useEffect, useCallback } from 'react';
import {
  Type,
  Layers,
  Upload,
  LayoutTemplate,
  PenTool,
  Sparkles,
  Search,
  FileText,
  History,
  X,
  Loader2,
  Network,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { fabric } from 'fabric';
import { PagesPanel } from './PagesPanel';
import { HistoryPanel } from './HistoryPanel';
import { ElementsPanel } from './ElementsPanel';
import { TextToolsPanel } from './TextToolsPanel';
import { LayerItem } from './LayerItem';
import { getLayerDisplayName as getDisplayName } from './layerUtils';
import { SECTOR_TEMPLATES } from '../../data/templates';
import { apiFetch } from '../../services/apiClient';
import { applyTemplateToProject } from '../../services/templatesApi';
import { isTemplateCompatible, getTemplateOrientation } from '../../utils/templateCompatibility';
import { TEMPLATE_TYPE_OPTIONS } from '../templates/templateConstants';
import { EDITORIAL_TECH_TEMPLATE_NAME, applyEditorialTechPoster } from '../../utils/editorialPoster';
import { ArchitectureDiagramPanel } from './ArchitectureDiagramPanel';
import { AI_ARCHITECTURE_TEMPLATE_NAME, DISTRIBUTED_SYSTEM_TEMPLATE_NAME } from '../../utils/architectureDiagramTypes';
import { applyAIChatArchitectureTemplate, applyDistributedSystemArchitectureTemplate, fitArchitectureCanvasToWorkspace } from '../../utils/architectureDiagram';
import {
  TECHNICAL_INFOGRAPHIC_TEMPLATE_NAME,
  PROMPT_CONTEXT_HARNESS_TEMPLATE_NAME,
  applyTechnicalAIWorkflowTemplate,
  applyPromptContextHarnessInfographicTemplate,
  fitTechnicalInfographicCanvasToWorkspace,
} from '../../utils/technicalInfographicDesign';
import { removeConnectorsForNode } from '../../utils/diagramConnectors';
import { masterTimelineManager } from '../../utils/masterTimelineManager';
import { normalizeTimelineProject } from '../../types/timeline';
import { UploadsPanel } from './uploads/UploadsPanel';
import {
  getCanvasLayerObjects,
  moveLayerObject,
  moveLayerObjectToDisplayIndex,
} from '../../utils/layerOrdering';

type Tab = 'templates' | 'elements' | 'diagram' | 'text' | 'draw' | 'uploads' | 'layers' | 'pages' | 'history';

interface BackendTemplate {
  id: string;
  name: string;
  description?: string | null;
  data?: string | null;
  thumbnail?: string | null;
  width: number;
  height: number;
  tags?: string | null;
}

export const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('elements');
  const { canvas, selectedObject, setSelectedObject, saveHistory, updateObjectName, isPenMode, setPenMode } = useEditorStore();

  // Local state for layers list
  const [layers, setLayers] = useState<fabric.Object[]>([]);
  const [layerSearchQuery, setLayerSearchQuery] = useState('');
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [backendTemplates, setBackendTemplates] = useState<BackendTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateTypeFilter, setTemplateTypeFilter] = useState('all');
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
  const [promptHarnessLoading, setPromptHarnessLoading] = useState(false);

  const getStableLayerId = useCallback((obj: fabric.Object) => {
    let id = obj.get('id' as any) as string | undefined;
    if (!id) {
      id = window.crypto?.randomUUID ? window.crypto.randomUUID() : `obj_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      obj.set({ id } as any);
    }
    return id;
  }, []);

  const refreshLayers = useCallback(() => {
    if (!canvas) {
      setLayers([]);
      return;
    }
    canvas.getObjects().forEach((obj) => getStableLayerId(obj));
    setLayers([...getCanvasLayerObjects(canvas)].reverse());
  }, [canvas, getStableLayerId]);

  // Update layers list on canvas changes
  useEffect(() => {
    if (!canvas) return;

    refreshLayers();

    // Event listeners
    canvas.on('object:added', refreshLayers);
    canvas.on('object:removed', refreshLayers);
    canvas.on('object:modified', refreshLayers);
    canvas.on('text:changed', refreshLayers);
    canvas.on('selection:created', refreshLayers);
    canvas.on('selection:updated', refreshLayers);
    canvas.on('selection:cleared', refreshLayers);

    return () => {
      canvas.off('object:added', refreshLayers);
      canvas.off('object:removed', refreshLayers);
      canvas.off('object:modified', refreshLayers);
      canvas.off('text:changed', refreshLayers);
      canvas.off('selection:created', refreshLayers);
      canvas.off('selection:updated', refreshLayers);
      canvas.off('selection:cleared', refreshLayers);
    };
  }, [canvas, refreshLayers]);

  const fetchBackendTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError('');
    try {
      const params = new URLSearchParams({ limit: '48' });
      if (canvas) {
        const cw = canvas.getWidth();
        const ch = canvas.getHeight();
        if (cw > 0 && ch > 0) {
          params.set('min_width', String(Math.round(cw * 0.5)));
          params.set('max_width', String(Math.round(cw * 2)));
          params.set('min_height', String(Math.round(ch * 0.5)));
          params.set('max_height', String(Math.round(ch * 2)));
        }
      }
      if (templateSearch.trim()) params.set('search', templateSearch.trim());
      if (templateTypeFilter !== 'all') params.set('type', templateTypeFilter);
      const response = await apiFetch(`/api/templates?${params.toString()}`, { auth: false });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || `Failed to load templates (${response.status})`);
      }
      setBackendTemplates(data?.templates || []);
    } catch (error) {
      setBackendTemplates([]);
      setTemplatesError(error instanceof Error ? error.message : 'Failed to load templates.');
    } finally {
      setTemplatesLoading(false);
    }
  }, [canvas, templateSearch, templateTypeFilter]);

  useEffect(() => {
    if (activeTab === 'templates') {
      fetchBackendTemplates();
    }
  }, [activeTab, fetchBackendTemplates]);

  // Manage Drawing Mode
  const [brushColor, setBrushColor] = useState('#8b5cf6');
  const [brushWidth, setBrushWidth] = useState(5);

  useEffect(() => {
    if (!canvas) return;
    if (activeTab === 'draw' && !isPenMode) {
      canvas.isDrawingMode = true;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = brushColor;
        canvas.freeDrawingBrush.width = brushWidth;
      }
    } else {
      canvas.isDrawingMode = false;
    }

    if (activeTab !== 'draw') {
      setPenMode(false);
    }
    
    // Save history after drawing
    const handlePathCreated = () => saveHistory();
    
    if (activeTab === 'draw') {
      canvas.on('path:created', handlePathCreated);
    }
    
    return () => {
      canvas.off('path:created', handlePathCreated);
    };
  }, [activeTab, canvas, brushColor, brushWidth, saveHistory, isPenMode, setPenMode]);

  // Layer Ordering Operations
  const moveLayerUp = useCallback((obj: fabric.Object) => {
    if (!canvas) return;
    if (moveLayerObject(canvas, obj, 'forward')) {
      refreshLayers();
      saveHistory();
    }
  }, [canvas, refreshLayers, saveHistory]);

  const moveLayerDown = useCallback((obj: fabric.Object) => {
    if (!canvas) return;
    if (moveLayerObject(canvas, obj, 'backward')) {
      refreshLayers();
      saveHistory();
    }
  }, [canvas, refreshLayers, saveHistory]);

  const moveLayerToFront = useCallback((obj: fabric.Object) => {
    if (!canvas) return;
    if (moveLayerObject(canvas, obj, 'front')) {
      refreshLayers();
      saveHistory();
    }
  }, [canvas, refreshLayers, saveHistory]);

  const moveLayerToBack = useCallback((obj: fabric.Object) => {
    if (!canvas) return;
    if (moveLayerObject(canvas, obj, 'back')) {
      refreshLayers();
      saveHistory();
    }
  }, [canvas, refreshLayers, saveHistory]);

  const moveLayerToDisplayIndex = useCallback((obj: fabric.Object, displayIndex: number) => {
    if (!canvas) return;
    if (moveLayerObjectToDisplayIndex(canvas, obj, displayIndex)) {
      refreshLayers();
      saveHistory();
    }
  }, [canvas, refreshLayers, saveHistory]);

  const toggleLayerLock = useCallback((obj: fabric.Object) => {
    if (!canvas) return;
    const isLocked = !obj.lockMovementX;
    
    obj.set({
      lockMovementX: isLocked,
      lockMovementY: isLocked,
      lockScalingX: isLocked,
      lockScalingY: isLocked,
      lockRotation: isLocked,
      hasControls: !isLocked, // Hide edit knobs if locked
    });
    
    // Refresh selections
    if (isLocked && canvas.getActiveObject() === obj) {
      canvas.discardActiveObject();
    }
    
    canvas.renderAll();
    refreshLayers();
    saveHistory();
  }, [canvas, refreshLayers, saveHistory]);

  const toggleLayerVisibility = useCallback((obj: fabric.Object) => {
    if (!canvas) return;
    obj.set('visible', !obj.visible);
    
    if (!obj.visible && canvas.getActiveObject() === obj) {
      canvas.discardActiveObject();
    }
    
    canvas.renderAll();
    refreshLayers();
    saveHistory();
  }, [canvas, refreshLayers, saveHistory]);

  const deleteLayer = useCallback((obj: fabric.Object) => {
    if (!canvas) return;
    const nodeId = obj.get('architectureNodeId' as keyof fabric.Object);
    if (obj.get('teckstudioObjectType' as keyof fabric.Object) === 'architectureNode' && nodeId) {
      removeConnectorsForNode(canvas, String(nodeId));
    }
    canvas.remove(obj);
    canvas.discardActiveObject();
    canvas.renderAll();
    refreshLayers();
    saveHistory();
  }, [canvas, refreshLayers, saveHistory]);

  // Bulk layer operations
  const lockAllLayers = () => {
    if (!canvas) return;
    canvas.getObjects().forEach((obj) => {
      obj.set({
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
        hasControls: false,
      } as any);
    });
    canvas.discardActiveObject();
    canvas.renderAll();
    refreshLayers();
    saveHistory();
  };

  const unlockAllLayers = () => {
    if (!canvas) return;
    canvas.getObjects().forEach((obj) => {
      obj.set({
        lockMovementX: false,
        lockMovementY: false,
        lockScalingX: false,
        lockScalingY: false,
        lockRotation: false,
        hasControls: true,
      } as any);
    });
    canvas.renderAll();
    refreshLayers();
    saveHistory();
  };

  // Load a sector template from templates.ts
  const loadSectorTemplate = (sectorKey: string, templateIndex: number = 0) => {
    if (!canvas) return;
    const templates = SECTOR_TEMPLATES[sectorKey];
    if (!templates || !templates[templateIndex]) return;

    const template = templates[templateIndex];
    canvas.clear();

    // Set canvas size based on first element dimensions
    const bgElement = template.elements.find((e: any) => e.type === 'rect' && e.props.selectable === false);
    if (bgElement) {
      canvas.setWidth(bgElement.props.width || 800);
      canvas.setHeight(bgElement.props.height || 800);
    }

    template.elements.forEach((el: any) => {
      let obj: fabric.Object | null = null;
      const p = el.props;

      switch (el.type) {
        case 'rect':
          obj = new fabric.Rect(p);
          break;
        case 'circle':
          obj = new fabric.Circle(p);
          break;
        case 'text':
          obj = new fabric.Textbox(p.text, p);
          break;
        case 'line':
          obj = new fabric.Line([p.x1, p.y1, p.x2, p.y2], {
            stroke: p.stroke || '#000',
            strokeWidth: p.strokeWidth || 1,
          });
          break;
        case 'polygon':
          obj = new fabric.Polygon(p.points || [], p);
          break;
      }

      if (obj) {
        canvas.add(obj);
      }
    });

    canvas.renderAll();
    saveHistory();
  };



  const waitForTechnicalPosterFonts = async () => {
    if (typeof document === 'undefined' || !('fonts' in document)) return;
    const fontSet = document.fonts;
    await Promise.allSettled([
      fontSet.load(`800 43px "Space Mono"`),
      fontSet.load(`700 16px "Space Mono"`),
      fontSet.load(`800 24px "IBM Plex Mono"`),
      fontSet.ready,
    ]);
  };

  const normalizeTextAfterFonts = () => {
    if (!canvas) return;
    canvas.getObjects().forEach((object) => {
      const updateText = (target: fabric.Object) => {
        if (!('text' in target)) return;
        const textObject = target as fabric.Textbox & { initDimensions?: () => void };
        textObject.initDimensions?.();
        textObject.setCoords();
      };
      if (object.type === 'group') (object as fabric.Group).forEachObject(updateText);
      updateText(object);
      object.setCoords();
    });
  };

  const ensureActivePageTimelineClip = (durationMs: number) => {
    const store = useEditorStore.getState();
    const pageId = store.activePageId || store.pages[0]?.id;
    if (!pageId) return;

    const pages = store.syncActivePage();
    const activePage = pages.find((page) => page.id === pageId);
    const timeline = useEditorStore.getState().timelineProject;
    const posterTrack = timeline.tracks.find((track) => track.type === 'poster');
    const existingClip = posterTrack?.clips.find((clip) => clip.pageId === pageId);
    const clipId = existingClip?.id || `prompt-context-harness-${pageId}-clip`;
    const clip = {
      ...(existingClip || {}),
      id: clipId,
      sceneId: pageId,
      pageId,
      name: activePage?.name || 'Prompt Context Harness Infographic',
      thumbnailUrl: activePage?.thumbnail,
      startMs: existingClip?.startMs || 0,
      durationMs: Math.max(existingClip?.durationMs || 0, durationMs),
      visible: true,
      locked: existingClip?.locked || false,
    };
    const tracks = timeline.tracks.some((track) => track.type === 'poster')
      ? timeline.tracks.map((track) => {
        if (track.type !== 'poster') return track;
        const hasClip = track.clips.some((candidate) => candidate.pageId === pageId);
        return {
          ...track,
          clips: hasClip
            ? track.clips.map((candidate) => (candidate.pageId === pageId ? clip : candidate))
            : [...track.clips, clip],
        };
      })
      : [{ id: 'poster-track', type: 'poster' as const, clips: [clip] }, ...timeline.tracks];

    useEditorStore.setState({
      timelineProject: normalizeTimelineProject({
        ...timeline,
        currentTimeMs: 0,
        tracks,
      }),
      selectedTimelineClipId: clipId,
    });
  };

  const loadBackendTemplate = (template: BackendTemplate) => {
    if (!canvas || !template.data) return;

    canvas.clear();
    canvas.setWidth(template.width || 800);
    canvas.setHeight(template.height || 800);
    canvas.loadFromJSON(template.data, () => {
      canvas.renderAll();
      saveHistory();
      refreshLayers();
      apiFetch(`/api/templates/${template.id}/use`, { method: 'POST', auth: false }).catch(() => undefined);
    });
  };

  const loadEditorialTechTemplate = async () => {
    if (!canvas) return;
    await applyEditorialTechPoster(canvas);
    useEditorStore.getState().setCanvasDimensions(1080, 1080);
    saveHistory();
    refreshLayers();
  };

  const loadArchitectureTemplate = async () => {
    if (!canvas) return;
    await applyAIChatArchitectureTemplate(canvas);
    useEditorStore.getState().setCanvasDimensions(1080, 1350);
    const zoom = fitArchitectureCanvasToWorkspace(canvas);
    useEditorStore.getState().setZoom(zoom);
    saveHistory();
    refreshLayers();
  };

  const loadDistributedSystemTemplate = async () => {
    if (!canvas) return;
    await applyDistributedSystemArchitectureTemplate(canvas);
    useEditorStore.getState().setCanvasDimensions(1440, 1000);
    const zoom = fitArchitectureCanvasToWorkspace(canvas);
    useEditorStore.getState().setZoom(zoom);
    saveHistory();
    refreshLayers();
  };

  const loadTechnicalInfographicTemplate = () => {
    if (!canvas) return;
    applyTechnicalAIWorkflowTemplate(canvas);
    useEditorStore.getState().setCanvasDimensions(1080, 1350);
    const zoom = fitTechnicalInfographicCanvasToWorkspace(canvas);
    useEditorStore.getState().setZoom(zoom);
    saveHistory();
    refreshLayers();
  };


  const loadPromptContextHarnessTemplate = async () => {
    if (!canvas || promptHarnessLoading) return;
    setPromptHarnessLoading(true);
    try {
      masterTimelineManager.pause();
      await waitForTechnicalPosterFonts();
      applyPromptContextHarnessInfographicTemplate(canvas);
      useEditorStore.getState().setCanvasDimensions(1080, 1350);
      normalizeTextAfterFonts();
      canvas.getObjects()
        .sort((left, right) => Number(left.get('layerIndex' as keyof fabric.Object) || 0) - Number(right.get('layerIndex' as keyof fabric.Object) || 0))
        .forEach((object) => canvas.bringToFront(object));
      ensureActivePageTimelineClip(16000);
      const zoom = fitTechnicalInfographicCanvasToWorkspace(canvas);
      useEditorStore.getState().setZoom(zoom);
      masterTimelineManager.attachCanvas(canvas);
      masterTimelineManager.seekMs(0);
      useEditorStore.getState().setTimelineCurrentTime(0);
      canvas.renderAll();
      saveHistory();
      refreshLayers();
    } finally {
      setPromptHarnessLoading(false);
    }
  };

  const handleApplyTemplate = async (template: BackendTemplate) => {
    if (!canvas || !template.data || applyingTemplateId) return;
    const projectId = useEditorStore.getState().projectId;
    if (!projectId || projectId.startsWith('local_')) {
      // For local projects, load directly onto canvas
      loadBackendTemplate(template);
      return;
    }
    setApplyingTemplateId(template.id);
    try {
      await applyTemplateToProject(template.id, projectId);
      // Reload the canvas with the new template data
      canvas.loadFromJSON(template.data, () => {
        canvas.setWidth(template.width || 800);
        canvas.setHeight(template.height || 800);
        canvas.renderAll();
        saveHistory();
        refreshLayers();
        useEditorStore.getState().setCanvasDimensions(template.width || 800, template.height || 800);
      });
    } catch (error) {
      console.error('Failed to apply template:', error);
      // Fallback: load directly onto canvas
      loadBackendTemplate(template);
    } finally {
      setApplyingTemplateId(null);
    }
  };

  // Preset Template loader (legacy)
  const loadTemplate = (templateType: 'instagram' | 'thumbnail' | 'card') => {
    if (!canvas) return;
    
    canvas.clear();
    
    if (templateType === 'instagram') {
      canvas.setBackgroundColor('#8b5cf6', () => {}); // Purple gradient start representation
      
      // Large title text
      const title = new fabric.Textbox('CREATIVE\nDESIGN', {
        left: 150,
        top: 250,
        width: 500,
        fontSize: 72,
        fontWeight: 'bold',
        fill: '#ffffff',
        fontFamily: 'Outfit',
        textAlign: 'center',
        lineHeight: 1.1,
      });

      // Subheading
      const subtitle = new fabric.Textbox('Grow your brand with Canva AI templates.', {
        left: 150,
        top: 450,
        width: 500,
        fontSize: 24,
        fill: '#f5f3ff',
        fontFamily: 'Outfit',
        textAlign: 'center',
      });

      // Decorative Circle
      const decoCircle = new fabric.Circle({
        left: 400,
        top: 50,
        radius: 120,
        fill: 'rgba(255,255,255,0.06)',
        selectable: true,
      });

      canvas.add(decoCircle, title, subtitle);
      
    } else if (templateType === 'thumbnail') {
      canvas.setBackgroundColor('#09090b', () => {});
      
      // Main background gradient card
      const rect = new fabric.Rect({
        left: 50,
        top: 50,
        width: 700,
        height: 700,
        fill: '#18181b',
        rx: 16,
        ry: 16,
        selectable: false,
      });

      const badge = new fabric.Rect({
        left: 100,
        top: 150,
        width: 140,
        height: 38,
        fill: '#ec4899',
        rx: 19,
        ry: 19,
      });

      const badgeText = new fabric.Textbox('NEW VIDEO', {
        left: 100,
        top: 158,
        width: 140,
        fontSize: 16,
        fontWeight: 'bold',
        fill: '#ffffff',
        fontFamily: 'Outfit',
        textAlign: 'center',
      });

      const title = new fabric.Textbox('How To Build A\nCanva Clone', {
        left: 100,
        top: 230,
        width: 600,
        fontSize: 64,
        fontWeight: 'bold',
        fill: '#ffffff',
        fontFamily: 'Outfit',
        textAlign: 'left',
        lineHeight: 1.1,
      });

      const star = new fabric.Path('M 50 0 L 65 35 L 100 35 L 72 57 L 83 91 L 50 70 L 17 91 L 28 57 L 0 35 L 35 35 Z', {
        left: 550,
        top: 120,
        width: 120,
        height: 120,
        fill: '#eab308',
      });

      canvas.add(rect, badge, badgeText, title, star);
      
    } else if (templateType === 'card') {
      canvas.setBackgroundColor('#ffffff', () => {});

      const border = new fabric.Rect({
        left: 40,
        top: 40,
        width: 720,
        height: 720,
        fill: 'transparent',
        stroke: '#e4e4e7',
        strokeWidth: 4,
        rx: 12,
        ry: 12,
        selectable: false,
      });

      const logoCircle = new fabric.Circle({
        left: 100,
        top: 120,
        radius: 40,
        fill: '#8b5cf6',
      });

      const name = new fabric.Textbox('Sandhya Arkadu', {
        left: 100,
        top: 250,
        width: 600,
        fontSize: 48,
        fontWeight: 'bold',
        fill: '#18181b',
        fontFamily: 'Outfit',
      });

      const title = new fabric.Textbox('Lead UI Engineer', {
        left: 100,
        top: 310,
        width: 600,
        fontSize: 24,
        fill: '#8b5cf6',
        fontFamily: 'Outfit',
      });

      const contact = new fabric.Textbox('sandhya.arkadu@example.com\n+1 (555) 019-2834\nwww.example.com', {
        left: 100,
        top: 480,
        width: 600,
        fontSize: 20,
        fill: '#71717a',
        fontFamily: 'Outfit',
        lineHeight: 1.5,
      });

      canvas.add(border, logoCircle, name, title, contact);
    }
    
    canvas.renderAll();
    saveHistory();
  };

  void loadSectorTemplate;
  void loadTemplate;

  return (
    <aside className="teckstudio-panel-surface w-[312px] h-full border-r flex select-none shrink-0 z-10">
      {/* Icon Tab Strip */}
      <div className="w-16 h-full border-r border-white/[0.08] bg-[#0b0b12] flex flex-col items-center py-3 gap-2 shrink-0">
        {[
          { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
          { id: 'elements', icon: Sparkles, label: 'Elements' },
          { id: 'diagram', icon: Network, label: 'Diagram' },
          { id: 'text', icon: Type, label: 'Text' },
          { id: 'draw', icon: PenTool, label: 'Draw' },
          { id: 'uploads', icon: Upload, label: 'Uploads' },
          { id: 'pages', icon: FileText, label: 'Pages' },
          { id: 'layers', icon: Layers, label: 'Layers' },
          { id: 'history', icon: History, label: 'History' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                isActive 
                  ? 'bg-violet-500/15 text-violet-300 border border-violet-400/30 shadow-sm' 
                  : 'border border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'
              }`}
              title={tab.label}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="text-[8px] font-medium leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Panel */}
      <div className={`teckstudio-scrollbar flex-1 min-w-0 h-full flex flex-col overflow-y-auto bg-[#101018] ${activeTab === 'elements' ? 'p-0' : 'p-4'}`}>
        {activeTab !== 'elements' && <h3 className="text-sm font-bold text-zinc-100 mb-4 capitalize">
          {activeTab}
        </h3>}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search templates..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchBackendTemplates(); }}
                className="w-full bg-zinc-950 border border-white/[0.08] focus:border-violet-500 rounded-lg py-1.5 pl-8 pr-8 text-xs text-zinc-200 outline-none transition-colors placeholder:text-zinc-600"
              />
              {templateSearch && (
                <button onClick={() => { setTemplateSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Type filter tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
              {TEMPLATE_TYPE_OPTIONS.slice(0, 6).map((type) => (
                <button
                  key={type.id}
                  onClick={() => setTemplateTypeFilter(type.id)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-semibold transition-colors ${
                    templateTypeFilter === type.id
                      ? 'border-violet-400/60 bg-violet-500/15 text-violet-200'
                      : 'border-white/[0.08] bg-zinc-950/70 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* Canvas dimensions info */}
            {canvas && (
              <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#12121B]/40 px-2.5 py-1.5">
                <span className="text-[9px] text-zinc-500">Canvas: {Math.round(canvas.getWidth())} × {Math.round(canvas.getHeight())}</span>
                <button onClick={fetchBackendTemplates} className="text-[9px] font-semibold text-violet-300 hover:text-violet-200">
                  Refresh
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={loadEditorialTechTemplate}
              className="group overflow-hidden rounded-xl border border-amber-500/30 bg-[#07100D] text-left transition hover:border-amber-400"
            >
              <div
                className="relative aspect-square overflow-hidden border-b border-amber-500/20"
                style={{
                  backgroundColor: '#07100D',
                  backgroundImage: 'linear-gradient(#14201B55 1px, transparent 1px), linear-gradient(90deg, #14201B55 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                }}
              >
                <div className="absolute inset-1 border border-[#F3F0E8]/70" />
                <div className="absolute inset-x-3 top-[28%] text-center font-serif text-[15px] font-bold text-[#F3F0E8]">
                  ship <span className="italic text-[#C89A4B]">the API</span>
                </div>
                <div className="absolute inset-x-0 bottom-3 text-center font-mono text-[6px] tracking-[0.16em] text-[#858A85]">
                  NO JARGON · SWIPE →
                </div>
              </div>
              <div className="p-2.5">
                <div className="text-[10px] font-bold text-zinc-100">{EDITORIAL_TECH_TEMPLATE_NAME}</div>
                <div className="mt-1 text-[8px] text-amber-300">Technology · Developer · Editable</div>
                <div className="mt-1 text-[8px] text-zinc-600">1080 × 1080</div>
              </div>
            </button>

            <div className="col-span-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Technical / Infographic</div>

            <button
              type="button"
              onClick={loadArchitectureTemplate}
              className="group overflow-hidden rounded-xl border border-cyan-500/30 bg-[#070A0F] text-left transition hover:border-cyan-400"
            >
              <div
                className="relative aspect-[4/5] overflow-hidden border-b border-cyan-500/20"
                style={{
                  backgroundColor: '#070A0F',
                  backgroundImage: 'linear-gradient(#15202A66 1px, transparent 1px), linear-gradient(90deg, #15202A66 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                }}
              >
                <div className="absolute inset-x-2 top-3 text-center text-[9px] font-black tracking-[0.12em] text-[#F1F3F5]">AI CHAT SYSTEM</div>
                <div className="absolute inset-x-3 top-9 flex gap-1">
                  {['#43D68A', '#F2C94C', '#FF795B', '#43D68A'].map((color, index) => (
                    <div key={`${color}-${index}`} className="h-1 flex-1 rounded-full" style={{ backgroundColor: color }} />
                  ))}
                </div>
                {[
                  ['left-2 top-[34%]', '#43D68A'],
                  ['right-2 top-[34%]', '#CF8CFF'],
                  ['left-[27%] top-[56%] w-[46%]', '#43D68A'],
                  ['right-2 top-[73%]', '#55A6FF'],
                  ['left-[22%] bottom-3 w-[56%]', '#43D68A'],
                ].map(([position, color], index) => (
                  <div key={position} className={`absolute h-8 w-[30%] rounded border bg-[#11151D] ${position}`} style={{ borderColor: color }}>
                    <div className="h-full w-1" style={{ backgroundColor: color }} />
                    {index === 2 && <div className="absolute inset-0 flex items-center justify-center text-[4px] font-bold text-zinc-300">ORCHESTRATOR</div>}
                  </div>
                ))}
              </div>
              <div className="p-2.5">
                <div className="text-[10px] font-bold text-zinc-100">{AI_ARCHITECTURE_TEMPLATE_NAME}</div>
                <div className="mt-1 text-[8px] text-cyan-300">Technology · System Design · Editable</div>
                <div className="mt-1 text-[8px] text-zinc-600">1080 × 1350</div>
              </div>
            </button>

            <button
              type="button"
              onClick={loadDistributedSystemTemplate}
              className="group overflow-hidden rounded-xl border border-sky-500/30 bg-[#070A0F] text-left transition hover:border-sky-400"
            >
              <div
                className="relative aspect-[4/5] overflow-hidden border-b border-sky-500/20"
                style={{
                  backgroundColor: '#070A0F',
                  backgroundImage: 'linear-gradient(#15202A66 1px, transparent 1px), linear-gradient(90deg, #15202A66 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              >
                <div className="absolute inset-x-2 top-3 text-center text-[7px] font-black tracking-[0.12em] text-[#F1F3F5]">DISTRIBUTED SYSTEM</div>
                <div className="absolute left-3 top-[25%] h-8 w-14 rounded border border-[#55A6FF] bg-[#11151D]" />
                <div className="absolute left-[35%] top-[25%] h-8 w-14 rounded border border-[#CF8CFF] bg-[#11151D]" />
                <div className="absolute right-3 top-[25%] h-8 w-14 rounded border border-[#43D68A] bg-[#11151D]" />
                <div className="absolute left-[35%] top-[50%] h-8 w-14 rounded border border-[#F2C94C] bg-[#11151D]" />
                <div className="absolute right-3 top-[50%] h-8 w-14 rounded border border-[#FF795B] bg-[#11151D]" />
                <div className="absolute left-3 right-3 top-[40%] h-0.5 bg-gradient-to-r from-[#55A6FF] via-[#CF8CFF] to-[#43D68A]" />
                <div className="absolute left-[42%] top-[40%] h-[22%] border-l border-dashed border-[#F2C94C]" />
                <div className="absolute inset-x-3 bottom-5 rounded border border-[#F2C94C66] px-2 py-1 text-center text-[5px] font-bold tracking-[0.12em] text-[#F2C94C]">DATA PLATFORM</div>
              </div>
              <div className="p-2.5">
                <div className="text-[10px] font-bold text-zinc-100">{DISTRIBUTED_SYSTEM_TEMPLATE_NAME}</div>
                <div className="mt-1 text-[8px] text-sky-300">System Design · Editable Connectors</div>
                <div className="mt-1 text-[8px] text-zinc-600">1440 × 1000</div>
              </div>
            </button>

            <button
              type="button"
              onClick={loadTechnicalInfographicTemplate}
              className="group overflow-hidden rounded-xl border border-emerald-500/30 bg-[#080D0B] text-left transition hover:border-emerald-400"
            >
              <div
                className="relative aspect-[4/5] overflow-hidden border-b border-emerald-500/20"
                style={{
                  backgroundColor: '#080D0B',
                  backgroundImage: 'linear-gradient(#17312655 1px, transparent 1px), linear-gradient(90deg, #17312655 1px, transparent 1px)',
                  backgroundSize: '18px 18px',
                }}
              >
                <div className="absolute inset-3 rounded border border-emerald-500/45" />
                <div className="absolute inset-x-3 top-4 text-center font-mono text-[8px] font-black tracking-[0.18em] text-[#F4F7F5]">AI WORKFLOW</div>
                <div className="absolute left-4 right-4 top-[34%] flex items-center gap-1">
                  {['#38F08C', '#38BDF8', '#A78BFA'].map((color, index) => (
                    <React.Fragment key={color}>
                      <div className="h-8 flex-1 rounded border bg-[#101619]" style={{ borderColor: color }} />
                      {index < 2 && <div className="h-0.5 w-3" style={{ backgroundColor: color }} />}
                    </React.Fragment>
                  ))}
                </div>
                <div className="absolute inset-x-5 bottom-5 h-1 rounded-full bg-[#38F08C]" />
              </div>
              <div className="p-2.5">
                <div className="text-[10px] font-bold text-zinc-100">{TECHNICAL_INFOGRAPHIC_TEMPLATE_NAME}</div>
                <div className="mt-1 text-[8px] text-emerald-300">Technical · Infographic · Editable</div>
                <div className="mt-1 text-[8px] text-zinc-600">1080 × 1350</div>
              </div>
            </button>


            <button
              type="button"
              onClick={loadPromptContextHarnessTemplate}
              disabled={promptHarnessLoading}
              className="group overflow-hidden rounded-xl border border-purple-500/30 bg-[#070B0D] text-left transition hover:border-purple-400"
            >
              <div
                className="relative aspect-[4/5] overflow-hidden border-b border-purple-500/20"
                style={{
                  backgroundColor: '#070B0D',
                  backgroundImage: 'linear-gradient(#607A7230 1px, transparent 1px), linear-gradient(90deg, #607A7230 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              >
                <div className="absolute inset-3 rounded border border-white/15" />
                <div className="absolute inset-x-3 top-4 text-center font-mono text-[7px] font-black tracking-[0.14em] text-[#F4F7F5]">PROMPT / CONTEXT / HARNESS</div>
                <div className="absolute left-5 right-5 top-12 h-1 rounded-full bg-gradient-to-r from-[#38F08C] via-[#38BDF8] to-[#A78BFA]" />
                {[
                  ['top-[28%]', '#38F08C', '01'],
                  ['top-[49%]', '#38BDF8', '02'],
                  ['top-[70%]', '#A78BFA', '03'],
                ].map(([position, color, number]) => (
                  <div key={number} className={`absolute left-5 right-5 h-12 rounded border bg-[#101619] ${position}`} style={{ borderColor: color }}>
                    <div className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border text-[6px] font-black" style={{ borderColor: color, color }}>{number}</div>
                    <div className="absolute left-10 top-3 h-1.5 w-20 rounded" style={{ backgroundColor: color }} />
                    <div className="absolute left-10 top-7 h-1 w-28 rounded bg-white/20" />
                    <div className="absolute right-4 top-4 h-4 w-4 rotate-45 border" style={{ borderColor: color }} />
                  </div>
                ))}
              </div>
              <div className="p-2.5">
                <div className="text-[10px] font-bold text-zinc-100">{promptHarnessLoading ? 'Loading deterministic poster...' : PROMPT_CONTEXT_HARNESS_TEMPLATE_NAME}</div>
                <div className="mt-1 text-[8px] text-purple-300">Technical / Infographic · Animated</div>
                <div className="mt-1 text-[8px] text-zinc-600">1080 × 1350</div>
              </div>
            </button>

            {/* Loading */}
            {templatesLoading && (
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#12121B]/40 p-3 text-[10px] text-zinc-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading templates...
              </div>
            )}

            {/* Error */}
            {templatesError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[10px] text-red-200">
                {templatesError}
              </div>
            )}

            {/* Backend Templates Grid */}
            {backendTemplates.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {backendTemplates.map((template) => {
                  const orientation = getTemplateOrientation(template.width, template.height);
                  const isCompatible = canvas ? isTemplateCompatible(template.width, template.height, canvas.getWidth(), canvas.getHeight()) : true;
                  const isApplying = applyingTemplateId === template.id;
                  return (
                    <div
                      key={template.id}
                      className={`group relative flex flex-col overflow-hidden rounded-xl border transition-all cursor-pointer ${
                        isCompatible
                          ? 'border-white/[0.08] hover:border-violet-500 bg-[#12121B]/40'
                          : 'border-white/[0.08]/50 bg-[#12121B]/20 opacity-60'
                      }`}
                    >
                      <button
                        onClick={() => handleApplyTemplate(template)}
                        disabled={isApplying}
                        className="text-left"
                      >
                        <div className={`overflow-hidden rounded-t-xl ${
                          orientation === 'landscape' ? 'h-14' : orientation === 'square' ? 'h-16' : 'h-20'
                        }`}>
                          {template.thumbnail ? (
                            <img src={template.thumbnail} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 flex items-center justify-center">
                              <LayoutTemplate className="h-5 w-5 text-violet-300/70" />
                            </div>
                          )}
                        </div>
                      </button>
                      <div className="p-2">
                        <p className="text-[9px] font-semibold text-zinc-300 truncate">{template.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[8px] text-zinc-600">{template.width}×{template.height}</p>
                          {isCompatible && (
                            <span className="text-[8px] text-emerald-400 font-medium">Match</span>
                          )}
                        </div>
                        <div className="flex gap-1 mt-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApplyTemplate(template); }}
                            disabled={isApplying}
                            className="flex-1 h-6 rounded-md bg-violet-600 text-[8px] font-bold text-white hover:bg-violet-500 disabled:opacity-50 flex items-center justify-center"
                          >
                            {isApplying ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : 'Apply'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); loadBackendTemplate(template); }}
                            className="h-6 rounded-md border border-zinc-700 text-[8px] font-semibold text-zinc-400 hover:text-white hover:border-zinc-500 px-2"
                          >
                            Load
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {!templatesLoading && backendTemplates.length === 0 && !templatesError && (
              <div className="text-center py-6">
                <LayoutTemplate className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-[10px] text-zinc-500">No templates found for current canvas size.</p>
                <p className="text-[9px] text-zinc-600 mt-1">Try adjusting filters or refresh.</p>
              </div>
            )}
          </div>
        )}
        {/* Elements Tab - includes shapes, stickers, frames, grids, charts, etc. */}
        {activeTab === 'elements' && (
          <ElementsPanel />
        )}

        {activeTab === 'diagram' && (
          <ArchitectureDiagramPanel />
        )}

        {/* Text Tab */}
        {activeTab === 'text' && (
          <TextToolsPanel />
        )}

        {/* Draw Tab */}
        {activeTab === 'draw' && (
          <div className="flex flex-col gap-5">
            {/* Draw mode selector buttons */}
            <div className="grid grid-cols-2 gap-2 border border-white/[0.08] rounded-lg p-0.5 bg-zinc-950">
              <button
                onClick={() => {
                  setPenMode(false);
                  if (canvas) canvas.isDrawingMode = true;
                }}
                className={`py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  (!isPenMode && canvas?.isDrawingMode)
                    ? 'bg-zinc-850 text-violet-400 border border-white/[0.08] shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                Brush
              </button>
              <button
                onClick={() => {
                  if (canvas) canvas.isDrawingMode = false;
                  setPenMode(true);
                }}
                className={`py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  isPenMode
                    ? 'bg-zinc-850 text-violet-400 border border-white/[0.08] shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                Pen Tool
              </button>
            </div>

            {isPenMode ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-xs text-emerald-400">
                <p className="font-bold mb-1 flex items-center gap-1">✦ Figma Vector Pen Active</p>
                <ul className="list-disc pl-4 space-y-1 mt-1 opacity-90">
                  <li>Click to place anchor points.</li>
                  <li>Double-click or press <strong>Enter</strong> to close the path.</li>
                  <li>Press <strong>Escape</strong> to finish open line.</li>
                </ul>
              </div>
            ) : (
              <div className="bg-violet-600/10 border border-violet-500/20 p-4 rounded-xl text-xs text-violet-300">
                <p className="font-semibold mb-1">Freehand Drawing Mode</p>
                <p className="opacity-80">Click and drag on the canvas to draw. Switch tabs to exit drawing mode.</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-zinc-400">Brush Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={brushColor.toUpperCase()}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="flex-1 bg-[#12121B] border border-white/[0.08] focus:border-violet-500 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none text-center font-mono"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-zinc-400">Brush Width</label>
                <span className="text-xs text-zinc-400 font-mono font-bold">{brushWidth}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={brushWidth}
                onChange={(e) => setBrushWidth(parseInt(e.target.value))}
                className="w-full accent-violet-500 h-1 rounded-full cursor-pointer bg-zinc-800"
              />
            </div>
          </div>
        )}

        {/* Uploads Tab */}
        {activeTab === 'uploads' && (
          <UploadsPanel />
        )}

        {/* Pages Tab */}
        {activeTab === 'pages' && (
          <PagesPanel />
        )}

        {/* Layers Tab */}
        {activeTab === 'layers' && (
          <div className="flex flex-col gap-3">
            {/* Layers Search Filter */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter layers..."
                value={layerSearchQuery}
                onChange={(e) => setLayerSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-white/[0.08] hover:border-zinc-750 focus:border-violet-500 rounded-lg py-1.5 pl-8 pr-3 text-xs text-zinc-205 outline-none transition-colors placeholder:text-zinc-600"
              />
            </div>

            {layers.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-500">
                No layers found. Add shapes or text to see them here!
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <button onClick={lockAllLayers} className="text-[10px] font-bold bg-[#12121B]/60 border border-white/[0.08] px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors">Lock all</button>
                  <button onClick={unlockAllLayers} className="text-[10px] font-bold bg-[#12121B]/60 border border-white/[0.08] px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors">Unlock all</button>
                </div>

                <div className="layers-panel-container flex min-h-0 max-h-[450px] flex-col gap-2 overflow-y-auto pr-1">
                  {layers
                    .map((layer, index) => ({ layer, index }))
                    .filter(({ layer, index }) => 
                      getDisplayName(layer, index).toLowerCase().includes(layerSearchQuery.toLowerCase())
                    )
                    .map(({ layer, index }) => {
                      const layerId = getStableLayerId(layer);
                      return (
                        <LayerItem
                          key={layerId}
                          layer={layer}
                          layerId={layerId}
                          displayIndex={index}
                          totalLayers={layers.length}
                          selected={selectedObject === layer}
                          locked={Boolean(layer.lockMovementX)}
                          visible={layer.visible !== false}
                          dragging={draggedLayerId === layerId}
                          onSelect={(object) => {
                            if (!canvas || object.visible === false) return;
                            canvas.setActiveObject(object);
                            canvas.renderAll();
                            setSelectedObject(object);
                          }}
                          onRename={(id, name) => {
                            const object = canvas?.getObjects().find((item) => getStableLayerId(item) === id);
                            if (object) {
                              updateObjectName(id, name);
                              object.set('name', name);
                              canvas?.renderAll();
                              refreshLayers();
                              saveHistory();
                            }
                          }}
                          onToggleVisibility={toggleLayerVisibility}
                          onToggleLock={toggleLayerLock}
                          onMoveUp={(object, toFront) => toFront ? moveLayerToFront(object) : moveLayerUp(object)}
                          onMoveDown={(object, toBack) => toBack ? moveLayerToBack(object) : moveLayerDown(object)}
                          onDelete={deleteLayer}
                          onNavigate={(object, direction) => {
                            const currentIndex = layers.indexOf(object);
                            const next = layers[currentIndex + direction];
                            if (next && next.visible !== false) {
                              canvas?.setActiveObject(next);
                              canvas?.renderAll();
                              setSelectedObject(next);
                            }
                          }}
                          onDragStart={(id, event) => {
                            event.dataTransfer.setData('layerId', id);
                            event.dataTransfer.effectAllowed = 'move';
                            setDraggedLayerId(id);
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(object, targetIndex, event) => {
                            event.preventDefault();
                            const sourceId = event.dataTransfer.getData('layerId') || draggedLayerId;
                            const source = canvas?.getObjects().find((item) => getStableLayerId(item) === sourceId);
                            if (source && source !== object) moveLayerToDisplayIndex(source, targetIndex);
                            setDraggedLayerId(null);
                          }}
                          onDragEnd={() => setDraggedLayerId(null)}
                        />
                      );
                    })}
                </div>
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <HistoryPanel />
        )}
      </div>
    </aside>
  );
};

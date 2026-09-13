import React from 'react';
import {
  Activity,
  Box,
  Cable,
  CircleDot,
  Grid3x3,
  Network,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Route,
  Sparkles,
  Square,
} from 'lucide-react';
import { fabric } from 'fabric';
import { useEditorStore } from '../../store/useEditorStore';
import {
  AI_ARCHITECTURE_PALETTE,
  AI_ARCHITECTURE_TEMPLATE_NAME,
  CONNECTOR_ANIMATION_PRESETS,
  getConnectorAnimationPreset,
  normalizeConnectorAnimation,
} from '../../utils/architectureDiagramTypes';
import type {
  ArchitectureCardConfig,
  ArchitectureIconName,
  ConnectorAnchor,
  DiagramConnectorAnimationConfig,
  DiagramConnectorAnimationDirection,
  DiagramConnectorAnimationPresetId,
  DiagramConnectorAnimationType,
  DiagramArrowStyle,
  DiagramConnectorConfig,
  DiagramConnectorRouting,
  DiagramConnectorStyle,
} from '../../utils/architectureDiagramTypes';
import {
  applyAIChatArchitectureTemplate,
  createArchitectureCard,
  createStageTracker,
  createTechnicalGrid,
  ensureArchitectureFontsLoaded,
  fitArchitectureCanvasToWorkspace,
  getArchitectureNodes,
  replaceArchitectureCard,
} from '../../utils/architectureDiagram';
import {
  createDiagramConnector,
  getDiagramConnectorPaths,
  updateAllDiagramConnectors,
  updateDiagramConnectorConfig,
} from '../../utils/diagramConnectors';
import { getConnectorAnimationManager } from '../../utils/connectorAnimationManager';

const ICON_OPTIONS: Array<{ value: ArchitectureIconName; label: string }> = [
  { value: 'member', label: 'Member / User' },
  { value: 'globe', label: 'Edge / Globe' },
  { value: 'gateway', label: 'API Gateway' },
  { value: 'database', label: 'Database / Cache' },
  { value: 'chat', label: 'Chat / Orchestrator' },
  { value: 'router', label: 'Model Router' },
  { value: 'event', label: 'Event Bus' },
  { value: 'chip', label: 'GPU / Chip' },
  { value: 'workers', label: 'Workers / Team' },
  { value: 'server', label: 'Server' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'auth', label: 'Authentication' },
  { value: 'stream', label: 'Streaming' },
  { value: 'queue', label: 'Queue' },
  { value: 'analytics', label: 'Analytics' },
];

const ANCHORS: ConnectorAnchor[] = [
  'top',
  'top-right',
  'right',
  'bottom-right',
  'bottom',
  'bottom-left',
  'left',
  'top-left',
];

const inputClass = 'w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-200 outline-none focus:border-cyan-500';
const labelClass = 'space-y-1 text-[9px] font-semibold text-zinc-500';

const NumberInput = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) => (
  <label className={labelClass}>
    <span>{label}</span>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(event) => onChange(Number(event.target.value))}
      className={inputClass}
    />
  </label>
);

const ColorInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className={labelClass}>
    <span>{label}</span>
    <div className="flex gap-1">
      <input
        type="color"
        value={value.startsWith('#') ? value : '#43D68A'}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 w-8 rounded border border-zinc-800 bg-zinc-950 p-0.5"
      />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </div>
  </label>
);

const Section = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/45 p-3">
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
      {icon}
      {title}
    </div>
    {children}
  </section>
);

export const ArchitectureDiagramPanel: React.FC = () => {
  const {
    canvas,
    selectedObject,
    saveHistory,
    setSelectedObject,
  } = useEditorStore();
  const [message, setMessage] = React.useState('');
  const [nodeRefresh, setNodeRefresh] = React.useState(0);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  const [cardConfig, setCardConfig] = React.useState<ArchitectureCardConfig>({
    title: 'SYSTEM NODE',
    subtitle: 'service / responsibility',
    icon: 'server',
    width: 290,
    height: 142,
    backgroundColor: AI_ARCHITECTURE_PALETTE.cardBackground,
    borderColor: AI_ARCHITECTURE_PALETTE.green,
    accentColor: AI_ARCHITECTURE_PALETTE.green,
    accentWidth: 7,
    accentVisible: true,
    statusColor: AI_ARCHITECTURE_PALETTE.green,
    statusVisible: true,
    borderWidth: 2,
    cornerRadius: 12,
    paddingX: 24,
    paddingY: 20,
    iconGap: 16,
    textGap: 7,
    iconSize: 36,
    titleFontSize: 21,
    subtitleFontSize: 15,
    autoSize: false,
    glow: false,
    glowBlur: 12,
    chips: [],
  });
  const [chipText, setChipText] = React.useState('SESSION, TOOLS, STREAM');

  const [connectorConfig, setConnectorConfig] = React.useState<DiagramConnectorConfig>({
    sourceNodeId: '',
    targetNodeId: '',
    sourceAnchor: 'right',
    targetAnchor: 'left',
    routing: 'elbow',
    style: 'dotted',
    color: AI_ARCHITECTURE_PALETTE.green,
    width: 2,
    opacity: 0.85,
    dashLength: 10,
    dashGap: 8,
    startArrow: 'none',
    endArrow: 'arrow',
    arrowSize: 13,
    bendOffset: 0,
    curvature: 0.45,
    label: 'REQUEST',
    labelColor: AI_ARCHITECTURE_PALETTE.green,
    labelBackground: 'rgba(7, 10, 15, 0.88)',
    labelPosition: 0.5,
    labelOffset: -16,
    labelFontSize: 11,
    labelVisible: true,
    glow: false,
    glowBlur: 8,
    animation: {
      enabled: true,
      type: 'moving-dots',
      direction: 'forward',
      speed: 1.15,
      duration: 1800,
      delay: 0,
      loop: true,
      repeatDelay: 250,
      flowColor: AI_ARCHITECTURE_PALETTE.green,
      baseColor: AI_ARCHITECTURE_PALETTE.green,
      opacity: 1,
      particleSize: 5,
      particleCount: 4,
      dotSpacing: 26,
      dashLength: 8,
      dashGap: 10,
      pulseSize: 7,
      trailLength: 0.2,
      glowEnabled: true,
      glowColor: AI_ARCHITECTURE_PALETTE.green,
      glowStrength: 10,
      sourcePulse: false,
      targetPulse: true,
      pulseScale: 1.8,
      pulseDuration: 650,
      arrowheadStyle: 'arrow',
      arrowheadSize: 12,
      startDelay: 0,
      sequenceOrder: 0,
      labelPulse: false,
    },
  });

  const [stageLabels, setStageLabels] = React.useState('REQUEST, CONTEXT, INFER, STREAM');
  const [stageColors, setStageColors] = React.useState('#43D68A, #F2C94C, #FF795B, #43D68A');
  const [stageCircleSize, setStageCircleSize] = React.useState(12);
  const [stageLineWidth, setStageLineWidth] = React.useState(2);
  const [stageGlow, setStageGlow] = React.useState(true);
  const [stageArrows, setStageArrows] = React.useState(false);
  const [stageOrientation, setStageOrientation] = React.useState<'horizontal' | 'vertical'>('horizontal');

  const [gridHorizontal, setGridHorizontal] = React.useState(90);
  const [gridVertical, setGridVertical] = React.useState(90);
  const [gridOpacity, setGridOpacity] = React.useState(0.1);
  const [gridThickness, setGridThickness] = React.useState(1);
  const [gridColor, setGridColor] = React.useState<string>(AI_ARCHITECTURE_PALETTE.grid);
  const [gridMajorEvery, setGridMajorEvery] = React.useState(4);

  const nodes = React.useMemo(() => (
    canvas ? getArchitectureNodes(canvas) : []
  ), [canvas, nodeRefresh]);

  React.useEffect(() => {
    void ensureArchitectureFontsLoaded();
  }, []);

  React.useEffect(() => {
    if (!canvas) return;
    const refresh = () => setNodeRefresh((value) => value + 1);
    canvas.on('object:added', refresh);
    canvas.on('object:removed', refresh);
    canvas.on('object:modified', refresh);
    return () => {
      canvas.off('object:added', refresh);
      canvas.off('object:removed', refresh);
      canvas.off('object:modified', refresh);
    };
  }, [canvas]);

  const selectedCard = selectedObject?.get('teckstudioObjectType' as keyof fabric.Object) === 'architectureNode'
    ? selectedObject
    : null;
  const selectedConnectorPath = React.useMemo(() => {
    if (!canvas || !selectedObject) return null;
    if (selectedObject.get('teckstudioObjectType' as keyof fabric.Object) === 'diagramConnectorPath') {
      return selectedObject;
    }
    const connectorId = selectedObject.get('diagramConnectorId' as keyof fabric.Object);
    if (!connectorId) return null;
    return getDiagramConnectorPaths(canvas).find((path) => (
      path.get('diagramConnectorId' as keyof fabric.Object) === connectorId
    )) || null;
  }, [canvas, selectedObject]);

  React.useEffect(() => {
    if (selectedCard) {
      const config = selectedCard.get('architectureNodeConfig' as keyof fabric.Object) as ArchitectureCardConfig | undefined;
      if (config) {
        setCardConfig((current) => ({ ...current, ...config }));
        setChipText((config.chips || []).map((chip) => chip.text).join(', '));
      }
    }
  }, [selectedCard]);

  React.useEffect(() => {
    if (selectedConnectorPath) {
      const config = selectedConnectorPath.get('diagramConnectorConfig' as keyof fabric.Object) as DiagramConnectorConfig | undefined;
      if (config) {
        setConnectorConfig((current) => ({
          ...current,
          ...config,
          animation: normalizeConnectorAnimation(config.animation, config.color),
        }));
      }
    }
  }, [selectedConnectorPath]);

  React.useEffect(() => {
    if (nodes.length === 0) return;
    setConnectorConfig((current) => ({
      ...current,
      sourceNodeId: current.sourceNodeId || String(nodes[0].get('architectureNodeId' as keyof fabric.Object)),
      targetNodeId: current.targetNodeId || String(nodes[Math.min(1, nodes.length - 1)].get('architectureNodeId' as keyof fabric.Object)),
    }));
  }, [nodes]);

  const notify = (value: string) => {
    setMessage(value);
    window.setTimeout(() => setMessage(''), 2800);
  };

  const applyTemplate = async () => {
    if (!canvas) return;
    await applyAIChatArchitectureTemplate(canvas);
    useEditorStore.getState().setCanvasDimensions(1080, 1350);
    const zoom = fitArchitectureCanvasToWorkspace(canvas);
    useEditorStore.getState().setZoom(zoom);
    saveHistory();
    getConnectorAnimationManager(canvas)?.restartAll();
    setNodeRefresh((value) => value + 1);
    notify('AI Chat System Architecture applied. All elements remain editable.');
  };

  const parsedChips = () => chipText
    .split(',')
    .map((text) => text.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((text, index) => ({
      text,
      color: index % 2 === 0 ? cardConfig.accentColor : AI_ARCHITECTURE_PALETTE.yellow,
    }));

  const addCard = async () => {
    if (!canvas) return;
    await ensureArchitectureFontsLoaded();
    const card = createArchitectureCard({
      ...cardConfig,
      nodeId: undefined,
      chips: parsedChips(),
      left: canvas.getWidth() / 2 - Number(cardConfig.width || 290) / 2,
      top: canvas.getHeight() / 2 - Number(cardConfig.height || 142) / 2,
    });
    canvas.add(card);
    canvas.setActiveObject(card);
    canvas.requestRenderAll();
    setSelectedObject(card);
    saveHistory();
    notify('Architecture card added.');
  };

  const updateSelectedCard = () => {
    if (!canvas || !selectedCard) return;
    const next = replaceArchitectureCard(canvas, selectedCard, {
      ...cardConfig,
      chips: parsedChips(),
    });
    if (next) setSelectedObject(next);
    saveHistory();
    notify('Architecture card updated.');
  };

  const addConnector = () => {
    if (!canvas || !connectorConfig.sourceNodeId || !connectorConfig.targetNodeId) return;
    if (connectorConfig.sourceNodeId === connectorConfig.targetNodeId) {
      notify('Choose two different cards.');
      return;
    }
    const objects = createDiagramConnector(canvas, {
      ...connectorConfig,
      connectorId: undefined,
    });
    const firstCardIndex = canvas.getObjects().findIndex((object) => (
      object.get('teckstudioObjectType' as keyof fabric.Object) === 'architectureNode'
    ));
    const insertionStart = Math.max(0, firstCardIndex);
    objects.forEach((object, index) => canvas.moveTo(object, insertionStart + index));
    if (objects[0]) {
      canvas.setActiveObject(objects[0]);
      setSelectedObject(objects[0]);
    }
    canvas.requestRenderAll();
    saveHistory();
    notify('Attached connector added.');
  };

  const updateSelectedConnector = () => {
    if (!canvas || !selectedConnectorPath) return;
    updateDiagramConnectorConfig(canvas, selectedConnectorPath, connectorConfig);
    setSelectedObject(selectedConnectorPath);
    saveHistory();
    getConnectorAnimationManager(canvas)?.playAll();
    notify('Connector routing and label updated.');
  };

  const startCanvasConnectorMode = () => {
    if (!canvas || nodes.length < 2) {
      notify('Add at least two architecture cards first.');
      return;
    }
    window.dispatchEvent(new CustomEvent('teckstudio:start-connector-mode', {
      detail: { config: connectorConfig },
    }));
    notify('Connector mode active: click a source anchor, then a target anchor.');
  };

  const addTracker = () => {
    if (!canvas) return;
    const labels = stageLabels.split(',').map((value) => value.trim()).filter(Boolean).slice(0, 8);
    const colors = stageColors.split(',').map((value) => value.trim()).filter(Boolean);
    const tracker = createStageTracker({
      labels,
      colors,
      left: canvas.getWidth() * 0.08,
      top: canvas.getHeight() * 0.16,
      width: stageOrientation === 'horizontal' ? canvas.getWidth() * 0.84 : canvas.getHeight() * 0.6,
      orientation: stageOrientation,
      circleSize: stageCircleSize,
      lineWidth: stageLineWidth,
      glow: stageGlow,
      arrows: stageArrows,
    });
    canvas.add(tracker);
    canvas.setActiveObject(tracker);
    canvas.requestRenderAll();
    setSelectedObject(tracker);
    saveHistory();
    notify('Editable stage tracker added.');
  };

  const updateGrid = () => {
    if (!canvas) return;
    const existing = canvas.getObjects().find((object) => (
      object.get('teckstudioObjectType' as keyof fabric.Object) === 'technicalGrid'
    ));
    const index = existing ? canvas.getObjects().indexOf(existing) : 0;
    if (existing) canvas.remove(existing);
    const grid = createTechnicalGrid(canvas.getWidth(), canvas.getHeight(), {
      horizontalSpacing: gridHorizontal,
      verticalSpacing: gridVertical,
      opacity: gridOpacity,
      thickness: gridThickness,
      color: gridColor,
      majorEvery: gridMajorEvery,
    });
    canvas.insertAt(grid, Math.max(0, index), false);
    updateAllDiagramConnectors(canvas);
    canvas.requestRenderAll();
    saveHistory();
    notify('Exportable technical grid updated.');
  };

  const setCard = <K extends keyof ArchitectureCardConfig>(key: K, value: ArchitectureCardConfig[K]) => {
    setCardConfig((current) => ({ ...current, [key]: value }));
  };
  const setConnector = <K extends keyof DiagramConnectorConfig>(key: K, value: DiagramConnectorConfig[K]) => {
    setConnectorConfig((current) => ({ ...current, [key]: value }));
  };
  const animationConfig = normalizeConnectorAnimation(connectorConfig.animation, connectorConfig.color);
  const setAnimation = <K extends keyof DiagramConnectorAnimationConfig>(
    key: K,
    value: DiagramConnectorAnimationConfig[K],
  ) => {
    setConnectorConfig((current) => ({
      ...current,
      animation: {
        ...normalizeConnectorAnimation(current.animation, current.color),
        [key]: value,
      },
    }));
  };
  const applyAnimationPreset = (presetId: DiagramConnectorAnimationPresetId) => {
    const preset = getConnectorAnimationPreset(presetId);
    if (!preset) return;
    setConnectorConfig((current) => ({
      ...current,
      ...preset.connector,
      sourceNodeId: current.sourceNodeId,
      targetNodeId: current.targetNodeId,
      sourceAnchor: current.sourceAnchor,
      targetAnchor: current.targetAnchor,
      routing: current.routing,
      animation: {
        ...normalizeConnectorAnimation(current.animation, current.color),
        ...preset.connector.animation,
        enabled: true,
      },
    }));
    notify(`${preset.name} preset loaded.`);
  };
  const animationManager = getConnectorAnimationManager(canvas);

  const cardButtonLabel = selectedCard ? 'Update Selected Card' : 'Add Architecture Card';
  const connectorButtonLabel = selectedConnectorPath ? 'Update Selected Connector' : 'Add Attached Connector';

  return (
    <div className="space-y-3 pb-8">
      <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-zinc-950 to-emerald-500/10 p-3">
        <div className="flex items-center gap-2 text-xs font-black text-zinc-100">
          <Network className="h-4 w-4 text-cyan-400" />
          {AI_ARCHITECTURE_TEMPLATE_NAME}
        </div>
        <p className="mt-1 text-[9px] text-zinc-500">Technology · System Design · AI · 1080 × 1350</p>
        <button
          type="button"
          onClick={applyTemplate}
          className="mt-3 w-full rounded-lg bg-cyan-500 px-3 py-2 text-[10px] font-black text-zinc-950 hover:bg-cyan-400"
        >
          Apply Editable Architecture Template
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 text-[9px] font-semibold text-emerald-200">
          {message}
        </div>
      )}

      <Section icon={<Activity className="h-3.5 w-3.5 text-cyan-400" />} title="Architecture Palette">
        <div className="grid grid-cols-7 gap-1">
          {Object.entries(AI_ARCHITECTURE_PALETTE).map(([name, color]) => (
            <button
              key={name}
              type="button"
              title={name}
              aria-label={`Use ${name} accent`}
              onClick={() => {
                setCard('accentColor', color);
                setCard('borderColor', color);
                setCard('statusColor', color);
                setConnector('color', color);
                setConnector('labelColor', color);
              }}
              className="aspect-square rounded border border-white/10"
              style={{ background: color }}
            />
          ))}
        </div>
      </Section>

      <Section icon={<Box className="h-3.5 w-3.5 text-emerald-400" />} title="Architecture Card">
        <label className={labelClass}>
          <span>Card title</span>
          <input value={cardConfig.title || ''} onChange={(event) => setCard('title', event.target.value)} className={inputClass} />
        </label>
        <label className={labelClass}>
          <span>Card subtitle</span>
          <input value={cardConfig.subtitle || ''} onChange={(event) => setCard('subtitle', event.target.value)} className={inputClass} />
        </label>
        <label className={labelClass}>
          <span>Vector icon</span>
          <select value={cardConfig.icon} onChange={(event) => setCard('icon', event.target.value as ArchitectureIconName)} className={inputClass}>
            {ICON_OPTIONS.map((icon) => <option key={icon.value} value={icon.value}>{icon.label}</option>)}
          </select>
        </label>
        <label className={labelClass}>
          <span>Chips, comma separated</span>
          <input value={chipText} onChange={(event) => setChipText(event.target.value)} className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <ColorInput label="Background" value={String(cardConfig.backgroundColor)} onChange={(value) => setCard('backgroundColor', value)} />
          <ColorInput label="Full border" value={String(cardConfig.borderColor)} onChange={(value) => setCard('borderColor', value)} />
          <ColorInput label="Side accent" value={String(cardConfig.accentColor)} onChange={(value) => setCard('accentColor', value)} />
          <ColorInput label="Status dot" value={String(cardConfig.statusColor)} onChange={(value) => setCard('statusColor', value)} />
          <NumberInput label="Width" value={Number(cardConfig.width)} min={220} onChange={(value) => setCard('width', value)} />
          <NumberInput label="Height" value={Number(cardConfig.height)} min={110} onChange={(value) => setCard('height', value)} />
          <NumberInput label="Horizontal padding" value={Number(cardConfig.paddingX)} min={8} onChange={(value) => setCard('paddingX', value)} />
          <NumberInput label="Vertical padding" value={Number(cardConfig.paddingY)} min={8} onChange={(value) => setCard('paddingY', value)} />
          <NumberInput label="Icon size" value={Number(cardConfig.iconSize)} min={16} onChange={(value) => setCard('iconSize', value)} />
          <NumberInput label="Icon gap" value={Number(cardConfig.iconGap)} min={4} onChange={(value) => setCard('iconGap', value)} />
          <NumberInput label="Title size" value={Number(cardConfig.titleFontSize)} min={10} onChange={(value) => setCard('titleFontSize', value)} />
          <NumberInput label="Subtitle size" value={Number(cardConfig.subtitleFontSize)} min={8} onChange={(value) => setCard('subtitleFontSize', value)} />
          <NumberInput label="Border width" value={Number(cardConfig.borderWidth)} min={1} max={12} onChange={(value) => setCard('borderWidth', value)} />
          <NumberInput label="Accent width" value={Number(cardConfig.accentWidth ?? 7)} min={0} max={30} onChange={(value) => setCard('accentWidth', value)} />
          <NumberInput label="Corner radius" value={Number(cardConfig.cornerRadius)} min={0} onChange={(value) => setCard('cornerRadius', value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-[9px] text-zinc-400">
            <input type="checkbox" checked={Boolean(cardConfig.autoSize)} onChange={(event) => setCard('autoSize', event.target.checked)} />
            Auto width
          </label>
          <label className="flex items-center gap-2 text-[9px] text-zinc-400">
            <input type="checkbox" checked={Boolean(cardConfig.glow)} onChange={(event) => setCard('glow', event.target.checked)} />
            Border / dot glow
          </label>
          <label className="flex items-center gap-2 text-[9px] text-zinc-400">
            <input type="checkbox" checked={cardConfig.accentVisible !== false} onChange={(event) => setCard('accentVisible', event.target.checked)} />
            Show accent bar
          </label>
          <label className="flex items-center gap-2 text-[9px] text-zinc-400">
            <input type="checkbox" checked={cardConfig.statusVisible !== false} onChange={(event) => setCard('statusVisible', event.target.checked)} />
            Show status dot
          </label>
        </div>
        <button
          type="button"
          onClick={selectedCard ? updateSelectedCard : addCard}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black text-white hover:bg-emerald-500"
        >
          <Plus className="h-3 w-3" />
          {cardButtonLabel}
        </button>
        <p className="text-[8px] leading-relaxed text-zinc-600">
          Cards use locked group scaling to prevent stretched text. Change dimensions here, or ungroup for full child-level editing.
        </p>
      </Section>

      <Section icon={<Cable className="h-3.5 w-3.5 text-orange-400" />} title="Attached Connector">
        {nodes.length < 2 ? (
          <p className="text-[9px] text-zinc-500">Add at least two architecture cards first.</p>
        ) : (
          <>
            <button
              type="button"
              onClick={startCanvasConnectorMode}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-[10px] font-black text-orange-200 hover:bg-orange-500/20"
            >
              <Route className="h-3.5 w-3.5" />
              Connect Cards by Clicking Anchors
            </button>
            <p className="text-[8px] leading-relaxed text-zinc-600">
              Anchor points are editor-only and never appear in saved projects or exports.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className={labelClass}>
                <span>Source card</span>
                <select value={connectorConfig.sourceNodeId} onChange={(event) => setConnector('sourceNodeId', event.target.value)} className={inputClass}>
                  {nodes.map((node) => {
                    const config = node.get('architectureNodeConfig' as keyof fabric.Object) as ArchitectureCardConfig;
                    const id = String(node.get('architectureNodeId' as keyof fabric.Object));
                    return <option key={id} value={id}>{config?.title || node.name}</option>;
                  })}
                </select>
              </label>
              <label className={labelClass}>
                <span>Target card</span>
                <select value={connectorConfig.targetNodeId} onChange={(event) => setConnector('targetNodeId', event.target.value)} className={inputClass}>
                  {nodes.map((node) => {
                    const config = node.get('architectureNodeConfig' as keyof fabric.Object) as ArchitectureCardConfig;
                    const id = String(node.get('architectureNodeId' as keyof fabric.Object));
                    return <option key={id} value={id}>{config?.title || node.name}</option>;
                  })}
                </select>
              </label>
              <label className={labelClass}>
                <span>Source anchor</span>
                <select value={connectorConfig.sourceAnchor} onChange={(event) => setConnector('sourceAnchor', event.target.value as ConnectorAnchor)} className={inputClass}>
                  {ANCHORS.map((anchor) => <option key={anchor} value={anchor}>{anchor}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                <span>Target anchor</span>
                <select value={connectorConfig.targetAnchor} onChange={(event) => setConnector('targetAnchor', event.target.value as ConnectorAnchor)} className={inputClass}>
                  {ANCHORS.map((anchor) => <option key={anchor} value={anchor}>{anchor}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                <span>Routing</span>
                <select value={connectorConfig.routing} onChange={(event) => setConnector('routing', event.target.value as DiagramConnectorRouting)} className={inputClass}>
                  <option value="straight">Straight</option>
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                  <option value="elbow">Elbow</option>
                  <option value="curved">Curved</option>
                  <option value="bezier">Bezier</option>
                </select>
              </label>
              <label className={labelClass}>
                <span>Line style</span>
                <select value={connectorConfig.style} onChange={(event) => setConnector('style', event.target.value as DiagramConnectorStyle)} className={inputClass}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </label>
              <label className={labelClass}>
                <span>Start arrow</span>
                <select value={connectorConfig.startArrow} onChange={(event) => setConnector('startArrow', event.target.value as DiagramArrowStyle)} className={inputClass}>
                  <option value="none">None</option>
                  <option value="arrow">Arrow</option>
                  <option value="open-arrow">Open arrow</option>
                  <option value="circle">Circle</option>
                  <option value="diamond">Diamond</option>
                </select>
              </label>
              <label className={labelClass}>
                <span>End arrow</span>
                <select value={connectorConfig.endArrow} onChange={(event) => setConnector('endArrow', event.target.value as DiagramArrowStyle)} className={inputClass}>
                  <option value="none">None</option>
                  <option value="arrow">Arrow</option>
                  <option value="open-arrow">Open arrow</option>
                  <option value="circle">Circle</option>
                  <option value="diamond">Diamond</option>
                </select>
              </label>
            </div>
            <label className={labelClass}>
              <span>Connector label</span>
              <input value={connectorConfig.label} onChange={(event) => setConnector('label', event.target.value)} className={inputClass} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <ColorInput label="Line color" value={String(connectorConfig.color)} onChange={(value) => setConnector('color', value)} />
              <ColorInput label="Label color" value={String(connectorConfig.labelColor)} onChange={(value) => setConnector('labelColor', value)} />
              <NumberInput label="Line width" value={Number(connectorConfig.width)} min={1} max={16} step={0.5} onChange={(value) => setConnector('width', value)} />
              <NumberInput label="Arrow size" value={Number(connectorConfig.arrowSize)} min={6} max={40} onChange={(value) => setConnector('arrowSize', value)} />
              <NumberInput label="Dash length" value={Number(connectorConfig.dashLength)} min={1} onChange={(value) => setConnector('dashLength', value)} />
              <NumberInput label="Dash gap" value={Number(connectorConfig.dashGap)} min={1} onChange={(value) => setConnector('dashGap', value)} />
              <NumberInput label="Bend offset" value={Number(connectorConfig.bendOffset)} min={-400} max={400} onChange={(value) => setConnector('bendOffset', value)} />
              <NumberInput label="Curvature" value={Number(connectorConfig.curvature)} min={0.1} max={1} step={0.05} onChange={(value) => setConnector('curvature', value)} />
              <NumberInput label="Label position" value={Number(connectorConfig.labelPosition)} min={0.05} max={0.95} step={0.05} onChange={(value) => setConnector('labelPosition', value)} />
              <NumberInput label="Label offset" value={Number(connectorConfig.labelOffset)} min={-100} max={100} onChange={(value) => setConnector('labelOffset', value)} />
            </div>
            <label className="flex items-center gap-2 text-[9px] text-zinc-400">
              <input type="checkbox" checked={Boolean(connectorConfig.glow)} onChange={(event) => setConnector('glow', event.target.checked)} />
              Subtle connector glow
            </label>
            <div className="space-y-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300">Animated Flow</span>
                <label className="flex items-center gap-1.5 text-[9px] text-zinc-400">
                  <input
                    type="checkbox"
                    checked={animationConfig.enabled}
                    onChange={(event) => setAnimation('enabled', event.target.checked)}
                  />
                  On
                </label>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {CONNECTOR_ANIMATION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyAnimationPreset(preset.id)}
                    className="rounded-md border border-emerald-500/20 bg-zinc-950 px-2 py-1.5 text-left text-[8px] font-semibold text-zinc-400 hover:border-emerald-400/60 hover:text-emerald-200"
                    title={preset.description}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className={labelClass}>
                  <span>Animation type</span>
                  <select value={animationConfig.type} onChange={(event) => setAnimation('type', event.target.value as DiagramConnectorAnimationType)} className={inputClass}>
                    <option value="moving-dashes">Moving dashes</option>
                    <option value="moving-dots">Moving dots</option>
                    <option value="travelling-pulse">Travelling pulse</option>
                    <option value="travelling-arrowhead">Travelling arrowhead</option>
                    <option value="flow-trail">Flow trail</option>
                  </select>
                </label>
                <label className={labelClass}>
                  <span>Direction</span>
                  <select value={animationConfig.direction} onChange={(event) => setAnimation('direction', event.target.value as DiagramConnectorAnimationDirection)} className={inputClass}>
                    <option value="forward">Source → target</option>
                    <option value="reverse">Target → source</option>
                    <option value="bidirectional">Bidirectional</option>
                    <option value="alternating">Alternating</option>
                    <option value="forward-once">Forward once</option>
                    <option value="reverse-once">Reverse once</option>
                  </select>
                </label>
                <NumberInput label="Speed" value={animationConfig.speed} min={0.1} max={8} step={0.1} onChange={(value) => setAnimation('speed', value)} />
                <NumberInput label="Duration (ms)" value={animationConfig.duration} min={200} step={100} onChange={(value) => setAnimation('duration', value)} />
                <NumberInput label="Start delay (ms)" value={animationConfig.delay} min={0} step={100} onChange={(value) => setAnimation('delay', value)} />
                <NumberInput label="Repeat delay (ms)" value={animationConfig.repeatDelay} min={0} step={100} onChange={(value) => setAnimation('repeatDelay', value)} />
                <NumberInput label="Particle size" value={animationConfig.particleSize} min={1} max={30} onChange={(value) => setAnimation('particleSize', value)} />
                <NumberInput label="Particle count" value={animationConfig.particleCount} min={1} max={24} onChange={(value) => setAnimation('particleCount', value)} />
                <NumberInput label="Dot spacing" value={animationConfig.dotSpacing} min={4} onChange={(value) => setAnimation('dotSpacing', value)} />
                <NumberInput label="Pulse size" value={animationConfig.pulseSize} min={1} max={40} onChange={(value) => setAnimation('pulseSize', value)} />
                <NumberInput label="Trail length" value={animationConfig.trailLength} min={0.03} max={0.75} step={0.01} onChange={(value) => setAnimation('trailLength', value)} />
                <NumberInput label="Dash length" value={animationConfig.dashLength} min={1} onChange={(value) => setAnimation('dashLength', value)} />
                <NumberInput label="Dash gap" value={animationConfig.dashGap} min={1} onChange={(value) => setAnimation('dashGap', value)} />
                <NumberInput label="Glow strength" value={animationConfig.glowStrength} min={0} max={40} onChange={(value) => setAnimation('glowStrength', value)} />
                <NumberInput label="Sequence order" value={animationConfig.sequenceOrder} min={0} max={50} onChange={(value) => setAnimation('sequenceOrder', value)} />
                <NumberInput label="Sequence delay (ms)" value={animationConfig.startDelay} min={0} step={100} onChange={(value) => setAnimation('startDelay', value)} />
                <NumberInput label="Arrowhead size" value={animationConfig.arrowheadSize} min={4} max={40} onChange={(value) => setAnimation('arrowheadSize', value)} />
                <NumberInput label="Pulse scale" value={animationConfig.pulseScale} min={1} max={4} step={0.1} onChange={(value) => setAnimation('pulseScale', value)} />
                <NumberInput label="Pulse duration" value={animationConfig.pulseDuration} min={150} step={50} onChange={(value) => setAnimation('pulseDuration', value)} />
                <NumberInput label="Flow opacity" value={animationConfig.opacity} min={0.05} max={1} step={0.05} onChange={(value) => setAnimation('opacity', value)} />
                <ColorInput label="Flow color" value={animationConfig.flowColor} onChange={(value) => setAnimation('flowColor', value)} />
                <ColorInput label="Base line color" value={animationConfig.baseColor} onChange={(value) => setAnimation('baseColor', value)} />
                <ColorInput label="Glow color" value={animationConfig.glowColor} onChange={(value) => setAnimation('glowColor', value)} />
                <label className={labelClass}>
                  <span>Moving arrow style</span>
                  <select value={animationConfig.arrowheadStyle} onChange={(event) => setAnimation('arrowheadStyle', event.target.value as DiagramArrowStyle)} className={inputClass}>
                    <option value="arrow">Filled arrow</option>
                    <option value="open-arrow">Open arrow</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[9px] text-zinc-400">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={animationConfig.loop} onChange={(event) => setAnimation('loop', event.target.checked)} />
                  Loop
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={animationConfig.glowEnabled} onChange={(event) => setAnimation('glowEnabled', event.target.checked)} />
                  Particle glow
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={animationConfig.sourcePulse} onChange={(event) => setAnimation('sourcePulse', event.target.checked)} />
                  Source pulse
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={animationConfig.targetPulse} onChange={(event) => setAnimation('targetPulse', event.target.checked)} />
                  Target pulse
                </label>
              </div>
              <div className="grid grid-cols-5 gap-1">
                <button type="button" title="Play all" onClick={() => animationManager?.playAll()} className="rounded-md bg-emerald-600 p-1.5 text-white"><Play className="mx-auto h-3 w-3" /></button>
                <button type="button" title="Pause all" onClick={() => animationManager?.pauseAll()} className="rounded-md bg-zinc-800 p-1.5 text-zinc-300"><Pause className="mx-auto h-3 w-3" /></button>
                <button type="button" title="Restart all" onClick={() => animationManager?.restartAll()} className="rounded-md bg-zinc-800 p-1.5 text-zinc-300"><RotateCcw className="mx-auto h-3 w-3" /></button>
                <button type="button" title="Preview selected" onClick={() => animationManager?.previewSelected(selectedConnectorPath)} className="rounded-md bg-cyan-700 p-1.5 text-white"><Play className="mx-auto h-3 w-3" /></button>
                <button type="button" title="Stop selected" onClick={() => animationManager?.stopSelected(selectedConnectorPath)} className="rounded-md bg-rose-900 p-1.5 text-rose-200"><Square className="mx-auto h-3 w-3" /></button>
              </div>
              <label className="flex items-center gap-2 text-[9px] text-zinc-400">
                <input
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={(event) => {
                    setReduceMotion(event.target.checked);
                    animationManager?.setReducedMotion(event.target.checked);
                  }}
                />
                Reduced motion / static preview
              </label>
              <p className="text-[8px] leading-relaxed text-zinc-600">
                Playback frames never enter history. Apply the connector update below to save configuration changes.
              </p>
            </div>
            <button
              type="button"
              onClick={selectedConnectorPath ? updateSelectedConnector : addConnector}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-[10px] font-black text-white hover:bg-orange-500 disabled:opacity-40"
              disabled={nodes.length < 2}
            >
              <Route className="h-3 w-3" />
              {connectorButtonLabel}
            </button>
            <p className="text-[8px] leading-relaxed text-zinc-600">
              Bend offset provides persistent manual routing. Attached endpoints and labels update whenever either card moves.
            </p>
          </>
        )}
      </Section>

      <Section icon={<CircleDot className="h-3.5 w-3.5 text-yellow-400" />} title="Stage Tracker">
        <label className={labelClass}>
          <span>Stages, comma separated</span>
          <input value={stageLabels} onChange={(event) => setStageLabels(event.target.value)} className={inputClass} />
        </label>
        <label className={labelClass}>
          <span>Stage colors</span>
          <input value={stageColors} onChange={(event) => setStageColors(event.target.value)} className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="Circle size" value={stageCircleSize} min={6} max={40} onChange={setStageCircleSize} />
          <NumberInput label="Line width" value={stageLineWidth} min={1} max={12} onChange={setStageLineWidth} />
        </div>
        <label className={labelClass}>
          <span>Orientation</span>
          <select value={stageOrientation} onChange={(event) => setStageOrientation(event.target.value as 'horizontal' | 'vertical')} className={inputClass}>
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-[9px] text-zinc-400">
            <input type="checkbox" checked={stageGlow} onChange={(event) => setStageGlow(event.target.checked)} />
            Node glow
          </label>
          <label className="flex items-center gap-2 text-[9px] text-zinc-400">
            <input type="checkbox" checked={stageArrows} onChange={(event) => setStageArrows(event.target.checked)} />
            Show arrows
          </label>
        </div>
        <button type="button" onClick={addTracker} className="w-full rounded-lg bg-yellow-500 px-3 py-2 text-[10px] font-black text-zinc-950 hover:bg-yellow-400">
          Add Editable Stage Tracker
        </button>
      </Section>

      <Section icon={<Grid3x3 className="h-3.5 w-3.5 text-blue-400" />} title="Exportable Technical Grid">
        <div className="grid grid-cols-2 gap-2">
          <NumberInput label="Horizontal spacing" value={gridHorizontal} min={20} onChange={setGridHorizontal} />
          <NumberInput label="Vertical spacing" value={gridVertical} min={20} onChange={setGridVertical} />
          <NumberInput label="Opacity" value={gridOpacity} min={0.01} max={1} step={0.01} onChange={setGridOpacity} />
          <NumberInput label="Thickness" value={gridThickness} min={0.25} max={8} step={0.25} onChange={setGridThickness} />
          <NumberInput label="Major every" value={gridMajorEvery} min={1} max={12} onChange={setGridMajorEvery} />
          <ColorInput label="Grid color" value={gridColor} onChange={setGridColor} />
        </div>
        <button type="button" onClick={updateGrid} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-black text-white hover:bg-blue-500">
          <Sparkles className="h-3 w-3" />
          Add / Update Technical Grid
        </button>
      </Section>
    </div>
  );
};

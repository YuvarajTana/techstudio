import React, { useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { useEditorStore } from '../../store/useEditorStore';
import type { FabricObjectAnimationType } from '../../types/timeline';
import type { DiagramConnectorAnimationConfig, DiagramConnectorAnimationDirection } from '../../utils/architectureDiagramTypes';
import {
  EDITOR_ANIMATION_CATEGORIES,
  EDITOR_ANIMATIONS_BY_CATEGORY,
  applyAnimationToSelectedObject,
} from '../../utils/editorAnimationLibrary';
import {
  EyeOff,
  Eye,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  ZoomIn,
  RotateCw,
  Expand,
  ShieldAlert,
} from 'lucide-react';

interface AnimationDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  run: (obj: fabric.Object, canvas: fabric.Canvas) => void;
}

const OBJECT_ANIMATION_GROUPS: Array<{
  label: string;
  options: Array<{ value: FabricObjectAnimationType | 'none'; label: string }>;
}> = EDITOR_ANIMATION_CATEGORIES
  .map((category) => ({
    label: category.label,
    options: EDITOR_ANIMATIONS_BY_CATEGORY[category.id]
      .filter((item) => item.mode !== 'insert')
      .map((item) => ({ value: item.type, label: item.name })),
  }))
  .filter((group) => group.options.length > 0)
  .map((group, index) => ({
    ...group,
    options: index === 0 ? [{ value: 'none', label: 'None' }, ...group.options] : group.options,
  }));

const CONNECTOR_ANIMATION_GROUPS: Array<{
  label: 'Connector Technical';
  options: Array<{ value: DiagramConnectorAnimationConfig['type'] | 'none'; label: string }>;
}> = [
  {
    label: 'Connector Technical',
    options: [
      { value: 'none', label: 'None' },
      { value: 'draw-in', label: 'Arrow Draw In' },
      { value: 'draw-in', label: 'Connector Draw In' },
      { value: 'travelling-pulse', label: 'Traveling Dot' },
      { value: 'moving-dots', label: 'Flow' },
      { value: 'moving-dashes', label: 'Dash Flow' },
      { value: 'travelling-arrowhead', label: 'Traveling Arrow' },
      { value: 'flow-trail', label: 'Flow Trail' },
      { value: 'travelling-pulse', label: 'Pulse' },
    ],
  },
];

const CONNECTOR_DIRECTIONS: Array<{ value: DiagramConnectorAnimationDirection; label: string }> = [
  { value: 'forward', label: 'Left → Right / Forward' },
  { value: 'reverse', label: 'Right → Left / Reverse' },
  { value: 'forward-once', label: 'Forward Once' },
  { value: 'reverse-once', label: 'Reverse Once' },
  { value: 'bidirectional', label: 'Bidirectional' },
  { value: 'alternating', label: 'Alternating' },
];

const OBJECT_DIRECTIONS: Array<{ value: string; label: string }> = [
  { value: 'right', label: 'Left → Right' },
  { value: 'left', label: 'Right → Left' },
  { value: 'up', label: 'Bottom → Top' },
  { value: 'down', label: 'Top → Bottom' },
];

const CORE_ANIMATIONS: Array<{ value: FabricObjectAnimationType; connectorValue?: DiagramConnectorAnimationConfig['type']; label: string }> = [
  { value: 'fade-in', label: 'Fade In' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'scale-in', label: 'Scale In' },
  { value: 'typewriter', label: 'Typewriter' },
  { value: 'draw', connectorValue: 'draw-in', label: 'Draw In' },
  { value: 'pulse', connectorValue: 'travelling-pulse', label: 'Pulse' },
];

const EASING_OPTIONS = ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'ease-out-back'] as const;

const objectValue = (object: fabric.Object, key: string) => object.get(key as keyof fabric.Object) as unknown;
const isTextObject = (object: fabric.Object): object is fabric.Textbox => (
  ['text', 'i-text', 'textbox'].includes(object.type || '')
);
const isConnectorObject = (object: fabric.Object) => (
  objectValue(object, 'teckstudioObjectType') === 'diagramArrow' ||
  objectValue(object, 'teckstudioObjectType') === 'diagramConnectorPath'
);

const readNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const MOVING_ANIMATION_TYPES = new Set([
  'move-left-right',
  'move-right-left',
  'move-top-bottom',
  'move-bottom-top',
  'move-diagonal-down-right',
  'move-diagonal-up-right',
  'move-diagonal-down-left',
  'move-diagonal-up-left',
  'slide-across',
  'float-across',
  'moving-drift',
  'bounce-move',
  'zig-zag',
  'curve-path',
  'arc-move',
  'wave-move',
  'circle-move',
  'orbit',
  'figure-8',
  'path-follow',
  'arrow-travel',
  'continuous-scroll',
]);

const isMovingAnimationType = (value: string) => (
  MOVING_ANIMATION_TYPES.has(value)
  || value === 'motion-path'
  || value === 'traveling-dot'
);

export const AnimationPanel: React.FC = () => {
  const { canvas, selectedObject, selectedObjectId, saveHistory, setSelectedObject, selectionAnimationVersion, bumpSelectionAnimation } = useEditorStore();
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationType, setAnimationType] = useState<string>('none');
  const [startMs, setStartMs] = useState(0);
  const [durationMs, setDurationMs] = useState(800);
  const [delayMs, setDelayMs] = useState(0);
  const [easing, setEasing] = useState<typeof EASING_OPTIONS[number]>('ease-out');
  const [direction, setDirection] = useState<string>('forward');
  const [loop, setLoop] = useState(false);
  const [animationParams, setAnimationParams] = useState<Record<string, unknown>>({});
  const [activeCategoryTab, setActiveCategoryTab] = useState<'entrance' | 'emphasis' | 'exit' | 'technical' | 'all'>('all');

  const selectedIsConnector = selectedObject ? isConnectorObject(selectedObject) : false;

  useEffect(() => {
    if (!selectedObject) return;

    const syncAnimationState = () => {
      if (isConnectorObject(selectedObject)) {
        const config = (
          objectValue(selectedObject, 'diagramArrowConfig') ||
          objectValue(selectedObject, 'diagramConnectorConfig') ||
          {}
        ) as { animation?: DiagramConnectorAnimationConfig };
        const animation = config.animation || {};
        setAnimationType(animation.enabled === true ? String(animation.type || 'moving-dashes') : 'none');
        setStartMs(readNumber(animation.delay, 0));
        setDurationMs(readNumber(animation.duration, 1200));
        setDelayMs(readNumber(animation.startDelay, 0));
        setEasing(animation.easing || 'linear');
        setDirection(animation.direction || 'forward');
        setLoop(animation.loop !== false && animation.direction !== 'forward-once' && animation.direction !== 'reverse-once');
        return;
      }
      const configured = objectValue(selectedObject, 'objectAnimations') as Array<Record<string, unknown>> | undefined;
      const legacy = objectValue(selectedObject, 'animationConfig') as Record<string, unknown> | undefined;
      const first = configured?.[0] || legacy || {};
      const nextType = String(first.type || first.animationType || 'none');
      setAnimationType(nextType);
      setStartMs(readNumber(first.startMs, 0));
      setDurationMs(readNumber(first.durationMs || first.duration, 800));
      setDelayMs(readNumber(first.delayMs || first.delay, 0));
      setEasing((first.easing as typeof EASING_OPTIONS[number]) || 'ease-out');
      setDirection((first.direction as DiagramConnectorAnimationDirection) || 'forward');
      setLoop(first.loop === true);
      setAnimationParams((first.params as Record<string, unknown>) || {});
      console.log('[ANIMATION UI] propertiesPanelAnimation =', nextType);
    };

    syncAnimationState();

    if (canvas) {
      canvas.on('object:modified', syncAnimationState);
      canvas.on('selection:created', syncAnimationState);
      canvas.on('selection:updated', syncAnimationState);
    }
    const handleCustomApp = () => syncAnimationState();
    window.addEventListener('teckstudio:animation-applied', handleCustomApp);

    return () => {
      if (canvas) {
        canvas.off('object:modified', syncAnimationState);
        canvas.off('selection:created', syncAnimationState);
        canvas.off('selection:updated', syncAnimationState);
      }
      window.removeEventListener('teckstudio:animation-applied', handleCustomApp);
    };
  }, [canvas, selectedObject, selectionAnimationVersion]);

  if (!canvas) return null;

  if (!selectedObject) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
        <h3 className="mb-1 text-[13px] font-semibold tracking-wide text-zinc-300">Animation</h3>
        <p className="mb-3 text-[10px] leading-4 text-zinc-500">Select a canvas object to enable timeline animations.</p>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Core Animations</div>
        <div className="grid grid-cols-2 gap-2 opacity-50">
          {CORE_ANIMATIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-[10px] font-semibold text-zinc-500"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const commitTimelineAnimation = (patch: Partial<{
    animationType: string;
    startMs: number;
    durationMs: number;
    delayMs: number;
    easing: typeof EASING_OPTIONS[number];
    direction: string;
    loop: boolean;
    params: Record<string, unknown>;
  }>) => {
    const nextType = patch.animationType !== undefined ? patch.animationType : animationType;
    if (patch.animationType !== undefined && !selectedIsConnector) {
      console.log('[ANIMATION CLICK] commitTimelineAnimation type:', nextType);
      applyAnimationToSelectedObject({
        canvas,
        selectedObject,
        selectedObjectId,
        animationId: nextType,
        saveHistory,
        setSelectedObject,
      });
      bumpSelectionAnimation();
      return;
    }

    const next = {
      animationType,
      startMs,
      durationMs,
      delayMs,
      easing,
      direction,
      loop,
      params: animationParams,
      ...patch,
    };
    setAnimationType(next.animationType);
    setStartMs(next.startMs);
    setDurationMs(next.durationMs);
    setDelayMs(next.delayMs);
    setEasing(next.easing);
    setDirection(next.direction);
    setLoop(next.loop);
    setAnimationParams(next.params);

    if (selectedIsConnector) {
      const configKey = objectValue(selectedObject, 'teckstudioObjectType') === 'diagramConnectorPath'
        ? 'diagramConnectorConfig'
        : 'diagramArrowConfig';
      const currentConfig = (objectValue(selectedObject, configKey) || {}) as Record<string, unknown>;
      const currentAnimation = (currentConfig.animation || {}) as DiagramConnectorAnimationConfig;
      const connectorType = next.animationType === 'none' ? currentAnimation.type || 'moving-dashes' : next.animationType;
      const connectorAnimation: DiagramConnectorAnimationConfig = {
        ...currentAnimation,
        enabled: next.animationType !== 'none',
        type: connectorType as DiagramConnectorAnimationConfig['type'],
        direction: next.direction as DiagramConnectorAnimationDirection,
        duration: Math.max(100, next.durationMs),
        delay: Math.max(0, next.startMs),
        startDelay: Math.max(0, next.delayMs),
        easing: next.easing,
        loop: next.loop,
      };
      selectedObject.set({
        [configKey]: {
          ...currentConfig,
          animation: connectorAnimation,
        },
      } as Record<string, unknown>);
    } else if (next.animationType === 'none') {
      selectedObject.set({
        objectAnimations: [],
        animationConfig: { format: 'fabric-keyframe', animationType: 'none' },
      } as Record<string, unknown>);
    } else {
      const persisted = {
        id: crypto.randomUUID(),
        type: next.animationType as FabricObjectAnimationType,
        startMs: Math.max(0, next.startMs),
        durationMs: Math.max(100, next.durationMs),
        delayMs: Math.max(0, next.delayMs),
        easing: next.easing,
        loop: next.loop,
        direction: next.direction,
        params: next.params,
      };
      selectedObject.set({
        objectAnimations: [persisted],
        animationConfig: {
          format: 'fabric-keyframe',
        animationType: persisted.type,
        startMs: persisted.startMs,
        durationMs: persisted.durationMs,
        delayMs: persisted.delayMs,
        easing: persisted.easing,
        loop: persisted.loop,
        direction: persisted.direction,
        params: persisted.params,
        fullText: isTextObject(selectedObject) ? selectedObject.text || '' : undefined,
      },
    } as Record<string, unknown>);
    }
    selectedObject.setCoords();
    canvas.requestRenderAll();
    bumpSelectionAnimation();
    saveHistory();
  };

  const applyCoreAnimation = (option: typeof CORE_ANIMATIONS[number]) => {
    if (!canvas || !selectedObject) return;
    const animId = selectedIsConnector ? (option.connectorValue || option.value) : option.value;
    console.log('[ANIMATION CLICK] right panel preset button:', animId);
    applyAnimationToSelectedObject({
      canvas,
      selectedObject,
      selectedObjectId,
      animationId: animId,
      saveHistory,
      setSelectedObject,
    });
    bumpSelectionAnimation();
  };

  const updateAnimationParam = (key: string, value: unknown) => {
    commitTimelineAnimation({ params: { ...animationParams, [key]: value } });
  };

  const movementParams = (
    (animationParams.movement as Record<string, unknown> | undefined)
    || (animationParams.motionPath as Record<string, unknown> | undefined)
    || {}
  );
  const updateMovementParam = (key: string, value: unknown) => {
    const nextMovement = { ...movementParams, [key]: value };
    commitTimelineAnimation({
      params: {
        ...animationParams,
        movement: nextMovement,
        ...(animationParams.motionPath ? { motionPath: nextMovement } : {}),
      },
    });
  };
  const updateMovementSpeed = (value: number) => {
    const speed = Math.max(value || 1, 0.1);
    const nextMovement = { ...movementParams, speed };
    commitTimelineAnimation({
      durationMs: Math.max(100, Math.round(2000 / speed)),
      params: {
        ...animationParams,
        movement: nextMovement,
        ...(animationParams.motionPath ? { motionPath: nextMovement } : {}),
      },
    });
  };

  /* ------------------------------------------------------------------ */
  /*  Helper – wraps fabric.util.animate with a promise so we can chain  */
  /* ------------------------------------------------------------------ */
  const anim = (opts: {
    startValue: number;
    endValue: number;
    duration: number;
    onChange: (v: number) => void;
    onComplete?: () => void;
  }) =>
    new Promise<void>((resolve) => {
      fabric.util.animate({
        startValue: opts.startValue,
        endValue: opts.endValue,
        duration: opts.duration,
        easing: fabric.util.ease.easeOutCubic,
        onChange: (value: number) => {
          opts.onChange(value);
          canvas.renderAll();
        },
        onComplete: () => {
          opts.onComplete?.();
          canvas.renderAll();
          resolve();
        },
      });
    });

  /* ------------------------------------------------------------------ */
  /*  Animation definitions                                              */
  /* ------------------------------------------------------------------ */
  const animations: AnimationDef[] = [
    /* 1 – Fade In */
    {
      id: 'fade-in',
      label: 'Fade In',
      icon: <Eye size={18} />,
      run: async (obj) => {
        const origOpacity = obj.get('opacity') ?? 1;
        obj.set('opacity', 0);
        canvas.renderAll();
        await anim({
          startValue: 0,
          endValue: origOpacity,
          duration: 800,
          onChange: (v) => obj.set('opacity', v),
          onComplete: () => obj.set('opacity', origOpacity),
        });
      },
    },

    /* 2 – Fade Out */
    {
      id: 'fade-out',
      label: 'Fade Out',
      icon: <EyeOff size={18} />,
      run: async (obj) => {
        const origOpacity = obj.get('opacity') ?? 1;
        await anim({
          startValue: origOpacity,
          endValue: 0,
          duration: 400,
          onChange: (v) => obj.set('opacity', v),
        });
        await anim({
          startValue: 0,
          endValue: origOpacity,
          duration: 400,
          onChange: (v) => obj.set('opacity', v),
          onComplete: () => obj.set('opacity', origOpacity),
        });
      },
    },

    /* 3 – Slide Left */
    {
      id: 'slide-left',
      label: 'Slide Left',
      icon: <ArrowLeft size={18} />,
      run: async (obj) => {
        const origLeft = obj.get('left') ?? 0;
        obj.set('left', -200);
        canvas.renderAll();
        await anim({
          startValue: -200,
          endValue: origLeft,
          duration: 600,
          onChange: (v) => obj.set('left', v),
          onComplete: () => obj.set('left', origLeft),
        });
      },
    },

    /* 4 – Slide Right */
    {
      id: 'slide-right',
      label: 'Slide Right',
      icon: <ArrowRight size={18} />,
      run: async (obj) => {
        const origLeft = obj.get('left') ?? 0;
        const canvasRight = canvas.getWidth();
        obj.set('left', canvasRight);
        canvas.renderAll();
        await anim({
          startValue: canvasRight,
          endValue: origLeft,
          duration: 600,
          onChange: (v) => obj.set('left', v),
          onComplete: () => obj.set('left', origLeft),
        });
      },
    },

    /* 5 – Bounce */
    {
      id: 'bounce-in',
      label: 'Bounce',
      icon: <ArrowUpDown size={18} />,
      run: async (obj) => {
        const origTop = obj.get('top') ?? 0;
        for (let i = 0; i < 3; i++) {
          await anim({
            startValue: origTop,
            endValue: origTop - 50,
            duration: 1000 / 6,
            onChange: (v) => obj.set('top', v),
          });
          await anim({
            startValue: origTop - 50,
            endValue: origTop,
            duration: 1000 / 6,
            onChange: (v) => obj.set('top', v),
          });
        }
        obj.set('top', origTop);
        canvas.renderAll();
      },
    },

    /* 6 – Zoom In */
    {
      id: 'zoom-in',
      label: 'Zoom In',
      icon: <ZoomIn size={18} />,
      run: async (obj) => {
        const origScaleX = obj.get('scaleX') ?? 1;
        const origScaleY = obj.get('scaleY') ?? 1;
        obj.set({ scaleX: 0.1, scaleY: 0.1 });
        canvas.renderAll();
        await Promise.all([
          anim({
            startValue: 0.1,
            endValue: origScaleX,
            duration: 600,
            onChange: (v) => obj.set('scaleX', v),
          }),
          anim({
            startValue: 0.1,
            endValue: origScaleY,
            duration: 600,
            onChange: (v) => obj.set('scaleY', v),
          }),
        ]);
        obj.set({ scaleX: origScaleX, scaleY: origScaleY });
        canvas.renderAll();
      },
    },

    /* 7 – Rotate 360 */
    {
      id: 'rotate-small',
      label: 'Rotate 360',
      icon: <RotateCw size={18} />,
      run: async (obj) => {
        const origAngle = obj.get('angle') ?? 0;
        await anim({
          startValue: origAngle,
          endValue: origAngle + 360,
          duration: 800,
          onChange: (v) => obj.set('angle', v),
          onComplete: () => obj.set('angle', origAngle),
        });
      },
    },

    /* 8 – Pulse */
    {
      id: 'pulse',
      label: 'Pulse',
      icon: <Expand size={18} />,
      run: async (obj) => {
        const origScaleX = obj.get('scaleX') ?? 1;
        const origScaleY = obj.get('scaleY') ?? 1;
        for (let i = 0; i < 2; i++) {
          await Promise.all([
            anim({
              startValue: origScaleX,
              endValue: origScaleX * 1.15,
              duration: 250,
              onChange: (v) => obj.set('scaleX', v),
            }),
            anim({
              startValue: origScaleY,
              endValue: origScaleY * 1.15,
              duration: 250,
              onChange: (v) => obj.set('scaleY', v),
            }),
          ]);
          await Promise.all([
            anim({
              startValue: origScaleX * 1.15,
              endValue: origScaleX,
              duration: 250,
              onChange: (v) => obj.set('scaleX', v),
            }),
            anim({
              startValue: origScaleY * 1.15,
              endValue: origScaleY,
              duration: 250,
              onChange: (v) => obj.set('scaleY', v),
            }),
          ]);
        }
        obj.set({ scaleX: origScaleX, scaleY: origScaleY });
        canvas.renderAll();
      },
    },

    /* 9 – Shake */
    {
      id: 'jitter',
      label: 'Shake',
      icon: <ShieldAlert size={18} />,
      run: async (obj) => {
        const origLeft = obj.get('left') ?? 0;
        const step = 500 / 10; // 5 cycles, each = left + right = 2 steps
        for (let i = 0; i < 5; i++) {
          await anim({
            startValue: origLeft,
            endValue: origLeft + 10,
            duration: step,
            onChange: (v) => obj.set('left', v),
          });
          await anim({
            startValue: origLeft + 10,
            endValue: origLeft - 10,
            duration: step,
            onChange: (v) => obj.set('left', v),
          });
        }
        obj.set('left', origLeft);
        canvas.renderAll();
      },
    },
  ];

  /* ------------------------------------------------------------------ */
  /*  Handler                                                            */
  /* ------------------------------------------------------------------ */
  const handleAnimate = async (def: AnimationDef) => {
    if (isAnimating || !selectedObject || !canvas) return;
    setIsAnimating(true);
    try {
      const result = applyAnimationToSelectedObject({
        canvas,
        selectedObject,
        selectedObjectId,
        animationId: def.id,
        saveHistory,
        setSelectedObject,
      });
      if (result.status === 'applied') {
        const applied = result.item;
        setAnimationType(applied?.type || def.id);
        setStartMs(applied?.delayMs || 0);
        setDurationMs(applied?.durationMs || durationMs);
        setDelayMs(applied?.delayMs || 0);
        setEasing((applied?.easing as typeof EASING_OPTIONS[number]) || easing);
        setDirection(applied?.direction || direction);
        setLoop(applied?.loop === true);
        setAnimationParams(applied?.params || {});
        bumpSelectionAnimation();
      } else if (result.status === 'inserted') {
        bumpSelectionAnimation();
      }
    } finally {
      (selectedObject as any).setCoords?.();
      canvas.renderAll();
      setIsAnimating(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#11111a]/80 p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold tracking-wide text-zinc-200">Animation</h3>
          <p className="mt-0.5 text-[10px] text-zinc-500">Object motion and timing</p>
        </div>
        {animationType !== 'none' && (
          <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-violet-200">
            Active
          </span>
        )}
      </div>

      <div className="mb-3 rounded-xl border border-white/[0.08] bg-black/20 p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
          Presets
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CORE_ANIMATIONS.map((option) => {
            const activeValue = selectedIsConnector ? (option.connectorValue || option.value) : option.value;
            const isActive = animationType === activeValue;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => applyCoreAnimation(option)}
                className={`relative rounded-lg border px-2 py-2 text-[10px] font-semibold transition-colors ${
                  isActive
                    ? 'border-violet-400/70 bg-violet-500/15 text-violet-100 shadow-[0_0_0_1px_rgba(139,92,246,0.12)]'
                    : 'border-white/[0.08] bg-[#0b0b12] text-zinc-400 hover:border-violet-400/40 hover:text-zinc-100'
                }`}
              >
                {isActive && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-violet-300" />}
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-white/[0.08] bg-black/20 p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">
          Settings
        </div>
        <div className="mb-3 grid grid-cols-5 gap-1 rounded-xl border border-white/[0.06] bg-[#0b0b12] p-1" aria-label="Animation categories">
          {[
            { id: 'all', label: 'All' },
            { id: 'entrance', label: 'Entrance' },
            { id: 'emphasis', label: 'Emphasis' },
            { id: 'exit', label: 'Exit' },
            { id: 'technical', label: 'Technical' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryTab(cat.id as any)}
              className={`rounded-lg px-1 py-1 text-center text-[8px] font-bold uppercase tracking-[0.08em] transition-colors ${
                activeCategoryTab === cat.id
                  ? 'bg-violet-500/20 text-violet-200 ring-1 ring-violet-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <label className="col-span-2 flex flex-col gap-1 text-zinc-500">
            Animation Type
            <select
              value={animationType}
              onChange={(event) => commitTimelineAnimation({ animationType: event.target.value })}
              className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-violet-500"
            >
              {(selectedIsConnector ? CONNECTOR_ANIMATION_GROUPS : OBJECT_ANIMATION_GROUPS)
                .filter((group) => activeCategoryTab === 'all' || group.label.toLowerCase().includes(activeCategoryTab))
                .map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((option) => (
                      <option key={`${option.value}-${option.label}`} value={option.value}>{option.label}</option>
                    ))}
                  </optgroup>
                ))}
              {/* Ensure currently applied animation is present in dropdown even if filtered out */}
              {animationType !== 'none' && !(selectedIsConnector ? CONNECTOR_ANIMATION_GROUPS : OBJECT_ANIMATION_GROUPS)
                .filter((group) => activeCategoryTab === 'all' || group.label.toLowerCase().includes(activeCategoryTab))
                .some((group) => group.options.some((opt) => opt.value === animationType)) && (
                <option value={animationType}>{animationType}</option>
              )}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-zinc-500">
            Start Time (ms)
            <input type="number" min={0} step={100} value={startMs} onChange={(event) => commitTimelineAnimation({ startMs: Number(event.target.value) || 0 })} className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-violet-500" />
          </label>
          <label className="flex flex-col gap-1 text-zinc-500">
            Duration (ms)
            <input type="number" min={100} step={100} value={durationMs} onChange={(event) => commitTimelineAnimation({ durationMs: Number(event.target.value) || 800 })} className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-violet-500" />
          </label>
          <label className="flex flex-col gap-1 text-zinc-500">
            Delay (ms)
            <input type="number" min={0} step={100} value={delayMs} onChange={(event) => commitTimelineAnimation({ delayMs: Number(event.target.value) || 0 })} className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-violet-500" />
          </label>
          <label className="flex flex-col gap-1 text-zinc-500">
            Easing
            <select value={easing} onChange={(event) => commitTimelineAnimation({ easing: event.target.value as typeof EASING_OPTIONS[number] })} className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-violet-500">
              {EASING_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-zinc-500">
            Direction
            <select value={direction} onChange={(event) => commitTimelineAnimation({ direction: event.target.value })} className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-violet-500">
              {(selectedIsConnector ? CONNECTOR_DIRECTIONS : OBJECT_DIRECTIONS).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-zinc-400">
          <input type="checkbox" checked={loop} onChange={(event) => commitTimelineAnimation({ loop: event.target.checked })} className="accent-violet-500" />
          Loop On/Off
        </label>
        {isMovingAnimationType(animationType) && (
          <div className="mt-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">
              Movement
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <label className="flex flex-col gap-1 text-cyan-100/70">
                Start X
                <input type="number" step={10} value={readNumber(movementParams.startX, 0)} onChange={(event) => updateMovementParam('startX', Number(event.target.value) || 0)} className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-cyan-500" />
              </label>
              <label className="flex flex-col gap-1 text-cyan-100/70">
                Start Y
                <input type="number" step={10} value={readNumber(movementParams.startY, 0)} onChange={(event) => updateMovementParam('startY', Number(event.target.value) || 0)} className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-cyan-500" />
              </label>
              <label className="flex flex-col gap-1 text-cyan-100/70">
                End X
                <input type="number" step={10} value={readNumber(movementParams.endX, 260)} onChange={(event) => updateMovementParam('endX', Number(event.target.value) || 0)} className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-cyan-500" />
              </label>
              <label className="flex flex-col gap-1 text-cyan-100/70">
                End Y
                <input type="number" step={10} value={readNumber(movementParams.endY, 0)} onChange={(event) => updateMovementParam('endY', Number(event.target.value) || 0)} className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-cyan-500" />
              </label>
              <label className="flex flex-col gap-1 text-cyan-100/70">
                Distance
                <input type="number" min={0} step={10} value={readNumber(movementParams.distance, 260)} onChange={(event) => updateMovementParam('distance', Number(event.target.value) || 0)} className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-cyan-500" />
              </label>
              <label className="flex flex-col gap-1 text-cyan-100/70">
                Speed
                <input type="number" min={0.1} step={0.1} value={readNumber(movementParams.speed, Math.max(2000 / Math.max(durationMs, 1), 0.1))} onChange={(event) => updateMovementSpeed(Number(event.target.value) || 1)} className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-cyan-500" />
              </label>
              <label className="flex flex-col gap-1 text-cyan-100/70">
                Amplitude
                <input type="number" min={0} step={5} value={readNumber(movementParams.amplitude, 70)} onChange={(event) => updateMovementParam('amplitude', Number(event.target.value) || 0)} className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-cyan-500" />
              </label>
              <label className="flex flex-col gap-1 text-cyan-100/70">
                Radius
                <input type="number" min={1} step={5} value={readNumber(movementParams.radius, 90)} onChange={(event) => updateMovementParam('radius', Number(event.target.value) || 90)} className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-cyan-500" />
              </label>
              <label className="flex items-center gap-2 text-cyan-100/80">
                <input type="checkbox" checked={Boolean(movementParams.orientToPath)} onChange={(event) => updateMovementParam('orientToPath', event.target.checked)} className="accent-cyan-500" />
                Orient to Path
              </label>
              <label className="flex items-center gap-2 text-cyan-100/80">
                <input type="checkbox" checked={Boolean(movementParams.reverse)} onChange={(event) => updateMovementParam('reverse', event.target.checked)} className="accent-cyan-500" />
                Reverse Path
              </label>
            </div>
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3 text-[10px]">
          {(animationType.includes('progress') || animationType.includes('bar') || animationType.includes('chart')) && (
            <label className="flex flex-col gap-1 text-zinc-500">
              Target %
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={Number(animationParams.targetPercent ?? 100)}
                onChange={(event) => updateAnimationParam('targetPercent', Number(event.target.value) || 100)}
                className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-violet-500"
              />
            </label>
          )}
          {(animationType.includes('stagger') || animationType.includes('sequential') || animationType === 'dot-sequence') && (
            <label className="flex flex-col gap-1 text-zinc-500">
              Stagger Gap
              <input
                type="number"
                min={0}
                step={25}
                value={Number(animationParams.staggerGapMs ?? 120)}
                onChange={(event) => updateAnimationParam('staggerGapMs', Number(event.target.value) || 0)}
                className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-violet-500"
              />
            </label>
          )}
          {(animationType.includes('type') || animationType.includes('reveal')) && (
            <label className="flex flex-col gap-1 text-zinc-500">
              Typing Speed
              <input
                type="number"
                min={1}
                step={1}
                value={Number(animationParams.typingSpeed ?? 24)}
                onChange={(event) => updateAnimationParam('typingSpeed', Number(event.target.value) || 24)}
                className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-violet-500"
              />
            </label>
          )}
          {(animationType.includes('pulse') || animationType.includes('ring')) && (
            <label className="flex flex-col gap-1 text-zinc-500">
              Intensity
              <input
                type="number"
                min={0.01}
                max={0.4}
                step={0.01}
                value={Number(animationParams.amplitude ?? 0.08)}
                onChange={(event) => updateAnimationParam('amplitude', Number(event.target.value) || 0.08)}
                className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-violet-500"
              />
            </label>
          )}
          {(animationType.includes('dot') || animationType.includes('travel') || animationType.includes('orbit')) && (
            <label className="flex flex-col gap-1 text-zinc-500">
              Dot Size
              <input
                type="number"
                min={1}
                max={40}
                step={1}
                value={Number(animationParams.dotSize ?? 7)}
                onChange={(event) => updateAnimationParam('dotSize', Number(event.target.value) || 7)}
                className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-violet-500"
              />
            </label>
          )}
          {animationType === 'motion-path' && (
            <>
              <label className="flex items-center gap-2 text-zinc-400">
                <input
                  type="checkbox"
                  checked={Boolean((animationParams.motionPath as { orientToPath?: boolean } | undefined)?.orientToPath)}
                  onChange={(event) => updateAnimationParam('motionPath', { ...((animationParams.motionPath as Record<string, unknown> | undefined) || {}), orientToPath: event.target.checked })}
                  className="accent-violet-500"
                />
                Orient to Path
              </label>
              <label className="flex items-center gap-2 text-zinc-400">
                <input
                  type="checkbox"
                  checked={Boolean((animationParams.motionPath as { reverse?: boolean } | undefined)?.reverse)}
                  onChange={(event) => updateAnimationParam('motionPath', { ...((animationParams.motionPath as Record<string, unknown> | undefined) || {}), reverse: event.target.checked })}
                  className="accent-violet-500"
                />
                Reverse Path
              </label>
            </>
          )}
          {animationType.includes('confetti') && (
            <>
              <label className="flex flex-col gap-1 text-zinc-500">
                Particles
                <input
                  type="number"
                  min={8}
                  max={80}
                  step={1}
                  value={Number(animationParams.particleCount ?? 28)}
                  onChange={(event) => updateAnimationParam('particleCount', Number(event.target.value) || 28)}
                  className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-violet-500"
                />
              </label>
              <label className="flex flex-col gap-1 text-zinc-500">
                Gravity
                <input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={Number(animationParams.gravity ?? 0.7)}
                  onChange={(event) => updateAnimationParam('gravity', Number(event.target.value) || 0)}
                  className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-violet-500"
                />
              </label>
            </>
          )}
          {animationType.includes('count') && (
            <>
              <label className="flex flex-col gap-1 text-zinc-500">
                Start
                <input
                  type="number"
                  value={Number(animationParams.startValue ?? 0)}
                  onChange={(event) => updateAnimationParam('startValue', Number(event.target.value) || 0)}
                  className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-violet-500"
                />
              </label>
              <label className="flex flex-col gap-1 text-zinc-500">
                End
                <input
                  type="number"
                  value={Number(animationParams.endValue ?? 100)}
                  onChange={(event) => updateAnimationParam('endValue', Number(event.target.value) || 0)}
                  className="h-8 rounded-lg border border-white/[0.08] bg-[#0b0b12] px-2 text-zinc-200 outline-none focus:border-violet-500"
                />
              </label>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '6px',
        }}
      >
        {animations.map((def) => (
          <button
            key={def.label}
            disabled={isAnimating}
            onClick={() => handleAnimate(def)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '10px 4px',
              background: 'rgba(24, 24, 27, 0.6)',
              border: '1px solid rgb(39, 39, 42)',
              borderRadius: '0.75rem',
              color: '#a1a1aa',
              fontSize: '11px',
              cursor: isAnimating ? 'not-allowed' : 'pointer',
              opacity: isAnimating ? 0.5 : 1,
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isAnimating) {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  'rgba(139,92,246,0.5)';
                (e.currentTarget as HTMLButtonElement).style.color = '#e4e4e7';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                'rgb(39,39,42)';
              (e.currentTarget as HTMLButtonElement).style.color = '#a1a1aa';
            }}
          >
            {def.icon}
            <span>{def.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

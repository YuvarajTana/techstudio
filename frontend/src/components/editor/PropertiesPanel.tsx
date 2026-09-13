import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Group,
  Ungroup,
  Copy,
  Trash2,
  Move,
  Type,
  Palette,
  Layers,
  ChevronDown,
  ChevronRight,
  Square,
  Minus,
  Plus,
} from 'lucide-react';
import { fabric } from 'fabric';
import { useEditorStore } from '../../store/useEditorStore';
import { ImageFilters } from './ImageFilters';
import { GradientPicker } from './GradientPicker';
import { AnimationPanel } from './AnimationPanel';
import { GridOverlay } from './GridOverlay';
import { AlignmentTools } from './AlignmentTools';
import { DevModeInspector } from './DevModeInspector';
import { ImageCropper } from './ImageCropper';
import { EditableImportControls } from './image/EditableImportControls';
import { PosterColourControls } from './image/PosterColourControls';
import { RoundedHighlightControls } from './RoundedHighlightControls';
import { TextOnPath } from './TextOnPath';
import { ElementPropertiesControls } from './ElementPropertiesControls';
import { MediaFittingControls } from './MediaFittingControls';
import { COMMON_FONT_SIZES, MAX_FONT_SIZE, MIN_FONT_SIZE, clampFontSize, hasPartialTextSelection, isTextObjectLocked, readSelectionStyleValue } from '../../utils/textSelectionStyles';
import { synchronizeRoundedHighlightText } from '../../utils/roundedHighlightText';
import {
  applyDiagramArrowStyle,
  getDiagramArrowAppearance,
  updateDiagramConnectorConfig,
} from '../../utils/diagramConnectors';
import type { DiagramConnectorConfig, DiagramConnectorRouting, DiagramConnectorStyle, DiagramArrowStyle } from '../../utils/architectureDiagramTypes';

const PRESET_COLORS = [
  '#ffffff', '#000000', '#f4f4f5', '#71717a',
  '#ef4444', '#f97316', '#f59e0b', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#d946ef', '#ec4899'
];

const FONT_FAMILIES = [
  'Fredoka', 'Nunito', 'Arial Rounded MT Bold',
  'Outfit', 'Inter', 'system-ui', 'Arial', 'Georgia',
  'Courier New', 'Times New Roman', 'Verdana', 'Helvetica',
  'Roboto', 'Montserrat', 'Poppins', 'Playfair Display',
  'Pacifico', 'Lobster', 'Oswald', 'Raleway', 'Lato',
  'Merriweather', 'Source Sans Pro'
];

export const PropertiesPanel: React.FC = () => {
  const {
    canvas,
    selectedObject,
    fillColor,
    strokeColor,
    strokeWidth,
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    underline,
    textAlign,
    textSelectionRange,
    opacity,
    setFillColor,
    setStrokeColor,
    setStrokeWidth,
    setFontFamily,
    applyFontSize,
    setFontWeight,
    setFontStyle,
    setUnderline,
    setTextAlign,
    captureTextSelection,
    applyTextSelectionStyles,
    setOpacity,
    groupSelected,
    ungroupSelected,
    saveHistory,
    duplicateSelected,
    deleteSelected,
    editorMode
  } = useEditorStore();

  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    transform: true,
    fill: true,
    stroke: true,
    text: true,
    effects: true,
    spacing: false,
    element: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const isText = selectedObject && (
    selectedObject.type === 'text' ||
    selectedObject.type === 'i-text' ||
    selectedObject.type === 'textbox'
  );

  const isLine = selectedObject && selectedObject.type === 'line';
  const hasPartialTextRange = Boolean(isText && hasPartialTextSelection(selectedObject, textSelectionRange));
  const textStyleTargetLabel = !isText
    ? 'Select a text element to edit its style.'
    : hasPartialTextRange
      ? 'Styling selected text'
      : 'Styling entire text box';

  const selectedFontSizeValue = isText
    ? readSelectionStyleValue<number>(selectedObject, 'fontSize', fontSize, textSelectionRange)
    : fontSize;
  const hasMixedFontSize = selectedFontSizeValue === 'Mixed';
  const effectiveFontSize = typeof selectedFontSizeValue === 'number' ? selectedFontSizeValue : fontSize;
  const isConnector = selectedObject?.get('teckstudioObjectType' as keyof fabric.Object) === 'diagramConnectorPath';
  const arrowAppearance = getDiagramArrowAppearance(selectedObject);
  const isArrowSelection = Boolean(arrowAppearance);
  const connectorConfig = (isConnector
    ? selectedObject?.get('diagramConnectorConfig' as keyof fabric.Object)
    : null) as DiagramConnectorConfig | null;
  const isSelectedTextLocked = Boolean(isText && isTextObjectLocked(selectedObject));
  const [fontSizeDraft, setFontSizeDraft] = React.useState(String(effectiveFontSize));
  const fontStepAppliedAtRef = React.useRef(0);

  React.useEffect(() => {
    setFontSizeDraft(hasMixedFontSize ? '' : String(effectiveFontSize));
  }, [effectiveFontSize, hasMixedFontSize]);

  const updateConnector = React.useCallback((patch: Partial<DiagramConnectorConfig>) => {
    if (!canvas || !selectedObject || !isConnector) return;
    const updated = updateDiagramConnectorConfig(canvas, selectedObject, patch);
    if (updated) {
      canvas.setActiveObject(updated);
      canvas.requestRenderAll();
      saveHistory();
    }
  }, [canvas, isConnector, saveHistory, selectedObject]);

  const updateArrowStyle = React.useCallback((
    patch: Partial<DiagramConnectorConfig>,
    syncWholeArrowColor = false,
  ) => {
    if (!canvas || !selectedObject || !isArrowSelection) return;
    const applied = applyDiagramArrowStyle(canvas, selectedObject, patch, { syncWholeArrowColor });
    if (applied) {
      canvas.requestRenderAll();
      saveHistory();
    }
  }, [canvas, isArrowSelection, saveHistory, selectedObject]);

  const ConnectorControl = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-zinc-500">{label}</span>
      {children}
    </label>
  );

  const commitFontSizeDraft = React.useCallback((value = fontSizeDraft) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      setFontSizeDraft(hasMixedFontSize ? '' : String(effectiveFontSize));
      return;
    }

    const nextSize = clampFontSize(parsed);
    setFontSizeDraft(String(nextSize));
    applyFontSize(nextSize);
  }, [applyFontSize, effectiveFontSize, fontSizeDraft, hasMixedFontSize]);

  const applyFontSizeStep = React.useCallback((event: React.SyntheticEvent<HTMLElement>, delta: number) => {
    if (!isText) return;
    event.preventDefault();
    const now = Date.now();
    if (now - fontStepAppliedAtRef.current < 120) return;
    fontStepAppliedAtRef.current = now;
    captureTextSelection();
    applyFontSize(clampFontSize(effectiveFontSize + delta));
  }, [applyFontSize, captureTextSelection, effectiveFontSize, isText]);

  const preserveTextSelection = React.useCallback(() => {
    if (isText) captureTextSelection();
  }, [captureTextSelection, isText]);

  const preserveTextButtonMouseDown = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!isText) return;
    event.preventDefault();
    captureTextSelection();
  }, [captureTextSelection, isText]);

  const textColorInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    const handleOpenTextColor = () => textColorInputRef.current?.click();
    window.addEventListener('teckstudio:open-text-color', handleOpenTextColor);
    return () => window.removeEventListener('teckstudio:open-text-color', handleOpenTextColor);
  }, []);

  // Canvas background state helper
  const [canvasBg, setCanvasBg] = React.useState('#000000');

  // Object shadow state
  const [shadowColor, setShadowColor] = React.useState('#000000');
  const [shadowBlur, setShadowBlur] = React.useState(0);
  const [shadowOffsetX, setShadowOffsetX] = React.useState(0);
  const [shadowOffsetY, setShadowOffsetY] = React.useState(0);

  // Text spacing state
  const [letterSpacing, setLetterSpacing] = React.useState(0);
  const [lineHeight, setLineHeight] = React.useState(1.4);

  // Border radius state
  const [borderRadius, setBorderRadius] = React.useState(0);
  const [textContent, setTextContent] = React.useState('');

  React.useEffect(() => {
    if (canvas && !selectedObject) {
      const currentBg = canvas.backgroundColor;
      if (typeof currentBg === 'string') {
        setCanvasBg(currentBg);
      }
    }
  }, [canvas, selectedObject]);

  React.useEffect(() => {
    if (selectedObject) {
      const shadow = selectedObject.shadow as fabric.Shadow;
      if (shadow) {
        setShadowColor(shadow.color || '#000000');
        setShadowBlur(shadow.blur || 0);
        setShadowOffsetX(shadow.offsetX || 0);
        setShadowOffsetY(shadow.offsetY || 0);
      } else {
        setShadowBlur(0);
        setShadowOffsetX(0);
        setShadowOffsetY(0);
      }

      if (isText) {
        setTextContent((selectedObject as fabric.Textbox).text || '');
        setLetterSpacing((selectedObject as any).charSpacing || 0);
        setLineHeight((selectedObject as any).lineHeight || 1.4);
      }

      if (selectedObject.type === 'rect') {
        setBorderRadius((selectedObject as any).rx || 0);
      }
    }
  }, [selectedObject, isText]);

  React.useEffect(() => {
    if (!canvas || !selectedObject || !isText) return;
    const syncTextContent = (event: fabric.IEvent) => {
      if (event.target !== selectedObject) return;
      setTextContent((selectedObject as fabric.Textbox).text || '');
    };
    canvas.on('text:changed', syncTextContent);
    return () => {
      canvas.off('text:changed', syncTextContent);
    };
  }, [canvas, isText, selectedObject]);

  const handleCanvasBgChange = (color: string) => {
    if (!canvas) return;
    setCanvasBg(color);
    canvas.setBackgroundColor(color, () => canvas.renderAll());
    saveHistory();
  };

  const handleShadowChange = (blur: number, offsetX: number, offsetY: number, color: string) => {
    if (!selectedObject || !canvas) return;
    setShadowBlur(blur);
    setShadowOffsetX(offsetX);
    setShadowOffsetY(offsetY);
    setShadowColor(color);
    if (blur > 0 || offsetX !== 0 || offsetY !== 0) {
      selectedObject.set('shadow', new fabric.Shadow({
        color,
        blur,
        offsetX,
        offsetY,
      }));
    } else {
      selectedObject.set('shadow', undefined);
    }
    canvas.renderAll();
    saveHistory();
  };

  const handleLetterSpacingChange = (spacing: number, commitHistory = true) => {
    if (!selectedObject || !canvas) return;
    setLetterSpacing(spacing);
    if (isText) {
      applyTextSelectionStyles({ charSpacing: spacing }, { saveHistory: commitHistory });
      return;
    }
    (selectedObject as any).set('charSpacing', spacing);
    canvas.renderAll();
    if (commitHistory) saveHistory();
  };

  const handleLineHeightChange = (height: number, commitHistory = true) => {
    if (!selectedObject || !canvas) return;
    setLineHeight(height);
    (selectedObject as any).set('lineHeight', height);
    canvas.renderAll();
    if (commitHistory) saveHistory();
  };

  const handleBorderRadiusChange = (radius: number) => {
    if (!selectedObject || !canvas) return;
    setBorderRadius(radius);
    if (selectedObject.type === 'rect') {
      (selectedObject as any).set({ rx: radius, ry: radius });
      canvas.renderAll();
      saveHistory();
    }
  };

  // Render Dev Mode Inspector panel instead if Dev Mode is enabled
  if (editorMode === 'dev') {
    return <DevModeInspector />;
  }

  // Section header component
  const SectionHeader: React.FC<{
    title: string;
    sectionKey: string;
    icon?: React.ReactNode;
  }> = ({ title, sectionKey, icon }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="flex items-center justify-between w-full py-2 px-1 hover:bg-zinc-800/50 rounded-lg transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-zinc-300">{title}</span>
      </div>
      {openSections[sectionKey] ?
        <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> :
        <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
      }
    </button>
  );

  // If no object selected, show Page properties
  if (!selectedObject) {
    return (
      <aside className="w-full bg-transparent p-4 flex flex-col gap-4 select-none shrink-0">
        <div>
          <h3 className="text-sm font-bold text-zinc-100 mb-1">Page Settings</h3>
          <p className="text-[10px] text-zinc-500">Configure global canvas options</p>
        </div>

        <TextOnPath />

        <div className="h-[1px] bg-zinc-800" />

        {/* Canvas Background Color */}
        <div className="flex flex-col gap-3">
          <SectionHeader title="Background Color" sectionKey="fill" icon={<Palette className="w-4 h-4 text-violet-400" />} />
          {openSections.fill && (
            <>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={canvasBg}
                  onChange={(e) => handleCanvasBgChange(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={canvasBg.toUpperCase()}
                  onChange={(e) => handleCanvasBgChange(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-850 focus:border-violet-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none text-center font-mono"
                />
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleCanvasBgChange(color)}
                    style={{ backgroundColor: color }}
                    className={`w-6 h-6 rounded-md border ${
                      canvasBg.toLowerCase() === color.toLowerCase()
                        ? 'border-violet-500 scale-110 shadow-md ring-2 ring-violet-500/20'
                        : 'border-white/[0.08] hover:scale-105'
                    } cursor-pointer transition-all`}
                    title={color}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="h-[1px] bg-zinc-800" />
        <GradientPicker />
        <div className="h-[1px] bg-zinc-800" />
        <GridOverlay />
      </aside>
    );
  }

  return (
    <aside className="w-full bg-transparent p-4 flex flex-col gap-3 select-none shrink-0 z-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-100 mb-0.5">Properties</h3>
          <p className="text-[10px] text-zinc-500 capitalize">
            {selectedObject.type} element
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={duplicateSelected}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={deleteSelected}
            className="p-1.5 hover:bg-zinc-850 hover:text-rose-400 rounded-lg text-zinc-600 transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="h-[1px] bg-zinc-800" />

      <AnimationPanel />

      <div className="h-[1px] bg-zinc-800" />

      {isArrowSelection && arrowAppearance && !isConnector && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 space-y-3">
          <div>
            <h4 className="text-xs font-bold text-violet-200">Arrow Properties</h4>
            <p className="text-[9px] text-zinc-500">Color edits affect the full visible arrow.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ConnectorControl label="Arrow Color">
              <input type="color" value={arrowAppearance.arrowColor} onChange={(event) => updateArrowStyle({ color: event.target.value }, true)} className="h-8 w-full rounded-lg border border-zinc-800 bg-zinc-950" />
            </ConnectorControl>
            <ConnectorControl label="Stroke Color">
              <input type="color" value={arrowAppearance.strokeColor} onChange={(event) => updateArrowStyle({ color: event.target.value })} className="h-8 w-full rounded-lg border border-zinc-800 bg-zinc-950" />
            </ConnectorControl>
            <ConnectorControl label="Arrowhead Color">
              <input type="color" value={arrowAppearance.arrowheadColor} onChange={(event) => updateArrowStyle({ arrowheadColor: event.target.value })} className="h-8 w-full rounded-lg border border-zinc-800 bg-zinc-950" />
            </ConnectorControl>
            <ConnectorControl label="Stroke Width">
              <input type="number" min={1} max={50} value={arrowAppearance.strokeWidth} onChange={(event) => updateArrowStyle({ width: Number(event.target.value) || 2 })} className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-200 outline-none" />
            </ConnectorControl>
          </div>
          <ConnectorControl label="Opacity">
            <input type="range" min={0.1} max={1} step={0.05} value={arrowAppearance.opacity} onChange={(event) => updateArrowStyle({ opacity: Number(event.target.value) })} />
          </ConnectorControl>
          <div className="grid grid-cols-7 gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button key={color} type="button" onClick={() => updateArrowStyle({ color }, true)} style={{ backgroundColor: color }} className="h-6 w-6 rounded-md border border-zinc-850 transition-all hover:scale-105" title={color} />
            ))}
          </div>
        </div>
      )}

      {isConnector && connectorConfig && (
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-sky-200">Connector Settings</h4>
              <p className="text-[9px] text-zinc-500">Per-relationship routing, arrows, label and animation.</p>
            </div>
            <Minus className="h-4 w-4 text-sky-400" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ConnectorControl label="Connector Type">
              <select
                value={connectorConfig.routing || 'elbow'}
                onChange={(event) => updateConnector({ routing: event.target.value as DiagramConnectorRouting, connectorType: event.target.value as DiagramConnectorRouting })}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-200 outline-none"
              >
                <option value="straight">Straight</option>
                <option value="elbow">Elbow</option>
                <option value="orthogonal">Orthogonal</option>
                <option value="curved">Curved</option>
                <option value="loop">Loop</option>
              </select>
            </ConnectorControl>
            <ConnectorControl label="Line Style">
              <select
                value={connectorConfig.style || 'solid'}
                onChange={(event) => updateConnector({ style: event.target.value as DiagramConnectorStyle, lineStyle: event.target.value as DiagramConnectorStyle })}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-200 outline-none"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </ConnectorControl>
            <ConnectorControl label="Start Arrow">
              <select
                value={connectorConfig.startArrow || 'none'}
                onChange={(event) => updateConnector({ startArrow: event.target.value as DiagramArrowStyle })}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-200 outline-none"
              >
                <option value="none">None</option>
                <option value="arrow">Arrow</option>
                <option value="open-arrow">Open</option>
                <option value="circle">Circle</option>
                <option value="diamond">Diamond</option>
              </select>
            </ConnectorControl>
            <ConnectorControl label="End Arrow">
              <select
                value={connectorConfig.endArrow || 'arrow'}
                onChange={(event) => updateConnector({ endArrow: event.target.value as DiagramArrowStyle })}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-200 outline-none"
              >
                <option value="none">None</option>
                <option value="arrow">Arrow</option>
                <option value="open-arrow">Open</option>
                <option value="circle">Circle</option>
                <option value="diamond">Diamond</option>
              </select>
            </ConnectorControl>
          </div>

          <ConnectorControl label="Label">
            <input
              value={connectorConfig.label || ''}
              onChange={(event) => updateConnector({ label: event.target.value })}
              placeholder="REST API, YES, NO..."
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-200 outline-none placeholder:text-zinc-600"
            />
          </ConnectorControl>

          <div className="grid grid-cols-2 gap-2">
            <ConnectorControl label="Arrow Color">
              <input
                type="color"
                value={connectorConfig.color || '#43D68A'}
                onChange={(event) => updateArrowStyle({ color: event.target.value }, true)}
                className="h-8 w-full rounded-lg border border-zinc-800 bg-zinc-950"
              />
            </ConnectorControl>
            <ConnectorControl label="Stroke Color">
              <input
                type="color"
                value={connectorConfig.color || '#43D68A'}
                onChange={(event) => updateArrowStyle({ color: event.target.value })}
                className="h-8 w-full rounded-lg border border-zinc-800 bg-zinc-950"
              />
            </ConnectorControl>
            <ConnectorControl label="Arrowhead Color">
              <input
                type="color"
                value={connectorConfig.arrowheadColor || connectorConfig.color || '#43D68A'}
                onChange={(event) => updateArrowStyle({ arrowheadColor: event.target.value })}
                className="h-8 w-full rounded-lg border border-zinc-800 bg-zinc-950"
              />
            </ConnectorControl>
            <ConnectorControl label="Stroke Width">
              <input
                type="number"
                min={1}
                max={16}
                value={connectorConfig.width || 2}
                onChange={(event) => updateArrowStyle({ width: Number(event.target.value) || 2 })}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-200 outline-none"
              />
            </ConnectorControl>
            <ConnectorControl label="Opacity">
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={connectorConfig.opacity ?? 0.9}
                onChange={(event) => updateArrowStyle({ opacity: Number(event.target.value) })}
              />
            </ConnectorControl>
            <ConnectorControl label="Dash Gap">
              <input
                type="number"
                min={1}
                max={40}
                value={connectorConfig.dashGap || 8}
                onChange={(event) => updateConnector({ dashGap: Number(event.target.value) || 8 })}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-200 outline-none"
              />
            </ConnectorControl>
            <ConnectorControl label="Arrow Size">
              <input
                type="number"
                min={6}
                max={40}
                value={connectorConfig.arrowSize || 13}
                onChange={(event) => updateConnector({ arrowSize: Number(event.target.value) || 13 })}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-200 outline-none"
              />
            </ConnectorControl>
            <ConnectorControl label="Corner Radius">
              <input
                type="number"
                min={0}
                max={120}
                value={connectorConfig.bendOffset || 0}
                onChange={(event) => updateConnector({ bendOffset: Number(event.target.value) || 0 })}
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-200 outline-none"
              />
            </ConnectorControl>
          </div>
        </div>
      )}

      {/* Group / Ungroup controls */}
      {selectedObject.type === 'activeSelection' && (
        <button
          onClick={groupSelected}
          className="flex items-center justify-center gap-2 w-full py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          <Group className="w-4 h-4" />
          Group Selected
        </button>
      )}

      {selectedObject.type === 'group' && (
        <button
          onClick={ungroupSelected}
          className="flex items-center justify-center gap-2 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          <Ungroup className="w-4 h-4" />
          Ungroup Elements
        </button>
      )}

      <ElementPropertiesControls
        canvas={canvas}
        selectedObject={selectedObject}
        saveHistory={saveHistory}
        ungroupSelected={ungroupSelected}
      />

      {/* Transform Section */}
      <div className="flex flex-col gap-2">
        <SectionHeader title="Transform" sectionKey="transform" icon={<Move className="w-4 h-4 text-cyan-400" />} />
        {openSections.transform && (
          <div className="grid grid-cols-2 gap-2 px-1">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500">X Position</label>
              <input
                type="number"
                value={Math.round(selectedObject.left || 0)}
                onChange={(e) => {
                  if (!canvas) return;
                  selectedObject.set('left', parseInt(e.target.value) || 0);
                  canvas.renderAll();
                  saveHistory();
                }}
                className="w-full bg-zinc-900 border border-white/[0.08] rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-violet-500 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500">Y Position</label>
              <input
                type="number"
                value={Math.round(selectedObject.top || 0)}
                onChange={(e) => {
                  if (!canvas) return;
                  selectedObject.set('top', parseInt(e.target.value) || 0);
                  canvas.renderAll();
                  saveHistory();
                }}
                className="w-full bg-zinc-900 border border-white/[0.08] rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-violet-500 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500">Width</label>
              <input
                type="number"
                value={Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1))}
                onChange={(e) => {
                  if (!canvas) return;
                  const newWidth = parseInt(e.target.value) || 100;
                  selectedObject.set('scaleX', newWidth / (selectedObject.width || 1));
                  canvas.renderAll();
                  saveHistory();
                }}
                className="w-full bg-zinc-900 border border-white/[0.08] rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-violet-500 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-zinc-500">Height</label>
              <input
                type="number"
                value={Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1))}
                onChange={(e) => {
                  if (!canvas) return;
                  const newHeight = parseInt(e.target.value) || 100;
                  selectedObject.set('scaleY', newHeight / (selectedObject.height || 1));
                  canvas.renderAll();
                  saveHistory();
                }}
                className="w-full bg-zinc-900 border border-white/[0.08] rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-violet-500 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-zinc-500">Rotation</label>
                <span className="text-[10px] text-zinc-400 font-mono">{Math.round(selectedObject.angle || 0)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={selectedObject.angle || 0}
                onChange={(e) => {
                  if (!canvas) return;
                  selectedObject.set('angle', parseInt(e.target.value));
                  canvas.renderAll();
                  saveHistory();
                }}
                className="w-full accent-violet-500 h-1 rounded-full cursor-pointer bg-zinc-800"
              />
            </div>
          </div>
        )}
      </div>

      <div className="h-[1px] bg-zinc-800" />

      {/* Fill Color Section */}
      {!isLine && !isArrowSelection && (
        <div className="flex flex-col gap-2">
          <SectionHeader title={isText ? 'Text Color' : 'Fill Color'} sectionKey="fill" icon={<Palette className="w-4 h-4 text-violet-400" />} />
          {openSections.fill && (
            <div className="flex flex-col gap-2 px-1">
              <div className="flex items-center gap-2">
                <input
                  ref={isText ? textColorInputRef : undefined}
                  type="color"
                  value={fillColor}
                  onPointerDown={preserveTextSelection}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={fillColor.toUpperCase()}
                  onPointerDown={preserveTextSelection}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-white/[0.08] focus:border-violet-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none text-center font-mono"
                />
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onMouseDown={preserveTextButtonMouseDown}
                    onClick={() => setFillColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-6 h-6 rounded-md border ${
                      fillColor.toLowerCase() === color.toLowerCase()
                        ? 'border-violet-500 scale-110 shadow-md ring-2 ring-violet-500/20'
                        : 'border-zinc-850 hover:scale-105'
                    } cursor-pointer transition-all`}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Text Settings Area */}
      {isText && (
        <>
          <div className="h-[1px] bg-zinc-800" />

          <div className="flex flex-col gap-2">
            <SectionHeader title="Text Properties" sectionKey="text" icon={<Type className="w-4 h-4 text-emerald-400" />} />
            {openSections.text && (
              <div className="flex flex-col gap-3 px-1">
                <div className={`rounded-lg border px-3 py-2 text-[11px] font-semibold ${hasPartialTextRange ? 'border-violet-400/30 bg-violet-500/10 text-violet-100' : 'border-white/[0.08] bg-zinc-900/60 text-zinc-400'}`}>
                  {textStyleTargetLabel}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500">Text Content</label>
                  <textarea
                    value={textContent}
                    rows={Math.min(5, Math.max(2, textContent.split('\n').length))}
                    onChange={(event) => {
                      if (!canvas || !selectedObject || !isText) return;
                      const value = event.target.value;
                      setTextContent(value);
                      const textObject = selectedObject as fabric.Textbox;
                      textObject.set('text', value);
                      synchronizeRoundedHighlightText(textObject);
                      textObject.initDimensions();
                      textObject.setCoords();
                      canvas.requestRenderAll();
                      canvas.fire('text:changed', { target: textObject });
                    }}
                    onBlur={() => saveHistory()}
                    className="w-full resize-y rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-violet-500"
                  />
                </div>
                <RoundedHighlightControls />
                {/* Font Family */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500">Font Family</label>
                  <select
                    value={fontFamily}
                    onPointerDown={preserveTextSelection}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/[0.08] text-zinc-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-violet-500 cursor-pointer"
                  >
                    {FONT_FAMILIES.map((family) => (
                      <option key={family} value={family}>{family}</option>
                    ))}
                  </select>
                </div>

                {/* Font Size */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-zinc-500">Font Size</label>
                    <span className="text-[10px] text-zinc-400 font-mono">{hasMixedFontSize ? 'Mixed' : `${effectiveFontSize}px`}</span>
                  </div>
                  <div className="grid grid-cols-[28px_1fr_28px] gap-2">
                    <button
                      onPointerDown={(event) => applyFontSizeStep(event, -1)}
                      onMouseUp={(event) => applyFontSizeStep(event, -1)}
                      onClick={(event) => applyFontSizeStep(event, -1)}
                      disabled={isSelectedTextLocked || effectiveFontSize <= MIN_FONT_SIZE}
                      className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/[0.08] hover:bg-zinc-800 disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center text-zinc-300 font-bold text-xs cursor-pointer"
                      title="Decrease font size by 1px"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min={MIN_FONT_SIZE}
                      max={MAX_FONT_SIZE}
                      value={fontSizeDraft}
                      placeholder={hasMixedFontSize ? 'Mixed' : undefined}
                      disabled={isSelectedTextLocked}
                      onPointerDown={preserveTextSelection}
                      onChange={(e) => setFontSizeDraft(e.target.value)}
                      onBlur={() => commitFontSizeDraft()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitFontSizeDraft();
                          event.currentTarget.blur();
                        }
                      }}
                      className="w-full bg-zinc-900 border border-white/[0.08] rounded px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-violet-500 font-mono text-center placeholder:text-amber-300 disabled:opacity-45 disabled:cursor-not-allowed"
                      title="Change the size of the selected text"
                    />
                    <button
                      onPointerDown={(event) => applyFontSizeStep(event, 1)}
                      onMouseUp={(event) => applyFontSizeStep(event, 1)}
                      onClick={(event) => applyFontSizeStep(event, 1)}
                      disabled={isSelectedTextLocked || effectiveFontSize >= MAX_FONT_SIZE}
                      className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/[0.08] hover:bg-zinc-800 disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center text-zinc-300 font-bold text-xs cursor-pointer"
                      title="Increase font size by 1px"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  {isSelectedTextLocked && (
                    <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[10px] font-semibold text-amber-200">
                      Unlock this text element to change its size.
                    </div>
                  )}
                  <select
                    value={!hasMixedFontSize && COMMON_FONT_SIZES.includes(effectiveFontSize) ? effectiveFontSize : ''}
                    disabled={isSelectedTextLocked}
                    onPointerDown={preserveTextSelection}
                    onChange={(e) => { if (e.target.value) commitFontSizeDraft(e.target.value); }}
                    className="w-full bg-zinc-900 border border-white/[0.08] text-zinc-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-violet-500 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    <option value="">Common sizes</option>
                    {COMMON_FONT_SIZES.map((size) => <option key={size} value={size}>{size}px</option>)}
                  </select>
                </div>

                {/* Formatting & Alignment */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500">Formatting</label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Text Style toggles */}
                    <div className="flex border border-white/[0.08] rounded-lg bg-zinc-900 p-0.5">
                      <button
                        onMouseDown={preserveTextButtonMouseDown}
                        onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
                        className={`flex-1 py-1.5 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                          fontWeight === 'bold' ? 'bg-violet-600/20 text-violet-400' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Bold"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onMouseDown={preserveTextButtonMouseDown}
                        onClick={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
                        className={`flex-1 py-1.5 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                          fontStyle === 'italic' ? 'bg-violet-600/20 text-violet-400' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Italic"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onMouseDown={preserveTextButtonMouseDown}
                        onClick={() => setUnderline(!underline)}
                        className={`flex-1 py-1.5 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                          underline ? 'bg-violet-600/20 text-violet-400' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Underline"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Text Alignments */}
                    <div className="flex border border-white/[0.08] rounded-lg bg-zinc-900 p-0.5">
                      <button
                        onMouseDown={preserveTextButtonMouseDown}
                        onClick={() => setTextAlign('left')}
                        className={`flex-1 py-1.5 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                          textAlign === 'left' ? 'bg-violet-600/20 text-violet-400' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Align Left"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onMouseDown={preserveTextButtonMouseDown}
                        onClick={() => setTextAlign('center')}
                        className={`flex-1 py-1.5 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                          textAlign === 'center' ? 'bg-violet-600/20 text-violet-400' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Align Center"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onMouseDown={preserveTextButtonMouseDown}
                        onClick={() => setTextAlign('right')}
                        className={`flex-1 py-1.5 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                          textAlign === 'right' ? 'bg-violet-600/20 text-violet-400' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Align Right"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onMouseDown={preserveTextButtonMouseDown}
                        onClick={() => setTextAlign('justify')}
                        className={`flex-1 py-1.5 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                          textAlign === 'justify' ? 'bg-violet-600/20 text-violet-400' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Justify"
                      >
                        <AlignJustify className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Character Background */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500">Selection Highlight</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      defaultValue="#8b5cf6"
                      onPointerDown={preserveTextSelection}
                      onChange={(e) => applyTextSelectionStyles({ textBackgroundColor: e.target.value })}
                      className="w-8 h-8 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                    />
                    <button
                      type="button"
                      onMouseDown={preserveTextButtonMouseDown}
                      onClick={() => applyTextSelectionStyles({ textBackgroundColor: '' })}
                      className="flex-1 rounded-lg border border-white/[0.08] bg-zinc-900 px-2 py-2 text-[10px] font-bold text-zinc-300 hover:text-white"
                    >
                      Clear highlight
                    </button>
                  </div>
                </div>

                {/* Letter Spacing */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-zinc-500">Letter Spacing</label>
                    <input
                      type="number"
                      min="-200"
                      max="500"
                      value={letterSpacing}
                      onPointerDown={preserveTextSelection}
                      onChange={(e) => handleLetterSpacingChange(parseInt(e.target.value) || 0)}
                      className="w-16 rounded border border-zinc-800 bg-zinc-950 px-1 py-0.5 text-right text-[10px] font-mono text-zinc-300"
                    />
                  </div>
                  <input
                    type="range"
                    min="-200"
                    max="500"
                    value={letterSpacing}
                    onPointerDown={preserveTextSelection}
                    onChange={(e) => handleLetterSpacingChange(parseInt(e.target.value), false)}
                    onPointerUp={() => saveHistory()}
                    className="w-full accent-violet-500 h-1 rounded-full cursor-pointer bg-zinc-800"
                  />
                </div>

                {/* Line Height */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-zinc-500">Line Height</label>
                    <input
                      type="number"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={lineHeight}
                      onPointerDown={preserveTextSelection}
                      onChange={(e) => handleLineHeightChange(Math.max(0.5, Number(e.target.value) || 1))}
                      className="w-16 rounded border border-zinc-800 bg-zinc-950 px-1 py-0.5 text-right text-[10px] font-mono text-zinc-300"
                    />
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={lineHeight}
                    onPointerDown={preserveTextSelection}
                    onChange={(e) => handleLineHeightChange(parseFloat(e.target.value), false)}
                    onPointerUp={() => saveHistory()}
                    className="w-full accent-violet-500 h-1 rounded-full cursor-pointer bg-zinc-800"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Stroke Settings Area */}
      {!isLine && !isArrowSelection && (
        <>
          <div className="h-[1px] bg-zinc-800" />

          <div className="flex flex-col gap-2">
            <SectionHeader title={isText ? "Text Stroke" : "Border"} sectionKey="stroke" icon={<Square className="w-4 h-4 text-amber-400" />} />
            {openSections.stroke && (
              <div className="flex flex-col gap-3 px-1">
                {/* Stroke Color */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-500">{isText ? "Stroke Color" : "Border Color"}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={strokeColor}
                      onChange={(e) => setStrokeColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={strokeColor.toUpperCase()}
                      onChange={(e) => setStrokeColor(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-white/[0.08] focus:border-violet-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 outline-none text-center font-mono"
                    />
                  </div>
                </div>

                {/* Stroke Width */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-zinc-500">{isText ? "Stroke Width" : "Border Width"}</label>
                    <span className="text-[10px] text-zinc-400 font-mono">{strokeWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                    className="w-full accent-violet-500 h-1 rounded-full cursor-pointer bg-zinc-800"
                  />
                </div>

                {/* Border Radius (for rectangles) */}
                {selectedObject.type === 'rect' && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] text-zinc-500">Border Radius</label>
                      <span className="text-[10px] text-zinc-400 font-mono">{borderRadius}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={borderRadius}
                      onChange={(e) => handleBorderRadiusChange(parseInt(e.target.value))}
                      className="w-full accent-violet-500 h-1 rounded-full cursor-pointer bg-zinc-800"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <div className="h-[1px] bg-zinc-800" />

      {/* Effects Section */}
      <div className="flex flex-col gap-2">
        <SectionHeader title="Effects" sectionKey="effects" icon={<Layers className="w-4 h-4 text-fuchsia-400" />} />
        {openSections.effects && (
          <div className="flex flex-col gap-3 px-1">
            {/* Opacity slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-zinc-500">Opacity</label>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-violet-500 h-1 rounded-full cursor-pointer bg-zinc-800"
              />
            </div>

            {/* Shadow */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-zinc-500">Shadow</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={shadowColor}
                  onChange={(e) => handleShadowChange(shadowBlur, shadowOffsetX, shadowOffsetY, e.target.value)}
                  className="w-8 h-8 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={shadowColor.toUpperCase()}
                  onChange={(e) => handleShadowChange(shadowBlur, shadowOffsetX, shadowOffsetY, e.target.value)}
                  className="flex-1 bg-zinc-900 border border-white/[0.08] rounded px-2 py-1 text-[10px] text-zinc-200 outline-none font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-zinc-500">Blur</label>
                  <span className="text-[10px] text-zinc-400 font-mono">{shadowBlur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={shadowBlur}
                  onChange={(e) => handleShadowChange(parseInt(e.target.value), shadowOffsetX, shadowOffsetY, shadowColor)}
                  className="w-full accent-violet-500 h-1 rounded-full cursor-pointer bg-zinc-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500">Offset X</label>
                  <input
                    type="number"
                    value={shadowOffsetX}
                    onChange={(e) => handleShadowChange(shadowBlur, parseInt(e.target.value) || 0, shadowOffsetY, shadowColor)}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded px-2 py-1 text-[10px] text-zinc-200 outline-none font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500">Offset Y</label>
                  <input
                    type="number"
                    value={shadowOffsetY}
                    onChange={(e) => handleShadowChange(shadowBlur, shadowOffsetX, parseInt(e.target.value) || 0, shadowColor)}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded px-2 py-1 text-[10px] text-zinc-200 outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedObject?.get('posterConversionId' as keyof fabric.Object) && (
        <>
          <div className="h-[1px] bg-zinc-800" />
          <EditableImportControls />
        </>
      )}

      {selectedObject?.get('posterConversionRole' as keyof fabric.Object) === 'region' && (
        <>
          <div className="h-[1px] bg-zinc-800" />
          <PosterColourControls key={String(selectedObject.get('id' as keyof fabric.Object) || '')} />
        </>
      )}

      {selectedObject?.type === 'image' && (
        <>
          <div className="h-[1px] bg-zinc-800" />
          <ImageFilters />
          <div className="h-[1px] bg-zinc-800" />
          <ImageCropper />
        </>
      )}

      {selectedObject && (
        <>
          <div className="h-[1px] bg-zinc-800" />
          <MediaFittingControls object={selectedObject} />
        </>
      )}

      <div className="h-[1px] bg-zinc-800" />
      <div>
        <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1">Alignment & Flip</h3>
        <AlignmentTools />
      </div>
    </aside>
  );
};

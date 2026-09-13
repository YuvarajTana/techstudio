import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  FlipHorizontal,
  FlipVertical,
  Lock,
  Unlock,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  ChevronRight,
  Eye,
  EyeOff,
  Group,
  Ungroup,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  MessageSquare,
  Sparkles,
  RotateCcw,
  RotateCw,
  Replace,
  WandSparkles,
  Loader2,
  Crop,
  Pencil,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { fabric } from 'fabric';
import { alignObjectToPage } from '../../utils/textSelectionStyles';
import type { PageAlignment } from '../../utils/textSelectionStyles';
import { uploadImageAsset } from '../../services/uploadsApi';
import { replaceFabricImageAsset, resetUploadedImageObject } from '../../utils/uploadedImageCanvas';
import { UPLOAD_IMAGE_RULES } from '../../config/uploads';
import { enterInlineTextEditing, isEditableTextObject } from '../../utils/textSelectionStyles';
import { enterPosterTextEditing, isPosterEditableText } from '../../utils/posterConversionCanvas';
import { MediaFittingControls } from './MediaFittingControls';
import { ContextualTextToolbar } from './ContextualTextToolbar';
import { moveLayerObject, type LayerOrderAction } from '../../utils/layerOrdering';
import { applyDiagramArrowStyle, getDiagramArrowAppearance } from '../../utils/diagramConnectors';
import { applyBoxStyle, getBoxAppearance } from '../../utils/boxStyling';

// ═══════════════════════════════════════════════════════════════════════════════
// FLOATING TOOLBAR — positioned near the selected element
// ═══════════════════════════════════════════════════════════════════════════════

const getEditableTextTargetsFromSelection = (object: fabric.Object | null | undefined) => {
  if (isEditableTextObject(object)) return [object];
  if (object?.type !== 'activeSelection') return [];
  return (object as fabric.ActiveSelection).getObjects().filter(isEditableTextObject);
};

export const ElementToolbar: React.FC = () => {
  const {
    canvas,
    selectedObject,
    deleteSelected,
    duplicateSelected,
    saveHistory,
    projectId,
    setSelectedObject,
    setFillColor: applyFillColor,
    setStrokeColor: applyStrokeColor,
    setStrokeWidth: applyStrokeWidth,
    setOpacity: applyOpacity,
  } = useEditorStore();
  const [fillColor, setFillColor] = useState('#8b5cf6');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(1);
  const [opacity, setOpacity] = useState(1);
  const [isLocked, setIsLocked] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [imageAction, setImageAction] = useState('');
  const [imageMessage, setImageMessage] = useState('');
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Floating toolbar positioning
  const [toolbarPos, setToolbarPos] = useState<{ left: number; top: number } | null>(null);

  // Three-dot overflow menu
  const [showOverflow, setShowOverflow] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const threeDotRef = useRef<HTMLButtonElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ left: number; top: number; submenuLeft: 'right' | 'left' }>({ left: 0, top: 0, submenuLeft: 'right' });

  // ─── Sync local state from selected object ───────────────────────────────
  useEffect(() => {
    if (!selectedObject) return;
    const arrowAppearance = getDiagramArrowAppearance(selectedObject);
    const boxAppearance = arrowAppearance ? null : getBoxAppearance(selectedObject);
    const currentFill = arrowAppearance?.arrowColor || boxAppearance?.fill || (selectedObject.get('fill') as string) || '#8b5cf6';
    const currentStroke = arrowAppearance?.strokeColor || boxAppearance?.stroke || (selectedObject.get('stroke') as string) || '#000000';
    const currentStrokeWidth = arrowAppearance?.strokeWidth || boxAppearance?.strokeWidth || (selectedObject.get('strokeWidth') as number) || 0;
    const currentOpacity = arrowAppearance?.opacity ?? boxAppearance?.opacity ?? selectedObject.get('opacity') ?? 1;
    const locked = Boolean(
      selectedObject.lockMovementX
      || selectedObject.lockMovementY
      || selectedObject.lockScalingX
      || selectedObject.lockScalingY
      || selectedObject.lockRotation
    );

    setFillColor(typeof currentFill === 'string' ? currentFill : '#8b5cf6');
    setStrokeColor(typeof currentStroke === 'string' ? currentStroke : '#000000');
    setStrokeWidth(currentStrokeWidth);
    setOpacity(currentOpacity);
    setIsLocked(locked);
    setImageMessage('');
  }, [selectedObject]);

  // ─── Track text editing state ────────────────────────────────────────────
  useEffect(() => {
    if (!canvas) return;
    const onEnter = () => setIsEditing(true);
    const onExit = () => setIsEditing(false);
    canvas.on('text:editing:entered', onEnter);
    canvas.on('text:editing:exited', onExit);
    return () => {
      canvas.off('text:editing:entered', onEnter);
      canvas.off('text:editing:exited', onExit);
    };
  }, [canvas]);

  // ─── Compute toolbar position relative to selected object ────────────────
  const updatePosition = useCallback(() => {
    if (!canvas || !selectedObject) {
      setToolbarPos(null);
      return;
    }

    const zoom = canvas.getZoom();
    const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    const canvasEl = canvas.getElement();
    if (!canvasEl) return;
    const canvasRect = canvasEl.getBoundingClientRect();

    const bounds = selectedObject.getBoundingRect(true, true);

    // Object top-center in screen coordinates
    const centerX = canvasRect.left + (bounds.left + bounds.width / 2) * zoom + vpt[4];
    const topY = canvasRect.top + bounds.top * zoom + vpt[5];

    const hasTextTargets = getEditableTextTargetsFromSelection(selectedObject).length > 0;
    const toolbarWidth = hasTextTargets
      ? Math.min(1180, window.innerWidth - 16)
      : selectedObject.type === 'image'
        ? 720
        : 480;
    const gap = 10;

    let left = centerX - toolbarWidth / 2;
    let top = topY - 44 - gap;

    // If above canvas area, place below the object
    if (top < canvasRect.top - 4) {
      top = canvasRect.top + (bounds.top + bounds.height) * zoom + vpt[5] + gap;
    }

    // Clamp horizontally to stay within viewport
    left = Math.max(canvasRect.left + 4, Math.min(left, canvasRect.right - toolbarWidth - 4));

    setToolbarPos({ left, top });

    // If overflow menu is open, re-anchor it relative to the three-dot button
    if (showOverflow && threeDotRef.current) {
      const dotRect = threeDotRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const openRight = dotRect.right + GAP + MENU_WIDTH < vw;
      const newMenuLeft = openRight ? dotRect.right + GAP : dotRect.left - GAP - MENU_WIDTH;
      let newMenuTop = dotRect.top;
      const estimatedHeight = 420;
      if (newMenuTop + estimatedHeight > vh - 8) newMenuTop = Math.max(8, vh - estimatedHeight - 8);
      if (newMenuTop < 8) newMenuTop = 8;
      const submenuGoesRight = openRight
        ? newMenuLeft + MENU_WIDTH + GAP + SUBMENU_WIDTH < vw
        : newMenuLeft - GAP - SUBMENU_WIDTH >= 0;
      setMenuAnchor({ left: newMenuLeft, top: newMenuTop, submenuLeft: submenuGoesRight ? 'right' : 'left' });
    }
  }, [canvas, selectedObject, showOverflow]);

  useEffect(() => {
    if (!canvas || !selectedObject || isEditing) {
      setToolbarPos(null);
      return;
    }

    updatePosition();

    // Reposition on every render, zoom, pan, or object change
    canvas.on('after:render', updatePosition);
    canvas.on('object:modified', updatePosition);
    canvas.on('object:scaling', updatePosition);
    canvas.on('object:rotating', updatePosition);
    canvas.on('selection:updated', updatePosition);

    return () => {
      canvas.off('after:render', updatePosition);
      canvas.off('object:modified', updatePosition);
      canvas.off('object:scaling', updatePosition);
      canvas.off('object:rotating', updatePosition);
      canvas.off('selection:updated', updatePosition);
    };
  }, [canvas, selectedObject, isEditing, updatePosition]);

  // ─── Close overflow on outside click ─────────────────────────────────────
  useEffect(() => {
    if (!showOverflow) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false);
        setOpenSubmenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOverflow]);

  // ─── Action handlers ─────────────────────────────────────────────────────
  if (isEditing || !selectedObject || !canvas || !toolbarPos) return null;
  const isArrowSelection = Boolean(getDiagramArrowAppearance(selectedObject));

  const handleFillChange = (color: string) => {
    setFillColor(color);
    if (isEditableTextObject(selectedObject)) {
      applyFillColor(color);
      return;
    }
    if (applyDiagramArrowStyle(canvas, selectedObject, { color }, { syncWholeArrowColor: true })) {
      canvas.renderAll();
      saveHistory();
      return;
    }
    if (applyBoxStyle(canvas, selectedObject, { fill: color })) {
      canvas.renderAll();
      saveHistory();
      return;
    }
    selectedObject.set('fill', color);
    canvas.renderAll();
    saveHistory();
  };

  const handleStrokeChange = (color: string) => {
    setStrokeColor(color);
    if (isEditableTextObject(selectedObject)) {
      applyStrokeColor(color);
      return;
    }
    if (applyDiagramArrowStyle(canvas, selectedObject, { color })) {
      canvas.renderAll();
      saveHistory();
      return;
    }
    if (applyBoxStyle(canvas, selectedObject, { stroke: color })) {
      canvas.renderAll();
      saveHistory();
      return;
    }
    selectedObject.set('stroke', color);
    canvas.renderAll();
    saveHistory();
  };

  const handleStrokeWidthChange = (width: number) => {
    setStrokeWidth(width);
    if (isEditableTextObject(selectedObject)) {
      applyStrokeWidth(width);
      return;
    }
    if (applyDiagramArrowStyle(canvas, selectedObject, { width })) {
      canvas.renderAll();
      saveHistory();
      return;
    }
    if (applyBoxStyle(canvas, selectedObject, { strokeWidth: width })) {
      canvas.renderAll();
      saveHistory();
      return;
    }
    selectedObject.set('strokeWidth', width);
    canvas.renderAll();
    saveHistory();
  };

  const handleOpacityChange = (val: number) => {
    setOpacity(val);
    if (isEditableTextObject(selectedObject)) {
      applyOpacity(val);
      return;
    }
    if (applyDiagramArrowStyle(canvas, selectedObject, { opacity: val })) {
      canvas.renderAll();
      saveHistory();
      return;
    }
    if (applyBoxStyle(canvas, selectedObject, { opacity: val })) {
      canvas.renderAll();
      saveHistory();
      return;
    }
    selectedObject.set('opacity', val);
    canvas.renderAll();
    saveHistory();
  };

  const handleFlipX = () => {
    selectedObject.set('flipX', !selectedObject.flipX);
    canvas.renderAll();
    saveHistory();
  };

  const handleFlipY = () => {
    selectedObject.set('flipY', !selectedObject.flipY);
    canvas.renderAll();
    saveHistory();
  };

  const handleToggleLock = () => {
    const nextLock = !isLocked;
    setIsLocked(nextLock);
    selectedObject.set({
      lockMovementX: nextLock,
      lockMovementY: nextLock,
      lockScalingX: nextLock,
      lockScalingY: nextLock,
      lockRotation: nextLock,
      locked: nextLock,
    } as Record<string, unknown>);
    canvas.renderAll();
    saveHistory();
    setShowOverflow(false);
  };

  const handleBringForward = () => {
    if (moveLayerObject(canvas, selectedObject, 'forward')) saveHistory();
  };

  const handleSendBackward = () => {
    if (moveLayerObject(canvas, selectedObject, 'backward')) saveHistory();
  };

  const handleReplaceImage = async (file: File) => {
    if (!canvas || selectedObject.type !== 'image') return;
    setImageAction('replace');
    setImageMessage('');
    try {
      const asset = await uploadImageAsset(file, projectId);
      await replaceFabricImageAsset(selectedObject as fabric.Image, asset);
      canvas.setActiveObject(selectedObject);
      canvas.requestRenderAll();
      setSelectedObject(selectedObject);
      saveHistory();
      window.dispatchEvent(new Event('teckstudio:uploads-changed'));
      setImageMessage('Image replaced');
    } catch (error) {
      setImageMessage(error instanceof Error ? error.message : 'Image replacement failed.');
    } finally {
      setImageAction('');
    }
  };

  const handleResetImage = () => {
    if (selectedObject.type !== 'image') return;
    resetUploadedImageObject(selectedObject as fabric.Image, canvas);
    setOpacity(1);
    setStrokeWidth(0);
    setIsLocked(true);
    saveHistory();
  };

  const openCropMode = () => {
    window.dispatchEvent(new CustomEvent('teckstudio:open-panel', { detail: { panel: 'properties' } }));
    window.setTimeout(() => window.dispatchEvent(new Event('teckstudio:start-image-crop')), 0);
  };

  // ─── Three-dot menu handlers ─────────────────────────────────────────────
  const MENU_WIDTH = 224; // min-w-[220px] + padding
  const SUBMENU_WIDTH = 164; // min-w-[160px] + padding
  const GAP = 6;

  const handleOverflowToggle = () => {
    if (threeDotRef.current) {
      const rect = threeDotRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Decide: open menu to the right or left of the trigger
      const openRight = rect.right + GAP + MENU_WIDTH < vw;
      const menuLeft = openRight ? rect.right + GAP : rect.left - GAP - MENU_WIDTH;

      // Clamp vertical position so menu stays within viewport
      let menuTop = rect.top;
      const estimatedMenuHeight = 420; // approximate full menu height
      if (menuTop + estimatedMenuHeight > vh - 8) {
        menuTop = Math.max(8, vh - estimatedMenuHeight - 8);
      }
      if (menuTop < 8) menuTop = 8;

      // Decide submenu direction based on where the parent menu landed
      const submenuGoesRight = openRight
        ? menuLeft + MENU_WIDTH + GAP + SUBMENU_WIDTH < vw
        : menuLeft - GAP - SUBMENU_WIDTH >= 0;

      setMenuAnchor({ left: menuLeft, top: menuTop, submenuLeft: submenuGoesRight ? 'right' : 'left' });
    }
    setShowOverflow(!showOverflow);
    setOpenSubmenu(null);
  };

  const handleAlign = (alignment: PageAlignment) => {
    alignObjectToPage(canvas, selectedObject, alignment, 0);
    canvas.renderAll();
    saveHistory();
    setShowOverflow(false);
    setOpenSubmenu(null);
  };

  const handleLayerAction = (action: LayerOrderAction) => {
    if (moveLayerObject(canvas, selectedObject, action)) saveHistory();
    setShowOverflow(false);
  };

  const handleToggleVisibility = () => {
    const currentVisible = selectedObject.visible !== false;
    selectedObject.set({ visible: !currentVisible });
    canvas.renderAll();
    setShowOverflow(false);
  };

  const handleGroup = () => {
    const active = canvas.getActiveObject();
    if (active && active.type === 'activeSelection') {
      (active as fabric.ActiveSelection).toGroup();
      canvas.renderAll();
      saveHistory();
    }
    setShowOverflow(false);
  };

  const handleUngroup = () => {
    const active = canvas.getActiveObject();
    if (active && active.type === 'group') {
      (active as fabric.Group).toActiveSelection();
      canvas.renderAll();
      saveHistory();
    }
    setShowOverflow(false);
  };

  const handleFlipH = () => {
    if (!selectedObject || !canvas) return;
    selectedObject.set('flipX', !selectedObject.flipX);
    canvas.renderAll();
    saveHistory();
    setShowOverflow(false);
  };

  const handleFlipV = () => {
    if (!selectedObject || !canvas) return;
    selectedObject.set('flipY', !selectedObject.flipY);
    canvas.renderAll();
    saveHistory();
    setShowOverflow(false);
  };

  const handleRotateCW = () => {
    if (!selectedObject || !canvas) return;
    selectedObject.rotate((selectedObject.angle || 0) + 45);
    canvas.renderAll();
    saveHistory();
    setShowOverflow(false);
  };

  const handleRotateCCW = () => {
    if (!selectedObject || !canvas) return;
    selectedObject.rotate((selectedObject.angle || 0) - 45);
    canvas.renderAll();
    saveHistory();
    setShowOverflow(false);
  };

  const handleAskTECKSTUDIO = () => {
    window.dispatchEvent(new CustomEvent('teckstudio:open-panel', { detail: { panel: 'ai' } }));
    setShowOverflow(false);
  };

  const handleEditText = () => {
    if (!isEditableTextObject(selectedObject)) return;
    const entered = isPosterEditableText(selectedObject)
      ? enterPosterTextEditing(canvas, selectedObject)
      : enterInlineTextEditing(canvas, selectedObject);
    if (entered) {
      setSelectedObject(selectedObject);
      window.dispatchEvent(new CustomEvent('teckstudio:open-panel', { detail: { panel: 'text-styles' } }));
    }
  };

  const handleDuplicate = () => {
    duplicateSelected();
    setShowOverflow(false);
  };

  const handleDelete = () => {
    deleteSelected();
    setShowOverflow(false);
  };

  const isMultiSelect = selectedObject.type === 'activeSelection';
  const isGroup = selectedObject.type === 'group';
  const isVisible = selectedObject.visible !== false;
  const isImage = selectedObject.type === 'image';
  const textTargets = getEditableTextTargetsFromSelection(selectedObject);

  if (textTargets.length > 0) {
    return createPortal(
      <ContextualTextToolbar position={toolbarPos} textTargets={textTargets} />,
      document.body,
    );
  }

  // ─── Alignment submenu items ─────────────────────────────────────────────
  const alignmentItems: { id: string; label: string; icon: React.ReactNode; alignment: PageAlignment }[] = [
    { id: 'align-left', label: 'Left', icon: <AlignStartVertical className="w-3 h-3" />, alignment: 'left' },
    { id: 'align-center-h', label: 'Centre', icon: <AlignCenterVertical className="w-3 h-3" />, alignment: 'center-horizontal' },
    { id: 'align-right', label: 'Right', icon: <AlignEndVertical className="w-3 h-3" />, alignment: 'right' },
    { id: 'align-top', label: 'Top', icon: <AlignStartHorizontal className="w-3 h-3" />, alignment: 'top' },
    { id: 'align-center-v', label: 'Middle', icon: <AlignCenterHorizontal className="w-3 h-3" />, alignment: 'center-vertical' },
    { id: 'align-bottom', label: 'Bottom', icon: <AlignEndHorizontal className="w-3 h-3" />, alignment: 'bottom' },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────
  return createPortal(
    <>
      {/* Toolbar */}
      <div
        style={{ left: toolbarPos.left, top: toolbarPos.top }}
        className="fixed z-50 flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 shadow-2xl text-xs text-zinc-200 select-none"
      >
        {isEditableTextObject(selectedObject) && (
          <>
            <button
              type="button"
              onClick={handleEditText}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-bold text-blue-300 hover:bg-blue-500/10"
              title="Edit text"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit Text
            </button>
            <div className="h-5 w-px bg-zinc-800" />
          </>
        )}
        {isImage && (
          <>
            <input
              ref={replaceInputRef}
              type="file"
              accept={UPLOAD_IMAGE_RULES.acceptAttribute}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleReplaceImage(file);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={Boolean(imageAction)}
              onClick={() => replaceInputRef.current?.click()}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-bold text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-40"
              title="Replace image while preserving its transform"
            >
              {imageAction === 'replace' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Replace className="h-3.5 w-3.5" />}
              Replace
            </button>
            <button
              type="button"
              disabled={Boolean(imageAction)}
              onClick={openCropMode}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-bold text-violet-300 hover:bg-violet-500/10 disabled:opacity-40"
              title="Open non-destructive crop controls"
            >
              <Crop className="h-3.5 w-3.5" /> Crop
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('teckstudio:open-panel', { detail: { panel: 'effects' } }))}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-bold text-fuchsia-300 hover:bg-fuchsia-500/10"
              title="Open image filters and background tools"
            >
              <WandSparkles className="h-3.5 w-3.5" /> Effects
            </button>
            <button
              type="button"
              onClick={handleResetImage}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-bold text-zinc-300 hover:bg-zinc-800"
              title="Reset image crop, filters, opacity, border, shadow, flip, rotation, and size"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <MediaFittingControls object={selectedObject} compact />
            {imageMessage && <span role="status" className="max-w-28 truncate text-[8px] text-zinc-500" title={imageMessage}>{imageMessage}</span>}
            <div className="h-5 w-px bg-zinc-800" title={imageMessage} />
          </>
        )}

        {/* Fill Color */}
        {!isImage && (
          <div className="flex items-center gap-1 border-r border-zinc-800 pr-2">
            <input
              type="color"
              value={fillColor.startsWith('#') ? fillColor : '#8b5cf6'}
              onChange={(e) => handleFillChange(e.target.value)}
              className="w-5 h-5 rounded border border-zinc-700 bg-transparent cursor-pointer"
              title={isArrowSelection ? 'Arrow Color' : 'Fill Color'}
            />
          </div>
        )}

        {/* Border */}
        <div className="flex items-center gap-1 border-r border-zinc-800 pr-2">
          <input
            type="color"
            value={strokeColor.startsWith('#') ? strokeColor : '#000000'}
            onChange={(e) => handleStrokeChange(e.target.value)}
            className="w-5 h-5 rounded border border-zinc-700 bg-transparent cursor-pointer"
            title={isArrowSelection ? 'Stroke Color' : 'Border Color'}
          />
          <input
            type="number"
            min={0}
            max={50}
            value={strokeWidth}
            onChange={(e) => handleStrokeWidthChange(parseFloat(e.target.value) || 0)}
            className="w-9 bg-zinc-950 border border-zinc-800 rounded px-1 py-0.5 text-center text-[10px]"
            title="Border Width"
          />
        </div>

        {/* Opacity */}
        <div className="flex items-center gap-1 border-r border-zinc-800 pr-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            className="w-14 h-1 accent-violet-500 bg-zinc-800 rounded cursor-pointer"
          />
          <span className="text-[9px] font-mono text-zinc-500 w-7">{Math.round(opacity * 100)}%</span>
        </div>

        {/* Flip */}
        <div className="flex items-center gap-0.5 border-r border-zinc-800 pr-2">
          <button onClick={handleFlipX} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors" title="Flip Horizontal">
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleFlipY} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors" title="Flip Vertical">
            <FlipVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Layer Quick Actions */}
        <div className="flex items-center gap-0.5 border-r border-zinc-800 pr-2">
          <button onClick={handleBringForward} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors" title="Bring Forward">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleSendBackward} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors" title="Send Backward">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Lock */}
        <button
          onClick={handleToggleLock}
          className={`p-1 rounded transition-colors ${isLocked ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'}`}
          title={isLocked ? 'Unlock' : 'Lock'}
        >
          {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>

        {/* Duplicate */}
        <button onClick={duplicateSelected} className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors" title="Duplicate">
          <Copy className="w-3.5 h-3.5" />
        </button>

        {/* Delete */}
        <button onClick={deleteSelected} className="p-1 rounded hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors" title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-zinc-800" />

        {/* Three-dot menu */}
        <button
          ref={threeDotRef}
          onClick={handleOverflowToggle}
          className={`p-1 rounded transition-colors ${showOverflow ? 'bg-zinc-700 text-zinc-200' : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'}`}
          title="More actions"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Overflow dropdown menu */}
      {showOverflow && createPortal(
        <div
          ref={overflowRef}
          style={{ position: 'fixed', left: menuAnchor.left, top: menuAnchor.top, zIndex: 200 }}
          className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-1.5 min-w-[220px] max-h-[calc(100vh-40px)] overflow-y-auto"
        >
          {/* Comment & AI */}
          <div className="px-1">
            <p className="px-2 py-1 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Quick Actions</p>
            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span className="flex-1 text-left">Comment</span>
            </button>
            <button onClick={handleAskTECKSTUDIO} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span className="flex-1 text-left">Ask TECKSTUDIO</span>
              <span className="text-[9px] text-zinc-600">AI</span>
            </button>
          </div>

          <div className="my-1 border-t border-zinc-800 mx-2" />

          {/* Layer actions */}
          <div className="px-1">
            <p className="px-2 py-1 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Arrange</p>
            <button onClick={() => handleLayerAction('front')} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer">
              <ChevronUp className="w-3.5 h-3.5" /> Bring to Front
            </button>
            <button onClick={() => handleLayerAction('forward')} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer">
              <ChevronUp className="w-3.5 h-3.5 opacity-60" /> Bring Forward
            </button>
            <button onClick={() => handleLayerAction('backward')} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer">
              <ChevronDown className="w-3.5 h-3.5 opacity-60" /> Send Backward
            </button>
            <button onClick={() => handleLayerAction('back')} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer">
              <ChevronDown className="w-3.5 h-3.5" /> Send to Back
            </button>
          </div>

          <div className="my-1 border-t border-zinc-800 mx-2" />

          {/* Align to Page submenu */}
          <div className="px-1 relative">
            <button
              onClick={() => setOpenSubmenu(openSubmenu === 'align' ? null : 'align')}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer"
            >
              <AlignStartVertical className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Align to Page</span>
              <ChevronRight className={`w-3 h-3 text-zinc-600 transition-transform ${openSubmenu === 'align' ? 'rotate-90' : ''}`} />
            </button>
            {openSubmenu === 'align' && (
              <div
                ref={submenuRef}
                className={`absolute top-0 ml-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-1.5 min-w-[160px] z-[201] ${
                  menuAnchor.submenuLeft === 'right' ? 'left-full' : 'right-full mr-1'
                }`}
                onMouseLeave={() => setOpenSubmenu(null)}
              >
                {alignmentItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAlign(item.alignment)}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer"
                  >
                    <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="my-1 border-t border-zinc-800 mx-2" />

          {/* Transform */}
          <div className="px-1">
            <p className="px-2 py-1 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Transform</p>
            <button onClick={handleFlipH} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer">
              <FlipHorizontal className="w-3.5 h-3.5" /> Flip Horizontal
            </button>
            <button onClick={handleFlipV} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer">
              <FlipVertical className="w-3.5 h-3.5" /> Flip Vertical
            </button>
            <button onClick={handleRotateCW} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer">
              <RotateCw className="w-3.5 h-3.5" /> Rotate +45°
            </button>
            <button onClick={handleRotateCCW} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" /> Rotate -45°
            </button>
          </div>

          <div className="my-1 border-t border-zinc-800 mx-2" />

          {/* Lock / Visibility */}
          <div className="px-1">
            <p className="px-2 py-1 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Visibility</p>
            <button onClick={handleToggleLock} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer">
              {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span className="flex-1 text-left">{isLocked ? 'Unlock' : 'Lock'}</span>
            </button>
            <button onClick={handleToggleVisibility} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer">
              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="flex-1 text-left">{isVisible ? 'Hide' : 'Show'}</span>
            </button>
          </div>

          <div className="my-1 border-t border-zinc-800 mx-2" />

          {/* Group / Ungroup */}
          <div className="px-1">
            <p className="px-2 py-1 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Group</p>
            <button
              onClick={handleGroup}
              disabled={!isMultiSelect}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Group className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Group</span>
            </button>
            <button
              onClick={handleUngroup}
              disabled={!isGroup}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Ungroup className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Ungroup</span>
            </button>
          </div>

          <div className="my-1 border-t border-zinc-800 mx-2" />

          {/* Duplicate / Delete */}
          <div className="px-1">
            <button onClick={handleDuplicate} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer">
              <Copy className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Duplicate</span>
              <span className="text-[9px] text-zinc-600">Ctrl+D</span>
            </button>
            <button onClick={handleDelete} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-red-400 hover:bg-red-500/10 rounded cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Delete</span>
              <span className="text-[9px] text-zinc-600">Del</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </>,
    document.body
  );
};

import React, { useEffect, useRef, useState } from 'react';
import {
  Copy, Trash2, Lock, Unlock, Eye, EyeOff, ArrowUp, ArrowDown,
  ArrowUpToLine, ArrowDownToLine, FlipHorizontal,
  FlipVertical, RotateCcw, RotateCw, Group, Ungroup,
  Clipboard, ClipboardPaste,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  ChevronRight,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { fabric } from 'fabric';
import { alignObjectToPage } from '../../utils/textSelectionStyles';
import type { PageAlignment } from '../../utils/textSelectionStyles';
import { moveLayerObject } from '../../utils/layerOrdering';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  divider?: boolean;
  disabled?: boolean;
  danger?: boolean;
  submenu?: { id: string; label: string; icon: React.ReactNode; action: () => void }[];
}

export const ContextMenu: React.FC = () => {
  const { canvas, selectedObject, deleteSelected, duplicateSelected, saveHistory } = useEditorStore();
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Only show on canvas area
      const target = e.target as HTMLElement;
      const canvasContainer = target.closest('.canvas-container') || target.closest('[data-canvas-area]');
      if (!canvasContainer && target !== document.querySelector('canvas')) {
        // Check if click is on the canvas element itself or its container
        if (!target.classList.contains('upper-canvas') && !target.classList.contains('lower-canvas')) {
          return;
        }
      }

      e.preventDefault();
      setPosition({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };

    const handleClick = () => {
      if (visible) setVisible(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false);
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (visible && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      let x = position.x;
      let y = position.y;
      if (x + rect.width > viewportW) x = viewportW - rect.width - 8;
      if (y + rect.height > viewportH) y = viewportH - rect.height - 8;
      if (x < 0) x = 8;
      if (y < 0) y = 8;
      setPosition({ x, y });
    }
  }, [visible, position]);

  const hasSelection = !!selectedObject;

  const handleCopy = () => {
    if (!canvas || !selectedObject) return;
    const json = selectedObject.toJSON(['id', 'name', 'elementKind', 'chartConfig', 'tableConfig', 'frameConfig', 'animationConfig', 'threeDConfig', 'videoConfig', 'photoConfig']);
    (canvas as any).__copiedObject = json;
    setVisible(false);
  };

  const handlePaste = () => {
    if (!canvas) return;
    const copied = (canvas as any).__copiedObject;
    if (!copied) return;
    fabric.util.enlivenObjects([copied], (objects: fabric.Object[]) => {
      objects.forEach((obj) => {
        obj.set({
          left: (obj.left || 0) + 20,
          top: (obj.top || 0) + 20,
          id: `obj_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        } as any);
        canvas.add(obj);
        canvas.setActiveObject(obj);
        canvas.renderAll();
      });
      saveHistory();
    }, 'fabric');
    setVisible(false);
  };

  const handleDuplicate = () => {
    duplicateSelected();
    setVisible(false);
  };

  const handleDelete = () => {
    deleteSelected();
    setVisible(false);
  };

  const handleLock = () => {
    if (!selectedObject) return;
    const locked = selectedObject.lockMovementX;
    selectedObject.set({
      lockMovementX: !locked,
      lockMovementY: !locked,
      lockScalingX: !locked,
      lockScalingY: !locked,
      lockRotation: !locked,
      hasControls: locked,
      borderColor: locked ? '#94a3b8' : '#8b5cf6',
    });
    canvas?.renderAll();
    setVisible(false);
  };

  const handleToggleVisibility = () => {
    if (!selectedObject || !canvas) return;
    const visible = selectedObject.visible !== false;
    selectedObject.set({ visible: !visible });
    canvas.renderAll();
    setVisible(false);
  };

  const handleBringForward = () => {
    if (!canvas || !selectedObject) return;
    if (moveLayerObject(canvas, selectedObject, 'forward')) saveHistory();
    setVisible(false);
  };

  const handleSendBackward = () => {
    if (!canvas || !selectedObject) return;
    if (moveLayerObject(canvas, selectedObject, 'backward')) saveHistory();
    setVisible(false);
  };

  const handleBringToFront = () => {
    if (!canvas || !selectedObject) return;
    if (moveLayerObject(canvas, selectedObject, 'front')) saveHistory();
    setVisible(false);
  };

  const handleSendToBack = () => {
    if (!canvas || !selectedObject) return;
    if (moveLayerObject(canvas, selectedObject, 'back')) saveHistory();
    setVisible(false);
  };

  const handleAlign = (alignment: PageAlignment) => {
    if (!canvas || !selectedObject) return;
    alignObjectToPage(canvas, selectedObject, alignment, 0);
    canvas.renderAll();
    saveHistory();
    setVisible(false);
    setOpenSubmenu(null);
  };

  const handleFlipH = () => {
    if (!selectedObject) return;
    selectedObject.set({ flipX: !selectedObject.flipX });
    canvas?.renderAll();
    saveHistory();
    setVisible(false);
  };

  const handleFlipV = () => {
    if (!selectedObject) return;
    selectedObject.set({ flipY: !selectedObject.flipY });
    canvas?.renderAll();
    saveHistory();
    setVisible(false);
  };

  const handleRotateCW = () => {
    if (!selectedObject) return;
    selectedObject.rotate((selectedObject.angle || 0) + 45);
    canvas?.renderAll();
    saveHistory();
    setVisible(false);
  };

  const handleRotateCCW = () => {
    if (!selectedObject) return;
    selectedObject.rotate((selectedObject.angle || 0) - 45);
    canvas?.renderAll();
    saveHistory();
    setVisible(false);
  };

  const handleGroup = () => {
    const activeObj = canvas?.getActiveObject();
    if (activeObj && activeObj.type === 'activeSelection') {
      (activeObj as fabric.ActiveSelection).toGroup();
      canvas?.renderAll();
      saveHistory();
    }
    setVisible(false);
  };

  const handleUngroup = () => {
    const activeObj = canvas?.getActiveObject();
    if (activeObj && activeObj.type === 'group') {
      (activeObj as fabric.Group).toActiveSelection();
      canvas?.renderAll();
      saveHistory();
    }
    setVisible(false);
  };

  const isLocked = selectedObject?.lockMovementX;
  const isVisible = selectedObject?.visible !== false;
  const isGroup = selectedObject?.type === 'group';
  const isActiveSelection = selectedObject?.type === 'activeSelection';

  const menuItems: MenuItem[] = [
    { id: 'copy', label: 'Copy', icon: <Copy className="w-3.5 h-3.5" />, shortcut: 'Ctrl+C', action: handleCopy, disabled: !hasSelection },
    { id: 'paste', label: 'Paste', icon: <ClipboardPaste className="w-3.5 h-3.5" />, shortcut: 'Ctrl+V', action: handlePaste },
    { id: 'duplicate', label: 'Duplicate', icon: <Clipboard className="w-3.5 h-3.5" />, shortcut: 'Ctrl+D', action: handleDuplicate, disabled: !hasSelection },
    { id: 'delete', label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, shortcut: 'Del', action: handleDelete, disabled: !hasSelection, danger: true },
    { id: 'div1', label: '', icon: null, action: () => {}, divider: true },
    { id: 'lock', label: isLocked ? 'Unlock' : 'Lock', icon: isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />, shortcut: 'Ctrl+L', action: handleLock, disabled: !hasSelection },
    { id: 'visibility', label: isVisible ? 'Hide' : 'Show', icon: isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />, action: handleToggleVisibility, disabled: !hasSelection },
    { id: 'div2', label: '', icon: null, action: () => {}, divider: true },
    { id: 'bring-front', label: 'Bring to Front', icon: <ArrowUpToLine className="w-3.5 h-3.5" />, shortcut: 'Ctrl+]', action: handleBringToFront, disabled: !hasSelection },
    { id: 'bring-forward', label: 'Bring Forward', icon: <ArrowUp className="w-3.5 h-3.5" />, action: handleBringForward, disabled: !hasSelection },
    { id: 'send-backward', label: 'Send Backward', icon: <ArrowDown className="w-3.5 h-3.5" />, action: handleSendBackward, disabled: !hasSelection },
    { id: 'send-back', label: 'Send to Back', icon: <ArrowDownToLine className="w-3.5 h-3.5" />, shortcut: 'Ctrl+[', action: handleSendToBack, disabled: !hasSelection },
    { id: 'div3', label: '', icon: null, action: () => {}, divider: true },
    {
      id: 'align',
      label: 'Align to Page',
      icon: <AlignStartVertical className="w-3.5 h-3.5" />,
      action: () => {},
      disabled: !hasSelection,
      submenu: [
        { id: 'align-left', label: 'Left', icon: <AlignStartVertical className="w-3 h-3" />, action: () => handleAlign('left') },
        { id: 'align-center-h', label: 'Centre', icon: <AlignCenterVertical className="w-3 h-3" />, action: () => handleAlign('center-horizontal') },
        { id: 'align-right', label: 'Right', icon: <AlignEndVertical className="w-3 h-3" />, action: () => handleAlign('right') },
        { id: 'align-top', label: 'Top', icon: <AlignStartHorizontal className="w-3 h-3" />, action: () => handleAlign('top') },
        { id: 'align-center-v', label: 'Middle', icon: <AlignCenterHorizontal className="w-3 h-3" />, action: () => handleAlign('center-vertical') },
        { id: 'align-bottom', label: 'Bottom', icon: <AlignEndHorizontal className="w-3 h-3" />, action: () => handleAlign('bottom') },
      ],
    },
    { id: 'div4', label: '', icon: null, action: () => {}, divider: true },
    { id: 'flip-h', label: 'Flip Horizontal', icon: <FlipHorizontal className="w-3.5 h-3.5" />, action: handleFlipH, disabled: !hasSelection },
    { id: 'flip-v', label: 'Flip Vertical', icon: <FlipVertical className="w-3.5 h-3.5" />, action: handleFlipV, disabled: !hasSelection },
    { id: 'rotate-cw', label: 'Rotate +45°', icon: <RotateCw className="w-3.5 h-3.5" />, action: handleRotateCW, disabled: !hasSelection },
    { id: 'rotate-ccw', label: 'Rotate -45°', icon: <RotateCcw className="w-3.5 h-3.5" />, action: handleRotateCCW, disabled: !hasSelection },
    { id: 'div4', label: '', icon: null, action: () => {}, divider: true },
    { id: 'group', label: 'Group', icon: <Group className="w-3.5 h-3.5" />, shortcut: 'Ctrl+G', action: handleGroup, disabled: !isActiveSelection },
    { id: 'ungroup', label: 'Ungroup', icon: <Ungroup className="w-3.5 h-3.5" />, shortcut: 'Ctrl+Shift+G', action: handleUngroup, disabled: !isGroup },
  ];

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[200px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: position.x, top: position.y }}
    >
      {menuItems.map((item) =>
        item.divider ? (
          <div key={item.id} className="my-1 border-t border-zinc-800" />
        ) : item.submenu ? (
          <div
            key={item.id}
            className="relative"
            onMouseEnter={() => setOpenSubmenu(item.id)}
            onMouseLeave={() => setOpenSubmenu(null)}
          >
            <button
              disabled={item.disabled}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer
                ${item.disabled ? 'opacity-40 cursor-not-allowed text-zinc-500' : 'text-zinc-300 hover:bg-zinc-800'}
              `}
            >
              <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronRight className="w-3 h-3 text-zinc-600" />
            </button>
            {openSubmenu === item.id && item.submenu && (
              <div className="absolute left-full top-0 ml-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-1.5 min-w-[180px] z-[101]">
                {item.submenu.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={sub.action}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 rounded cursor-pointer"
                  >
                    <span className="w-4 h-4 flex items-center justify-center">{sub.icon}</span>
                    <span className="flex-1 text-left">{sub.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            key={item.id}
            onClick={item.action}
            disabled={item.disabled}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer
              ${item.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-zinc-300 hover:bg-zinc-800'}
              ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}
            `}
          >
            <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {item.shortcut && (
              <span className="text-[9px] text-zinc-600 ml-4">{item.shortcut}</span>
            )}
          </button>
        )
      )}
    </div>
  );
};

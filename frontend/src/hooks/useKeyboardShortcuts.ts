import { useEffect } from 'react';
import { fabric } from 'fabric';
import { useEditorStore } from '../store/useEditorStore';
import { isEditableTextObject } from '../utils/textSelectionStyles';
import { masterTimelineManager } from '../utils/masterTimelineManager';

export const useKeyboardShortcuts = () => {
  const {
    canvas,
    selectedObject,
    setSelectedObject,
    undo,
    redo,
    deleteSelected,
    duplicateSelected,
    groupSelected,
    ungroupSelected,
    saveHistory,
    setZoom,
    zoom,
    setFillColor,
    setStrokeColor,
    setFontWeight,
    setFontStyle,
    setUnderline,
    setTextAlign,
  } = useEditorStore();

  useEffect(() => {
    if (!canvas) return;

    let clipboard: fabric.Object | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputActive = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as any).contentEditable === 'true'
      );

      const activeObject = canvas.getActiveObject();
      const isEditingText = isEditableTextObject(activeObject) && activeObject.isEditing === true;

      if (isInputActive || isEditingText) {
        // Allow Ctrl/Cmd shortcuts even in inputs for save, undo, etc.
        const isCtrl = e.ctrlKey || e.metaKey;
        if (isCtrl && ['s', 'z', 'y', 'c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
          // Let browser handle these in inputs
          return;
        }
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;

      // Spacebar - Play/Pause Timeline
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        const state = useEditorStore.getState();
        if (state.timelinePlaybackState === 'playing') {
          masterTimelineManager.pause();
        } else {
          void masterTimelineManager.play();
        }
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }

      // Arrow Keys - Nudge
      else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedObject) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          if (e.key === 'ArrowUp') selectedObject.set('top', (selectedObject.top || 0) - step);
          if (e.key === 'ArrowDown') selectedObject.set('top', (selectedObject.top || 0) + step);
          if (e.key === 'ArrowLeft') selectedObject.set('left', (selectedObject.left || 0) - step);
          if (e.key === 'ArrowRight') selectedObject.set('left', (selectedObject.left || 0) + step);
          selectedObject.setCoords();
          canvas.renderAll();
          if ((window as any)._nudgeTimeout) clearTimeout((window as any)._nudgeTimeout);
          (window as any)._nudgeTimeout = setTimeout(() => saveHistory(), 300);
        }
      }

      // Ctrl+S - Save
      else if (isCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveHistory();
      }

      // Ctrl+A - Select All
      else if (isCtrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        canvas.discardActiveObject();
        const objs = canvas.getObjects().filter(o => o.selectable);
        if (objs.length > 0) {
          const activeSelection = new fabric.ActiveSelection(objs, { canvas });
          canvas.setActiveObject(activeSelection);
          canvas.requestRenderAll();
          setSelectedObject(activeSelection);
        }
      }

      // Ctrl+Z - Undo
      else if (isCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }

      // Ctrl+Y or Ctrl+Shift+Z - Redo
      else if ((isCtrl && e.key.toLowerCase() === 'y') || (isCtrl && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        redo();
      }

      // Ctrl+C - Copy
      else if (isCtrl && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (selectedObject) {
          selectedObject.clone((cloned: fabric.Object) => { clipboard = cloned; });
        }
      }

      // Ctrl+V - Paste
      else if (isCtrl && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        if (clipboard) {
          clipboard.clone((clonedObj: fabric.Object) => {
            canvas.discardActiveObject();
            clonedObj.set({ left: (clonedObj.left || 0) + 15, top: (clonedObj.top || 0) + 15, evented: true });
            if (clonedObj.type === 'activeSelection') {
              clonedObj.canvas = canvas;
              (clonedObj as any).forEachObject((obj: fabric.Object) => canvas.add(obj));
              canvas.setActiveObject(clonedObj);
            } else {
              canvas.add(clonedObj);
              canvas.setActiveObject(clonedObj);
            }
            clipboard!.left = (clipboard!.left || 0) + 15;
            clipboard!.top = (clipboard!.top || 0) + 15;
            canvas.requestRenderAll();
            setSelectedObject(clonedObj);
            saveHistory();
          });
        }
      }

      // Ctrl+X - Cut
      else if (isCtrl && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        if (selectedObject) {
          selectedObject.clone((cloned: fabric.Object) => { clipboard = cloned; });
          deleteSelected();
        }
      }

      // Ctrl+D - Duplicate
      else if (isCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
      }

      // Ctrl+G - Group
      else if (isCtrl && !e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        groupSelected();
      }

      // Ctrl+Shift+G - Ungroup
      else if (isCtrl && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        ungroupSelected();
      }

      // Ctrl+B - Bold
      else if (isCtrl && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setFontWeight(useEditorStore.getState().fontWeight === 'bold' ? 'normal' : 'bold');
      }

      // Ctrl+I - Italic
      else if (isCtrl && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setFontStyle(useEditorStore.getState().fontStyle === 'italic' ? 'normal' : 'italic');
      }

      // Ctrl+U - Underline
      else if (isCtrl && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        setUnderline(!useEditorStore.getState().underline);
      }

      // Ctrl+L - Align Left
      else if (isCtrl && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setTextAlign('left');
      }

      // Ctrl+E - Align Center
      else if (isCtrl && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setTextAlign('center');
      }

      // Ctrl+R - Align Right
      else if (isCtrl && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setTextAlign('right');
      }

      // Ctrl+] - Bring Forward
      else if (isCtrl && e.key === ']') {
        e.preventDefault();
        if (selectedObject && canvas) {
          canvas.bringForward(selectedObject);
          canvas.renderAll();
          saveHistory();
        }
      }

      // Ctrl+[ - Send Backward
      else if (isCtrl && e.key === '[') {
        e.preventDefault();
        if (selectedObject && canvas) {
          canvas.sendBackwards(selectedObject);
          canvas.renderAll();
          saveHistory();
        }
      }

      // Ctrl++ - Zoom In
      else if (isCtrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom(Math.min(zoom + 0.1, 5.0));
      }

      // Ctrl+- - Zoom Out
      else if (isCtrl && e.key === '-') {
        e.preventDefault();
        setZoom(Math.max(zoom - 0.1, 0.1));
      }

      // Ctrl+0 - Reset Zoom
      else if (isCtrl && e.key === '0') {
        e.preventDefault();
        setZoom(1.0);
      }

      // Space - Pan mode (hold)
      else if (e.key === ' ' && !isCtrl) {
        e.preventDefault();
        canvas.defaultCursor = 'grab';
        canvas.selection = false;
      }

      // Escape - Deselect
      else if (e.key === 'Escape') {
        canvas.discardActiveObject();
        canvas.renderAll();
        setSelectedObject(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && canvas) {
        canvas.defaultCursor = 'default';
        canvas.selection = true;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [canvas, selectedObject, deleteSelected, duplicateSelected, groupSelected, ungroupSelected, undo, redo, setSelectedObject, saveHistory, setZoom, zoom, setFillColor, setStrokeColor, setFontWeight, setFontStyle, setUnderline, setTextAlign]);
};

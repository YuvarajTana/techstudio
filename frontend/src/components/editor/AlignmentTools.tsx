import React from 'react';
import { fabric } from 'fabric';
import { useEditorStore } from '../../store/useEditorStore';
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  FlipHorizontal2,
  FlipVertical2,
  Crosshair,
} from 'lucide-react';
import type { PageAlignment } from '../../utils/textSelectionStyles';
import { alignObjectToPage } from '../../utils/textSelectionStyles';
import { replaceArchitectureCard } from '../../utils/architectureDiagram';
import { tidyPosterLayout } from '../../utils/posterLayoutTools';

interface AlignAction {
  title: string;
  icon: React.ReactNode;
  alignment?: PageAlignment;
  action?: (obj: fabric.Object) => void;
}

const btnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  background: 'rgb(24, 24, 27)',
  border: '1px solid rgb(39, 39, 42)',
  borderRadius: '0.5rem',
  color: '#a1a1aa',
  cursor: 'pointer',
  padding: 0,
  transition: 'background 0.15s, color 0.15s',
};

const hoverIn = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = 'rgb(39, 39, 42)';
  e.currentTarget.style.color = '#e4e4e7';
};

const hoverOut = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.background = 'rgb(24, 24, 27)';
  e.currentTarget.style.color = '#a1a1aa';
};

export const AlignmentTools: React.FC = () => {
  const { canvas, selectedObject, saveHistory } = useEditorStore();
  const [pageMargin, setPageMargin] = React.useState(0);
  const [tidyMessage, setTidyMessage] = React.useState('');

  if (!canvas || !selectedObject) return null;

  const alignActions: AlignAction[] = [
    { title: 'Align Left to Page', icon: <AlignStartVertical size={16} />, alignment: 'left' },
    { title: 'Align Horizontal Center', icon: <AlignCenterVertical size={16} />, alignment: 'center-horizontal' },
    { title: 'Align Right to Page', icon: <AlignEndVertical size={16} />, alignment: 'right' },
    { title: 'Align Top to Page', icon: <AlignStartHorizontal size={16} />, alignment: 'top' },
    { title: 'Align Vertical Center', icon: <AlignCenterHorizontal size={16} />, alignment: 'center-vertical' },
    { title: 'Align Bottom to Page', icon: <AlignEndHorizontal size={16} />, alignment: 'bottom' },
    { title: 'Align to Page Center', icon: <Crosshair size={16} />, alignment: 'center' },
  ];

  const flipActions: AlignAction[] = [
    {
      title: 'Flip Horizontal',
      icon: <FlipHorizontal2 size={16} />,
      action: (obj) => obj.set('flipX', !obj.get('flipX')),
    },
    {
      title: 'Flip Vertical',
      icon: <FlipVertical2 size={16} />,
      action: (obj) => obj.set('flipY', !obj.get('flipY')),
    },
  ];

  const handleAction = (act: AlignAction) => {
    if (act.alignment) {
      alignObjectToPage(canvas, selectedObject, act.alignment, pageMargin);
    } else if (act.action) {
      act.action(selectedObject);
      selectedObject.setCoords();
      canvas.requestRenderAll();
    }
    saveHistory();
  };

  const distributeSelection = (axis: 'horizontal' | 'vertical') => {
    if (selectedObject.type !== 'activeSelection') return;
    const objects = (selectedObject as fabric.ActiveSelection).getObjects();
    if (objects.length < 3) return;

    canvas.discardActiveObject();
    objects.forEach((object) => object.setCoords());
    const sorted = [...objects].sort((first, second) => {
      const firstBounds = first.getBoundingRect(true, true);
      const secondBounds = second.getBoundingRect(true, true);
      return axis === 'horizontal'
        ? firstBounds.left - secondBounds.left
        : firstBounds.top - secondBounds.top;
    });
    const bounds = sorted.map((object) => object.getBoundingRect(true, true));
    const start = axis === 'horizontal' ? bounds[0].left : bounds[0].top;
    const finalBounds = bounds[bounds.length - 1];
    const end = axis === 'horizontal'
      ? finalBounds.left + finalBounds.width
      : finalBounds.top + finalBounds.height;
    const occupied = bounds.reduce((sum, bound) => sum + (axis === 'horizontal' ? bound.width : bound.height), 0);
    const gap = (end - start - occupied) / (sorted.length - 1);
    let cursor = start;

    sorted.forEach((object, index) => {
      const bound = object.getBoundingRect(true, true);
      if (index > 0 && index < sorted.length - 1) {
        if (axis === 'horizontal') {
          object.set('left', (object.left || 0) + cursor - bound.left);
        } else {
          object.set('top', (object.top || 0) + cursor - bound.top);
        }
        object.setCoords();
      }
      const currentBounds = object.getBoundingRect(true, true);
      cursor += (axis === 'horizontal' ? currentBounds.width : currentBounds.height) + gap;
    });

    const nextSelection = new fabric.ActiveSelection(objects, { canvas });
    canvas.setActiveObject(nextSelection);
    canvas.requestRenderAll();
    saveHistory();
  };

  const matchSelectionSize = (dimension: 'width' | 'height') => {
    if (selectedObject.type !== 'activeSelection') return;
    const objects = (selectedObject as fabric.ActiveSelection).getObjects();
    if (objects.length < 2) return;
    const referenceBounds = objects[0].getBoundingRect(true, true);
    const targetSize = dimension === 'width' ? referenceBounds.width : referenceBounds.height;
    canvas.discardActiveObject();

    const nextObjects = objects.map((object, index) => {
      if (index === 0) return object;
      if (object.get('teckstudioObjectType' as keyof fabric.Object) === 'architectureNode') {
        return replaceArchitectureCard(canvas, object, { [dimension]: targetSize }) || object;
      }
      const bounds = object.getBoundingRect(true, true);
      const currentSize = dimension === 'width' ? bounds.width : bounds.height;
      if (currentSize <= 0) return object;
      if (dimension === 'width') {
        object.set('scaleX', (object.scaleX || 1) * targetSize / currentSize);
      } else {
        object.set('scaleY', (object.scaleY || 1) * targetSize / currentSize);
      }
      object.setCoords();
      return object;
    });

    canvas.setActiveObject(new fabric.ActiveSelection(nextObjects, { canvas }));
    canvas.requestRenderAll();
    saveHistory();
  };

  const handleTidyPosterLayout = () => {
    const selectedObjects = selectedObject.type === 'activeSelection'
      ? (selectedObject as fabric.ActiveSelection).getObjects()
      : [selectedObject];
    const result = tidyPosterLayout(canvas, selectedObjects.length >= 6 ? selectedObjects : undefined);
    setTidyMessage(result.message);
    if (result.ok) saveHistory();
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Poster Layout</div>
        <button
          type="button"
          onClick={handleTidyPosterLayout}
          className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-bold text-emerald-200 hover:border-emerald-400 hover:text-white"
          title="Align / Tidy Layout"
        >
          Align / Tidy Layout
        </button>
        {tidyMessage && <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">{tidyMessage}</p>}
      </div>

      <div className="h-px bg-zinc-800" />

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Align to Page</span>
          <select
            value={pageMargin}
            onChange={(event) => setPageMargin(Number(event.target.value))}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300 outline-none"
            title="Page margin"
          >
            <option value={0}>0px</option>
            <option value={16}>16px</option>
            <option value={24}>24px</option>
            <option value={32}>32px</option>
          </select>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
            justifyItems: 'center',
          }}
        >
          {alignActions.map((action) => (
            <button
              key={action.title}
              title={action.title}
              onClick={() => handleAction(action)}
              style={btnStyle}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              {action.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-zinc-800" />

      {selectedObject.type === 'activeSelection' && (selectedObject as fabric.ActiveSelection).getObjects().length >= 3 && (
        <>
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Equal Spacing</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => distributeSelection('horizontal')} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-[10px] font-bold text-zinc-300 hover:border-violet-500/50 hover:text-white">
                Distribute Horizontal
              </button>
              <button type="button" onClick={() => distributeSelection('vertical')} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-[10px] font-bold text-zinc-300 hover:border-violet-500/50 hover:text-white">
                Distribute Vertical
              </button>
              <button type="button" onClick={() => matchSelectionSize('width')} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-[10px] font-bold text-zinc-300 hover:border-cyan-500/50 hover:text-white">
                Match Width
              </button>
              <button type="button" onClick={() => matchSelectionSize('height')} className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-[10px] font-bold text-zinc-300 hover:border-cyan-500/50 hover:text-white">
                Match Height
              </button>
            </div>
          </div>
          <div className="h-px bg-zinc-800" />
        </>
      )}

      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Flip</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {flipActions.map((action) => (
            <button
              key={action.title}
              title={action.title}
              onClick={() => handleAction(action)}
              style={btnStyle}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              {action.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

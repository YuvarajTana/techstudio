import React, { memo, useEffect, useMemo, useState } from 'react';
import type { DragEvent, KeyboardEvent, MouseEvent } from 'react';
import { fabric } from 'fabric';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Eye,
  EyeOff,
  Folder,
  Image as ImageIcon,
  Lock,
  Palette,
  PenTool,
  Square,
  Star,
  Trash2,
  Type,
  Unlock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './LayerItem.css';
import { getLayerDisplayName, getLayerMetadata } from './layerUtils';

type LayerDirection = -1 | 1;

type LayerItemProps = {
  layer: fabric.Object;
  layerId: string;
  displayIndex: number;
  totalLayers: number;
  selected: boolean;
  locked: boolean;
  visible: boolean;
  dragging: boolean;
  onSelect: (layer: fabric.Object, event: MouseEvent<HTMLDivElement>) => void;
  onRename: (layerId: string, name: string) => void;
  onToggleVisibility: (layer: fabric.Object) => void;
  onToggleLock: (layer: fabric.Object) => void;
  onMoveUp: (layer: fabric.Object, toFront: boolean) => void;
  onMoveDown: (layer: fabric.Object, toBack: boolean) => void;
  onDelete: (layer: fabric.Object) => void;
  onNavigate: (layer: fabric.Object, direction: LayerDirection) => void;
  onDragStart: (layerId: string, event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (layer: fabric.Object, displayIndex: number, event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
};

const textTypes = new Set(['text', 'textbox', 'i-text']);
const shapeTypes = new Set(['rect', 'circle', 'triangle', 'polygon', 'line', 'ellipse']);

const readString = (layer: fabric.Object, key: string) => {
  const value = layer.get(key as keyof fabric.Object);
  return typeof value === 'string' ? value.trim() : '';
};


const getLayerIcon = (layer: fabric.Object): LucideIcon => {
  const type = layer.type || 'layer';
  const objectType = readString(layer, 'objectType');

  if (textTypes.has(type)) return Type;
  if (type === 'image') return ImageIcon;
  if (type === 'group') return Folder;
  if (objectType === 'sticker') return Star;
  if (objectType === 'graphic') return Palette;
  if (type === 'circle' || type === 'ellipse') return Circle;
  if (shapeTypes.has(type)) return Square;
  if (type === 'path') return PenTool;
  return Square;
};

type LayerActionButtonProps = {
  label: string;
  disabled?: boolean;
  destructive?: boolean;
  active?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
};

const LayerActionButton = ({
  label,
  disabled = false,
  destructive = false,
  active = false,
  onClick,
  children,
}: LayerActionButtonProps) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className={`layer-item-action ${active ? 'layer-item-action--active' : ''} ${destructive ? 'layer-item-action--danger' : ''}`}
  >
    {children}
  </button>
);

const LayerItemComponent = ({
  layer,
  layerId,
  displayIndex,
  totalLayers,
  selected,
  locked,
  visible,
  dragging,
  onSelect,
  onRename,
  onToggleVisibility,
  onToggleLock,
  onMoveUp,
  onMoveDown,
  onDelete,
  onNavigate,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: LayerItemProps) => {
  const name = getLayerDisplayName(layer, displayIndex);
  const metadata = getLayerMetadata(layer);
  const Icon = getLayerIcon(layer);
  const groupObjects = useMemo(
    () => layer.type === 'group' ? (layer as fabric.Group).getObjects() : [],
    [layer],
  );
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(name);
  const [groupExpanded, setGroupExpanded] = useState(false);

  useEffect(() => {
    if (!isRenaming) setRenameDraft(name);
  }, [isRenaming, name]);

  const commitRename = () => {
    const nextName = renameDraft.trim();
    if (nextName && nextName !== name) onRename(layerId, nextName);
    setRenameDraft(nextName || name);
    setIsRenaming(false);
  };

  const cancelRename = () => {
    setRenameDraft(name);
    setIsRenaming(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault();
      event.stopPropagation();
      setRenameDraft(name);
      setIsRenaming(true);
      return;
    }

    if (event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      onSelect(layer, event as unknown as MouseEvent<HTMLDivElement>);
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      const direction: LayerDirection = event.key === 'ArrowUp' ? -1 : 1;
      if (event.altKey) {
        if (direction === -1) onMoveUp(layer, event.shiftKey);
        else onMoveDown(layer, event.shiftKey);
      } else {
        onNavigate(layer, direction);
      }
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      event.stopPropagation();
      onDelete(layer);
    }
  };

  return (
    <div className="layer-item-shell">
      <div
        id={`layer-item-${layerId}`}
        data-layer-id={layerId}
        data-selected={selected ? 'true' : 'false'}
        role="option"
        aria-selected={selected}
        aria-label={`${name}, ${metadata}${locked ? ', locked' : ''}${visible ? '' : ', hidden'}`}
        tabIndex={selected ? 0 : -1}
        draggable={!isRenaming}
        onDragStart={(event) => onDragStart(layerId, event)}
        onDragOver={onDragOver}
        onDrop={(event) => onDrop(layer, displayIndex, event)}
        onDragEnd={onDragEnd}
        onClick={(event) => onSelect(layer, event)}
        onKeyDown={handleKeyDown}
        className={`layer-item-card ${selected ? 'layer-item-card--selected' : ''} ${dragging ? 'layer-item-card--dragging' : ''} ${visible ? '' : 'layer-item-card--hidden'}`}
      >
        <div className="layer-item-icon" aria-hidden="true">
          {groupObjects.length > 0 ? (
            <button
              type="button"
              aria-label={groupExpanded ? 'Collapse group' : 'Expand group'}
              aria-expanded={groupExpanded}
              title={groupExpanded ? 'Collapse group' : 'Expand group'}
              onClick={(event) => {
                event.stopPropagation();
                setGroupExpanded((current) => !current);
              }}
              className="layer-item-group-toggle"
            >
              {groupExpanded ? <ChevronDown className="h-[18px] w-[18px]" /> : <ChevronRight className="h-[18px] w-[18px]" />}
              <Icon className="h-5 w-5" />
            </button>
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>

        <div className="layer-item-copy">
          {isRenaming ? (
            <input
              type="text"
              value={renameDraft}
              aria-label="Layer name"
              autoFocus
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setRenameDraft(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onBlur={commitRename}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitRename();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelRename();
                }
              }}
              className="layer-item-rename"
            />
          ) : (
            <button
              type="button"
              onDoubleClick={(event) => {
                event.stopPropagation();
                setRenameDraft(name);
                setIsRenaming(true);
              }}
              className="layer-item-name"
              title={`${name} — double-click to rename`}
            >
              {name}
            </button>
          )}
          <span className="layer-item-metadata" title={metadata}>{metadata}</span>
        </div>

        <div className="layer-item-actions" onClick={(event) => event.stopPropagation()}>
          <LayerActionButton
            label={visible ? 'Hide layer' : 'Show layer'}
            active={!visible}
            onClick={() => onToggleVisibility(layer)}
          >
            {visible ? <Eye className="h-[19px] w-[19px]" /> : <EyeOff className="h-[19px] w-[19px]" />}
          </LayerActionButton>
          <LayerActionButton
            label={locked ? 'Unlock layer' : 'Lock layer'}
            active={locked}
            onClick={() => onToggleLock(layer)}
          >
            {locked ? <Lock className="h-[19px] w-[19px]" /> : <Unlock className="h-[19px] w-[19px]" />}
          </LayerActionButton>
          <LayerActionButton
            label="Move layer up (Shift-click to move to front)"
            disabled={displayIndex === 0}
            onClick={(event) => onMoveUp(layer, event.shiftKey)}
          >
            <ChevronUp className="h-[19px] w-[19px]" />
          </LayerActionButton>
          <LayerActionButton
            label="Move layer down (Shift-click to move to back)"
            disabled={displayIndex === totalLayers - 1}
            onClick={(event) => onMoveDown(layer, event.shiftKey)}
          >
            <ChevronDown className="h-[19px] w-[19px]" />
          </LayerActionButton>
          <LayerActionButton
            label="Delete layer"
            destructive
            onClick={() => onDelete(layer)}
          >
            <Trash2 className="h-[19px] w-[19px]" />
          </LayerActionButton>
        </div>
      </div>

      {groupObjects.length > 0 && (
        <div className={`layer-item-children-grid ${groupExpanded ? 'layer-item-children-grid--expanded' : ''}`}>
          <div className="overflow-hidden">
            <div className="layer-item-children" role="group" aria-label={`${name} children`}>
              {groupObjects.map((child, childIndex) => {
                const ChildIcon = getLayerIcon(child);
                const childName = getLayerDisplayName(child, childIndex);
                return (
                  <div key={`${layerId}-child-${childIndex}`} className="layer-item-child">
                    <ChildIcon className="h-4 w-4 shrink-0 text-zinc-600" aria-hidden="true" />
                    <span className="truncate">{childName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const LayerItem = memo(LayerItemComponent);

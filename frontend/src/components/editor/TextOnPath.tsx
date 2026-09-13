import React, { useState } from 'react';
import { Type, Circle, ArrowRight, Heart, Star, Hexagon } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { fabric } from 'fabric';

type PathType = 'circle' | 'wave' | 'spiral' | 'heart' | 'star' | 'custom';

export const TextOnPath: React.FC = () => {
  const { canvas, saveHistory } = useEditorStore();
  const [text, setText] = useState('Your text here');
  const [pathType, setPathType] = useState<PathType>('circle');
  const [fontSize, setFontSize] = useState(24);

  const createTextOnPath = () => {
    if (!canvas || !text.trim()) return;

    const centerX = canvas.getWidth() / 2;
    const centerY = canvas.getHeight() / 2;
    const radius = 150;

    let pathString = '';

    switch (pathType) {
      case 'circle':
        pathString = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX + radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX - radius} ${centerY}`;
        break;
      case 'wave':
        pathString = `M ${centerX - 200} ${centerY} Q ${centerX - 100} ${centerY - 80} ${centerX} ${centerY} Q ${centerX + 100} ${centerY + 80} ${centerX + 200} ${centerY}`;
        break;
      case 'spiral':
        pathString = `M ${centerX} ${centerY} C ${centerX + 50} ${centerY - 50} ${centerX + 100} ${centerY} ${centerX + 50} ${centerY + 50} C ${centerX} ${centerY + 100} ${centerX - 50} ${centerY + 50} ${centerX} ${centerY}`;
        break;
      case 'heart':
        pathString = `M ${centerX} ${centerY - 50} C ${centerX - 50} ${centerY - 100} ${centerX - 100} ${centerY - 50} ${centerX - 100} ${centerY} C ${centerX - 100} ${centerY + 50} ${centerX} ${centerY + 150} ${centerX} ${centerY + 150} C ${centerX} ${centerY + 150} ${centerX + 100} ${centerY + 50} ${centerX + 100} ${centerY} C ${centerX + 100} ${centerY - 50} ${centerX + 50} ${centerY - 100} ${centerX} ${centerY - 50}`;
        break;
      case 'star':
        pathString = `M ${centerX} ${centerY - 150} L ${centerX + 50} ${centerY - 50} L ${centerX + 150} ${centerY - 50} L ${centerX + 75} ${centerY + 25} L ${centerX + 100} ${centerY + 125} L ${centerX} ${centerY + 75} L ${centerX - 100} ${centerY + 125} L ${centerX - 75} ${centerY + 25} L ${centerX - 150} ${centerY - 50} L ${centerX - 50} ${centerY - 50} Z`;
        break;
      case 'custom':
        pathString = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX + radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX - radius} ${centerY}`;
        break;
    }

    // Place characters along the path
    const chars = text.split('');
    const group: fabric.Object[] = [];

    if (pathType === 'circle' || pathType === 'custom') {
      // For circular paths, place chars evenly around the arc
      const angleStep = (2 * Math.PI) / Math.max(chars.length, 1);
      const startAngle = -Math.PI / 2; // Start from top

      chars.forEach((char, i) => {
        const angle = startAngle + i * angleStep;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        const rotation = (angle * 180) / Math.PI + 90;

        const charObj = new fabric.Text(char, {
          left: x,
          top: y,
          fontSize: fontSize,
          fontFamily: 'Outfit',
          fill: '#8b5cf6',
          originX: 'center',
          originY: 'center',
          angle: rotation,
          selectable: false,
          evented: false,
        });
        group.push(charObj);
        canvas.add(charObj);
      });
    } else {
      // For open paths, distribute chars along the path curve
      // Create a temporary path to measure
      const tempPath = new fabric.Path(pathString, { fill: 'transparent', stroke: 'transparent', visible: false });
      canvas.add(tempPath);

      chars.forEach((char, i) => {
        const t = i / Math.max(chars.length - 1, 1);
        // Approximate position along path
        const x = centerX - 200 + t * 400;
        const y = centerY + Math.sin(t * Math.PI * 2) * 40;

        const charObj = new fabric.Text(char, {
          left: x,
          top: y,
          fontSize: fontSize,
          fontFamily: 'Outfit',
          fill: '#8b5cf6',
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
        });
        group.push(charObj);
        canvas.add(charObj);
      });

      canvas.remove(tempPath);
    }

    // Add visible path outline
    const visiblePath = new fabric.Path(pathString, {
      fill: 'transparent',
      stroke: '#8b5cf6',
      strokeWidth: 1,
      strokeDashArray: [4, 4],
      opacity: 0.3,
      selectable: false,
      evented: false,
    });
    canvas.add(visiblePath);

    // Group all characters together
    if (group.length > 0) {
      const textGroup = new fabric.Group(group, {
        selectable: true,
        hasControls: true,
      });
      // Remove individual chars, add group
      group.forEach(obj => canvas.remove(obj));
      canvas.add(textGroup);
      canvas.setActiveObject(textGroup);
    }

    canvas.renderAll();
    saveHistory();
  };

  const pathTypes: { type: PathType; label: string; icon: React.ElementType }[] = [
    { type: 'circle', label: 'Circle', icon: Circle },
    { type: 'wave', label: 'Wave', icon: ArrowRight },
    { type: 'heart', label: 'Heart', icon: Heart },
    { type: 'star', label: 'Star', icon: Star },
    { type: 'spiral', label: 'Spiral', icon: Hexagon },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Type className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-semibold text-zinc-400">Text on Path</span>
      </div>

      {/* Text Input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Text</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none transition-colors"
          placeholder="Enter your text"
        />
      </div>

      {/* Path Type Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Path Shape</label>
        <div className="grid grid-cols-3 gap-1">
          {pathTypes.map((pt) => {
            const Icon = pt.icon;
            return (
              <button
                key={pt.type}
                onClick={() => setPathType(pt.type)}
                className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-[10px] font-semibold transition-all cursor-pointer ${
                  pathType === pt.type
                    ? 'bg-violet-600/20 text-violet-400 border-violet-500/30'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {pt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Size */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Font Size</label>
          <span className="text-[10px] text-zinc-400 font-mono">{fontSize}px</span>
        </div>
        <input
          type="range"
          min="12"
          max="72"
          value={fontSize}
          onChange={(e) => setFontSize(parseInt(e.target.value))}
          className="w-full accent-violet-500 h-1 rounded-full cursor-pointer bg-zinc-800"
        />
      </div>

      {/* Create Button */}
      <button
        onClick={createTextOnPath}
        disabled={!text.trim()}
        className="w-full flex items-center justify-center gap-2 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-750 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
      >
        <Type className="w-3.5 h-3.5" />
        Create Text on Path
      </button>
    </div>
  );
};

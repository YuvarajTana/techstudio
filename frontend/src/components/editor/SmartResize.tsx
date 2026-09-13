import React, { useState } from 'react';
import { Maximize, Check } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

const PLATFORM_SIZES = [
  { name: 'Instagram Post', width: 1080, height: 1080, icon: '📸', category: 'Social' },
  { name: 'Instagram Story', width: 1080, height: 1920, icon: '📱', category: 'Social' },
  { name: 'Facebook Post', width: 1200, height: 630, icon: '👤', category: 'Social' },
  { name: 'Facebook Cover', width: 820, height: 312, icon: '👤', category: 'Social' },
  { name: 'Twitter Post', width: 1200, height: 675, icon: '🐦', category: 'Social' },
  { name: 'LinkedIn Post', width: 1200, height: 627, icon: '💼', category: 'Social' },
  { name: 'Pinterest Pin', width: 1000, height: 1500, icon: '📌', category: 'Social' },
  { name: 'YouTube Thumbnail', width: 1280, height: 720, icon: '▶️', category: 'Video' },
  { name: 'YouTube Banner', width: 2560, height: 1440, icon: '▶️', category: 'Video' },
  { name: 'TikTok', width: 1080, height: 1920, icon: '🎵', category: 'Video' },
  { name: 'A4 Print', width: 2480, height: 3508, icon: '📄', category: 'Print' },
  { name: 'A3 Print', width: 3508, height: 4961, icon: '📄', category: 'Print' },
  { name: 'Business Card', width: 1050, height: 600, icon: '💳', category: 'Print' },
  { name: 'Presentation 16:9', width: 1920, height: 1080, icon: '📊', category: 'Present' },
  { name: 'Presentation 4:3', width: 1440, height: 1080, icon: '📊', category: 'Present' },
  { name: 'Logo Square', width: 500, height: 500, icon: '🎨', category: 'Brand' },
  { name: 'Logo Wide', width: 800, height: 400, icon: '🎨', category: 'Brand' },
];

export const SmartResize: React.FC = () => {
  const { canvas, saveHistory } = useEditorStore();
  const [resizing, setResizing] = useState(false);
  const [resizedTo, setResizedTo] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [customWidth, setCustomWidth] = useState(800);
  const [customHeight, setCustomHeight] = useState(800);

  const categories = ['All', 'Social', 'Video', 'Print', 'Present', 'Brand'];

  const resizeCanvas = async (targetWidth: number, targetHeight: number, name: string) => {
    if (!canvas) return;
    setResizing(true);

    const currentWidth = canvas.getWidth();
    const currentHeight = canvas.getHeight();
    const scaleX = targetWidth / currentWidth;
    const scaleY = targetHeight / currentHeight;
    // Scale all objects proportionally
    const objects = canvas.getObjects();
    objects.forEach(obj => {
      obj.set({
        left: (obj.left || 0) * scaleX,
        top: (obj.top || 0) * scaleY,
        scaleX: (obj.scaleX || 1) * scaleX,
        scaleY: (obj.scaleY || 1) * scaleY,
      });
    });

    canvas.setWidth(targetWidth);
    canvas.setHeight(targetHeight);
    useEditorStore.getState().setCanvasDimensions(targetWidth, targetHeight);
    canvas.renderAll();
    saveHistory();

    setResizedTo(name);
    setTimeout(() => setResizedTo(''), 2000);
    setResizing(false);
  };

  const filteredSizes = activeCategory === 'All'
    ? PLATFORM_SIZES
    : PLATFORM_SIZES.filter(s => s.category === activeCategory);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Maximize className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-semibold text-zinc-400">Smart Resize</span>
      </div>
      <p className="text-[10px] text-zinc-500">Resize canvas for any platform</p>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2 py-1 rounded text-[9px] font-semibold transition-colors cursor-pointer ${
              activeCategory === cat
                ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Platform Sizes */}
      <div className="flex flex-col gap-1.5 max-h-[250px] overflow-y-auto">
        {filteredSizes.map((size) => (
          <button
            key={size.name}
            onClick={() => resizeCanvas(size.width, size.height, size.name)}
            disabled={resizing}
            className="flex items-center gap-2 p-2 bg-zinc-900/50 border border-zinc-800 hover:border-cyan-500/40 rounded-lg transition-all cursor-pointer text-left disabled:opacity-50"
          >
            <span className="text-sm">{size.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-semibold text-zinc-200 block truncate">{size.name}</span>
              <span className="text-[9px] text-zinc-500">{size.width} × {size.height}</span>
            </div>
            {resizedTo === size.name && <Check className="w-3 h-3 text-cyan-400" />}
          </button>
        ))}
      </div>

      {/* Custom Size */}
      <div className="flex flex-col gap-2 p-2 bg-zinc-900/50 border border-zinc-800 rounded-lg">
        <span className="text-[10px] font-semibold text-zinc-500">Custom Size</span>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={customWidth}
            onChange={(e) => setCustomWidth(parseInt(e.target.value) || 800)}
            className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-200 outline-none font-mono text-center"
          />
          <span className="text-[10px] text-zinc-500">×</span>
          <input
            type="number"
            value={customHeight}
            onChange={(e) => setCustomHeight(parseInt(e.target.value) || 800)}
            className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] text-zinc-200 outline-none font-mono text-center"
          />
          <button
            onClick={() => resizeCanvas(customWidth, customHeight, 'Custom')}
            disabled={resizing}
            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-semibold cursor-pointer disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Current Size */}
      {canvas && (
        <div className="text-[9px] text-zinc-500 text-center">
          Current: {canvas.getWidth()} × {canvas.getHeight()}
        </div>
      )}
    </div>
  );
};

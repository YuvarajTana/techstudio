import React, { useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import {
  getPresetsByCategory,
  getPresetCategories,
  searchPresets,
  type DesignPreset,
} from '../../utils/designPresets';
import {
  Search, X, ArrowLeft, Smartphone, Monitor, FileText,
  Image, CreditCard, Palette, MonitorPlay,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Social Media": <Smartphone className="w-4 h-4" />,
  "Video": <MonitorPlay className="w-4 h-4" />,
  "Marketing": <FileText className="w-4 h-4" />,
  "Print": <Image className="w-4 h-4" />,
  "Presentations": <Monitor className="w-4 h-4" />,
  "Brand": <Palette className="w-4 h-4" />,
  "Cards": <CreditCard className="w-4 h-4" />,
  "Documents": <FileText className="w-4 h-4" />,
};

export const DesignPresetsPanel: React.FC = () => {
  const { canvasWidth, canvasHeight, currentPresetId, resizeCanvas, setCurrentPreset } = useEditorStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customWidth, setCustomWidth] = useState(String(canvasWidth));
  const [customHeight, setCustomHeight] = useState(String(canvasHeight));

  const categories = getPresetCategories();
  const presetsByCategory = getPresetsByCategory();

  const handlePresetSelect = (preset: DesignPreset) => {
    resizeCanvas(preset.width, preset.height);
    setCurrentPreset(preset.id);
    setCustomWidth(String(preset.width));
    setCustomHeight(String(preset.height));
  };

  const handleCustomApply = () => {
    const w = parseInt(customWidth, 10);
    const h = parseInt(customHeight, 10);
    if (w > 0 && h > 0 && w <= 10000 && h <= 10000) {
      resizeCanvas(w, h);
      setCurrentPreset(null);
    }
  };

  const handleSwapDimensions = () => {
    const w = parseInt(customWidth, 10);
    const h = parseInt(customHeight, 10);
    if (w > 0 && h > 0) {
      setCustomWidth(String(h));
      setCustomHeight(String(w));
    }
  };

  const filteredPresets = search ? searchPresets(search) : null;
  const displayCategories = selectedCategory ? [selectedCategory] : categories;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sizes..."
          className="w-full bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-lg pl-8 pr-8 py-2 text-[11px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Current size display */}
      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
        <div>
          <p className="text-[10px] text-zinc-500">Current size</p>
          <p className="text-xs font-semibold text-zinc-200">{canvasWidth} × {canvasHeight} px</p>
        </div>
        <div className="text-[10px] text-zinc-500">
          {(canvasWidth / canvasHeight).toFixed(2)}:1
        </div>
      </div>

      {/* Custom size */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Custom size</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={customWidth}
            onChange={(e) => setCustomWidth(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-200 outline-none focus:border-violet-500"
            min="1"
            max="10000"
          />
          <button onClick={handleSwapDimensions} className="text-zinc-500 hover:text-zinc-300 text-xs">⇄</button>
          <input
            type="number"
            value={customHeight}
            onChange={(e) => setCustomHeight(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-200 outline-none focus:border-violet-500"
            min="1"
            max="10000"
          />
          <span className="text-[10px] text-zinc-600">px</span>
        </div>
        <button
          onClick={handleCustomApply}
          className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 text-[11px] font-semibold text-white rounded-lg transition-colors cursor-pointer"
        >
          Apply size
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-zinc-800" />

      {/* Presets by category */}
      {filteredPresets ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSearch('')} className="text-zinc-400 hover:text-zinc-200 cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              {filteredPresets.length} results
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {filteredPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={`text-left p-2 rounded-lg border transition-all cursor-pointer ${
                  currentPresetId === preset.id
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/50'
                }`}
              >
                <p className="text-[10px] font-semibold text-zinc-300 truncate">{preset.name}</p>
                <p className="text-[9px] text-zinc-500">{preset.width}×{preset.height}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        displayCategories.map((category) => (
          <div key={category}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500">{CATEGORY_ICONS[category] || <FileText className="w-4 h-4" />}</span>
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{category}</span>
              </div>
              {!selectedCategory && (
                <button onClick={() => setSelectedCategory(category)} className="text-[9px] text-violet-400 hover:text-violet-300 cursor-pointer">
                  See all
                </button>
              )}
            </div>
            {selectedCategory && (
              <button onClick={() => setSelectedCategory(null)} className="text-[9px] text-zinc-500 hover:text-zinc-300 cursor-pointer mb-2">
                ← All categories
              </button>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              {(presetsByCategory[category] || []).slice(0, selectedCategory ? undefined : 4).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className={`text-left p-2 rounded-lg border transition-all cursor-pointer ${
                    currentPresetId === preset.id
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/50'
                  }`}
                >
                  <p className="text-[10px] font-semibold text-zinc-300 truncate">{preset.name}</p>
                  <p className="text-[9px] text-zinc-500">{preset.width}×{preset.height}</p>
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

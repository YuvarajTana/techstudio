import React, { useState } from 'react';
import { BarChart3, PieChart, LineChart, X, Plus, Trash2, Sparkles } from 'lucide-react';
import { apiFetch } from '../../services/apiClient';
import { useEditorStore } from '../../store/useEditorStore';
import { fabric } from 'fabric';

interface ChartGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DataItem {
  label: string;
  value: number;
  color?: string;
}

export const ChartGeneratorModal: React.FC<ChartGeneratorModalProps> = ({ isOpen, onClose }) => {
  const canvas = useEditorStore((state) => state.canvas);
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'doughnut'>('bar');
  const [title, setTitle] = useState('Market Share 2026');
  const [items, setItems] = useState<DataItem[]>([
    { label: 'Q1 Sales', value: 45, color: '#6366f1' },
    { label: 'Q2 Sales', value: 70, color: '#3b82f6' },
    { label: 'Q3 Sales', value: 85, color: '#10b981' },
    { label: 'Q4 Sales', value: 60, color: '#f59e0b' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { label: `Item ${items.length + 1}`, value: 50 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, key: keyof DataItem, val: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [key]: val };
    setItems(updated);
  };

  const handleGenerateChart = async () => {
    if (!canvas) {
      setError('Please open or create a canvas design first');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/charts/generate', {
        method: 'POST',
        body: JSON.stringify({
          chart_type: chartType,
          title,
          data: items,
          width: 500,
          height: 350,
          background_color: '#ffffff',
          primary_color: '#6366f1',
          text_color: '#1e293b',
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.detail || data?.error || 'Failed to generate chart';
        throw new Error(typeof msg === 'string' ? msg : 'Failed to generate chart');
      }

      if (data?.data_url && canvas) {
        fabric.Image.fromURL(
          data.data_url,
          (img) => {
            if (!img) {
              setError('Failed to load chart image onto canvas');
              return;
            }

            const canvasW = canvas.width || 800;
            const canvasH = canvas.height || 800;

            img.set({
              left: canvasW / 2 - 200,
              top: canvasH / 2 - 140,
              scaleX: 0.8,
              scaleY: 0.8,
              id: `chart_${Date.now()}`,
              name: `Chart (${chartType.toUpperCase()})`,
            } as any);

            img.setCoords();
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();

            // Refresh history store
            useEditorStore.getState().saveHistory();

            onClose();
          },
          { crossOrigin: 'anonymous' }
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to insert chart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-100">Chart & Infographic Builder</h3>
            <p className="text-xs text-zinc-400">Create vector charts for presentations & posters</p>
          </div>
        </div>

        {/* Chart type selection */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { id: 'bar', label: 'Bar Chart', icon: BarChart3 },
            { id: 'pie', label: 'Pie Chart', icon: PieChart },
            { id: 'doughnut', label: 'Doughnut', icon: LineChart },
          ].map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setChartType(type.id as any)}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  chartType === type.id
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-zinc-800/50 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Title input */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Chart Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Data points table */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-zinc-400">Data Items</label>
            <button
              onClick={handleAddItem}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => handleUpdateItem(idx, 'label', e.target.value)}
                  placeholder="Label"
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="number"
                  value={item.value}
                  onChange={(e) => handleUpdateItem(idx, 'value', parseFloat(e.target.value) || 0)}
                  placeholder="Value"
                  className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleRemoveItem(idx)}
                  className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-400 mb-4">{error}</p>}

        <button
          onClick={handleGenerateChart}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/25 disabled:opacity-50"
        >
          {loading ? (
            <span>Generating...</span>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Insert Chart into Canvas</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Download, Settings, Loader2 } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { beginStaticConnectorExport } from '../../utils/connectorAnimationManager';

type ExportFormat = 'png' | 'jpg' | 'svg' | 'pdf';
type ExportDPI = 72 | 150 | 300 | 600;

export interface ExportConfig {
  format: ExportFormat;
  dpi: ExportDPI;
  quality: number;
  width: number;
  height: number;
  backgroundColor: string;
  transparent: boolean;
}

export const ExportSettings: React.FC = () => {
  const { canvas, projectName } = useEditorStore();
  const exportName = projectName.trim() || 'New Design';
  const [isExpanded, setIsExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [settings, setSettings] = useState<ExportConfig>({
    format: 'png',
    dpi: 300,
    quality: 0.95,
    width: 800,
    height: 800,
    backgroundColor: '#000000',
    transparent: false,
  });

  const updateSetting = <K extends keyof ExportConfig>(key: K, value: ExportConfig[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    if (!canvas) return;
    setExporting(true);
    const activeObject = canvas.getActiveObject();
    const restoreConnectorAnimation = beginStaticConnectorExport(canvas);
    const excludedObjects = canvas.getObjects().filter((object) => (
      object.get('excludeFromExport' as keyof fabric.Object) === true ||
      object.get('editorOnly' as keyof fabric.Object) === true
    ));
    const excludedVisibility = excludedObjects.map((object) => object.visible);

    try {
      // Discard active selection so selection boxes aren't in the exported image
      canvas.discardActiveObject();
      excludedObjects.forEach((object) => object.set('visible', false));
      canvas.renderAll();

      await new Promise(resolve => setTimeout(resolve, 50));

      if (settings.format === 'png') {
        const dataURL = canvas.toDataURL({
          format: 'png',
          multiplier: settings.dpi / 72,
        });
        triggerDownload(dataURL, `${exportName}.png`);
      } else if (settings.format === 'jpg') {
        const oldBg = canvas.backgroundColor;
        if (!oldBg || oldBg === 'transparent') {
          canvas.setBackgroundColor(settings.backgroundColor, () => {});
        }

        const dataURL = canvas.toDataURL({
          format: 'jpeg',
          quality: settings.quality,
          multiplier: settings.dpi / 72,
        });
        triggerDownload(dataURL, `${exportName}.jpg`);

        if (!oldBg || oldBg === 'transparent') {
          canvas.setBackgroundColor(oldBg as string, () => {});
        }
      } else if (settings.format === 'svg') {
        const svgContent = canvas.toSVG();
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `${exportName}.svg`);
        URL.revokeObjectURL(url);
      } else if (settings.format === 'pdf') {
        await exportToPDF(canvas, exportName, settings);
      }

    } finally {
      restoreConnectorAnimation();
      excludedObjects.forEach((object, index) => object.set('visible', excludedVisibility[index]));
      if (activeObject) canvas.setActiveObject(activeObject);
      canvas.renderAll();
      setExporting(false);
    }
  };

  const exportToPDF = async (canvas: fabric.Canvas, filename: string, config: ExportConfig) => {
    // Dynamic import jsPDF
    const { jsPDF } = await import('jspdf');

    // Get canvas data as image
    const imageData = canvas.toDataURL({
      format: 'png',
      multiplier: config.dpi / 72,
    });

    // Calculate dimensions in points (1 inch = 72 points)
    const widthInPoints = (config.width / 96) * 72;
    const heightInPoints = (config.height / 96) * 72;

    // Create PDF document
    const pdf = new jsPDF({
      orientation: widthInPoints > heightInPoints ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [widthInPoints, heightInPoints],
    });

    // Add the canvas image to PDF
    pdf.addImage(imageData, 'PNG', 0, 0, widthInPoints, heightInPoints);

    // Save the PDF
    pdf.save(`${filename}.pdf`);
  };

  const triggerDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.download = name;
    link.href = url;
    link.click();
  };

  const presets = [
    { label: 'Web (72 DPI)', dpi: 72 as ExportDPI, width: 800, height: 800 },
    { label: 'Print (300 DPI)', dpi: 300 as ExportDPI, width: 2400, height: 2400 },
    { label: 'HD (150 DPI)', dpi: 150 as ExportDPI, width: 1200, height: 1200 },
    { label: 'Instagram', dpi: 72 as ExportDPI, width: 1080, height: 1080 },
    { label: 'Facebook', dpi: 72 as ExportDPI, width: 1200, height: 630 },
    { label: 'Twitter', dpi: 72 as ExportDPI, width: 1200, height: 675 },
    { label: 'YouTube', dpi: 72 as ExportDPI, width: 1280, height: 720 },
    { label: 'A4 Print', dpi: 300 as ExportDPI, width: 2480, height: 3508 },
  ];

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 py-2 px-3 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors cursor-pointer"
      >
        <Settings className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-semibold text-zinc-300">Export Settings</span>
        <span className="ml-auto text-zinc-500 text-[10px]">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-4 p-3 bg-zinc-900/30 border border-zinc-800 rounded-lg">
          {/* Format Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Format</label>
            <div className="grid grid-cols-2 gap-1">
              {([
                { id: 'png', label: 'PNG', desc: 'Transparent' },
                { id: 'jpg', label: 'JPG', desc: 'Compressed' },
                { id: 'svg', label: 'SVG', desc: 'Vector' },
                { id: 'pdf', label: 'PDF', desc: 'Document' },
              ] as const).map((format) => (
                <button
                  key={format.id}
                  onClick={() => updateSetting('format', format.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    settings.format === format.id
                      ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <span>{format.label}</span>
                  <span className="text-[8px] text-zinc-500">{format.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* DPI Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Quality (DPI)</label>
            <div className="grid grid-cols-2 gap-1">
              {([72, 150, 300, 600] as ExportDPI[]).map((dpi) => (
                <button
                  key={dpi}
                  onClick={() => updateSetting('dpi', dpi)}
                  className={`py-1.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                    settings.dpi === dpi
                      ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {dpi} DPI
                </button>
              ))}
            </div>
          </div>

          {/* Quality Slider (for JPG) */}
          {settings.format === 'jpg' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Quality</label>
                <span className="text-[10px] text-zinc-400 font-mono">{Math.round(settings.quality * 100)}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.quality * 100}
                onChange={(e) => updateSetting('quality', parseInt(e.target.value) / 100)}
                className="w-full accent-violet-500 h-1 rounded-full cursor-pointer bg-zinc-800"
              />
            </div>
          )}

          {/* Dimensions */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Dimensions</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[9px] text-zinc-500">Width</label>
                <input
                  type="number"
                  value={settings.width}
                  onChange={(e) => updateSetting('width', parseInt(e.target.value) || 800)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-[9px] text-zinc-500">Height</label>
                <input
                  type="number"
                  value={settings.height}
                  onChange={(e) => updateSetting('height', parseInt(e.target.value) || 800)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Presets</label>
            <div className="grid grid-cols-2 gap-1">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    updateSetting('dpi', preset.dpi);
                    updateSetting('width', preset.width);
                    updateSetting('height', preset.height);
                  }}
                  className="py-1.5 rounded text-[10px] font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background Options */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Background</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.backgroundColor}
                onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                className="w-8 h-8 rounded border border-zinc-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={settings.backgroundColor}
                onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 outline-none focus:border-violet-500 font-mono"
              />
              {settings.format === 'png' && (
                <label className="flex items-center gap-1 text-[10px] text-zinc-400">
                  <input
                    type="checkbox"
                    checked={settings.transparent}
                    onChange={(e) => updateSetting('transparent', e.target.checked)}
                    className="rounded border-zinc-700"
                  />
                  Transparent
                </label>
              )}
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {exporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Export {settings.format.toUpperCase()}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

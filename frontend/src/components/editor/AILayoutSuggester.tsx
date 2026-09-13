import React, { useState } from 'react';
import { Layout, Loader2 } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { fabric } from 'fabric';

const LAYOUTS = [
  {
    name: 'Center Focus',
    description: 'Main element centered with accent elements',
    apply: (canvas: fabric.Canvas) => {
      const w = canvas.getWidth();
      const h = canvas.getHeight();
      // Decorative corner elements
      canvas.add(new fabric.Circle({ left: -30, top: -30, radius: 80, fill: 'rgba(139,92,246,0.1)', selectable: false }));
      canvas.add(new fabric.Circle({ left: w - 50, top: h - 50, radius: 60, fill: 'rgba(139,92,246,0.08)', selectable: false }));
      // Center line
      canvas.add(new fabric.Line([w * 0.2, h * 0.5, w * 0.8, h * 0.5], { stroke: 'rgba(139,92,246,0.2)', strokeWidth: 1, selectable: false }));
      // Center text placeholder
      canvas.add(new fabric.Textbox('YOUR TITLE', { left: w * 0.1, top: h * 0.35, width: w * 0.8, fontSize: 48, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'center', selectable: true }));
      canvas.add(new fabric.Textbox('Subtitle text goes here', { left: w * 0.15, top: h * 0.55, width: w * 0.7, fontSize: 20, fill: '#a78bfa', fontFamily: 'Outfit', textAlign: 'center', selectable: true }));
    }
  },
  {
    name: 'Split Layout',
    description: 'Left text, right visual area',
    apply: (canvas: fabric.Canvas) => {
      const w = canvas.getWidth();
      const h = canvas.getHeight();
      // Right panel
      canvas.add(new fabric.Rect({ left: w * 0.5, top: 0, width: w * 0.5, height: h, fill: 'rgba(139,92,246,0.1)', selectable: false }));
      // Divider
      canvas.add(new fabric.Line([w * 0.5, h * 0.15, w * 0.5, h * 0.85], { stroke: 'rgba(139,92,246,0.3)', strokeWidth: 2, selectable: false }));
      // Left text
      canvas.add(new fabric.Textbox('HEADLINE', { left: w * 0.08, top: h * 0.2, width: w * 0.38, fontSize: 42, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', selectable: true }));
      canvas.add(new fabric.Textbox('Description text goes here. Edit this to add your content.', { left: w * 0.08, top: h * 0.45, width: w * 0.38, fontSize: 16, fill: '#a1a1aa', fontFamily: 'Outfit', lineHeight: 1.5, selectable: true }));
      // CTA
      canvas.add(new fabric.Rect({ left: w * 0.08, top: h * 0.75, width: 140, height: 44, fill: '#8b5cf6', rx: 22, ry: 22, selectable: false }));
      canvas.add(new fabric.Textbox('LEARN MORE', { left: w * 0.08, top: h * 0.75 + 12, width: 140, fontSize: 14, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'center', selectable: false }));
    }
  },
  {
    name: 'Grid Layout',
    description: 'Four equal quadrants',
    apply: (canvas: fabric.Canvas) => {
      const w = canvas.getWidth();
      const h = canvas.getHeight();
      const gap = 8;
      const qw = (w - gap * 3) / 2;
      const qh = (h - gap * 3) / 2;
      const colors = ['rgba(139,92,246,0.15)', 'rgba(236,72,153,0.15)', 'rgba(6,182,212,0.15)', 'rgba(249,115,22,0.15)'];
      const positions = [
        { x: gap, y: gap }, { x: qw + gap * 2, y: gap },
        { x: gap, y: qh + gap * 2 }, { x: qw + gap * 2, y: qh + gap * 2 }
      ];
      const labels = ['Feature 1', 'Feature 2', 'Feature 3', 'Feature 4'];
      positions.forEach((pos, i) => {
        canvas.add(new fabric.Rect({ left: pos.x, top: pos.y, width: qw, height: qh, fill: colors[i], rx: 12, ry: 12, selectable: false }));
        canvas.add(new fabric.Textbox(labels[i], { left: pos.x + 20, top: pos.y + qh / 2 - 15, width: qw - 40, fontSize: 20, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'center', selectable: true }));
      });
    }
  },
  {
    name: 'Card Stack',
    description: 'Overlapping card elements',
    apply: (canvas: fabric.Canvas) => {
      const w = canvas.getWidth();
      const h = canvas.getHeight();
      // Back card
      canvas.add(new fabric.Rect({ left: w * 0.35, top: h * 0.15, width: w * 0.55, height: h * 0.65, fill: 'rgba(139,92,246,0.08)', rx: 16, ry: 16, selectable: false }));
      // Front card
      canvas.add(new fabric.Rect({ left: w * 0.1, top: h * 0.2, width: w * 0.55, height: h * 0.6, fill: 'rgba(139,92,246,0.2)', rx: 16, ry: 16, stroke: 'rgba(139,92,246,0.3)', strokeWidth: 1, selectable: false }));
      canvas.add(new fabric.Textbox('CARD TITLE', { left: w * 0.15, top: h * 0.35, width: w * 0.45, fontSize: 28, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', selectable: true }));
      canvas.add(new fabric.Textbox('Card description text goes here.', { left: w * 0.15, top: h * 0.5, width: w * 0.45, fontSize: 14, fill: '#a1a1aa', fontFamily: 'Outfit', selectable: true }));
    }
  },
  {
    name: 'Minimal',
    description: 'Clean, lots of whitespace',
    apply: (canvas: fabric.Canvas) => {
      const w = canvas.getWidth();
      const h = canvas.getHeight();
      canvas.add(new fabric.Textbox('Minimal', { left: w * 0.1, top: h * 0.3, width: w * 0.8, fontSize: 64, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'center', selectable: true }));
      canvas.add(new fabric.Line([w * 0.4, h * 0.48, w * 0.6, h * 0.48], { stroke: '#8b5cf6', strokeWidth: 2, selectable: false }));
      canvas.add(new fabric.Textbox('Simple and elegant design', { left: w * 0.15, top: h * 0.55, width: w * 0.7, fontSize: 18, fill: '#71717a', fontFamily: 'Outfit', textAlign: 'center', selectable: true }));
    }
  },
  {
    name: 'Bold Statement',
    description: 'Large text with strong contrast',
    apply: (canvas: fabric.Canvas) => {
      const w = canvas.getWidth();
      const h = canvas.getHeight();
      canvas.add(new fabric.Rect({ left: 0, top: 0, width: w, height: h * 0.4, fill: '#8b5cf6', selectable: false }));
      canvas.add(new fabric.Textbox('BOLD', { left: w * 0.1, top: h * 0.05, width: w * 0.8, fontSize: 80, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Outfit', textAlign: 'center', selectable: true }));
      canvas.add(new fabric.Textbox('STATEMENT', { left: w * 0.1, top: h * 0.45, width: w * 0.8, fontSize: 48, fontWeight: 'bold', fill: '#8b5cf6', fontFamily: 'Outfit', textAlign: 'center', selectable: true }));
      canvas.add(new fabric.Textbox('Make your message impossible to ignore', { left: w * 0.15, top: h * 0.65, width: w * 0.7, fontSize: 16, fill: '#71717a', fontFamily: 'Outfit', textAlign: 'center', selectable: true }));
    }
  },
];

export const AILayoutSuggester: React.FC = () => {
  const { canvas, saveHistory } = useEditorStore();
  const [applying, setApplying] = useState('');

  const applyLayout = (layout: typeof LAYOUTS[0]) => {
    if (!canvas) return;
    setApplying(layout.name);

    canvas.clear();
    canvas.setBackgroundColor('#ffffff', () => {});
    layout.apply(canvas);
    canvas.renderAll();
    saveHistory();

    setTimeout(() => setApplying(''), 1000);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Layout className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-semibold text-zinc-400">Layout Suggestions</span>
      </div>
      <p className="text-[10px] text-zinc-500">AI-powered layout templates</p>

      <div className="flex flex-col gap-2">
        {LAYOUTS.map((layout) => (
          <button
            key={layout.name}
            onClick={() => applyLayout(layout)}
            disabled={applying !== ''}
            className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 hover:border-amber-500/40 rounded-lg transition-all cursor-pointer text-left disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              {applying === layout.name ? (
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              ) : (
                <Layout className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-zinc-200 block">{layout.name}</span>
              <span className="text-[9px] text-zinc-500">{layout.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

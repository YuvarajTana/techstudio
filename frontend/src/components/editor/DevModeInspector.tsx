import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { Copy, Check, Code, FileText, Globe, Terminal } from 'lucide-react';

type CodeTab = 'css' | 'tailwind' | 'svg' | 'react';

export const DevModeInspector: React.FC = () => {
  const { selectedObject } = useEditorStore();
  const [activeTab, setActiveTab] = useState<CodeTab>('css');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [selectedObject, activeTab]);

  if (!selectedObject) {
    return (
      <aside className="w-72 border-l border-white/[0.08] bg-[#101018] p-6 flex flex-col gap-6 select-none shrink-0 overflow-y-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500">
          <Code className="w-10 h-10 mb-3 opacity-40 text-emerald-400" />
          <h4 className="font-semibold text-zinc-300 text-sm">Select an element</h4>
          <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">
            Click any item on the canvas to inspect its dimensions and generate developer code.
          </p>
        </div>
      </aside>
    );
  }

  // Get object name
  const getObjectName = () => {
    const customName = (selectedObject as any).get('name');
    if (customName) return customName;
    const typeStr = selectedObject.type || 'layer';
    return typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
  };

  // Dimensions & Positions (scaled)
  const scaleX = selectedObject.scaleX || 1;
  const scaleY = selectedObject.scaleY || 1;
  const width = Math.round((selectedObject.width || 0) * scaleX);
  const height = Math.round((selectedObject.height || 0) * scaleY);
  const left = Math.round(selectedObject.left || 0);
  const top = Math.round(selectedObject.top || 0);
  const angle = Math.round(selectedObject.angle || 0);
  const opacity = selectedObject.opacity !== undefined ? selectedObject.opacity : 1;

  // Visual Styles
  const fill = (selectedObject.get('fill') as string) || 'transparent';
  const stroke = (selectedObject.get('stroke') as string) || 'transparent';
  const strokeWidth = selectedObject.get('strokeWidth') || 0;
  const rx = (selectedObject as any).rx || 0;

  // Text details if it is a text object
  const isText = 
    selectedObject.type === 'text' || 
    selectedObject.type === 'i-text' || 
    selectedObject.type === 'textbox';

  const fontFamily = (selectedObject as any).fontFamily || 'Outfit';
  const fontSize = (selectedObject as any).fontSize || 16;
  const fontWeight = (selectedObject as any).fontWeight || 'normal';
  const fontStyle = (selectedObject as any).fontStyle || 'normal';
  const underline = (selectedObject as any).underline || false;
  const textAlign = (selectedObject as any).textAlign || 'left';
  const textContent = (selectedObject as any).text || '';

  // Generate CSS Code
  const generateCSS = () => {
    let css = `.element {\n`;
    css += `  position: absolute;\n`;
    css += `  left: ${left}px;\n`;
    css += `  top: ${top}px;\n`;
    css += `  width: ${width}px;\n`;
    css += `  height: ${height}px;\n`;

    if (!isText) {
      if (fill && fill !== 'transparent') css += `  background-color: ${fill};\n`;
      if (rx > 0) css += `  border-radius: ${rx}px;\n`;
      if (stroke && stroke !== 'transparent' && strokeWidth > 0) {
        css += `  border: ${strokeWidth}px solid ${stroke};\n`;
      }
    } else {
      css += `  font-family: "${fontFamily}", sans-serif;\n`;
      css += `  font-size: ${fontSize}px;\n`;
      css += `  font-weight: ${fontWeight};\n`;
      if (fontStyle !== 'normal') css += `  font-style: ${fontStyle};\n`;
      if (underline) css += `  text-decoration: underline;\n`;
      if (textAlign !== 'left') css += `  text-align: ${textAlign};\n`;
      if (fill && fill !== 'transparent') css += `  color: ${fill};\n`;
    }

    if (opacity < 1) css += `  opacity: ${opacity};\n`;
    if (angle !== 0) css += `  transform: rotate(${angle}deg);\n`;
    css += `}`;
    return css;
  };

  // Generate Tailwind CSS Classes
  const generateTailwind = () => {
    const classes: string[] = ['absolute'];
    classes.push(`left-[${left}px]`);
    classes.push(`top-[${top}px]`);
    classes.push(`w-[${width}px]`);
    classes.push(`h-[${height}px]`);

    if (!isText) {
      if (fill && fill !== 'transparent' && fill.startsWith('#')) {
        classes.push(`bg-[${fill}]`);
      }
      if (rx > 0) {
        classes.push(`rounded-[${rx}px]`);
      }
      if (stroke && stroke !== 'transparent' && strokeWidth > 0) {
        classes.push(`border-[${strokeWidth}px]`);
        classes.push(`border-[${stroke}]`);
      }
    } else {
      classes.push(`font-['${fontFamily}']`);
      classes.push(`text-[${fontSize}px]`);
      if (fontWeight === 'bold' || fontWeight === '800' || fontWeight === '900') classes.push('font-bold');
      else if (fontWeight === '600' || fontWeight === '500') classes.push('font-semibold');
      if (fontStyle === 'italic') classes.push('italic');
      if (underline) classes.push('underline');
      if (textAlign === 'center') classes.push('text-center');
      else if (textAlign === 'right') classes.push('text-right');
      if (fill && fill !== 'transparent' && fill.startsWith('#')) {
        classes.push(`text-[${fill}]`);
      }
    }

    if (opacity < 1) classes.push(`opacity-[${Math.round(opacity * 100)}]`);
    if (angle !== 0) classes.push(`rotate-[${angle}deg]`);

    return `// Tailwind HTML\n<div className="${classes.join(' ')}">\n  ${isText ? textContent : ''}\n</div>`;
  };

  // Generate SVG Code
  const generateSVG = () => {
    try {
      return selectedObject.toSVG();
    } catch {
      // Fallback
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n  <!-- Error generating SVG details -->\n</svg>`;
    }
  };

  // Generate React Component Code
  const generateReact = () => {
    const styleObj: any = {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };

    if (!isText) {
      if (fill && fill !== 'transparent') styleObj.backgroundColor = fill;
      if (rx > 0) styleObj.borderRadius = `${rx}px`;
      if (stroke && stroke !== 'transparent' && strokeWidth > 0) {
        styleObj.border = `${strokeWidth}px solid ${stroke}`;
      }
    } else {
      styleObj.fontFamily = `"${fontFamily}", sans-serif`;
      styleObj.fontSize = `${fontSize}px`;
      styleObj.fontWeight = fontWeight;
      if (fontStyle !== 'normal') styleObj.fontStyle = fontStyle;
      if (underline) styleObj.textDecoration = 'underline';
      if (textAlign !== 'left') styleObj.textAlign = textAlign;
      if (fill && fill !== 'transparent') styleObj.color = fill;
    }

    if (opacity < 1) styleObj.opacity = opacity;
    if (angle !== 0) styleObj.transform = `rotate(${angle}deg)`;

    const styleStr = JSON.stringify(styleObj, null, 2)
      .replace(/"([^"]+)":/g, '$1:') // Remove quotes from keys
      .replace(/\n/g, '\n    '); // Indent style object

    return `import React from 'react';\n\nexport const MyComponent: React.FC = () => {\n  return (\n    <div\n      style={${styleStr}}\n    >\n      ${isText ? `  {/* ${textContent} */}` : ''}\n    </div>\n  );\n};`;
  };

  const getCode = () => {
    switch (activeTab) {
      case 'css': return generateCSS();
      case 'tailwind': return generateTailwind();
      case 'svg': return generateSVG();
      case 'react': return generateReact();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-72 border-l border-white/[0.08] bg-[#101018] p-5 flex flex-col gap-5 select-none shrink-0 overflow-y-auto z-10 text-zinc-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            Dev Mode
          </span>
        </div>
        <h3 className="text-sm font-bold text-zinc-100 truncate">{getObjectName()}</h3>
        <p className="text-[10px] text-zinc-500 font-mono tracking-tight mt-0.5">
          id: {(selectedObject as any).id?.slice(0, 8) || 'unknown'}
        </p>
      </div>

      <div className="h-[1px] bg-zinc-800" />

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 bg-zinc-900/40 p-3 rounded-lg border border-zinc-850">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-zinc-500 font-bold uppercase">Width</span>
          <span className="text-xs font-semibold font-mono text-zinc-300">{width}px</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-zinc-500 font-bold uppercase">Height</span>
          <span className="text-xs font-semibold font-mono text-zinc-300">{height}px</span>
        </div>
        <div className="flex flex-col gap-0.5 mt-2">
          <span className="text-[9px] text-zinc-500 font-bold uppercase">Position X</span>
          <span className="text-xs font-semibold font-mono text-zinc-300">{left}px</span>
        </div>
        <div className="flex flex-col gap-0.5 mt-2">
          <span className="text-[9px] text-zinc-500 font-bold uppercase">Position Y</span>
          <span className="text-xs font-semibold font-mono text-zinc-300">{top}px</span>
        </div>
        {angle !== 0 && (
          <div className="flex flex-col gap-0.5 mt-2">
            <span className="text-[9px] text-zinc-500 font-bold uppercase">Rotation</span>
            <span className="text-xs font-semibold font-mono text-zinc-300">{angle}°</span>
          </div>
        )}
        {opacity < 1 && (
          <div className="flex flex-col gap-0.5 mt-2">
            <span className="text-[9px] text-zinc-500 font-bold uppercase">Opacity</span>
            <span className="text-xs font-semibold font-mono text-zinc-300">{Math.round(opacity * 100)}%</span>
          </div>
        )}
      </div>

      {/* Code Generation Section */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5 text-emerald-400" />
            Code Inspector
          </label>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 px-2 py-1 rounded transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy
              </>
            )}
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border border-white/[0.08] rounded-lg bg-zinc-950 p-0.5 text-[11px] font-semibold">
          {[
            { id: 'css', label: 'CSS', icon: Globe },
            { id: 'tailwind', label: 'Tailwind', icon: Terminal },
            { id: 'svg', label: 'SVG', icon: FileText },
            { id: 'react', label: 'React', icon: Code },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as CodeTab)}
                className={`flex-1 py-1 rounded-md flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                  isActive 
                    ? 'bg-zinc-800 text-emerald-400 border border-zinc-700/50 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Code Content Box */}
        <div className="mt-1 relative bg-zinc-950 rounded-xl border border-zinc-850 p-4 font-mono text-[10px] text-zinc-300 overflow-x-auto max-h-[300px] shadow-inner select-text">
          <pre className="whitespace-pre">{getCode()}</pre>
        </div>
      </div>
    </aside>
  );
};

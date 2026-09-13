import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { analyzeDesignQuality, type DesignQualityScore } from '../../utils/designQualityChecker';

export const DesignQualityPanel: React.FC = () => {
  const canvas = useEditorStore((state) => state.canvas);
  const [analysis, setAnalysis] = useState<DesignQualityScore | null>(null);

  const runAudit = () => {
    if (canvas) {
      const result = analyzeDesignQuality(canvas);
      setAnalysis(result);
    }
  };

  useEffect(() => {
    runAudit();
  }, [canvas]);

  if (!analysis) return null;

  const gradeColors: Record<string, string> = {
    'A+': 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    A: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    B: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    C: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    D: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    F: 'text-red-400 border-red-500/30 bg-red-500/10',
  };

  return (
    <div className="p-4 space-y-5 text-zinc-100">
      {/* Header card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center font-extrabold text-xl ${gradeColors[analysis.grade] || gradeColors['A']}`}>
            {analysis.grade}
          </div>
          <div>
            <h4 className="font-bold text-sm text-zinc-100">Design Quality Score</h4>
            <p className="text-xs text-zinc-400">{analysis.score} / 100 Overall Health</p>
          </div>
        </div>
        <button
          onClick={runAudit}
          className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors cursor-pointer"
          title="Re-run Audit"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics breakdown */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5 text-center">
          <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Contrast</span>
          <span className="text-sm font-bold text-emerald-400">{analysis.metrics.contrastScore}%</span>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5 text-center">
          <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Typography</span>
          <span className="text-sm font-bold text-blue-400">{analysis.metrics.typographyScore}%</span>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5 text-center">
          <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Alignment</span>
          <span className="text-sm font-bold text-purple-400">{analysis.metrics.alignmentScore}%</span>
        </div>
      </div>

      {/* Audit Issues list */}
      <div>
        <h5 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
          <span>Accessibility Audit</span>
          <span className="text-zinc-500 font-normal">{analysis.issues.length} Issues</span>
        </h5>

        {analysis.issues.length === 0 ? (
          <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-emerald-300">Perfect Design Quality!</p>
            <p className="text-[11px] text-zinc-400 mt-1">All WCAG contrast standards and font scales pass cleanly.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {analysis.issues.map((issue) => (
              <div key={issue.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`} />
                  <span className="font-semibold text-zinc-200">{issue.title}</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">{issue.description}</p>
                <div className="bg-zinc-950 p-2 rounded-lg text-[11px] text-violet-300 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{issue.suggestion}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

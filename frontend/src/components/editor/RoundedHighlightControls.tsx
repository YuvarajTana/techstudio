import React from 'react';
import { Highlighter } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import {
  isRoundedHighlightText,
  readRoundedHighlightConfig,
  selectedRoundedHighlightRange,
  setRoundedHighlightColor,
  setRoundedPrimaryColor,
} from '../../utils/roundedHighlightText';

export const RoundedHighlightControls: React.FC = () => {
  const {
    canvas,
    selectedObject,
    textSelectionRange,
    captureTextSelection,
    saveHistory,
  } = useEditorStore();
  const [message, setMessage] = React.useState('');
  const [, forceRefresh] = React.useReducer((value) => value + 1, 0);

  if (!canvas || !isRoundedHighlightText(selectedObject)) return null;
  const textObject = selectedObject;
  const config = readRoundedHighlightConfig(textObject);

  const render = () => {
    textObject.initDimensions?.();
    textObject.setCoords();
    canvas.requestRenderAll();
    forceRefresh();
  };

  const updatePrimary = (color: string) => {
    setRoundedPrimaryColor(textObject, color);
    useEditorStore.setState({ fillColor: color });
    render();
  };

  const updateHighlight = (color: string, commitHistory = false) => {
    captureTextSelection();
    const range = selectedRoundedHighlightRange(
      textObject,
      useEditorStore.getState().textSelectionRange || textSelectionRange,
    );
    const applied = setRoundedHighlightColor(textObject, color, range);
    setMessage(applied
      ? 'Highlight applied to the selected characters.'
      : 'Select text characters to apply a highlight.');
    render();
    if (applied && commitHistory) saveHistory();
  };

  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3">
      <div className="mb-3 flex items-center gap-2">
        <Highlighter className="h-4 w-4 text-amber-400" />
        <div>
          <div className="text-[11px] font-bold text-zinc-200">Rounded Bold Highlight</div>
          <div className="text-[9px] text-zinc-500">Select any characters, then choose an accent</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-[9px] font-semibold text-zinc-500">
          Primary Color
          <input
            type="color"
            value={config.primaryColor}
            onPointerDown={captureTextSelection}
            onChange={(event) => updatePrimary(event.target.value)}
            onBlur={saveHistory}
            className="h-9 w-full cursor-pointer rounded-lg border border-zinc-700 bg-transparent"
          />
        </label>
        <label className="grid gap-1 text-[9px] font-semibold text-zinc-500">
          Highlight Color
          <input
            type="color"
            value={config.highlightColor}
            onPointerDown={captureTextSelection}
            onChange={(event) => updateHighlight(event.target.value)}
            onBlur={saveHistory}
            className="h-9 w-full cursor-pointer rounded-lg border border-zinc-700 bg-transparent"
          />
        </label>
      </div>

      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          captureTextSelection();
        }}
        onClick={() => updateHighlight(config.highlightColor, true)}
        className="mt-2 w-full rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[9px] font-bold text-amber-100 transition hover:bg-amber-400/15"
      >
        Apply highlight to selection
      </button>

      {message && <div className="mt-2 text-[9px] text-amber-200">{message}</div>}
    </div>
  );
};

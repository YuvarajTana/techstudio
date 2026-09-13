import React from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Minus,
  Plus,
  Underline,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import {
  COMMON_FONT_SIZES,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  clampFontSize,
  isEditableTextObject,
  isTextObjectLocked,
  readSelectionStyleValue,
} from '../../utils/textSelectionStyles';

const FONT_FAMILIES = [
  'Fredoka', 'Nunito', 'Arial Rounded MT Bold',
  'Outfit', 'Inter', 'system-ui', 'Arial', 'Georgia',
  'Courier New', 'Times New Roman', 'Verdana', 'Helvetica',
  'Roboto', 'Montserrat', 'Poppins', 'Playfair Display',
  'Pacifico', 'Lobster', 'Oswald', 'Raleway', 'Lato',
  'Merriweather', 'Source Sans Pro'
];

const controlGroupClass = 'flex h-10 shrink-0 items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950/80 p-0.5 shadow-sm';
const iconButtonClass = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:text-zinc-700 disabled:hover:bg-transparent';
const activeIconButtonClass = 'bg-violet-600/20 text-violet-300 ring-1 ring-violet-500/20';

type TextFontSizeControlProps = {
  compact?: boolean;
};

export const TextFontSizeControl: React.FC<TextFontSizeControlProps> = () => {
  const {
    selectedObject,
    fillColor,
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    underline,
    textAlign,
    textSelectionRange,
    setFillColor,
    setFontFamily,
    applyFontSize,
    setFontWeight,
    setFontStyle,
    setUnderline,
    setTextAlign,
    captureTextSelection,
  } = useEditorStore();

  const isText = isEditableTextObject(selectedObject);
  const selectedFontSize = isText
    ? readSelectionStyleValue<number>(selectedObject, 'fontSize', fontSize, textSelectionRange)
    : fontSize;
  const hasMixedFontSize = selectedFontSize === 'Mixed';
  const effectiveFontSize = typeof selectedFontSize === 'number' ? selectedFontSize : fontSize;
  const [fontSizeDraft, setFontSizeDraft] = React.useState(String(effectiveFontSize));
  const fontStepAppliedAtRef = React.useRef(0);

  React.useEffect(() => {
    setFontSizeDraft(hasMixedFontSize ? '' : String(effectiveFontSize));
  }, [effectiveFontSize, hasMixedFontSize]);

  if (!isText) return null;

  const isDisabled = isTextObjectLocked(selectedObject);
  const isBold = fontWeight === 'bold' || Number(fontWeight) >= 600;

  const preserveSelection = () => {
    captureTextSelection();
  };

  const preserveButtonSelection = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    captureTextSelection();
  };

  const commitFontSize = (value = fontSizeDraft) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      setFontSizeDraft(hasMixedFontSize ? '' : String(effectiveFontSize));
      return;
    }
    const nextSize = clampFontSize(parsed);
    setFontSizeDraft(String(nextSize));
    applyFontSize(nextSize);
  };

  const applyFontSizeStep = (event: React.SyntheticEvent<HTMLElement>, delta: number) => {
    event.preventDefault();
    const now = Date.now();
    if (now - fontStepAppliedAtRef.current < 120) return;
    fontStepAppliedAtRef.current = now;
    captureTextSelection();
    applyFontSize(clampFontSize(effectiveFontSize + delta));
  };

  return (
    <>
      <div className={controlGroupClass} aria-label="Font size controls">
        <select
          value={fontFamily}
          disabled={isDisabled}
          onPointerDown={preserveSelection}
          onChange={(event) => setFontFamily(event.target.value)}
          className="h-9 w-[132px] shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-xs font-semibold text-zinc-200 outline-none transition-colors focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-50 lg:w-[150px]"
          title="Font Family"
          aria-label="Font Family"
        >
          {FONT_FAMILIES.map((family) => (
            <option key={family} value={family}>{family}</option>
          ))}
        </select>

        <div className="flex h-9 shrink-0 items-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
          <button
            type="button"
            disabled={isDisabled || effectiveFontSize <= MIN_FONT_SIZE}
            onPointerDown={(event) => applyFontSizeStep(event, -1)}
            onMouseUp={(event) => applyFontSizeStep(event, -1)}
            onClick={(event) => applyFontSizeStep(event, -1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:text-zinc-700 disabled:hover:bg-transparent"
            title="Decrease font size by 1px"
            aria-label="Decrease font size by 1px"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            type="number"
            min={MIN_FONT_SIZE}
            max={MAX_FONT_SIZE}
            value={fontSizeDraft}
            placeholder={hasMixedFontSize ? 'Mixed' : undefined}
            disabled={isDisabled}
            onPointerDown={preserveSelection}
            onChange={(event) => setFontSizeDraft(event.target.value)}
            onBlur={() => commitFontSize()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitFontSize();
                event.currentTarget.blur();
              }
            }}
            className="h-9 w-14 border-x border-zinc-800 bg-transparent px-1 text-center font-mono text-xs text-zinc-100 outline-none placeholder:text-[10px] placeholder:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            title="Change the size of the selected text"
            aria-label="Font Size"
          />
          <button
            type="button"
            disabled={isDisabled || effectiveFontSize >= MAX_FONT_SIZE}
            onPointerDown={(event) => applyFontSizeStep(event, 1)}
            onMouseUp={(event) => applyFontSizeStep(event, 1)}
            onClick={(event) => applyFontSizeStep(event, 1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:text-zinc-700 disabled:hover:bg-transparent"
            title="Increase font size by 1px"
            aria-label="Increase font size by 1px"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <select
          value={!hasMixedFontSize && COMMON_FONT_SIZES.includes(effectiveFontSize) ? effectiveFontSize : ''}
          disabled={isDisabled}
          onPointerDown={preserveSelection}
          onChange={(event) => {
            if (event.target.value) commitFontSize(event.target.value);
          }}
          className="hidden h-9 w-[86px] shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-xs font-semibold text-zinc-300 outline-none transition-colors focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-50 lg:block"
          title="Font size presets"
          aria-label="Font size presets"
        >
          <option value="">Preset</option>
          {COMMON_FONT_SIZES.map((size) => (
            <option key={size} value={size}>{size}px</option>
          ))}
        </select>

        {isDisabled && (
          <span className="hidden max-w-[170px] px-2 text-[10px] font-semibold text-amber-300 xl:inline">
            Unlock this text element to change its size.
          </span>
        )}
      </div>

      <div className={controlGroupClass} aria-label="Text formatting controls">
        <button
          type="button"
          disabled={isDisabled}
          onMouseDown={preserveButtonSelection}
          onClick={() => setFontWeight(isBold ? 'normal' : 'bold')}
          className={`${iconButtonClass} ${isBold ? activeIconButtonClass : ''}`}
          title="Bold"
          aria-label="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={isDisabled}
          onMouseDown={preserveButtonSelection}
          onClick={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
          className={`${iconButtonClass} ${fontStyle === 'italic' ? activeIconButtonClass : ''}`}
          title="Italic"
          aria-label="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={isDisabled}
          onMouseDown={preserveButtonSelection}
          onClick={() => setUnderline(!underline)}
          className={`${iconButtonClass} ${underline ? activeIconButtonClass : ''}`}
          title="Underline"
          aria-label="Underline"
        >
          <Underline className="h-3.5 w-3.5" />
        </button>
        <label
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
          title="Text Colour"
          aria-label="Text Colour"
        >
          <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: fillColor }} />
          <input
            type="color"
            value={fillColor}
            disabled={isDisabled}
            onPointerDown={preserveSelection}
            onChange={(event) => setFillColor(event.target.value)}
            className="sr-only"
            aria-label="Text Colour"
          />
        </label>
      </div>

      <div className={`${controlGroupClass} hidden xl:flex`} aria-label="Text alignment controls">
        {[
          { value: 'left', title: 'Align Left', icon: <AlignLeft className="h-3.5 w-3.5" /> },
          { value: 'center', title: 'Align Center', icon: <AlignCenter className="h-3.5 w-3.5" /> },
          { value: 'right', title: 'Align Right', icon: <AlignRight className="h-3.5 w-3.5" /> },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={isDisabled}
            onMouseDown={preserveButtonSelection}
            onClick={() => setTextAlign(item.value)}
            className={`${iconButtonClass} ${textAlign === item.value ? activeIconButtonClass : ''}`}
            title={item.title}
            aria-label={item.title}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </>
  );
};

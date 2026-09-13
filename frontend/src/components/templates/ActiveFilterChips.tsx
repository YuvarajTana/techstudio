import { X } from 'lucide-react';

export interface ActiveFilterChip {
  id: string;
  label: string;
  onClear: () => void;
}

interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[];
  onClearAll: () => void;
}

export function ActiveFilterChips({ chips, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button key={chip.id} type="button" onClick={chip.onClear} className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-[10px] font-semibold text-violet-200 hover:bg-violet-500/15">
          {chip.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      <button type="button" onClick={onClearAll} className="rounded-full border border-zinc-800 px-3 py-1.5 text-[10px] font-semibold text-zinc-400 hover:text-zinc-200">
        Clear filters
      </button>
    </div>
  );
}

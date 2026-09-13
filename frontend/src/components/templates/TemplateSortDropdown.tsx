import { TEMPLATE_SORT_OPTIONS } from './templateConstants';

interface TemplateSortDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

export function TemplateSortDropdown({ value, onChange }: TemplateSortDropdownProps) {
  return (
    <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400">
      Sort
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-200 outline-none focus:border-violet-400/60">
        {TEMPLATE_SORT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

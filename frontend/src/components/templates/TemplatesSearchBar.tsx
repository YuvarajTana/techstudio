import { Search, X } from 'lucide-react';

interface TemplatesSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TemplatesSearchBar({ value, onChange, placeholder = 'Search templates, categories, styles, or formats' }: TemplatesSearchBarProps) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-zinc-800 bg-black/35 px-11 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-violet-400/60"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" aria-label="Clear template search">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

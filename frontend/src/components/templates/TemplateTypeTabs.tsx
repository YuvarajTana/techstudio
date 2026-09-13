import { TEMPLATE_TYPE_OPTIONS } from './templateConstants';

interface TemplateTypeTabsProps {
  selectedType: string;
  onChange: (type: string) => void;
}

export function TemplateTypeTabs({ selectedType, onChange }: TemplateTypeTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {TEMPLATE_TYPE_OPTIONS.map((type) => (
        <button
          key={type.id}
          type="button"
          onClick={() => onChange(type.id)}
          className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${selectedType === type.id ? 'border-violet-400/60 bg-violet-500/15 text-violet-200' : 'border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:text-zinc-200'}`}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}

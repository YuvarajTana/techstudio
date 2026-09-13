import { createElement, useMemo, useState } from 'react';
import {
  Briefcase,
  Calendar,
  Camera,
  ChevronDown,
  ChevronUp,
  Cpu,
  Dumbbell,
  Globe,
  GraduationCap,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  Megaphone,
  MoreHorizontal,
  Palette,
  Plane,
  Share2,
  Sparkles,
  Tag,
  Utensils,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PRIMARY_TEMPLATE_CATEGORY_SLUGS } from './templateConstants';
import type { TemplateCategory } from './templateTypes';

interface TemplateCategoryFiltersProps {
  categories: TemplateCategory[];
  selectedCategory: string;
  loading?: boolean;
  error?: string;
  onChange: (categorySlug: string) => void;
}

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  all: LayoutGrid,
  business: Briefcase,
  briefcase: Briefcase,
  marketing: Megaphone,
  megaphone: Megaphone,
  holidays: Sparkles,
  sparkles: Sparkles,
  education: GraduationCap,
  'graduation-cap': GraduationCap,
  technology: Cpu,
  cpu: Cpu,
  food: Utensils,
  utensils: Utensils,
  fashion: Heart,
  heart: Heart,
  fitness: Dumbbell,
  dumbbell: Dumbbell,
  travel: Plane,
  plane: Plane,
  events: Calendar,
  calendar: Calendar,
  camera: Camera,
  'share-2': Share2,
  globe: Globe,
  users: Users,
  image: ImageIcon,
  palette: Palette,
  tag: Tag,
};

const getCategoryIcon = (category: TemplateCategory): LucideIcon => (
  CATEGORY_ICON_MAP[category.slug] || CATEGORY_ICON_MAP[category.icon || ''] || Tag
);

const sortCategories = (categories: TemplateCategory[]) => [...categories].sort((first, second) => {
  const firstIndex = PRIMARY_TEMPLATE_CATEGORY_SLUGS.indexOf(first.slug);
  const secondIndex = PRIMARY_TEMPLATE_CATEGORY_SLUGS.indexOf(second.slug);
  if (firstIndex !== -1 || secondIndex !== -1) {
    return (firstIndex === -1 ? 999 : firstIndex) - (secondIndex === -1 ? 999 : secondIndex);
  }
  return (first.sort_order || 0) - (second.sort_order || 0) || first.name.localeCompare(second.name);
});

function CategoryButton({ category, selected, onClick }: { category: TemplateCategory; selected: boolean; onClick: () => void }) {
  const Icon = getCategoryIcon(category);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${selected ? 'border-violet-400/60 bg-violet-500/15 text-violet-200' : 'border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'}`}
    >
      {createElement(Icon, { className: 'h-3.5 w-3.5' })}
      {category.name}
    </button>
  );
}

export function TemplateCategoryFilters({ categories, selectedCategory, loading = false, error = '', onChange }: TemplateCategoryFiltersProps) {
  const [showMore, setShowMore] = useState(false);
  const { primaryCategories, secondaryCategories } = useMemo(() => {
    const ordered = sortCategories(categories);
    const primary = ordered.filter((category) => PRIMARY_TEMPLATE_CATEGORY_SLUGS.includes(category.slug));
    const secondary = ordered.filter((category) => !PRIMARY_TEMPLATE_CATEGORY_SLUGS.includes(category.slug));
    if (primary.length === 0) {
      return {
        primaryCategories: ordered.slice(0, 10),
        secondaryCategories: ordered.slice(10),
      };
    }
    return { primaryCategories: primary, secondaryCategories: secondary };
  }, [categories]);

  const selectedInSecondary = secondaryCategories.some((category) => category.slug === selectedCategory);
  const expandedSecondary = showMore || selectedInSecondary;

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, index) => <span key={index} className="h-9 w-24 animate-pulse rounded-full bg-zinc-900" />)}
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">{error}</div>;
  }

  return (
    <div className="space-y-3 rounded-3xl border border-zinc-900 bg-zinc-950/40 p-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange('all')}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${selectedCategory === 'all' ? 'border-violet-400/60 bg-violet-500/15 text-violet-200' : 'border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'}`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          All Categories
        </button>
        {primaryCategories.map((category) => (
          <CategoryButton key={category.id} category={category} selected={selectedCategory === category.slug} onClick={() => onChange(category.slug)} />
        ))}
        {secondaryCategories.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMore((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/70 px-4 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-violet-400/40 hover:text-violet-100"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            More Categories
            {expandedSecondary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {expandedSecondary && secondaryCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-zinc-900 pt-3">
          {secondaryCategories.map((category) => (
            <CategoryButton key={category.id} category={category} selected={selectedCategory === category.slug} onClick={() => onChange(category.slug)} />
          ))}
        </div>
      )}
    </div>
  );
}

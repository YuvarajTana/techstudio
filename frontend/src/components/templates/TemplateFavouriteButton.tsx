import { useState } from 'react';
import { Heart } from 'lucide-react';
import { favouriteTemplate, unfavouriteTemplate } from '../../services/templatesApi';

interface TemplateFavouriteButtonProps {
  templateId: string;
  isFavourite: boolean;
  onChange: (templateId: string, isFavourite: boolean) => void;
  onError?: (message: string) => void;
}

export function TemplateFavouriteButton({ templateId, isFavourite, onChange, onError }: TemplateFavouriteButtonProps) {
  const [saving, setSaving] = useState(false);

  const toggleFavourite = async () => {
    if (saving) return;
    const nextValue = !isFavourite;
    setSaving(true);
    onChange(templateId, nextValue);
    try {
      const response = nextValue ? await favouriteTemplate(templateId) : await unfavouriteTemplate(templateId);
      onChange(templateId, response.is_favourite);
    } catch (error) {
      onChange(templateId, isFavourite);
      onError?.(error instanceof Error ? error.message : 'Failed to update favourite.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleFavourite}
      disabled={saving}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${isFavourite ? 'border-rose-400/40 bg-rose-500/15 text-rose-200' : 'border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:border-rose-400/40 hover:text-rose-200'}`}
      aria-label={isFavourite ? 'Remove template from favourites' : 'Add template to favourites'}
    >
      <Heart className="h-4 w-4" fill={isFavourite ? 'currentColor' : 'none'} />
    </button>
  );
}

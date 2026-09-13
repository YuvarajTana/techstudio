import React, { useState } from 'react';
import { Bookmark, Save, Loader2, Check } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { apiFetch } from '../../services/apiClient';

interface SaveAsTemplateProps {
  onSaved?: () => void;
}

const TEMPLATE_TYPES = [
  { value: 'poster', label: 'Poster' },
  { value: 'instagram-post', label: 'Instagram Post' },
  { value: 'instagram-story', label: 'Instagram Story' },
  { value: 'youtube-thumbnail', label: 'YouTube Thumbnail' },
  { value: 'linkedin-post', label: 'LinkedIn Post' },
  { value: 'facebook-post', label: 'Facebook Post' },
  { value: 'twitter-post', label: 'Twitter Post' },
  { value: 'flyer', label: 'Flyer' },
  { value: 'business-card', label: 'Business Card' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'banner', label: 'Banner' },
  { value: 'invitation', label: 'Invitation' },
];

const CATEGORY_OPTIONS = [
  { value: 'business', label: 'Business' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'social-media', label: 'Social Media' },
  { value: 'events', label: 'Events' },
  { value: 'education', label: 'Education' },
  { value: 'technology', label: 'Technology' },
  { value: 'food', label: 'Food & Restaurant' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'travel', label: 'Travel' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'creative', label: 'Creative' },
];

export const SaveAsTemplate: React.FC<SaveAsTemplateProps> = ({ onSaved }) => {
  const { canvas, canvasWidth, canvasHeight } = useEditorStore();
  const [isOpen, setIsOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [templateType, setTemplateType] = useState('poster');
  const [categorySlug, setCategorySlug] = useState('creative');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-semibold transition-colors"
      >
        <Bookmark className="w-3.5 h-3.5" />
        Save as Template
      </button>
    );
  }

  const handleSave = async () => {
    if (!canvas || !templateName.trim()) return;
    setSaving(true);
    setError('');

    try {
      // Get canvas data
      const canvasData = JSON.stringify(canvas.toJSON());

      // Generate thumbnail
      const thumbnail = canvas.toDataURL({
        format: 'png',
        multiplier: 0.25,
        quality: 0.8,
      });

      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);

      const response = await apiFetch('/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: templateName.trim(),
          description: description.trim() || `Custom template: ${templateName.trim()}`,
          template_type: templateType,
          category_slug: categorySlug,
          data: canvasData,
          thumbnail_url: thumbnail,
          width: canvasWidth,
          height: canvasHeight,
          tags: tagList,
          status: 'published',
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail || `Failed to save template (${response.status})`);
      }

      setSaved(true);
      setTimeout(() => {
        setIsOpen(false);
        setSaved(false);
        setTemplateName('');
        setDescription('');
        setTags('');
        onSaved?.();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-bold text-zinc-200">Save as Template</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-[10px] text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>

      {/* Preview */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2">
        <p className="text-[9px] text-zinc-500 mb-1">Canvas Preview</p>
        <div className="aspect-video bg-zinc-900 rounded overflow-hidden flex items-center justify-center">
          {canvas ? (
            <img
              src={canvas.toDataURL({ format: 'png', multiplier: 0.15 })}
              alt="Canvas preview"
              className="max-h-16 object-contain"
            />
          ) : (
            <span className="text-[9px] text-zinc-600">No canvas</span>
          )}
        </div>
        <p className="text-[8px] text-zinc-600 mt-1">{canvasWidth} × {canvasHeight}px</p>
      </div>

      {/* Form */}
      <div className="space-y-2">
        <div>
          <label className="text-[10px] font-semibold text-zinc-500">Template Name *</label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="My Custom Template"
            className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold text-zinc-500">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the template..."
            rows={2}
            className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-violet-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-semibold text-zinc-500">Type</label>
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
              className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 outline-none"
            >
              {TEMPLATE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-zinc-500">Category</label>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 outline-none"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-zinc-500">Tags (comma-separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="modern, minimal, business"
            className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-2 py-1.5">
          {error}
        </p>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || !templateName.trim() || saved}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
          saved
            ? 'bg-emerald-600 text-white'
            : 'bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50'
        }`}
      >
        {saving ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Saving...
          </>
        ) : saved ? (
          <>
            <Check className="w-3.5 h-3.5" />
            Saved to Templates!
          </>
        ) : (
          <>
            <Save className="w-3.5 h-3.5" />
            Save Template
          </>
        )}
      </button>
    </div>
  );
};

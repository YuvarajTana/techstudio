import { apiFetch, apiUrl } from './apiClient';

export type ImageProcessingResult = {
  id: string;
  operation: string;
  provider: string;
  imageUrl: string;
  originalUrl: string;
  maskUrl?: string | null;
  mimeType: string;
  width: number;
  height: number;
  metadata?: Record<string, unknown>;
};

const normalizeMediaUrl = (value?: string | null) => {
  if (!value) return '';
  if (value.startsWith('data:') || value.startsWith('blob:') || /^https?:\/\//i.test(value)) return value;
  return apiUrl(value);
};

async function sourceToFile(source: string, filename: string, signal?: AbortSignal) {
  const response = await fetch(normalizeMediaUrl(source), { signal });
  if (!response.ok) throw new Error(`Unable to read the selected image (${response.status}).`);
  const contentType = response.headers.get('content-type') || 'image/png';
  if (!contentType.startsWith('image/')) throw new Error('The selected source did not return image data.');
  const blob = await response.blob();
  if (!blob.size) throw new Error('The selected image is empty.');
  return new File([blob], filename, { type: contentType });
}

async function parseResponse(response: Response): Promise<ImageProcessingResult> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = Array.isArray(payload?.detail)
      ? payload.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(', ')
      : payload?.detail || payload?.error;
    throw new Error(detail || `Image processing failed (${response.status}).`);
  }
  const result = payload?.result;
  if (!result?.imageUrl) throw new Error('Image processing returned no usable image URL.');
  return {
    ...result,
    imageUrl: normalizeMediaUrl(result.imageUrl),
    originalUrl: normalizeMediaUrl(result.originalUrl),
    maskUrl: normalizeMediaUrl(result.maskUrl) || null,
  } as ImageProcessingResult;
}

export async function removeImageBackground(source: string, signal?: AbortSignal) {
  const formData = new FormData();
  formData.append('image', await sourceToFile(source, 'source-image.png', signal));
  const response = await apiFetch('/api/images/remove-background', {
    method: 'POST',
    body: formData,
    signal,
    timeoutMs: 130000,
  });
  return parseResponse(response);
}

export async function applyPersonImageEffect(options: {
  source: string;
  originalSource?: string;
  backgroundFile?: File;
  operation: string;
  color?: string;
  width?: number;
  blur?: number;
  signal?: AbortSignal;
}) {
  const formData = new FormData();
  formData.append('image', await sourceToFile(options.source, 'person-cutout.png', options.signal));
  formData.append('operation', options.operation);
  formData.append('color', options.color || '#8b5cf6');
  formData.append('width', String(options.width ?? 8));
  formData.append('blur', String(options.blur ?? 18));
  if (options.originalSource) {
    formData.append('original_image', await sourceToFile(options.originalSource, 'original-image.png', options.signal));
  }
  if (options.backgroundFile) formData.append('background_image', options.backgroundFile);
  const response = await apiFetch('/api/images/apply-effect', {
    method: 'POST',
    body: formData,
    signal: options.signal,
    timeoutMs: 130000,
  });
  return parseResponse(response);
}

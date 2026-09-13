import { apiJson, apiUrl, getAuthToken } from './apiClient';
import type {
  PosterAnalysisJob,
  PosterAnalysisMode,
  PosterAnalysisResult,
  PosterTextPatchResult,
  PosterTextBlock,
  UploadedImageAsset,
  UploadedImageList,
} from '../types/uploads';

const normalizeAsset = (asset: UploadedImageAsset): UploadedImageAsset => ({
  ...asset,
  url: asset.url.startsWith('/') ? apiUrl(asset.url) : asset.url,
  thumbnailUrl: asset.thumbnailUrl.startsWith('/') ? apiUrl(asset.thumbnailUrl) : asset.thumbnailUrl,
});

export async function listUploadedImages(search = '', signal?: AbortSignal) {
  const query = new URLSearchParams({ limit: '100' });
  if (search.trim()) query.set('search', search.trim());
  const result = await apiJson<UploadedImageList>(`/api/uploads/images?${query.toString()}`, { signal });
  return { ...result, items: result.items.map(normalizeAsset) };
}

export function uploadImageAsset(
  file: File,
  projectId?: string | null,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
) {
  return new Promise<UploadedImageAsset>((resolve, reject) => {
    const token = getAuthToken();
    if (!token) {
      reject(new Error('Please sign in to upload reusable images.'));
      return;
    }
    const request = new XMLHttpRequest();
    request.open('POST', apiUrl('/api/uploads/images'));
    request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.responseType = 'json';
    request.timeout = 120_000;

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      const payload = request.response;
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve(normalizeAsset(payload as UploadedImageAsset));
        return;
      }
      reject(new Error(payload?.detail || payload?.error || `Upload failed (${request.status}).`));
    };
    request.onerror = () => reject(new Error('Upload failed because the backend could not be reached.'));
    request.ontimeout = () => reject(new Error('Upload timed out. Please retry.'));
    request.onabort = () => reject(new DOMException('Upload cancelled.', 'AbortError'));
    signal?.addEventListener('abort', () => request.abort(), { once: true });

    const formData = new FormData();
    formData.append('image', file);
    if (projectId && !projectId.startsWith('local_')) formData.append('project_id', projectId);
    request.send(formData);
  });
}

export async function deleteUploadedImage(assetId: string) {
  await apiJson<void>(`/api/uploads/images/${encodeURIComponent(assetId)}`, { method: 'DELETE' });
}

export async function renameUploadedImage(assetId: string, filename: string) {
  const result = await apiJson<UploadedImageAsset>(`/api/uploads/images/${encodeURIComponent(assetId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ filename }),
  });
  return normalizeAsset(result);
}

const normalizePosterResult = (result: PosterAnalysisResult): PosterAnalysisResult => ({
  ...result,
  source: {
    ...result.source,
    url: result.source.url.startsWith('/') ? apiUrl(result.source.url) : result.source.url,
  },
  clean_background: {
    ...result.clean_background,
    url: result.clean_background.url.startsWith('/') ? apiUrl(result.clean_background.url) : result.clean_background.url,
  },
  colour_regions: result.colour_regions.map((region) => ({
    ...region,
    mask_url: region.mask_url.startsWith('/') ? apiUrl(region.mask_url) : region.mask_url,
  })),
});

const normalizePosterJob = (job: PosterAnalysisJob): PosterAnalysisJob => (
  job.result ? { ...job, result: normalizePosterResult(job.result) } : job
);

export async function startPosterAnalysis(
  assetId: string,
  mode: PosterAnalysisMode,
  language = 'auto',
  signal?: AbortSignal,
) {
  const job = await apiJson<PosterAnalysisJob>('/api/image-edit/analyze', {
    method: 'POST',
    signal,
    timeoutMs: 30_000,
    body: JSON.stringify({ asset_id: assetId, mode, language }),
  });
  return normalizePosterJob(job);
}

export async function getPosterAnalysis(jobId: string, signal?: AbortSignal) {
  const job = await apiJson<PosterAnalysisJob>(`/api/image-edit/jobs/${encodeURIComponent(jobId)}`, {
    signal,
    timeoutMs: 30_000,
  });
  return normalizePosterJob(job);
}

export async function cancelPosterAnalysis(jobId: string) {
  return apiJson<PosterAnalysisJob>(`/api/image-edit/jobs/${encodeURIComponent(jobId)}`, {
    method: 'DELETE',
  });
}

export async function finalizePosterAnalysis(jobId: string, textBlocks: PosterTextBlock[]) {
  const result = await apiJson<PosterAnalysisResult>('/api/image-edit/make-editable', {
    method: 'POST',
    timeoutMs: 30_000,
    body: JSON.stringify({ job_id: jobId, text_blocks: textBlocks }),
  });
  return normalizePosterResult(result);
}

export async function retryPosterCleanup(jobId: string, signal?: AbortSignal) {
  const job = await apiJson<PosterAnalysisJob>('/api/image-edit/retry-cleanup', {
    method: 'POST',
    signal,
    timeoutMs: 30_000,
    body: JSON.stringify({ job_id: jobId }),
  });
  return normalizePosterJob(job);
}

export async function convertPosterTextRegion(jobId: string, blockId: string) {
  const result = await apiJson<PosterTextPatchResult>('/api/image-edit/regions/convert', {
    method: 'POST',
    timeoutMs: 60_000,
    body: JSON.stringify({ job_id: jobId, block_id: blockId }),
  });
  return {
    ...result,
    asset: {
      ...result.asset,
      url: result.asset.url.startsWith('/') ? apiUrl(result.asset.url) : result.asset.url,
    },
  };
}

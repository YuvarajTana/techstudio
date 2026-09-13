import { apiFetch } from './apiClient';

export type AiProviderAttempt = {
  provider?: string;
  status?: string;
  category?: string;
  retryable?: boolean;
};

export type AiPromptEnhancementResponse = {
  success?: boolean;
  status?: string;
  request_id?: string;
  capability?: string;
  enhanced_prompt: string;
  style_analysis?: string;
  color_palette?: string[];
  composition_notes?: string;
  lighting_description?: string;
  visual_elements?: string[];
  provider?: string;
  source?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  provider_attempts?: AiProviderAttempt[];
};

export class AiClientError extends Error {
  status: number;
  detail: unknown;
  code?: string;
  retryable?: boolean;

  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = 'AiClientError';
    this.status = status;
    this.detail = detail;
    const payload = (detail as any)?.detail || detail;
    this.code = payload?.code || payload?.error_code;
    this.retryable = Boolean(payload?.retryable);
  }
}

async function parseAiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail || payload;
    const message = detail?.message || detail?.error || detail?.detail || `AI request failed with status ${response.status}`;
    throw new AiClientError(response.status, String(message), payload);
  }
  return payload as T;
}

export const aiClient = {
  async health(signal?: AbortSignal) {
    const response = await apiFetch('/api/ai/health', { method: 'GET', signal, timeoutMs: 15000 });
    return parseAiResponse(response);
  },

  async enhancePrompt(
    body: {
      prompt: string;
      reference_description?: string;
      style?: string;
      aspect_ratio?: string;
    },
    signal?: AbortSignal,
  ) {
    const response = await apiFetch('/api/ai/generate-image-prompt', {
      method: 'POST',
      signal,
      timeoutMs: 45000,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return parseAiResponse<AiPromptEnhancementResponse>(response);
  },
};

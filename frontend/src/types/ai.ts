export type AICapabilities = {
  chat: boolean;
  promptEnhancement: boolean;
  posterPlanning: boolean;
  imageGeneration: boolean;
  thumbnailGeneration: boolean;
};

export type AIProviderHealth = {
  configured: boolean;
  key_fingerprint?: string | null;
  available?: boolean;
  reason?: string | null;
  checked_at?: string | null;
  image_available?: boolean;
  image_reason?: string | null;
  chat_available?: boolean;
  chat_reason?: string | null;
  chat_checked_at?: string | null;
};

export type AIProviderStatus = {
  image_provider_order: string[];
  chat_provider_order: string[];
  local_fallback_enabled: boolean;
  production_image_policy: string;
  capabilities: AICapabilities;
  providers: Record<string, AIProviderHealth>;
};

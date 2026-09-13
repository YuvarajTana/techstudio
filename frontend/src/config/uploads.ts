const configuredLimit = Number(import.meta.env.VITE_MAX_UPLOAD_IMAGE_MB || 15);

export const UPLOAD_IMAGE_RULES = {
  acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'] as const,
  acceptAttribute: 'image/png,image/jpeg,image/webp',
  maxFileSizeMb: Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 15,
};

export const MAX_UPLOAD_IMAGE_BYTES = UPLOAD_IMAGE_RULES.maxFileSizeMb * 1024 * 1024;

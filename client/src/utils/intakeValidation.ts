export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MiB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function isAllowedImageFile(file: { name: string; size: number; type?: string }): {
  valid: boolean;
  reason?: 'size' | 'type' | 'mime';
} {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, reason: 'size' };
  }

  // Client-side MIME and extension check
  const hasValidMime = file.type ? ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) : false;
  const fileNameLower = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext));

  if (!hasValidMime && !hasValidExt) {
    return { valid: false, reason: file.type ? 'type' : 'mime' };
  }

  return { valid: true };
}

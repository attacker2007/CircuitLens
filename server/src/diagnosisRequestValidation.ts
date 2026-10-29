/**
 * CircuitLens Stage 3 — Server-Side Diagnosis Request Validation
 *
 * Provides reusable runtime validation for diagnostic intake requests before
 * forwarding to external APIs.
 *
 * NOTE ON MIME VALIDATION & MAGIC BYTES:
 * Checking the data URL header and initial magic bytes confirms container format signatures,
 * but does not perform full pixel/codec decompression. Full decompression is avoided
 * to keep backend dependencies minimal and maintain low-latency processing.
 */

import type { DiagnosisRequest } from './types/diagnosis.js';

export class DiagnosisRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiagnosisRequestValidationError';
  }
}

export const REQUEST_LIMITS = {
  /**
   * Maximum allowed decoded image size in bytes.
   * Default: 10 MiB (10,485,760 bytes) to match client MAX_FILE_SIZE_BYTES.
   */
  DEFAULT_MAX_IMAGE_BYTES: 10 * 1024 * 1024,
  MAX_BOARD_NAME_LENGTH: 200,
  MAX_EXPECTED_BEHAVIOR_LENGTH: 2000,
  MAX_OBSERVED_BEHAVIOR_LENGTH: 2000,
  MAX_COMPONENTS_LENGTH: 500,
  MAX_NOTES_LENGTH: 2000,
} as const;

export const SUPPORTED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type SupportedImageMime = (typeof SUPPORTED_IMAGE_MIMES)[number];

const DATA_URL_PATTERN = /^data:([a-zA-Z0-9+/.-]+);base64,([A-Za-z0-9+/=\r\n]+)$/;

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Validates header magic bytes for supported image formats.
 */
function verifyMagicBytes(headerBuffer: Buffer, mime: SupportedImageMime): boolean {
  if (headerBuffer.length < 4) return false;

  switch (mime) {
    case 'image/jpeg':
      // JPEG SOI marker: 0xFF, 0xD8, 0xFF
      return headerBuffer[0] === 0xff && headerBuffer[1] === 0xd8 && headerBuffer[2] === 0xff;

    case 'image/png':
      // PNG signature: 0x89, 0x50, 0x4E, 0x47
      return (
        headerBuffer.length >= 8 &&
        headerBuffer[0] === 0x89 &&
        headerBuffer[1] === 0x50 &&
        headerBuffer[2] === 0x4e &&
        headerBuffer[3] === 0x47
      );

    case 'image/webp':
      // WebP signature: 'RIFF' at 0..3 and 'WEBP' at 8..11
      if (headerBuffer.length < 12) return false;
      const isRiff =
        headerBuffer[0] === 0x52 &&
        headerBuffer[1] === 0x49 &&
        headerBuffer[2] === 0x46 &&
        headerBuffer[3] === 0x46;
      const isWebp =
        headerBuffer[8] === 0x57 &&
        headerBuffer[9] === 0x45 &&
        headerBuffer[10] === 0x42 &&
        headerBuffer[11] === 0x50;
      return isRiff && isWebp;

    default:
      return false;
  }
}

/**
 * Validates the base64 image data URL for schema, supported MIME, size limits, and magic bytes.
 */
export function validateImageDataUrl(
  dataUrl: unknown,
  maxBytes: number = REQUEST_LIMITS.DEFAULT_MAX_IMAGE_BYTES
): { mime: SupportedImageMime; decodedBytes: number } {
  if (typeof dataUrl !== 'string' || dataUrl.trim() === '') {
    throw new DiagnosisRequestValidationError('Field "image" must be a non-empty base64 data URL string.');
  }

  const match = dataUrl.trim().match(DATA_URL_PATTERN);
  if (!match) {
    throw new DiagnosisRequestValidationError(
      'Field "image" is not a valid base64 data URL (expected format: "data:<mime>;base64,<payload>").'
    );
  }

  const declaredMime = match[1].toLowerCase();
  const rawBase64 = match[2].replace(/[\r\n\s]/g, '');

  if (!SUPPORTED_IMAGE_MIMES.includes(declaredMime as SupportedImageMime)) {
    throw new DiagnosisRequestValidationError(
      `Unsupported image MIME type "${declaredMime}". Supported formats are: ${SUPPORTED_IMAGE_MIMES.join(', ')}.`
    );
  }

  // Validate base64 character set and padding
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(rawBase64) || rawBase64.length % 4 !== 0) {
    throw new DiagnosisRequestValidationError('Field "image" contains invalid base64 encoding or incorrect padding.');
  }

  // Calculate decoded byte length without full buffer allocation
  const padding = (rawBase64.endsWith('==') ? 2 : rawBase64.endsWith('=') ? 1 : 0);
  const decodedBytes = Math.floor((rawBase64.length * 3) / 4) - padding;

  if (decodedBytes <= 0) {
    throw new DiagnosisRequestValidationError('Decoded image payload is empty (0 bytes).');
  }

  if (decodedBytes > maxBytes) {
    throw new DiagnosisRequestValidationError(
      `Decoded image size (${(decodedBytes / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of ${(maxBytes / (1024 * 1024)).toFixed(2)} MB.`
    );
  }

  // Decode only header bytes (up to 32 bytes) to check magic numbers
  const headerBase64Chunk = rawBase64.slice(0, 48);
  const headerBuffer = Buffer.from(headerBase64Chunk, 'base64');

  if (!verifyMagicBytes(headerBuffer, declaredMime as SupportedImageMime)) {
    throw new DiagnosisRequestValidationError(
      `Image payload header signature does not match declared MIME type "${declaredMime}".`
    );
  }

  return {
    mime: declaredMime as SupportedImageMime,
    decodedBytes,
  };
}

export interface ValidationOptions {
  maxImageBytes?: number;
}

/**
 * Validates untrusted incoming request body against the DiagnosisRequest contract.
 * Rejects invalid, unexpected, or oversized fields. Returns sanitized object with trimmed strings.
 */
export function validateDiagnosisRequest(
  payload: unknown,
  options?: ValidationOptions
): DiagnosisRequest {
  if (!isRecord(payload)) {
    throw new DiagnosisRequestValidationError('Request payload must be a non-null JSON object.');
  }

  const maxImageBytes = options?.maxImageBytes ?? REQUEST_LIMITS.DEFAULT_MAX_IMAGE_BYTES;

  // 1. Validate Image
  validateImageDataUrl(payload.image, maxImageBytes);
  const image = (payload.image as string).trim();

  // 2. Validate Required Field: expectedBehavior
  if (typeof payload.expectedBehavior !== 'string' || payload.expectedBehavior.trim() === '') {
    throw new DiagnosisRequestValidationError('Field "expectedBehavior" is required and must be a non-empty string.');
  }
  if (payload.expectedBehavior.trim().length > REQUEST_LIMITS.MAX_EXPECTED_BEHAVIOR_LENGTH) {
    throw new DiagnosisRequestValidationError(
      `Field "expectedBehavior" exceeds maximum allowed length of ${REQUEST_LIMITS.MAX_EXPECTED_BEHAVIOR_LENGTH} characters.`
    );
  }
  const expectedBehavior = payload.expectedBehavior.trim();

  // 3. Validate Required Field: observedBehavior
  if (typeof payload.observedBehavior !== 'string' || payload.observedBehavior.trim() === '') {
    throw new DiagnosisRequestValidationError('Field "observedBehavior" is required and must be a non-empty string.');
  }
  if (payload.observedBehavior.trim().length > REQUEST_LIMITS.MAX_OBSERVED_BEHAVIOR_LENGTH) {
    throw new DiagnosisRequestValidationError(
      `Field "observedBehavior" exceeds maximum allowed length of ${REQUEST_LIMITS.MAX_OBSERVED_BEHAVIOR_LENGTH} characters.`
    );
  }
  const observedBehavior = payload.observedBehavior.trim();

  // 4. Validate Optional Field: boardName
  let boardName: string | undefined;
  if (payload.boardName !== undefined && payload.boardName !== null) {
    if (typeof payload.boardName !== 'string') {
      throw new DiagnosisRequestValidationError('Optional field "boardName" must be a string if provided.');
    }
    if (payload.boardName.trim().length > REQUEST_LIMITS.MAX_BOARD_NAME_LENGTH) {
      throw new DiagnosisRequestValidationError(
        `Field "boardName" exceeds maximum allowed length of ${REQUEST_LIMITS.MAX_BOARD_NAME_LENGTH} characters.`
      );
    }
    boardName = payload.boardName.trim() || undefined;
  }

  // 5. Validate Optional Field: relevantComponents
  let relevantComponents: string | undefined;
  if (payload.relevantComponents !== undefined && payload.relevantComponents !== null) {
    if (typeof payload.relevantComponents !== 'string') {
      throw new DiagnosisRequestValidationError(
        'Optional field "relevantComponents" must be a string if provided.'
      );
    }
    if (payload.relevantComponents.trim().length > REQUEST_LIMITS.MAX_COMPONENTS_LENGTH) {
      throw new DiagnosisRequestValidationError(
        `Field "relevantComponents" exceeds maximum allowed length of ${REQUEST_LIMITS.MAX_COMPONENTS_LENGTH} characters.`
      );
    }
    relevantComponents = payload.relevantComponents.trim() || undefined;
  }

  // 6. Validate Optional Field: additionalNotes
  let additionalNotes: string | undefined;
  if (payload.additionalNotes !== undefined && payload.additionalNotes !== null) {
    if (typeof payload.additionalNotes !== 'string') {
      throw new DiagnosisRequestValidationError(
        'Optional field "additionalNotes" must be a string if provided.'
      );
    }
    if (payload.additionalNotes.trim().length > REQUEST_LIMITS.MAX_NOTES_LENGTH) {
      throw new DiagnosisRequestValidationError(
        `Field "additionalNotes" exceeds maximum allowed length of ${REQUEST_LIMITS.MAX_NOTES_LENGTH} characters.`
      );
    }
    additionalNotes = payload.additionalNotes.trim() || undefined;
  }

  return {
    image,
    expectedBehavior,
    observedBehavior,
    boardName,
    relevantComponents,
    additionalNotes,
  };
}

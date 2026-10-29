/**
 * CircuitLens Stage 5C-3D — Client Image Payload Optimizer
 *
 * Implements deterministic client-side image downscaling and compression
 * for oversized photographic circuit images before transmission to /api/diagnose.
 *
 * Requirements:
 * - Preserves aspect ratio and NEVER upscales.
 * - Caps maximum dimension at 1,800 pixels.
 * - Uses JPEG quality 0.85 initially, with deterministic fallback if needed.
 * - Fills solid white background for transparent source images (PNG/WebP)
 *   so transparent circuit areas do not turn black on JPEG export.
 * - Avoids re-encoding already-small images to preserve fine silkscreen and trace detail.
 * - Handles corrupt or unsupported images gracefully.
 * - Safe for browser environments with fallback/mock support for offline Node test suites.
 */

import { DiagnosisClientError } from '../api/diagnosisClient.ts';

export const OPTIMIZATION_CONFIG = {
  /** Maximum allowable width or height for optimized images */
  MAX_DIMENSION: 1800,
  /** Initial JPEG compression quality */
  INITIAL_JPEG_QUALITY: 0.85,
  /** Fallback JPEG quality if initial compression still exceeds target budget */
  FALLBACK_JPEG_QUALITY: 0.75,
  /**
   * Maximum raw file size (in bytes) under which an already-in-bounds image
   * will NOT be re-encoded (1 MiB = 1,048,576 bytes).
   */
  MAX_UNOPTIMIZED_SIZE_BYTES: 1024 * 1024,
  /** Target maximum payload size for optimized base64 payload (4 MiB) */
  TARGET_MAX_PAYLOAD_BYTES: 4 * 1024 * 1024,
} as const;

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface TargetDimensionsResult {
  width: number;
  height: number;
  scaled: boolean;
  scaleFactor: number;
}

export interface OptimizedImageResult {
  dataUrl: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  width: number;
  height: number;
  bytes: number;
  wasOptimized: boolean;
  originalBytes: number;
}

export interface ImageOptimizerOptions {
  maxDimension?: number;
  quality?: number;
  maxUnoptimizedSizeBytes?: number;
  targetMaxPayloadBytes?: number;
  /** Test adapter hook to supply canvas rendering without browser globals */
  canvasRenderer?: (
    source: ImageDimensions & { dataUrl?: string },
    target: ImageDimensions,
    quality: number,
    fillBackground: string
  ) => { dataUrl: string; mimeType: 'image/jpeg'; bytes: number };
}

/**
 * Calculates proportional target dimensions preserving aspect ratio without upscaling.
 */
export function calculateTargetDimensions(
  srcWidth: number,
  srcHeight: number,
  maxDimension: number = OPTIMIZATION_CONFIG.MAX_DIMENSION
): TargetDimensionsResult {
  if (!Number.isFinite(srcWidth) || !Number.isFinite(srcHeight) || srcWidth <= 0 || srcHeight <= 0) {
    throw new DiagnosisClientError(
      `Invalid source image dimensions (${srcWidth}x${srcHeight}). Dimensions must be positive numbers.`,
      'INVALID_IMAGE',
      400
    );
  }

  const roundedWidth = Math.round(srcWidth);
  const roundedHeight = Math.round(srcHeight);

  // If already within maxDimension bounds, do not scale or upscale
  if (roundedWidth <= maxDimension && roundedHeight <= maxDimension) {
    return {
      width: roundedWidth,
      height: roundedHeight,
      scaled: false,
      scaleFactor: 1.0,
    };
  }

  const maxSide = Math.max(roundedWidth, roundedHeight);
  const scaleFactor = maxDimension / maxSide;

  return {
    width: Math.max(1, Math.round(roundedWidth * scaleFactor)),
    height: Math.max(1, Math.round(roundedHeight * scaleFactor)),
    scaled: true,
    scaleFactor,
  };
}

/**
 * Determines whether an image should undergo optimization.
 * Skips re-encoding for images that are already <= 1800px and <= 1.0 MiB.
 */
export function shouldOptimizeImage(
  dimensions: ImageDimensions,
  fileSizeBytes: number,
  maxDimension: number = OPTIMIZATION_CONFIG.MAX_DIMENSION,
  maxUnoptimizedSizeBytes: number = OPTIMIZATION_CONFIG.MAX_UNOPTIMIZED_SIZE_BYTES
): boolean {
  if (dimensions.width > maxDimension || dimensions.height > maxDimension) {
    return true;
  }
  if (fileSizeBytes > maxUnoptimizedSizeBytes) {
    return true;
  }
  return false;
}

/**
 * Encodes a local File object into a base64 data URL using FileReader or arrayBuffer fallback.
 */
async function readFileAsDataUrl(file: File): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(
            new DiagnosisClientError(
              'Failed to read image as base64 data URL.',
              'ENCODING_ERROR',
              400
            )
          );
        }
      };
      reader.onerror = () => {
        reject(
          new DiagnosisClientError(
            'Browser failed to read image file.',
            'FILE_READ_ERROR',
            400
          )
        );
      };
      reader.readAsDataURL(file);
    });
  }

  // Fallback for Node.js / headless test environments
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/**
 * Computes the approximate decoded byte size of a base64 data URL.
 */
export function estimateDecodedByteSize(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return 0;
  const base64Len = dataUrl.length - (commaIdx + 1);
  return Math.floor((base64Len * 3) / 4);
}

/**
 * Loads an image from an object URL or data URL and returns its dimensions.
 */
function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      reject(
        new DiagnosisClientError(
          'The selected image file is corrupted or could not be decoded by the browser.',
          'INVALID_IMAGE',
          400
        )
      );
    };
    img.src = url;
  });
}

/**
 * Optimizes an image File for visual diagnostic reasoning:
 * 1. Checks dimensions and file size.
 * 2. If already <= 1800px and <= 1.0 MiB, preserves original file data without re-encoding.
 * 3. If oversized, downscales proportionally to max 1800px.
 * 4. Fills solid white background on canvas to preserve contrast for transparent PNG/WebP files.
 * 5. Compresses to JPEG with initial quality ~0.85 (with fallback to 0.75 if needed).
 */
export async function optimizeImageForDiagnosis(
  file: File,
  options?: ImageOptimizerOptions
): Promise<OptimizedImageResult> {
  const maxDim = options?.maxDimension ?? OPTIMIZATION_CONFIG.MAX_DIMENSION;
  const initialQuality = options?.quality ?? OPTIMIZATION_CONFIG.INITIAL_JPEG_QUALITY;
  const fallbackQuality = OPTIMIZATION_CONFIG.FALLBACK_JPEG_QUALITY;
  const maxUnoptimized = options?.maxUnoptimizedSizeBytes ?? OPTIMIZATION_CONFIG.MAX_UNOPTIMIZED_SIZE_BYTES;
  const targetMaxBytes = options?.targetMaxPayloadBytes ?? OPTIMIZATION_CONFIG.TARGET_MAX_PAYLOAD_BYTES;

  // Custom canvas renderer adapter for test suites or headless environments
  if (options?.canvasRenderer) {
    const originalDataUrl = await readFileAsDataUrl(file);
    const mockDims: ImageDimensions = {
      width: (file as unknown as { width?: number }).width ?? 2400,
      height: (file as unknown as { height?: number }).height ?? 1600,
    };
    const target = calculateTargetDimensions(mockDims.width, mockDims.height, maxDim);
    if (!shouldOptimizeImage(mockDims, file.size, maxDim, maxUnoptimized)) {
      return {
        dataUrl: originalDataUrl,
        mimeType: (file.type as 'image/jpeg' | 'image/png' | 'image/webp') || 'image/jpeg',
        width: mockDims.width,
        height: mockDims.height,
        bytes: file.size,
        wasOptimized: false,
        originalBytes: file.size,
      };
    }
    const rendered = options.canvasRenderer(
      { ...mockDims, dataUrl: originalDataUrl },
      { width: target.width, height: target.height },
      initialQuality,
      '#FFFFFF'
    );
    return {
      dataUrl: rendered.dataUrl,
      mimeType: rendered.mimeType,
      width: target.width,
      height: target.height,
      bytes: rendered.bytes,
      wasOptimized: true,
      originalBytes: file.size,
    };
  }

  // Ensure DOM environment exists
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    // In headless Node environments without mock adapter, read raw base64 data
    const rawDataUrl = await readFileAsDataUrl(file);
    return {
      dataUrl: rawDataUrl,
      mimeType: (file.type as 'image/jpeg' | 'image/png' | 'image/webp') || 'image/jpeg',
      width: 0,
      height: 0,
      bytes: file.size,
      wasOptimized: false,
      originalBytes: file.size,
    };
  }

  // Browser execution path using Canvas 2D
  let objectUrl: string | null = null;
  try {
    objectUrl = URL.createObjectURL(file);
    const img = await loadImageElement(objectUrl);

    const srcWidth = img.naturalWidth || img.width;
    const srcHeight = img.naturalHeight || img.height;

    if (!srcWidth || !srcHeight) {
      throw new DiagnosisClientError(
        'Unable to determine image dimensions from the selected file.',
        'INVALID_IMAGE',
        400
      );
    }

    const dims: ImageDimensions = { width: srcWidth, height: srcHeight };

    // Check if optimization is needed
    if (!shouldOptimizeImage(dims, file.size, maxDim, maxUnoptimized)) {
      const unoptimizedDataUrl = await readFileAsDataUrl(file);
      return {
        dataUrl: unoptimizedDataUrl,
        mimeType: (file.type as 'image/jpeg' | 'image/png' | 'image/webp') || 'image/jpeg',
        width: srcWidth,
        height: srcHeight,
        bytes: file.size,
        wasOptimized: false,
        originalBytes: file.size,
      };
    }

    const target = calculateTargetDimensions(srcWidth, srcHeight, maxDim);

    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new DiagnosisClientError(
        'Browser failed to initialize 2D canvas context for image optimization.',
        'CANVAS_INIT_ERROR',
        500
      );
    }

    // Step 1: Fill solid white background so transparent PNGs/WebPs do not turn black on JPEG export
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, target.width, target.height);

    // Step 2: Render image with high-quality smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, target.width, target.height);

    // Step 3: Export as JPEG with initial quality (0.85)
    let optimizedDataUrl = canvas.toDataURL('image/jpeg', initialQuality);
    let estimatedBytes = estimateDecodedByteSize(optimizedDataUrl);

    // Step 4: If still exceeding target payload budget, re-export at fallback quality (0.75)
    if (estimatedBytes > targetMaxBytes) {
      optimizedDataUrl = canvas.toDataURL('image/jpeg', fallbackQuality);
      estimatedBytes = estimateDecodedByteSize(optimizedDataUrl);
    }

    return {
      dataUrl: optimizedDataUrl,
      mimeType: 'image/jpeg',
      width: target.width,
      height: target.height,
      bytes: estimatedBytes,
      wasOptimized: true,
      originalBytes: file.size,
    };
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

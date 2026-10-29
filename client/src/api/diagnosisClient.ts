/**
 * CircuitLens Stage 3 — Client Diagnosis API Service
 *
 * Dispatches diagnostic requests to the same-origin backend proxy (/api/diagnose).
 * Never exposes API credentials or sends data to third-party endpoints.
 */

import type {
  DiagnosisRequest,
  DiagnosisResponse,
  ConfidenceLevel,
  VisibleObservation,
  FaultHypothesis,
  RecommendedCheck,
  DiagnosisReassessmentRequest,
  DiagnosisReassessmentResponse,
  RevisedFaultHypothesis,
  RevisedHypothesisStatus,
} from '../types/diagnosis';

export const DEFAULT_TIMEOUT_MS = 80_000;

export class DiagnosisClientError extends Error {
  readonly errorType: string;
  readonly statusCode: number;
  readonly isRetryable: boolean;

  constructor(message: string, errorType: string = 'UNKNOWN_ERROR', statusCode: number = 500) {
    super(message);
    this.name = 'DiagnosisClientError';
    this.errorType = errorType;
    this.statusCode = statusCode;
    // Client-side validation or fatal errors are not immediately retryable without changes;
    // transient network, timeout, or rate-limit errors are retryable.
    this.isRetryable =
      statusCode === 429 ||
      statusCode === 503 ||
      statusCode === 504 ||
      errorType === 'NETWORK_ERROR' ||
      errorType === 'TIMEOUT';
  }
}

/**
 * Encodes a local File object into a standard base64 data URL.
 * Does NOT persist to localStorage or generate blob URLs.
 */
export async function fileToDataUrl(file: File): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new DiagnosisClientError('Failed to encode image to base64 data URL.', 'ENCODING_ERROR', 400));
        }
      };

      reader.onerror = () => {
        reject(new DiagnosisClientError('Browser failed to read image file.', 'FILE_READ_ERROR', 400));
      };

      reader.readAsDataURL(file);
    });
  }

  // Fallback for Node.js / headless test environments
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isStringArray(val: unknown): val is string[] {
  return Array.isArray(val) && val.every((item) => typeof item === 'string');
}

function isValidConfidence(val: unknown): val is ConfidenceLevel {
  return val === 'low' || val === 'medium' || val === 'high';
}

function isValidVisibleObservation(val: unknown): val is VisibleObservation {
  if (!isPlainObject(val)) return false;
  return (
    typeof val.description === 'string' &&
    typeof val.evidence === 'string' &&
    isValidConfidence(val.confidence)
  );
}

function isValidFaultHypothesis(val: unknown): val is FaultHypothesis {
  if (!isPlainObject(val)) return false;
  return (
    typeof val.title === 'string' &&
    typeof val.reasoning === 'string' &&
    isStringArray(val.supportingEvidence) &&
    isValidConfidence(val.confidence) &&
    typeof val.suggestedVerification === 'string'
  );
}

function isValidRecommendedCheck(val: unknown): val is RecommendedCheck {
  if (!isPlainObject(val)) return false;
  return (
    typeof val.stepNumber === 'number' &&
    Number.isInteger(val.stepNumber) &&
    val.stepNumber > 0 &&
    typeof val.title === 'string' &&
    typeof val.testType === 'string' &&
    isStringArray(val.toolsNeeded) &&
    typeof val.procedure === 'string' &&
    typeof val.expectedResult === 'string' &&
    isStringArray(val.safetyNotes)
  );
}

/**
 * Validates the runtime shape of the response to ensure complete DiagnosisResponse contracts,
 * deeply checking every item within nested observations, hypotheses, and checks.
 */
export function isValidDiagnosisResponse(val: unknown): val is DiagnosisResponse {
  if (!isPlainObject(val)) {
    return false;
  }

  return (
    typeof val.summary === 'string' &&
    Array.isArray(val.visibleObservations) &&
    val.visibleObservations.every(isValidVisibleObservation) &&
    Array.isArray(val.hypotheses) &&
    val.hypotheses.every(isValidFaultHypothesis) &&
    Array.isArray(val.recommendedChecks) &&
    val.recommendedChecks.every(isValidRecommendedCheck) &&
    isStringArray(val.limitations) &&
    isStringArray(val.safetyWarnings)
  );
}

/**
 * Submits diagnostic intake to POST /api/diagnose.
 * Enforces client boundary validation, a default 50-second timeout, and maps backend error payloads.
 */
export async function submitCircuitDiagnosis(
  payload: DiagnosisRequest,
  signal?: AbortSignal
): Promise<DiagnosisResponse> {
  // If caller-provided signal is already aborted, fail fast
  if (signal?.aborted) {
    throw new DiagnosisClientError(
      'Diagnostic request was cancelled.',
      'CANCELLED',
      499
    );
  }

  const controller = new AbortController();
  let timedOut = false;

  const onCallerAbort = () => {
    controller.abort(signal?.reason);
  };

  if (signal) {
    signal.addEventListener('abort', onCallerAbort, { once: true });
  }

  // Enforce 80-second timeout by default
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Diagnostic request timed out.', 'TimeoutError'));
  }, DEFAULT_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch('/api/diagnose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (timedOut || (signal?.reason instanceof DOMException && signal.reason.name === 'TimeoutError')) {
      throw new DiagnosisClientError(
        'Diagnostic request timed out. The server may still be processing.',
        'TIMEOUT',
        504
      );
    }

    if (signal?.aborted) {
      throw new DiagnosisClientError(
        'Diagnostic request was cancelled.',
        'CANCELLED',
        499
      );
    }

    if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      if (controller.signal.reason instanceof DOMException && controller.signal.reason.name === 'TimeoutError') {
        throw new DiagnosisClientError(
          'Diagnostic request timed out. The server may still be processing.',
          'TIMEOUT',
          504
        );
      }
      throw new DiagnosisClientError(
        'Diagnostic request was cancelled.',
        'CANCELLED',
        499
      );
    }

    throw new DiagnosisClientError(
      'Unable to connect to diagnostic server. Please verify your connection or proxy.',
      'NETWORK_ERROR',
      0
    );
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', onCallerAbort);
    }
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new DiagnosisClientError(
      'Server returned an unparseable response.',
      'INVALID_RESPONSE',
      response.status
    );
  }

  if (!response.ok) {
    const errorPayload = data as { errorType?: string; message?: string };
    const errorType = errorPayload.errorType || 'SERVER_ERROR';
    const message = errorPayload.message || `Diagnostic request failed with HTTP ${response.status}.`;
    throw new DiagnosisClientError(message, errorType, response.status);
  }

  if (!isValidDiagnosisResponse(data)) {
    throw new DiagnosisClientError(
      'Server returned an incomplete or malformed diagnosis structure.',
      'SCHEMA_MISMATCH',
      502
    );
  }

  return data;
}

function isValidHypothesisStatus(val: unknown): val is RevisedHypothesisStatus {
  return (
    val === 'supported' ||
    val === 'weakened' ||
    val === 'unresolved' ||
    val === 'contradicted'
  );
}

function isValidRevisedHypothesis(val: unknown): val is RevisedFaultHypothesis {
  if (!isPlainObject(val)) return false;
  return (
    typeof val.title === 'string' &&
    isValidHypothesisStatus(val.status) &&
    isValidConfidence(val.confidence) &&
    typeof val.explanationOfChange === 'string' &&
    isStringArray(val.citingEvidenceIds) &&
    (val.suggestedVerification === undefined || typeof val.suggestedVerification === 'string')
  );
}

/**
 * Validates the runtime shape of a reassessment response.
 */
export function isValidReassessmentResponse(val: unknown): val is DiagnosisReassessmentResponse {
  if (!isPlainObject(val)) return false;
  return (
    typeof val.summary === 'string' &&
    typeof val.evidenceSynthesis === 'string' &&
    Array.isArray(val.revisedHypotheses) &&
    val.revisedHypotheses.every(isValidRevisedHypothesis) &&
    Array.isArray(val.nextRecommendedChecks) &&
    val.nextRecommendedChecks.every(isValidRecommendedCheck) &&
    isStringArray(val.safetyWarnings) &&
    isStringArray(val.limitations)
  );
}

/**
 * Submits evidence-driven reassessment request to POST /api/reassess.
 * Enforces client boundary validation, timeout protection, and schema validation.
 */
export async function submitCircuitReassessment(
  payload: DiagnosisReassessmentRequest,
  signal?: AbortSignal
): Promise<DiagnosisReassessmentResponse> {
  if (signal?.aborted) {
    throw new DiagnosisClientError(
      'Reassessment request was cancelled.',
      'CANCELLED',
      499
    );
  }

  // Preflight validation for credit and endpoint protection
  if (!payload.evidence || !Array.isArray(payload.evidence) || payload.evidence.length === 0) {
    throw new DiagnosisClientError(
      'At least 1 evidence record is required to request reassessment.',
      'INVALID_REQUEST',
      400
    );
  }

  if (payload.evidence.length > 20) {
    throw new DiagnosisClientError(
      'Evidence history exceeds the maximum allowed count of 20 records.',
      'INVALID_REQUEST',
      400
    );
  }

  const controller = new AbortController();
  let timedOut = false;

  const onCallerAbort = () => {
    controller.abort(signal?.reason);
  };

  if (signal) {
    signal.addEventListener('abort', onCallerAbort, { once: true });
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Reassessment request timed out.', 'TimeoutError'));
  }, DEFAULT_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch('/api/reassess', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (timedOut || (signal?.reason instanceof DOMException && signal.reason.name === 'TimeoutError')) {
      throw new DiagnosisClientError(
        'Reassessment request timed out. The server may still be processing.',
        'TIMEOUT',
        504
      );
    }

    if (signal?.aborted) {
      throw new DiagnosisClientError(
        'Reassessment request was cancelled.',
        'CANCELLED',
        499
      );
    }

    if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      if (controller.signal.reason instanceof DOMException && controller.signal.reason.name === 'TimeoutError') {
        throw new DiagnosisClientError(
          'Reassessment request timed out. The server may still be processing.',
          'TIMEOUT',
          504
        );
      }
      throw new DiagnosisClientError(
        'Reassessment request was cancelled.',
        'CANCELLED',
        499
      );
    }

    throw new DiagnosisClientError(
      'Unable to connect to reassessment service. Please verify your connection or proxy.',
      'NETWORK_ERROR',
      0
    );
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', onCallerAbort);
    }
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new DiagnosisClientError(
      'Server returned an unparseable response.',
      'INVALID_RESPONSE',
      response.status
    );
  }

  if (!response.ok) {
    const errorPayload = data as { errorType?: string; message?: string };
    const errorType = errorPayload.errorType || 'SERVER_ERROR';
    const message = errorPayload.message || `Reassessment request failed with HTTP ${response.status}.`;
    throw new DiagnosisClientError(message, errorType, response.status);
  }

  if (!isValidReassessmentResponse(data)) {
    throw new DiagnosisClientError(
      'Server returned an incomplete or malformed reassessment structure.',
      'SCHEMA_MISMATCH',
      502
    );
  }

  return data;
}

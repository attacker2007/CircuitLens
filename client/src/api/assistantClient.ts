/**
 * CircuitLens Stage 6C-3A — Client Assistant API Service
 *
 * Dispatches contextual technician discussion requests to POST /api/assistant/chat.
 * Strictly offline preview mode: zero third-party inference requests.
 */

import type {
  AssistantChatRequest,
  AssistantChatResponse,
} from '../types/assistant.ts';

export const ASSISTANT_TIMEOUT_MS = 60_000;
export const CLIENT_MAX_MESSAGE_LENGTH = 2000;
export const CLIENT_MAX_HISTORY_LENGTH = 50;

export class AssistantClientError extends Error {
  readonly errorType: string;
  readonly statusCode: number;
  readonly isRetryable: boolean;

  constructor(message: string, errorType = 'UNKNOWN_ERROR', statusCode = 500) {
    super(message);
    this.name = 'AssistantClientError';
    this.errorType = errorType;
    this.statusCode = statusCode;
    this.isRetryable =
      statusCode === 429 ||
      statusCode === 503 ||
      statusCode === 504 ||
      errorType === 'NETWORK_ERROR' ||
      errorType === 'TIMEOUT';
  }
}

function isValidAssistantResponse(data: unknown): data is AssistantChatResponse {
  if (typeof data !== 'object' || data === null) return false;
  const res = data as Record<string, unknown>;
  if (typeof res.success !== 'boolean' || !res.message) return false;
  const msg = res.message as Record<string, unknown>;
  return (
    typeof msg.id === 'string' &&
    typeof msg.content === 'string' &&
    (msg.role === 'assistant' || msg.role === 'user')
  );
}

/**
 * Submits technician inquiry to POST /api/assistant/chat with active case context.
 */
export async function submitAssistantMessage(
  payload: AssistantChatRequest,
  signal?: AbortSignal
): Promise<AssistantChatResponse> {
  if (signal?.aborted) {
    throw new AssistantClientError(
      'Assistant inquiry was cancelled.',
      'CANCELLED',
      499
    );
  }

  // Preflight validation for message input
  if (!payload.message || typeof payload.message !== 'string') {
    throw new AssistantClientError(
      'Message is required.',
      'INVALID_REQUEST',
      400
    );
  }

  const trimmed = payload.message.trim();
  if (trimmed.length === 0) {
    throw new AssistantClientError(
      'Message cannot be empty.',
      'INVALID_REQUEST',
      400
    );
  }

  if (trimmed.length > CLIENT_MAX_MESSAGE_LENGTH) {
    throw new AssistantClientError(
      `Message length (${trimmed.length} chars) exceeds the maximum allowed limit of ${CLIENT_MAX_MESSAGE_LENGTH} characters.`,
      'INVALID_REQUEST',
      400
    );
  }

  if (payload.conversationHistory && payload.conversationHistory.length > CLIENT_MAX_HISTORY_LENGTH) {
    throw new AssistantClientError(
      `Conversation history (${payload.conversationHistory.length}) exceeds the maximum allowed limit of ${CLIENT_MAX_HISTORY_LENGTH}.`,
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
    controller.abort(new DOMException('Assistant request timed out.', 'TimeoutError'));
  }, ASSISTANT_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch('/api/assistant/chat', {
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
      throw new AssistantClientError(
        'Assistant request timed out. Please retry.',
        'TIMEOUT',
        504
      );
    }

    if (signal?.aborted) {
      throw new AssistantClientError(
        'Assistant inquiry was cancelled.',
        'CANCELLED',
        499
      );
    }

    if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      if (controller.signal.reason instanceof DOMException && controller.signal.reason.name === 'TimeoutError') {
        throw new AssistantClientError(
          'Assistant request timed out. Please retry.',
          'TIMEOUT',
          504
        );
      }
      throw new AssistantClientError(
        'Assistant inquiry was cancelled.',
        'CANCELLED',
        499
      );
    }

    throw new AssistantClientError(
      'Unable to connect to assistant service. Please check your local connection.',
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
    throw new AssistantClientError(
      'Server returned an unparseable response.',
      'INVALID_RESPONSE',
      response.status
    );
  }

  if (!response.ok) {
    const errorPayload = data as { errorType?: string; message?: string };
    const errorType = errorPayload.errorType || 'SERVER_ERROR';
    const message = errorPayload.message || `Assistant request failed with HTTP ${response.status}.`;
    throw new AssistantClientError(message, errorType, response.status);
  }

  if (!isValidAssistantResponse(data)) {
    throw new AssistantClientError(
      'Server returned an invalid assistant response format.',
      'SCHEMA_MISMATCH',
      502
    );
  }

  return data;
}

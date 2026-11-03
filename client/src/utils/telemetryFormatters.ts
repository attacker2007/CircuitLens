/**
 * CircuitLens Stage 6B-3 — Telemetry Formatting Utilities
 *
 * Provides safe, non-inventing formatters for AI provider operational telemetry.
 * Strictly preserves the distinction between actual zero values and unavailable metrics.
 */

/**
 * Formats a token count into a localized string.
 * Strictly distinguishes an actual count of 0 from an undefined/unavailable metric.
 *
 * @param count - Token count (number or undefined)
 * @param fallback - Label to display when count is undefined
 */
export function formatTokenCount(count?: number, fallback = 'Unavailable'): string {
  if (count === 0) {
    return '0';
  }
  if (count !== undefined && Number.isFinite(count)) {
    return count.toLocaleString();
  }
  return fallback;
}

/**
 * Formats execution duration into human-readable latency string.
 *
 * @param durationMs - Request duration in milliseconds
 * @param fallback - Label to display if duration is missing
 */
export function formatLatency(durationMs?: number, fallback = 'Unavailable'): string {
  if (durationMs !== undefined && Number.isFinite(durationMs)) {
    if (durationMs < 1000) {
      return `${durationMs} ms`;
    }
    const seconds = (durationMs / 1000).toFixed(2);
    return `${seconds} s (${durationMs.toLocaleString()} ms)`;
  }
  return fallback;
}

/**
 * Formats estimated cost in USD with appropriate micro-dollar precision.
 * Strictly distinguishes an actual $0.00 cost from an unavailable estimate.
 *
 * @param costUsd - Calculated cost in USD
 * @param fallback - Label to display when estimate is unavailable
 */
export function formatCostUsd(costUsd?: number, fallback = 'Unavailable'): string {
  if (costUsd === 0) {
    return '$0.000000';
  }
  if (costUsd !== undefined && Number.isFinite(costUsd)) {
    if (costUsd < 0.01) {
      return `$${costUsd.toFixed(6)}`;
    }
    return `$${costUsd.toFixed(4)}`;
  }
  return fallback;
}

/**
 * Capitalizes provider identifier for presentation.
 */
export function formatProviderName(provider?: string, fallback = 'Unknown'): string {
  if (!provider || provider.trim() === '') {
    return fallback;
  }
  const clean = provider.trim().toLowerCase();
  if (clean === 'baseten') return 'Baseten';
  if (clean === 'meta') return 'Meta';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

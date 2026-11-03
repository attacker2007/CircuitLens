/**
 * CircuitLens Centralized Token Pricing Configuration & Cost Estimator
 *
 * Implements deterministic cost estimation for model API requests based on
 * published provider token rates. Prevents hardcoding numerical pricing throughout
 * the codebase and isolates provider-specific rate sheets.
 */

export interface TokenPricingRate {
  /** USD cost per 1,000,000 prompt (input) tokens */
  inputPerMillion: number;
  /** USD cost per 1,000,000 completion (output) tokens */
  outputPerMillion: number;
}

/**
 * Published pricing table keyed by provider and exact model identifier.
 * Rates in USD per 1,000,000 tokens.
 *
 * Requirements:
 * - Pricing is strictly associated with the exact provider/model combination.
 * - Unknown provider or model combinations must return unavailable pricing.
 * - Rates must NOT be silently applied to other models or providers.
 */
export const PROVIDER_PRICING: Record<string, Record<string, TokenPricingRate>> = {
  baseten: {
    'meta-models/muse-spark-open-1026': {
      inputPerMillion: 1.25,
      outputPerMillion: 4.25,
    },
  },
  // Note: 'meta' is a legacy/mock provider without public per-token billing rates.
};

export type TelemetryUsageStatus = 'reported' | 'partial' | 'unavailable';

/**
 * Derives the operational usage status based on token presence.
 * Accurately distinguishes actual zero values from undefined/unavailable values.
 */
export function deriveUsageStatus(
  promptTokens?: number,
  completionTokens?: number
): TelemetryUsageStatus {
  const hasPrompt = promptTokens !== undefined && Number.isFinite(promptTokens);
  const hasCompletion = completionTokens !== undefined && Number.isFinite(completionTokens);

  if (hasPrompt && hasCompletion) {
    return 'reported';
  }
  if (hasPrompt || hasCompletion) {
    return 'partial';
  }
  return 'unavailable';
}

export interface CostEstimateResult {
  /** Complete estimated request cost in USD (defined if and only if BOTH input and output usage are reported) */
  estimatedCostUsd?: number;
  /** Partial subtotal cost in USD (defined if and only if partial usage is reported, i.e. exactly one metric is available) */
  partialCostUsd?: number;
}

/**
 * Calculates estimated request cost breakdown in USD based on the configured pricing table.
 *
 * Requirements:
 * - Exact provider/model lookup (no silent fallbacks to other models).
 * - Both input and output available: calculates complete estimatedCostUsd.
 * - Only input or output available: calculates partialCostUsd (estimatedCostUsd is undefined).
 * - Neither available: both estimatedCostUsd and partialCostUsd are undefined.
 * - Genuine zero values are preserved (0 returns 0, not undefined).
 * - Centralizes provider pricing; never applies Baseten pricing to other providers or unlisted models.
 */
export function calculateCostEstimate(
  provider: string,
  model: string,
  promptTokens?: number,
  completionTokens?: number
): CostEstimateResult {
  if (promptTokens === undefined && completionTokens === undefined) {
    return { estimatedCostUsd: undefined, partialCostUsd: undefined };
  }

  const normalizedProvider = provider.toLowerCase().trim();
  const providerRates = PROVIDER_PRICING[normalizedProvider];
  if (!providerRates) {
    // Strict isolation: do NOT apply Baseten pricing to unknown providers
    return { estimatedCostUsd: undefined, partialCostUsd: undefined };
  }

  const normalizedModel = model.trim();
  const rate = providerRates[normalizedModel];
  if (!rate) {
    // Strict isolation: do NOT silently apply rates to unlisted models
    return { estimatedCostUsd: undefined, partialCostUsd: undefined };
  }

  const validPrompt = promptTokens !== undefined && Number.isFinite(promptTokens);
  const validCompletion = completionTokens !== undefined && Number.isFinite(completionTokens);

  if (!validPrompt && !validCompletion) {
    return { estimatedCostUsd: undefined, partialCostUsd: undefined };
  }

  // Calculate in micro-dollars first to avoid floating point fractional division artifacts
  const inputMicroDollars = validPrompt ? promptTokens * rate.inputPerMillion : 0;
  const outputMicroDollars = validCompletion ? completionTokens * rate.outputPerMillion : 0;

  if (validPrompt && validCompletion) {
    // Both tokens available: Complete request cost
    const totalMicroDollars = Math.round(inputMicroDollars + outputMicroDollars);
    return {
      estimatedCostUsd: totalMicroDollars / 1_000_000,
      partialCostUsd: undefined,
    };
  }

  // Partial tokens available: Partial subtotal ONLY (never report as full request cost!)
  const partialMicroDollars = Math.round(validPrompt ? inputMicroDollars : outputMicroDollars);
  return {
    estimatedCostUsd: undefined,
    partialCostUsd: partialMicroDollars / 1_000_000,
  };
}

/**
 * Calculates complete estimated request cost in USD.
 * Returns undefined if either token count is missing or if pricing is unconfigured.
 */
export function calculateEstimatedCostUsd(
  provider: string,
  model: string,
  promptTokens?: number,
  completionTokens?: number
): number | undefined {
  return calculateCostEstimate(provider, model, promptTokens, completionTokens).estimatedCostUsd;
}

/**
 * Calculates partial cost subtotal in USD when only one token metric is reported.
 * Returns undefined if complete or unavailable usage.
 */
export function calculatePartialCostUsd(
  provider: string,
  model: string,
  promptTokens?: number,
  completionTokens?: number
): number | undefined {
  return calculateCostEstimate(provider, model, promptTokens, completionTokens).partialCostUsd;
}

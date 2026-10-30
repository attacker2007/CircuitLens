/**
 * CircuitLens Stage 5C-3L-3 — Hypothesis Revision Matching Utility
 *
 * Implements strict, unambiguous title-based matching between initial hypotheses
 * and subsequent reassessment findings without relying on array index fallbacks.
 */

import type {
  DiagnosisReassessmentResponse,
  RevisedFaultHypothesis,
} from '../types/diagnosis';

/**
 * Resolves the corresponding revised hypothesis from the latest reassessment round,
 * strictly using exact, unambiguous title matching (or stable ID if available in the future).
 * Never falls back to array index matching to avoid misleading associations when hypotheses
 * are reordered or omitted. Returns null if no exact, unique match exists.
 */
export function findLatestRevisedHypothesis(
  initialTitle: string,
  latestReassessment?: DiagnosisReassessmentResponse | null
): RevisedFaultHypothesis | null {
  if (!latestReassessment?.revisedHypotheses || !Array.isArray(latestReassessment.revisedHypotheses)) {
    return null;
  }
  const trimmedTarget = initialTitle.trim().toLowerCase();
  if (!trimmedTarget) return null;

  // Filter exact matches (case-insensitive trimmed title)
  const matches = latestReassessment.revisedHypotheses.filter(
    (rev) => rev.title.trim().toLowerCase() === trimmedTarget
  );

  // Strictly require exactly one unique match; never guess if 0 or >1
  if (matches.length === 1) {
    return matches[0];
  }
  return null;
}

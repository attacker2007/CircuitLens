/**
 * CircuitLens Stage 4B-3 — Client-Side Evidence Validation & Identity Helpers
 *
 * Provides pure validation rules and ID generation helpers for recording
 * diagnostic test outcomes, measurements, and notes without external dependencies.
 */

import type { CheckOutcome } from '../types/diagnosis';
import type { Translations } from '../i18n';

export const EVIDENCE_LIMITS = {
  MIN_NUMERIC_VALUE: -1e9,
  MAX_NUMERIC_VALUE: 1e9,
  MAX_UNIT_LENGTH: 20,
  MAX_NOTES_LENGTH: 500,
} as const;

export interface EvidenceFormValues {
  outcome: CheckOutcome | '';
  numericValueStr: string;
  measurementUnit: string;
  technicianNotes: string;
  supersedePriorAttempt: boolean;
}

export interface EvidenceValidationErrors {
  outcome?: string;
  numericValue?: string;
  measurementUnit?: string;
  technicianNotes?: string;
}

/**
 * Generates a stable investigation identifier for an active diagnostic session.
 */
export function generateInvestigationId(): string {
  const rand = Math.random().toString(36).substring(2, 9);
  return `inv_${Date.now()}_${rand}`;
}

/**
 * Generates a unique, stable, and deterministic recommendation identifier
 * associated with an active investigation session.
 *
 * Deterministic formula: `rec_${investigationId}_c${cycleIndex}_s${stepNumber}${indexSuffix}`
 * Guaranteed collision-free even if duplicate step numbers occur in the model response.
 */
export function generateRecommendationId(
  investigationId: string,
  cycleIndex: number,
  stepNumber: number,
  index?: number
): string {
  const indexSuffix = typeof index === 'number' ? `_i${index}` : '';
  return `rec_${investigationId}_c${cycleIndex}_s${stepNumber}${indexSuffix}`;
}

/**
 * Generates a unique evidence record identifier.
 */
export function generateEvidenceId(): string {
  const rand = Math.random().toString(36).substring(2, 9);
  return `ev_${Date.now()}_${rand}`;
}

/**
 * Validates the evidence recording form values according to client/server contracts:
 * - Outcome is required and must be an allowed enum value.
 * - numericValue and measurementUnit must both be provided or both omitted.
 * - Missing values are never silently coerced to zero.
 * - numericValue must be a finite number between -1e9 and 1e9.
 * - measurementUnit must be trimmed, 1–20 characters.
 * - technicianNotes must not exceed 500 characters.
 */
export function validateEvidenceForm(
  values: EvidenceFormValues,
  t: Translations
): {
  valid: boolean;
  errors: EvidenceValidationErrors;
  parsedNumericValue?: number;
} {
  const errors: EvidenceValidationErrors = {};
  let parsedNumericValue: number | undefined;

  // 1. Outcome validation
  if (!values.outcome) {
    errors.outcome = t.validationErrorOutcomeRequired;
  }

  // 2. Measurement pair validation
  const trimmedVal = values.numericValueStr.trim();
  const trimmedUnit = values.measurementUnit.trim();

  const hasValStr = trimmedVal !== '';
  const hasUnitStr = trimmedUnit !== '';

  if (hasValStr !== hasUnitStr) {
    if (!hasUnitStr) {
      errors.measurementUnit = t.validationErrorIncompletePair;
    } else {
      errors.numericValue = t.validationErrorIncompletePair;
    }
  } else if (hasValStr && hasUnitStr) {
    // Both supplied: validate numeric value
    const num = Number(trimmedVal);
    if (!Number.isFinite(num) || Number.isNaN(num)) {
      errors.numericValue = t.validationErrorNumericRange;
    } else if (
      num < EVIDENCE_LIMITS.MIN_NUMERIC_VALUE ||
      num > EVIDENCE_LIMITS.MAX_NUMERIC_VALUE
    ) {
      errors.numericValue = t.validationErrorNumericRange;
    } else {
      parsedNumericValue = num;
    }

    // Validate unit length
    if (trimmedUnit.length === 0 || trimmedUnit.length > EVIDENCE_LIMITS.MAX_UNIT_LENGTH) {
      errors.measurementUnit = t.validationErrorUnitLength;
    }
  }

  // 3. Technician notes validation
  if (values.technicianNotes.length > EVIDENCE_LIMITS.MAX_NOTES_LENGTH) {
    errors.technicianNotes = t.validationErrorNotesLength;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    parsedNumericValue,
  };
}

/**
 * CircuitLens Stage 3 — Runtime Validation for Diagnostic Model Responses
 *
 * Validates untrusted model outputs against the DiagnosisResponse contract
 * without third-party validation libraries, ensuring bounded size and strict type correctness.
 */

import type {
  ConfidenceLevel,
  DiagnosisResponse,
  FaultHypothesis,
  RecommendedCheck,
  VisibleObservation,
} from './types/diagnosis.js';

export class DiagnosisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiagnosisValidationError';
  }
}

export class DiagnosisParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiagnosisParsingError';
  }
}

// Bounded output constraints to prevent unbounded model output
export const LIMITS = {
  MAX_SUMMARY_LENGTH: 3000,
  MAX_OBSERVATIONS_COUNT: 30,
  MAX_OBSERVATION_DESC_LENGTH: 1000,
  MAX_OBSERVATION_EVIDENCE_LENGTH: 1000,
  MAX_HYPOTHESES_COUNT: 20,
  MAX_HYPOTHESIS_TITLE_LENGTH: 300,
  MAX_HYPOTHESIS_REASONING_LENGTH: 2000,
  MAX_HYPOTHESIS_EVIDENCE_COUNT: 20,
  MAX_HYPOTHESIS_EVIDENCE_LENGTH: 500,
  MAX_HYPOTHESIS_VERIFY_LENGTH: 1000,
  MAX_CHECKS_COUNT: 30,
  MAX_CHECK_TITLE_LENGTH: 300,
  MAX_CHECK_TYPE_LENGTH: 200,
  MAX_CHECK_TOOLS_COUNT: 15,
  MAX_CHECK_TOOL_LENGTH: 200,
  MAX_CHECK_PROCEDURE_LENGTH: 2000,
  MAX_CHECK_RESULT_LENGTH: 1000,
  MAX_CHECK_SAFETY_COUNT: 15,
  MAX_CHECK_SAFETY_LENGTH: 500,
  MAX_LIMITATIONS_COUNT: 20,
  MAX_LIMITATION_LENGTH: 500,
  MAX_WARNINGS_COUNT: 20,
  MAX_WARNING_LENGTH: 500,
} as const;

const ALLOWED_CONFIDENCE_LEVELS: ReadonlySet<string> = new Set<ConfidenceLevel>([
  'low',
  'medium',
  'high',
]);

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function validateString(
  val: unknown,
  fieldName: string,
  maxLength: number,
  allowEmpty: boolean = false
): string {
  if (typeof val !== 'string') {
    throw new DiagnosisValidationError(`Field "${fieldName}" must be a string.`);
  }

  const trimmed = val.trim();
  if (!allowEmpty && trimmed.length === 0) {
    throw new DiagnosisValidationError(`Field "${fieldName}" must be a non-empty string.`);
  }

  if (val.length > maxLength) {
    throw new DiagnosisValidationError(
      `Field "${fieldName}" exceeds the maximum allowed length of ${maxLength} characters.`
    );
  }

  return trimmed;
}

function validateConfidence(val: unknown, fieldName: string): ConfidenceLevel {
  if (typeof val !== 'string' || !ALLOWED_CONFIDENCE_LEVELS.has(val as ConfidenceLevel)) {
    throw new DiagnosisValidationError(
      `Field "${fieldName}" must be one of: 'low', 'medium', or 'high'. Received: ${JSON.stringify(val)}.`
    );
  }
  return val as ConfidenceLevel;
}

function validateStringArray(
  val: unknown,
  fieldName: string,
  maxItems: number,
  maxItemLength: number
): string[] {
  if (!Array.isArray(val)) {
    throw new DiagnosisValidationError(`Field "${fieldName}" must be an array.`);
  }

  if (val.length > maxItems) {
    throw new DiagnosisValidationError(
      `Field "${fieldName}" exceeds the maximum allowed count of ${maxItems} items.`
    );
  }

  return val.map((item, index) =>
    validateString(item, `${fieldName}[${index}]`, maxItemLength, false)
  );
}

function validateVisibleObservation(val: unknown, index: number): VisibleObservation {
  if (!isRecord(val)) {
    throw new DiagnosisValidationError(`visibleObservations[${index}] must be an object.`);
  }

  return {
    description: validateString(
      val.description,
      `visibleObservations[${index}].description`,
      LIMITS.MAX_OBSERVATION_DESC_LENGTH
    ),
    evidence: validateString(
      val.evidence,
      `visibleObservations[${index}].evidence`,
      LIMITS.MAX_OBSERVATION_EVIDENCE_LENGTH
    ),
    confidence: validateConfidence(val.confidence, `visibleObservations[${index}].confidence`),
  };
}

function validateFaultHypothesis(val: unknown, index: number): FaultHypothesis {
  if (!isRecord(val)) {
    throw new DiagnosisValidationError(`hypotheses[${index}] must be an object.`);
  }

  return {
    title: validateString(
      val.title,
      `hypotheses[${index}].title`,
      LIMITS.MAX_HYPOTHESIS_TITLE_LENGTH
    ),
    reasoning: validateString(
      val.reasoning,
      `hypotheses[${index}].reasoning`,
      LIMITS.MAX_HYPOTHESIS_REASONING_LENGTH
    ),
    supportingEvidence: validateStringArray(
      val.supportingEvidence,
      `hypotheses[${index}].supportingEvidence`,
      LIMITS.MAX_HYPOTHESIS_EVIDENCE_COUNT,
      LIMITS.MAX_HYPOTHESIS_EVIDENCE_LENGTH
    ),
    confidence: validateConfidence(val.confidence, `hypotheses[${index}].confidence`),
    suggestedVerification: validateString(
      val.suggestedVerification,
      `hypotheses[${index}].suggestedVerification`,
      LIMITS.MAX_HYPOTHESIS_VERIFY_LENGTH
    ),
  };
}

function validateRecommendedCheck(val: unknown, index: number): RecommendedCheck {
  if (!isRecord(val)) {
    throw new DiagnosisValidationError(`recommendedChecks[${index}] must be an object.`);
  }

  const stepNumber = val.stepNumber;
  if (typeof stepNumber !== 'number' || !Number.isInteger(stepNumber) || stepNumber <= 0) {
    throw new DiagnosisValidationError(
      `Field "recommendedChecks[${index}].stepNumber" must be a positive integer.`
    );
  }

  return {
    stepNumber,
    title: validateString(
      val.title,
      `recommendedChecks[${index}].title`,
      LIMITS.MAX_CHECK_TITLE_LENGTH
    ),
    testType: validateString(
      val.testType,
      `recommendedChecks[${index}].testType`,
      LIMITS.MAX_CHECK_TYPE_LENGTH
    ),
    toolsNeeded: validateStringArray(
      val.toolsNeeded,
      `recommendedChecks[${index}].toolsNeeded`,
      LIMITS.MAX_CHECK_TOOLS_COUNT,
      LIMITS.MAX_CHECK_TOOL_LENGTH
    ),
    procedure: validateString(
      val.procedure,
      `recommendedChecks[${index}].procedure`,
      LIMITS.MAX_CHECK_PROCEDURE_LENGTH
    ),
    expectedResult: validateString(
      val.expectedResult,
      `recommendedChecks[${index}].expectedResult`,
      LIMITS.MAX_CHECK_RESULT_LENGTH
    ),
    safetyNotes: validateStringArray(
      val.safetyNotes,
      `recommendedChecks[${index}].safetyNotes`,
      LIMITS.MAX_CHECK_SAFETY_COUNT,
      LIMITS.MAX_CHECK_SAFETY_LENGTH
    ),
  };
}

/**
 * Validates an untrusted parsed object against the DiagnosisResponse contract.
 * Throws DiagnosisValidationError on any type, constraint, or bound violation.
 */
export function validateDiagnosisResponse(data: unknown): DiagnosisResponse {
  if (!isRecord(data)) {
    throw new DiagnosisValidationError('Model output must be a non-null JSON object.');
  }

  const summary = validateString(data.summary, 'summary', LIMITS.MAX_SUMMARY_LENGTH);

  if (!Array.isArray(data.visibleObservations)) {
    throw new DiagnosisValidationError('Field "visibleObservations" must be an array.');
  }
  if (data.visibleObservations.length > LIMITS.MAX_OBSERVATIONS_COUNT) {
    throw new DiagnosisValidationError(
      `Field "visibleObservations" exceeds maximum allowed count of ${LIMITS.MAX_OBSERVATIONS_COUNT}.`
    );
  }
  const visibleObservations = data.visibleObservations.map((item, idx) =>
    validateVisibleObservation(item, idx)
  );

  if (!Array.isArray(data.hypotheses)) {
    throw new DiagnosisValidationError('Field "hypotheses" must be an array.');
  }
  if (data.hypotheses.length > LIMITS.MAX_HYPOTHESES_COUNT) {
    throw new DiagnosisValidationError(
      `Field "hypotheses" exceeds maximum allowed count of ${LIMITS.MAX_HYPOTHESES_COUNT}.`
    );
  }
  const hypotheses = data.hypotheses.map((item, idx) => validateFaultHypothesis(item, idx));

  if (!Array.isArray(data.recommendedChecks)) {
    throw new DiagnosisValidationError('Field "recommendedChecks" must be an array.');
  }
  if (data.recommendedChecks.length > LIMITS.MAX_CHECKS_COUNT) {
    throw new DiagnosisValidationError(
      `Field "recommendedChecks" exceeds maximum allowed count of ${LIMITS.MAX_CHECKS_COUNT}.`
    );
  }
  const recommendedChecks = data.recommendedChecks.map((item, idx) =>
    validateRecommendedCheck(item, idx)
  );

  const limitations = validateStringArray(
    data.limitations,
    'limitations',
    LIMITS.MAX_LIMITATIONS_COUNT,
    LIMITS.MAX_LIMITATION_LENGTH
  );

  const safetyWarnings = validateStringArray(
    data.safetyWarnings,
    'safetyWarnings',
    LIMITS.MAX_WARNINGS_COUNT,
    LIMITS.MAX_WARNING_LENGTH
  );

  return {
    summary,
    visibleObservations,
    hypotheses,
    recommendedChecks,
    limitations,
    safetyWarnings,
  };
}

/**
 * Parses raw model output text as JSON and validates against DiagnosisResponse.
 * Handles potential outer markdown code fences gracefully.
 */
export function parseDiagnosisJson(rawText: string): DiagnosisResponse {
  if (typeof rawText !== 'string' || rawText.trim() === '') {
    throw new DiagnosisParsingError('Model returned empty response content.');
  }

  let cleanText = rawText.trim();

  // Strip markdown code block fences if present (```json ... ``` or ``` ... ```)
  const fenceMatch = cleanText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    cleanText = fenceMatch[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanText);
  } catch (err) {
    throw new DiagnosisParsingError(
      `Failed to parse model output as valid JSON: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  return validateDiagnosisResponse(parsed);
}

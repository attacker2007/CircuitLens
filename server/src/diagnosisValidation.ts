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
  AnalysisDepth,
  CircuitTheoryUnderstanding,
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
  if (typeof val === 'string') {
    const normalized = val.trim().toLowerCase();
    if (normalized === 'moderate') {
      return 'medium';
    }
    if (ALLOWED_CONFIDENCE_LEVELS.has(normalized as ConfidenceLevel)) {
      return normalized as ConfidenceLevel;
    }
  }
  throw new DiagnosisValidationError(
    `Field "${fieldName}" must be one of: 'low', 'medium', or 'high'. Received: ${JSON.stringify(val)}.`
  );
}

interface StringArrayValidationOptions {
  allowEmptyArray?: boolean;
  defaultEmptyOnMissing?: boolean;
}

function normalizeAndValidateStringArray(
  val: unknown,
  fieldName: string,
  maxItems: number,
  maxItemLength: number,
  options?: StringArrayValidationOptions
): string[] {
  if (val === undefined || val === null) {
    if (options?.defaultEmptyOnMissing) {
      return [];
    }
    throw new DiagnosisValidationError(`Field "${fieldName}" must be an array.`);
  }

  let items: unknown[];
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.length === 0) {
      if (options?.allowEmptyArray) {
        return [];
      }
      throw new DiagnosisValidationError(`Field "${fieldName}" must not be empty.`);
    }
    items = [trimmed];
  } else if (Array.isArray(val)) {
    items = val;
  } else {
    throw new DiagnosisValidationError(`Field "${fieldName}" must be an array.`);
  }

  if (items.length > maxItems) {
    throw new DiagnosisValidationError(
      `Field "${fieldName}" exceeds the maximum allowed count of ${maxItems} items.`
    );
  }

  return items.map((item, index) =>
    validateString(item, `${fieldName}[${index}]`, maxItemLength, false)
  );
}

function validateStringArray(
  val: unknown,
  fieldName: string,
  maxItems: number,
  maxItemLength: number
): string[] {
  return normalizeAndValidateStringArray(val, fieldName, maxItems, maxItemLength, {
    allowEmptyArray: true,
    defaultEmptyOnMissing: false,
  });
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
    supportingEvidence: normalizeAndValidateStringArray(
      val.supportingEvidence,
      `hypotheses[${index}].supportingEvidence`,
      LIMITS.MAX_HYPOTHESIS_EVIDENCE_COUNT,
      LIMITS.MAX_HYPOTHESIS_EVIDENCE_LENGTH,
      { allowEmptyArray: true, defaultEmptyOnMissing: true }
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

  let stepNumber = val.stepNumber;
  if (typeof stepNumber === 'string') {
    const trimmed = stepNumber.trim();
    const parsed = Number(trimmed);
    if (Number.isInteger(parsed) && parsed > 0 && String(parsed) === trimmed) {
      stepNumber = parsed;
    }
  }

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
    toolsNeeded: normalizeAndValidateStringArray(
      val.toolsNeeded,
      `recommendedChecks[${index}].toolsNeeded`,
      LIMITS.MAX_CHECK_TOOLS_COUNT,
      LIMITS.MAX_CHECK_TOOL_LENGTH,
      { allowEmptyArray: true, defaultEmptyOnMissing: true }
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
    safetyNotes: normalizeAndValidateStringArray(
      val.safetyNotes,
      `recommendedChecks[${index}].safetyNotes`,
      LIMITS.MAX_CHECK_SAFETY_COUNT,
      LIMITS.MAX_CHECK_SAFETY_LENGTH,
      { allowEmptyArray: true, defaultEmptyOnMissing: true }
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

  const limitations = normalizeAndValidateStringArray(
    data.limitations,
    'limitations',
    LIMITS.MAX_LIMITATIONS_COUNT,
    LIMITS.MAX_LIMITATION_LENGTH,
    { allowEmptyArray: true, defaultEmptyOnMissing: true }
  );

  const safetyWarnings = normalizeAndValidateStringArray(
    data.safetyWarnings,
    'safetyWarnings',
    LIMITS.MAX_WARNINGS_COUNT,
    LIMITS.MAX_WARNING_LENGTH,
    { allowEmptyArray: false, defaultEmptyOnMissing: false }
  );

  if (safetyWarnings.length === 0) {
    throw new DiagnosisValidationError(
      'Field "safetyWarnings" must be an array containing at least one electrical safety precaution.'
    );
  }

  let analysisDepth: AnalysisDepth | undefined = undefined;
  if (data.analysisDepth === 'basic' || data.analysisDepth === 'standard' || data.analysisDepth === 'advanced') {
    analysisDepth = data.analysisDepth;
  }

  let circuitUnderstanding: CircuitTheoryUnderstanding | undefined = undefined;
  if (data.circuitUnderstanding && typeof data.circuitUnderstanding === 'object' && !Array.isArray(data.circuitUnderstanding)) {
    const cu = data.circuitUnderstanding as Record<string, unknown>;
    circuitUnderstanding = {
      operatingPrinciple: typeof cu.operatingPrinciple === 'string' ? cu.operatingPrinciple : '',
      relevantComponents: Array.isArray(cu.relevantComponents)
        ? cu.relevantComponents.map((rc: any) => ({
            designator: String(rc?.designator || ''),
            function: String(rc?.function || ''),
            status: rc?.status === 'confirmed' || rc?.status === 'inferred' || rc?.status === 'unknown' ? rc.status : 'inferred',
          }))
        : [],
      expectedBehavior: typeof cu.expectedBehavior === 'string' ? cu.expectedBehavior : '',
      failureMechanismTheory: typeof cu.failureMechanismTheory === 'string' ? cu.failureMechanismTheory : '',
      functionalBlocks: Array.isArray(cu.functionalBlocks)
        ? cu.functionalBlocks.map((fb: any) => ({
            id: String(fb?.id || ''),
            label: String(fb?.label || ''),
            category: fb?.category || 'regulation',
            status: fb?.status === 'confirmed' || fb?.status === 'inferred' || fb?.status === 'unknown' ? fb.status : 'inferred',
            description: typeof fb?.description === 'string' ? fb.description : undefined,
            components: Array.isArray(fb?.components) ? fb.components.map(String) : undefined,
          }))
        : undefined,
      blockConnections: Array.isArray(cu.blockConnections)
        ? cu.blockConnections.map((bc: any) => ({
            from: String(bc?.from || ''),
            to: String(bc?.to || ''),
            signalType: bc?.signalType || 'power',
            status: bc?.status === 'confirmed' || bc?.status === 'inferred' || bc?.status === 'unknown' ? bc.status : 'inferred',
            description: typeof bc?.description === 'string' ? bc.description : undefined,
          }))
        : undefined,
      diagramLimitations: typeof cu.diagramLimitations === 'string' ? cu.diagramLimitations : undefined,
    };
  }

  return {
    summary,
    visibleObservations,
    hypotheses,
    recommendedChecks,
    limitations,
    safetyWarnings,
    ...(analysisDepth ? { analysisDepth } : {}),
    ...(circuitUnderstanding ? { circuitUnderstanding } : {}),
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

  // Check for unclosed <think> tag indicating truncation during reasoning
  if (/^<think>[\s\S]*$/i.test(cleanText) && !/<\/think>/i.test(cleanText)) {
    throw new DiagnosisParsingError(
      'Model output was truncated inside reasoning (<think>) before producing a final response.'
    );
  }

  // Strip <think>...</think> reasoning blocks if present (from reasoning-enabled models)
  cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  if (cleanText === '') {
    throw new DiagnosisParsingError(
      'Model output contained only reasoning tags (<think>) without a final diagnostic response.'
    );
  }

  // Strip markdown code block fences if present (```json ... ``` or ``` ... ```)
  const fenceMatch = cleanText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    cleanText = fenceMatch[1].trim();
  } else {
    // Also handle embedded markdown code fence blocks if surrounded by prose
    const embeddedMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (embeddedMatch) {
      cleanText = embeddedMatch[1].trim();
    }
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

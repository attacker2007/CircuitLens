/**
 * CircuitLens Stage 4 — Server-Side Reassessment Request & Response Validation
 *
 * Implements strict runtime verification for diagnostic reassessment requests
 * and model output payloads without third-party validation dependencies.
 */

import type {
  ConfidenceLevel,
  CheckOutcome,
  RevisedHypothesisStatus,
  EvidenceRecord,
  DiagnosticContextPayload,
  DiagnosisReassessmentRequest,
  RevisedFaultHypothesis,
  DiagnosisReassessmentResponse,
  VisibleObservation,
  FaultHypothesis,
  RecommendedCheck,
} from './types/diagnosis.js';

export class ReassessmentRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReassessmentRequestValidationError';
  }
}

export class ReassessmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReassessmentValidationError';
  }
}

export class ReassessmentParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReassessmentParsingError';
  }
}

export const REASSESSMENT_REQUEST_LIMITS = {
  MIN_EVIDENCE_COUNT: 1,
  MAX_EVIDENCE_COUNT: 20,
  MAX_RECOMMENDATION_ID_LENGTH: 100,
  MAX_EVIDENCE_ID_LENGTH: 100,
  MAX_CHECK_TITLE_LENGTH: 300,
  MAX_TECHNICIAN_NOTES_LENGTH: 500,
  MAX_ADDITIONAL_NOTES_LENGTH: 1000,
  MAX_UNIT_LENGTH: 20,
  MIN_NUMERIC_VALUE: -1e9,
  MAX_NUMERIC_VALUE: 1e9,

  // Diagnostic context limits (matching Stage 3 intake limits)
  MAX_BOARD_NAME_LENGTH: 200,
  MAX_EXPECTED_BEHAVIOR_LENGTH: 2000,
  MAX_OBSERVED_BEHAVIOR_LENGTH: 2000,
  MAX_COMPONENTS_LENGTH: 500,
  MAX_CONTEXT_NOTES_LENGTH: 2000,
  MAX_INITIAL_SUMMARY_LENGTH: 3000,
  MAX_OBSERVATIONS_COUNT: 30,
  MAX_OBSERVATION_DESC_LENGTH: 1000,
  MAX_OBSERVATION_EVIDENCE_LENGTH: 1000,
  MAX_HYPOTHESES_COUNT: 20,
  MAX_HYPOTHESIS_TITLE_LENGTH: 300,
  MAX_HYPOTHESIS_REASONING_LENGTH: 2000,
  MAX_HYPOTHESIS_EVIDENCE_COUNT: 20,
  MAX_HYPOTHESIS_EVIDENCE_LENGTH: 500,
  MAX_HYPOTHESIS_VERIFY_LENGTH: 1000,
} as const;

export const REASSESSMENT_RESPONSE_LIMITS = {
  MAX_SUMMARY_LENGTH: 3000,
  MAX_SYNTHESIS_LENGTH: 2000,
  MAX_HYPOTHESES_COUNT: 20,
  MAX_HYPOTHESIS_TITLE_LENGTH: 300,
  MAX_EXPLANATION_LENGTH: 1000,
  MAX_CITATION_IDS_COUNT: 20,
  MAX_CITATION_ID_LENGTH: 100,
  MAX_SUGGESTED_VERIFY_LENGTH: 1000,
  MAX_CHECKS_COUNT: 20,
  MAX_CHECK_TITLE_LENGTH: 300,
  MAX_CHECK_TYPE_LENGTH: 200,
  MAX_CHECK_TOOLS_COUNT: 15,
  MAX_CHECK_TOOL_LENGTH: 200,
  MAX_CHECK_PROCEDURE_LENGTH: 2000,
  MAX_CHECK_RESULT_LENGTH: 1000,
  MAX_CHECK_SAFETY_COUNT: 15,
  MAX_CHECK_SAFETY_LENGTH: 500,
  MIN_SAFETY_WARNINGS_COUNT: 1,
  MAX_SAFETY_WARNINGS_COUNT: 20,
  MAX_SAFETY_WARNING_LENGTH: 500,
  MAX_LIMITATIONS_COUNT: 20,
  MAX_LIMITATION_LENGTH: 500,
} as const;

const ALLOWED_CHECK_OUTCOMES: ReadonlySet<string> = new Set<CheckOutcome>([
  'passed',
  'failed',
  'inconclusive',
  'unable_to_perform',
]);

const ALLOWED_HYPOTHESIS_STATUSES: ReadonlySet<string> = new Set<RevisedHypothesisStatus>([
  'supported',
  'weakened',
  'unresolved',
  'contradicted',
]);

const ALLOWED_CONFIDENCE_LEVELS: ReadonlySet<string> = new Set<ConfidenceLevel>([
  'low',
  'medium',
  'high',
]);

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Validates ISO 8601 timestamps with rigorous calendar date checks.
 * Rejects non-strings, malformed formats, and impossible dates (e.g. Feb 30th).
 */
export function isValidIsoTimestamp(val: unknown): val is string {
  if (typeof val !== 'string' || val.trim() === '') return false;
  const trimmed = val.trim();

  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-]\d{2}):(\d{2}))$/
  );
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  const hour = parseInt(match[4], 10);
  const minute = parseInt(match[5], 10);
  const second = parseInt(match[6], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
    return false;
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return false;
  const dateObj = new Date(parsed);
  if (Number.isNaN(dateObj.getTime())) return false;

  // Calendar date rollover verification (e.g., February 30th rolling over to March)
  if (trimmed.endsWith('Z')) {
    if (
      dateObj.getUTCFullYear() !== year ||
      dateObj.getUTCMonth() + 1 !== month ||
      dateObj.getUTCDate() !== day
    ) {
      return false;
    }
  }

  return true;
}

function validateConfidence(val: unknown, fieldName: string, isRequest: boolean = false): ConfidenceLevel {
  const ErrClass = isRequest ? ReassessmentRequestValidationError : ReassessmentValidationError;
  if (typeof val !== 'string' || !ALLOWED_CONFIDENCE_LEVELS.has(val as ConfidenceLevel)) {
    throw new ErrClass(
      `Field "${fieldName}" must be one of: 'low', 'medium', or 'high'. Received: ${JSON.stringify(val)}.`
    );
  }
  return val as ConfidenceLevel;
}

function validateVisibleObservation(
  val: unknown,
  index: number
): VisibleObservation {
  if (!isRecord(val)) {
    throw new ReassessmentRequestValidationError(`diagnosticContext.visibleObservations[${index}] must be an object.`);
  }

  if (typeof val.description !== 'string' || val.description.trim() === '') {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.visibleObservations[${index}].description" is required and must be non-empty.`
    );
  }
  if (val.description.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_OBSERVATION_DESC_LENGTH) {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.visibleObservations[${index}].description" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_OBSERVATION_DESC_LENGTH} characters.`
    );
  }

  if (typeof val.evidence !== 'string' || val.evidence.trim() === '') {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.visibleObservations[${index}].evidence" is required and must be non-empty.`
    );
  }
  if (val.evidence.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_OBSERVATION_EVIDENCE_LENGTH) {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.visibleObservations[${index}].evidence" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_OBSERVATION_EVIDENCE_LENGTH} characters.`
    );
  }

  const confidence = validateConfidence(
    val.confidence,
    `diagnosticContext.visibleObservations[${index}].confidence`,
    true
  );

  return {
    description: val.description.trim(),
    evidence: val.evidence.trim(),
    confidence,
  };
}

function validateFaultHypothesis(
  val: unknown,
  index: number
): FaultHypothesis {
  if (!isRecord(val)) {
    throw new ReassessmentRequestValidationError(`diagnosticContext.initialHypotheses[${index}] must be an object.`);
  }

  if (typeof val.title !== 'string' || val.title.trim() === '') {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.initialHypotheses[${index}].title" is required and must be non-empty.`
    );
  }
  if (val.title.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_HYPOTHESIS_TITLE_LENGTH) {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.initialHypotheses[${index}].title" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_HYPOTHESIS_TITLE_LENGTH} characters.`
    );
  }

  if (typeof val.reasoning !== 'string' || val.reasoning.trim() === '') {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.initialHypotheses[${index}].reasoning" is required and must be non-empty.`
    );
  }
  if (val.reasoning.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_HYPOTHESIS_REASONING_LENGTH) {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.initialHypotheses[${index}].reasoning" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_HYPOTHESIS_REASONING_LENGTH} characters.`
    );
  }

  if (!Array.isArray(val.supportingEvidence)) {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.initialHypotheses[${index}].supportingEvidence" must be an array.`
    );
  }
  if (val.supportingEvidence.length > REASSESSMENT_REQUEST_LIMITS.MAX_HYPOTHESIS_EVIDENCE_COUNT) {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.initialHypotheses[${index}].supportingEvidence" exceeds maximum allowed count of ${REASSESSMENT_REQUEST_LIMITS.MAX_HYPOTHESIS_EVIDENCE_COUNT}.`
    );
  }
  const supportingEvidence = val.supportingEvidence.map((ev, evIdx) => {
    if (typeof ev !== 'string' || ev.trim() === '') {
      throw new ReassessmentRequestValidationError(
        `Field "diagnosticContext.initialHypotheses[${index}].supportingEvidence[${evIdx}]" must be a non-empty string.`
      );
    }
    if (ev.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_HYPOTHESIS_EVIDENCE_LENGTH) {
      throw new ReassessmentRequestValidationError(
        `Field "diagnosticContext.initialHypotheses[${index}].supportingEvidence[${evIdx}]" exceeds maximum length of ${REASSESSMENT_REQUEST_LIMITS.MAX_HYPOTHESIS_EVIDENCE_LENGTH} characters.`
      );
    }
    return ev.trim();
  });

  const confidence = validateConfidence(
    val.confidence,
    `diagnosticContext.initialHypotheses[${index}].confidence`,
    true
  );

  if (typeof val.suggestedVerification !== 'string' || val.suggestedVerification.trim() === '') {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.initialHypotheses[${index}].suggestedVerification" is required and must be non-empty.`
    );
  }
  if (val.suggestedVerification.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_HYPOTHESIS_VERIFY_LENGTH) {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.initialHypotheses[${index}].suggestedVerification" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_HYPOTHESIS_VERIFY_LENGTH} characters.`
    );
  }

  return {
    title: val.title.trim(),
    reasoning: val.reasoning.trim(),
    supportingEvidence,
    confidence,
    suggestedVerification: val.suggestedVerification.trim(),
  };
}

function validateDiagnosticContext(val: unknown): DiagnosticContextPayload {
  if (!isRecord(val)) {
    throw new ReassessmentRequestValidationError('Field "diagnosticContext" must be a non-null object.');
  }

  let boardName: string | undefined;
  if (val.boardName !== undefined && val.boardName !== null) {
    if (typeof val.boardName !== 'string') {
      throw new ReassessmentRequestValidationError('Field "diagnosticContext.boardName" must be a string if provided.');
    }
    if (val.boardName.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_BOARD_NAME_LENGTH) {
      throw new ReassessmentRequestValidationError(
        `Field "diagnosticContext.boardName" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_BOARD_NAME_LENGTH} characters.`
      );
    }
    boardName = val.boardName.trim() || undefined;
  }

  if (typeof val.expectedBehavior !== 'string' || val.expectedBehavior.trim() === '') {
    throw new ReassessmentRequestValidationError(
      'Field "diagnosticContext.expectedBehavior" is required and must be a non-empty string.'
    );
  }
  if (val.expectedBehavior.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_EXPECTED_BEHAVIOR_LENGTH) {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.expectedBehavior" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_EXPECTED_BEHAVIOR_LENGTH} characters.`
    );
  }
  const expectedBehavior = val.expectedBehavior.trim();

  if (typeof val.observedBehavior !== 'string' || val.observedBehavior.trim() === '') {
    throw new ReassessmentRequestValidationError(
      'Field "diagnosticContext.observedBehavior" is required and must be a non-empty string.'
    );
  }
  if (val.observedBehavior.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_OBSERVED_BEHAVIOR_LENGTH) {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.observedBehavior" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_OBSERVED_BEHAVIOR_LENGTH} characters.`
    );
  }
  const observedBehavior = val.observedBehavior.trim();

  let relevantComponents: string | undefined;
  if (val.relevantComponents !== undefined && val.relevantComponents !== null) {
    if (typeof val.relevantComponents !== 'string') {
      throw new ReassessmentRequestValidationError(
        'Field "diagnosticContext.relevantComponents" must be a string if provided.'
      );
    }
    if (val.relevantComponents.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_COMPONENTS_LENGTH) {
      throw new ReassessmentRequestValidationError(
        `Field "diagnosticContext.relevantComponents" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_COMPONENTS_LENGTH} characters.`
      );
    }
    relevantComponents = val.relevantComponents.trim() || undefined;
  }

  let additionalNotes: string | undefined;
  if (val.additionalNotes !== undefined && val.additionalNotes !== null) {
    if (typeof val.additionalNotes !== 'string') {
      throw new ReassessmentRequestValidationError(
        'Field "diagnosticContext.additionalNotes" must be a string if provided.'
      );
    }
    if (val.additionalNotes.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_CONTEXT_NOTES_LENGTH) {
      throw new ReassessmentRequestValidationError(
        `Field "diagnosticContext.additionalNotes" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_CONTEXT_NOTES_LENGTH} characters.`
      );
    }
    additionalNotes = val.additionalNotes.trim() || undefined;
  }

  if (typeof val.initialSummary !== 'string' || val.initialSummary.trim() === '') {
    throw new ReassessmentRequestValidationError(
      'Field "diagnosticContext.initialSummary" is required and must be a non-empty string.'
    );
  }
  if (val.initialSummary.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_INITIAL_SUMMARY_LENGTH) {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.initialSummary" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_INITIAL_SUMMARY_LENGTH} characters.`
    );
  }
  const initialSummary = val.initialSummary.trim();

  if (!Array.isArray(val.visibleObservations)) {
    throw new ReassessmentRequestValidationError(
      'Field "diagnosticContext.visibleObservations" must be an array.'
    );
  }
  if (val.visibleObservations.length > REASSESSMENT_REQUEST_LIMITS.MAX_OBSERVATIONS_COUNT) {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.visibleObservations" exceeds maximum allowed count of ${REASSESSMENT_REQUEST_LIMITS.MAX_OBSERVATIONS_COUNT}.`
    );
  }
  const visibleObservations = val.visibleObservations.map((obs, idx) =>
    validateVisibleObservation(obs, idx)
  );

  if (!Array.isArray(val.initialHypotheses)) {
    throw new ReassessmentRequestValidationError(
      'Field "diagnosticContext.initialHypotheses" must be an array.'
    );
  }
  if (val.initialHypotheses.length === 0) {
    throw new ReassessmentRequestValidationError(
      'Field "diagnosticContext.initialHypotheses" must contain at least one hypothesis.'
    );
  }
  if (val.initialHypotheses.length > REASSESSMENT_REQUEST_LIMITS.MAX_HYPOTHESES_COUNT) {
    throw new ReassessmentRequestValidationError(
      `Field "diagnosticContext.initialHypotheses" exceeds maximum allowed count of ${REASSESSMENT_REQUEST_LIMITS.MAX_HYPOTHESES_COUNT}.`
    );
  }
  const initialHypotheses = val.initialHypotheses.map((hyp, idx) =>
    validateFaultHypothesis(hyp, idx)
  );

  return {
    boardName,
    expectedBehavior,
    observedBehavior,
    relevantComponents,
    additionalNotes,
    initialSummary,
    visibleObservations,
    initialHypotheses,
  };
}

function validateEvidenceRecord(val: unknown, index: number): EvidenceRecord {
  if (!isRecord(val)) {
    throw new ReassessmentRequestValidationError(`evidence[${index}] must be a non-null object.`);
  }

  // 1. ID
  if (typeof val.id !== 'string' || val.id.trim() === '') {
    throw new ReassessmentRequestValidationError(`Field "evidence[${index}].id" is required and must be a non-empty string.`);
  }
  if (val.id.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_EVIDENCE_ID_LENGTH) {
    throw new ReassessmentRequestValidationError(
      `Field "evidence[${index}].id" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_EVIDENCE_ID_LENGTH} characters.`
    );
  }
  const id = val.id.trim();

  // 2. targetRecommendationId
  if (typeof val.targetRecommendationId !== 'string' || val.targetRecommendationId.trim() === '') {
    throw new ReassessmentRequestValidationError(
      `Field "evidence[${index}].targetRecommendationId" is required and must be a non-empty string.`
    );
  }
  if (val.targetRecommendationId.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_RECOMMENDATION_ID_LENGTH) {
    throw new ReassessmentRequestValidationError(
      `Field "evidence[${index}].targetRecommendationId" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_RECOMMENDATION_ID_LENGTH} characters.`
    );
  }
  const targetRecommendationId = val.targetRecommendationId.trim();

  // 3. cycleIndex
  if (
    typeof val.cycleIndex !== 'number' ||
    !Number.isInteger(val.cycleIndex) ||
    val.cycleIndex < 0
  ) {
    throw new ReassessmentRequestValidationError(
      `Field "evidence[${index}].cycleIndex" must be a non-negative integer.`
    );
  }
  const cycleIndex = val.cycleIndex;

  // 4. stepNumber
  if (
    typeof val.stepNumber !== 'number' ||
    !Number.isInteger(val.stepNumber) ||
    val.stepNumber <= 0
  ) {
    throw new ReassessmentRequestValidationError(
      `Field "evidence[${index}].stepNumber" must be a positive integer.`
    );
  }
  const stepNumber = val.stepNumber;

  // 5. checkTitle
  if (typeof val.checkTitle !== 'string' || val.checkTitle.trim() === '') {
    throw new ReassessmentRequestValidationError(
      `Field "evidence[${index}].checkTitle" is required and must be a non-empty string.`
    );
  }
  if (val.checkTitle.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_CHECK_TITLE_LENGTH) {
    throw new ReassessmentRequestValidationError(
      `Field "evidence[${index}].checkTitle" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_CHECK_TITLE_LENGTH} characters.`
    );
  }
  const checkTitle = val.checkTitle.trim();

  // 6. outcome
  if (typeof val.outcome !== 'string' || !ALLOWED_CHECK_OUTCOMES.has(val.outcome as CheckOutcome)) {
    throw new ReassessmentRequestValidationError(
      `Field "evidence[${index}].outcome" must be one of: ${Array.from(ALLOWED_CHECK_OUTCOMES).join(', ')}. Received: ${JSON.stringify(val.outcome)}.`
    );
  }
  const outcome = val.outcome as CheckOutcome;

  // 7. Measurement pair validation (numericValue and measurementUnit)
  const hasValue = val.numericValue !== undefined && val.numericValue !== null;
  const hasUnit = val.measurementUnit !== undefined && val.measurementUnit !== null;

  if (hasValue !== hasUnit) {
    throw new ReassessmentRequestValidationError(
      `Field "evidence[${index}]": Incomplete measurement pair. Both "numericValue" and "measurementUnit" must be provided together, or both omitted.`
    );
  }

  let numericValue: number | undefined;
  let measurementUnit: string | undefined;

  if (hasValue && hasUnit) {
    if (
      typeof val.numericValue !== 'number' ||
      !Number.isFinite(val.numericValue) ||
      Number.isNaN(val.numericValue)
    ) {
      throw new ReassessmentRequestValidationError(
        `Field "evidence[${index}].numericValue" must be a finite number. Received: ${JSON.stringify(val.numericValue)}.`
      );
    }
    if (
      val.numericValue < REASSESSMENT_REQUEST_LIMITS.MIN_NUMERIC_VALUE ||
      val.numericValue > REASSESSMENT_REQUEST_LIMITS.MAX_NUMERIC_VALUE
    ) {
      throw new ReassessmentRequestValidationError(
        `Field "evidence[${index}].numericValue" must be between ${REASSESSMENT_REQUEST_LIMITS.MIN_NUMERIC_VALUE} and ${REASSESSMENT_REQUEST_LIMITS.MAX_NUMERIC_VALUE}.`
      );
    }
    numericValue = val.numericValue;

    if (typeof val.measurementUnit !== 'string') {
      throw new ReassessmentRequestValidationError(
        `Field "evidence[${index}].measurementUnit" must be a string.`
      );
    }
    const trimmedUnit = val.measurementUnit.trim();
    if (trimmedUnit.length === 0) {
      throw new ReassessmentRequestValidationError(
        `Field "evidence[${index}].measurementUnit" must be a non-empty string when numericValue is provided.`
      );
    }
    if (trimmedUnit.length > REASSESSMENT_REQUEST_LIMITS.MAX_UNIT_LENGTH) {
      throw new ReassessmentRequestValidationError(
        `Field "evidence[${index}].measurementUnit" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_UNIT_LENGTH} characters.`
      );
    }
    measurementUnit = trimmedUnit;
  }

  // 8. technicianNotes
  let technicianNotes: string | undefined;
  if (val.technicianNotes !== undefined && val.technicianNotes !== null) {
    if (typeof val.technicianNotes !== 'string') {
      throw new ReassessmentRequestValidationError(
        `Field "evidence[${index}].technicianNotes" must be a string if provided.`
      );
    }
    if (val.technicianNotes.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_TECHNICIAN_NOTES_LENGTH) {
      throw new ReassessmentRequestValidationError(
        `Field "evidence[${index}].technicianNotes" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_TECHNICIAN_NOTES_LENGTH} characters.`
      );
    }
    technicianNotes = val.technicianNotes.trim() || undefined;
  }

  // 9. recordedAt
  if (!isValidIsoTimestamp(val.recordedAt)) {
    throw new ReassessmentRequestValidationError(
      `Field "evidence[${index}].recordedAt" must be a valid ISO 8601 timestamp string. Received: ${JSON.stringify(val.recordedAt)}.`
    );
  }
  const recordedAt = (val.recordedAt as string).trim();

  // 10. supersedesEvidenceId
  let supersedesEvidenceId: string | undefined;
  if (val.supersedesEvidenceId !== undefined && val.supersedesEvidenceId !== null) {
    if (typeof val.supersedesEvidenceId !== 'string' || val.supersedesEvidenceId.trim() === '') {
      throw new ReassessmentRequestValidationError(
        `Field "evidence[${index}].supersedesEvidenceId" must be a non-empty string if provided.`
      );
    }
    if (val.supersedesEvidenceId.trim().length > REASSESSMENT_REQUEST_LIMITS.MAX_EVIDENCE_ID_LENGTH) {
      throw new ReassessmentRequestValidationError(
        `Field "evidence[${index}].supersedesEvidenceId" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_EVIDENCE_ID_LENGTH} characters.`
      );
    }
    supersedesEvidenceId = val.supersedesEvidenceId.trim();
  }

  return {
    id,
    targetRecommendationId,
    cycleIndex,
    stepNumber,
    checkTitle,
    outcome,
    numericValue,
    measurementUnit,
    technicianNotes,
    recordedAt,
    supersedesEvidenceId,
  };
}

/**
 * Validates an untrusted payload against the DiagnosisReassessmentRequest contract.
 */
export function validateReassessmentRequest(payload: unknown): DiagnosisReassessmentRequest {
  if (!isRecord(payload)) {
    throw new ReassessmentRequestValidationError('Request payload must be a non-null JSON object.');
  }

  const diagnosticContext = validateDiagnosticContext(payload.diagnosticContext);

  if (!Array.isArray(payload.evidence)) {
    throw new ReassessmentRequestValidationError('Field "evidence" must be an array.');
  }

  if (payload.evidence.length < REASSESSMENT_REQUEST_LIMITS.MIN_EVIDENCE_COUNT) {
    throw new ReassessmentRequestValidationError(
      `Field "evidence" must contain at least ${REASSESSMENT_REQUEST_LIMITS.MIN_EVIDENCE_COUNT} evidence record.`
    );
  }

  if (payload.evidence.length > REASSESSMENT_REQUEST_LIMITS.MAX_EVIDENCE_COUNT) {
    throw new ReassessmentRequestValidationError(
      `Field "evidence" exceeds maximum allowed count of ${REASSESSMENT_REQUEST_LIMITS.MAX_EVIDENCE_COUNT} records.`
    );
  }

  const evidenceIdSet = new Set<string>();
  const evidence: EvidenceRecord[] = [];

  for (let idx = 0; idx < payload.evidence.length; idx++) {
    const record = validateEvidenceRecord(payload.evidence[idx], idx);

    if (evidenceIdSet.has(record.id)) {
      throw new ReassessmentRequestValidationError(
        `Duplicate evidence ID "${record.id}" detected in "evidence[${idx}]". Evidence IDs must be unique.`
      );
    }
    evidenceIdSet.add(record.id);
    evidence.push(record);
  }

  // Cross-record supersession validation
  for (let idx = 0; idx < evidence.length; idx++) {
    const record = evidence[idx];
    if (record.supersedesEvidenceId !== undefined) {
      if (record.supersedesEvidenceId === record.id) {
        throw new ReassessmentRequestValidationError(
          `Field "evidence[${idx}].supersedesEvidenceId" cannot reference its own ID ("${record.id}").`
        );
      }
      if (!evidenceIdSet.has(record.supersedesEvidenceId)) {
        throw new ReassessmentRequestValidationError(
          `Field "evidence[${idx}].supersedesEvidenceId" references unknown evidence ID "${record.supersedesEvidenceId}". The superseded record must be included in the evidence history.`
        );
      }
    }
  }

  let additionalTechnicianNotes: string | undefined;
  if (
    payload.additionalTechnicianNotes !== undefined &&
    payload.additionalTechnicianNotes !== null
  ) {
    if (typeof payload.additionalTechnicianNotes !== 'string') {
      throw new ReassessmentRequestValidationError(
        'Field "additionalTechnicianNotes" must be a string if provided.'
      );
    }
    if (
      payload.additionalTechnicianNotes.trim().length >
      REASSESSMENT_REQUEST_LIMITS.MAX_ADDITIONAL_NOTES_LENGTH
    ) {
      throw new ReassessmentRequestValidationError(
        `Field "additionalTechnicianNotes" exceeds maximum allowed length of ${REASSESSMENT_REQUEST_LIMITS.MAX_ADDITIONAL_NOTES_LENGTH} characters.`
      );
    }
    additionalTechnicianNotes = payload.additionalTechnicianNotes.trim() || undefined;
  }

  return {
    diagnosticContext,
    evidence,
    additionalTechnicianNotes,
  };
}

// ---------------------------------------------------------------------------
// RESPONSE VALIDATION LOGIC
// ---------------------------------------------------------------------------

function validateStringArray(
  val: unknown,
  fieldName: string,
  minItems: number,
  maxItems: number,
  maxItemLength: number
): string[] {
  if (!Array.isArray(val)) {
    throw new ReassessmentValidationError(`Field "${fieldName}" must be an array.`);
  }

  if (val.length < minItems) {
    throw new ReassessmentValidationError(
      `Field "${fieldName}" must contain at least ${minItems} item${minItems === 1 ? '' : 's'}.`
    );
  }

  if (val.length > maxItems) {
    throw new ReassessmentValidationError(
      `Field "${fieldName}" exceeds the maximum allowed count of ${maxItems} items.`
    );
  }

  return val.map((item, index) => {
    if (typeof item !== 'string' || item.trim() === '') {
      throw new ReassessmentValidationError(
        `Field "${fieldName}[${index}]" must be a non-empty string.`
      );
    }
    if (item.trim().length > maxItemLength) {
      throw new ReassessmentValidationError(
        `Field "${fieldName}[${index}]" exceeds the maximum allowed length of ${maxItemLength} characters.`
      );
    }
    return item.trim();
  });
}

function validateRevisedHypothesis(
  val: unknown,
  index: number,
  submittedEvidenceIds?: Set<string>
): RevisedFaultHypothesis {
  if (!isRecord(val)) {
    throw new ReassessmentValidationError(`revisedHypotheses[${index}] must be an object.`);
  }

  if (typeof val.title !== 'string' || val.title.trim() === '') {
    throw new ReassessmentValidationError(
      `Field "revisedHypotheses[${index}].title" is required and must be non-empty.`
    );
  }
  if (val.title.trim().length > REASSESSMENT_RESPONSE_LIMITS.MAX_HYPOTHESIS_TITLE_LENGTH) {
    throw new ReassessmentValidationError(
      `Field "revisedHypotheses[${index}].title" exceeds maximum allowed length of ${REASSESSMENT_RESPONSE_LIMITS.MAX_HYPOTHESIS_TITLE_LENGTH} characters.`
    );
  }
  const title = val.title.trim();

  if (
    typeof val.status !== 'string' ||
    !ALLOWED_HYPOTHESIS_STATUSES.has(val.status as RevisedHypothesisStatus)
  ) {
    throw new ReassessmentValidationError(
      `Field "revisedHypotheses[${index}].status" must be one of: ${Array.from(ALLOWED_HYPOTHESIS_STATUSES).join(', ')}. Received: ${JSON.stringify(val.status)}.`
    );
  }
  const status = val.status as RevisedHypothesisStatus;

  const confidence = validateConfidence(
    val.confidence,
    `revisedHypotheses[${index}].confidence`,
    false
  );

  if (typeof val.explanationOfChange !== 'string' || val.explanationOfChange.trim() === '') {
    throw new ReassessmentValidationError(
      `Field "revisedHypotheses[${index}].explanationOfChange" is required and must be non-empty.`
    );
  }
  if (val.explanationOfChange.trim().length > REASSESSMENT_RESPONSE_LIMITS.MAX_EXPLANATION_LENGTH) {
    throw new ReassessmentValidationError(
      `Field "revisedHypotheses[${index}].explanationOfChange" exceeds maximum allowed length of ${REASSESSMENT_RESPONSE_LIMITS.MAX_EXPLANATION_LENGTH} characters.`
    );
  }
  const explanationOfChange = val.explanationOfChange.trim();

  if (!Array.isArray(val.citingEvidenceIds)) {
    throw new ReassessmentValidationError(
      `Field "revisedHypotheses[${index}].citingEvidenceIds" must be an array.`
    );
  }
  if (val.citingEvidenceIds.length > REASSESSMENT_RESPONSE_LIMITS.MAX_CITATION_IDS_COUNT) {
    throw new ReassessmentValidationError(
      `Field "revisedHypotheses[${index}].citingEvidenceIds" exceeds maximum allowed count of ${REASSESSMENT_RESPONSE_LIMITS.MAX_CITATION_IDS_COUNT}.`
    );
  }

  const citingEvidenceIds = val.citingEvidenceIds.map((cId, cIdx) => {
    if (typeof cId !== 'string' || cId.trim() === '') {
      throw new ReassessmentValidationError(
        `Field "revisedHypotheses[${index}].citingEvidenceIds[${cIdx}]" must be a non-empty string.`
      );
    }
    const cleanId = cId.trim();
    if (cleanId.length > REASSESSMENT_RESPONSE_LIMITS.MAX_CITATION_ID_LENGTH) {
      throw new ReassessmentValidationError(
        `Field "revisedHypotheses[${index}].citingEvidenceIds[${cIdx}]" exceeds maximum length of ${REASSESSMENT_RESPONSE_LIMITS.MAX_CITATION_ID_LENGTH} characters.`
      );
    }

    if (submittedEvidenceIds && !submittedEvidenceIds.has(cleanId)) {
      throw new ReassessmentValidationError(
        `Field "revisedHypotheses[${index}].citingEvidenceIds" cites unknown evidence ID "${cleanId}". Evidence citation must refer to a submitted evidence record.`
      );
    }

    return cleanId;
  });

  let suggestedVerification: string | undefined;
  if (val.suggestedVerification !== undefined && val.suggestedVerification !== null) {
    if (typeof val.suggestedVerification !== 'string') {
      throw new ReassessmentValidationError(
        `Field "revisedHypotheses[${index}].suggestedVerification" must be a string if provided.`
      );
    }
    if (
      val.suggestedVerification.trim().length >
      REASSESSMENT_RESPONSE_LIMITS.MAX_SUGGESTED_VERIFY_LENGTH
    ) {
      throw new ReassessmentValidationError(
        `Field "revisedHypotheses[${index}].suggestedVerification" exceeds maximum allowed length of ${REASSESSMENT_RESPONSE_LIMITS.MAX_SUGGESTED_VERIFY_LENGTH} characters.`
      );
    }
    suggestedVerification = val.suggestedVerification.trim() || undefined;
  }

  return {
    title,
    status,
    confidence,
    explanationOfChange,
    citingEvidenceIds,
    suggestedVerification,
  };
}

function validateRecommendedCheck(val: unknown, index: number): RecommendedCheck {
  if (!isRecord(val)) {
    throw new ReassessmentValidationError(`nextRecommendedChecks[${index}] must be an object.`);
  }

  const stepNumber = val.stepNumber;
  if (typeof stepNumber !== 'number' || !Number.isInteger(stepNumber) || stepNumber <= 0) {
    throw new ReassessmentValidationError(
      `Field "nextRecommendedChecks[${index}].stepNumber" must be a positive integer.`
    );
  }

  if (typeof val.title !== 'string' || val.title.trim() === '') {
    throw new ReassessmentValidationError(
      `Field "nextRecommendedChecks[${index}].title" is required and must be non-empty.`
    );
  }
  if (val.title.trim().length > REASSESSMENT_RESPONSE_LIMITS.MAX_CHECK_TITLE_LENGTH) {
    throw new ReassessmentValidationError(
      `Field "nextRecommendedChecks[${index}].title" exceeds maximum allowed length of ${REASSESSMENT_RESPONSE_LIMITS.MAX_CHECK_TITLE_LENGTH} characters.`
    );
  }
  const title = val.title.trim();

  if (typeof val.testType !== 'string' || val.testType.trim() === '') {
    throw new ReassessmentValidationError(
      `Field "nextRecommendedChecks[${index}].testType" is required and must be non-empty.`
    );
  }
  if (val.testType.trim().length > REASSESSMENT_RESPONSE_LIMITS.MAX_CHECK_TYPE_LENGTH) {
    throw new ReassessmentValidationError(
      `Field "nextRecommendedChecks[${index}].testType" exceeds maximum allowed length of ${REASSESSMENT_RESPONSE_LIMITS.MAX_CHECK_TYPE_LENGTH} characters.`
    );
  }
  const testType = val.testType.trim();

  const toolsNeeded = validateStringArray(
    val.toolsNeeded,
    `nextRecommendedChecks[${index}].toolsNeeded`,
    0,
    REASSESSMENT_RESPONSE_LIMITS.MAX_CHECK_TOOLS_COUNT,
    REASSESSMENT_RESPONSE_LIMITS.MAX_CHECK_TOOL_LENGTH
  );

  if (typeof val.procedure !== 'string' || val.procedure.trim() === '') {
    throw new ReassessmentValidationError(
      `Field "nextRecommendedChecks[${index}].procedure" is required and must be non-empty.`
    );
  }
  if (val.procedure.trim().length > REASSESSMENT_RESPONSE_LIMITS.MAX_CHECK_PROCEDURE_LENGTH) {
    throw new ReassessmentValidationError(
      `Field "nextRecommendedChecks[${index}].procedure" exceeds maximum allowed length of ${REASSESSMENT_RESPONSE_LIMITS.MAX_CHECK_PROCEDURE_LENGTH} characters.`
    );
  }
  const procedure = val.procedure.trim();

  if (typeof val.expectedResult !== 'string' || val.expectedResult.trim() === '') {
    throw new ReassessmentValidationError(
      `Field "nextRecommendedChecks[${index}].expectedResult" is required and must be non-empty.`
    );
  }
  if (val.expectedResult.trim().length > REASSESSMENT_RESPONSE_LIMITS.MAX_CHECK_RESULT_LENGTH) {
    throw new ReassessmentValidationError(
      `Field "nextRecommendedChecks[${index}].expectedResult" exceeds maximum allowed length of ${REASSESSMENT_RESPONSE_LIMITS.MAX_CHECK_RESULT_LENGTH} characters.`
    );
  }
  const expectedResult = val.expectedResult.trim();

  const safetyNotes = validateStringArray(
    val.safetyNotes,
    `nextRecommendedChecks[${index}].safetyNotes`,
    0,
    REASSESSMENT_RESPONSE_LIMITS.MAX_CHECK_SAFETY_COUNT,
    REASSESSMENT_RESPONSE_LIMITS.MAX_CHECK_SAFETY_LENGTH
  );

  return {
    stepNumber,
    title,
    testType,
    toolsNeeded,
    procedure,
    expectedResult,
    safetyNotes,
  };
}

/**
 * Validates an untrusted parsed object against the DiagnosisReassessmentResponse contract.
 * Enforces mandatory presence of at least one meaningful electrical safety warning.
 * Rejects unknown evidence citations when submittedEvidenceIds is provided.
 */
export function validateReassessmentResponse(
  data: unknown,
  submittedEvidenceIds?: Set<string>
): DiagnosisReassessmentResponse {
  if (!isRecord(data)) {
    throw new ReassessmentValidationError('Model output must be a non-null JSON object.');
  }

  if (typeof data.summary !== 'string' || data.summary.trim() === '') {
    throw new ReassessmentValidationError('Field "summary" is required and must be non-empty.');
  }
  if (data.summary.trim().length > REASSESSMENT_RESPONSE_LIMITS.MAX_SUMMARY_LENGTH) {
    throw new ReassessmentValidationError(
      `Field "summary" exceeds maximum allowed length of ${REASSESSMENT_RESPONSE_LIMITS.MAX_SUMMARY_LENGTH} characters.`
    );
  }
  const summary = data.summary.trim();

  if (typeof data.evidenceSynthesis !== 'string' || data.evidenceSynthesis.trim() === '') {
    throw new ReassessmentValidationError(
      'Field "evidenceSynthesis" is required and must be non-empty.'
    );
  }
  if (data.evidenceSynthesis.trim().length > REASSESSMENT_RESPONSE_LIMITS.MAX_SYNTHESIS_LENGTH) {
    throw new ReassessmentValidationError(
      `Field "evidenceSynthesis" exceeds maximum allowed length of ${REASSESSMENT_RESPONSE_LIMITS.MAX_SYNTHESIS_LENGTH} characters.`
    );
  }
  const evidenceSynthesis = data.evidenceSynthesis.trim();

  if (!Array.isArray(data.revisedHypotheses)) {
    throw new ReassessmentValidationError('Field "revisedHypotheses" must be an array.');
  }
  if (data.revisedHypotheses.length === 0) {
    throw new ReassessmentValidationError(
      'Field "revisedHypotheses" must contain at least one revised hypothesis.'
    );
  }
  if (data.revisedHypotheses.length > REASSESSMENT_RESPONSE_LIMITS.MAX_HYPOTHESES_COUNT) {
    throw new ReassessmentValidationError(
      `Field "revisedHypotheses" exceeds maximum allowed count of ${REASSESSMENT_RESPONSE_LIMITS.MAX_HYPOTHESES_COUNT}.`
    );
  }
  const revisedHypotheses = data.revisedHypotheses.map((hyp, idx) =>
    validateRevisedHypothesis(hyp, idx, submittedEvidenceIds)
  );

  if (!Array.isArray(data.nextRecommendedChecks)) {
    throw new ReassessmentValidationError('Field "nextRecommendedChecks" must be an array.');
  }
  if (data.nextRecommendedChecks.length > REASSESSMENT_RESPONSE_LIMITS.MAX_CHECKS_COUNT) {
    throw new ReassessmentValidationError(
      `Field "nextRecommendedChecks" exceeds maximum allowed count of ${REASSESSMENT_RESPONSE_LIMITS.MAX_CHECKS_COUNT}.`
    );
  }
  const nextRecommendedChecks = data.nextRecommendedChecks.map((chk, idx) =>
    validateRecommendedCheck(chk, idx)
  );

  // Mandatory Safety Warnings: must have at least one meaningful warning
  const safetyWarnings = validateStringArray(
    data.safetyWarnings,
    'safetyWarnings',
    REASSESSMENT_RESPONSE_LIMITS.MIN_SAFETY_WARNINGS_COUNT,
    REASSESSMENT_RESPONSE_LIMITS.MAX_SAFETY_WARNINGS_COUNT,
    REASSESSMENT_RESPONSE_LIMITS.MAX_SAFETY_WARNING_LENGTH
  );

  const limitations = validateStringArray(
    data.limitations,
    'limitations',
    0,
    REASSESSMENT_RESPONSE_LIMITS.MAX_LIMITATIONS_COUNT,
    REASSESSMENT_RESPONSE_LIMITS.MAX_LIMITATION_LENGTH
  );

  return {
    summary,
    evidenceSynthesis,
    revisedHypotheses,
    nextRecommendedChecks,
    safetyWarnings,
    limitations,
  };
}

/**
 * Parses raw model output text as JSON and validates against DiagnosisReassessmentResponse.
 * Gracefully strips markdown code block fences (```json ... ```).
 */
export function parseReassessmentJson(
  rawText: string,
  submittedEvidenceIds?: Set<string>
): DiagnosisReassessmentResponse {
  if (typeof rawText !== 'string' || rawText.trim() === '') {
    throw new ReassessmentParsingError('Model returned empty response content.');
  }

  let cleanText = rawText.trim();

  // Check for unclosed <think> tag indicating truncation during reasoning
  if (/^<think>[\s\S]*$/i.test(cleanText) && !/<\/think>/i.test(cleanText)) {
    throw new ReassessmentParsingError(
      'Model output was truncated inside reasoning (<think>) before producing a final response.'
    );
  }

  // Strip <think>...</think> reasoning blocks if present (from reasoning-enabled models)
  cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  if (cleanText === '') {
    throw new ReassessmentParsingError(
      'Model output contained only reasoning tags (<think>) without a final diagnostic response.'
    );
  }

  // Strip markdown code block fences if present
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
    throw new ReassessmentParsingError(
      `Failed to parse reassessment output as valid JSON: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  return validateReassessmentResponse(parsed, submittedEvidenceIds);
}

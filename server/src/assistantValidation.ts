/**
 * CircuitLens Stage 6C-3A-B — Assistant Request Validation
 *
 * Enforces deep defensive server-side boundary validation, input sanitization,
 * string length limits, enum verification, and structured error handling for assistant requests.
 *
 * Resolves FINDING-01: validates nested context fields before processing by the engine.
 */

import type {
  AssistantChatRequest,
  AssistantInvestigationContext,
} from './types/assistant.js';
import type {
  ConfidenceLevel,
  RevisedHypothesisStatus,
  CheckOutcome,
  AnalysisDepth,
} from './types/diagnosis.js';

export class AssistantValidationError extends Error {
  readonly statusCode: number;
  readonly errorType: string;

  constructor(message: string, errorType = 'INVALID_INPUT', statusCode = 400) {
    super(message);
    this.name = 'AssistantValidationError';
    this.errorType = errorType;
    this.statusCode = statusCode;
  }
}

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_CONVERSATION_HISTORY = 50;
export const MAX_HYPOTHESES_COUNT = 30;
export const MAX_EVIDENCE_COUNT = 50;
export const MAX_REASSESSMENT_CYCLES = 20;
export const MAX_RECOMMENDED_CHECKS = 50;
export const MAX_TIMELINE_HIGHLIGHTS = 100;
export const MAX_CONTEXT_JSON_BYTES = 80 * 1024; // 80 KB bounded context

const VALID_CONFIDENCE_LEVELS = new Set<ConfidenceLevel>(['low', 'medium', 'high']);
const VALID_REVISED_STATUSES = new Set<RevisedHypothesisStatus>([
  'supported',
  'weakened',
  'unresolved',
  'contradicted',
]);
const VALID_CURRENT_STATUSES = new Set<string>([
  'initial',
  'supported',
  'weakened',
  'unresolved',
  'contradicted',
]);
const VALID_CHECK_OUTCOMES = new Set<string>([
  'passed',
  'failed',
  'inconclusive',
  'unable_to_perform',
  'aborted',
]);
const VALID_ANALYSIS_DEPTHS = new Set<AnalysisDepth>(['basic', 'standard', 'advanced']);

/**
 * Validates a single non-empty bounded string.
 */
function validateString(val: unknown, fieldName: string, maxLen = 2000, required = true): string {
  if (val === undefined || val === null) {
    if (required) {
      throw new AssistantValidationError(`Field "${fieldName}" is required.`);
    }
    return '';
  }
  if (typeof val !== 'string') {
    throw new AssistantValidationError(`Field "${fieldName}" must be a string.`);
  }
  const trimmed = val.trim();
  if (required && trimmed.length === 0) {
    throw new AssistantValidationError(`Field "${fieldName}" cannot be empty.`);
  }
  if (trimmed.length > maxLen) {
    throw new AssistantValidationError(
      `Field "${fieldName}" length (${trimmed.length} chars) exceeds the maximum allowed limit of ${maxLen} characters.`
    );
  }
  return trimmed;
}

/**
 * Validates a confidence enum level strictly.
 */
function validateConfidence(val: unknown, location: string): ConfidenceLevel {
  if (typeof val !== 'string' || !VALID_CONFIDENCE_LEVELS.has(val.toLowerCase() as ConfidenceLevel)) {
    throw new AssistantValidationError(
      `Invalid confidence value "${String(val)}" at ${location}. Must be one of: 'low', 'medium', 'high'.`
    );
  }
  return val.toLowerCase() as ConfidenceLevel;
}

/**
 * Deeply validates nested AssistantInvestigationContext.
 * Preserves backwards compatibility for valid legacy records lacking reassessments or evidence.
 */
export function validateAssistantInvestigationContext(
  rawContext: unknown,
  expectedInvestigationId: string
): AssistantInvestigationContext {
  if (typeof rawContext !== 'object' || rawContext === null || Array.isArray(rawContext)) {
    throw new AssistantValidationError('Field "context" is required and must be an investigation context object.');
  }

  // Check total context JSON size
  try {
    const serialized = JSON.stringify(rawContext);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_CONTEXT_JSON_BYTES) {
      throw new AssistantValidationError(
        `Investigation context payload exceeds the maximum allowed size limit of ${MAX_CONTEXT_JSON_BYTES} bytes.`
      );
    }
  } catch (err) {
    if (err instanceof AssistantValidationError) throw err;
    throw new AssistantValidationError('Failed to inspect investigation context size.');
  }

  const raw = rawContext as Record<string, unknown>;

  // 1. investigationId check
  const investigationId = validateString(raw.investigationId, 'context.investigationId', 100);
  if (investigationId !== expectedInvestigationId) {
    throw new AssistantValidationError(
      `Context investigationId ("${investigationId}") does not match the request investigationId ("${expectedInvestigationId}").`
    );
  }

  // 2. boardName
  const boardName = validateString(raw.boardName, 'context.boardName', 200, false) || 'Untitled Board';

  // 3. technicianSymptoms
  if (typeof raw.technicianSymptoms !== 'object' || raw.technicianSymptoms === null || Array.isArray(raw.technicianSymptoms)) {
    throw new AssistantValidationError('Field "context.technicianSymptoms" is required and must be an object.');
  }
  const rawSymptoms = raw.technicianSymptoms as Record<string, unknown>;
  const technicianSymptoms: AssistantInvestigationContext['technicianSymptoms'] = {
    expectedBehavior: validateString(rawSymptoms.expectedBehavior, 'technicianSymptoms.expectedBehavior', 2000, false),
    observedBehavior: validateString(rawSymptoms.observedBehavior, 'technicianSymptoms.observedBehavior', 2000, false),
    relevantComponents: validateString(rawSymptoms.relevantComponents, 'technicianSymptoms.relevantComponents', 1000, false),
    technicianNotes: rawSymptoms.technicianNotes !== undefined
      ? validateString(rawSymptoms.technicianNotes, 'technicianSymptoms.technicianNotes', 2000, false)
      : undefined,
  };

  // 4. initialDiagnosisR0 (optional for backward compatibility)
  let initialDiagnosisR0: AssistantInvestigationContext['initialDiagnosisR0'] = undefined;
  if (raw.initialDiagnosisR0 !== undefined && raw.initialDiagnosisR0 !== null) {
    if (typeof raw.initialDiagnosisR0 !== 'object' || Array.isArray(raw.initialDiagnosisR0)) {
      throw new AssistantValidationError('Field "context.initialDiagnosisR0" must be an object if provided.');
    }
    const rawR0 = raw.initialDiagnosisR0 as Record<string, unknown>;
    const summary = validateString(rawR0.summary, 'initialDiagnosisR0.summary', 2000, false);

    // visualObservations
    const visualObservations: NonNullable<AssistantInvestigationContext['initialDiagnosisR0']>['visualObservations'] = [];
    if (rawR0.visualObservations !== undefined) {
      if (!Array.isArray(rawR0.visualObservations)) {
        throw new AssistantValidationError('Field "initialDiagnosisR0.visualObservations" must be an array.');
      }
      if (rawR0.visualObservations.length > MAX_EVIDENCE_COUNT) {
        throw new AssistantValidationError(
          `initialDiagnosisR0.visualObservations exceeds maximum limit of ${MAX_EVIDENCE_COUNT} items.`
        );
      }
      for (let i = 0; i < rawR0.visualObservations.length; i++) {
        const obs = rawR0.visualObservations[i];
        if (typeof obs !== 'object' || obs === null || Array.isArray(obs)) {
          throw new AssistantValidationError(`visualObservation at index ${i} must be a valid object.`);
        }
        const rObs = obs as Record<string, unknown>;
        visualObservations.push({
          description: validateString(rObs.description, `visualObservations[${i}].description`, 1000, false),
          evidence: validateString(rObs.evidence, `visualObservations[${i}].evidence`, 1000, false),
          confidence: validateConfidence(rObs.confidence, `visualObservations[${i}].confidence`),
        });
      }
    }

    // initialHypotheses
    const initialHypotheses: NonNullable<AssistantInvestigationContext['initialDiagnosisR0']>['initialHypotheses'] = [];
    if (rawR0.initialHypotheses !== undefined) {
      if (!Array.isArray(rawR0.initialHypotheses)) {
        throw new AssistantValidationError('Field "initialDiagnosisR0.initialHypotheses" must be an array.');
      }
      if (rawR0.initialHypotheses.length > MAX_HYPOTHESES_COUNT) {
        throw new AssistantValidationError(
          `initialDiagnosisR0.initialHypotheses exceeds maximum limit of ${MAX_HYPOTHESES_COUNT} items.`
        );
      }
      for (let i = 0; i < rawR0.initialHypotheses.length; i++) {
        const hyp = rawR0.initialHypotheses[i];
        if (typeof hyp !== 'object' || hyp === null || Array.isArray(hyp)) {
          throw new AssistantValidationError(`initialHypotheses at index ${i} must be a valid object.`);
        }
        const rHyp = hyp as Record<string, unknown>;
        initialHypotheses.push({
          title: validateString(rHyp.title, `initialHypotheses[${i}].title`, 300, true),
          confidence: validateConfidence(rHyp.confidence, `initialHypotheses[${i}].confidence`),
          reasoning: validateString(rHyp.reasoning, `initialHypotheses[${i}].reasoning`, 2000, false),
        });
      }
    }

    initialDiagnosisR0 = {
      summary,
      visualObservations,
      initialHypotheses,
    };
  }

  // 5. reassessmentCycles
  const reassessmentCycles: AssistantInvestigationContext['reassessmentCycles'] = [];
  if (raw.reassessmentCycles !== undefined && raw.reassessmentCycles !== null) {
    if (!Array.isArray(raw.reassessmentCycles)) {
      throw new AssistantValidationError('Field "context.reassessmentCycles" must be an array if provided.');
    }
    if (raw.reassessmentCycles.length > MAX_REASSESSMENT_CYCLES) {
      throw new AssistantValidationError(
        `reassessmentCycles exceeds maximum limit of ${MAX_REASSESSMENT_CYCLES} cycles.`
      );
    }
    for (let c = 0; c < raw.reassessmentCycles.length; c++) {
      const cycle = raw.reassessmentCycles[c];
      if (typeof cycle !== 'object' || cycle === null || Array.isArray(cycle)) {
        throw new AssistantValidationError(`reassessmentCycles at index ${c} must be an object.`);
      }
      const rCycle = cycle as Record<string, unknown>;
      const cycleIndex = typeof rCycle.cycleIndex === 'number' && Number.isInteger(rCycle.cycleIndex)
        ? rCycle.cycleIndex
        : c + 1;
      const summary = validateString(rCycle.summary, `reassessmentCycles[${c}].summary`, 2000, false);

      const revisedHypotheses: AssistantInvestigationContext['reassessmentCycles'][0]['revisedHypotheses'] = [];
      if (Array.isArray(rCycle.revisedHypotheses)) {
        if (rCycle.revisedHypotheses.length > MAX_HYPOTHESES_COUNT) {
          throw new AssistantValidationError(
            `revisedHypotheses at cycle ${cycleIndex} exceeds maximum limit of ${MAX_HYPOTHESES_COUNT} items.`
          );
        }
        for (let h = 0; h < rCycle.revisedHypotheses.length; h++) {
          const rh = rCycle.revisedHypotheses[h];
          if (typeof rh !== 'object' || rh === null || Array.isArray(rh)) {
            throw new AssistantValidationError(`revisedHypotheses at cycle ${cycleIndex}, index ${h} must be an object.`);
          }
          const rRh = rh as Record<string, unknown>;
          const rawStatus = typeof rRh.status === 'string' ? (rRh.status.toLowerCase() as RevisedHypothesisStatus) : '';
          if (!VALID_REVISED_STATUSES.has(rawStatus as RevisedHypothesisStatus)) {
            throw new AssistantValidationError(
              `Invalid status "${String(rRh.status)}" at cycle ${cycleIndex}, hypothesis ${h}. Must be one of: ${Array.from(VALID_REVISED_STATUSES).join(', ')}.`
            );
          }
          revisedHypotheses.push({
            title: validateString(rRh.title, `revisedHypotheses[${h}].title`, 300, true),
            status: rawStatus as RevisedHypothesisStatus,
            confidence: validateConfidence(rRh.confidence, `revisedHypotheses[${h}].confidence`),
            explanationOfChange: validateString(rRh.explanationOfChange, `revisedHypotheses[${h}].explanationOfChange`, 2000, false),
            citingEvidenceIds: Array.isArray(rRh.citingEvidenceIds)
              ? rRh.citingEvidenceIds.filter((id): id is string => typeof id === 'string').slice(0, 50)
              : [],
          });
        }
      }

      reassessmentCycles.push({
        cycleIndex,
        summary,
        revisedHypotheses,
      });
    }
  }

  // 6. currentHypotheses
  const currentHypotheses: AssistantInvestigationContext['currentHypotheses'] = [];
  if (raw.currentHypotheses !== undefined && raw.currentHypotheses !== null) {
    if (!Array.isArray(raw.currentHypotheses)) {
      throw new AssistantValidationError('Field "context.currentHypotheses" must be an array.');
    }
    if (raw.currentHypotheses.length > MAX_HYPOTHESES_COUNT) {
      throw new AssistantValidationError(
        `context.currentHypotheses exceeds maximum limit of ${MAX_HYPOTHESES_COUNT} items.`
      );
    }
    for (let i = 0; i < raw.currentHypotheses.length; i++) {
      const ch = raw.currentHypotheses[i];
      if (typeof ch !== 'object' || ch === null || Array.isArray(ch)) {
        throw new AssistantValidationError(`currentHypotheses at index ${i} must be a valid object.`);
      }
      const rCh = ch as Record<string, unknown>;
      const rawStatus = typeof rCh.status === 'string' ? rCh.status.toLowerCase() : 'unresolved';
      if (!VALID_CURRENT_STATUSES.has(rawStatus)) {
        throw new AssistantValidationError(
          `Invalid hypothesis status "${String(rCh.status)}" at currentHypotheses[${i}]. Must be one of: ${Array.from(VALID_CURRENT_STATUSES).join(', ')}.`
        );
      }
      currentHypotheses.push({
        title: validateString(rCh.title, `currentHypotheses[${i}].title`, 300, true),
        status: rawStatus as 'initial' | RevisedHypothesisStatus,
        confidence: validateConfidence(rCh.confidence, `currentHypotheses[${i}].confidence`),
        reasoning: validateString(rCh.reasoning, `currentHypotheses[${i}].reasoning`, 2000, false),
        isFromReassessment: Boolean(rCh.isFromReassessment),
        cycleIndex: typeof rCh.cycleIndex === 'number' && Number.isInteger(rCh.cycleIndex) ? rCh.cycleIndex : 0,
      });
    }
  }

  // 7. technicianEvidenceLog
  const technicianEvidenceLog: AssistantInvestigationContext['technicianEvidenceLog'] = [];
  if (raw.technicianEvidenceLog !== undefined && raw.technicianEvidenceLog !== null) {
    if (!Array.isArray(raw.technicianEvidenceLog)) {
      throw new AssistantValidationError('Field "context.technicianEvidenceLog" must be an array.');
    }
    if (raw.technicianEvidenceLog.length > MAX_EVIDENCE_COUNT) {
      throw new AssistantValidationError(
        `context.technicianEvidenceLog exceeds maximum limit of ${MAX_EVIDENCE_COUNT} records.`
      );
    }
    for (let i = 0; i < raw.technicianEvidenceLog.length; i++) {
      const ev = raw.technicianEvidenceLog[i];
      if (typeof ev !== 'object' || ev === null || Array.isArray(ev)) {
        throw new AssistantValidationError(`technicianEvidenceLog at index ${i} must be an object.`);
      }
      const rEv = ev as Record<string, unknown>;
      const rawOutcome = typeof rEv.outcome === 'string' ? rEv.outcome.toLowerCase() : '';
      if (!VALID_CHECK_OUTCOMES.has(rawOutcome)) {
        throw new AssistantValidationError(
          `Invalid outcome "${String(rEv.outcome)}" at technicianEvidenceLog[${i}]. Must be one of: ${Array.from(VALID_CHECK_OUTCOMES).join(', ')}.`
        );
      }

      // numericValue validation: MUST be a finite number between -1e9 and 1e9 if provided
      let numericValue: number | undefined = undefined;
      if (rEv.numericValue !== undefined && rEv.numericValue !== null) {
        if (typeof rEv.numericValue !== 'number' || !Number.isFinite(rEv.numericValue)) {
          throw new AssistantValidationError(
            `Field "numericValue" at technicianEvidenceLog[${i}] must be a finite number.`
          );
        }
        if (rEv.numericValue > 1e9 || rEv.numericValue < -1e9) {
          throw new AssistantValidationError(
            `Field "numericValue" at technicianEvidenceLog[${i}] exceeds supported physical measurement bounds (±1e9).`
          );
        }
        numericValue = rEv.numericValue;
      }

      technicianEvidenceLog.push({
        id: validateString(rEv.id, `technicianEvidenceLog[${i}].id`, 100, true),
        stepNumber: typeof rEv.stepNumber === 'number' && Number.isInteger(rEv.stepNumber) ? rEv.stepNumber : i + 1,
        checkTitle: validateString(rEv.checkTitle, `technicianEvidenceLog[${i}].checkTitle`, 300, false),
        outcome: rawOutcome as CheckOutcome,
        numericValue,
        measurementUnit: rEv.measurementUnit !== undefined ? validateString(rEv.measurementUnit, `technicianEvidenceLog[${i}].measurementUnit`, 50, false) : undefined,
        technicianNotes: rEv.technicianNotes !== undefined ? validateString(rEv.technicianNotes, `technicianEvidenceLog[${i}].technicianNotes`, 1000, false) : undefined,
        recordedAt: validateString(rEv.recordedAt, `technicianEvidenceLog[${i}].recordedAt`, 100, false) || new Date().toISOString(),
        cycleIndex: typeof rEv.cycleIndex === 'number' && Number.isInteger(rEv.cycleIndex) ? rEv.cycleIndex : 0,
      });
    }
  }

  // 8. recommendedChecks
  const recommendedChecks: AssistantInvestigationContext['recommendedChecks'] = [];
  if (raw.recommendedChecks !== undefined && raw.recommendedChecks !== null) {
    if (!Array.isArray(raw.recommendedChecks)) {
      throw new AssistantValidationError('Field "context.recommendedChecks" must be an array.');
    }
    if (raw.recommendedChecks.length > MAX_RECOMMENDED_CHECKS) {
      throw new AssistantValidationError(
        `context.recommendedChecks exceeds maximum limit of ${MAX_RECOMMENDED_CHECKS} checks.`
      );
    }
    for (let i = 0; i < raw.recommendedChecks.length; i++) {
      const chk = raw.recommendedChecks[i];
      if (typeof chk !== 'object' || chk === null || Array.isArray(chk)) {
        throw new AssistantValidationError(`recommendedChecks at index ${i} must be an object.`);
      }
      const rChk = chk as Record<string, unknown>;
      recommendedChecks.push({
        id: validateString(rChk.id, `recommendedChecks[${i}].id`, 100, false) || `chk_${i + 1}`,
        stepNumber: typeof rChk.stepNumber === 'number' && Number.isInteger(rChk.stepNumber) ? rChk.stepNumber : i + 1,
        title: validateString(rChk.title, `recommendedChecks[${i}].title`, 300, false),
        testType: validateString(rChk.testType, `recommendedChecks[${i}].testType`, 100, false),
        procedure: validateString(rChk.procedure, `recommendedChecks[${i}].procedure`, 2000, false),
        expectedResult: validateString(rChk.expectedResult, `recommendedChecks[${i}].expectedResult`, 1000, false),
        safetyNotes: Array.isArray(rChk.safetyNotes)
          ? rChk.safetyNotes.filter((s): s is string => typeof s === 'string').slice(0, 20)
          : [],
        cycleIndex: typeof rChk.cycleIndex === 'number' && Number.isInteger(rChk.cycleIndex) ? rChk.cycleIndex : 0,
        isCompleted: Boolean(rChk.isCompleted),
      });
    }
  }

  // 9. timelineHighlights
  const timelineHighlights: AssistantInvestigationContext['timelineHighlights'] = [];
  if (raw.timelineHighlights !== undefined && raw.timelineHighlights !== null) {
    if (!Array.isArray(raw.timelineHighlights)) {
      throw new AssistantValidationError('Field "context.timelineHighlights" must be an array.');
    }
    if (raw.timelineHighlights.length > MAX_TIMELINE_HIGHLIGHTS) {
      throw new AssistantValidationError(
        `context.timelineHighlights exceeds maximum limit of ${MAX_TIMELINE_HIGHLIGHTS} items.`
      );
    }
    for (let i = 0; i < raw.timelineHighlights.length; i++) {
      const item = raw.timelineHighlights[i];
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new AssistantValidationError(`timelineHighlights at index ${i} must be an object.`);
      }
      const rItem = item as Record<string, unknown>;
      timelineHighlights.push({
        timestamp: validateString(rItem.timestamp, `timelineHighlights[${i}].timestamp`, 100, false) || new Date().toISOString(),
        type: validateString(rItem.type, `timelineHighlights[${i}].type`, 100, false),
        summary: validateString(rItem.summary, `timelineHighlights[${i}].summary`, 500, false),
      });
    }
  }

  let analysisDepth: AnalysisDepth | undefined = undefined;
  if (raw.analysisDepth !== undefined && raw.analysisDepth !== null) {
    if (typeof raw.analysisDepth !== 'string' || !VALID_ANALYSIS_DEPTHS.has(raw.analysisDepth as AnalysisDepth)) {
      throw new AssistantValidationError('Field "context.analysisDepth" must be "basic", "standard", or "advanced".');
    }
    analysisDepth = raw.analysisDepth as AnalysisDepth;
  }

  return {
    investigationId,
    boardName,
    technicianSymptoms,
    initialDiagnosisR0,
    reassessmentCycles,
    currentHypotheses,
    technicianEvidenceLog,
    recommendedChecks,
    timelineHighlights,
    analysisDepth,
  };
}

/**
 * Validates the full AssistantChatRequest.
 */
export function validateAssistantRequest(body: unknown): AssistantChatRequest {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new AssistantValidationError('Request body must be a valid JSON object.');
  }

  const raw = body as Record<string, unknown>;

  // 1. investigationId validation
  const investigationId = validateString(raw.investigationId, 'investigationId', 100, true);

  // 2. message validation
  const message = validateString(raw.message, 'message', MAX_MESSAGE_LENGTH, true);

  // 3. Deep context validation
  const context = validateAssistantInvestigationContext(raw.context, investigationId);

  // 4. conversationHistory validation
  const history: AssistantChatRequest['conversationHistory'] = [];
  if (raw.conversationHistory !== undefined) {
    if (!Array.isArray(raw.conversationHistory)) {
      throw new AssistantValidationError('Field "conversationHistory" must be an array if provided.');
    }
    if (raw.conversationHistory.length > MAX_CONVERSATION_HISTORY) {
      throw new AssistantValidationError(
        `Conversation history length (${raw.conversationHistory.length}) exceeds the maximum limit of ${MAX_CONVERSATION_HISTORY}.`
      );
    }

    for (let i = 0; i < raw.conversationHistory.length; i++) {
      const item = raw.conversationHistory[i];
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new AssistantValidationError(`conversationHistory item at index ${i} is not a valid object.`);
      }
      const rec = item as Record<string, unknown>;
      if (typeof rec.id !== 'string' || typeof rec.content !== 'string' || (rec.role !== 'user' && rec.role !== 'assistant')) {
        throw new AssistantValidationError(`conversationHistory item at index ${i} has invalid structure.`);
      }
      history.push({
        id: validateString(rec.id, `conversationHistory[${i}].id`, 100, true),
        role: rec.role,
        content: validateString(rec.content, `conversationHistory[${i}].content`, MAX_MESSAGE_LENGTH, false),
        timestamp: typeof rec.timestamp === 'string' ? rec.timestamp : new Date().toISOString(),
      });
    }
  }

  // 5. mode validation ('live' | 'offline', default 'offline')
  let mode: 'live' | 'offline' = 'offline';
  if (raw.mode !== undefined && raw.mode !== null) {
    if (raw.mode === 'live' || raw.mode === 'offline') {
      mode = raw.mode;
    } else {
      throw new AssistantValidationError('Field "mode" must be "live" or "offline" if provided.');
    }
  }

  return {
    investigationId,
    message,
    context,
    conversationHistory: history,
    mode,
  };
}

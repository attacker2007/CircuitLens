/**
 * CircuitLens Stage 3 — Diagnostic Request and Response Contracts (Client)
 *
 * Defines explicit data contracts for AI-assisted circuit diagnostics.
 * NOTE: TypeScript interfaces represent design-time contracts only and do
 * not perform runtime schema or payload validation.
 */

/** Qualitative confidence rating for observations and hypotheses */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

/** Analysis depth scope level for requested assessment detail */
export type AnalysisDepth = 'basic' | 'standard' | 'advanced';

/** Functional block category for circuit representation */
export type CircuitBlockCategory =
  | 'power_input'
  | 'regulation'
  | 'protection'
  | 'signal_processing'
  | 'control'
  | 'output_load';

/** Connection confidence status distinguishing factual from theoretical links */
export type ConnectionConfidence = 'confirmed' | 'inferred' | 'unknown';

export interface CircuitComponentRole {
  designator: string;
  function: string;
  status: ConnectionConfidence;
}

export interface CircuitBlockNode {
  id: string;
  label: string;
  category: CircuitBlockCategory;
  status: ConnectionConfidence;
  description?: string;
  components?: string[];
}

export interface CircuitBlockConnection {
  from: string;
  to: string;
  signalType: 'power' | 'ground' | 'data' | 'control';
  status: ConnectionConfidence;
  description?: string;
}

export interface CircuitTheoryUnderstanding {
  operatingPrinciple: string;
  relevantComponents: CircuitComponentRole[];
  expectedBehavior: string;
  failureMechanismTheory: string;
  functionalBlocks?: CircuitBlockNode[];
  blockConnections?: CircuitBlockConnection[];
  diagramLimitations?: string;
}

/**
 * Diagnostic intake request payload sent from client to backend.
 *
 * Note: The `image` property is typed as `string`, representing a base64-encoded
 * data URL (e.g., "data:image/jpeg;base64,..."). TypeScript's type system alone does
 * not perform runtime validation; runtime format, MIME type, and size checks must
 * be executed by server-side validation logic prior to processing.
 */
export interface DiagnosisRequest {
  /** Base64 image data URL (e.g., "data:image/jpeg;base64,...") */
  image: string;
  /** Optional identifier, model, or label for the PCB under test */
  boardName?: string;
  /** Required description of the circuit's expected nominal operation */
  expectedBehavior: string;
  /** Required description of observed fault symptoms, measurements, or errors */
  observedBehavior: string;
  /** Optional list or description of specific ICs, passives, or suspect areas */
  relevantComponents?: string;
  /** Optional technician notes, environmental context, or prior rework history */
  additionalNotes?: string;
  /** Optional requested analysis depth ('basic' | 'standard' | 'advanced') */
  analysisDepth?: AnalysisDepth;
}

/**
 * Directly visible physical or optical feature identified on the circuit board.
 * Strictly limited to observable features; distinct from root-cause hypotheses.
 */
export interface VisibleObservation {
  /** Factual description of the visible anomaly or landmark (e.g., discoloration, solder bridge) */
  description: string;
  /** Observable visual evidence supporting this observation (e.g., pin numbers, silkscreen location) */
  evidence: string;
  /** Qualitative confidence in the visual identification based on clarity and lighting */
  confidence: ConfidenceLevel;
}

/**
 * Inferred root-cause candidate or failure mechanism explaining observed behavior.
 * Distinct from direct visual observations; represents an evidence-supported deduction.
 */
export interface FaultHypothesis {
  /** Concise name or title of the hypothesized fault (e.g., "Short circuit on 3.3V rail") */
  title: string;
  /** Technical rationale connecting visible observations and reported symptoms to this fault */
  reasoning: string;
  /** Specific visible clues, symptoms, or circuit characteristics supporting this hypothesis */
  supportingEvidence: string[];
  /** Qualitative confidence level in this hypothesis */
  confidence: ConfidenceLevel;
  /** Concrete action or measurement needed to prove or disprove this hypothesis */
  suggestedVerification: string;
}

/**
 * Safe, prioritized troubleshooting step or measurement procedure.
 */
export interface RecommendedCheck {
  /** 1-based sequential step order (prioritizing non-destructive, unpowered tests first) */
  stepNumber: number;
  /** Clear action summary (e.g., "Cold Resistance Check on VCC to GND") */
  title: string;
  /** Classification of test (e.g., "Visual Inspection", "Unpowered Resistance", "Voltage Probe") */
  testType: string;
  /** Equipment or instruments required (e.g., ["Digital Multimeter", "Magnifier"]) */
  toolsNeeded: string[];
  /** Step-by-step procedure to execute the check safely */
  procedure: string;
  /** Expected nominal reading or outcome if the circuit is healthy */
  expectedResult: string;
  /** Explicit safety warnings, precautions, or conditions before probing */
  safetyNotes: string[];
}

export type TelemetryUsageStatus = 'reported' | 'partial' | 'unavailable';
export type DiagnosticRequestType = 'diagnosis' | 'reassessment';

/**
 * Non-sensitive operational and usage telemetry captured from the model provider.
 */
export interface ModelCompletionMetadata {
  /** Operational request type (diagnosis or reassessment) */
  requestType?: DiagnosticRequestType;
  /** AI provider identifier (e.g. 'baseten', 'meta') */
  provider?: string;
  /** Concrete model identifier dispatched (e.g. 'meta-models/muse-spark-open-1026') */
  model?: string;
  /** Number of tokens evaluated in the prompt (if provided by model gateway) */
  promptTokens?: number;
  inputTokens?: number;
  /** Number of tokens generated in the completion (if provided by model gateway) */
  completionTokens?: number;
  outputTokens?: number;
  /** Total tokens processed (if provided by model gateway) */
  totalTokens?: number;
  /** Reason given by the model provider for terminating generation (e.g. 'stop', 'length') */
  finishReason?: string;
  /** Round-trip inference duration in milliseconds */
  durationMs: number;
  /** Complete estimated request cost in USD based on published token pricing table (undefined if partial, unavailable, or unknown) */
  estimatedCostUsd?: number;
  /** Partial subtotal cost in USD (defined if and only if partial token usage is reported) */
  partialCostUsd?: number;
  /** Usage availability status: 'reported' (full), 'partial', or 'unavailable' */
  usageStatus?: TelemetryUsageStatus;
}

/**
 * Complete structured AI diagnostic report for a circuit investigation.
 */
export interface DiagnosisResponse {
  /** High-level executive summary of diagnostic findings and primary suspect areas */
  summary: string;
  /** Optical/physical findings directly visible in the image, clearly separated from inferences */
  visibleObservations: VisibleObservation[];
  /** Deductive fault hypotheses, each with supporting evidence and qualitative confidence */
  hypotheses: FaultHypothesis[];
  /** Safe, prioritized troubleshooting checks ordered from unpowered to powered tests */
  recommendedChecks: RecommendedCheck[];
  /** Assessment constraints, occluded areas, or missing electrical parameters */
  limitations: string[];
  /** Essential precautions regarding hazardous voltages, static discharge, and power sequencing */
  safetyWarnings: string[];
  /** Optional circuit theory and functional block understanding */
  circuitUnderstanding?: CircuitTheoryUnderstanding;
  /** Optional analysis depth used for this assessment */
  analysisDepth?: AnalysisDepth;
  /** Optional non-sensitive execution and token usage metadata */
  metadata?: ModelCompletionMetadata;
  /** Execution provenance: 'live_provider' | 'offline_fixture' */
  provenance?: 'live_provider' | 'offline_fixture';
  /** Whether this assessment originated from deterministic offline mock replay */
  isOfflineMock?: boolean;
  /** Explicit execution mode ('live' | 'mock_demo') */
  executionMode?: 'live' | 'mock_demo';
}

/**
 * CircuitLens Stage 4 — Reassessment Request and Response Contracts (Client)
 *
 * Extends the diagnostic contracts to support iterative, evidence-driven
 * circuit troubleshooting without re-sending raw image payloads.
 */

/**
 * Categorical result recorded by the user after performing a diagnostic check.
 */
export type CheckOutcome = 'passed' | 'failed' | 'inconclusive' | 'unable_to_perform';

/**
 * Cautious qualitative status assigned to a fault hypothesis after evaluating recorded evidence.
 * NOTE: Hypotheses are never marked "confirmed" solely based on bench checks;
 * physical verification remains with the human technician.
 */
export type RevisedHypothesisStatus = 'supported' | 'weakened' | 'unresolved' | 'contradicted';

/**
 * Single evidence record logged by the user referencing a recommended check.
 *
 * RECOMMENDATION IDENTITY & PROVENANCE NOTE:
 * RecommendedCheck maintains its existing contract (stepNumber, title).
 * targetRecommendationId is a unique stable ID assigned when a recommendation
 * enters the investigation state (e.g. "rec-c0-s1-..."). cycleIndex, stepNumber,
 * and checkTitle are preserved as separate metadata so historical attempts
 * and subsequent recommendation cycles remain distinguishable.
 */
export interface InvestigationRecommendation {
  /** Stable runtime identifier for this recommendation within the active investigation */
  targetRecommendationId: string;
  /** Recommendation round (0 for initial diagnosis) */
  cycleIndex: number;
  /** 1-based step order */
  stepNumber: number;
  /** Underlying diagnostic check details */
  check: RecommendedCheck;
}

export interface EvidenceRecord {
  /** Unique evidence record identifier (e.g. "ev-1730000000-xyz") */
  id: string;
  /** Identifier of the exact recommendation being tested */
  targetRecommendationId: string;
  /** Non-negative integer identifying the recommendation round (0 for initial diagnosis) */
  cycleIndex: number;
  /** 1-based step number from original recommendation */
  stepNumber: number;
  /** Human-readable title of the check performed */
  checkTitle: string;
  /** Categorical test outcome */
  outcome: CheckOutcome;
  /** Optional finite numeric measurement (must be accompanied by measurementUnit if provided) */
  numericValue?: number;
  /** Optional unit string (must be accompanied by numericValue if provided; max 20 chars) */
  measurementUnit?: string;
  /** Optional technician explanatory observation (max 500 chars) */
  technicianNotes?: string;
  /** ISO 8601 recording timestamp */
  recordedAt: string;
  /** Optional reference to a previous evidence record superseded by this attempt */
  supersedesEvidenceId?: string;
  /** Optional reference to a later evidence record that supersedes this record */
  supersededByEvidenceId?: string;
}

/**
 * Original intake fields and initial findings preserved for reassessment reasoning.
 * Does not include raw image data.
 */
export interface DiagnosticContextPayload {
  /** Optional identifier, model, or label for the PCB under test */
  boardName?: string;
  /** Required description of the circuit's expected nominal operation */
  expectedBehavior: string;
  /** Required description of observed fault symptoms, measurements, or errors */
  observedBehavior: string;
  /** Optional list or description of specific ICs, passives, or suspect areas */
  relevantComponents?: string;
  /** Optional technician notes, environmental context, or prior rework history */
  additionalNotes?: string;
  /** Initial executive summary from Stage 3 diagnosis */
  initialSummary: string;
  /** Visual observations from initial diagnosis (labeled as previously reported findings) */
  visibleObservations: VisibleObservation[];
  /** Fault hypotheses from initial diagnosis */
  initialHypotheses: FaultHypothesis[];
}

/**
 * Diagnostic reassessment request payload sent from client to backend.
 */
export interface DiagnosisReassessmentRequest {
  /** Preserved intake context and initial findings */
  diagnosticContext: DiagnosticContextPayload;
  /** Accumulated evidence records (1 to 20 items) */
  evidence: EvidenceRecord[];
  /** Optional technician commentary or environmental update (max 1000 chars) */
  additionalTechnicianNotes?: string;
  /** Optional requested analysis depth ('basic' | 'standard' | 'advanced') */
  analysisDepth?: AnalysisDepth;
}

/**
 * Revised fault hypothesis with evaluated status, confidence, and change explanation.
 */
export interface RevisedFaultHypothesis {
  /** Hypothesis title matching or refining the original hypothesis */
  title: string;
  /** Evaluated status based on accumulated evidence */
  status: RevisedHypothesisStatus;
  /** Qualitative confidence rating ('low' | 'medium' | 'high') */
  confidence: ConfidenceLevel;
  /** Technical rationale explaining why status or confidence shifted */
  explanationOfChange: string;
  /** IDs of evidence records that directly influenced this revision */
  citingEvidenceIds: string[];
  /** Next concrete action or measurement needed if hypothesis remains unresolved */
  suggestedVerification?: string;
}

/**
 * Complete structured AI diagnostic reassessment report.
 */
export interface DiagnosisReassessmentResponse {
  /** High-level executive summary of the reassessment */
  summary: string;
  /** Synthesis explaining what changed and why based on test evidence */
  evidenceSynthesis: string;
  /** Revised fault hypotheses with updated statuses and confidence */
  revisedHypotheses: RevisedFaultHypothesis[];
  /** Next prioritized troubleshooting checks */
  nextRecommendedChecks: RecommendedCheck[];
  /** Essential electrical precautions for upcoming checks */
  safetyWarnings: string[];
  /** Assessment constraints, unverified areas, or remaining uncertainties */
  limitations: string[];
  /** Optional updated circuit theory or block diagram insight */
  circuitUnderstanding?: CircuitTheoryUnderstanding;
  /** Optional analysis depth used for this assessment */
  analysisDepth?: AnalysisDepth;
  /** Optional non-sensitive execution and token usage metadata */
  metadata?: ModelCompletionMetadata;
  /** Execution provenance: 'live_provider' | 'offline_fixture' */
  provenance?: 'live_provider' | 'offline_fixture';
  /** Whether this assessment originated from deterministic offline mock replay */
  isOfflineMock?: boolean;
  /** Explicit execution mode ('live' | 'mock_demo') */
  executionMode?: 'live' | 'mock_demo';
}

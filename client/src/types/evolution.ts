/**
 * CircuitLens Stage 6B-4B-3 — Hypothesis Evolution & Evidence Timeline Types
 *
 * Formal data contracts for multi-round hypothesis tracking, confidence progression,
 * and unified chronological diagnostic provenance.
 */

import type {
  ConfidenceLevel,
  RevisedHypothesisStatus,
  CheckOutcome,
} from './diagnosis.ts';

/**
 * Directional shift in model confidence across assessment cycles.
 */
export type ConfidenceDelta = 'increased' | 'decreased' | 'unchanged' | 'initial';

/**
 * Reassessment status of a hypothesis in a specific round, including absent/omitted states.
 */
export type RoundHypothesisStatus =
  | RevisedHypothesisStatus
  | 'not_present' // Introduced in a later round
  | 'omitted';     // Not evaluated or omitted by the model in this round

/**
 * Diagnostic match category distinguishing heuristic title-matched tracks from round-isolated ambiguous findings.
 * Explicitly acknowledges title equality as a tracking heuristic, not verified physical or semantic identity.
 */
export type HypothesisMatchKind =
  | 'title_matched_heuristic' // Title-matched heuristic continuity across rounds (not verified physical identity)
  | 'new_hypothesis'          // Unique hypothesis introduced in round >= 1
  | 'omitted_hypothesis'      // Unique hypothesis that was omitted in later round(s)
  | 'ambiguous_candidate'     // Candidate in a round-specific ambiguous group
  | 'reappearing_candidate';  // Candidate reappearing after an omission gap with uncertain identity

/**
 * Assessment record for a specific hypothesis in a single round.
 */
export interface RoundAssessmentRecord {
  roundNumber: number; // 0 = Initial diagnosis, 1 = Reassessment R1, etc.
  status: RoundHypothesisStatus;
  confidence: ConfidenceLevel | null;
  confidenceDelta: ConfidenceDelta | null;
  explanation: string | null;
  citingEvidenceIds: string[];
  supportingEvidenceIds: string[];
  contradictoryEvidenceIds: string[];
  /** Flag indicating ambiguous correspondence (e.g. duplicate identical titles or altered defect reasoning) */
  isAmbiguous?: boolean;
  /** Disambiguation occurrence index (0-based or 1-based), or null if unique */
  disambiguationIndex?: number | null;
}

/**
 * Complete multi-round tracking row for a single hypothesis candidate.
 */
export interface EvolutionHypothesisRow {
  /** Canonical tracking key (lowercase normalized title, with optional deterministic occurrence suffix) */
  trackingKey: string;
  /** Display title preserved from original record */
  displayTitle: string;
  /** Initial reasoning if present in round 0 */
  initialReasoning: string | null;
  /** Initial confidence rating if present in round 0 */
  initialConfidence: ConfidenceLevel | null;
  /** Round number in which this hypothesis was first introduced (0 = initial) */
  introducedInRound: number;
  /** Map of round number -> assessment details in that round */
  roundAssessments: Record<number, RoundAssessmentRecord>;
  /** Most recent evaluated status */
  currentStatus: RoundHypothesisStatus;
  /** Most recent evaluated confidence */
  currentConfidence: ConfidenceLevel | null;
  /** Overall confidence delta from introduction to current */
  overallConfidenceDelta: ConfidenceDelta | null;
  /** Consolidated list of all evidence cited in connection with this hypothesis */
  allCitingEvidenceIds: string[];
  /** Epistemic guardrail: strictly false */
  isConfirmedPhysicalFault: false;
  /** Flag indicating ambiguous correspondence (e.g. duplicate identical titles or ambiguous identity) */
  isAmbiguous?: boolean;
  /** Disambiguation occurrence index (1-based), or null if unique */
  disambiguationIndex?: number | null;
  /** Diagnostic match classification */
  matchKind?: HypothesisMatchKind;
  /** Diagnostic round for round-isolated ambiguous candidates */
  isolatedRoundNumber?: number | null;
  /** Group/cluster identifier for related ambiguous candidates sharing title */
  ambiguousGroupId?: string | null;
  /** Reappearance flag when a hypothesis appears following an omission gap */
  isReappearance?: boolean;
}

/**
 * Round-specific candidate within an ambiguous cluster.
 */
export interface AmbiguousHypothesisCandidate {
  candidateId: string;
  roundNumber: number;
  occurrenceIndex: number;
  title: string;
  status: RoundHypothesisStatus;
  confidence: ConfidenceLevel | null;
  explanation: string | null;
  citingEvidenceIds: string[];
  supportingEvidenceIds: string[];
  contradictoryEvidenceIds: string[];
}

/**
 * Clustered container of ambiguous candidates sharing a title in a specific round.
 */
export interface AmbiguousHypothesisGroup {
  groupId: string;
  roundNumber: number;
  baseTitle: string;
  candidates: AmbiguousHypothesisCandidate[];
}

/**
 * Event categories in the unified evidence and diagnostic timeline.
 */
export type TimelineEventType =
  | 'initial_diagnosis'
  | 'evidence_submitted'
  | 'evidence_superseded'
  | 'reassessment_completed'
  | 'hypothesis_status_changed';

/**
 * Provenance source origin for a timeline milestone.
 */
export type TimelineEventSource = 'ai' | 'technician' | 'system';

/**
 * Individual chronological milestone in the diagnostic investigation.
 */
export interface TimelineEvent {
  id: string;
  eventType: TimelineEventType;
  source: TimelineEventSource;
  cycleIndex: number;
  /** ISO 8601 timestamp string or null if unavailable */
  timestamp: string | null;
  title: string;
  subtitle?: string;
  summary?: string;
  evidenceDetails?: {
    evidenceId: string;
    checkTitle: string;
    stepNumber: number;
    outcome: CheckOutcome;
    numericValue: number | null;
    measurementUnit: string | null;
    isSuperseded: boolean;
    supersedesEvidenceId?: string | null;
    supersededByEvidenceId?: string | null;
    technicianNotes?: string | null;
  };
  hypothesisChanges?: Array<{
    hypothesisTitle: string;
    previousStatus: RoundHypothesisStatus;
    newStatus: RoundHypothesisStatus;
    previousConfidence?: ConfidenceLevel | null;
    newConfidence?: ConfidenceLevel | null;
  }>;
  safetyWarnings?: string[];
}

/**
 * High-level consolidated diagnostic status summary for the current assessment panel.
 */
export interface CurrentDiagnosticSummary {
  supportedHypotheses: EvolutionHypothesisRow[];
  contradictedHypotheses: EvolutionHypothesisRow[];
  unresolvedHypotheses: EvolutionHypothesisRow[];
  strongestSupportingEvidence: Array<{
    evidenceId: string;
    checkTitle: string;
    measurementFormatted: string;
    outcome: CheckOutcome;
    citesHypotheses: string[];
  }>;
  importantContradictoryEvidence: Array<{
    evidenceId: string;
    checkTitle: string;
    measurementFormatted: string;
    outcome: CheckOutcome;
    citesHypotheses: string[];
  }>;
  outstandingChecks: Array<{
    stepNumber: number;
    title: string;
    procedure: string;
    expectedResult: string;
  }>;
  safetyWarnings: string[];
  totalCyclesCompleted: number;
}

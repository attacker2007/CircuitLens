/**
 * CircuitLens Stage 6B-4B-2 — Diagnostic Report Types
 *
 * Defines the normalized data model and provenance contracts for
 * Print/PDF, JSON, and Markdown export.
 */

import type {
  ConfidenceLevel,
  RevisedHypothesisStatus,
  ModelCompletionMetadata,
} from './diagnosis';
import type { RoundHypothesisStatus, HypothesisMatchKind } from './evolution';

export type ReportProvenanceOrigin = 'AI_GENERATED' | 'TECHNICIAN_SUBMITTED' | 'SYSTEM_METADATA';

export interface ReportDeviceContext {
  boardName: string | null;
  expectedBehavior: string | null;
  observedBehavior: string | null;
  relevantComponents: string | null;
  additionalNotes: string | null;
}

export interface ReportImageMetadata {
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  mimeType: string | null;
  /** Transient browser blob URL; populated for in-memory and print views, excluded from serialized JSON */
  previewUrl: string | null;
}

export interface ReportObservation {
  index: number;
  description: string;
  evidence: string;
  confidence: ConfidenceLevel;
  origin: 'AI_GENERATED';
}

export interface ReportHypothesis {
  index: number;
  title: string;
  reasoning: string;
  supportingEvidence: string[];
  initialConfidence: ConfidenceLevel;
  suggestedVerification: string | null;
  origin: 'AI_GENERATED';
}

export interface ReportCheck {
  cycleIndex: number;
  stepNumber: number;
  title: string;
  testType: string;
  toolsNeeded: string[];
  procedure: string;
  expectedResult: string;
  safetyNotes: string[];
  origin: 'AI_GENERATED';
}

export interface ReportEvidenceRecord {
  id: string;
  cycleIndex: number;
  stepNumber: number;
  checkTitle: string;
  outcome: 'passed' | 'failed' | 'inconclusive' | 'unable_to_perform' | 'pass' | 'fail';
  numericValue: number | null;
  measurementUnit: string | null;
  technicianNotes: string | null;
  recordedAt: string;
  supersedesEvidenceId: string | null;
  supersededByEvidenceId?: string | null;
  isSuperseded: boolean;
  origin: 'TECHNICIAN_SUBMITTED';
}

export interface ReportRevisedHypothesis {
  title: string;
  status: RevisedHypothesisStatus;
  confidence: ConfidenceLevel;
  explanationOfChange: string;
  citingEvidenceIds: string[];
  suggestedVerification: string | null;
  origin: 'AI_GENERATED';
}

export interface ReportReassessmentRound {
  cycleNumber: number;
  summary: string;
  evidenceSynthesis: string;
  revisedHypotheses: ReportRevisedHypothesis[];
  nextRecommendedChecks: ReportCheck[];
  safetyWarnings: string[];
  limitations: string[];
  telemetry: ModelCompletionMetadata | null;
  origin: 'AI_GENERATED';
}

export interface ReportHypothesisEvolutionItem {
  hypothesisTitle: string;
  initialConfidence: ConfidenceLevel | null;
  initialReasoning?: string | null;
  introducedInRound?: number;
  revisions: Array<{
    cycleNumber: number;
    status: RoundHypothesisStatus;
    confidence: ConfidenceLevel | null;
    citingEvidenceIds: string[];
    isAmbiguous?: boolean;
  }>;
  currentStatus: RoundHypothesisStatus;
  currentConfidence: ConfidenceLevel | null;
  /** Epistemic guardrail: always false. AI hypotheses are never confirmed faults without physical isolation */
  isConfirmedPhysicalFault: false;
  isAmbiguous?: boolean;
  matchKind?: HypothesisMatchKind;
  isolatedRoundNumber?: number | null;
  ambiguousGroupId?: string | null;
  isReappearance?: boolean;
}

export interface DiagnosticReport {
  schemaVersion: '1.1.0';
  reportId: string;
  investigationId: string;
  generatedAt: string; // ISO 8601
  system: {
    application: 'CircuitLens';
    version: '0.1.0';
    schemaVersion?: '1.1.0';
    epistemicDisclaimer: string;
    origin: 'SYSTEM_METADATA';
  };
  device: ReportDeviceContext;
  image: ReportImageMetadata | null;
  initialDiagnosis: {
    summary: string;
    visibleObservations: ReportObservation[];
    hypotheses: ReportHypothesis[];
    recommendedChecks: ReportCheck[];
    safetyWarnings: string[];
    limitations: string[];
    telemetry: ModelCompletionMetadata | null;
    origin: 'AI_GENERATED';
  };
  technicianEvidence: ReportEvidenceRecord[];
  reassessmentHistory: ReportReassessmentRound[];
  hypothesisEvolution: ReportHypothesisEvolutionItem[];
  safetyWarningsConsolidated: string[];
  limitationsConsolidated: string[];
  telemetrySummary: {
    totalDurationMs: number;
    totalInputTokens?: number | null;
    totalOutputTokens?: number | null;
    totalTokens?: number | null;
    totalEstimatedCostUsd: number | null;
    totalPartialCostUsd: number | null;
    cyclesLogged: number;
    origin: 'SYSTEM_METADATA';
  };
}

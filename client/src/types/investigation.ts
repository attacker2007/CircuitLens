/**
 * CircuitLens Stage 6C-2C — Local-First Investigation Data Model
 *
 * Defines the core investigation entity, persistence contracts,
 * summary projections, and lifecycle statuses for local-first storage.
 */

import type { IntakeFormValues } from './intake.ts';
import type { DiagnosisResponse, DiagnosisReassessmentResponse, EvidenceRecord, AnalysisDepth } from './diagnosis.ts';
import type { AssistantMessage } from './assistant.ts';

export type InvestigationStatus =
  | 'new'
  | 'under_investigation'
  | 'awaiting_evidence'
  | 'assessment_updated'
  | 'resolved';

export interface ImageMetadata {
  name: string;
  sizeBytes: number;
  type: string;
  lastModified?: number;
}

export interface InvestigationRecord {
  /** Unique investigation identifier (e.g., "inv_1793619552537_abc") */
  id: string;

  /** User-editable investigation title, defaults to boardName or formatted title */
  title: string;

  /** ISO 8601 creation timestamp */
  createdAt: string;

  /** ISO 8601 last-modified timestamp */
  updatedAt: string;

  /** Current diagnostic investigation lifecycle status */
  status: InvestigationStatus;

  /** Whether the investigation has been archived */
  isArchived: boolean;

  /** Stored image Blob (null if intake image has not yet been selected) */
  imageBlob: Blob | null;

  /** Metadata for the uploaded image */
  imageMetadata: ImageMetadata | null;

  /** Intake form values (boardName, expectedBehavior, observedBehavior, etc.) */
  formData: IntakeFormValues;

  /** Whether the intake profile was staged for analysis */
  isStaged: boolean;

  /** Initial AI diagnosis response (null before first diagnosis) */
  diagnosis: DiagnosisResponse | null;

  /** Technician-recorded physical bench evidence ledger */
  evidenceLog: EvidenceRecord[];

  /** History of subsequent reassessment cycles */
  reassessments: DiagnosisReassessmentResponse[];

  /** Current reassessment cycle number (0 for initial R0) */
  reassessmentCycle: number;

  /** Active diagnostic workbench perspective */
  activePerspective: 'overview' | 'matrix' | 'timeline' | 'report' | 'theory';

  /** Selected or applied analysis depth scope ('basic' | 'standard' | 'advanced') */
  analysisDepth?: AnalysisDepth;

  /** Preserved optical inspection zoom factor */
  inspectorZoom: number;

  /** Preserved optical inspection pan offsets */
  inspectorPan: { x: number; y: number };

  /** CircuitLens Schema version for export compatibility */
  schemaVersion: '1.1.0';

  /** Optional technician work notes */
  technicianNotes?: string;

  /** Stage 6C-3A: Contextual investigation assistant conversation history */
  assistantMessages?: AssistantMessage[];
}

export interface InvestigationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: InvestigationStatus;
  isArchived: boolean;
  boardName: string;
  hasImage: boolean;
  hasDiagnosis: boolean;
  evidenceCount: number;
  reassessmentCount: number;
  assistantMessageCount?: number;
  imageThumbnailUrl?: string;
}

/**
 * Derives the legitimate investigation status based on actual evidence and state.
 * Never automatically marks an investigation as 'resolved' based on AI output.
 */
export function computeLegitimateStatus(
  currentStatus: InvestigationStatus | undefined,
  diagnosis: DiagnosisResponse | null,
  evidenceLog: EvidenceRecord[],
  reassessments: DiagnosisReassessmentResponse[]
): InvestigationStatus {
  // If technician explicitly marked resolved, preserve it
  if (currentStatus === 'resolved') {
    return 'resolved';
  }

  // If reassessments have occurred
  if (reassessments && reassessments.length > 0) {
    return 'assessment_updated';
  }

  // If diagnosis has completed
  if (diagnosis) {
    if (evidenceLog.length === 0) {
      return 'awaiting_evidence';
    }
    return 'under_investigation';
  }

  return 'new';
}

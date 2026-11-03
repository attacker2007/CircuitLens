/**
 * CircuitLens Stage 6C-3A — Contextual Investigation Assistant Data Contracts
 *
 * Defines message entities, structured investigation context payloads,
 * assistant request/response contracts, and suggested action schemas.
 */

import type { ConfidenceLevel, RevisedHypothesisStatus, CheckOutcome } from './diagnosis.ts';

export type AssistantMessageRole = 'user' | 'assistant';
export type AssistantMessageStatus = 'sending' | 'sent' | 'error';
export type AssistantResponseProvenance = 'offline_preview' | 'live_provider';

export interface AssistantSuggestedAction {
  id: string;
  type: 'inspect_observation' | 'view_hypothesis' | 'highlight_component' | 'suggest_check';
  label: string;
  targetId?: string;
  payload?: Record<string, unknown>;
}

export interface AssistantMessage {
  id: string;
  investigationId: string;
  role: AssistantMessageRole;
  content: string;
  timestamp: string; // ISO 8601
  status?: AssistantMessageStatus;
  isOfflinePreview?: boolean;
  provenance?: AssistantResponseProvenance;
  providerName?: string;
  isPersisted?: boolean;
  suggestedActions?: AssistantSuggestedAction[];
  error?: string;
}

export interface AssistantInvestigationContext {
  investigationId: string;
  boardName: string;
  technicianSymptoms: {
    expectedBehavior: string;
    observedBehavior: string;
    relevantComponents: string;
    technicianNotes?: string;
  };
  initialDiagnosisR0?: {
    summary: string;
    visualObservations: Array<{
      description: string;
      evidence: string;
      confidence: ConfidenceLevel;
    }>;
    initialHypotheses: Array<{
      title: string;
      confidence: ConfidenceLevel;
      reasoning: string;
    }>;
  };
  reassessmentCycles: Array<{
    cycleIndex: number;
    summary: string;
    revisedHypotheses: Array<{
      title: string;
      status: RevisedHypothesisStatus;
      confidence: ConfidenceLevel;
      explanationOfChange: string;
      citingEvidenceIds: string[];
    }>;
  }>;
  currentHypotheses: Array<{
    title: string;
    status: 'initial' | RevisedHypothesisStatus;
    confidence: ConfidenceLevel;
    reasoning: string;
    isFromReassessment: boolean;
    cycleIndex: number;
  }>;
  technicianEvidenceLog: Array<{
    id: string;
    stepNumber: number;
    checkTitle: string;
    outcome: CheckOutcome;
    numericValue?: number;
    measurementUnit?: string;
    technicianNotes?: string;
    recordedAt: string;
    cycleIndex: number;
  }>;
  recommendedChecks: Array<{
    id: string;
    stepNumber: number;
    title: string;
    testType: string;
    procedure: string;
    expectedResult: string;
    safetyNotes: string[];
    cycleIndex: number;
    isCompleted: boolean;
  }>;
  timelineHighlights: Array<{
    timestamp: string;
    type: string;
    summary: string;
  }>;
}

export interface AssistantChatRequest {
  investigationId: string;
  message: string;
  context: AssistantInvestigationContext;
  conversationHistory: Array<Pick<AssistantMessage, 'id' | 'role' | 'content' | 'timestamp'>>;
}

export interface AssistantChatResponse {
  success: boolean;
  message: AssistantMessage;
  warning?: string;
}

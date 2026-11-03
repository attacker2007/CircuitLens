/**
 * CircuitLens Stage 6C-3A — Contextual Investigation Assistant Context Builder
 *
 * Constructs a bounded, structured, investigation-scoped context payload for the assistant.
 * Strictly separates technician bench measurements from AI visual observations.
 * Omits heavy image Blobs, secrets, and duplicate payloads.
 */

import type { InvestigationRecord } from '../types/investigation.ts';
import type { AssistantInvestigationContext } from '../types/assistant.ts';

/**
 * Builds a sanitized, bounded investigation context payload from an InvestigationRecord.
 * Backward-compatible with older records missing subsequent cycles or conversation history.
 */
export function buildAssistantInvestigationContext(
  record: InvestigationRecord
): AssistantInvestigationContext {
  const diagnosis = record.diagnosis;
  const reassessments = record.reassessments || [];
  const evidenceLog = record.evidenceLog || [];

  // 1. Initial Diagnosis R0 extraction
  const initialDiagnosisR0 = diagnosis
    ? {
        summary: diagnosis.summary || '',
        visualObservations: (diagnosis.visibleObservations || []).map((obs) => ({
          description: obs.description || '',
          evidence: obs.evidence || '',
          confidence: obs.confidence || 'medium',
        })),
        initialHypotheses: (diagnosis.hypotheses || []).map((h) => ({
          title: h.title || '',
          confidence: h.confidence || 'medium',
          reasoning: h.reasoning || '',
        })),
      }
    : undefined;

  // 2. Reassessment cycles extraction
  const reassessmentCycles = reassessments.map((r, idx) => ({
    cycleIndex: idx + 1,
    summary: r.summary || '',
    revisedHypotheses: (r.revisedHypotheses || []).map((rh) => ({
      title: rh.title || '',
      status: rh.status || 'unresolved',
      confidence: rh.confidence || 'medium',
      explanationOfChange: rh.explanationOfChange || '',
      citingEvidenceIds: Array.isArray(rh.citingEvidenceIds) ? rh.citingEvidenceIds : [],
    })),
  }));

  // 3. Derive current active hypotheses
  const currentHypotheses: AssistantInvestigationContext['currentHypotheses'] = [];
  if (reassessmentCycles.length > 0) {
    const latestRound = reassessmentCycles[reassessmentCycles.length - 1];
    for (const rh of latestRound.revisedHypotheses) {
      currentHypotheses.push({
        title: rh.title,
        status: rh.status,
        confidence: rh.confidence,
        reasoning: rh.explanationOfChange,
        isFromReassessment: true,
        cycleIndex: latestRound.cycleIndex,
      });
    }
  } else if (initialDiagnosisR0) {
    for (const ih of initialDiagnosisR0.initialHypotheses) {
      currentHypotheses.push({
        title: ih.title,
        status: 'initial',
        confidence: ih.confidence,
        reasoning: ih.reasoning,
        isFromReassessment: false,
        cycleIndex: 0,
      });
    }
  }

  // 4. Technician bench evidence log (strictly labeled as empirical measurements)
  const technicianEvidenceLog: AssistantInvestigationContext['technicianEvidenceLog'] = evidenceLog.map((ev) => ({
    id: ev.id,
    stepNumber: ev.stepNumber,
    checkTitle: ev.checkTitle,
    outcome: ev.outcome,
    numericValue: ev.numericValue,
    measurementUnit: ev.measurementUnit,
    technicianNotes: ev.technicianNotes,
    recordedAt: ev.recordedAt,
    cycleIndex: ev.cycleIndex ?? 0,
  }));

  // 5. Recommended checks and completion status
  const completedCheckIds = new Set(
    evidenceLog
      .map((ev) => ev.targetRecommendationId)
      .filter((id): id is string => Boolean(id))
  );

  const recommendedChecks: AssistantInvestigationContext['recommendedChecks'] = [];
  if (diagnosis?.recommendedChecks) {
    diagnosis.recommendedChecks.forEach((chk, idx) => {
      const stepNum = chk.stepNumber ?? idx + 1;
      const checkId = `chk_r0_${stepNum}`;
      recommendedChecks.push({
        id: checkId,
        stepNumber: stepNum,
        title: chk.title,
        testType: chk.testType,
        procedure: chk.procedure,
        expectedResult: chk.expectedResult,
        safetyNotes: chk.safetyNotes || [],
        cycleIndex: 0,
        isCompleted: completedCheckIds.has(checkId) || evidenceLog.some((e) => e.targetRecommendationId?.includes(`step_${stepNum}`) || e.stepNumber === stepNum),
      });
    });
  }

  // Also include latest reassessment nextRecommendedChecks if any
  if (reassessments.length > 0) {
    const latestReassessment = reassessments[reassessments.length - 1];
    if (latestReassessment.nextRecommendedChecks) {
      const cycleIdx = reassessments.length;
      latestReassessment.nextRecommendedChecks.forEach((chk, idx) => {
        const stepNum = chk.stepNumber ?? idx + 1;
        const checkId = `chk_r${cycleIdx}_${stepNum}`;
        recommendedChecks.push({
          id: checkId,
          stepNumber: stepNum,
          title: chk.title,
          testType: chk.testType,
          procedure: chk.procedure,
          expectedResult: chk.expectedResult,
          safetyNotes: chk.safetyNotes || [],
          cycleIndex: cycleIdx,
          isCompleted: completedCheckIds.has(checkId),
        });
      });
    }
  }

  // 6. Timeline highlights
  const timelineHighlights: AssistantInvestigationContext['timelineHighlights'] = [];
  timelineHighlights.push({
    timestamp: record.createdAt,
    type: 'case_created',
    summary: `Case initiated for board "${record.formData?.boardName || record.title}"`,
  });

  if (diagnosis) {
    timelineHighlights.push({
      timestamp: record.createdAt,
      type: 'initial_diagnosis',
      summary: `Initial AI diagnosis generated with ${diagnosis.hypotheses?.length || 0} candidate hypotheses`,
    });
  }

  for (const ev of evidenceLog) {
    const measurementStr = ev.numericValue !== undefined && ev.measurementUnit
      ? `${ev.numericValue} ${ev.measurementUnit}`
      : ev.outcome;
    timelineHighlights.push({
      timestamp: ev.recordedAt,
      type: 'technician_evidence',
      summary: `Technician measured Step ${ev.stepNumber} (${ev.checkTitle}): ${measurementStr}`,
    });
  }

  for (let i = 0; i < reassessments.length; i++) {
    timelineHighlights.push({
      timestamp: record.updatedAt,
      type: 'reassessment_round',
      summary: `AI reassessment Round ${i + 1} completed`,
    });
  }

  return {
    investigationId: record.id,
    boardName: record.formData?.boardName?.trim() || record.title || 'Untitled Board',
    technicianSymptoms: {
      expectedBehavior: record.formData?.expectedBehavior || '',
      observedBehavior: record.formData?.observedBehavior || '',
      relevantComponents: record.formData?.relevantComponents || '',
      technicianNotes: record.formData?.additionalNotes || record.technicianNotes,
    },
    initialDiagnosisR0,
    reassessmentCycles,
    currentHypotheses,
    technicianEvidenceLog,
    recommendedChecks,
    timelineHighlights,
  };
}

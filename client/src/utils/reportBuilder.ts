/**
 * CircuitLens Stage 6B-4B-2 — Diagnostic Report Builder
 *
 * Normalizes live diagnostic state into a provenance-tracked, schema-validated
 * DiagnosticReport instance for JSON, Markdown, and Print/PDF export.
 */

import { translations, type Translations } from '../i18n.ts';
import type {
  DiagnosisResponse,
  DiagnosisReassessmentResponse,
  EvidenceRecord,
} from '../types/diagnosis.ts';
import type { IntakeFormValues, IntakeFileState } from '../types/intake.ts';
import type {
  DiagnosticReport,
  ReportObservation,
  ReportHypothesis,
  ReportCheck,
  ReportEvidenceRecord,
  ReportReassessmentRound,
  ReportHypothesisEvolutionItem,
} from '../types/report.ts';
import { buildHypothesisEvolutionMatrix } from './evolutionBuilder.ts';

export interface BuildReportParams {
  investigationId: string;
  diagnosis: DiagnosisResponse;
  formData?: IntakeFormValues;
  imageFileState?: IntakeFileState | null;
  evidenceLog: EvidenceRecord[];
  reassessments: DiagnosisReassessmentResponse[];
  t?: Translations;
  generatedAt?: string;
}

export function buildDiagnosticReport({
  investigationId,
  diagnosis,
  formData,
  imageFileState,
  evidenceLog,
  reassessments,
  t = translations.en,
  generatedAt = new Date().toISOString(),
}: BuildReportParams): DiagnosticReport {
  const reportId = `RPT-${investigationId.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  // 1. Device and Intake context
  const device = {
    boardName: formData?.boardName?.trim() || null,
    expectedBehavior: formData?.expectedBehavior?.trim() || null,
    observedBehavior: formData?.observedBehavior?.trim() || null,
    relevantComponents: formData?.relevantComponents?.trim() || null,
    additionalNotes: formData?.additionalNotes?.trim() || null,
  };

  // 2. Image metadata
  const image = imageFileState
    ? {
        fileName: imageFileState.name,
        fileSizeBytes: imageFileState.sizeBytes,
        fileSizeFormatted: imageFileState.sizeFormatted,
        mimeType: imageFileState.file?.type || null,
        previewUrl: imageFileState.previewUrl || null,
      }
    : null;

  // 3. Observations
  const visibleObservations: ReportObservation[] = (diagnosis.visibleObservations || []).map(
    (obs, idx) => ({
      index: idx + 1,
      description: obs.description,
      evidence: obs.evidence,
      confidence: obs.confidence,
      origin: 'AI_GENERATED',
    })
  );

  // 4. Initial hypotheses
  const hypotheses: ReportHypothesis[] = (diagnosis.hypotheses || []).map((hyp, idx) => ({
    index: idx + 1,
    title: hyp.title,
    reasoning: hyp.reasoning,
    supportingEvidence: hyp.supportingEvidence || [],
    initialConfidence: hyp.confidence,
    suggestedVerification: hyp.suggestedVerification || null,
    origin: 'AI_GENERATED',
  }));

  // 5. Initial recommended checks
  const recommendedChecks: ReportCheck[] = (diagnosis.recommendedChecks || []).map((chk, idx) => ({
    cycleIndex: 0,
    stepNumber: chk.stepNumber ?? idx + 1,
    title: chk.title,
    testType: chk.testType,
    toolsNeeded: chk.toolsNeeded || [],
    procedure: chk.procedure,
    expectedResult: chk.expectedResult,
    safetyNotes: chk.safetyNotes || [],
    origin: 'AI_GENERATED',
  }));

  // 6. Technician evidence with supersession resolution
  const supersededIds = new Set<string>();
  evidenceLog.forEach((e) => {
    if (e.supersedesEvidenceId) {
      supersededIds.add(e.supersedesEvidenceId);
    }
    if ((e as any).supersededByEvidenceId) {
      supersededIds.add(e.id);
    }
  });

  const technicianEvidence: ReportEvidenceRecord[] = evidenceLog.map((rec) => {
    const isSuperseded = supersededIds.has(rec.id) || Boolean((rec as any).supersededByEvidenceId);
    const supersedingRecord = evidenceLog.find((e) => e.supersedesEvidenceId === rec.id);
    const supersededByEvidenceId = (rec as any).supersededByEvidenceId || supersedingRecord?.id || null;

    return {
      id: rec.id,
      cycleIndex: rec.cycleIndex,
      stepNumber: rec.stepNumber,
      checkTitle: rec.checkTitle,
      outcome: rec.outcome,
      numericValue:
        typeof rec.numericValue === 'number'
          ? rec.numericValue
          : typeof (rec as any).measurement === 'string' && !isNaN(parseFloat((rec as any).measurement))
          ? parseFloat((rec as any).measurement)
          : null,
      measurementUnit: rec.measurementUnit || null,
      technicianNotes: rec.technicianNotes || null,
      recordedAt: rec.recordedAt,
      supersedesEvidenceId: rec.supersedesEvidenceId || null,
      supersededByEvidenceId,
      isSuperseded,
      origin: 'TECHNICIAN_SUBMITTED',
    };
  });

  // 7. Chronological reassessment rounds
  const reassessmentHistory: ReportReassessmentRound[] = reassessments.map((round, rIdx) => {
    const cycleNumber = rIdx + 1;
    return {
      cycleNumber,
      summary: round.summary,
      evidenceSynthesis: round.evidenceSynthesis,
      revisedHypotheses: (round.revisedHypotheses || []).map((rev) => ({
        title: rev.title,
        status: rev.status,
        confidence: rev.confidence,
        explanationOfChange: rev.explanationOfChange,
        citingEvidenceIds: rev.citingEvidenceIds || [],
        suggestedVerification: rev.suggestedVerification || null,
        origin: 'AI_GENERATED',
      })),
      nextRecommendedChecks: (round.nextRecommendedChecks || []).map((chk, idx) => ({
        cycleIndex: cycleNumber,
        stepNumber: chk.stepNumber ?? idx + 1,
        title: chk.title,
        testType: chk.testType,
        toolsNeeded: chk.toolsNeeded || [],
        procedure: chk.procedure,
        expectedResult: chk.expectedResult,
        safetyNotes: chk.safetyNotes || [],
        origin: 'AI_GENERATED',
      })),
      safetyWarnings: round.safetyWarnings || [],
      limitations: round.limitations || [],
      telemetry: round.metadata || null,
      origin: 'AI_GENERATED',
    };
  });

  // 8. Hypothesis evolution matrix across cycles (captures R0 and later introduced hypotheses)
  const matrixRows = buildHypothesisEvolutionMatrix(diagnosis, reassessments, evidenceLog);
  const hypothesisEvolution: ReportHypothesisEvolutionItem[] = matrixRows.map((row) => {
    const revisions: ReportHypothesisEvolutionItem['revisions'] = [];
    reassessments.forEach((_, rIdx) => {
      const cycleNumber = rIdx + 1;
      const roundRec = row.roundAssessments[cycleNumber];
      if (roundRec) {
        revisions.push({
          cycleNumber,
          status: roundRec.status,
          confidence: roundRec.confidence,
          citingEvidenceIds: roundRec.citingEvidenceIds || [],
          isAmbiguous: roundRec.isAmbiguous,
        });
      }
    });

    return {
      hypothesisTitle: row.displayTitle,
      initialConfidence: row.initialConfidence,
      initialReasoning: row.initialReasoning,
      introducedInRound: row.introducedInRound,
      revisions,
      currentStatus: row.currentStatus,
      currentConfidence: row.currentConfidence,
      isConfirmedPhysicalFault: false, // Strict epistemic integrity rule
      isAmbiguous: row.isAmbiguous,
      matchKind: row.matchKind,
      isolatedRoundNumber: row.isolatedRoundNumber,
      ambiguousGroupId: row.ambiguousGroupId || null,
      isReappearance: row.isReappearance,
    };
  });

  // 9. Consolidated safety warnings & limitations
  const allSafetyWarnings = new Set<string>();
  (diagnosis.safetyWarnings || []).forEach((w) => allSafetyWarnings.add(w));
  reassessments.forEach((r) => (r.safetyWarnings || []).forEach((w) => allSafetyWarnings.add(w)));

  const allLimitations = new Set<string>();
  (diagnosis.limitations || []).forEach((l) => allLimitations.add(l));
  reassessments.forEach((r) => (r.limitations || []).forEach((l) => allLimitations.add(l)));

  // 10. Consolidated telemetry summary
  const diagMeta = diagnosis.metadata || (diagnosis as any).telemetry;
  let totalDurationMs = typeof diagMeta?.durationMs === 'number' ? diagMeta.durationMs : 0;
  let totalInputTokens: number | null = typeof (diagMeta?.promptTokens ?? diagMeta?.inputTokens) === 'number' ? (diagMeta?.promptTokens ?? diagMeta?.inputTokens) : null;
  let totalOutputTokens: number | null = typeof (diagMeta?.completionTokens ?? diagMeta?.outputTokens) === 'number' ? (diagMeta?.completionTokens ?? diagMeta?.outputTokens) : null;
  let totalTokens: number | null = typeof diagMeta?.totalTokens === 'number' ? diagMeta.totalTokens : null;

  let totalEstimatedCostUsd: number | null = null;
  let totalPartialCostUsd: number | null = null;
  let hasEstimatedCost = typeof diagMeta?.estimatedCostUsd === 'number';
  let hasPartialCost = typeof diagMeta?.partialCostUsd === 'number';

  let costSumMicro = hasEstimatedCost ? Math.round(diagMeta!.estimatedCostUsd! * 1_000_000) : 0;
  let partialCostSumMicro = hasPartialCost ? Math.round(diagMeta!.partialCostUsd! * 1_000_000) : 0;

  reassessments.forEach((r) => {
    const rMeta = r.metadata || (r as any).telemetry;
    if (typeof rMeta?.durationMs === 'number') {
      totalDurationMs += rMeta.durationMs;
    }
    const rInputTokens = rMeta?.promptTokens ?? rMeta?.inputTokens;
    if (typeof rInputTokens === 'number') {
      totalInputTokens = (totalInputTokens ?? 0) + rInputTokens;
    }
    const rOutputTokens = rMeta?.completionTokens ?? rMeta?.outputTokens;
    if (typeof rOutputTokens === 'number') {
      totalOutputTokens = (totalOutputTokens ?? 0) + rOutputTokens;
    }
    if (typeof rMeta?.totalTokens === 'number') {
      totalTokens = (totalTokens ?? 0) + rMeta.totalTokens;
    }
    if (typeof rMeta?.estimatedCostUsd === 'number') {
      hasEstimatedCost = true;
      costSumMicro += Math.round(rMeta.estimatedCostUsd * 1_000_000);
    }
    if (typeof rMeta?.partialCostUsd === 'number') {
      hasPartialCost = true;
      partialCostSumMicro += Math.round(rMeta.partialCostUsd * 1_000_000);
    }
  });

  if (hasEstimatedCost) {
    totalEstimatedCostUsd = Math.round(costSumMicro) / 1_000_000;
  }
  if (hasPartialCost) {
    totalPartialCostUsd = Math.round(partialCostSumMicro) / 1_000_000;
  }

  return {
    schemaVersion: '1.1.0',
    reportId,
    investigationId,
    generatedAt,
    system: {
      application: 'CircuitLens',
      version: '0.1.0',
      schemaVersion: '1.1.0',
      epistemicDisclaimer: t?.exportEpistemicNotice || translations.en.exportEpistemicNotice,
      origin: 'SYSTEM_METADATA',
    },
    device,
    image,
    initialDiagnosis: {
      summary: diagnosis.summary,
      visibleObservations,
      hypotheses,
      recommendedChecks,
      safetyWarnings: diagnosis.safetyWarnings || [],
      limitations: diagnosis.limitations || [],
      telemetry: diagMeta || null,
      origin: 'AI_GENERATED',
    },
    technicianEvidence,
    reassessmentHistory,
    hypothesisEvolution,
    safetyWarningsConsolidated: Array.from(allSafetyWarnings),
    limitationsConsolidated: Array.from(allLimitations),
    telemetrySummary: {
      totalDurationMs,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      totalEstimatedCostUsd,
      totalPartialCostUsd,
      cyclesLogged: 1 + reassessments.length,
      origin: 'SYSTEM_METADATA',
    },
  };
}

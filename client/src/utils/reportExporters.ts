/**
 * CircuitLens Stage 6B-4B-2 — Diagnostic Report Exporters
 *
 * Implements clean, validated export serialization for JSON and Markdown,
 * maintaining strict epistemic boundaries and provenance markers.
 */

import { translations, type Translations, type SupportedLanguage } from '../i18n.ts';
import type { DiagnosticReport } from '../types/report.ts';

/**
 * Serializes a DiagnosticReport into validated, portable JSON.
 *
 * Requirements:
 * - Strips transient browser blob URLs (sets `image.previewUrl` to null).
 * - Excludes any credentials, tokens, or authorization headers.
 * - Formatted with 2-space indentation.
 */
export function exportReportToJson(report: DiagnosticReport): string {
  // Deep clone and clean non-portable transient properties
  const cleanReport: DiagnosticReport = JSON.parse(JSON.stringify(report));

  if (cleanReport.image) {
    cleanReport.image.previewUrl = null;
  }

  const jsonString = JSON.stringify(cleanReport, null, 2);

  // Security sanity audit: ensure no API keys or credentials leaked
  if (
    jsonString.includes('BASETEN_API_KEY') ||
    jsonString.includes('MODEL_API_KEY') ||
    jsonString.includes('Bearer ') ||
    jsonString.includes('Authorization')
  ) {
    throw new Error('Security verification failed: sensitive authentication tokens detected in report payload.');
  }

  return jsonString;
}

/**
 * Serializes a DiagnosticReport into structured GitHub-Flavored Markdown.
 *
 * Includes:
 * - Provenance origin tags (`[AI-GENERATED]`, `[TECHNICIAN-RECORDED]`, `[SYSTEM-METADATA]`).
 * - Formatted tables for observations, hypotheses, and evidence records.
 * - Explicit epistemic disclaimers (never claiming physical confirmation).
 * - Portable references to uploaded photographs without broken blob URLs.
 */
export function exportReportToMarkdown(
  report: DiagnosticReport,
  tOrLang: Translations | SupportedLanguage = translations.en
): string {
  const t = typeof tOrLang === 'string' ? translations[tOrLang] || translations.en : tOrLang;
  const lines: string[] = [];

  // Header
  lines.push(`# ${t.exportReportHeaderTitle}`);
  lines.push('');
  lines.push(`> **${t.exportEpistemicNotice}**`);
  lines.push('');

  // 1. Investigation Metadata
  lines.push(`## 1. ${t.exportInvestigationIdLabel} & ${t.exportGeneratedAtLabel} \`[${t.exportOriginSystem}]\``);
  lines.push('');
  lines.push(`| Field | Record |`);
  lines.push(`| :--- | :--- |`);
  lines.push(`| **Report ID** | \`${report.reportId}\` |`);
  lines.push(`| **Investigation ID** | \`${report.investigationId}\` |`);
  lines.push(`| **Generated Timestamp** | \`${report.generatedAt}\` |`);
  lines.push(`| **Schema Version** | \`v${report.schemaVersion}\` |`);
  lines.push(`| **Application** | ${report.system.application} v${report.system.version} |`);
  lines.push('');

  // 2. Circuit & Device Context
  lines.push(`## 2. ${t.exportDeviceSectionTitle} \`[${t.exportOriginTech}]\``);
  lines.push('');
  lines.push(`| Parameter | Technician Input |`);
  lines.push(`| :--- | :--- |`);
  lines.push(`| **Board / Assembly Name** | ${report.device.boardName || '_Not specified_'} |`);
  lines.push(`| **Expected Nominal Behavior** | ${report.device.expectedBehavior || '_Not specified_'} |`);
  lines.push(`| **Observed Fault Symptoms** | ${report.device.observedBehavior || '_Not specified_'} |`);
  lines.push(`| **Suspect Components / Nets** | ${report.device.relevantComponents || '_Not specified_'} |`);
  if (report.device.additionalNotes) {
    lines.push(`| **Additional Bench Notes** | ${report.device.additionalNotes} |`);
  }
  lines.push('');

  // 3. Circuit Photograph Metadata
  if (report.image) {
    lines.push(`### Circuit Photograph Metadata`);
    lines.push('');
    lines.push(`- **Filename:** \`${report.image.fileName}\``);
    lines.push(`- **File Size:** ${report.image.fileSizeFormatted} (${report.image.fileSizeBytes.toLocaleString()} bytes)`);
    if (report.image.mimeType) {
      lines.push(`- **MIME Type:** \`${report.image.mimeType}\``);
    }
    lines.push(`- _Note: Image inspection conducted at original uploaded resolution._`);
    lines.push('');
  }

  // 4. Initial Visual Observations
  lines.push(`## 3. ${t.exportObservationsSectionTitle} \`[${t.exportOriginAi}]\``);
  lines.push('');
  lines.push(`*Factual physical features observable directly in the circuit photograph (independent of root-cause deductions).*`);
  lines.push('');
  if (report.initialDiagnosis.visibleObservations.length === 0) {
    lines.push(`_No direct optical anomalies identified._`);
  } else {
    lines.push(`| # | Description | Observable Evidence | Confidence |`);
    lines.push(`| :---: | :--- | :--- | :---: |`);
    report.initialDiagnosis.visibleObservations.forEach((obs) => {
      const confStr = obs.confidence ? obs.confidence.toUpperCase() : 'MEDIUM';
      lines.push(`| ${obs.index} | ${obs.description || ''} | ${obs.evidence || ''} | **${confStr}** |`);
    });
  }
  lines.push('');

  // 5. Fault Hypotheses & Evolution Matrix
  lines.push(`## 4. ${t.exportHypothesesSectionTitle} \`[${t.exportOriginAi}]\``);
  lines.push('');
  lines.push(`*Deductive fault candidates. Important: Statuses represent analytical plausibility based on available evidence, NOT physical confirmation.*`);
  lines.push('');
  if (report.hypothesisEvolution.length === 0) {
    lines.push(`_No fault hypotheses recorded._`);
  } else {
    lines.push(`| Hypothesis | Initial Confidence | Reassessment Revisions | Current Status | Current Confidence |`);
    lines.push(`| :--- | :---: | :--- | :---: | :---: |`);
    report.hypothesisEvolution.forEach((hyp) => {
      const isIsolated = hyp.isolatedRoundNumber !== null && hyp.isolatedRoundNumber !== undefined;
      const revisionSummary =
        isIsolated
          ? `_${t.ambiguousRoundIsolatedNotice || 'Round-isolated candidate; not linked across rounds.'}_`
          : hyp.revisions.length > 0
            ? hyp.revisions.map((r) => `R${r.cycleNumber}: **${r.status.toUpperCase()}** (${r.citingEvidenceIds.join(', ') || 'no citation'})`).join('<br>')
            : `_${t.exportInitialOnly || 'Initial assessment only'}_`;

      const initialConfDisplay = hyp.initialConfidence
        ? hyp.initialConfidence.toUpperCase()
        : hyp.introducedInRound
          ? `_Intro R${hyp.introducedInRound}_`
          : '—';
      const currentConfDisplay = hyp.currentConfidence ? hyp.currentConfidence.toUpperCase() : '—';

      let statusBadge = '';
      if (hyp.isReappearance) {
        statusBadge = ` *(${t.ambiguousReappearanceBadge || 'Reappeared (Uncertain Identity)'})*`;
      } else if (hyp.isAmbiguous) {
        const groupInfo = hyp.ambiguousGroupId ? ` [Group: \`${hyp.ambiguousGroupId}\`]` : '';
        statusBadge = ` *(${t.ambiguousIdentityBadge || 'Ambiguous Identity'}${groupInfo})*`;
      } else if (hyp.matchKind === 'title_matched_heuristic') {
        statusBadge = ` *(${t.heuristicTitleMatchBadge || 'Title-Matched Track'})*`;
      }

      lines.push(
        `| **${hyp.hypothesisTitle}**${statusBadge} | ${initialConfDisplay} | ${revisionSummary} | \`${hyp.currentStatus.toUpperCase()}\` | ${currentConfDisplay} |`
      );
    });
  }
  lines.push('');
  if (report.hypothesisEvolution.some((h) => h.isAmbiguous || h.isReappearance)) {
    lines.push(`*Note: ${t.ambiguousNoTrendNotice || 'No confidence trend is shown because hypothesis identity across rounds is uncertain.'}*`);
    lines.push('');
  }
  if (report.hypothesisEvolution.some((h) => h.matchKind === 'title_matched_heuristic')) {
    lines.push(`*Heuristic Notice: ${t.heuristicTrackingExplanation || 'Identical titles are used as a tracking heuristic across rounds.'} ${t.heuristicNotConfirmedNotice || 'Hypothesis continuity does not constitute physical fault confirmation.'}*`);
    lines.push('');
  }

  // Initial Reasoning breakdown
  lines.push(`### ${t.exportInitialReasoningHeading || 'Initial Deductive Reasoning & Proposed Checks'}`);
  lines.push('');
  report.initialDiagnosis.hypotheses.forEach((hyp) => {
    lines.push(`#### H${hyp.index}: ${hyp.title}`);
    lines.push(`- **Reasoning:** ${hyp.reasoning}`);
    if (hyp.supportingEvidence.length > 0) {
      lines.push(`- **Supporting Optical Clues:** ${hyp.supportingEvidence.join('; ')}`);
    }
    if (hyp.suggestedVerification) {
      lines.push(`- **Suggested Verification:** ${hyp.suggestedVerification}`);
    }
    lines.push('');
  });

  // 6. Technician Evidence Ledger
  lines.push(`## 5. ${t.exportEvidenceSectionTitle} \`[${t.exportOriginTech}]\``);
  lines.push('');
  lines.push(`*${t.exportTechnicianEvidenceHeading || 'Chronological, immutable record of physical measurements and checks conducted on the bench.'}*`);
  lines.push('');
  if (report.technicianEvidence.length === 0) {
    lines.push(`_${t.exportNoEvidenceRecorded || 'No physical test measurements or checks were recorded for this investigation.'}_`);
  } else {
    lines.push(`| ID | Step | Check Procedure | Outcome | Value | Superseded | Timestamp | Notes |`);
    lines.push(`| :---: | :---: | :--- | :---: | :---: | :---: | :---: | :--- |`);
    report.technicianEvidence.forEach((ev) => {
      const valStr = ev.numericValue !== null && ev.measurementUnit ? `${ev.numericValue} ${ev.measurementUnit}` : '—';
      const superStr = ev.isSuperseded ? `**YES** (superseded by later check)` : ev.supersedesEvidenceId ? `Supersedes ${ev.supersedesEvidenceId}` : 'Active';
      const timeStr = new Date(ev.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      lines.push(
        `| \`${ev.id}\` | #${ev.stepNumber} (R${ev.cycleIndex}) | ${ev.checkTitle} | **${ev.outcome.toUpperCase()}** | \`${valStr}\` | ${superStr} | ${timeStr} | ${ev.technicianNotes || '—'} |`
      );
    });
  }
  lines.push('');

  // 7. Evidence-Driven Reassessment History
  if (report.reassessmentHistory.length > 0) {
    lines.push(`## 6. ${t.exportReassessmentsSectionTitle} \`[${t.exportOriginAi}]\``);
    lines.push('');
    report.reassessmentHistory.forEach((round) => {
      lines.push(`### Reassessment Round #${round.cycleNumber}`);
      lines.push(`- **Summary:** ${round.summary}`);
      lines.push(`- **Evidence Synthesis:** ${round.evidenceSynthesis}`);
      lines.push('');
      lines.push(`#### Revised Hypotheses (Round #${round.cycleNumber}):`);
      round.revisedHypotheses.forEach((rh) => {
        lines.push(`- **${rh.title}**: Status \`${rh.status.toUpperCase()}\` (Confidence: ${rh.confidence.toUpperCase()})`);
        lines.push(`  - _Explanation:_ ${rh.explanationOfChange}`);
        if (rh.citingEvidenceIds.length > 0) {
          lines.push(`  - _Citing Evidence:_ ${rh.citingEvidenceIds.map((id) => `\`${id}\``).join(', ')}`);
        }
      });
      lines.push('');
    });
  }

  // 8. Recommended Troubleshooting Checks
  lines.push(`## 7. ${t.exportChecksSectionTitle} \`[${t.exportOriginAi}]\``);
  lines.push('');
  const allChecks = [
    ...report.initialDiagnosis.recommendedChecks,
    ...report.reassessmentHistory.flatMap((r) => r.nextRecommendedChecks),
  ];
  if (allChecks.length === 0) {
    lines.push(`_No pending troubleshooting checks._`);
  } else {
    allChecks.forEach((chk) => {
      lines.push(`### Step ${chk.stepNumber}: ${chk.title} (Cycle R${chk.cycleIndex})`);
      lines.push(`- **Test Type:** \`${chk.testType}\``);
      if (chk.toolsNeeded.length > 0) {
        lines.push(`- **Tools Required:** ${chk.toolsNeeded.join(', ')}`);
      }
      lines.push(`- **Procedure:** ${chk.procedure}`);
      lines.push(`- **Expected Result:** ${chk.expectedResult}`);
      if (chk.safetyNotes.length > 0) {
        lines.push(`- **Safety Precautions:** ${chk.safetyNotes.join('; ')}`);
      }
      lines.push('');
    });
  }

  // 9. Mandatory Electrical Safety Precautions
  lines.push(`## 8. ${t.exportSafetySectionTitle} \`[CRITICAL_SAFETY]\``);
  lines.push('');
  if (report.safetyWarningsConsolidated.length === 0) {
    lines.push(`_${t.exportDefaultSafetyNotice || 'Standard unpowered electrical safety procedures apply.'}_`);
  } else {
    report.safetyWarningsConsolidated.forEach((warn) => {
      lines.push(`- ⚡ **WARNING:** ${warn}`);
    });
  }
  lines.push('');

  // 10. Diagnostic Limitations & Uncertainties
  lines.push(`## 9. ${t.exportLimitationsSectionTitle}`);
  lines.push('');
  if (report.limitationsConsolidated.length === 0) {
    lines.push(`_${t.exportDefaultLimitationsNotice || 'No explicit operational limitations logged.'}_`);
  } else {
    report.limitationsConsolidated.forEach((lim) => {
      lines.push(`- ${lim}`);
    });
  }
  lines.push('');

  // 11. Operational Telemetry & Token Accounting
  lines.push(`## 10. ${t.exportTelemetrySectionTitle} \`[${t.exportOriginSystem}]\``);
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`| :--- | :--- |`);
  lines.push(`| **Total Inference Latency** | ${report.telemetrySummary.totalDurationMs.toLocaleString()} ms (${(report.telemetrySummary.totalDurationMs / 1000).toFixed(2)}s) |`);
  if (report.telemetrySummary.totalEstimatedCostUsd !== null) {
    lines.push(`| **Total Estimated Inference Cost** | \`$${report.telemetrySummary.totalEstimatedCostUsd.toFixed(6)}\` USD |`);
  } else if (report.telemetrySummary.totalPartialCostUsd !== null) {
    lines.push(`| **Total Partial Cost Subtotal** | \`$${report.telemetrySummary.totalPartialCostUsd.toFixed(6)}*\` USD (partial token reporting) |`);
  } else {
    lines.push(`| **Total Estimated Inference Cost** | _Unavailable (missing provider usage)_ |`);
  }
  lines.push(`| **Diagnostic Cycles Logged** | ${report.telemetrySummary.cyclesLogged} |`);
  lines.push('');

  lines.push(`---`);
  lines.push(`_Report generated automatically by CircuitLens v${report.system.version}. Provenance strictly tracked._`);

  return lines.join('\n');
}

/**
 * Triggers a client-side file download without leaving temporary DOM residues.
 */
export function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

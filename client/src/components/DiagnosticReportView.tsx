/**
 * CircuitLens Stage 6B-4B-2 — Printable Diagnostic Report View
 *
 * Rendered into the DOM specifically for browser printing (window.print())
 * and "Save as PDF". Hidden during normal interactive screen rendering,
 * and seamlessly styled via @media print for a crisp, ink-friendly laboratory document.
 */

import type { Translations } from '../i18n';
import type { DiagnosticReport } from '../types/report';

interface DiagnosticReportViewProps {
  report: DiagnosticReport;
  t: Translations;
}

export function DiagnosticReportView({ report, t }: DiagnosticReportViewProps) {
  return (
    <div className="printable-diagnostic-report" aria-hidden="true">
      {/* 1. Formal Report Header */}
      <header className="print-report-header">
        <div className="print-header-top">
          <div className="print-brand-group">
            <h1 className="print-brand-title">{t.exportReportHeaderTitle}</h1>
            <span className="print-brand-sub">AI-Assisted Hardware Diagnostics • Laboratory Documentation</span>
          </div>
          <div className="print-meta-summary">
            <div><strong>{t.exportInvestigationIdLabel}:</strong> <code>{report.investigationId}</code></div>
            <div><strong>Report ID:</strong> <code>{report.reportId}</code></div>
            <div><strong>{t.exportGeneratedAtLabel}:</strong> {new Date(report.generatedAt).toLocaleString()}</div>
          </div>
        </div>

        {/* Epistemic Guardrail Notice */}
        <div className="print-disclaimer-box">
          <strong>EPIDEMIOLOGICAL & LEGAL DISCLAIMER:</strong> {report.system.epistemicDisclaimer}
        </div>
      </header>

      {/* 2. Device & Intake Parameters */}
      <section className="print-section">
        <h2 className="print-section-title">
          1. {t.exportDeviceSectionTitle} <span className="print-origin-tag">[{t.exportOriginTech}]</span>
        </h2>
        <table className="print-table">
          <tbody>
            <tr>
              <th style={{ width: '25%' }}>Board / Device Name</th>
              <td><strong>{report.device.boardName || 'Not specified'}</strong></td>
            </tr>
            <tr>
              <th>Expected Behavior</th>
              <td>{report.device.expectedBehavior || 'Not specified'}</td>
            </tr>
            <tr>
              <th>Observed Fault Symptoms</th>
              <td>{report.device.observedBehavior || 'Not specified'}</td>
            </tr>
            {report.device.relevantComponents && (
              <tr>
                <th>Suspect Components</th>
                <td>{report.device.relevantComponents}</td>
              </tr>
            )}
            {report.device.additionalNotes && (
              <tr>
                <th>Technician Notes</th>
                <td>{report.device.additionalNotes}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* 3. Original Circuit Photograph */}
      {report.image && (
        <section className="print-section print-page-break-avoid">
          <h2 className="print-section-title">
            2. Circuit Photograph Documentation <span className="print-origin-tag">[ORIGINAL ARTIFACT]</span>
          </h2>
          <div className="print-image-container">
            {report.image.previewUrl && (
              <img
                src={report.image.previewUrl}
                alt={`Circuit Photograph: ${report.image.fileName}`}
                className="print-circuit-img"
              />
            )}
            <div className="print-image-caption">
              <strong>Filename:</strong> {report.image.fileName} • <strong>Size:</strong> {report.image.fileSizeFormatted} ({report.image.fileSizeBytes.toLocaleString()} bytes)
              <br />
              <em>Visual inspection performed on original uploaded photograph without synthetic overlays.</em>
            </div>
          </div>
        </section>
      )}

      {/* 4. Direct Optical Observations */}
      <section className="print-section print-page-break-avoid">
        <h2 className="print-section-title">
          3. {t.exportObservationsSectionTitle} <span className="print-origin-tag">[{t.exportOriginAi}]</span>
        </h2>
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '6%', textAlign: 'center' }}>#</th>
              <th style={{ width: '54%' }}>Observable Anomaly Description</th>
              <th style={{ width: '25%' }}>Visual Clue / Location</th>
              <th style={{ width: '15%', textAlign: 'center' }}>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {report.initialDiagnosis.visibleObservations.map((obs) => (
              <tr key={`print-obs-${obs.index}`}>
                <td style={{ textAlign: 'center' }}>{obs.index}</td>
                <td>{obs.description}</td>
                <td>{obs.evidence}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`print-badge badge-${obs.confidence}`}>{obs.confidence.toUpperCase()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 5. Fault Hypotheses & Evolution Matrix */}
      <section className="print-section print-page-break-avoid">
        <h2 className="print-section-title">
          4. {t.exportHypothesesSectionTitle} <span className="print-origin-tag">[{t.exportOriginAi}]</span>
        </h2>
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>Hypothesis Candidate</th>
              <th style={{ width: '15%', textAlign: 'center' }}>Initial Conf.</th>
              <th style={{ width: '30%' }}>Reassessment Revisions</th>
              <th style={{ width: '20%', textAlign: 'center' }}>Current Status</th>
            </tr>
          </thead>
          <tbody>
            {report.hypothesisEvolution.map((hyp, hIdx) => (
              <tr key={`print-hyp-${hIdx}`}>
                <td>
                  <strong>{hyp.hypothesisTitle}</strong>
                  {hyp.isReappearance && (
                    <span className="print-ambiguous-badge" style={{ marginLeft: 6, fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>
                      [{t.ambiguousReappearanceBadge || 'Reappeared (Uncertain Identity)'}]
                    </span>
                  )}
                  {hyp.isAmbiguous && !hyp.isReappearance && (
                    <span className="print-ambiguous-badge" style={{ marginLeft: 6, fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>
                      [{t.ambiguousIdentityBadge || 'Ambiguous Identity'}]
                      {hyp.ambiguousGroupId && <code style={{ fontSize: '0.7rem', marginLeft: 4 }}>({hyp.ambiguousGroupId})</code>}
                    </span>
                  )}
                  {hyp.matchKind === 'title_matched_heuristic' && !hyp.isAmbiguous && !hyp.isReappearance && (
                    <span className="print-heuristic-badge" style={{ marginLeft: 6, fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>
                      [{t.heuristicTitleMatchBadge || 'Title-Matched Track'}]
                    </span>
                  )}
                  {hyp.initialReasoning && (
                    <div className="print-hyp-note">
                      {hyp.initialReasoning}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {hyp.initialConfidence ? (
                    <span className={`print-badge badge-${hyp.initialConfidence}`}>
                      {hyp.initialConfidence.toUpperCase()}
                    </span>
                  ) : (
                    <span className="print-badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.75rem' }}>
                      {hyp.introducedInRound ? `Intro R${hyp.introducedInRound}` : '—'}
                    </span>
                  )}
                </td>
                <td>
                  {hyp.isolatedRoundNumber !== null && hyp.isolatedRoundNumber !== undefined ? (
                    <em>{t.ambiguousRoundIsolatedNotice || 'Round-isolated candidate; not linked across rounds.'}</em>
                  ) : hyp.revisions.length > 0 ? (
                    hyp.revisions.map((rev) => (
                      <div key={`rev-${rev.cycleNumber}`} className="print-rev-item">
                        Round {rev.cycleNumber}: <strong>{rev.status.toUpperCase()}</strong>
                        {rev.isAmbiguous && <span style={{ color: '#b45309', fontSize: '0.75rem' }}> ({t.ambiguousIdentityBadge.toLowerCase()})</span>}
                        {rev.citingEvidenceIds.length > 0 && ` (citing ${rev.citingEvidenceIds.join(', ')})`}
                      </div>
                    ))
                  ) : (
                    <em>{t.exportInitialOnly || 'Initial assessment only'}</em>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`print-status-badge status-${hyp.currentStatus}`}>
                    {hyp.currentStatus.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="print-disclaimer" style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '0.5rem' }}>
          * {t.heuristicTrackingExplanation || 'Identical titles are used as a tracking heuristic across rounds.'} {t.heuristicNotConfirmedNotice || 'Hypothesis continuity does not constitute physical fault confirmation.'}
        </p>
      </section>

      {/* 6. Physical Evidence & Bench Measurements */}
      <section className="print-section print-page-break-avoid">
        <h2 className="print-section-title">
          5. {t.exportEvidenceSectionTitle} <span className="print-origin-tag">[{t.exportOriginTech}]</span>
        </h2>
        {report.technicianEvidence.length === 0 ? (
          <p className="print-empty-note">{t.exportNoEvidenceRecorded || 'No physical test measurements or checks were recorded for this investigation.'}</p>
        ) : (
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '12%' }}>Evidence ID</th>
                <th style={{ width: '35%' }}>Check Procedure</th>
                <th style={{ width: '15%', textAlign: 'center' }}>Outcome</th>
                <th style={{ width: '15%' }}>Measurement</th>
                <th style={{ width: '23%' }}>Notes & Status</th>
              </tr>
            </thead>
            <tbody>
              {report.technicianEvidence.map((ev) => (
                <tr key={ev.id} className={ev.isSuperseded ? 'print-row-superseded' : ''}>
                  <td><code>{ev.id}</code></td>
                  <td>
                    <strong>#{ev.stepNumber}:</strong> {ev.checkTitle}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`print-outcome-pill outcome-${ev.outcome}`}>
                      {ev.outcome.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {ev.numericValue !== null && ev.measurementUnit
                      ? `${ev.numericValue} ${ev.measurementUnit}`
                      : '—'}
                  </td>
                  <td>
                    {ev.isSuperseded && <span className="print-superseded-tag">[SUPERSEDED] </span>}
                    {ev.technicianNotes || (ev.isSuperseded ? 'Superseded by later attempt' : 'Active record')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 7. Reassessment Rounds History */}
      {report.reassessmentHistory.length > 0 && (
        <section className="print-section print-page-break-avoid">
          <h2 className="print-section-title">
            6. {t.exportReassessmentsSectionTitle} <span className="print-origin-tag">[{t.exportOriginAi}]</span>
          </h2>
          {report.reassessmentHistory.map((round) => (
            <div key={`print-round-${round.cycleNumber}`} className="print-round-box">
              <h3 className="print-round-title">Cycle Round #{round.cycleNumber} Synthesis</h3>
              <p><strong>Summary:</strong> {round.summary}</p>
              <p><strong>Evidence Synthesis:</strong> {round.evidenceSynthesis}</p>
            </div>
          ))}
        </section>
      )}

      {/* 8. Mandatory Electrical Safety Warnings */}
      {report.safetyWarningsConsolidated.length > 0 && (
        <section className="print-section print-safety-section print-page-break-avoid">
          <h2 className="print-section-title print-safety-title">
            7. {t.exportSafetySectionTitle} <span className="print-origin-tag">[CRITICAL SAFETY]</span>
          </h2>
          <ul className="print-safety-list">
            {report.safetyWarningsConsolidated.map((warning, wIdx) => (
              <li key={`safety-warn-${wIdx}`}>⚡ {warning}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 9. Limitations & Telemetry */}
      <footer className="print-report-footer print-page-break-avoid">
        {report.limitationsConsolidated.length > 0 && (
          <div className="print-limitations-box">
            <strong>{t.exportLimitationsSectionTitle}:</strong>
            <ul>
              {report.limitationsConsolidated.map((lim, lIdx) => (
                <li key={`lim-${lIdx}`}>{lim}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="print-telemetry-summary">
          <strong>Telemetry Audit:</strong> Total Latency: {report.telemetrySummary.totalDurationMs} ms |
          {report.telemetrySummary.totalEstimatedCostUsd !== null && ` Estimated API Cost: $${report.telemetrySummary.totalEstimatedCostUsd.toFixed(6)} USD | `}
          Cycles Logged: {report.telemetrySummary.cyclesLogged} | CircuitLens Engine v{report.system.version}
        </div>
      </footer>
    </div>
  );
}

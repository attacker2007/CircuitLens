/**
 * CircuitLens Stage 6B-4B-3 — Current Assessment Panel Component
 *
 * Concise executive synthesis of the latest diagnostic status, classifying
 * fault hypotheses into supported, contradicted, and unresolved groups while
 * strictly guarding against false claims of physical confirmation.
 */

import type { Translations } from '../i18n';
import type { CurrentDiagnosticSummary } from '../types/evolution';

interface CurrentAssessmentPanelProps {
  summary: CurrentDiagnosticSummary;
  t: Translations;
  onNavigateToMatrix?: () => void;
  onNavigateToTimeline?: () => void;
  onNavigateToExport?: () => void;
}

export function CurrentAssessmentPanel({
  summary,
  t,
  onNavigateToMatrix,
  onNavigateToTimeline,
  onNavigateToExport,
}: CurrentAssessmentPanelProps) {
  return (
    <section className="card-panel current-assessment-panel" aria-labelledby="current-assessment-heading">
      <div className="card-header">
        <div className="card-title-group">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="section-icon"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <div>
            <h3 id="current-assessment-heading" className="card-title">
              {t.currentAssessmentTitle || 'Current Diagnostic State Synthesis'}
            </h3>
            <p className="intake-section-desc">
              {t.currentAssessmentSubtitle || 'Executive tri-state plausibility summary based on accumulated bench measurements.'}
            </p>
          </div>
        </div>
        <div className="assessment-nav-actions">
          {onNavigateToMatrix && (
            <button
              type="button"
              className="action-btn secondary-btn assessment-nav-btn"
              onClick={onNavigateToMatrix}
            >
              <span>{t.navToMatrixBtn || 'View Evolution Matrix'}</span>
            </button>
          )}
          {onNavigateToTimeline && (
            <button
              type="button"
              className="action-btn secondary-btn assessment-nav-btn"
              onClick={onNavigateToTimeline}
            >
              <span>{t.navToTimelineBtn || 'View Evidence Timeline'}</span>
            </button>
          )}
          {onNavigateToExport && (
            <button
              type="button"
              className="action-btn secondary-btn assessment-nav-btn"
              onClick={onNavigateToExport}
            >
              <span>{t.subnavReport || 'Export Report'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Epistemic Guardrail Notice */}
      <div className="assessment-epistemic-banner" role="note">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="disclaimer-icon"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p>
          <strong>{t.assessmentEpistemicHeader || 'Epistemic Guardrail'}:</strong>{' '}
          {t.assessmentEpistemicNotice ||
            'Supported hypotheses represent analytical plausibility corroborated by bench test readings. They are NEVER physically confirmed root causes without component isolation and desoldering.'}
        </p>
      </div>

      {/* Tri-State Hypothesis Columns Grid */}
      <div className="assessment-columns-grid">
        {/* 1. Supported Candidates */}
        <div className="assessment-column col-supported">
          <div className="assessment-col-header">
            <span className="col-indicator indicator-supported" aria-hidden="true" />
            <h4 className="col-title">{t.statusSupported || 'Supported Candidates'}</h4>
            <span className="col-count-badge badge-supported">
              {summary.supportedHypotheses.length}
            </span>
          </div>
          <div className="col-body">
            {summary.supportedHypotheses.length === 0 ? (
              <p className="col-empty-note">{t.noSupportedHypotheses || 'No hypotheses supported by current evidence.'}</p>
            ) : (
              <ul className="assessment-hyp-list">
                {summary.supportedHypotheses.map((hyp) => (
                  <li key={hyp.trackingKey} className="assessment-hyp-item item-supported">
                    <strong className="hyp-item-title">{hyp.displayTitle}</strong>
                    <div className="hyp-item-meta">
                      <span className="hyp-conf-badge">{hyp.currentConfidence?.toUpperCase()}</span>
                      <span className="hyp-evidence-cites">
                        {hyp.allCitingEvidenceIds.length > 0
                          ? `Corroborated by ${hyp.allCitingEvidenceIds.join(', ')}`
                          : 'Analytical deduction'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 2. Contradicted Candidates */}
        <div className="assessment-column col-contradicted">
          <div className="assessment-col-header">
            <span className="col-indicator indicator-contradicted" aria-hidden="true" />
            <h4 className="col-title">{t.statusContradicted || 'Contradicted Candidates'}</h4>
            <span className="col-count-badge badge-contradicted">
              {summary.contradictedHypotheses.length}
            </span>
          </div>
          <div className="col-body">
            {summary.contradictedHypotheses.length === 0 ? (
              <p className="col-empty-note">{t.noContradictedHypotheses || 'No hypotheses ruled out by bench tests yet.'}</p>
            ) : (
              <ul className="assessment-hyp-list">
                {summary.contradictedHypotheses.map((hyp) => (
                  <li key={hyp.trackingKey} className="assessment-hyp-item item-contradicted">
                    <strong className="hyp-item-title">{hyp.displayTitle}</strong>
                    <div className="hyp-item-meta">
                      <span className="hyp-conf-badge">{hyp.currentConfidence?.toUpperCase()}</span>
                      <span className="hyp-evidence-cites">
                        {hyp.allCitingEvidenceIds.length > 0
                          ? `Contradicted by ${hyp.allCitingEvidenceIds.join(', ')}`
                          : 'Ruled out by deduction'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 3. Unresolved Candidates */}
        <div className="assessment-column col-unresolved">
          <div className="assessment-col-header">
            <span className="col-indicator indicator-unresolved" aria-hidden="true" />
            <h4 className="col-title">{t.statusUnresolved || 'Unresolved Candidates'}</h4>
            <span className="col-count-badge badge-unresolved">
              {summary.unresolvedHypotheses.length}
            </span>
          </div>
          <div className="col-body">
            {summary.unresolvedHypotheses.length === 0 ? (
              <p className="col-empty-note">{t.noUnresolvedHypotheses || 'No unresolved fault candidates remaining.'}</p>
            ) : (
              <ul className="assessment-hyp-list">
                {summary.unresolvedHypotheses.map((hyp) => (
                  <li key={hyp.trackingKey} className="assessment-hyp-item item-unresolved">
                    <strong className="hyp-item-title">{hyp.displayTitle}</strong>
                    <div className="hyp-item-meta">
                      <span className="hyp-conf-badge">{hyp.currentConfidence?.toUpperCase()}</span>
                      <span className="hyp-evidence-cites">
                        {hyp.introducedInRound > 0
                          ? `Introduced in R${hyp.introducedInRound}`
                          : 'Pending bench test verification'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Supporting vs Contradictory Evidence Highlights */}
      {(summary.strongestSupportingEvidence.length > 0 || summary.importantContradictoryEvidence.length > 0) && (
        <div className="assessment-evidence-highlights-row">
          {summary.strongestSupportingEvidence.length > 0 && (
            <div className="evidence-highlight-card card-support">
              <h5 className="highlight-title">
                ✓ {t.strongestSupportingEvidenceTitle || 'Decisive Corroborating Evidence'}
              </h5>
              <ul className="highlight-list">
                {summary.strongestSupportingEvidence.map((ev) => (
                  <li key={`supp-${ev.evidenceId}`}>
                    <code>{ev.evidenceId}</code> ({ev.checkTitle}):{' '}
                    <strong>{ev.measurementFormatted}</strong> — supports{' '}
                    <em>{ev.citesHypotheses.join(', ')}</em>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.importantContradictoryEvidence.length > 0 && (
            <div className="evidence-highlight-card card-contradict">
              <h5 className="highlight-title">
                ✗ {t.importantContradictoryEvidenceTitle || 'Decisive Contradictory Evidence'}
              </h5>
              <ul className="highlight-list">
                {summary.importantContradictoryEvidence.map((ev) => (
                  <li key={`contra-${ev.evidenceId}`}>
                    <code>{ev.evidenceId}</code> ({ev.checkTitle}):{' '}
                    <strong>{ev.measurementFormatted}</strong> — refutes{' '}
                    <em>{ev.citesHypotheses.join(', ')}</em>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Outstanding Checks Remaining */}
      {summary.outstandingChecks.length > 0 && (
        <div className="assessment-checks-remaining-box">
          <div className="checks-remaining-header">
            <h5 className="checks-remaining-title">
              🔍 {t.outstandingChecksTitle || 'Prioritized Next Verification Checks'} ({summary.outstandingChecks.length})
            </h5>
          </div>
          <ol className="checks-remaining-list">
            {summary.outstandingChecks.slice(0, 3).map((chk) => (
              <li key={`chk-${chk.stepNumber}`} className="checks-remaining-item">
                <strong>Step #{chk.stepNumber}: {chk.title}</strong>
                <p>{chk.procedure}</p>
                <span className="check-expected">Expected: <code>{chk.expectedResult}</code></span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Critical Safety Precautions */}
      {summary.safetyWarnings.length > 0 && (
        <div className="assessment-safety-warnings-box">
          <div className="safety-warnings-header">
            <span className="safety-icon" aria-hidden="true">⚡</span>
            <strong>{t.criticalSafetyTitle || 'Essential Electrical Safety Precautions'}:</strong>
          </div>
          <ul className="safety-warnings-list">
            {summary.safetyWarnings.map((w, wIdx) => (
              <li key={`warn-${wIdx}`}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

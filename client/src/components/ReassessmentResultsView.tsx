/**
 * CircuitLens Stage 4B-4 — Reassessment Results View
 *
 * Displays the evidence-driven diagnostic reassessment report returned by Meta AI,
 * including revised hypotheses with cautious statuses, evidence synthesis, citations,
 * and follow-up verification guidance.
 */

import type { Translations } from '../i18n';
import type {
  DiagnosisReassessmentResponse,
  ConfidenceLevel,
  EvidenceRecord,
  RevisedHypothesisStatus,
} from '../types/diagnosis';

interface ReassessmentResultsViewProps {
  reassessment: DiagnosisReassessmentResponse;
  evidenceLog: EvidenceRecord[];
  cycleNumber: number;
  t: Translations;
  onSelectRecommendation?: (targetRecommendationId: string) => void;
}

export function ReassessmentResultsView({
  reassessment,
  evidenceLog,
  cycleNumber,
  t,
  onSelectRecommendation,
}: ReassessmentResultsViewProps) {
  const getStatusBadgeClass = (status: RevisedHypothesisStatus): string => {
    switch (status) {
      case 'supported':
        return 'status-badge-supported';
      case 'weakened':
        return 'status-badge-weakened';
      case 'contradicted':
        return 'status-badge-contradicted';
      case 'unresolved':
      default:
        return 'status-badge-unresolved';
    }
  };

  const getStatusLabel = (status: RevisedHypothesisStatus): string => {
    switch (status) {
      case 'supported':
        return t.statusSupported;
      case 'weakened':
        return t.statusWeakened;
      case 'contradicted':
        return t.statusContradicted;
      case 'unresolved':
      default:
        return t.statusUnresolved;
    }
  };

  const getConfidenceLabel = (conf: ConfidenceLevel): string => {
    switch (conf) {
      case 'high':
        return t.confidenceHigh;
      case 'medium':
        return t.confidenceMedium;
      case 'low':
      default:
        return t.confidenceLow;
    }
  };

  const getConfidenceBadgeClass = (conf: ConfidenceLevel): string => {
    switch (conf) {
      case 'high':
        return 'confidence-badge-high';
      case 'medium':
        return 'confidence-badge-medium';
      case 'low':
      default:
        return 'confidence-badge-low';
    }
  };

  const getOutcomeBadgeClass = (outcome: string): string => {
    switch (outcome) {
      case 'passed':
        return 'outcome-pill-passed';
      case 'failed':
        return 'outcome-pill-failed';
      case 'inconclusive':
        return 'outcome-pill-inconclusive';
      case 'unable_to_perform':
      default:
        return 'outcome-pill-unable';
    }
  };

  const getOutcomeLabel = (outcome: string): string => {
    switch (outcome) {
      case 'passed':
        return t.outcomePassedLabel;
      case 'failed':
        return t.outcomeFailedLabel;
      case 'inconclusive':
        return t.outcomeInconclusiveLabel;
      case 'unable_to_perform':
      default:
        return t.outcomeUnableLabel;
    }
  };

  return (
    <div
      className="card-panel reassessment-results-panel"
      role="region"
      aria-labelledby={`reassessment-heading-${cycleNumber}`}
    >
      {/* 1. Header with Cycle Badge */}
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
            className="results-header-icon"
            aria-hidden="true"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <div>
            <h3 id={`reassessment-heading-${cycleNumber}`} className="card-title">
              {t.reassessmentSectionTitle}
            </h3>
            <p className="intake-section-desc">{t.reassessmentSectionSubtitle}</p>
          </div>
        </div>
        <span className="stage-status-badge reassessment-cycle-tag">
          {t.reassessmentCycleBadge} #{cycleNumber}
        </span>
      </div>

      {/* 2. Explicit Notice: No New Visual Inspection Occurred */}
      <div className="inspection-notice-banner" role="note">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="notice-icon"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p>{t.noNewVisualInspectionNotice}</p>
      </div>

      {/* 3. Safety Warnings from Reassessment */}
      {reassessment.safetyWarnings && reassessment.safetyWarnings.length > 0 && (
        <div className="results-safety-banner" role="alert">
          <div className="safety-banner-header">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="safety-banner-icon"
              aria-hidden="true"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <h4 className="safety-banner-title">{t.safetyWarningsTitle}</h4>
              <p className="safety-banner-subtitle">{t.safetyWarningsNotice}</p>
            </div>
          </div>
          <ul className="safety-warnings-list">
            {reassessment.safetyWarnings.map((warning, idx) => (
              <li key={`reassess-safety-${idx}`} className="safety-warning-item">
                <span className="safety-warning-bullet" aria-hidden="true">
                  ⚡
                </span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. Reassessment Summary */}
      <div className="results-executive-summary">
        <h4 className="section-subheading">{t.executiveSummaryTitle}</h4>
        <p className="summary-paragraph">{reassessment.summary}</p>
      </div>

      {/* 5. Evidence Synthesis */}
      <div className="evidence-synthesis-box">
        <div className="synthesis-header">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="synthesis-icon"
            aria-hidden="true"
          >
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <h4 className="synthesis-title">{t.evidenceSynthesisTitle}</h4>
        </div>
        <p className="synthesis-text">{reassessment.evidenceSynthesis}</p>
      </div>

      {/* 6. Revised Fault Hypotheses */}
      <div className="revised-hypotheses-container">
        <div className="container-header">
          <h4 className="container-title">{t.revisedHypothesesTitle}</h4>
          <p className="container-subtitle">{t.revisedHypothesesSubtitle}</p>
        </div>

        <div className="hypotheses-list">
          {reassessment.revisedHypotheses.map((hyp, idx) => (
            <article key={`rev-hyp-${idx}`} className="hypothesis-card revised-hypothesis-card">
              <div className="hypothesis-card-header">
                <div className="hypothesis-title-group">
                  <span className="hypothesis-rank" aria-hidden="true">
                    RH{idx + 1}
                  </span>
                  <h5 className="hypothesis-title">{hyp.title}</h5>
                </div>

                <div className="hypothesis-badges-cluster">
                  <span
                    className={`status-badge ${getStatusBadgeClass(hyp.status)}`}
                    title={`${t.hypothesisStatusLabel}: ${getStatusLabel(hyp.status)}`}
                  >
                    {getStatusLabel(hyp.status)}
                  </span>
                  <span
                    className={`confidence-badge ${getConfidenceBadgeClass(hyp.confidence)}`}
                    title={`${t.confidenceLabel}: ${getConfidenceLabel(hyp.confidence)}`}
                  >
                    {getConfidenceLabel(hyp.confidence)}
                  </span>
                </div>
              </div>

              <div className="hypothesis-body">
                {/* Change Explanation */}
                <div className="hypothesis-field">
                  <span className="meta-field-label">{t.hypothesisChangeExplanationLabel}:</span>
                  <p className="hypothesis-text">{hyp.explanationOfChange}</p>
                </div>

                {/* Evidence Citations with full resolution against evidenceLog */}
                {hyp.citingEvidenceIds && hyp.citingEvidenceIds.length > 0 && (
                  <div className="hypothesis-field citations-field">
                    <span className="meta-field-label">{t.citingEvidenceLabel}:</span>
                    <div className="citations-list">
                      {hyp.citingEvidenceIds.map((citeId) => {
                        const cited = evidenceLog.find((e) => e.id === citeId);
                        if (!cited) {
                          return (
                            <span key={citeId} className="citation-chip chip-unresolved">
                              <span className="chip-id" dir="ltr">{citeId}</span>
                              <span className="chip-note">({t.evidenceCitationRecordNotFound})</span>
                            </span>
                          );
                        }

                        return (
                          <div
                            key={citeId}
                            className="citation-card"
                            onClick={() => onSelectRecommendation?.(cited.targetRecommendationId)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                onSelectRecommendation?.(cited.targetRecommendationId);
                              }
                            }}
                          >
                            <div className="citation-header">
                              <span className="citation-step" aria-hidden="true">
                                #{cited.stepNumber}
                              </span>
                              <span className="citation-title">{cited.checkTitle}</span>
                              <span className={`outcome-pill ${getOutcomeBadgeClass(cited.outcome)}`}>
                                {getOutcomeLabel(cited.outcome)}
                              </span>
                            </div>
                            {cited.numericValue !== undefined && cited.measurementUnit && (
                              <div className="citation-measurement" dir="ltr">
                                <span className="citation-value">
                                  {cited.numericValue} {cited.measurementUnit}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Suggested Follow-up Verification if present */}
                {hyp.suggestedVerification && (
                  <div className="hypothesis-field verification-field">
                    <span className="meta-field-label">{t.hypothesisVerificationLabel}:</span>
                    <div className="verification-box">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="verification-icon"
                        aria-hidden="true"
                      >
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      <span>{hyp.suggestedVerification}</span>
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* 7. Reassessment Limitations */}
      {reassessment.limitations && reassessment.limitations.length > 0 && (
        <div className="limitations-container">
          <h4 className="section-subheading">{t.limitationsTitle}</h4>
          <ul className="limitations-list">
            {reassessment.limitations.map((limit, idx) => (
              <li key={`reassess-lim-${idx}`} className="limitation-item">
                {limit}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

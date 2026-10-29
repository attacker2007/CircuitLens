/**
 * CircuitLens Stage 4B-3 — Evidence Log View
 *
 * Displays a chronological, immutable ledger of all physical checks performed
 * and recorded by the technician during the active investigation.
 */

import type { Translations } from '../i18n';
import type { EvidenceRecord } from '../types/diagnosis';

interface EvidenceLogViewProps {
  evidenceLog: EvidenceRecord[];
  t: Translations;
  onSelectRecommendation?: (targetRecommendationId: string) => void;
}

export function EvidenceLogView({
  evidenceLog,
  t,
  onSelectRecommendation,
}: EvidenceLogViewProps) {
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

  // Build a set of superseded evidence IDs to mark historical attempts
  const supersededIds = new Set<string>();
  evidenceLog.forEach((rec) => {
    if (rec.supersedesEvidenceId) {
      supersededIds.add(rec.supersedesEvidenceId);
    }
  });

  return (
    <section
      className="card-panel evidence-log-panel"
      aria-labelledby="evidence-log-heading"
    >
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
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <path d="m9 14 2 2 4-4" />
          </svg>
          <h3 id="evidence-log-heading" className="card-title">
            {t.evidenceLogTitle}
          </h3>
        </div>
        <span className="stage-status-badge">
          {evidenceLog.length} {t.evidenceAttemptLabel}
          {evidenceLog.length === 1 ? '' : 's'}
        </span>
      </div>

      <p className="intake-section-desc">{t.evidenceLogSubtitle}</p>

      {evidenceLog.length === 0 ? (
        <div className="empty-log-state" role="status">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="empty-log-icon"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="empty-log-text">{t.noEvidenceLogged}</p>
        </div>
      ) : (
        <div className="evidence-records-list" role="feed" aria-label={t.evidenceLogTitle}>
          {evidenceLog.map((record, idx) => {
            const isSuperseded = supersededIds.has(record.id);

            return (
              <article
                key={record.id}
                className={`evidence-record-card ${isSuperseded ? 'record-superseded' : 'record-active'}`}
                aria-label={`${t.evidenceAttemptLabel} #${idx + 1}: ${record.checkTitle}`}
              >
                <div className="evidence-record-header">
                  <div className="evidence-title-group">
                    <span className="step-badge" aria-hidden="true">
                      #{record.stepNumber}
                    </span>
                    <div className="evidence-header-texts">
                      <h4 className="evidence-check-title">{record.checkTitle}</h4>
                      <span className="evidence-timestamp" dir="ltr">
                        {new Date(record.recordedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="evidence-badges-row">
                    {isSuperseded && (
                      <span className="superseded-badge" title={t.supersedesLabel}>
                        {t.supersedesLabel}
                      </span>
                    )}
                    <span
                      className={`outcome-pill ${getOutcomeBadgeClass(record.outcome)}`}
                    >
                      <span className="pill-dot" aria-hidden="true" />
                      <span>{getOutcomeLabel(record.outcome)}</span>
                    </span>
                  </div>
                </div>

                {/* Measured Quantity when provided */}
                {record.numericValue !== undefined && record.measurementUnit && (
                  <div className="evidence-measurement-row">
                    <span className="measurement-label">{t.measurementSectionTitle}:</span>
                    <span className="measurement-value tech-value" dir="ltr">
                      {record.numericValue} {record.measurementUnit}
                    </span>
                  </div>
                )}

                {/* Technician Notes when provided */}
                {record.technicianNotes && (
                  <div className="evidence-notes-row">
                    <span className="notes-label">{t.technicianNotesLabel}:</span>
                    <p className="notes-content">{record.technicianNotes}</p>
                  </div>
                )}

                {/* Supersession Trail Link */}
                {record.supersedesEvidenceId && (
                  <div className="supersession-trail-row">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="9 14 4 9 9 4" />
                      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                    </svg>
                    <span>
                      {t.supersedesLabel}:{' '}
                      <code className="mono">{record.supersedesEvidenceId}</code>
                    </span>
                  </div>
                )}

                {/* Re-open / Repeat Check Action */}
                {onSelectRecommendation && (
                  <div className="record-footer-actions">
                    <button
                      type="button"
                      className="repeat-check-btn"
                      onClick={() => onSelectRecommendation(record.targetRecommendationId)}
                    >
                      <span>{t.openCheckBtn}</span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

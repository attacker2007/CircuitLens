/**
 * CircuitLens Stage 6B-4B-3 — Evidence Timeline Component
 *
 * Chronological unified diagnostic timeline tracking intake, physical test evidence,
 * inconclusive results, superseded measurements, and model reassessment revisions.
 */

import type { Translations } from '../i18n';
import type { TimelineEvent, TimelineEventSource } from '../types/evolution';

interface EvidenceTimelineViewProps {
  events: TimelineEvent[];
  t: Translations;
  onFilterEvidence?: (evidenceId: string) => void;
}

export function EvidenceTimelineView({
  events,
  t,
  onFilterEvidence,
}: EvidenceTimelineViewProps) {
  const getSourceBadge = (source: TimelineEventSource) => {
    switch (source) {
      case 'ai':
        return {
          label: t.timelineSourceAi || 'AI-GENERATED',
          className: 'timeline-badge-ai',
        };
      case 'technician':
        return {
          label: t.timelineSourceTech || 'TECHNICIAN BENCH',
          className: 'timeline-badge-tech',
        };
      case 'system':
        return {
          label: t.timelineSourceSystem || 'SYSTEM METADATA',
          className: 'timeline-badge-system',
        };
    }
  };

  const formatTimestamp = (isoString: string | null): string => {
    if (!isoString) {
      return t.timelineTimestampMissing || 'Timestamp not recorded';
    }
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        return isoString;
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="card-panel evidence-timeline-panel" id="evidence-timeline" aria-labelledby="timeline-title">
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
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <div>
            <h3 id="timeline-title" className="card-title">
              {t.timelineTitle || 'Evidence & Diagnostic Timeline'}
            </h3>
            <p className="intake-section-desc">
              {t.timelineSubtitle || 'Chronological audit trail of physical bench checks, superseded measurements, and AI syntheses.'}
            </p>
          </div>
        </div>
        <span className="stage-status-badge timeline-events-count">
          {events.length} {t.timelineEventsLogged || 'Milestones'}
        </span>
      </div>

      <div className="timeline-rail-container">
        <ol className="timeline-list">
          {events.map((evt, idx) => {
            const sourceBadge = getSourceBadge(evt.source);
            const isSuperseded = evt.evidenceDetails?.isSuperseded ?? false;
            const isInconclusive = evt.evidenceDetails?.outcome === 'inconclusive';
            const isUnable = evt.evidenceDetails?.outcome === 'unable_to_perform';

            return (
              <li
                key={evt.id}
                className={`timeline-entry ${isSuperseded ? 'timeline-entry-superseded' : ''} ${
                  evt.eventType === 'initial_diagnosis' ? 'timeline-entry-initial' : ''
                } ${evt.eventType === 'reassessment_completed' ? 'timeline-entry-reassessment' : ''}`}
              >
                {/* Visual marker dot on rail */}
                <div className="timeline-marker" aria-hidden="true">
                  <span className={`timeline-dot dot-${evt.source}`} />
                  {idx < events.length - 1 && <div className="timeline-line" />}
                </div>

                {/* Timeline Card Content */}
                <div className="timeline-content-card">
                  <div className="timeline-card-header">
                    <div className="timeline-meta-row">
                      <span className={`timeline-source-pill ${sourceBadge.className}`}>
                        {sourceBadge.label}
                      </span>
                      <span className="timeline-cycle-tag">
                        {evt.cycleIndex === 0
                          ? (t.timelineInitialTag || 'Cycle R0 (Initial)')
                          : `Cycle R${evt.cycleIndex}`}
                      </span>
                      <time
                        className="timeline-timestamp"
                        dateTime={evt.timestamp || undefined}
                      >
                        {formatTimestamp(evt.timestamp)}
                      </time>
                    </div>

                    <h4 className="timeline-event-title">{evt.title}</h4>
                    {evt.subtitle && <p className="timeline-event-sub">{evt.subtitle}</p>}
                  </div>

                  {/* Initial Diagnosis / Reassessment Summary */}
                  {evt.summary && (
                    <div className="timeline-summary-box">
                      <p>{evt.summary}</p>
                    </div>
                  )}

                  {/* Physical Evidence Measurement Details */}
                  {evt.evidenceDetails && (
                    <div className={`timeline-evidence-box ${isSuperseded ? 'box-superseded' : ''}`}>
                      <div className="timeline-evidence-header">
                        <strong>
                          <code>{evt.evidenceDetails.evidenceId}</code>
                        </strong>

                        {/* Outcome Pill */}
                        <span className={`timeline-outcome-pill outcome-${evt.evidenceDetails.outcome}`}>
                          {evt.evidenceDetails.outcome.toUpperCase()}
                        </span>

                        {isSuperseded && (
                          <span className="timeline-superseded-warning">
                            ⚡ {t.timelineSupersededBadge || '[SUPERSEDED]'}
                            {evt.evidenceDetails.supersededByEvidenceId && (
                              <em> by {evt.evidenceDetails.supersededByEvidenceId}</em>
                            )}
                          </span>
                        )}

                        {isInconclusive && (
                          <span className="timeline-inconclusive-warning">
                            ⚠ {t.timelineInconclusiveNotice || 'Inconclusive outcome — does not prove or disprove hypotheses'}
                          </span>
                        )}

                        {isUnable && (
                          <span className="timeline-unable-warning">
                            ⚠ {t.timelineUnableNotice || 'Unable to perform check as specified'}
                          </span>
                        )}
                      </div>

                      {/* Exact Measurement Value & Units */}
                      {evt.evidenceDetails.numericValue !== null && evt.evidenceDetails.measurementUnit && (
                        <div className="timeline-measurement-row">
                          <span className="timeline-measurement-label">
                            {t.timelineRecordedMeasurement || 'Recorded Value'}:
                          </span>
                          <code className="timeline-measurement-value">
                            {evt.evidenceDetails.numericValue} {evt.evidenceDetails.measurementUnit}
                          </code>
                        </div>
                      )}

                      {/* Technician Notes */}
                      {evt.evidenceDetails.technicianNotes && (
                        <div className="timeline-tech-notes">
                          <em>"{evt.evidenceDetails.technicianNotes}"</em>
                        </div>
                      )}

                      {isSuperseded && evt.evidenceDetails.supersededByEvidenceId && (
                        <div className="timeline-superseded-pointer">
                          <button
                            type="button"
                            className="timeline-jump-btn"
                            onClick={() => onFilterEvidence?.(evt.evidenceDetails!.supersededByEvidenceId!)}
                          >
                            ↳ {t.timelineJumpToSuperseding || 'Jump to replacement attempt'}{' '}
                            <code>{evt.evidenceDetails.supersededByEvidenceId}</code>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hypothesis State Transitions in Reassessment */}
                  {evt.hypothesisChanges && evt.hypothesisChanges.length > 0 && (
                    <div className="timeline-changes-box">
                      <h5 className="timeline-changes-title">
                        {t.timelineHypothesisChangesTitle || 'Evaluated Hypothesis Shifts'}:
                      </h5>
                      <ul className="timeline-changes-list">
                        {evt.hypothesisChanges.map((hc, hIdx) => {
                          const statusChanged = hc.previousStatus !== hc.newStatus;
                          return (
                            <li key={`hc-${hIdx}`} className="timeline-change-item">
                              <span className="timeline-change-hyp">{hc.hypothesisTitle}</span>
                              <div className="timeline-change-shift">
                                <span className={`timeline-status-mini status-${hc.previousStatus}`}>
                                  {hc.previousStatus.toUpperCase()}
                                </span>
                                <span className="timeline-arrow" aria-hidden="true">→</span>
                                <span className={`timeline-status-mini status-${hc.newStatus} ${statusChanged ? 'status-shifted' : ''}`}>
                                  {hc.newStatus.toUpperCase()}
                                </span>
                                {hc.newConfidence && (
                                  <span className="timeline-conf-mini">
                                    ({hc.newConfidence.toUpperCase()})
                                  </span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Safety Warnings attached to milestone */}
                  {evt.safetyWarnings && evt.safetyWarnings.length > 0 && (
                    <div className="timeline-safety-box">
                      <span className="timeline-safety-label">⚡ {t.timelineSafetyAlert || 'Safety Precautions'}:</span>
                      <ul>
                        {evt.safetyWarnings.map((sw, sIdx) => (
                          <li key={`tsw-${sIdx}`}>{sw}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

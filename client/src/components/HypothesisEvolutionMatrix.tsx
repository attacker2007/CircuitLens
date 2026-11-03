/**
 * CircuitLens Stage 6B-4B-3 — Hypothesis Evolution Matrix Component
 *
 * Side-by-side comparative matrix tracking fault hypothesis plausibility,
 * confidence shifts, and evidence citations from initial diagnosis across
 * all subsequent reassessment rounds.
 */

import { useState } from 'react';
import type { Translations } from '../i18n';
import type { EvolutionHypothesisRow, RoundHypothesisStatus } from '../types/evolution';
import { extractAmbiguousHypothesisGroups } from '../utils/evolutionBuilder';

interface HypothesisEvolutionMatrixProps {
  rows: EvolutionHypothesisRow[];
  reassessmentCount: number;
  t: Translations;
  onSelectEvidence?: (evidenceId: string) => void;
}

export function HypothesisEvolutionMatrix({
  rows,
  reassessmentCount,
  t,
  onSelectEvidence,
}: HypothesisEvolutionMatrixProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getStatusBadgeClass = (status: RoundHypothesisStatus): string => {
    switch (status) {
      case 'supported':
        return 'matrix-badge-supported';
      case 'contradicted':
        return 'matrix-badge-contradicted';
      case 'unresolved':
        return 'matrix-badge-unresolved';
      case 'not_present':
        return 'matrix-badge-absent';
      case 'omitted':
        return 'matrix-badge-omitted';
      default:
        return 'matrix-badge-unresolved';
    }
  };

  const formatStatusLabel = (status: RoundHypothesisStatus): string => {
    switch (status) {
      case 'supported':
        return t.statusSupported || 'Supported';
      case 'contradicted':
        return t.statusContradicted || 'Contradicted';
      case 'unresolved':
        return t.statusUnresolved || 'Unresolved';
      case 'not_present':
        return t.matrixStatusNotPresent || '—';
      case 'omitted':
        return t.matrixStatusOmitted || 'Omitted';
      default:
        return status;
    }
  };

  const roundIndices: number[] = [];
  for (let r = 0; r <= reassessmentCount; r++) {
    roundIndices.push(r);
  }

  // Decouple ambiguous candidates from continuous matrix rows
  const trackedRows = rows.filter((r) => r.matchKind !== 'ambiguous_candidate');
  const ambiguousGroups = extractAmbiguousHypothesisGroups(rows);

  return (
    <div className="card-panel evolution-matrix-panel" id="hypothesis-evolution-matrix" aria-labelledby="matrix-title">
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
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
            <line x1="2" y1="20" x2="22" y2="20" />
          </svg>
          <div>
            <h3 id="matrix-title" className="card-title">
              {t.evolutionMatrixTitle || 'Hypothesis Evolution Matrix'}
            </h3>
            <p className="intake-section-desc">
              {t.evolutionMatrixSubtitle || 'Comparative tracking of fault candidates across initial diagnosis and all reassessment rounds.'}
            </p>
          </div>
        </div>
        <span className="stage-status-badge matrix-cycle-badge">
          {reassessmentCount === 0
            ? (t.matrixCycleInitialOnly || 'Initial Assessment (R0)')
            : `R0 → R${reassessmentCount} (${reassessmentCount} ${t.matrixCyclesLogged || 'Rounds'})`}
        </span>
      </div>

      {/* Epistemic Guardrail Notice */}
      <div className="evolution-epistemic-banner" role="note">
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
          {t.evolutionEpistemicNotice ||
            'Historical hypothesis assessments document remote AI visual deductions based on accumulated bench measurements. Supported hypotheses are analytical deductions, never physically confirmed root causes without component isolation.'}
          {' '}
          {t.heuristicTrackingExplanation}
          {' '}
          {t.heuristicNotConfirmedNotice}
        </p>
      </div>

      {/* Responsive Horizontal Scroll Matrix Table */}
      <div className="evolution-matrix-scroll-wrapper" tabIndex={0} role="region" aria-label="Hypothesis evolution matrix table">
        <table className="evolution-matrix-table">
          <thead>
            <tr>
              <th className="sticky-col matrix-col-title">
                {t.matrixColHypothesis || 'Fault Hypothesis Candidate'}
              </th>
              <th className="matrix-col-round">
                {t.matrixColInitial || 'Initial (R0)'}
              </th>
              {roundIndices.slice(1).map((r) => (
                <th key={`head-r-${r}`} className="matrix-col-round">
                  {t.matrixColRoundPrefix ? `${t.matrixColRoundPrefix} ${r}` : `Round ${r}`}
                </th>
              ))}
              <th className="matrix-col-current">
                {t.matrixColCurrent || 'Current State'}
              </th>
            </tr>
          </thead>
          <tbody>
            {trackedRows.length === 0 ? (
              <tr>
                <td colSpan={roundIndices.length + 2} className="matrix-cell-empty" style={{ textAlign: 'center', padding: '1.5rem' }}>
                  {ambiguousGroups.length > 0
                    ? (t.ambiguousMultipleCandidatesNotice || 'Candidates in this assessment are documented in the round-specific ambiguous groups below.')
                    : (t.noUnresolvedHypotheses || 'No tracked hypotheses recorded.')}
                </td>
              </tr>
            ) : (
              trackedRows.map((row) => {
                const isExpanded = expandedKeys.has(row.trackingKey);
                return (
                  <tr key={row.trackingKey} className="matrix-data-row">
                    {/* Sticky Hypothesis Candidate Cell */}
                    <td className="sticky-col matrix-cell-identity">
                      <div className="matrix-identity-content">
                        <strong className="matrix-hyp-title">{row.displayTitle}</strong>
                        {row.isReappearance && (
                          <span className="matrix-reappearance-tag" title={t.ambiguousReappearanceTooltip}>
                            ⚠ {t.ambiguousReappearanceBadge || 'Reappeared (Uncertain Identity)'}
                          </span>
                        )}
                        {row.isAmbiguous && !row.isReappearance && (
                          <span className="matrix-ambiguous-tag" title={t.ambiguousIdentityTooltip}>
                            ⚠ {t.ambiguousIdentityBadge || 'Ambiguous Identity'}
                          </span>
                        )}
                        {row.matchKind === 'title_matched_heuristic' && reassessmentCount > 0 && !row.isReappearance && !row.isAmbiguous && (
                          <span className="matrix-heuristic-tag" title={t.heuristicTitleMatchTooltip}>
                            ℹ {t.heuristicTitleMatchBadge || 'Title-Matched Track'}
                          </span>
                        )}
                        {row.introducedInRound > 0 && !row.isReappearance && (
                          <span className="matrix-introduced-tag">
                            {t.matrixIntroducedInPrefix || 'Introduced in'} R{row.introducedInRound}
                          </span>
                        )}
                        <button
                          type="button"
                          className="matrix-expand-btn"
                          onClick={() => toggleExpand(row.trackingKey)}
                          aria-expanded={isExpanded}
                          aria-label={`Toggle details for ${row.displayTitle}`}
                        >
                          {isExpanded ? (t.matrixHideDetails || 'Hide rationale') : (t.matrixShowDetails || 'View rationale')}
                          <span className={`matrix-chevron ${isExpanded ? 'open' : ''}`} aria-hidden="true">▾</span>
                        </button>
                      </div>

                      {isExpanded && row.initialReasoning && (
                        <div className="matrix-details-expanded">
                          <p className="matrix-expanded-reasoning">
                            <strong>{t.matrixInitialReasoningLabel || 'Initial Deduction'}:</strong> {row.initialReasoning}
                          </p>
                        </div>
                      )}
                    </td>

                    {/* Round Assessment Cells */}
                    {roundIndices.map((roundNum) => {
                      const assessment = row.roundAssessments[roundNum];
                      if (!assessment || assessment.status === 'not_present') {
                        return (
                          <td key={`cell-${row.trackingKey}-r-${roundNum}`} className="matrix-cell-round matrix-cell-empty">
                            <span className="matrix-absent-dash" title={t.matrixStatusNotPresent || '—'}>—</span>
                          </td>
                        );
                      }

                      if (assessment.status === 'omitted') {
                        return (
                          <td key={`cell-${row.trackingKey}-r-${roundNum}`} className="matrix-cell-round matrix-cell-omitted">
                            <span className="matrix-omitted-label">{t.matrixStatusOmitted || 'Omitted'}</span>
                          </td>
                        );
                      }

                      return (
                        <td key={`cell-${row.trackingKey}-r-${roundNum}`} className="matrix-cell-round">
                          <div className="matrix-cell-stack">
                            <span className={`matrix-status-pill ${getStatusBadgeClass(assessment.status)}`}>
                              {formatStatusLabel(assessment.status)}
                            </span>

                            {assessment.confidence && (
                              <div className="matrix-confidence-group">
                                <span className="matrix-conf-label">
                                  {assessment.confidence.toUpperCase()}
                                </span>
                                {assessment.confidenceDelta === 'increased' && (
                                  <span className="matrix-delta-pill delta-up" title={t.matrixDeltaUpTooltip || 'Confidence increased'}>↑</span>
                                )}
                                {assessment.confidenceDelta === 'decreased' && (
                                  <span className="matrix-delta-pill delta-down" title={t.matrixDeltaDownTooltip || 'Confidence decreased'}>↓</span>
                                )}
                                {assessment.confidenceDelta === 'unchanged' && (
                                  <span className="matrix-delta-pill delta-same" title={t.matrixDeltaSameTooltip || 'Confidence maintained'}>=</span>
                                )}
                              </div>
                            )}

                            {/* Citing Evidence Badges */}
                            {assessment.citingEvidenceIds.length > 0 && (
                              <div className="matrix-citations-group">
                                {assessment.citingEvidenceIds.map((evId) => (
                                  <button
                                    key={`cite-${roundNum}-${evId}`}
                                    type="button"
                                    className="matrix-cite-btn"
                                    onClick={() => onSelectEvidence?.(evId)}
                                    title={`${t.viewMeasurementRecordTooltip || 'View measurement record'} ${evId}`}
                                  >
                                    <code>{evId}</code>
                                  </button>
                                ))}
                              </div>
                            )}

                            {isExpanded && assessment.explanation && (
                              <div className="matrix-expanded-explanation">
                                <em>{assessment.explanation}</em>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Current Overall Assessment Cell */}
                    <td className="matrix-cell-current">
                      <div className="matrix-cell-stack">
                        <span className={`matrix-status-pill ${getStatusBadgeClass(row.currentStatus)}`}>
                          {formatStatusLabel(row.currentStatus)}
                        </span>
                        {row.currentConfidence && (
                          <div className="matrix-confidence-group">
                            <span className="matrix-conf-label">
                              {row.currentConfidence.toUpperCase()}
                            </span>
                            {row.overallConfidenceDelta === 'increased' && (
                              <span className="matrix-delta-pill delta-up" title={t.matrixOverallDeltaUpTooltip || 'Overall confidence increased'}>↑ {t.matrixDeltaUp || 'Shifted Up'}</span>
                            )}
                            {row.overallConfidenceDelta === 'decreased' && (
                              <span className="matrix-delta-pill delta-down" title={t.matrixOverallDeltaDownTooltip || 'Overall confidence decreased'}>↓ {t.matrixDeltaDown || 'Shifted Down'}</span>
                            )}
                          </div>
                        )}
                        <span className="matrix-evidence-count">
                          {row.allCitingEvidenceIds.length} {t.matrixCitationsCount || 'citations total'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Task 3 & 4: Visually Distinct Round-Specific Ambiguous Findings Section */}
      {ambiguousGroups.length > 0 && (
        <section className="ambiguous-groups-section" aria-labelledby="ambiguous-section-heading">
          <div className="ambiguous-groups-header">
            <h4 id="ambiguous-section-heading" className="ambiguous-groups-title">
              <span className="ambiguous-warning-icon" aria-hidden="true">⚠</span>
              {t.ambiguousGroupHeader || 'Round-Specific Ambiguous Candidates'}
            </h4>
            <p className="ambiguous-groups-subtitle">
              {t.ambiguousGroupSubtitle ||
                'These fault candidates share identical titles within the same round. They are documented independently without inferred cross-round continuity.'}
            </p>
          </div>

          <div className="ambiguous-groups-grid">
            {ambiguousGroups.map((group) => (
              <div key={group.groupId} className="ambiguous-group-card">
                <div className="ambiguous-group-card-header">
                  <span className="ambiguous-group-round-tag">
                    {group.roundNumber === 0
                      ? (t.matrixColInitial || 'Initial (R0)')
                      : `${t.matrixColRoundPrefix || 'Round'} ${group.roundNumber}`}
                  </span>
                  <strong className="ambiguous-group-title">{group.baseTitle}</strong>
                  <span className="ambiguous-group-notice-pill" title={t.ambiguousCannotEstablishAcrossRounds}>
                    {t.ambiguousIdentityBadge || 'Ambiguous Identity'}
                  </span>
                </div>

                <p className="ambiguous-group-notice-text">
                  {t.ambiguousNoTrendNotice || 'No confidence trend is shown because hypothesis identity across rounds is uncertain.'}
                </p>

                <div className="ambiguous-candidates-list">
                  {group.candidates.map((cand, cIdx) => (
                    <div key={cand.candidateId} className="ambiguous-candidate-item">
                      <div className="ambiguous-candidate-top">
                        <span className="ambiguous-candidate-index">#{cIdx + 1}</span>
                        <span className={`matrix-status-pill ${getStatusBadgeClass(cand.status)}`}>
                          {formatStatusLabel(cand.status)}
                        </span>
                        {cand.confidence && (
                          <span className="matrix-conf-label">
                            {cand.confidence.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {cand.explanation && (
                        <p className="ambiguous-candidate-explanation">
                          {cand.explanation}
                        </p>
                      )}
                      {cand.citingEvidenceIds.length > 0 && (
                        <div className="matrix-citations-group">
                          {cand.citingEvidenceIds.map((evId) => (
                            <button
                              key={`ambig-cite-${cand.candidateId}-${evId}`}
                              type="button"
                              className="matrix-cite-btn"
                              onClick={() => onSelectEvidence?.(evId)}
                              title={`${t.viewMeasurementRecordTooltip || 'View measurement record'} ${evId}`}
                            >
                              <code>{evId}</code>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

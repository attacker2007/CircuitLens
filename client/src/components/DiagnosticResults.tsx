import { useState, useMemo, useRef, useEffect } from 'react';
import type { Translations } from '../i18n';
import type {
  DiagnosisResponse,
  ConfidenceLevel,
  EvidenceRecord,
  InvestigationRecommendation,
  DiagnosisReassessmentRequest,
  DiagnosisReassessmentResponse,
  DiagnosticContextPayload,
} from '../types/diagnosis';
import type { IntakeFormValues } from '../types/intake';
import {
  generateInvestigationId,
  generateRecommendationId,
} from '../utils/evidenceValidation';
import {
  submitCircuitReassessment,
  DiagnosisClientError,
} from '../api/diagnosisClient';
import { EvidenceCapturePanel } from './EvidenceCapturePanel';
import { EvidenceLogView } from './EvidenceLogView';
import { ReassessmentResultsView } from './ReassessmentResultsView';

interface DiagnosticResultsProps {
  diagnosis: DiagnosisResponse;
  formData?: IntakeFormValues;
  t: Translations;
  onEditIntake: () => void;
  onNewInvestigation: () => void;
}

export function DiagnosticResults({
  diagnosis,
  formData,
  t,
  onEditIntake,
  onNewInvestigation,
}: DiagnosticResultsProps) {
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string | null>(null);
  const [evidenceLog, setEvidenceLog] = useState<EvidenceRecord[]>([]);

  // Investigation identity anchored to component state
  const [investigationId] = useState<string>(() => generateInvestigationId());

  // Subsequent cycle recommendations from reassessments
  const [subsequentRecommendations, setSubsequentRecommendations] = useState<InvestigationRecommendation[]>([]);

  // Reassessment workflow state
  const [reassessmentNotes, setReassessmentNotes] = useState<string>('');
  const [isReassessing, setIsReassessing] = useState<boolean>(false);
  const [reassessmentError, setReassessmentError] = useState<{
    title: string;
    message: string;
    isRetryable: boolean;
  } | null>(null);
  const [reassessments, setReassessments] = useState<DiagnosisReassessmentResponse[]>([]);
  const [reassessmentCycle, setReassessmentCycle] = useState<number>(0);

  // In-flight request controller to support clean cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up in-flight requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Stable recommendations mapping for initial diagnosis instance
  const initialRecommendations: InvestigationRecommendation[] = useMemo(() => {
    return diagnosis.recommendedChecks.map((check, idx) => ({
      targetRecommendationId: generateRecommendationId(
        investigationId,
        0,
        check.stepNumber ?? idx + 1,
        idx
      ),
      cycleIndex: 0,
      stepNumber: check.stepNumber ?? idx + 1,
      check,
    }));
  }, [diagnosis, investigationId]);

  // Combined recommendations across initial and all subsequent cycles
  const allRecommendations = useMemo(() => {
    return [...initialRecommendations, ...subsequentRecommendations];
  }, [initialRecommendations, subsequentRecommendations]);

  const handleSaveEvidence = (record: EvidenceRecord) => {
    setEvidenceLog((prev) => [...prev, record]);
  };

  const handleRequestReassessment = async () => {
    if (isReassessing) return;

    if (evidenceLog.length === 0) {
      setReassessmentError({
        title: t.reassessErrorTitle,
        message: t.noEvidenceForReassessmentNotice,
        isRetryable: false,
      });
      return;
    }

    if (evidenceLog.length > 20) {
      setReassessmentError({
        title: t.reassessErrorTitle,
        message: t.evidenceLimitExceededNotice.replace('{count}', String(evidenceLog.length)),
        isRetryable: false,
      });
      return;
    }

    if (reassessmentNotes.length > 1000) {
      setReassessmentError({
        title: t.reassessErrorTitle,
        message: 'Reassessment notes cannot exceed 1,000 characters.',
        isRetryable: false,
      });
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsReassessing(true);
    setReassessmentError(null);

    const diagnosticContext: DiagnosticContextPayload = {
      boardName: formData?.boardName?.trim() || undefined,
      expectedBehavior: formData?.expectedBehavior?.trim() || 'Circuit under diagnostic review',
      observedBehavior: formData?.observedBehavior?.trim() || 'Observed circuit anomalies',
      relevantComponents: formData?.relevantComponents?.trim() || undefined,
      additionalNotes: formData?.additionalNotes?.trim() || undefined,
      initialSummary: diagnosis.summary,
      visibleObservations: diagnosis.visibleObservations,
      initialHypotheses: diagnosis.hypotheses,
    };

    const requestPayload: DiagnosisReassessmentRequest = {
      diagnosticContext,
      evidence: evidenceLog,
      additionalTechnicianNotes: reassessmentNotes.trim() || undefined,
    };

    try {
      const response = await submitCircuitReassessment(requestPayload, controller.signal);

      if (controller.signal.aborted) {
        return;
      }

      const nextCycle = reassessmentCycle + 1;
      setReassessmentCycle(nextCycle);
      setReassessments((prev) => [...prev, response]);

      if (response.nextRecommendedChecks && response.nextRecommendedChecks.length > 0) {
        const newCycleRecs: InvestigationRecommendation[] = response.nextRecommendedChecks.map(
          (check, idx) => ({
            targetRecommendationId: generateRecommendationId(
              investigationId,
              nextCycle,
              check.stepNumber ?? idx + 1,
              idx
            ),
            cycleIndex: nextCycle,
            stepNumber: check.stepNumber ?? idx + 1,
            check,
          })
        );
        setSubsequentRecommendations((prev) => [...prev, ...newCycleRecs]);
      }

      setReassessmentNotes('');
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return;
      }

      if (err instanceof DiagnosisClientError) {
        if (err.errorType === 'CANCELLED' || err.statusCode === 499) {
          return;
        }
        let userMessage = err.message;
        if (err.errorType === 'OUTPUT_TOKEN_LIMIT') {
          userMessage = t.outputLimitErrorNotice;
        } else if (err.errorType === 'INVALID_MODEL_OUTPUT') {
          userMessage = t.invalidOutputErrorNotice;
        } else if (err.errorType === 'SCHEMA_VALIDATION_ERROR') {
          userMessage = t.schemaValidationErrorNotice;
        } else if (err.errorType === 'MODEL_REFUSAL') {
          userMessage = t.modelRefusalErrorNotice;
        }
        setReassessmentError({
          title: t.reassessErrorTitle,
          message: userMessage,
          isRetryable: err.isRetryable,
        });
      } else {
        setReassessmentError({
          title: t.reassessErrorTitle,
          message: t.genericErrorNotice,
          isRetryable: true,
        });
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsReassessing(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleCancelReassessment = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsReassessing(false);
    setReassessmentError(null);
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

  return (
    <div className="diagnosis-results-root" role="region" aria-labelledby="results-main-heading">
      {/* Results Header Panel */}
      <div className="card-panel results-summary-panel">
        <div className="card-header">
          <div className="card-title-group">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="results-header-icon"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <h2 id="results-main-heading" className="card-title">
              {t.resultsSectionTitle}
            </h2>
          </div>
          <span className="stage-status-badge results-badge">{t.resultsBadge}</span>
        </div>
        <p className="intake-section-desc">{t.resultsSectionSubtitle}</p>

        {/* 1. Mandatory Critical Safety Warning Banner (Always visible at top) */}
        {diagnosis.safetyWarnings && diagnosis.safetyWarnings.length > 0 && (
          <div
            className="results-safety-banner"
            role="alert"
            aria-labelledby="safety-warnings-heading"
          >
            <div className="safety-banner-header">
              <svg
                width="22"
                height="22"
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
                <h3 id="safety-warnings-heading" className="safety-banner-title">
                  {t.safetyWarningsTitle}
                </h3>
                <p className="safety-banner-subtitle">{t.safetyWarningsNotice}</p>
              </div>
            </div>
            <ul className="safety-warnings-list">
              {diagnosis.safetyWarnings.map((warning, idx) => (
                <li key={`safety-${idx}`} className="safety-warning-item">
                  <span className="safety-warning-bullet" aria-hidden="true">
                    ⚡
                  </span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 2. Executive Summary */}
        <div className="results-executive-summary" aria-labelledby="summary-heading">
          <h3 id="summary-heading" className="section-subheading">
            {t.executiveSummaryTitle}
          </h3>
          <p className="summary-paragraph">{diagnosis.summary}</p>
        </div>
      </div>

      {/* 3. Direct Optical Observations */}
      <section className="card-panel" aria-labelledby="observations-heading">
        <div className="card-header">
          <div className="card-title-group">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="section-icon"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            </svg>
            <h3 id="observations-heading" className="card-title">
              {t.visibleObservationsTitle}
            </h3>
          </div>
        </div>
        <p className="intake-section-desc">{t.visibleObservationsSubtitle}</p>

        <div className="observations-grid">
          {diagnosis.visibleObservations.map((obs, idx) => (
            <article key={`obs-${idx}`} className="observation-card">
              <div className="observation-card-header">
                <span className="observation-index" aria-hidden="true">
                  #{idx + 1}
                </span>
                <span
                  className={`confidence-badge ${getConfidenceBadgeClass(obs.confidence)}`}
                  title={`${t.confidenceLabel}: ${getConfidenceLabel(obs.confidence)}`}
                >
                  {getConfidenceLabel(obs.confidence)}
                </span>
              </div>
              <p className="observation-description">{obs.description}</p>
              <div className="observation-evidence-box">
                <span className="meta-field-label">{t.observationEvidenceLabel}:</span>
                <p className="evidence-text">{obs.evidence}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. Fault Hypotheses & Inferred Mechanisms */}
      <section className="card-panel" aria-labelledby="hypotheses-heading">
        <div className="card-header">
          <div className="card-title-group">
            <svg
              width="20"
              height="20"
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
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <h3 id="hypotheses-heading" className="card-title">
              {t.hypothesesTitle}
            </h3>
          </div>
        </div>
        <p className="intake-section-desc">{t.hypothesesSubtitle}</p>

        <div className="hypotheses-list">
          {diagnosis.hypotheses.map((hyp, idx) => (
            <article key={`hyp-${idx}`} className="hypothesis-card">
              <div className="hypothesis-card-header">
                <div className="hypothesis-title-group">
                  <span className="hypothesis-rank" aria-hidden="true">
                    H{idx + 1}
                  </span>
                  <h4 className="hypothesis-title">{hyp.title}</h4>
                </div>
                <span
                  className={`confidence-badge ${getConfidenceBadgeClass(hyp.confidence)}`}
                  title={`${t.confidenceLabel}: ${getConfidenceLabel(hyp.confidence)}`}
                >
                  {getConfidenceLabel(hyp.confidence)}
                </span>
              </div>

              <div className="hypothesis-body">
                <div className="hypothesis-field">
                  <span className="meta-field-label">{t.hypothesisReasoningLabel}</span>
                  <p className="hypothesis-text">{hyp.reasoning}</p>
                </div>

                {hyp.supportingEvidence && hyp.supportingEvidence.length > 0 && (
                  <div className="hypothesis-field">
                    <span className="meta-field-label">{t.hypothesisEvidenceLabel}</span>
                    <ul className="hypothesis-evidence-list">
                      {hyp.supportingEvidence.map((ev, eIdx) => (
                        <li key={`ev-${eIdx}`} className="hypothesis-evidence-item">
                          {ev}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="hypothesis-field verification-field">
                  <span className="meta-field-label">{t.hypothesisVerificationLabel}</span>
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
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 5. Prioritized Safe Troubleshooting Sequence */}
      <section className="card-panel" aria-labelledby="checks-heading">
        <div className="card-header">
          <div className="card-title-group">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="section-icon"
              aria-hidden="true"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <h3 id="checks-heading" className="card-title">
              {t.recommendedChecksTitle}
            </h3>
          </div>
        </div>
        <p className="intake-section-desc">{t.recommendedChecksSubtitle}</p>

        <div className="checks-list">
          {allRecommendations.map((rec) => {
            const check = rec.check;
            const checkEvidence = evidenceLog.filter(
              (e) => e.targetRecommendationId === rec.targetRecommendationId
            );
            const isTested = checkEvidence.length > 0;
            const isSelected = selectedRecommendationId === rec.targetRecommendationId;

            return (
              <article
                key={rec.targetRecommendationId}
                id={`check-${rec.targetRecommendationId}`}
                className={`check-card ${isSelected ? 'check-card-selected' : ''}`}
              >
                <div className="check-card-header">
                  <div className="check-step-badge">
                    {rec.cycleIndex > 0 ? (
                      <span className="step-cycle-tag" dir="ltr">R{rec.cycleIndex}</span>
                    ) : (
                      <span className="step-label">{t.checkStepLabel}</span>
                    )}
                    <span className="step-number" dir="ltr">
                      {rec.stepNumber}
                    </span>
                  </div>
                  <div className="check-header-info">
                    <div className="check-title-row">
                      <h4 className="check-title">{check.title}</h4>
                      <span
                        className={`check-status-badge ${
                          isTested ? 'status-tested' : 'status-untested'
                        }`}
                      >
                        {isTested
                          ? `${t.checkStatusTested} (${checkEvidence.length})`
                          : t.checkStatusUntested}
                      </span>
                    </div>
                    <div className="check-tags-row">
                      <span className="check-type-badge">{check.testType}</span>
                      {check.toolsNeeded && check.toolsNeeded.length > 0 && (
                        <div className="check-tools-group" aria-label={t.checkToolsLabel}>
                          {check.toolsNeeded.map((tool, tIdx) => (
                            <span key={`tool-${tIdx}`} className="tool-chip">
                              {tool}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="check-toggle-col">
                    <button
                      type="button"
                      className={`action-btn check-perform-btn ${
                        isSelected ? 'check-btn-active' : 'secondary-btn'
                      }`}
                      onClick={() =>
                        setSelectedRecommendationId(
                          isSelected ? null : rec.targetRecommendationId
                        )
                      }
                      aria-expanded={isSelected}
                      aria-controls={`evidence-panel-${rec.targetRecommendationId}`}
                    >
                      {isSelected ? t.closeCheckBtn : t.openCheckBtn}
                    </button>
                  </div>
                </div>

                <div className="check-card-body">
                  <div className="check-field">
                    <span className="meta-field-label">{t.checkProcedureLabel}</span>
                    <p className="procedure-text">{check.procedure}</p>
                  </div>

                  <div className="check-field expected-result-field">
                    <span className="meta-field-label">{t.checkExpectedResultLabel}</span>
                    <div className="expected-result-box">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="ok-icon"
                        aria-hidden="true"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span>{check.expectedResult}</span>
                    </div>
                  </div>

                  {check.safetyNotes && check.safetyNotes.length > 0 && (
                    <div className="check-field safety-notes-field">
                      <span className="meta-field-label">{t.checkSafetyNotesLabel}</span>
                      <ul className="step-safety-list">
                        {check.safetyNotes.map((sn, snIdx) => (
                          <li key={`sn-${snIdx}`} className="step-safety-item">
                            {sn}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {isSelected && (
                  <div
                    id={`evidence-panel-${rec.targetRecommendationId}`}
                    className="check-evidence-panel-container"
                  >
                    <EvidenceCapturePanel
                      recommendation={rec}
                      evidenceLog={evidenceLog}
                      t={t}
                      onSaveEvidence={handleSaveEvidence}
                      onClose={() => setSelectedRecommendationId(null)}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* 6. Physical Evidence Ledger / Investigation History */}
      <EvidenceLogView
        evidenceLog={evidenceLog}
        t={t}
        onSelectRecommendation={(id) => {
          setSelectedRecommendationId(id);
          const element = document.getElementById(`check-${id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }}
      />

      {/* 7. Evidence-Driven Reassessment Action & Controls */}
      <section className="card-panel reassessment-control-panel" aria-labelledby="reassessment-ctrl-heading">
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
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <div>
              <h3 id="reassessment-ctrl-heading" className="card-title">
                {t.reassessButton}
              </h3>
              <p className="intake-section-desc">{t.reassessmentSectionSubtitle}</p>
            </div>
          </div>
          {reassessments.length > 0 && (
            <span className="stage-status-badge reassessment-cycle-tag">
              {t.reassessmentCycleBadge} #{reassessments.length}
            </span>
          )}
        </div>

        {/* Informational Readiness & Limit Banners */}
        {evidenceLog.length === 0 ? (
          <div className="reassessment-notice-banner warning" role="status">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{t.noEvidenceForReassessmentNotice}</p>
          </div>
        ) : evidenceLog.length > 20 ? (
          <div className="reassessment-notice-banner error" role="alert">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p>{t.evidenceLimitExceededNotice.replace('{count}', String(evidenceLog.length))}</p>
          </div>
        ) : (
          <div className="reassessment-notice-banner ready" role="status">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p>
              {t.reassessmentReadyNotice} ({evidenceLog.length} / 20 {t.totalAttemptsLabel})
            </p>
          </div>
        )}

        {/* Optional Additional Technician Notes */}
        <div className="reassessment-notes-group">
          <div className="label-with-counter">
            <label htmlFor="reassessment-tech-notes" className="field-label">
              {t.reassessmentNotesLabel}
            </label>
            <span
              className={`char-counter ${
                reassessmentNotes.length > 1000 ? 'counter-err' : ''
              }`}
            >
              {reassessmentNotes.length} / 1000
            </span>
          </div>
          <textarea
            id="reassessment-tech-notes"
            className="text-area"
            rows={3}
            placeholder={t.reassessmentNotesPlaceholder}
            value={reassessmentNotes}
            maxLength={1100}
            disabled={isReassessing}
            onChange={(e) => setReassessmentNotes(e.target.value)}
          />
        </div>

        {/* Error Display with Retry */}
        {reassessmentError && (
          <div className="reassessment-error-banner" role="alert">
            <div className="error-banner-header">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <strong>{reassessmentError.title}</strong>
            </div>
            <p>{reassessmentError.message}</p>
          </div>
        )}

        {/* Loading Indicator */}
        {isReassessing && (
          <div className="reassessment-loading-box" role="status" aria-live="polite">
            <span className="spinner-ring" aria-hidden="true" />
            <div className="loading-texts">
              <h4 className="loading-title">{t.reassessingProgressTitle}</h4>
              <p className="loading-subtitle">{t.reassessingProgressSubtitle}</p>
            </div>
            <button
              type="button"
              className="action-btn secondary-btn cancel-reassessment-btn"
              onClick={handleCancelReassessment}
              aria-label={t.cancelReassessmentBtn}
            >
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>{t.cancelReassessmentBtn}</span>
            </button>
          </div>
        )}

        {/* Action Button */}
        <div className="reassessment-actions-bar">
          <button
            type="button"
            className="action-btn primary-btn reassess-submit-btn"
            disabled={isReassessing || evidenceLog.length === 0 || evidenceLog.length > 20}
            onClick={handleRequestReassessment}
          >
            {isReassessing ? (
              <>
                <span className="spinner-inline" aria-hidden="true" />
                <span>{t.reassessingProgressTitle}</span>
              </>
            ) : reassessmentError?.isRetryable ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>{t.retryReassessmentBtn}</span>
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <span>{t.reassessButton}</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* 8. Reassessment Reports (rendered for each cycle) */}
      {reassessments.map((reassessment, rIdx) => (
        <ReassessmentResultsView
          key={`reassessment-round-${rIdx + 1}`}
          reassessment={reassessment}
          evidenceLog={evidenceLog}
          cycleNumber={rIdx + 1}
          t={t}
          onSelectRecommendation={(id) => {
            setSelectedRecommendationId(id);
            const el = document.getElementById(`check-${id}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }}
        />
      ))}

      {/* 6. Limitations & Uncertainties */}
      {diagnosis.limitations && diagnosis.limitations.length > 0 && (
        <section className="card-panel limitations-panel" aria-labelledby="limitations-heading">
          <div className="card-header">
            <div className="card-title-group">
              <svg
                width="18"
                height="18"
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
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              <h3 id="limitations-heading" className="card-title">
                {t.limitationsTitle}
              </h3>
            </div>
          </div>
          <p className="intake-section-desc">{t.limitationsSubtitle}</p>
          <ul className="limitations-list">
            {diagnosis.limitations.map((limitation, idx) => (
              <li key={`lim-${idx}`} className="limitation-item">
                {limitation}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 7. Disclaimer Notice */}
      <div className="results-disclaimer" role="note">
        <svg
          width="18"
          height="18"
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
        <p>{t.disclaimerNotice}</p>
      </div>

      {/* 8. Results Action Footer */}
      <div className="results-actions-bar">
        <button
          type="button"
          className="action-btn secondary-btn"
          onClick={onEditIntake}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span>{t.editSymptomsBtn}</span>
        </button>

        <button
          type="button"
          className="action-btn outline-btn"
          onClick={onNewInvestigation}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
          <span>{t.newInvestigationBtn}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * CircuitLens Stage 4B-3 — Evidence Capture Panel
 *
 * Displays procedure, tools, expected results, and safety precautions for
 * the selected diagnostic check, and allows the technician to record an empirical outcome.
 */

import { useState, useEffect, type FormEvent } from 'react';
import type { Translations } from '../i18n';
import type {
  CheckOutcome,
  EvidenceRecord,
  InvestigationRecommendation,
} from '../types/diagnosis';
import {
  validateEvidenceForm,
  generateEvidenceId,
  type EvidenceFormValues,
  type EvidenceValidationErrors,
} from '../utils/evidenceValidation';

interface EvidenceCapturePanelProps {
  recommendation: InvestigationRecommendation;
  evidenceLog: EvidenceRecord[];
  t: Translations;
  onSaveEvidence: (record: EvidenceRecord) => void;
  onClose: () => void;
}

export function EvidenceCapturePanel({
  recommendation,
  evidenceLog,
  t,
  onSaveEvidence,
  onClose,
}: EvidenceCapturePanelProps) {
  const { check, stepNumber, targetRecommendationId, cycleIndex } = recommendation;

  // Find previous attempts for this specific recommendation in the current investigation
  const priorAttempts = evidenceLog.filter(
    (e) => e.targetRecommendationId === targetRecommendationId
  );
  const latestPriorAttempt = priorAttempts.length > 0 ? priorAttempts[priorAttempts.length - 1] : null;

  // Form state
  const [formValues, setFormValues] = useState<EvidenceFormValues>({
    outcome: '',
    numericValueStr: '',
    measurementUnit: '',
    technicianNotes: '',
    supersedePriorAttempt: Boolean(latestPriorAttempt),
  });

  const [errors, setErrors] = useState<EvidenceValidationErrors>({});
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Synchronize supersede default if prior attempts change
  useEffect(() => {
    if (latestPriorAttempt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormValues((prev) => ({ ...prev, supersedePriorAttempt: true }));
    }
  }, [latestPriorAttempt]);

  const handleOutcomeSelect = (outcome: CheckOutcome) => {
    setFormValues((prev) => ({ ...prev, outcome }));
    if (errors.outcome) {
      setErrors((prev) => ({ ...prev, outcome: undefined }));
    }
  };

  const handleInputChange = (
    field: keyof EvidenceFormValues,
    value: string | boolean
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));

    // Clear field-specific error as user types
    if (field === 'numericValueStr' || field === 'measurementUnit') {
      if (errors.numericValue || errors.measurementUnit) {
        setErrors((prev) => ({
          ...prev,
          numericValue: undefined,
          measurementUnit: undefined,
        }));
      }
    } else if (field === 'technicianNotes' && errors.technicianNotes) {
      setErrors((prev) => ({ ...prev, technicianNotes: undefined }));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const { valid, errors: validationErrors, parsedNumericValue } = validateEvidenceForm(
      formValues,
      t
    );

    if (!valid || !formValues.outcome) {
      setErrors(validationErrors);
      return;
    }

    const newRecord: EvidenceRecord = {
      id: generateEvidenceId(),
      targetRecommendationId,
      cycleIndex,
      stepNumber,
      checkTitle: check.title,
      outcome: formValues.outcome,
      numericValue: parsedNumericValue,
      measurementUnit: parsedNumericValue !== undefined ? formValues.measurementUnit.trim() : undefined,
      technicianNotes: formValues.technicianNotes.trim() || undefined,
      recordedAt: new Date().toISOString(),
      supersedesEvidenceId:
        formValues.supersedePriorAttempt && latestPriorAttempt
          ? latestPriorAttempt.id
          : undefined,
    };

    onSaveEvidence(newRecord);
    setSaveSuccessNotice(true);

    // Reset inputs for potential next check execution while keeping panel feedback clean
    setFormValues({
      outcome: '',
      numericValueStr: '',
      measurementUnit: '',
      technicianNotes: '',
      supersedePriorAttempt: false,
    });
    setErrors({});

    setTimeout(() => {
      setSaveSuccessNotice(false);
    }, 3000);
  };

  return (
    <div
      className="card-panel evidence-capture-panel"
      role="region"
      aria-labelledby="capture-panel-heading"
    >
      <div className="card-header capture-panel-header">
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
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <h3 id="capture-panel-heading" className="card-title">
            {t.selectedCheckHeading} #{stepNumber}
          </h3>
        </div>
        <button
          type="button"
          className="action-btn secondary-btn close-panel-btn"
          onClick={onClose}
          aria-label={t.closeCheckBtn}
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span>{t.closeCheckBtn}</span>
        </button>
      </div>

      {/* Non-mandatory Guidance Disclaimer */}
      <div className="guidance-advisory-banner" role="note">
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
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p>{t.nonMandatoryNotice}</p>
      </div>

      {/* Check Specification Details */}
      <div className="selected-check-details">
        <h4 className="selected-check-title">{check.title}</h4>
        <div className="check-tags-row">
          <span className="check-type-badge">{check.testType}</span>
          {check.toolsNeeded && check.toolsNeeded.length > 0 && (
            <div className="check-tools-group" aria-label={t.checkToolsLabel}>
              {check.toolsNeeded.map((tool, idx) => (
                <span key={`tool-${idx}`} className="tool-chip">
                  {tool}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Procedure */}
        <div className="check-field detail-field">
          <span className="meta-field-label">{t.checkProcedureLabel}:</span>
          <p className="procedure-text">
            {check.procedure || t.noProcedureDetails}
          </p>
        </div>

        {/* Expected Result */}
        {check.expectedResult && (
          <div className="check-field detail-field">
            <span className="meta-field-label">{t.checkExpectedResultLabel}:</span>
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
        )}

        {/* Specific Safety Notes for this step */}
        {check.safetyNotes && check.safetyNotes.length > 0 && (
          <div className="check-field detail-field">
            <span className="meta-field-label">{t.checkSafetyNotesLabel}:</span>
            <ul className="step-safety-list">
              {check.safetyNotes.map((note, idx) => (
                <li key={`sn-${idx}`} className="step-safety-item">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Prior Attempts Notice for this Recommendation */}
      {priorAttempts.length > 0 && (
        <div className="prior-attempts-box" role="status">
          <span className="prior-attempts-badge">
            {priorAttempts.length} {t.totalAttemptsLabel}
          </span>
          <p className="prior-attempts-text">
            {t.evidenceAttemptLabel} #{priorAttempts.length}:{' '}
            <strong>{latestPriorAttempt?.outcome.toUpperCase()}</strong>
            {latestPriorAttempt?.numericValue !== undefined &&
              ` (${latestPriorAttempt.numericValue} ${latestPriorAttempt.measurementUnit || ''})`}
          </p>
        </div>
      )}

      {/* Recording Form */}
      <form onSubmit={handleSubmit} className="evidence-record-form" noValidate>
        <div className="form-section-header">
          <h4 className="form-heading">{t.recordEvidenceTitle}</h4>
          <p className="form-subheading">{t.recordEvidenceSubtitle}</p>
        </div>

        {/* Outcome Selector Radio Group */}
        <fieldset className="outcome-fieldset">
          <legend className="fieldset-legend">
            <span>{t.outcomeLabel}</span>
            <span className="required-indicator">*</span>
          </legend>

          {errors.outcome && (
            <p className="field-error-msg" role="alert">
              {errors.outcome}
            </p>
          )}

          <div
            className="outcome-options-grid"
            role="radiogroup"
            aria-label={t.outcomeLabel}
          >
            {/* 1. Passed */}
            <label
              className={`outcome-card ${formValues.outcome === 'passed' ? 'selected passed' : ''}`}
            >
              <input
                type="radio"
                name="checkOutcome"
                value="passed"
                checked={formValues.outcome === 'passed'}
                onChange={() => handleOutcomeSelect('passed')}
                className="visually-hidden"
              />
              <div className="outcome-card-header">
                <span className="outcome-indicator-dot dot-passed" aria-hidden="true" />
                <span className="outcome-card-title">{t.outcomePassedLabel}</span>
              </div>
              <p className="outcome-card-desc">{t.outcomePassedDesc}</p>
            </label>

            {/* 2. Failed */}
            <label
              className={`outcome-card ${formValues.outcome === 'failed' ? 'selected failed' : ''}`}
            >
              <input
                type="radio"
                name="checkOutcome"
                value="failed"
                checked={formValues.outcome === 'failed'}
                onChange={() => handleOutcomeSelect('failed')}
                className="visually-hidden"
              />
              <div className="outcome-card-header">
                <span className="outcome-indicator-dot dot-failed" aria-hidden="true" />
                <span className="outcome-card-title">{t.outcomeFailedLabel}</span>
              </div>
              <p className="outcome-card-desc">{t.outcomeFailedDesc}</p>
            </label>

            {/* 3. Inconclusive */}
            <label
              className={`outcome-card ${formValues.outcome === 'inconclusive' ? 'selected inconclusive' : ''}`}
            >
              <input
                type="radio"
                name="checkOutcome"
                value="inconclusive"
                checked={formValues.outcome === 'inconclusive'}
                onChange={() => handleOutcomeSelect('inconclusive')}
                className="visually-hidden"
              />
              <div className="outcome-card-header">
                <span className="outcome-indicator-dot dot-inconclusive" aria-hidden="true" />
                <span className="outcome-card-title">{t.outcomeInconclusiveLabel}</span>
              </div>
              <p className="outcome-card-desc">{t.outcomeInconclusiveDesc}</p>
            </label>

            {/* 4. Unable to Perform */}
            <label
              className={`outcome-card ${formValues.outcome === 'unable_to_perform' ? 'selected unable' : ''}`}
            >
              <input
                type="radio"
                name="checkOutcome"
                value="unable_to_perform"
                checked={formValues.outcome === 'unable_to_perform'}
                onChange={() => handleOutcomeSelect('unable_to_perform')}
                className="visually-hidden"
              />
              <div className="outcome-card-header">
                <span className="outcome-indicator-dot dot-unable" aria-hidden="true" />
                <span className="outcome-card-title">{t.outcomeUnableLabel}</span>
              </div>
              <p className="outcome-card-desc">{t.outcomeUnableDesc}</p>
            </label>
          </div>
        </fieldset>

        {/* Optional Measurements Row */}
        <div className="measurement-inputs-row">
          <div className="input-group val-input-group">
            <label htmlFor="evidence-numeric-value" className="field-label">
              {t.numericValueLabel}
            </label>
            <input
              id="evidence-numeric-value"
              type="text"
              inputMode="decimal"
              className={`text-input ${errors.numericValue ? 'input-err' : ''}`}
              placeholder={t.numericValuePlaceholder}
              value={formValues.numericValueStr}
              onChange={(e) => handleInputChange('numericValueStr', e.target.value)}
              aria-describedby={errors.numericValue ? 'numeric-error-msg' : undefined}
            />
            {errors.numericValue && (
              <p id="numeric-error-msg" className="field-error-msg" role="alert">
                {errors.numericValue}
              </p>
            )}
          </div>

          <div className="input-group unit-input-group">
            <label htmlFor="evidence-measurement-unit" className="field-label">
              {t.measurementUnitLabel}
            </label>
            <input
              id="evidence-measurement-unit"
              type="text"
              className={`text-input ${errors.measurementUnit ? 'input-err' : ''}`}
              placeholder={t.measurementUnitPlaceholder}
              value={formValues.measurementUnit}
              maxLength={20}
              onChange={(e) => handleInputChange('measurementUnit', e.target.value)}
              aria-describedby={errors.measurementUnit ? 'unit-error-msg' : undefined}
            />
            {errors.measurementUnit && (
              <p id="unit-error-msg" className="field-error-msg" role="alert">
                {errors.measurementUnit}
              </p>
            )}
          </div>
        </div>

        {/* Optional Technician Observations Notes */}
        <div className="input-group">
          <div className="label-with-counter">
            <label htmlFor="evidence-technician-notes" className="field-label">
              {t.technicianNotesLabel}
            </label>
            <span
              className={`char-counter ${
                formValues.technicianNotes.length > 500 ? 'counter-err' : ''
              }`}
            >
              {formValues.technicianNotes.length} / 500
            </span>
          </div>
          <textarea
            id="evidence-technician-notes"
            className={`text-area ${errors.technicianNotes ? 'input-err' : ''}`}
            rows={3}
            placeholder={t.technicianNotesPlaceholder}
            value={formValues.technicianNotes}
            maxLength={600}
            onChange={(e) => handleInputChange('technicianNotes', e.target.value)}
            aria-describedby={errors.technicianNotes ? 'notes-error-msg' : undefined}
          />
          {errors.technicianNotes && (
            <p id="notes-error-msg" className="field-error-msg" role="alert">
              {errors.technicianNotes}
            </p>
          )}
        </div>

        {/* Supersede Checkbox for Repeated Attempts */}
        {latestPriorAttempt && (
          <div className="supersede-checkbox-group">
            <label className="checkbox-label" htmlFor="supersede-checkbox">
              <input
                id="supersede-checkbox"
                type="checkbox"
                className="custom-checkbox"
                checked={formValues.supersedePriorAttempt}
                onChange={(e) => handleInputChange('supersedePriorAttempt', e.target.checked)}
              />
              <span className="checkbox-text">{t.supersedeOptionLabel}</span>
            </label>
            <p className="checkbox-hint-text">{t.supersedeOptionDesc}</p>
          </div>
        )}

        {/* Success Notice */}
        {saveSuccessNotice && (
          <div className="save-success-banner" role="status">
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
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{t.evidenceRecordedNotice}</span>
          </div>
        )}

        {/* Actions Bar */}
        <div className="form-actions-row">
          <button
            type="submit"
            className="action-btn primary-btn save-evidence-btn"
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
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>{t.saveEvidenceBtn}</span>
          </button>

          <button
            type="button"
            className="action-btn secondary-btn"
            onClick={onClose}
          >
            <span>{t.closeCheckBtn}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

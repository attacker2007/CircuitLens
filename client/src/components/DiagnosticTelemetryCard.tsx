/**
 * CircuitLens Stage 6B-3 — Diagnostic Telemetry Card Component
 *
 * Renders a compact, trustworthy operational panel displaying AI inference metrics:
 * provider, model, latency, token consumption, and estimated request cost.
 *
 * Keeps core diagnostic findings visually dominant by defaulting to a clean,
 * expandable disclosure layout with accessible summary metrics.
 */

import { useState } from 'react';
import type { Translations } from '../i18n';
import type { ModelCompletionMetadata } from '../types/diagnosis';
import {
  formatTokenCount,
  formatLatency,
  formatCostUsd,
  formatProviderName,
} from '../utils/telemetryFormatters';

interface DiagnosticTelemetryCardProps {
  telemetry?: ModelCompletionMetadata;
  title: string;
  t: Translations;
  defaultExpanded?: boolean;
}

export function DiagnosticTelemetryCard({
  telemetry,
  title,
  t,
  defaultExpanded = false,
}: DiagnosticTelemetryCardProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  // If no telemetry object exists at all
  if (!telemetry) {
    return (
      <div className="telemetry-panel telemetry-panel-empty" role="region" aria-label={title}>
        <div className="telemetry-header">
          <span className="telemetry-title">{title}</span>
          <span className="telemetry-status-pill pill-unavailable">
            {t.telemetryUnavailable}
          </span>
        </div>
      </div>
    );
  }

  const {
    requestType = 'diagnosis',
    provider,
    model,
    durationMs,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd,
    partialCostUsd,
    usageStatus = 'unavailable',
  } = telemetry;

  const providerDisplay = formatProviderName(provider, t.telemetryUnavailable);
  const modelDisplay = model && model.trim() !== '' ? model : t.telemetryUnavailable;
  const latencyDisplay = formatLatency(durationMs, t.telemetryUnavailable);
  const inputDisplay = formatTokenCount(promptTokens, t.telemetryUnavailable);
  const outputDisplay = formatTokenCount(completionTokens, t.telemetryUnavailable);
  const totalDisplay = formatTokenCount(totalTokens, t.telemetryUnavailable);
  const costDisplay = formatCostUsd(estimatedCostUsd, t.telemetryUnavailable);
  const isPartialCost = estimatedCostUsd === undefined && partialCostUsd !== undefined;
  const partialCostDisplay = isPartialCost ? formatCostUsd(partialCostUsd, t.telemetryUnavailable) : '';

  const getStatusBadge = () => {
    switch (usageStatus) {
      case 'reported':
        return (
          <span className="telemetry-status-pill pill-reported" title={t.telemetryStatusReported}>
            {t.telemetryStatusReported}
          </span>
        );
      case 'partial':
        return (
          <span className="telemetry-status-pill pill-partial" title={t.telemetryStatusPartial}>
            {t.telemetryStatusPartial}
          </span>
        );
      case 'unavailable':
      default:
        return (
          <span className="telemetry-status-pill pill-unavailable" title={t.telemetryStatusUnavailable}>
            {t.telemetryStatusUnavailable}
          </span>
        );
    }
  };

  return (
    <div
      className={`card-panel telemetry-panel telemetry-${requestType}`}
      role="region"
      aria-label={title}
      data-request-type={requestType}
    >
      <div
        className="telemetry-summary-bar"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        aria-expanded={isOpen}
      >
        <div className="telemetry-bar-left">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="telemetry-icon"
            aria-hidden="true"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <div className="telemetry-title-group">
            <h4 className="telemetry-heading">{title}</h4>
            <span className="telemetry-provider-sub">
              {providerDisplay} · {modelDisplay}
            </span>
          </div>
        </div>

        <div className="telemetry-bar-right">
          {estimatedCostUsd !== undefined ? (
            <span className="telemetry-cost-badge" title={t.telemetryCostDisclaimer}>
              {costDisplay}
            </span>
          ) : isPartialCost ? (
            <span
              className="telemetry-cost-badge telemetry-partial-cost-badge"
              title={t.telemetryPartialCostDisclaimer}
            >
              {t.telemetryPartialCostBadge.replace('{cost}', partialCostDisplay)}
            </span>
          ) : null}
          <span className="telemetry-latency-badge">
            {durationMs !== undefined ? `${(durationMs / 1000).toFixed(2)}s` : latencyDisplay}
          </span>
          {getStatusBadge()}
          <span className={`telemetry-toggle-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">
            ▾
          </span>
        </div>
      </div>

      {isOpen && (
        <div className="telemetry-content-body">
          <p className="telemetry-desc">{t.telemetrySectionSubtitle}</p>

          <div className="telemetry-grid">
            {/* 1. Infrastructure */}
            <div className="telemetry-cell">
              <span className="telemetry-cell-label">{t.telemetryProviderLabel}</span>
              <span className="telemetry-cell-value">{providerDisplay}</span>
            </div>

            <div className="telemetry-cell">
              <span className="telemetry-cell-label">{t.telemetryModelLabel}</span>
              <span className="telemetry-cell-value font-mono" title={modelDisplay}>
                {modelDisplay}
              </span>
            </div>

            <div className="telemetry-cell">
              <span className="telemetry-cell-label">{t.telemetryDurationLabel}</span>
              <span className="telemetry-cell-value">{latencyDisplay}</span>
            </div>

            {/* 2. Token Accounting */}
            <div className="telemetry-cell">
              <span className="telemetry-cell-label">{t.telemetryInputTokensLabel}</span>
              <span className={`telemetry-cell-value ${promptTokens === undefined ? 'val-muted' : ''}`}>
                {inputDisplay}
              </span>
            </div>

            <div className="telemetry-cell">
              <span className="telemetry-cell-label">{t.telemetryOutputTokensLabel}</span>
              <span className={`telemetry-cell-value ${completionTokens === undefined ? 'val-muted' : ''}`}>
                {outputDisplay}
              </span>
            </div>

            <div className="telemetry-cell">
              <span className="telemetry-cell-label">{t.telemetryTotalTokensLabel}</span>
              <span className={`telemetry-cell-value ${totalTokens === undefined ? 'val-muted' : ''}`}>
                {totalDisplay}
              </span>
            </div>

            {/* 3. Financial Estimation */}
            <div className={`telemetry-cell ${isPartialCost ? 'cell-partial' : 'cell-highlight'}`}>
              <span className="telemetry-cell-label">
                {isPartialCost ? t.telemetryPartialCostLabel : t.telemetryEstimatedCostLabel}
              </span>
              {estimatedCostUsd !== undefined ? (
                <span className="telemetry-cell-value cost-value">
                  {costDisplay}
                </span>
              ) : isPartialCost ? (
                <span
                  className="telemetry-cell-value cost-value cost-value-partial"
                  title={t.telemetryPartialCostDisclaimer}
                >
                  {partialCostDisplay}*
                </span>
              ) : (
                <span className="telemetry-cell-value cost-value val-muted">
                  {t.telemetryUnavailable}
                </span>
              )}
            </div>
          </div>

          <div className="telemetry-footer-disclaimer">
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
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              {isPartialCost ? t.telemetryPartialCostDisclaimer : t.telemetryCostDisclaimer}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

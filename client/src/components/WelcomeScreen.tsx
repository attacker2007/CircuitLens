/**
 * CircuitLens — Welcoming Minimal Entry Screen & Product Guide
 *
 * Provides a clean, approachable landing experience that introduces
 * the AI-assisted troubleshooting workbench, offers instant actions to
 * start or resume investigations, and allows exploring the interactive demo.
 */

import type { Translations, SupportedLanguage } from '../i18n';
import type { InvestigationSummary } from '../types/investigation';

interface WelcomeScreenProps {
  t: Translations;
  lang: SupportedLanguage;
  summaries: InvestigationSummary[];
  onStartInvestigation: () => void;
  onExploreDemo: () => void;
  onOpenInvestigation: (id: string) => void;
  onViewAllInvestigations: () => void;
  isMockDemo: boolean;
}

export function WelcomeScreen({
  t,
  lang: _lang,
  summaries,
  onStartInvestigation,
  onExploreDemo,
  onOpenInvestigation,
  onViewAllInvestigations,
  isMockDemo: _isMockDemo,
}: WelcomeScreenProps) {
  // Show up to 3 most recent non-archived investigations
  const recentSummaries = summaries
    .filter((s) => !s.isArchived)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const getStatusBadgeText = (status: string): string => {
    switch (status) {
      case 'new':
        return t.statusNew || 'New';
      case 'under_investigation':
        return t.statusUnderInvestigation || 'Under Investigation';
      case 'awaiting_evidence':
        return t.statusAwaitingEvidence || 'Awaiting Evidence';
      case 'assessment_updated':
        return t.statusAssessmentUpdated || 'Assessment Updated';
      case 'resolved':
        return t.statusResolved || 'Resolved';
      default:
        return status;
    }
  };

  return (
    <div className="welcome-screen-container" role="region" aria-label={t.welcomeTagline}>
      {/* Hero Welcome Banner */}
      <section className="welcome-hero-card">
        <div className="welcome-chip-badge">
          <span className="welcome-chip-dot" />
          <span>{t.welcomeTagline}</span>
        </div>

        <h1 className="welcome-hero-title">{t.brandName}</h1>
        <p className="welcome-hero-desc">{t.welcomeSubtitle}</p>

        {/* Primary Action Row */}
        <div className="welcome-primary-actions">
          <button
            type="button"
            className="welcome-action-btn primary"
            onClick={onStartInvestigation}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>{t.welcomeStartBtn}</span>
          </button>

          <button
            type="button"
            className="welcome-action-btn secondary demo-btn"
            onClick={onExploreDemo}
            title={t.welcomeDemoCardDesc}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>{t.welcomeDemoBtn}</span>
          </button>
        </div>
      </section>

      {/* Action Cards Grid */}
      <section className="welcome-grid-section">
        <div className="welcome-card-feature">
          <div className="welcome-feature-icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <h3 className="welcome-feature-heading">{t.welcomeStartCardTitle}</h3>
          <p className="welcome-feature-text">{t.welcomeStartCardDesc}</p>
        </div>

        <div className="welcome-card-feature">
          <div className="welcome-feature-icon-box demo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <h3 className="welcome-feature-heading">{t.welcomeDemoCardTitle}</h3>
          <p className="welcome-feature-text">{t.welcomeDemoCardDesc}</p>
        </div>
      </section>

      {/* Recent Investigations Quick-Resume Section */}
      <section className="welcome-recent-section">
        <div className="welcome-recent-header">
          <div>
            <h2 className="welcome-section-title">{t.welcomeRecentTitle}</h2>
            <p className="welcome-section-desc">{t.welcomeRecentSubtitle}</p>
          </div>

          {summaries.length > 0 && (
            <button
              type="button"
              className="welcome-view-all-link"
              onClick={onViewAllInvestigations}
            >
              <span>{t.welcomeViewAllBtn} ({summaries.length})</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>

        {recentSummaries.length > 0 ? (
          <div className="welcome-recent-cards-grid">
            {recentSummaries.map((item) => (
              <div key={item.id} className="welcome-recent-card">
                <div className="welcome-recent-card-top">
                  <div className="welcome-case-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="5" width="14" height="14" rx="2" />
                      <path d="M9 9h6v6H9z" />
                    </svg>
                  </div>
                  <span className={`case-status-pill status-${item.status}`}>
                    {getStatusBadgeText(item.status)}
                  </span>
                </div>

                <h4 className="welcome-recent-title" title={item.title}>
                  {item.title}
                </h4>

                <div className="welcome-recent-meta">
                  <span className="welcome-meta-date">{formatDate(item.updatedAt)}</span>
                  {item.reassessmentCount > 0 && (
                    <span className="welcome-meta-rounds">
                      {t.investigationRound} {item.reassessmentCount}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="welcome-resume-btn"
                  onClick={() => onOpenInvestigation(item.id)}
                >
                  <span>{t.welcomeResumeBtn}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="welcome-empty-cases">
            <p>{t.welcomeRecentEmpty}</p>
          </div>
        )}
      </section>

      {/* Key Diagnostic Workflow Capabilities (Concise 3-Card Summary) */}
      <section className="welcome-features-overview">
        <h3 className="welcome-overview-title">{t.welcomeHighlightsTitle}</h3>
        <div className="welcome-features-row">
          <div className="welcome-feature-card">
            <div className="feature-icon-badge">📷</div>
            <h4 className="feature-card-title">{t.welcomeFeature1Title}</h4>
            <p className="feature-card-desc">{t.welcomeFeature1Desc}</p>
          </div>

          <div className="welcome-feature-card">
            <div className="feature-icon-badge">🔍</div>
            <h4 className="feature-card-title">{t.welcomeFeature2Title}</h4>
            <p className="feature-card-desc">{t.welcomeFeature2Desc}</p>
          </div>

          <div className="welcome-feature-card">
            <div className="feature-icon-badge">⚡</div>
            <h4 className="feature-card-title">{t.welcomeFeature3Title}</h4>
            <p className="feature-card-desc">{t.welcomeFeature3Desc}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * CircuitLens Stage 6B-5E — Mobile Bottom Action Dock
 *
 * Persistent, accessible mobile-first navigation and quick-action toolbar.
 * Provides handheld technicians with one-tap access across all four diagnostic
 * perspectives and a state-aware primary action shortcut (evidence capture or reassessment).
 */

import { useState, useEffect } from 'react';
import type { Translations } from '../i18n';

export interface MobileBottomActionDockProps {
  activePerspective: 'overview' | 'matrix' | 'timeline' | 'report';
  onPerspectiveChange: (perspective: 'overview' | 'matrix' | 'timeline' | 'report') => void;
  evidenceCount: number;
  reassessmentCount: number;
  isReassessing: boolean;
  isReassessDisabled?: boolean;
  onLogEvidenceShortcut: () => void;
  onReassessmentShortcut: () => void;
  t: Translations;
}

export function MobileBottomActionDock({
  activePerspective,
  onPerspectiveChange,
  evidenceCount,
  reassessmentCount,
  isReassessing,
  isReassessDisabled,
  onLogEvidenceShortcut,
  onReassessmentShortcut,
  t,
}: MobileBottomActionDockProps) {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Reassessment disabled state agreed between dock and on-page control
  const effectiveReassessDisabled =
    isReassessing ||
    (isReassessDisabled !== undefined
      ? isReassessDisabled
      : evidenceCount === 0 || evidenceCount > 20);

  // Keyboard and editable input focus detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number | null = null;

    const isEditable = (el: Element | null): boolean => {
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === 'textarea') return true;
      if (tag === 'input') {
        const type = (el as HTMLInputElement).type?.toLowerCase();
        return !['button', 'submit', 'checkbox', 'radio', 'hidden', 'file', 'image', 'reset'].includes(type);
      }
      return (el as HTMLElement).isContentEditable;
    };

    const updateKeyboardState = () => {
      if (window.innerWidth >= 768) {
        setIsKeyboardVisible(false);
        return;
      }
      const activeEl = document.activeElement;
      const editableFocused = isEditable(activeEl);
      setIsKeyboardVisible(editableFocused);
    };

    const handleFocusChange = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateKeyboardState);
    };

    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateKeyboardState);
    };

    document.addEventListener('focusin', handleFocusChange, { passive: true });
    document.addEventListener('focusout', handleFocusChange, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize, { passive: true });
    }

    updateKeyboardState();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('focusin', handleFocusChange);
      document.removeEventListener('focusout', handleFocusChange);
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return (
    <aside
      className={`mobile-action-dock ${isKeyboardVisible ? 'keyboard-hidden' : ''}`}
      role="toolbar"
      aria-label={t.mobileDockAriaLabel}
      data-keyboard-hidden={isKeyboardVisible ? 'true' : undefined}
    >
      {/* 4-Perspective Navigation Tabs */}
      <nav className="mobile-dock-nav" aria-label={t.subnavAriaLabel}>
        {/* 1. Overview */}
        <button
          type="button"
          className={`mobile-dock-item ${activePerspective === 'overview' ? 'active' : ''}`}
          data-dock-item="overview"
          onClick={() => onPerspectiveChange('overview')}
          aria-current={activePerspective === 'overview' ? 'page' : undefined}
          aria-label={t.subnavOverview}
          title={t.subnavOverview}
        >
          <svg
            className="mobile-dock-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <span className="mobile-dock-label">{t.dockNavOverview}</span>
        </button>

        {/* 2. Hypothesis Evolution Matrix */}
        <button
          type="button"
          className={`mobile-dock-item ${activePerspective === 'matrix' ? 'active' : ''}`}
          data-dock-item="matrix"
          onClick={() => onPerspectiveChange('matrix')}
          aria-current={activePerspective === 'matrix' ? 'page' : undefined}
          aria-label={t.subnavMatrix}
          title={t.subnavMatrix}
        >
          <div className="mobile-dock-icon-wrapper">
            <svg
              className="mobile-dock-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20v-6M6 20V10M18 20V4" />
            </svg>
            {reassessmentCount > 0 && (
              <span className="mobile-dock-badge" aria-hidden="true">
                R{reassessmentCount}
              </span>
            )}
          </div>
          <span className="mobile-dock-label">{t.dockNavMatrix}</span>
        </button>

        {/* 3. Evidence Timeline */}
        <button
          type="button"
          className={`mobile-dock-item ${activePerspective === 'timeline' ? 'active' : ''}`}
          data-dock-item="timeline"
          onClick={() => onPerspectiveChange('timeline')}
          aria-current={activePerspective === 'timeline' ? 'page' : undefined}
          aria-label={t.subnavTimeline}
          title={t.subnavTimeline}
        >
          <div className="mobile-dock-icon-wrapper">
            <svg
              className="mobile-dock-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </svg>
            {evidenceCount > 0 && (
              <span className="mobile-dock-badge" aria-hidden="true">
                {evidenceCount}
              </span>
            )}
          </div>
          <span className="mobile-dock-label">{t.dockNavTimeline}</span>
        </button>

        {/* 4. Report Export */}
        <button
          type="button"
          className={`mobile-dock-item ${activePerspective === 'report' ? 'active' : ''}`}
          data-dock-item="report"
          onClick={() => onPerspectiveChange('report')}
          aria-current={activePerspective === 'report' ? 'page' : undefined}
          aria-label={t.subnavReport}
          title={t.subnavReport}
        >
          <svg
            className="mobile-dock-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span className="mobile-dock-label">{t.dockNavReport}</span>
        </button>
      </nav>

      {/* Vertical divider */}
      <div className="mobile-dock-divider" aria-hidden="true" />

      {/* Context-Aware Primary Action Shortcut */}
      <div className="mobile-dock-action-area">
        {evidenceCount === 0 ? (
          <button
            type="button"
            className="mobile-dock-action-btn evidence-shortcut-btn"
            data-dock-action="log-evidence"
            onClick={onLogEvidenceShortcut}
            aria-label={t.dockActionLogEvidence}
            title={t.dockActionLogEvidence}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span className="dock-action-text">{t.dockActionLogEvidence}</span>
          </button>
        ) : (
          <button
            type="button"
            className="mobile-dock-action-btn reassess-shortcut-btn"
            data-dock-action="reassess"
            onClick={onReassessmentShortcut}
            disabled={effectiveReassessDisabled}
            aria-disabled={effectiveReassessDisabled ? 'true' : undefined}
            aria-label={
              evidenceCount > 20
                ? `${t.dockActionReassess} (${evidenceCount}) - ${t.evidenceLimitExceededNotice.replace('{count}', String(evidenceCount))}`
                : `${t.dockActionReassess} (${evidenceCount})`
            }
            title={
              evidenceCount > 20
                ? `${t.dockActionReassess} (${evidenceCount}) - ${t.evidenceLimitExceededNotice.replace('{count}', String(evidenceCount))}`
                : `${t.dockActionReassess} (${evidenceCount})`
            }
          >
            {isReassessing ? (
              <>
                <span className="spinner-inline mobile-dock-spinner" aria-hidden="true" />
                <span className="dock-action-text">{t.dockActionReassessing}</span>
              </>
            ) : (
              <>
                <svg
                  width="17"
                  height="17"
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
                <span className="dock-action-text">{t.dockActionReassess}</span>
                <span className="dock-action-count" aria-hidden="true">
                  {evidenceCount}
                </span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}

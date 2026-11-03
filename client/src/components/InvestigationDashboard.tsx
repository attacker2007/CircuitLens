/**
 * CircuitLens Stage 6C-2C — Investigation Workspace Dashboard
 *
 * Provides an engineering-grade local-first dashboard to create,
 * view, search, filter, reopen, rename, archive, and delete investigations.
 */

import { useState, useMemo } from 'react';
import type { Translations, SupportedLanguage } from '../i18n';
import type {
  InvestigationSummary,
  InvestigationStatus,
} from '../types/investigation';

interface InvestigationDashboardProps {
  t: Translations;
  lang: SupportedLanguage;
  summaries: InvestigationSummary[];
  activeId: string | null;
  onOpenInvestigation: (id: string) => void;
  onNewInvestigation: () => void;
  onRenameInvestigation: (id: string, newTitle: string) => Promise<void>;
  onDeleteInvestigation: (id: string) => Promise<void>;
  onToggleArchive: (id: string, currentArchived: boolean) => Promise<void>;
  onUpdateStatus?: (id: string, status: InvestigationStatus) => Promise<void>;
}

export function InvestigationDashboard({
  t,
  lang: _lang,
  summaries,
  activeId: _activeId,
  onOpenInvestigation,
  onNewInvestigation,
  onRenameInvestigation,
  onDeleteInvestigation,
  onToggleArchive,
  onUpdateStatus,
}: InvestigationDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter and search logic
  const filteredSummaries = useMemo(() => {
    return summaries.filter((item) => {
      // Archive filter
      if (statusFilter === 'archived') {
        if (!item.isArchived) return false;
      } else {
        if (item.isArchived) return false;
        if (statusFilter !== 'all' && item.status !== statusFilter) {
          return false;
        }
      }

      // Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(query);
        const boardMatch = item.boardName.toLowerCase().includes(query);
        return titleMatch || boardMatch;
      }

      return true;
    });
  }, [summaries, statusFilter, searchQuery]);

  const handleStartRename = (item: InvestigationSummary) => {
    setRenamingId(item.id);
    setRenameValue(item.title);
  };

  const handleSaveRename = async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    setIsProcessing(true);
    try {
      await onRenameInvestigation(renamingId, renameValue.trim());
      setRenamingId(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsProcessing(true);
    try {
      await onDeleteInvestigation(deletingId);
      setDeletingId(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadgeText = (status: InvestigationStatus): string => {
    switch (status) {
      case 'new':
        return t.statusNew;
      case 'under_investigation':
        return t.statusUnderInvestigation;
      case 'awaiting_evidence':
        return t.statusAwaitingEvidence;
      case 'assessment_updated':
        return t.statusAssessmentUpdated;
      case 'resolved':
        return t.statusResolved;
      default:
        return status;
    }
  };

  const formatRelativeTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSecs < 60) return 'Just now';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return isoString;
    }
  };

  return (
    <section className="investigation-dashboard" aria-labelledby="dashboard-title">
      {/* Header & New Case Action */}
      <div className="dashboard-header">
        <div className="dashboard-header-text">
          <div className="dashboard-badge-row">
            <span className="dashboard-badge">{t.workspaceTitle}</span>
            <span className="saved-locally-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>{t.savedLocallyNotice}</span>
            </span>
          </div>
          <h2 id="dashboard-title" className="dashboard-title">
            {t.workspaceTitle}
          </h2>
          <p className="dashboard-subtitle">{t.workspaceSubtitle}</p>
        </div>

        <button
          type="button"
          className="action-btn primary-action-btn new-case-btn"
          onClick={onNewInvestigation}
          title={t.newInvestigationAction}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{t.newInvestigationAction}</span>
        </button>
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="dashboard-privacy-banner" role="note">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="privacy-shield-icon" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <p className="privacy-text">{t.privacyNotice}</p>
      </div>

      {/* Controls: Search & Status Filters */}
      <div className="dashboard-controls-bar">
        <div className="search-box-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            className="search-input"
            placeholder={t.searchInvestigationsPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t.searchInvestigationsPlaceholder}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-pill-group" role="radiogroup" aria-label="Investigation Status Filter">
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
            role="radio"
            aria-checked={statusFilter === 'all'}
          >
            {t.filterAll} ({summaries.filter(s => !s.isArchived).length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'under_investigation' ? 'active' : ''}`}
            onClick={() => setStatusFilter('under_investigation')}
            role="radio"
            aria-checked={statusFilter === 'under_investigation'}
          >
            {t.filterUnderInvestigation} ({summaries.filter(s => !s.isArchived && s.status === 'under_investigation').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'awaiting_evidence' ? 'active' : ''}`}
            onClick={() => setStatusFilter('awaiting_evidence')}
            role="radio"
            aria-checked={statusFilter === 'awaiting_evidence'}
          >
            {t.filterAwaitingEvidence} ({summaries.filter(s => !s.isArchived && s.status === 'awaiting_evidence').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'assessment_updated' ? 'active' : ''}`}
            onClick={() => setStatusFilter('assessment_updated')}
            role="radio"
            aria-checked={statusFilter === 'assessment_updated'}
          >
            {t.filterAssessmentUpdated} ({summaries.filter(s => !s.isArchived && s.status === 'assessment_updated').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'resolved' ? 'active' : ''}`}
            onClick={() => setStatusFilter('resolved')}
            role="radio"
            aria-checked={statusFilter === 'resolved'}
          >
            {t.filterResolved} ({summaries.filter(s => !s.isArchived && s.status === 'resolved').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'archived' ? 'active' : ''}`}
            onClick={() => setStatusFilter('archived')}
            role="radio"
            aria-checked={statusFilter === 'archived'}
          >
            {t.filterArchived} ({summaries.filter(s => s.isArchived).length})
          </button>
        </div>
      </div>

      {/* Case Grid or Empty States */}
      {summaries.length === 0 ? (
        <div className="dashboard-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="empty-state-icon" aria-hidden="true">
            <rect x="5" y="5" width="14" height="14" rx="2" />
            <path d="M9 9h6v6H9z" />
            <path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" />
          </svg>
          <h3 className="empty-state-title">{t.noSavedInvestigationsTitle}</h3>
          <p className="empty-state-desc">{t.noSavedInvestigationsDesc}</p>
          <button
            type="button"
            className="action-btn empty-state-btn"
            onClick={onNewInvestigation}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{t.newInvestigationAction}</span>
          </button>
        </div>
      ) : filteredSummaries.length === 0 ? (
        <div className="dashboard-empty-filter">
          <p>{t.noInvestigationsFound}</p>
        </div>
      ) : (
        <div className="investigation-grid" role="list">
          {filteredSummaries.map((item) => (
            <div
              key={item.id}
              className={`investigation-card ${item.status}`}
              role="listitem"
            >
              {/* Card Header & Status Badge */}
              <div className="inv-card-header">
                <span className={`inv-status-pill status-${item.status}`}>
                  <span className="status-dot" />
                  {getStatusBadgeText(item.status)}
                </span>
                <span className="inv-updated-time" title={item.updatedAt}>
                  {formatRelativeTime(item.updatedAt)}
                </span>
              </div>

              {/* Title & Board details */}
              <div className="inv-card-body">
                {renamingId === item.id ? (
                  <div className="inline-rename-form">
                    <input
                      type="text"
                      className="rename-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      autoFocus
                    />
                    <div className="rename-btn-group">
                      <button
                        type="button"
                        className="control-btn tiny-btn"
                        onClick={handleSaveRename}
                        disabled={isProcessing}
                      >
                        {t.saveRenameBtn}
                      </button>
                      <button
                        type="button"
                        className="control-btn tiny-btn outline-btn"
                        onClick={() => setRenamingId(null)}
                      >
                        {t.cancelBtn}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="inv-title-row">
                    <h3 className="inv-title" title={item.title}>
                      {item.title}
                    </h3>
                    <button
                      type="button"
                      className="rename-icon-btn"
                      onClick={() => handleStartRename(item)}
                      title={t.renameInvestigationBtn}
                      aria-label={`${t.renameInvestigationBtn}: ${item.title}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </div>
                )}

                <p className="inv-board-sub">{item.boardName}</p>

                {/* Metrics Pill Row */}
                <div className="inv-metrics-row">
                  <span className="inv-metric-tag" title={t.evidenceCountLabel}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span>{item.evidenceCount} {t.evidenceCountLabel}</span>
                  </span>

                  <span className="inv-metric-tag" title={t.reassessmentsCountLabel}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    <span>R{item.reassessmentCount} ({item.reassessmentCount} {t.reassessmentsCountLabel})</span>
                  </span>
                </div>
              </div>

              {/* Card Actions Footer */}
              <div className="inv-card-footer">
                <button
                  type="button"
                  className="action-btn open-case-btn"
                  onClick={() => onOpenInvestigation(item.id)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span>{t.openInvestigationBtn}</span>
                </button>

                <div className="inv-card-subactions">
                  {onUpdateStatus && (
                    <button
                      type="button"
                      className="inv-icon-btn status-toggle-btn"
                      onClick={() => onUpdateStatus(item.id, item.status === 'resolved' ? 'under_investigation' : 'resolved')}
                      title={item.status === 'resolved' ? t.reopenCaseBtn : t.markResolvedBtn}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                  )}

                  <button
                    type="button"
                    className="inv-icon-btn archive-btn"
                    onClick={() => onToggleArchive(item.id, item.isArchived)}
                    title={item.isArchived ? t.unarchiveBtn : t.archiveBtn}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="21 8 21 21 3 21 3 8" />
                      <rect x="1" y="3" width="22" height="5" />
                      <line x1="10" y1="12" x2="14" y2="12" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="inv-icon-btn delete-btn"
                    onClick={() => setDeletingId(item.id)}
                    title={t.deleteBtn}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal Dialog */}
      {deletingId && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingId(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="confirm-modal-box">
            <h3 id="delete-confirm-title" className="confirm-modal-title">
              {t.deleteConfirmTitle}
            </h3>
            <p className="confirm-modal-msg">{t.deleteConfirmMsg}</p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="control-btn outline-btn"
                onClick={() => setDeletingId(null)}
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                className="action-btn danger-btn"
                onClick={handleConfirmDelete}
                disabled={isProcessing}
              >
                {t.deleteBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

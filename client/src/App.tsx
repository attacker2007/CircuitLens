import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { translations, isRtl, type SupportedLanguage } from './i18n';
import { IntakeSection } from './components/IntakeSection';
import { InvestigationDashboard } from './components/InvestigationDashboard';
import type { ActiveInvestigationInfo } from './types/intake';
import type {
  InvestigationRecord,
  InvestigationSummary,
  InvestigationStatus,
} from './types/investigation';
import {
  getAllSummaries,
  getInvestigation,
  saveInvestigation,
  deleteInvestigation,
  updateInvestigationTitle,
  updateInvestigationStatus,
  setInvestigationArchived,
  createNewInvestigationRecord,
  getLastActiveId,
  setLastActiveId,
  createDebouncedSaver,
} from './storage/investigationStore';

interface HealthResponse {
  status: string;
  service: string;
  apiKeyConfigured?: boolean;
  targetModel?: string;
  metaBaseUrl?: string;
  timestamp: string;
}

export function App() {
  const [lang, setLang] = useState<SupportedLanguage>('en');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [latency, setLatency] = useState<number | null>(null);
  const [isHealthDrawerOpen, setIsHealthDrawerOpen] = useState(false);
  const [activeInvestigation, setActiveInvestigation] = useState<ActiveInvestigationInfo | null>(null);

  // Stage 6C-2C: Local-First Workspace & Persistence State
  const [currentView, setCurrentView] = useState<'workspace' | 'dashboard'>('workspace');
  const [activeRecord, setActiveRecord] = useState<InvestigationRecord | null>(null);
  const [summaries, setSummaries] = useState<InvestigationSummary[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const debouncedSaverRef = useRef(createDebouncedSaver(400));

  const t = translations[lang];

  // Synchronize document theme and RTL direction
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('dir', isRtl(lang) ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  // Close health popover on Escape key
  useEffect(() => {
    if (!isHealthDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHealthDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHealthDrawerOpen]);

  const probeHealth = useCallback(async () => {
    setHealthStatus('checking');
    const start = performance.now();
    try {
      const res = await fetch('/api/health', {
        headers: { Accept: 'application/json' },
      });
      const end = performance.now();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: HealthResponse = await res.json();
      setHealthData(data);
      setLatency(Math.round(end - start));
      setHealthStatus('ok');
    } catch {
      setHealthData(null);
      setLatency(null);
      setHealthStatus('error');
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const loadHealth = async () => {
      const start = performance.now();
      try {
        const res = await fetch('/api/health', {
          headers: { Accept: 'application/json' },
        });
        const end = performance.now();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: HealthResponse = await res.json();
        if (!ignore) {
          setHealthData(data);
          setLatency(Math.round(end - start));
          setHealthStatus('ok');
        }
      } catch {
        if (!ignore) {
          setHealthData(null);
          setLatency(null);
          setHealthStatus('error');
        }
      }
    };
    void loadHealth();
    return () => {
      ignore = true;
    };
  }, []);

  const refreshSummaries = useCallback(async () => {
    try {
      const list = await getAllSummaries();
      setSummaries(list);
    } catch (err) {
      console.error('Failed to load investigation summaries:', err);
    }
  }, []);

  // Initialize store: restore last active or create initial blank case
  useEffect(() => {
    let ignore = false;
    const initPersistence = async () => {
      try {
        const list = await getAllSummaries();
        if (ignore) return;
        setSummaries(list);

        const lastId = getLastActiveId();
        if (lastId) {
          const rec = await getInvestigation(lastId);
          if (rec && !ignore) {
            setActiveRecord(rec);
            setCurrentView('workspace');
            return;
          }
        }

        // If no last active ID, create initial blank record
        const blank = createNewInvestigationRecord();
        const saved = await saveInvestigation(blank);
        if (!ignore) {
          setActiveRecord(saved);
          setCurrentView('workspace');
          void refreshSummaries();
        }
      } catch (err) {
        console.error('Failed to initialize local persistence:', err);
      }
    };

    void initPersistence();
    return () => {
      ignore = true;
    };
  }, [refreshSummaries]);

  // Auto-save debounced handler for active investigation updates
  const handleInvestigationUpdate = useCallback(
    (updates: Partial<InvestigationRecord>) => {
      setActiveRecord((prev) => {
        if (!prev) return prev;
        const updated: InvestigationRecord = {
          ...prev,
          ...updates,
        };

        setSaveStatus('saving');
        debouncedSaverRef.current.save(
          updated,
          () => {
            setSaveStatus('saved');
            void refreshSummaries();
          },
          () => {
            setSaveStatus('error');
          }
        );

        return updated;
      });
    },
    [refreshSummaries]
  );

  // Create new investigation
  const handleNewInvestigation = useCallback(async () => {
    // Flush active investigation's pending updates before creating new case
    if (activeRecord && debouncedSaverRef.current.hasPending(activeRecord.id)) {
      try {
        await debouncedSaverRef.current.flush(activeRecord.id);
      } catch (err) {
        console.error('Failed to flush active investigation before new case:', err);
      }
    }

    const blank = createNewInvestigationRecord();
    try {
      const saved = await saveInvestigation(blank);
      setActiveRecord(saved);
      setLastActiveId(saved.id);
      setCurrentView('workspace');
      setSaveStatus('saved');
      await refreshSummaries();
    } catch (err) {
      console.error('Failed to create new investigation:', err);
    }
  }, [activeRecord, refreshSummaries]);

  // Open existing investigation from Dashboard
  const handleOpenInvestigation = useCallback(async (id: string) => {
    // Flush any pending updates for current active record before switching
    if (activeRecord && activeRecord.id !== id && debouncedSaverRef.current.hasPending(activeRecord.id)) {
      try {
        await debouncedSaverRef.current.flush(activeRecord.id);
      } catch (err) {
        console.error('Failed to flush active investigation before switching:', err);
      }
    }

    // Cancel any lingering debounce timer for the previous active ID
    if (activeRecord?.id) {
      debouncedSaverRef.current.cancel(activeRecord.id);
    }

    try {
      const rec = await getInvestigation(id);
      if (rec) {
        setActiveRecord(rec);
        setLastActiveId(rec.id);
        setCurrentView('workspace');
        setSaveStatus('saved');
      }
    } catch (err) {
      console.error('Failed to open investigation:', err);
    }
  }, [activeRecord]);

  // Delete investigation
  const handleDeleteInvestigation = useCallback(
    async (id: string) => {
      // Explicitly cancel any pending debounced save for this ID so delayed timers cannot resurrect it
      debouncedSaverRef.current.cancel(id);
      try {
        await deleteInvestigation(id);
        if (activeRecord?.id === id) {
          setActiveRecord(null);
          setCurrentView('dashboard');
        }
        await refreshSummaries();
      } catch (err) {
        console.error('Failed to delete investigation:', err);
      }
    },
    [activeRecord?.id, refreshSummaries]
  );

  // Rename investigation
  const handleRenameInvestigation = useCallback(
    async (id: string, newTitle: string) => {
      try {
        const updated = await updateInvestigationTitle(id, newTitle);
        if (activeRecord?.id === id) {
          setActiveRecord(updated);
        }
        await refreshSummaries();
      } catch (err) {
        console.error('Failed to rename investigation:', err);
      }
    },
    [activeRecord?.id, refreshSummaries]
  );

  // Toggle archive
  const handleToggleArchive = useCallback(
    async (id: string, currentArchived: boolean) => {
      try {
        const updated = await setInvestigationArchived(id, !currentArchived);
        if (activeRecord?.id === id) {
          setActiveRecord(updated);
        }
        await refreshSummaries();
      } catch (err) {
        console.error('Failed to archive/unarchive investigation:', err);
      }
    },
    [activeRecord?.id, refreshSummaries]
  );

  // Update status (e.g., mark as resolved)
  const handleUpdateStatus = useCallback(
    async (id: string, newStatus: InvestigationStatus) => {
      try {
        const updated = await updateInvestigationStatus(id, newStatus);
        if (activeRecord?.id === id) {
          setActiveRecord(updated);
        }
        await refreshSummaries();
      } catch (err) {
        console.error('Failed to update status:', err);
      }
    },
    [activeRecord?.id, refreshSummaries]
  );

  // Navigate to Dashboard with prior flush of active uncommitted changes
  const handleNavigateToDashboard = useCallback(async () => {
    if (activeRecord && debouncedSaverRef.current.hasPending(activeRecord.id)) {
      try {
        await debouncedSaverRef.current.flush(activeRecord.id);
        await refreshSummaries();
      } catch (err) {
        console.error('Failed to flush active investigation before dashboard view:', err);
      }
    }
    setCurrentView('dashboard');
  }, [activeRecord, refreshSummaries]);

  // Synchronize uncommitted changes on visibility loss (best-effort)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && activeRecord && debouncedSaverRef.current.hasPending(activeRecord.id)) {
        void debouncedSaverRef.current.flush(activeRecord.id);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeRecord]);

  // Clean up debounced saver on unmount
  useEffect(() => {
    return () => {
      debouncedSaverRef.current.cancel();
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="app-container">
      {activeInvestigation ? (
        /* Compact Active-Investigation Header */
        <header className="active-investigation-top-bar" role="banner">
          <div className="active-investigation-left">
            <div className="brand-section-compact">
              <svg
                className="brand-logo-icon-compact"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="5" y="5" width="14" height="14" rx="2" />
                <path d="M9 9h6v6H9z" />
                <path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" />
              </svg>
              <span className="brand-title-compact">{t.brandName}</span>
            </div>

            <span className="compact-header-divider" aria-hidden="true">•</span>

            <div className="investigation-meta-group">
              <span className="investigation-board-name" title={activeInvestigation.boardName || t.stagedNotSpecified}>
                {activeInvestigation.boardName || t.stagedNotSpecified}
              </span>

              <span className="investigation-round-pill">
                {activeInvestigation.reassessmentCount === 0
                  ? t.initialDiagnosisBadge
                  : `${t.investigationRound} ${activeInvestigation.reassessmentCount}`}
              </span>

              <span className={`investigation-status-pill ${activeInvestigation.reassessmentCount > 0 ? 'reassessed' : 'active'}`}>
                {activeInvestigation.reassessmentCount === 0
                  ? t.statusActiveAssessment
                  : t.statusReassessed}
              </span>
            </div>
          </div>

          <div className="active-investigation-right">
            {/* Local Save Status Pill */}
            {saveStatus !== 'idle' && (
              <span className={`save-status-pill ${saveStatus}`} title={t.savedLocallyNotice}>
                <span className="save-dot" />
                <span>
                  {saveStatus === 'saving'
                    ? t.saveStatusSaving
                    : saveStatus === 'saved'
                    ? t.saveStatusSaved
                    : t.saveStatusError}
                </span>
              </span>
            )}

            {/* Dashboard Navigation Button */}
            <button
              type="button"
              className="action-btn secondary-btn dashboard-nav-btn"
              onClick={handleNavigateToDashboard}
              title={t.allInvestigationsBtn}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>{t.backToDashboardBtn}</span>
              {summaries.length > 0 && <span className="dashboard-count-badge">{summaries.length}</span>}
            </button>

            {/* Accessible Compact Health Indicator (Cleaned per Section 8) */}
            <div className="compact-health-wrapper">
              <button
                type="button"
                className={`compact-health-badge ${healthStatus}`}
                onClick={() => setIsHealthDrawerOpen(!isHealthDrawerOpen)}
                aria-expanded={isHealthDrawerOpen}
                aria-haspopup="dialog"
                aria-label={`${t.systemStatusTitle}: ${healthStatus === 'ok' ? t.statusConnected : healthStatus === 'checking' ? t.statusChecking : t.statusError}`}
              >
                <span className={`status-dot ${healthStatus === 'checking' ? 'pulse' : ''}`} />
                <span className="compact-health-text">
                  {healthStatus === 'ok'
                    ? (latency !== null ? `${latency} ms` : t.statusConnected)
                    : healthStatus === 'checking'
                    ? t.statusChecking
                    : t.statusError}
                </span>
                <span className={`telemetry-toggle-chevron ${isHealthDrawerOpen ? 'open' : ''}`} aria-hidden="true">
                  ▾
                </span>
              </button>

              {/* Accessible Health Popover */}
              {isHealthDrawerOpen && (
                <div
                  className="active-health-popover"
                  role="dialog"
                  aria-label={t.healthPopoverTitle}
                >
                  <div className="health-popover-header">
                    <h4>{t.systemStatusTitle}</h4>
                    <button
                      type="button"
                      className="popover-close-btn"
                      onClick={() => setIsHealthDrawerOpen(false)}
                      aria-label={t.healthPopoverClose}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="health-popover-grid">
                    <div className="health-popover-cell">
                      <span className="telemetry-label">{t.serviceLabel}</span>
                      <span className="telemetry-value">{healthData?.service || 'CircuitLens Diagnostic Service'}</span>
                    </div>
                    <div className="health-popover-cell">
                      <span className="telemetry-label">{t.statusChecking}</span>
                      <span className="telemetry-value highlight">
                        {healthStatus === 'ok' ? t.statusConnected : healthStatus === 'checking' ? t.statusChecking : t.statusError}
                      </span>
                    </div>
                  </div>

                  <div className="health-popover-footer">
                    <button
                      type="button"
                      className="action-btn retry-btn popover-retry-btn"
                      onClick={probeHealth}
                      disabled={healthStatus === 'checking'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                      </svg>
                      <span>{t.retryButton}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Language Select */}
            <label htmlFor="active-language-select" className="visually-hidden" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
              {t.languageSelect}
            </label>
            <select
              id="active-language-select"
              className="control-select header-select"
              value={lang}
              onChange={(e) => setLang(e.target.value as SupportedLanguage)}
              aria-label={t.languageSelect}
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
              <option value="ar">العربية</option>
            </select>

            {/* Theme Toggle */}
            <button
              type="button"
              className="theme-toggle-btn header-theme-btn"
              onClick={toggleTheme}
              aria-label={t.themeToggle}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Edit Symptoms Quick Action */}
            <button
              type="button"
              className="action-btn secondary-btn compact-header-action-btn"
              onClick={activeInvestigation.onEditSymptoms}
              title={t.compactEditSymptoms}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>{t.compactEditSymptoms}</span>
            </button>

            {/* New Investigation Action */}
            <button
              type="button"
              className="action-btn outline-btn compact-header-action-btn new-inv-btn"
              onClick={handleNewInvestigation}
              title={t.compactNewInvestigation}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
              <span>{t.compactNewInvestigation}</span>
            </button>
          </div>
        </header>
      ) : (
        /* Workspace Top Bar */
        <header className="top-bar">
          <div className="brand-section">
            <svg
              className="brand-logo-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="5" y="5" width="14" height="14" rx="2" />
              <path d="M9 9h6v6H9z" />
              <path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" />
            </svg>
            <div className="brand-title">
              <span>{t.brandName}</span>
              <span className="brand-badge">{t.stageBadge}</span>
            </div>
          </div>

          <div className="controls-section">
            {/* Save Status Pill */}
            {saveStatus !== 'idle' && (
              <span className={`save-status-pill ${saveStatus}`} title={t.savedLocallyNotice}>
                <span className="save-dot" />
                <span>
                  {saveStatus === 'saving'
                    ? t.saveStatusSaving
                    : saveStatus === 'saved'
                    ? t.saveStatusSaved
                    : t.saveStatusError}
                </span>
              </span>
            )}

            {/* Dashboard / Workspace Navigation Button */}
            {currentView === 'workspace' ? (
              <button
                type="button"
                className="action-btn secondary-btn dashboard-nav-btn"
                onClick={handleNavigateToDashboard}
                title={t.allInvestigationsBtn}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <span>{t.backToDashboardBtn}</span>
                {summaries.length > 0 && <span className="dashboard-count-badge">{summaries.length}</span>}
              </button>
            ) : (
              <button
                type="button"
                className="action-btn secondary-btn dashboard-nav-btn"
                onClick={() => setCurrentView('workspace')}
                title={t.openInvestigationBtn}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span>{t.openInvestigationBtn}</span>
              </button>
            )}

            {/* Compact Diagnostic Connectivity Pill (Cleaned per Section 8) */}
            <div className="compact-health-wrapper">
              <button
                type="button"
                className={`compact-health-badge status-pill ${healthStatus}`}
                onClick={() => setIsHealthDrawerOpen(!isHealthDrawerOpen)}
                aria-expanded={isHealthDrawerOpen}
                aria-haspopup="dialog"
                aria-label={`${t.systemStatusTitle}: ${healthStatus === 'ok' ? t.statusConnected : healthStatus === 'checking' ? t.statusChecking : t.statusError}`}
              >
                <span className={`status-dot ${healthStatus === 'checking' ? 'pulse' : ''}`} />
                <span className="compact-health-text">
                  {healthStatus === 'ok'
                    ? (latency !== null ? `${latency} ms` : t.statusConnected)
                    : healthStatus === 'checking'
                    ? t.statusChecking
                    : t.statusError}
                </span>
                <span className={`telemetry-toggle-chevron ${isHealthDrawerOpen ? 'open' : ''}`} aria-hidden="true">
                  ▾
                </span>
              </button>

              {/* Accessible Health Popover */}
              {isHealthDrawerOpen && (
                <div
                  className="active-health-popover"
                  role="dialog"
                  aria-label={t.healthPopoverTitle}
                >
                  <div className="health-popover-header">
                    <h4>{t.systemStatusTitle}</h4>
                    <button
                      type="button"
                      className="popover-close-btn"
                      onClick={() => setIsHealthDrawerOpen(false)}
                      aria-label={t.healthPopoverClose}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="health-popover-grid">
                    <div className="health-popover-cell">
                      <span className="telemetry-label">{t.serviceLabel}</span>
                      <span className="telemetry-value">{healthData?.service || 'CircuitLens Diagnostic Service'}</span>
                    </div>
                    <div className="health-popover-cell">
                      <span className="telemetry-label">{t.statusChecking}</span>
                      <span className="telemetry-value highlight">
                        {healthStatus === 'ok' ? t.statusConnected : healthStatus === 'checking' ? t.statusChecking : t.statusError}
                      </span>
                    </div>
                  </div>

                  <div className="health-popover-footer">
                    <button
                      type="button"
                      className="action-btn retry-btn popover-retry-btn"
                      onClick={probeHealth}
                      disabled={healthStatus === 'checking'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                      </svg>
                      <span>{t.retryButton}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <label htmlFor="language-select" className="visually-hidden" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
              {t.languageSelect}
            </label>
            <select
              id="language-select"
              className="control-select"
              value={lang}
              onChange={(e) => setLang(e.target.value as SupportedLanguage)}
              aria-label={t.languageSelect}
            >
              <option value="en">English (EN)</option>
              <option value="es">Español (ES)</option>
              <option value="ar">العربية (AR)</option>
            </select>

            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={t.themeToggle}
            >
              {theme === 'dark' ? '☀️ ' + t.themeLight : '🌙 ' + t.themeDark}
            </button>
          </div>
        </header>
      )}

      <main className="main-content">
        {currentView === 'dashboard' ? (
          <InvestigationDashboard
            t={t}
            lang={lang}
            summaries={summaries}
            activeId={activeRecord?.id || null}
            onOpenInvestigation={handleOpenInvestigation}
            onNewInvestigation={handleNewInvestigation}
            onRenameInvestigation={handleRenameInvestigation}
            onDeleteInvestigation={handleDeleteInvestigation}
            onToggleArchive={handleToggleArchive}
            onUpdateStatus={handleUpdateStatus}
          />
        ) : (
          <>
            {!activeInvestigation && (
              <section className="hero-banner">
                <div className="hero-tag">{t.heroTag}</div>
                <h1 className="hero-title">{t.stageTitle}</h1>
                <p className="hero-subtitle">{t.stageSubtitle}</p>
              </section>
            )}

            {/* Vision & Schematic Intake Section */}
            <IntakeSection
              t={t}
              lang={lang}
              onActiveInvestigationChange={setActiveInvestigation}
              activeInvestigationRecord={activeRecord}
              onInvestigationUpdate={handleInvestigationUpdate}
              onNewInvestigationRequest={handleNewInvestigation}
            />
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>{t.footerNotice}</p>
      </footer>
    </div>
  );
}

export default App;

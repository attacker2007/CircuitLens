import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { translations, isRtl, type SupportedLanguage } from './i18n';
import { IntakeSection } from './components/IntakeSection';
import { InvestigationDashboard } from './components/InvestigationDashboard';
import { WelcomeScreen } from './components/WelcomeScreen';
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
  mode?: 'live' | 'mock_demo';
  provider?: string | null;
  apiKeyConfigured?: boolean;
  targetModel?: string | null;
  baseUrl?: string | null;
  metaBaseUrl?: string | null;
  inferenceVerified?: boolean;
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
  const [currentView, setCurrentView] = useState<'welcome' | 'workspace' | 'dashboard'>('welcome');
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
            // If the restored record already has an image or diagnosis in progress, keep workspace open;
            // Otherwise, show the welcoming entry screen.
            if (rec.imageBlob || rec.diagnosis || rec.formData.expectedBehavior) {
              setCurrentView('workspace');
            } else {
              setCurrentView('welcome');
            }
            return;
          }
        }

        // If no last active ID, create initial blank record and show welcome screen
        const blank = createNewInvestigationRecord();
        const saved = await saveInvestigation(blank);
        if (!ignore) {
          setActiveRecord(saved);
          setCurrentView('welcome');
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

  // Primary action from Welcome Screen
  const handleStartFromWelcome = useCallback(async () => {
    if (activeRecord && !activeRecord.imageBlob && !activeRecord.diagnosis) {
      setCurrentView('workspace');
      return;
    }
    await handleNewInvestigation();
  }, [activeRecord, handleNewInvestigation]);

  // Launch interactive demo from Welcome Screen (Arduino Uno SMD benchmark)
  const handleExploreDemo = useCallback(async () => {
    if (activeRecord && debouncedSaverRef.current.hasPending(activeRecord.id)) {
      try {
        await debouncedSaverRef.current.flush(activeRecord.id);
      } catch (err) {
        console.error('Failed to flush active investigation before launching demo:', err);
      }
    }

    const demoRecord = createNewInvestigationRecord('Arduino Uno SMD Edition');
    demoRecord.formData = {
      boardName: 'Arduino Uno SMD Edition',
      expectedBehavior: 'Powers from 5V USB-B or 9V DC barrel jack; 5V and 3.3V rails active with ON LED illuminated.',
      observedBehavior: 'Dead board; 5V rail collapses to 0.4V on both inputs with excessive current draw; ON LED dark.',
      relevantComponents: 'U1 (NCP1117ST50T3G), F1 polyfuse, C1/C2 (47uF caps)',
      additionalNotes: 'Board disconnected immediately to avoid thermal runaway. No visible burns on top side.',
    };
    demoRecord.title = 'Arduino Uno SMD Edition';

    try {
      const saved = await saveInvestigation(demoRecord);
      setActiveRecord(saved);
      setLastActiveId(saved.id);
      setCurrentView('workspace');
      setSaveStatus('saved');
      await refreshSummaries();
    } catch (err) {
      console.error('Failed to launch demo investigation:', err);
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

  const isMockDemo = healthData?.mode === 'mock_demo';

  const renderHealthIndicator = (isLandingPill = false) => (
    <div className="compact-health-wrapper">
      <button
        type="button"
        className={`compact-health-badge ${isLandingPill ? 'status-pill' : ''} ${
          healthStatus === 'error'
            ? 'err'
            : healthStatus === 'checking'
            ? 'checking'
            : isMockDemo
            ? 'offline-demo'
            : 'live-backend'
        }`}
        onClick={() => setIsHealthDrawerOpen(!isHealthDrawerOpen)}
        aria-expanded={isHealthDrawerOpen}
        aria-haspopup="dialog"
        aria-label={`${t.systemStatusTitle}: ${
          healthStatus === 'ok'
            ? isMockDemo
              ? (t.modeOfflineDemo || 'Offline Demo')
              : (t.modeLiveAi || 'Live AI')
            : healthStatus === 'checking'
            ? t.statusChecking
            : (t.statusError || 'Offline')
        }`}
      >
        <span className={`status-dot ${healthStatus === 'checking' ? 'pulse' : ''}`} />
        <span className="compact-health-text">
          {healthStatus === 'ok'
            ? isMockDemo
              ? (t.modeOfflineDemo || 'Offline Demo')
              : (t.modeLiveAi || 'Live AI')
            : healthStatus === 'checking'
            ? t.statusChecking
            : (t.statusError || 'Offline')}
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
              <span className="telemetry-value" style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={healthData?.service || 'CircuitLens'}>
                {healthData?.service || 'CircuitLens Service'}
              </span>
            </div>
            <div className="health-popover-cell">
              <span className="telemetry-label">Mode</span>
              <span className="telemetry-value highlight" style={{ color: isMockDemo ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                {isMockDemo ? 'OFFLINE DEMO' : 'LIVE BACKEND'}
              </span>
            </div>
            <div className="health-popover-cell">
              <span className="telemetry-label">Provider</span>
              <span className="telemetry-value">
                {isMockDemo ? 'None (Mock Fixture)' : (healthData?.provider || 'None')}
              </span>
            </div>
            <div className="health-popover-cell">
              <span className="telemetry-label">Target Model</span>
              <span className="telemetry-value" style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={isMockDemo ? 'Canned Fixtures' : (healthData?.targetModel || 'None')}>
                {isMockDemo ? 'Canned Fixtures' : (healthData?.targetModel || 'None')}
              </span>
            </div>
            <div className="health-popover-cell">
              <span className="telemetry-label">Status</span>
              <span className="telemetry-value highlight">
                {healthStatus === 'ok' ? (isMockDemo ? 'Ready (Mock Port 4001)' : t.statusConnected) : healthStatus === 'checking' ? t.statusChecking : t.statusError}
              </span>
            </div>
            {latency !== null && (
              <div className="health-popover-cell">
                <span className="telemetry-label">Ping Latency</span>
                <span className="telemetry-value">{latency} ms</span>
              </div>
            )}
          </div>

          <div className="health-popover-notice" style={{ marginTop: '0.65rem', padding: '0.45rem 0.6rem', background: isMockDemo ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.08)', border: `1px solid ${isMockDemo ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.2)'}`, borderRadius: '4px', fontSize: '0.725rem', color: isMockDemo ? '#fbbf24' : '#a7f3d0', lineHeight: 1.35 }}>
            {isMockDemo
              ? 'Deterministic Mock Backend (Port 4001). Replays canned fixtures. Does not perform visual circuit analysis.'
              : 'Configured API key present. Live inference verified on first successful analysis.'}
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
  );

  return (
    <div className="app-container">
      {/* Persistent Banner for Offline Demo Mock Server */}
      {isMockDemo && (
        <aside className="demo-mode-alert-banner" role="status" aria-label="Offline demo indicator">
          <div className="demo-mode-alert-content">
            <span className="demo-mode-badge">OFFLINE DEMO MODE (PORT 4001)</span>
            <span>
              Connected to local mock backend replaying static benchmark fixtures. Circuit image analysis is simulated.
              To perform live vision inference, launch the live backend on port 4000.
            </span>
          </div>
        </aside>
      )}

      {activeInvestigation ? (
        /* Compact Active-Investigation Header */
        <header className="active-investigation-top-bar" role="banner">
          <div className="active-investigation-left">
            <button
              type="button"
              className="brand-section-compact brand-link-btn"
              onClick={() => setCurrentView('welcome')}
              title={t.headerHome}
            >
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
            </button>

            <div className="investigation-meta-group">
              <span
                className="investigation-board-name"
                title={
                  activeInvestigation.boardName?.trim() ||
                  (activeRecord?.title && activeRecord.title !== 'Untitled Investigation' ? activeRecord.title : null) ||
                  t.newInvestigationFallback
                }
              >
                {activeInvestigation.boardName?.trim() ||
                  (activeRecord?.title && activeRecord.title !== 'Untitled Investigation' ? activeRecord.title : null) ||
                  t.newInvestigationFallback}
              </span>

              {/* Consolidated Diagnosis Status Pill */}
              <span className={`investigation-status-pill ${activeInvestigation.reassessmentCount > 0 ? 'reassessed' : 'active'}`}>
                {activeInvestigation.reassessmentCount === 0
                  ? t.statusActiveAssessment
                  : `${t.statusReassessed} (R${activeInvestigation.reassessmentCount})`}
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
              <span>{t.headerAllCases}</span>
              {summaries.length > 0 && <span className="dashboard-count-badge">{summaries.length}</span>}
            </button>

            {/* Accessible Compact Health Indicator */}
            {renderHealthIndicator(false)}

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

            {/* New Investigation Action */}
            <button
              type="button"
              className="action-btn outline-btn compact-header-action-btn new-inv-btn"
              onClick={handleNewInvestigation}
              title={t.compactNewInvestigation}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>{t.headerNewCase}</span>
            </button>
          </div>
        </header>
      ) : (
        /* Workspace / Dashboard / Welcome Top Bar */
        <header className="top-bar">
          <div
            className="brand-section brand-link-btn"
            onClick={() => setCurrentView('welcome')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCurrentView('welcome'); }}
            title={t.headerHome}
          >
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

            {/* Navigation Switchers */}
            <div className="header-nav-pills">
              <button
                type="button"
                className={`header-nav-pill ${currentView === 'welcome' ? 'active' : ''}`}
                onClick={() => setCurrentView('welcome')}
              >
                {t.headerHome}
              </button>

              <button
                type="button"
                className={`header-nav-pill ${currentView === 'workspace' ? 'active' : ''}`}
                onClick={() => setCurrentView('workspace')}
              >
                {t.headerWorkbench}
              </button>

              <button
                type="button"
                className={`header-nav-pill ${currentView === 'dashboard' ? 'active' : ''}`}
                onClick={handleNavigateToDashboard}
              >
                <span>{t.headerAllCases}</span>
                {summaries.length > 0 && <span className="dashboard-count-badge">{summaries.length}</span>}
              </button>
            </div>

            {/* New Investigation Quick Button */}
            <button
              type="button"
              className="action-btn outline-btn new-inv-btn"
              onClick={handleNewInvestigation}
              title={t.compactNewInvestigation}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>{t.headerNewCase}</span>
            </button>

            {/* Compact Connectivity Pill */}
            {renderHealthIndicator(true)}

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
        {currentView === 'welcome' ? (
          <WelcomeScreen
            t={t}
            lang={lang}
            summaries={summaries}
            onStartInvestigation={handleStartFromWelcome}
            onExploreDemo={handleExploreDemo}
            onOpenInvestigation={handleOpenInvestigation}
            onViewAllInvestigations={handleNavigateToDashboard}
            isMockDemo={isMockDemo}
          />
        ) : currentView === 'dashboard' ? (
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
          /* Vision & Schematic Intake Section in Workspace */
          <IntakeSection
            t={t}
            lang={lang}
            onActiveInvestigationChange={setActiveInvestigation}
            activeInvestigationRecord={activeRecord}
            onInvestigationUpdate={handleInvestigationUpdate}
            onNewInvestigationRequest={handleNewInvestigation}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>{t.footerNotice}</p>
      </footer>
    </div>
  );
}

export default App;

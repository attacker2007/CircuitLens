import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { translations, isRtl, type SupportedLanguage } from './i18n';
import { IntakeSection } from './components/IntakeSection';

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

  const t = translations[lang];

  // Synchronize document theme and RTL direction
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('dir', isRtl(lang) ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

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

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="app-container">
      <header className="top-bar">
        <div className="brand-section">
          {/* Electronics IC / Circuit SVG icon */}
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

      <main className="main-content">
        <section className="hero-banner">
          <div className="hero-tag">{t.stageBadge}</div>
          <h1 className="hero-title">{t.stageTitle}</h1>
          <p className="hero-subtitle">{t.stageSubtitle}</p>
        </section>

        {/* Backend Connectivity Status Panel */}
        <section className="card-panel">
          <div className="card-header">
            <div className="card-title-group">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-cyan)' }}>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <h2 className="card-title">{t.systemStatusTitle}</h2>
            </div>
            <div>
              {healthStatus === 'checking' && (
                <span className="status-pill checking">
                  <span className="status-dot pulse" />
                  {t.statusChecking}
                </span>
              )}
              {healthStatus === 'ok' && (
                <span className="status-pill ok">
                  <span className="status-dot" />
                  {t.statusConnected}
                </span>
              )}
              {healthStatus === 'error' && (
                <span className="status-pill err">
                  <span className="status-dot" />
                  {t.statusError}
                </span>
              )}
            </div>
          </div>

          <div className="telemetry-grid">
            <div className="telemetry-cell">
              <span className="telemetry-label">{t.endpointLabel}</span>
              <span className="telemetry-value">/api/health</span>
            </div>
            <div className="telemetry-cell">
              <span className="telemetry-label">{t.apiProxyStatusLabel}</span>
              <span className="telemetry-value highlight">{t.apiProxyVerified}</span>
            </div>
            <div className="telemetry-cell">
              <span className="telemetry-label">{t.serviceLabel}</span>
              <span className="telemetry-value">
                {healthData?.service || '—'}
              </span>
            </div>
            <div className="telemetry-cell">
              <span className="telemetry-label">{t.targetModelLabel}</span>
              <span className="telemetry-value">
                {healthData?.targetModel || '—'}
              </span>
            </div>
            <div className="telemetry-cell">
              <span className="telemetry-label">{t.latencyLabel}</span>
              <span className="telemetry-value">
                {latency !== null ? `${latency} ms` : '—'}
              </span>
            </div>
            <div className="telemetry-cell">
              <span className="telemetry-label">{t.timestampLabel}</span>
              <span className="telemetry-value">
                {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString() : '—'}
              </span>
            </div>
          </div>

          <div className="card-footer-actions">
            <button
              type="button"
              className="action-btn"
              onClick={probeHealth}
              disabled={healthStatus === 'checking'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>{t.retryButton}</span>
            </button>
          </div>
        </section>

        {/* Stage 2: Vision & Schematic Intake Section */}
        <IntakeSection t={t} lang={lang} />

        {/* Active Pipeline & Core Capabilities */}
        <section aria-labelledby="pipeline-overview-heading">
          <h2 id="pipeline-overview-heading" className="roadmap-section-title">{t.nextStagesTitle}</h2>
          <p className="roadmap-section-sub">{t.nextStagesSubtitle}</p>
          <div className="roadmap-grid">
            <div className="roadmap-card active">
              <h3 className="roadmap-card-title">{t.stage2Title}</h3>
              <p className="roadmap-card-desc">{t.stage2Desc}</p>
            </div>
            <div className="roadmap-card active">
              <h3 className="roadmap-card-title">{t.stage3Title}</h3>
              <p className="roadmap-card-desc">{t.stage3Desc}</p>
            </div>
            <div className="roadmap-card active">
              <h3 className="roadmap-card-title">{t.stage4Title}</h3>
              <p className="roadmap-card-desc">{t.stage4Desc}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <p>{t.footerNotice}</p>
      </footer>
    </div>
  );
}

export default App;

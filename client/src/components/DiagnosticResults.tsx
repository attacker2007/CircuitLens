import { useState, useMemo, useRef, useEffect } from 'react';
import type { Translations, SupportedLanguage } from '../i18n';
import type {
  DiagnosisResponse,
  ConfidenceLevel,
  EvidenceRecord,
  InvestigationRecommendation,
  DiagnosisReassessmentRequest,
  DiagnosisReassessmentResponse,
  DiagnosticContextPayload,
  RevisedHypothesisStatus,
} from '../types/diagnosis';
import type { IntakeFormValues, IntakeFileState } from '../types/intake';
import type { AssistantMessage } from '../types/assistant';
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
import { findLatestRevisedHypothesis } from '../utils/hypothesisMatching';
import { CircuitImageInspector } from './CircuitImageInspector';
import { CurrentAssessmentPanel } from './CurrentAssessmentPanel';
import { HypothesisEvolutionMatrix } from './HypothesisEvolutionMatrix';
import { EvidenceTimelineView } from './EvidenceTimelineView';
import { DiagnosticReportView } from './DiagnosticReportView';
import { DiagnosticTelemetryCard } from './DiagnosticTelemetryCard';
import { InvestigationAssistantPanel } from './InvestigationAssistantPanel';
import { CircuitUnderstandingView } from './CircuitUnderstandingView';
import {
  buildHypothesisEvolutionMatrix,
  buildEvidenceTimeline,
  buildCurrentDiagnosticSummary,
} from '../utils/evolutionBuilder';
import { buildDiagnosticReport } from '../utils/reportBuilder';
import {
  exportReportToJson,
  exportReportToMarkdown,
} from '../utils/reportExporters';
import { MobileBottomActionDock } from './MobileBottomActionDock';
import { buildAssistantInvestigationContext } from '../utils/assistantContextBuilder';

interface DiagnosticResultsProps {
  diagnosis: DiagnosisResponse;
  formData?: IntakeFormValues;
  imageFileState?: IntakeFileState | null;
  t: Translations;
  lang?: SupportedLanguage;
  onEditIntake: () => void;
  onNewInvestigation: () => void;
  onReassessmentCountChange?: (count: number) => void;
  investigationId?: string;
  initialEvidenceLog?: EvidenceRecord[];
  initialReassessments?: DiagnosisReassessmentResponse[];
  initialActivePerspective?: 'overview' | 'matrix' | 'timeline' | 'report' | 'theory';
  initialInspectorZoom?: number;
  initialInspectorPan?: { x: number; y: number };
  initialAssistantMessages?: AssistantMessage[];
  onInvestigationUpdate?: (updates: {
    evidenceLog?: EvidenceRecord[];
    reassessments?: DiagnosisReassessmentResponse[];
    reassessmentCycle?: number;
    activePerspective?: 'overview' | 'matrix' | 'timeline' | 'report' | 'theory';
    inspectorZoom?: number;
    inspectorPan?: { x: number; y: number };
    assistantMessages?: AssistantMessage[];
  }) => void;
}

export function DiagnosticResults({
  diagnosis,
  formData,
  imageFileState,
  t,
  lang = 'en',
  onEditIntake,
  onNewInvestigation,
  onReassessmentCountChange,
  investigationId: propInvestigationId,
  initialEvidenceLog,
  initialReassessments,
  initialActivePerspective,
  initialInspectorZoom,
  initialInspectorPan,
  initialAssistantMessages,
  onInvestigationUpdate,
}: DiagnosticResultsProps) {
  const [activePerspective, setActivePerspective] = useState<'overview' | 'matrix' | 'timeline' | 'report' | 'theory'>(
    initialActivePerspective || 'overview'
  );
  const [selectedObservationText, setSelectedObservationText] = useState<string | null>(null);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string | null>(null);
  const [evidenceLog, setEvidenceLog] = useState<EvidenceRecord[]>(() => initialEvidenceLog || []);

  // Preserved image inspector state across perspective switches
  const [inspectorZoom, setInspectorZoom] = useState<number>(initialInspectorZoom ?? 1.0);
  const [inspectorPan, setInspectorPan] = useState<{ x: number; y: number }>(initialInspectorPan || { x: 0, y: 0 });

  // Investigation identity anchored to component state
  const [investigationId] = useState<string>(() => propInvestigationId || generateInvestigationId());

  // Subsequent cycle recommendations from reassessments
  const [subsequentRecommendations, setSubsequentRecommendations] = useState<InvestigationRecommendation[]>([]);

  // Stage 6C-3A: Contextual Assistant state
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>(
    () => initialAssistantMessages || []
  );
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  // Reassessment workflow state
  const [reassessmentNotes, setReassessmentNotes] = useState<string>('');
  const [isReassessing, setIsReassessing] = useState<boolean>(false);
  const [reassessmentError, setReassessmentError] = useState<{
    title: string;
    message: string;
    isRetryable: boolean;
  } | null>(null);
  const [reassessments, setReassessments] = useState<DiagnosisReassessmentResponse[]>(() => initialReassessments || []);
  const [reassessmentCycle, setReassessmentCycle] = useState<number>(() => (initialReassessments ? initialReassessments.length : 0));

  // Interactive hypothesis accordion state (leading hypothesis expanded by default)
  const [expandedHypotheses, setExpandedHypotheses] = useState<Record<number, boolean>>({ 0: true });
  const toggleHypothesis = (idx: number) => {
    setExpandedHypotheses((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Stage 6C-3A: Synchronize assistant messages on case switch or reload
  const prevInvIdRef = useRef(investigationId);
  useEffect(() => {
    if (prevInvIdRef.current !== investigationId) {
      prevInvIdRef.current = investigationId;
      setAssistantMessages(initialAssistantMessages || []);
      return;
    }
    // Only update if incoming messages has more items (never clobber active session)
    if (initialAssistantMessages && initialAssistantMessages.length > assistantMessages.length) {
      setAssistantMessages(initialAssistantMessages);
    }
  }, [initialAssistantMessages, investigationId, assistantMessages.length]);

  // In-flight request controller to support clean cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Notify parent of state updates for local persistence
  useEffect(() => {
    onInvestigationUpdate?.({
      evidenceLog,
      reassessments,
      reassessmentCycle,
      activePerspective,
      inspectorZoom,
      inspectorPan,
      assistantMessages,
    });
  }, [evidenceLog, reassessments, reassessmentCycle, activePerspective, inspectorZoom, inspectorPan, assistantMessages, onInvestigationUpdate]);

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

  // Synchronize reassessment cycle count to parent active investigation header
  useEffect(() => {
    onReassessmentCountChange?.(reassessments.length);
  }, [reassessments.length, onReassessmentCountChange]);

  // Derived multi-round hypothesis evolution matrix
  const evolutionRows = useMemo(() => {
    return buildHypothesisEvolutionMatrix(diagnosis, reassessments, evidenceLog);
  }, [diagnosis, reassessments, evidenceLog]);

  // Derived chronological evidence timeline events
  const timelineEvents = useMemo(() => {
    return buildEvidenceTimeline(diagnosis, reassessments, evidenceLog);
  }, [diagnosis, reassessments, evidenceLog]);

  // Derived current diagnostic assessment summary
  const currentAssessmentSummary = useMemo(() => {
    return buildCurrentDiagnosticSummary(diagnosis, reassessments);
  }, [diagnosis, reassessments]);

  // Derived structured diagnostic export payload
  const diagnosticReportPayload = useMemo(() => {
    return buildDiagnosticReport({
      investigationId,
      diagnosis,
      formData,
      imageFileState,
      evidenceLog,
      reassessments,
      t,
    });
  }, [investigationId, diagnosis, formData, imageFileState, evidenceLog, reassessments, t]);

  // Derived bounded assistant context payload (Stage 6C-3A)
  const assistantContext = useMemo(() => {
    return buildAssistantInvestigationContext({
      id: investigationId,
      title: formData?.boardName || 'Investigation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'under_investigation',
      isArchived: false,
      imageBlob: null,
      imageMetadata: null,
      formData: formData || {
        boardName: '',
        expectedBehavior: '',
        observedBehavior: '',
        relevantComponents: '',
        additionalNotes: '',
      },
      isStaged: true,
      diagnosis,
      evidenceLog,
      reassessments,
      reassessmentCycle,
      activePerspective,
      inspectorZoom,
      inspectorPan,
      schemaVersion: '1.1.0',
      assistantMessages,
    });
  }, [investigationId, formData, diagnosis, evidenceLog, reassessments, reassessmentCycle, activePerspective, inspectorZoom, inspectorPan, assistantMessages]);

  const handleAssistantMessagesChange = (newMessages: AssistantMessage[]) => {
    setAssistantMessages(newMessages);
    onInvestigationUpdate?.({
      assistantMessages: newMessages,
    });
  };

  // Export handlers for printable PDF, JSON schema 1.1.0, and Markdown
  const handlePrintReport = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    try {
      const jsonStr = exportReportToJson(diagnosticReportPayload);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `circuitlens-report-${diagnosticReportPayload.investigationId.toLowerCase()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export report JSON:', err);
    }
  };

  const handleDownloadMarkdown = () => {
    try {
      const mdStr = exportReportToMarkdown(diagnosticReportPayload, t);
      const blob = new Blob([mdStr], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `circuitlens-report-${diagnosticReportPayload.investigationId.toLowerCase()}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export report Markdown:', err);
    }
  };

  // Mobile dock quick-action handlers
  const handleDockLogEvidence = () => {
    if (activePerspective !== 'overview') {
      setActivePerspective('overview');
    }
    setTimeout(() => {
      // If no recommendation is currently open, open the first one
      if (!selectedRecommendationId && allRecommendations.length > 0) {
        setSelectedRecommendationId(allRecommendations[0].targetRecommendationId);
      }
      const checksSection = document.getElementById('recommended-checks-section') || document.querySelector('.recommended-checks-panel');
      if (checksSection) {
        checksSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const targetBtn = checksSection.querySelector('button.check-perform-btn, button.check-item-toggle, input, select') as HTMLElement | null;
        if (targetBtn) {
          targetBtn.focus({ preventScroll: true });
        }
      }
    }, 120);
  };

  const handleDockReassessment = () => {
    if (isReassessing) return;
    if (evidenceLog.length === 0) {
      handleDockLogEvidence();
      return;
    }
    if (evidenceLog.length > 20) return;
    if (activePerspective !== 'overview') {
      setActivePerspective('overview');
      setTimeout(() => {
        const reassessSection = document.getElementById('reassessment-action-panel') || document.querySelector('.reassessment-control-panel');
        if (reassessSection) {
          reassessSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const submitBtn = reassessSection.querySelector('.reassess-submit-btn') as HTMLElement | null;
          if (submitBtn) {
            submitBtn.focus({ preventScroll: true });
          }
        }
      }, 120);
    } else {
      const reassessSection = document.getElementById('reassessment-action-panel') || document.querySelector('.reassessment-control-panel');
      if (reassessSection) {
        reassessSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const submitBtn = reassessSection.querySelector('.reassess-submit-btn') as HTMLElement | null;
        if (submitBtn) {
          submitBtn.focus({ preventScroll: true });
        }
      }
    }
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

  const latestReassessment = useMemo(() => {
    return reassessments.length > 0 ? reassessments[reassessments.length - 1] : null;
  }, [reassessments]);

  const getRevisedStatusLabel = (status: RevisedHypothesisStatus): string => {
    switch (status) {
      case 'supported':
        return t.statusSupported;
      case 'weakened':
        return t.statusWeakened;
      case 'contradicted':
        return t.statusContradicted;
      case 'unresolved':
      default:
        return t.statusUnresolved;
    }
  };

  const getRevisedStatusBadgeClass = (status: RevisedHypothesisStatus): string => {
    switch (status) {
      case 'supported':
        return 'status-badge-supported';
      case 'weakened':
        return 'status-badge-weakened';
      case 'contradicted':
        return 'status-badge-contradicted';
      case 'unresolved':
      default:
        return 'status-badge-unresolved';
    }
  };

  const handleScrollToLatestReassessment = () => {
    const target = document.getElementById('latest-reassessment-view');
    if (target) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
      target.focus({ preventScroll: true });
    }
  };

  const handleScrollToHypothesisRevision = (revisedTitle: string) => {
    const targetId = `latest-rev-hyp-${encodeURIComponent(revisedTitle.trim().toLowerCase())}`;
    const target = document.getElementById(targetId);
    if (target) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
      });
      target.focus({ preventScroll: true });
    } else {
      handleScrollToLatestReassessment();
    }
  };
  // --------------------------------------------------------------------------
  // WORKBENCH SUB-COMPONENTS & SECTIONS
  // --------------------------------------------------------------------------

  const renderSubnav = () => (
    <nav className="diagnostic-subnav-bar" aria-label={t.subnavAriaLabel || 'Diagnostic workstation views'}>
      <button
        type="button"
        className={`subnav-tab-btn ${activePerspective === 'overview' ? 'active' : ''}`}
        onClick={() => setActivePerspective('overview')}
        aria-current={activePerspective === 'overview' ? 'page' : undefined}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
        <span>{t.subnavOverview || 'Overview'}</span>
      </button>

      <button
        type="button"
        className={`subnav-tab-btn ${activePerspective === 'matrix' ? 'active' : ''}`}
        onClick={() => setActivePerspective('matrix')}
        aria-current={activePerspective === 'matrix' ? 'page' : undefined}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20v-6M6 20V10M18 20V4" />
        </svg>
        <span>{t.subnavMatrix || 'Hypothesis Evolution Matrix'}</span>
        {reassessments.length > 0 && (
          <span className="subnav-tab-badge">R{reassessments.length}</span>
        )}
      </button>

      <button
        type="button"
        className={`subnav-tab-btn ${activePerspective === 'timeline' ? 'active' : ''}`}
        onClick={() => setActivePerspective('timeline')}
        aria-current={activePerspective === 'timeline' ? 'page' : undefined}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 14 14" />
        </svg>
        <span>{t.subnavTimeline || 'Evidence Timeline'}</span>
        {evidenceLog.length > 0 && (
          <span className="subnav-tab-badge">{evidenceLog.length}</span>
        )}
      </button>

      <button
        type="button"
        className={`subnav-tab-btn ${activePerspective === 'theory' ? 'active' : ''}`}
        onClick={() => setActivePerspective('theory')}
        aria-current={activePerspective === 'theory' ? 'page' : undefined}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
        <span>{t.subnavTheory || 'Theory & Architecture'}</span>
        {diagnosis.circuitUnderstanding?.functionalBlocks && (
          <span className="subnav-tab-badge">
            {diagnosis.circuitUnderstanding.functionalBlocks.length}
          </span>
        )}
      </button>

      <button
        type="button"
        className={`subnav-tab-btn ${activePerspective === 'report' ? 'active' : ''}`}
        onClick={() => setActivePerspective('report')}
        aria-current={activePerspective === 'report' ? 'page' : undefined}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span>{t.subnavReport || 'Report Export'}</span>
      </button>

      <div className="subnav-divider-v" aria-hidden="true" style={{ width: 1, height: 24, backgroundColor: 'var(--border-color)', margin: '0 0.25rem' }} />

      <button
        type="button"
        className={`subnav-assistant-btn ${isAssistantOpen ? 'active' : ''}`}
        onClick={() => setIsAssistantOpen(!isAssistantOpen)}
        aria-expanded={isAssistantOpen}
        aria-label={`${t.assistantToggleBtn} (${assistantMessages.length} ${t.assistantMessagesCount})`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
        </svg>
        <span>{t.assistantToggleBtn}</span>
        {assistantMessages.length > 0 && (
          <span className="assistant-badge-count">{assistantMessages.length}</span>
        )}
      </button>
    </nav>
  );

  const renderResultsSummaryPanel = () => (
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {diagnosis.provenance === 'live_provider' ? (
            <span className="provenance-badge live-model" title="Generated by live model inference">
              🟢 Live Vision Model ({diagnosis.metadata?.provider || 'Baseten'})
            </span>
          ) : diagnosis.provenance === 'offline_fixture' || diagnosis.isOfflineMock ? (
            <span className="provenance-badge offline-mock" title="Generated from pre-packaged offline fixture">
              ⚠️ Deterministic Offline Replay
            </span>
          ) : (
            <span className="provenance-badge unverified" title="Legacy or unverified result provenance">
              ⚪ UNVERIFIED RESULT
            </span>
          )}
          <span className="stage-status-badge results-badge">{t.resultsBadge}</span>
        </div>
      </div>
      <p className="intake-section-desc">{t.resultsSectionSubtitle}</p>

      {/* Offline Demo Notice if response came from canned mock */}
      {(diagnosis.isOfflineMock || diagnosis.provenance === 'offline_fixture') && (
        <div className="provenance-alert-banner" role="status" aria-label="Mock fixture disclosure">
          <div className="provenance-alert-header">
            <span>⚠️</span>
            <span>Pre-Packaged Offline Benchmark Fixture</span>
          </div>
          <p>
            This diagnostic assessment was replayed from a static mock fixture (Arduino Uno SMD reference scenario). It was not produced by live optical analysis of your uploaded circuit photograph. Run the live backend on port 4000 to analyze actual hardware images.
          </p>
        </div>
      )}

      {/* 1. Mandatory Critical Safety Warning Banner */}
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
  );

  const renderDirectOpticalObservations = () => (
    <section className="card-panel observations-rail-panel" aria-labelledby="observations-heading">
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
        {diagnosis.visibleObservations.map((obs, idx) => {
          const isCrossReferenced = selectedObservationText === obs.description;
          return (
            <article
              key={`obs-${idx}`}
              className={`observation-card ${isCrossReferenced ? 'observation-card-active' : ''}`}
              onClick={() => setSelectedObservationText(prev => prev === obs.description ? null : obs.description)}
              style={{ cursor: 'pointer' }}
              title={isCrossReferenced ? (t.crossReferenceClear || 'Click to clear cross-reference') : (t.crossReferenceHint || 'Click to cross-reference with circuit photograph')}
            >
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
          );
        })}
      </div>
    </section>
  );

  const renderFaultHypotheses = () => (
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
        <span className="stage-status-badge initial-diagnosis-badge">
          {t.initialDiagnosisBadge}
        </span>
      </div>
      <p className="intake-section-desc">{t.hypothesesSubtitle}</p>

      {/* Informational banner when subsequent reassessment rounds have updated the fault analysis */}
      {reassessments.length > 0 && (
        <div
          className="hypotheses-reassessment-notice"
          role="region"
          aria-label={t.hypothesesRevisedNotice.replace('{round}', String(reassessments.length))}
        >
          <div className="notice-content">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="notice-icon"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p className="notice-text">
              {t.hypothesesRevisedNotice.replace('{round}', String(reassessments.length))}
            </p>
          </div>
          <button
            type="button"
            className="action-btn secondary-btn view-latest-reassessment-btn"
            onClick={handleScrollToLatestReassessment}
            aria-controls="latest-reassessment-view"
          >
            <span>{t.viewLatestReassessmentBtn}</span>
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
              <polyline points="7 13 12 18 17 13" />
              <polyline points="7 6 12 11 17 6" />
            </svg>
          </button>
        </div>
      )}

      <div className="hypotheses-list">
        {diagnosis.hypotheses.map((hyp, idx) => {
          const latestRevised = findLatestRevisedHypothesis(hyp.title, latestReassessment);
          const isExpanded = !!expandedHypotheses[idx];
          return (
            <article key={`hyp-${idx}`} className={`hypothesis-card interactive-hypothesis-card ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}>
              <div
                className="hypothesis-card-header"
                onClick={() => toggleHypothesis(idx)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleHypothesis(idx);
                  }
                }}
              >
                <div className="hypothesis-title-group">
                  <span className="hypothesis-rank" aria-hidden="true">
                    H{idx + 1}
                  </span>
                  <h4 className="hypothesis-title">{hyp.title}</h4>
                </div>
                <div className="hypothesis-badges-cluster">
                  <span
                    className={`confidence-badge ${getConfidenceBadgeClass(hyp.confidence)}`}
                    title={`${t.confidenceLabel} (${t.initialDiagnosisBadge}): ${getConfidenceLabel(
                      hyp.confidence
                    )}`}
                  >
                    {getConfidenceLabel(hyp.confidence)}
                  </span>
                  {latestRevised && (
                    <button
                      type="button"
                      className={`status-badge latest-status-badge ${getRevisedStatusBadgeClass(
                        latestRevised.status
                      )}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScrollToHypothesisRevision(hyp.title);
                      }}
                      title={`${t.latestStatusLabel}: ${getRevisedStatusLabel(
                        latestRevised.status
                      )} (${t.reassessmentCycleBadge} #${reassessments.length})`}
                      aria-label={`${t.latestStatusLabel}: ${getRevisedStatusLabel(
                        latestRevised.status
                      )} (${t.reassessmentCycleBadge} #${reassessments.length}). ${
                        t.jumpToHypothesisRevision
                      }`}
                    >
                      <span className="badge-prefix">{t.latestStatusLabel}: </span>
                      <strong>{getRevisedStatusLabel(latestRevised.status)}</strong>
                      <span className="badge-cycle" dir="ltr">
                        {' '}
                        (R{reassessments.length})
                      </span>
                    </button>
                  )}
                  <span className="hypothesis-chevron-icon" aria-hidden="true">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>
              </div>

              {!isExpanded && (
                <div className="hypothesis-collapsed-preview" onClick={() => toggleHypothesis(idx)}>
                  <p className="hypothesis-preview-snippet">{hyp.reasoning}</p>
                  <span className="hypothesis-preview-action">Expand verification steps ↓</span>
                </div>
              )}

              {isExpanded && (
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
                          <li
                            key={`ev-${eIdx}`}
                            className="hypothesis-evidence-item clickable-evidence-item"
                            onClick={() => setSelectedObservationText(ev)}
                            title="Cross-reference on circuit image inspector"
                          >
                            <span className="evidence-bullet-icon" aria-hidden="true">🔍</span>
                            <span>{ev}</span>
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

                  {/* Interactive Troubleshooting Action Dock */}
                  <div className="hypothesis-actions-dock">
                    <button
                      type="button"
                      className="action-btn secondary-btn hyp-test-check-btn"
                      onClick={() => {
                        const checkSection = document.getElementById('recommended-checks-section');
                        if (checkSection) {
                          checkSection.scrollIntoView({ behavior: 'smooth' });
                          if (allRecommendations[idx]) {
                            setSelectedRecommendationId(allRecommendations[idx].targetRecommendationId);
                          }
                        }
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                      <span>⚡ Perform Recommended Check</span>
                    </button>
                    <button
                      type="button"
                      className="action-btn secondary-btn hyp-ask-assistant-btn"
                      onClick={() => setIsAssistantOpen(true)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>💬 Consult Assistant on H{idx + 1}</span>
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );

  const renderRecommendedChecks = () => (
    <section className="card-panel recommended-checks-panel" id="recommended-checks-section" aria-labelledby="checks-heading">
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
  );

  const renderReassessmentControls = () => (
    <section className="card-panel reassessment-control-panel" id="reassessment-action-panel" aria-labelledby="reassessment-ctrl-heading">
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
  );

  const renderActionsFooter = () => (
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
  );

  // --------------------------------------------------------------------------
  // MAIN WORKBENCH RENDER
  // --------------------------------------------------------------------------

  return (
    <div className="diagnosis-results-root" role="region" aria-labelledby="results-main-heading">
      {/* Sub-navigation Perspective Switcher */}
      {renderSubnav()}

      {/* Perspective 1: Overview (Responsive Desktop Split Layout) */}
      {activePerspective === 'overview' && (
        <div className="overview-perspective-container">
          {/* Desktop Split Layout (balanced 2-column grid at >= 1024px; single column flex on mobile) */}
          <div className="desktop-workbench-split">
            {/* Left Column: Circuit Inspection Workstation */}
            <div
              className="workbench-inspection-rail"
              aria-label={t.inspectionRailAriaLabel || 'Circuit inspection workstation'}
            >
              <div id="circuit-inspection-workstation" className="circuit-inspection-workstation-wrapper">
                <CircuitImageInspector
                  src={imageFileState?.previewUrl || ''}
                  alt={imageFileState?.name || t.brandName}
                  fileName={imageFileState?.name}
                  fileSizeFormatted={imageFileState?.sizeFormatted}
                  t={t}
                  initialZoomState={inspectorZoom}
                  onZoomChange={setInspectorZoom}
                  initialPanState={inspectorPan}
                  onPanChange={setInspectorPan}
                  selectedObservationText={selectedObservationText}
                  onClearSelectedObservation={() => setSelectedObservationText(null)}
                />
              </div>

              {/* Direct Optical Observations directly below circuit image for cross-referencing */}
              {renderDirectOpticalObservations()}

              {/* Limitations & Analytical Boundaries in Left Rail */}
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

              {/* Diagnostic Telemetry in Left Rail */}
              {diagnosis.metadata && (
                <DiagnosticTelemetryCard
                  telemetry={diagnosis.metadata}
                  title={t.initialTelemetryCardTitle || 'Initial Diagnosis AI Telemetry'}
                  t={t}
                />
              )}
            </div>

            {/* Right Column: Diagnostic & Troubleshooting Workflow */}
            <div
              className="workbench-workflow-rail"
              aria-label={t.workflowRailAriaLabel || 'Diagnostic reasoning and troubleshooting workflow'}
            >
              {/* Results Summary Panel (Safety warning + Executive summary) */}
              {renderResultsSummaryPanel()}

              {/* Current Assessment Component */}
              <CurrentAssessmentPanel
                summary={currentAssessmentSummary}
                t={t}
                onNavigateToMatrix={() => setActivePerspective('matrix')}
                onNavigateToTimeline={() => setActivePerspective('timeline')}
                onNavigateToExport={() => setActivePerspective('report')}
              />

              {/* Fault Hypotheses */}
              {renderFaultHypotheses()}

              {/* Recommended Checks */}
              {renderRecommendedChecks()}

              {/* Reassessment Action & Controls */}
              {renderReassessmentControls()}
            </div>
          </div>

          {/* Overview Secondary Flow (Beneath the Split Layout) */}
          <div className="workbench-secondary-flow">
            {/* Disclaimer Notice */}
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

            {/* Results Action Footer */}
            {renderActionsFooter()}
          </div>
        </div>
      )}

      {/* Perspective 2: Hypothesis Evolution Matrix */}
      {activePerspective === 'matrix' && (
        <div className="perspective-matrix-container">
          {renderResultsSummaryPanel()}
          <CurrentAssessmentPanel
            summary={currentAssessmentSummary}
            t={t}
            onNavigateToMatrix={() => setActivePerspective('matrix')}
            onNavigateToTimeline={() => setActivePerspective('timeline')}
            onNavigateToExport={() => setActivePerspective('report')}
          />
          <HypothesisEvolutionMatrix
            rows={evolutionRows}
            reassessmentCount={reassessments.length}
            t={t}
          />
          {/* Detailed Reassessment Findings per Cycle */}
          {reassessments.map((reassessment, rIdx) => (
            <ReassessmentResultsView
              key={`matrix-reassessment-round-${rIdx + 1}`}
              reassessment={reassessment}
              evidenceLog={evidenceLog}
              cycleNumber={rIdx + 1}
              isLatest={rIdx === reassessments.length - 1}
              t={t}
              onSelectRecommendation={(id) => {
                setSelectedRecommendationId(id);
                setActivePerspective('overview');
                setTimeout(() => {
                  const el = document.getElementById(`check-${id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                }, 100);
              }}
            />
          ))}
          {renderActionsFooter()}
        </div>
      )}

      {/* Perspective 3: Evidence Timeline */}
      {activePerspective === 'timeline' && (
        <div className="perspective-timeline-container">
          {renderResultsSummaryPanel()}
          <CurrentAssessmentPanel
            summary={currentAssessmentSummary}
            t={t}
            onNavigateToMatrix={() => setActivePerspective('matrix')}
            onNavigateToTimeline={() => setActivePerspective('timeline')}
            onNavigateToExport={() => setActivePerspective('report')}
          />
          <EvidenceTimelineView
            events={timelineEvents}
            t={t}
          />
          <EvidenceLogView
            evidenceLog={evidenceLog}
            t={t}
            onSelectRecommendation={(id) => {
              setSelectedRecommendationId(id);
              setActivePerspective('overview');
              setTimeout(() => {
                const element = document.getElementById(`check-${id}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              }, 100);
            }}
          />
          {renderActionsFooter()}
        </div>
      )}

      {/* Perspective 4: Report Export */}
      {activePerspective === 'report' && (
        <div className="perspective-report-container">
          {renderResultsSummaryPanel()}
          <div className="card-panel report-export-panel" aria-labelledby="report-export-heading">
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <div>
                  <h3 id="report-export-heading" className="card-title">
                    {t.exportSectionTitle}
                  </h3>
                  <p className="intake-section-desc">{t.exportSectionSubtitle}</p>
                </div>
              </div>
              <div className="export-status-badges" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="stage-status-badge report-schema-badge">
                  Schema v{diagnosticReportPayload.schemaVersion}
                </span>
                <span className="stage-status-badge">
                  {t.exportReportBadge}
                </span>
              </div>
            </div>

            {/* Action Buttons for PDF/Print, JSON Schema 1.1.0, and Markdown */}
            <div className="report-export-actions">
              <button
                type="button"
                className="report-export-btn print-btn"
                onClick={handlePrintReport}
                title={t.exportPrintPdfBtn}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                <span>{t.exportPrintPdfBtn}</span>
              </button>

              <button
                type="button"
                className="report-export-btn json-btn"
                onClick={handleDownloadJson}
                title={t.exportJsonBtn}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>{t.exportJsonBtn}</span>
              </button>

              <button
                type="button"
                className="report-export-btn md-btn"
                onClick={handleDownloadMarkdown}
                title={t.exportMarkdownBtn}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <polyline points="9 15 12 18 15 15" />
                </svg>
                <span>{t.exportMarkdownBtn}</span>
              </button>
            </div>

            {/* Epistemic Guardrail Notice */}
            <div className="export-epistemic-banner" role="note">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p>{t.exportEpistemicNotice}</p>
            </div>

            {/* High-Level Report Scope Summary */}
            <div className="report-scope-grid">
              <div className="report-scope-cell">
                <span className="report-scope-label">{t.exportInvestigationIdLabel}</span>
                <span className="report-scope-value"><code>{diagnosticReportPayload.investigationId}</code></span>
              </div>
              <div className="report-scope-cell">
                <span className="report-scope-label">Report ID</span>
                <span className="report-scope-value"><code>{diagnosticReportPayload.reportId}</code></span>
              </div>
              <div className="report-scope-cell">
                <span className="report-scope-label">{t.exportGeneratedAtLabel}</span>
                <span className="report-scope-value">{new Date(diagnosticReportPayload.generatedAt).toLocaleDateString()}</span>
              </div>
              <div className="report-scope-cell">
                <span className="report-scope-label">{t.exportObservationsSectionTitle}</span>
                <span className="report-scope-value">{diagnosticReportPayload.initialDiagnosis.visibleObservations.length}</span>
              </div>
              <div className="report-scope-cell">
                <span className="report-scope-label">{t.exportHypothesesSectionTitle}</span>
                <span className="report-scope-value">{diagnosticReportPayload.hypothesisEvolution.length}</span>
              </div>
              <div className="report-scope-cell">
                <span className="report-scope-label">{t.exportEvidenceSectionTitle}</span>
                <span className="report-scope-value">{diagnosticReportPayload.technicianEvidence.length}</span>
              </div>
              <div className="report-scope-cell">
                <span className="report-scope-label">{t.exportReassessmentsSectionTitle}</span>
                <span className="report-scope-value">{diagnosticReportPayload.reassessmentHistory.length}</span>
              </div>
            </div>
          </div>

          {/* Printable Document for window.print() and Save-as-PDF */}
          <DiagnosticReportView
            report={diagnosticReportPayload}
            t={t}
          />
          {renderActionsFooter()}
        </div>
      )}

      {/* Perspective 5: Circuit Theory & Understanding */}
      {activePerspective === 'theory' && (
        <div className="perspective-theory-container">
          {renderResultsSummaryPanel()}
          <CircuitUnderstandingView
            boardName={formData?.boardName || t.stagedNotSpecified || 'PCB'}
            understanding={diagnosis.circuitUnderstanding}
            analysisDepth={diagnosis.analysisDepth}
            t={t}
          />
          {renderActionsFooter()}
        </div>
      )}

      {/* Mobile-Only Persistent Bottom Action Dock */}
      <MobileBottomActionDock
        activePerspective={activePerspective}
        onPerspectiveChange={setActivePerspective}
        evidenceCount={evidenceLog.length}
        reassessmentCount={reassessments.length}
        isReassessing={isReassessing}
        isReassessDisabled={isReassessing || evidenceLog.length === 0 || evidenceLog.length > 20}
        onLogEvidenceShortcut={handleDockLogEvidence}
        onReassessmentShortcut={handleDockReassessment}
        t={t}
      />

      {/* Contextual Investigation Assistant Discussion Panel (Stage 6C-3A) */}
      <InvestigationAssistantPanel
        investigationId={investigationId}
        boardName={formData?.boardName || t.stagedNotSpecified}
        t={t}
        lang={lang}
        context={assistantContext}
        messages={assistantMessages}
        onMessagesChange={handleAssistantMessagesChange}
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onExecuteSuggestedAction={(action) => {
          if (action.type === 'view_hypothesis') {
            setActivePerspective('matrix');
          } else if (action.type === 'inspect_observation' || action.type === 'suggest_check') {
            setActivePerspective('overview');
          }
        }}
      />
    </div>
  );
}

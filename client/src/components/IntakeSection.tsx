import { useState, useRef, useEffect, useCallback, type DragEvent, type ChangeEvent, type KeyboardEvent } from 'react';
import type { Translations, SupportedLanguage } from '../i18n';
import type {
  IntakeFormValues,
  IntakeFileState,
  StagedIntakePayload,
  FieldValidationErrors,
} from '../types/intake';
import type { DiagnosisResponse } from '../types/diagnosis';
import {
  formatFileSize,
  isAllowedImageFile,
} from '../utils/intakeValidation';
import {
  submitCircuitDiagnosis,
  fileToDataUrl,
  DiagnosisClientError,
} from '../api/diagnosisClient';
import { DiagnosticResults } from './DiagnosticResults';

interface IntakeSectionProps {
  t: Translations;
  lang: SupportedLanguage;
}

export function IntakeSection({ t, lang }: IntakeSectionProps) {
  // Image selection state
  const [fileState, setFileState] = useState<IntakeFileState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Form values
  const [formData, setFormData] = useState<IntakeFormValues>({
    boardName: '',
    expectedBehavior: '',
    observedBehavior: '',
    relevantComponents: '',
    additionalNotes: '',
  });

  // Validation state
  const [errors, setErrors] = useState<FieldValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Staged state
  const [stagedPayload, setStagedPayload] = useState<StagedIntakePayload | null>(null);
  const [isStaged, setIsStaged] = useState(false);

  // Diagnosis execution state
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResponse | null>(null);
  const [diagnosisError, setDiagnosisError] = useState<{
    title: string;
    message: string;
    isRetryable: boolean;
  } | null>(null);

  // Camera capture modal state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraStreaming, setIsCameraStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Refs for file inputs, camera stream, and object URL cleanup
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Synchronize active preview URL ref
  useEffect(() => {
    previewUrlRef.current = fileState?.previewUrl || null;
  }, [fileState]);

  // Stops all acquired media stream tracks and resets video element
  const stopMediaStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore error on track stop
        }
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraStreaming(false);
  }, []);

  const closeCamera = useCallback(() => {
    stopMediaStream();
    setIsCameraOpen(false);
    setCameraError(null);
  }, [stopMediaStream]);

  // Cleanup object URL and active media streams on unmount to prevent leaks
  useEffect(() => {
    return () => {
      stopMediaStream();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [stopMediaStream]);

  // Close camera modal on Escape key press
  useEffect(() => {
    if (!isCameraOpen) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCamera();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCameraOpen, closeCamera]);

  // Video element callback ref to bind stream as soon as element mounts into DOM
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && mediaStreamRef.current) {
      node.srcObject = mediaStreamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  const handleProcessFile = useCallback(
    (file: File) => {
      const check = isAllowedImageFile(file);

      if (!check.valid) {
        if (check.reason === 'size') {
          setFileError(t.fileSizeExceededError);
        } else if (check.reason === 'mime') {
          setFileError(t.fileMissingMimeError);
        } else {
          setFileError(t.invalidFileTypeError);
        }
        // Preserve any existing valid fileState per UX requirement
        return;
      }

      // Valid file received: revoke existing preview URL before replacing
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }

      const previewUrl = URL.createObjectURL(file);
      setFileState({
        file,
        previewUrl,
        name: file.name,
        sizeFormatted: formatFileSize(file.size),
        sizeBytes: file.size,
      });

      // Clear errors
      setFileError(null);
      setErrors((prev) => ({ ...prev, image: undefined }));
    },
    [t]
  );

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    // Reset file input value so selecting the same file triggers onChange
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleProcessFile(droppedFile);
    }
  };

  const handleRemoveImage = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setFileState(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenCamera = async () => {
    // Check for mediaDevices API support in the browser context
    if (
      typeof window === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setFileError(t.cameraUnsupported);
      return;
    }

    setFileError(null);
    setCameraError(null);
    setIsCameraStreaming(false);
    setIsCameraOpen(true);

    try {
      let stream: MediaStream;
      try {
        // Request video-only access; prefer environment camera, fallback to default
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (firstErr) {
        if (
          firstErr instanceof OverconstrainedError ||
          (firstErr instanceof Error && firstErr.name === 'OverconstrainedError')
        ) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } else {
          throw firstErr;
        }
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsCameraStreaming(true);
    } catch (err: unknown) {
      stopMediaStream();
      const errorName = err instanceof Error ? err.name : '';
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        setCameraError(t.cameraPermissionDenied);
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        setCameraError(t.cameraNotFound);
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        setCameraError(t.cameraInUse);
      } else {
        setCameraError(t.cameraGenericError);
      }
    }
  };

  const handleSnapPhoto = () => {
    const video = videoRef.current;
    if (!video || !mediaStreamRef.current) return;

    try {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setCameraError(t.cameraCaptureError);
        return;
      }

      ctx.drawImage(video, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setCameraError(t.cameraCaptureError);
            return;
          }
          const capturedFile = new File([blob], `board_photo_${Date.now()}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          closeCamera();
          handleProcessFile(capturedFile);
        },
        'image/jpeg',
        0.92
      );
    } catch {
      setCameraError(t.cameraCaptureError);
    }
  };

  const handleReplaceImage = () => {
    fileInputRef.current?.click();
  };

  const handleDropzoneKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleInputChange = (field: keyof IntakeFormValues, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Real-time clearance of validation error if field now has valid input
    if (errors[field as keyof FieldValidationErrors] && value.trim() !== '') {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof IntakeFormValues) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'expectedBehavior' && !formData.expectedBehavior.trim()) {
      setErrors((prev) => ({ ...prev, expectedBehavior: t.expectedBehaviorRequiredError }));
    }
    if (field === 'observedBehavior' && !formData.observedBehavior.trim()) {
      setErrors((prev) => ({ ...prev, observedBehavior: t.observedBehaviorRequiredError }));
    }
  };

  const validateAll = (): boolean => {
    const newErrors: FieldValidationErrors = {};

    if (!fileState) {
      newErrors.image = t.imageRequiredError;
    }
    if (!formData.expectedBehavior.trim()) {
      newErrors.expectedBehavior = t.expectedBehaviorRequiredError;
    }
    if (!formData.observedBehavior.trim()) {
      newErrors.observedBehavior = t.observedBehaviorRequiredError;
    }

    setErrors(newErrors);
    setTouched({
      expectedBehavior: true,
      observedBehavior: true,
      boardName: true,
      relevantComponents: true,
      additionalNotes: true,
    });

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll() || !fileState) {
      return;
    }

    // Stage the intake data in memory (no API call, no fake diagnosis, no base64 conversion)
    const payload: StagedIntakePayload = {
      formData: {
        boardName: formData.boardName.trim(),
        expectedBehavior: formData.expectedBehavior.trim(),
        observedBehavior: formData.observedBehavior.trim(),
        relevantComponents: formData.relevantComponents.trim(),
        additionalNotes: formData.additionalNotes.trim(),
      },
      fileState,
      stagedAt: new Date().toISOString(),
    };

    setStagedPayload(payload);
    setIsStaged(true);
    setDiagnosisResult(null);
    setDiagnosisError(null);
  };

  const handleReturnToEdit = () => {
    setIsStaged(false);
    setDiagnosisError(null);
    setDiagnosisResult(null);
  };

  const handleRunDiagnosis = async () => {
    if (isDiagnosing || !stagedPayload || !stagedPayload.fileState) return;
    setIsDiagnosing(true);
    setDiagnosisError(null);

    try {
      const base64DataUrl = await fileToDataUrl(stagedPayload.fileState.file);
      const result = await submitCircuitDiagnosis({
        image: base64DataUrl,
        boardName: stagedPayload.formData.boardName || undefined,
        expectedBehavior: stagedPayload.formData.expectedBehavior,
        observedBehavior: stagedPayload.formData.observedBehavior,
        relevantComponents: stagedPayload.formData.relevantComponents || undefined,
        additionalNotes: stagedPayload.formData.additionalNotes || undefined,
      });
      setDiagnosisResult(result);
    } catch (err: unknown) {
      if (err instanceof DiagnosisClientError) {
        let userMessage = err.message;
        if (err.errorType === 'MISSING_API_KEY') {
          userMessage = t.missingApiKeyErrorNotice;
        } else if (err.errorType === 'RATE_LIMIT' || err.statusCode === 429) {
          userMessage = t.rateLimitErrorNotice;
        } else if (err.errorType === 'TIMEOUT' || err.statusCode === 504) {
          userMessage = t.timeoutErrorNotice;
        } else if (err.errorType === 'NETWORK_ERROR' || err.statusCode === 503) {
          userMessage = t.networkErrorNotice;
        }
        setDiagnosisError({
          title: t.diagnosisErrorTitle,
          message: userMessage,
          isRetryable: err.isRetryable,
        });
      } else {
        setDiagnosisError({
          title: t.diagnosisErrorTitle,
          message: t.genericErrorNotice,
          isRetryable: true,
        });
      }
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleNewInvestigation = () => {
    if (window.confirm(t.confirmNewInvestigation)) {
      if (fileState?.previewUrl) {
        URL.revokeObjectURL(fileState.previewUrl);
      }
      setFileState(null);
      setFileError(null);
      setFormData({
        boardName: '',
        expectedBehavior: '',
        observedBehavior: '',
        relevantComponents: '',
        additionalNotes: '',
      });
      setErrors({});
      setTouched({});
      setStagedPayload(null);
      setIsStaged(false);
      setDiagnosisResult(null);
      setDiagnosisError(null);
      setIsDiagnosing(false);
    }
  };

  if (isStaged && stagedPayload && diagnosisResult) {
    return (
      <div className="diagnosis-flow-container">
        <div className="investigation-context-strip" role="region" aria-label={t.stagedConfirmationTitle}>
          <div className="context-strip-info">
            <span className="context-strip-label">{t.stagedBoardLabel}:</span>
            <span className="context-strip-value">{stagedPayload.formData.boardName || t.stagedNotSpecified}</span>
            <span className="context-strip-divider">•</span>
            <span className="context-strip-label">{t.stagedImageLabel}:</span>
            <span className="context-strip-value tech-value" dir="ltr">{stagedPayload.fileState.name} ({stagedPayload.fileState.sizeFormatted})</span>
          </div>
          <button
            type="button"
            className="action-btn secondary-btn context-strip-btn"
            onClick={handleReturnToEdit}
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span>{t.editSymptomsBtn}</span>
          </button>
        </div>

        <DiagnosticResults
          diagnosis={diagnosisResult}
          formData={stagedPayload.formData}
          t={t}
          onEditIntake={handleReturnToEdit}
          onNewInvestigation={handleNewInvestigation}
        />
      </div>
    );
  }

  return (
    <section className="card-panel intake-card-panel" aria-labelledby="intake-heading">
      {/* Hidden standard file picker for files and gallery */}
      <input
        ref={fileInputRef}
        type="file"
        id="intake-file-input"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className="card-header">
        <div className="card-title-group">
          {/* Circuit / Camera intake SVG icon */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--accent-cyan)' }}
            aria-hidden="true"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <h2 id="intake-heading" className="card-title">
            {t.intakeSectionTitle}
          </h2>
        </div>
        <span className="stage-status-badge">
          {isStaged ? t.stagedReadyBadge : t.stageBadge}
        </span>
      </div>

      <p className="intake-section-desc">{t.intakeSectionSubtitle}</p>

      {/* Confirmation View when Staged */}
      {isStaged && stagedPayload ? (
        <div className="staged-summary-container" role="region" aria-label={t.stagedConfirmationTitle}>
          <div className="staged-alert-banner">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="staged-alert-icon"
              aria-hidden="true"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <div>
              <h3 className="staged-alert-title">{t.stagedConfirmationTitle}</h3>
              <p className="staged-alert-desc">{t.stagedConfirmationNotice}</p>
            </div>
          </div>

          <div className="staged-preview-row">
            <div className="staged-thumb-wrapper">
              <img
                src={stagedPayload.fileState.previewUrl}
                alt={`${t.previewAltText}: ${stagedPayload.fileState.name}`}
                className="staged-thumb-img"
              />
            </div>
            <div className="staged-meta-box">
              <div className="staged-meta-item">
                <span className="staged-meta-label">{t.stagedBoardLabel}:</span>
                <span className="staged-meta-value">
                  {stagedPayload.formData.boardName || t.stagedNotSpecified}
                </span>
              </div>
              <div className="staged-meta-item">
                <span className="staged-meta-label">{t.stagedImageLabel}:</span>
                <span className="staged-meta-value tech-value" dir="ltr">
                  {stagedPayload.fileState.name} ({stagedPayload.fileState.sizeFormatted})
                </span>
              </div>
              <div className="staged-meta-item">
                <span className="staged-meta-label">{t.stagedComponentsLabel}:</span>
                <span className="staged-meta-value tech-value">
                  {stagedPayload.formData.relevantComponents || t.stagedNotSpecified}
                </span>
              </div>
            </div>
          </div>

          <div className="staged-details-grid">
            <div className="staged-detail-card">
              <h4 className="staged-detail-title">{t.stagedExpectedLabel}</h4>
              <p className="staged-detail-text">{stagedPayload.formData.expectedBehavior}</p>
            </div>
            <div className="staged-detail-card">
              <h4 className="staged-detail-title">{t.stagedObservedLabel}</h4>
              <p className="staged-detail-text">{stagedPayload.formData.observedBehavior}</p>
            </div>
            {stagedPayload.formData.additionalNotes && (
              <div className="staged-detail-card full-width">
                <h4 className="staged-detail-title">{t.stagedNotesLabel}</h4>
                <p className="staged-detail-text">{stagedPayload.formData.additionalNotes}</p>
              </div>
            )}
          </div>

          {/* Error Banner when diagnosis fails */}
          {diagnosisError && (
            <div className="diagnosis-error-banner" role="alert" aria-live="assertive">
              <div className="diagnosis-error-header">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="error-icon"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <h4 className="diagnosis-error-title">{diagnosisError.title}</h4>
              </div>
              <p className="diagnosis-error-message">{diagnosisError.message}</p>
              <div className="diagnosis-error-actions">
                {diagnosisError.isRetryable && (
                  <button
                    type="button"
                    className="action-btn primary-btn"
                    onClick={handleRunDiagnosis}
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
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                    <span>{t.retryDiagnosisBtn}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="action-btn secondary-btn"
                  onClick={handleReturnToEdit}
                >
                  <span>{t.editIntakeBtn}</span>
                </button>
              </div>
            </div>
          )}

          {/* Loading Progress when diagnosing */}
          {isDiagnosing && (
            <div
              className="diagnosis-loading-container"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="diagnosis-spinner-wrap">
                <div className="tech-spinner" aria-hidden="true" />
              </div>
              <h3 className="loading-progress-title">{t.diagnosingProgressTitle}</h3>
              <p className="loading-progress-subtitle">{t.diagnosingProgressSubtitle}</p>
              <div className="loading-tip-box">
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
                <span>{t.diagnosingTip}</span>
              </div>
            </div>
          )}

          {/* Action buttons (hidden while diagnosing) */}
          {!isDiagnosing && (
            <div className="staged-actions-bar">
              <button
                type="button"
                className="action-btn secondary-btn"
                onClick={handleReturnToEdit}
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
                <span>{t.editIntakeBtn}</span>
              </button>

              <button
                type="button"
                className="action-btn primary-btn start-diagnosis-btn"
                onClick={handleRunDiagnosis}
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
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
                <span>{t.startDiagnosisBtn}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Intake Form & Image Upload View */
        <form onSubmit={handleSubmit} noValidate className="intake-form">
          {/* File Upload / Dropzone Area */}
          <div className="upload-container">
            {fileState ? (
              /* Selected Image Preview State */
              <div className="image-preview-panel">
                <div className="preview-image-box">
                  <img
                    src={fileState.previewUrl}
                    alt={`${t.previewAltText}: ${fileState.name}`}
                    className="preview-img"
                  />
                </div>
                <div className="preview-info-box">
                  <div className="preview-file-telemetry">
                    <div className="preview-prop">
                      <span className="preview-label">{t.previewFilenameLabel}</span>
                      <span className="preview-value tech-value" dir="ltr">
                        {fileState.name}
                      </span>
                    </div>
                    <div className="preview-prop">
                      <span className="preview-label">{t.previewSizeLabel}</span>
                      <span className="preview-value tech-value" dir="ltr">
                        {fileState.sizeFormatted}
                      </span>
                    </div>
                  </div>

                  <div className="preview-button-group">
                    <button
                      type="button"
                      className="control-btn outline-btn"
                      onClick={handleReplaceImage}
                      aria-label={t.replaceImageBtn}
                    >
                      <svg
                        width="15"
                        height="15"
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
                      <span>{t.replaceImageBtn}</span>
                    </button>
                    <button
                      type="button"
                      className="control-btn danger-btn"
                      onClick={handleRemoveImage}
                      aria-label={t.removeImageBtn}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span>{t.removeImageBtn}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Dropzone Target */
              <div
                className={`dropzone-box ${isDragging ? 'drag-active' : ''} ${
                  errors.image ? 'has-error' : ''
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={handleDropzoneKeyDown}
                tabIndex={0}
                role="button"
                aria-label={`${t.dropzoneTitle}. ${t.dropzoneSubtitle}`}
              >
                <div className="dropzone-icon-wrap" aria-hidden="true">
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="dropzone-svg"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div className="dropzone-text-group">
                  <p className="dropzone-primary-text">
                    {isDragging ? t.dropzoneDragActive : t.dropzoneTitle}
                  </p>
                  <p className="dropzone-sub-text">{t.dropzoneSubtitle}</p>
                </div>
                <div className="dropzone-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="control-btn browse-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>{t.dropzoneBrowseBtn}</span>
                  </button>
                  <button
                    type="button"
                    className="control-btn camera-btn"
                    onClick={handleOpenCamera}
                    aria-label={t.dropzoneCameraBtn}
                  >
                    <svg
                      width="15"
                      height="15"
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
                    <span>{t.dropzoneCameraBtn}</span>
                  </button>
                </div>
              </div>
            )}

            {/* File Error Notice */}
            {(fileError || errors.image) && (
              <div
                id="image-validation-error"
                className="field-error-message"
                role="alert"
                aria-live="polite"
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
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{fileError || errors.image}</span>
              </div>
            )}
          </div>

          {/* Form Fields Area */}
          <div className="form-fields-container">
            <h3 className="form-subheading">{t.formSectionTitle}</h3>

            {/* Board / Circuit Identifier (Optional) */}
            <div className="form-field-group">
              <label htmlFor="board-name-input" className="field-label">
                <span>{t.boardNameLabel}</span>
                <span className="field-optional-tag">{t.boardNameOptional}</span>
              </label>
              <input
                id="board-name-input"
                type="text"
                className="text-input"
                value={formData.boardName}
                placeholder={t.boardNamePlaceholder}
                onChange={(e) => handleInputChange('boardName', e.target.value)}
                autoComplete="off"
                dir="auto"
              />
            </div>

            {/* Expected Behavior (Required) */}
            <div className="form-field-group">
              <label htmlFor="expected-behavior-input" className="field-label">
                <span>{t.expectedBehaviorLabel}</span>
                <span className="field-required-tag" aria-hidden="true">
                  * {t.expectedBehaviorRequired}
                </span>
              </label>
              <textarea
                id="expected-behavior-input"
                className={`textarea-input ${
                  touched.expectedBehavior && errors.expectedBehavior ? 'input-error' : ''
                }`}
                rows={3}
                value={formData.expectedBehavior}
                placeholder={t.expectedBehaviorPlaceholder}
                onChange={(e) => handleInputChange('expectedBehavior', e.target.value)}
                onBlur={() => handleBlur('expectedBehavior')}
                aria-required="true"
                aria-invalid={touched.expectedBehavior && Boolean(errors.expectedBehavior)}
                aria-describedby={
                  touched.expectedBehavior && errors.expectedBehavior
                    ? 'expected-behavior-error'
                    : undefined
                }
                dir="auto"
              />
              {touched.expectedBehavior && errors.expectedBehavior && (
                <div
                  id="expected-behavior-error"
                  className="field-error-message"
                  role="alert"
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
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errors.expectedBehavior}</span>
                </div>
              )}
            </div>

            {/* Observed Defect Behavior (Required) */}
            <div className="form-field-group">
              <label htmlFor="observed-behavior-input" className="field-label">
                <span>{t.observedBehaviorLabel}</span>
                <span className="field-required-tag" aria-hidden="true">
                  * {t.observedBehaviorRequired}
                </span>
              </label>
              <textarea
                id="observed-behavior-input"
                className={`textarea-input ${
                  touched.observedBehavior && errors.observedBehavior ? 'input-error' : ''
                }`}
                rows={3}
                value={formData.observedBehavior}
                placeholder={t.observedBehaviorPlaceholder}
                onChange={(e) => handleInputChange('observedBehavior', e.target.value)}
                onBlur={() => handleBlur('observedBehavior')}
                aria-required="true"
                aria-invalid={touched.observedBehavior && Boolean(errors.observedBehavior)}
                aria-describedby={
                  touched.observedBehavior && errors.observedBehavior
                    ? 'observed-behavior-error'
                    : undefined
                }
                dir="auto"
              />
              {touched.observedBehavior && errors.observedBehavior && (
                <div
                  id="observed-behavior-error"
                  className="field-error-message"
                  role="alert"
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
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{errors.observedBehavior}</span>
                </div>
              )}
            </div>

            {/* Suspect Components / Hardware (Optional) */}
            <div className="form-field-group">
              <label htmlFor="components-input" className="field-label">
                <span>{t.componentsLabel}</span>
                <span className="field-optional-tag">{t.componentsOptional}</span>
              </label>
              <input
                id="components-input"
                type="text"
                className="text-input"
                value={formData.relevantComponents}
                placeholder={t.componentsPlaceholder}
                onChange={(e) => handleInputChange('relevantComponents', e.target.value)}
                autoComplete="off"
                dir="auto"
              />
            </div>

            {/* Additional Notes (Optional) */}
            <div className="form-field-group">
              <label htmlFor="notes-input" className="field-label">
                <span>{t.notesLabel}</span>
                <span className="field-optional-tag">{t.notesOptional}</span>
              </label>
              <textarea
                id="notes-input"
                className="textarea-input"
                rows={2}
                value={formData.additionalNotes}
                placeholder={t.notesPlaceholder}
                onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                dir="auto"
              />
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="card-footer-actions intake-footer-actions">
            <button type="submit" className="action-btn intake-submit-btn">
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
                <path d="M5 12h14" />
                <path d={lang === 'ar' ? 'M12 5l-7 7 7 7' : 'M12 5l7 7-7 7'} />
              </svg>
              <span>{t.reviewInvestigationBtn}</span>
            </button>
          </div>
        </form>
      )}

      {/* Live Camera Capture Modal Dialog */}
      {isCameraOpen && (
        <div
          className="camera-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeCamera();
            }
          }}
        >
          <div
            className="camera-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="camera-modal-title"
          >
            <div className="camera-modal-header">
              <h3 id="camera-modal-title" className="camera-modal-title">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: 'var(--accent-cyan)' }}
                  aria-hidden="true"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>{t.cameraModalTitle}</span>
              </h3>
              <button
                type="button"
                className="camera-close-icon-btn"
                onClick={closeCamera}
                aria-label={t.cameraCloseBtn}
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="camera-preview-container">
              <video
                ref={setVideoRef}
                autoPlay
                playsInline
                muted
                className="camera-video-element"
              />

              {!isCameraStreaming && !cameraError && (
                <div className="camera-status-overlay" role="status" aria-live="polite">
                  <div className="camera-loading-spinner" aria-hidden="true" />
                  <span className="camera-status-text">{t.cameraInitializing}</span>
                </div>
              )}

              {cameraError && (
                <div className="camera-status-overlay" role="alert" aria-live="assertive">
                  <div className="camera-error-wrap">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="camera-error-icon"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p className="camera-error-text">{cameraError}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="camera-modal-footer">
              <button
                type="button"
                className="control-btn outline-btn"
                onClick={closeCamera}
              >
                {t.cameraCancelBtn}
              </button>
              {!cameraError && (
                <button
                  type="button"
                  className="action-btn"
                  onClick={handleSnapPhoto}
                  disabled={!isCameraStreaming}
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
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>{t.cameraSnapBtn}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default IntakeSection;

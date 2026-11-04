import { useState, useRef, useEffect, useCallback, type DragEvent, type ChangeEvent, type KeyboardEvent } from 'react';
import type { Translations, SupportedLanguage } from '../i18n';
import type {
  IntakeFormValues,
  IntakeFileState,
  StagedIntakePayload,
  FieldValidationErrors,
  ActiveInvestigationInfo,
} from '../types/intake';
import type { DiagnosisResponse, AnalysisDepth } from '../types/diagnosis';
import {
  formatFileSize,
  isAllowedImageFile,
} from '../utils/intakeValidation';
import {
  submitCircuitDiagnosis,
  DiagnosisClientError,
} from '../api/diagnosisClient';
import { optimizeImageForDiagnosis } from '../utils/imageOptimizer';
import { DiagnosticResults } from './DiagnosticResults';
import type { InvestigationRecord } from '../types/investigation';
import { createBlobUrlTracker, type BlobUrlTracker } from '../utils/blobUrlTracker';

interface IntakeSectionProps {
  t: Translations;
  lang: SupportedLanguage;
  onActiveInvestigationChange?: (info: ActiveInvestigationInfo | null) => void;
  activeInvestigationRecord?: InvestigationRecord | null;
  onInvestigationUpdate?: (updates: Partial<InvestigationRecord>) => void;
  onNewInvestigationRequest?: () => void;
}

export function IntakeSection({
  t,
  lang,
  onActiveInvestigationChange,
  activeInvestigationRecord,
  onInvestigationUpdate,
  onNewInvestigationRequest,
}: IntakeSectionProps) {
  // Reassessment round count across cycles
  const [reassessmentCount, setReassessmentCount] = useState<number>(0);

  // Image selection state
  const [fileState, setFileState] = useState<IntakeFileState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [optimizedPayloadNotice, setOptimizedPayloadNotice] = useState<string | null>(null);

  // Form values
  const [formData, setFormData] = useState<IntakeFormValues>({
    boardName: '',
    expectedBehavior: '',
    observedBehavior: '',
    relevantComponents: '',
    additionalNotes: '',
  });

  // Guided intake scenario mode: 'fault' | 'uncertain' | 'check'
  const [intakeScenario, setIntakeScenario] = useState<'fault' | 'uncertain' | 'check'>('fault');

  const handleSelectScenario = (scenario: 'fault' | 'uncertain' | 'check') => {
    setIntakeScenario(scenario);
    if (scenario === 'uncertain') {
      setFormData((prev) => {
        const updated = {
          ...prev,
          expectedBehavior: t.intakeUncertainExpected,
          observedBehavior: t.intakeUncertainObserved,
        };
        onInvestigationUpdate?.({ formData: updated });
        return updated;
      });
      setErrors((prev) => ({
        ...prev,
        expectedBehavior: undefined,
        observedBehavior: undefined,
      }));
    } else if (scenario === 'check') {
      setFormData((prev) => {
        const updated = {
          ...prev,
          expectedBehavior: t.intakeCheckExpected,
          observedBehavior: t.intakeCheckObserved,
        };
        onInvestigationUpdate?.({ formData: updated });
        return updated;
      });
      setErrors((prev) => ({
        ...prev,
        expectedBehavior: undefined,
        observedBehavior: undefined,
      }));
    } else {
      // Revert to custom fault mode if currently on canned text
      if (
        formData.expectedBehavior === t.intakeUncertainExpected ||
        formData.expectedBehavior === t.intakeCheckExpected
      ) {
        setFormData((prev) => {
          const updated = { ...prev, expectedBehavior: '', observedBehavior: '' };
          onInvestigationUpdate?.({ formData: updated });
          return updated;
        });
      }
    }
  };

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
    isOutputLimit?: boolean;
  } | null>(null);

  // Phase 3: Configurable Analysis Depth (persisted to localStorage)
  const [analysisDepth, setAnalysisDepth] = useState<AnalysisDepth>(() => {
    try {
      const saved = localStorage.getItem('circuitlens_analysis_depth');
      if (saved === 'basic' || saved === 'standard' || saved === 'advanced') {
        return saved;
      }
    } catch {
      // localStorage unavailable or restricted
    }
    return 'standard';
  });

  const handleAnalysisDepthChange = (depth: AnalysisDepth) => {
    setAnalysisDepth(depth);
    try {
      localStorage.setItem('circuitlens_analysis_depth', depth);
    } catch {
      // localStorage unavailable or restricted
    }
  };

  // Camera capture modal state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraStreaming, setIsCameraStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Refs for file inputs, camera stream, and object URL cleanup
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const blobUrlTrackerRef = useRef<BlobUrlTracker>(createBlobUrlTracker());
  const diagnosisAbortControllerRef = useRef<AbortController | null>(null);

  // Synchronize active preview URL ref with fileState and tracker
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

  // Cleanup object URL tracker, media streams, and any in-flight diagnosis requests on unmount
  useEffect(() => {
    return () => {
      stopMediaStream();
      blobUrlTrackerRef.current.revokeAll();
      previewUrlRef.current = null;
      if (diagnosisAbortControllerRef.current) {
        diagnosisAbortControllerRef.current.abort();
        diagnosisAbortControllerRef.current = null;
      }
    };
  }, [stopMediaStream]);

  // Offline verification fixture harness (activated exclusively via URL search param ?mock=true)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('mock=true')) {
      const mockFileState: IntakeFileState = {
        file: new File([''], 'circuit_sample_macro.jpg', { type: 'image/jpeg' }),
        previewUrl: '/src/assets/hero.png',
        name: 'circuit_sample_macro.jpg',
        sizeFormatted: '1.24 MB',
        sizeBytes: 1300000,
      };
      const mockFormData: IntakeFormValues = {
        boardName: 'STM32-H405 Diagnostic Dev Board',
        expectedBehavior: 'Powers from 12V barrel jack; stabilizes 5V and 3.3V rails cleanly.',
        observedBehavior: 'Dead board; 5V rail collapses to 0.4V with excessive current draw.',
        relevantComponents: 'U1 (LDO regulator), L2 (buck inductor), C14 (bulk cap)',
        additionalNotes: 'Board shows thermal stress near power entry.',
      };
      setFileState(mockFileState);
      setFormData(mockFormData);
      setStagedPayload({
        formData: mockFormData,
        fileState: mockFileState,
        stagedAt: new Date().toISOString(),
      });
      setIsStaged(true);
      setDiagnosisResult({
        summary: 'Direct visual anomalies detected around power entry; suspected low-impedance fault on the 5V power net.',
        visibleObservations: [
          {
            description: 'Discoloration and cracked resin on L2 inductor core near DC barrel jack',
            evidence: 'Thermal darkening on silkscreen and cracked core ferrite visible',
            confidence: 'high',
          },
          {
            description: 'Minor flux residue and solder whisker bridging pins 2 and 3 of U1 regulator',
            evidence: 'Yellowish deposit and metallic bridging visible under magnification',
            confidence: 'medium',
          },
          {
            description: 'Intact bypass capacitors C12-C15 with no visible package fracture',
            evidence: 'SMD ceramic packages show normal solder meniscus',
            confidence: 'high',
          },
        ],
        hypotheses: [
          {
            title: '5V net overload / low impedance fault',
            reasoning: 'Input inductor cracked and rail collapses to 0.4V under power.',
            supportingEvidence: ['L2 discoloration', 'Thermal stress around DC jack'],
            confidence: 'high',
            suggestedVerification: 'Perform unpowered cold resistance check from 5V rail to GND.',
          },
          {
            title: 'U1 regulator internal short or solder bridge',
            reasoning: 'Metallic whisker visible between pins 2 and 3 of regulator package.',
            supportingEvidence: ['Visible solder whisker on U1'],
            confidence: 'medium',
            suggestedVerification: 'Clean flux and measure pin-to-pin diode drop.',
          },
        ],
        recommendedChecks: [
          {
            stepNumber: 1,
            title: 'Cold Resistance Check (5V Rail to GND)',
            testType: 'Cold Resistance',
            toolsNeeded: ['Digital Multimeter', 'Sharp Probes'],
            procedure: 'De-energize board. Set DMM to resistance mode. Measure between 5V test point and GND.',
            expectedResult: '> 1 kΩ (typical unpowered CMOS circuit impedance)',
            safetyNotes: ['Ensure board is unpowered', 'Discharge all capacitors before probing'],
          },
          {
            stepNumber: 2,
            title: 'Visual Inspection of U1 Pins under Magnification',
            testType: 'Visual Inspection',
            toolsNeeded: ['Stereo Microscope / Loupe', 'Dental Pick / Tweezers'],
            procedure: 'Inspect solder fillets on U1 pins 2 and 3; remove any flux bridging with IPA.',
            expectedResult: 'Clean, isolated pins with no metallic bridge',
            safetyNotes: ['Wear ESD protection'],
          },
        ],
        limitations: [
          'Internal copper plane shorts cannot be ruled out from surface inspection alone.',
        ],
        safetyWarnings: [
          'DO NOT apply power from bench supply while low impedance persists.',
          'Always wear safety eyewear when examining heat-stressed components.',
        ],
        metadata: {
          requestType: 'diagnosis',
          provider: 'baseten',
          model: 'meta-models/muse-spark-open-1026',
          promptTokens: 1634,
          completionTokens: 3064,
          totalTokens: 4698,
          durationMs: 19180,
          estimatedCostUsd: 0.015065,
          usageStatus: 'reported',
        },
        provenance: 'offline_fixture',
        isOfflineMock: true,
        executionMode: 'mock_demo',
      });
    }
  }, []);

  // Synchronize state when activeInvestigationRecord changes (e.g., reopened from Dashboard or New Case)
  useEffect(() => {
    if (!activeInvestigationRecord) return;
    if (typeof window !== 'undefined' && window.location.search.includes('mock=true')) return;

    setFormData(activeInvestigationRecord.formData);
    setIsStaged(activeInvestigationRecord.isStaged);
    setDiagnosisResult(activeInvestigationRecord.diagnosis);
    setReassessmentCount(activeInvestigationRecord.reassessments ? activeInvestigationRecord.reassessments.length : 0);

    if (activeInvestigationRecord.imageBlob && activeInvestigationRecord.imageMetadata) {
      const restoredFile = new File(
        [activeInvestigationRecord.imageBlob],
        activeInvestigationRecord.imageMetadata.name,
        {
          type: activeInvestigationRecord.imageMetadata.type,
          lastModified: activeInvestigationRecord.imageMetadata.lastModified,
        }
      );
      const previewUrl = blobUrlTrackerRef.current.create(activeInvestigationRecord.imageBlob);
      const restoredFileState: IntakeFileState = {
        file: restoredFile,
        previewUrl,
        name: activeInvestigationRecord.imageMetadata.name,
        sizeFormatted: formatFileSize(activeInvestigationRecord.imageMetadata.sizeBytes),
        sizeBytes: activeInvestigationRecord.imageMetadata.sizeBytes,
      };
      setFileState(restoredFileState);

      if (activeInvestigationRecord.isStaged) {
        setStagedPayload({
          formData: activeInvestigationRecord.formData,
          fileState: restoredFileState,
          stagedAt: activeInvestigationRecord.updatedAt,
        });
      }
    } else {
      blobUrlTrackerRef.current.revokeCurrent();
      setFileState(null);
      setStagedPayload(null);
    }
  }, [activeInvestigationRecord?.id]);

  // Synchronize active investigation state with workspace shell
  useEffect(() => {
    if (isStaged && stagedPayload && diagnosisResult) {
      onActiveInvestigationChange?.({
        boardName: stagedPayload.formData.boardName || '',
        imageName: stagedPayload.fileState.name || '',
        reassessmentCount,
        onNewInvestigation: handleNewInvestigation,
        onEditSymptoms: handleReturnToEdit,
      });
    } else {
      onActiveInvestigationChange?.(null);
    }
  }, [isStaged, stagedPayload, diagnosisResult, reassessmentCount, onActiveInvestigationChange]);

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

      // Valid file received: tracker revokes any existing preview URL before replacing
      const previewUrl = blobUrlTrackerRef.current.create(file);
      setFileState({
        file,
        previewUrl,
        name: file.name,
        sizeFormatted: formatFileSize(file.size),
        sizeBytes: file.size,
      });

      // Clear errors
      setFileError(null);
      setOptimizedPayloadNotice(null);
      setErrors((prev) => ({ ...prev, image: undefined }));

      onInvestigationUpdate?.({
        imageBlob: file,
        imageMetadata: {
          name: file.name,
          sizeBytes: file.size,
          type: file.type,
          lastModified: file.lastModified,
        },
      });
    },
    [t, onInvestigationUpdate]
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
    blobUrlTrackerRef.current.revokeCurrent();
    previewUrlRef.current = null;
    setFileState(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onInvestigationUpdate?.({
      imageBlob: null,
      imageMetadata: null,
    });
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
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      onInvestigationUpdate?.({
        formData: updated,
        ...(field === 'boardName' && value.trim() ? { title: value.trim() } : {}),
      });
      return updated;
    });

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
      if (/don'?t\s+know|unsure|not\s+sure|unknown|check|normal/i.test(formData.observedBehavior)) {
        formData.expectedBehavior = t.intakeUncertainExpected;
      } else {
        newErrors.expectedBehavior = t.expectedBehaviorRequiredError;
      }
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
    onInvestigationUpdate?.({
      isStaged: true,
      formData: payload.formData,
    });
  };

  const handleReturnToEdit = () => {
    if (diagnosisAbortControllerRef.current) {
      diagnosisAbortControllerRef.current.abort();
      diagnosisAbortControllerRef.current = null;
    }
    setIsStaged(false);
    setDiagnosisError(null);
    setDiagnosisResult(null);
    setIsDiagnosing(false);
    setReassessmentCount(0);
    onActiveInvestigationChange?.(null);
    onInvestigationUpdate?.({
      isStaged: false,
    });
  };

  const handleCancelDiagnosis = () => {
    if (diagnosisAbortControllerRef.current) {
      diagnosisAbortControllerRef.current.abort();
      diagnosisAbortControllerRef.current = null;
    }
    setIsDiagnosing(false);
    setDiagnosisError(null);
  };

  const handleRunDiagnosis = async (depthOverride?: AnalysisDepth) => {
    if (isDiagnosing || !stagedPayload || !stagedPayload.fileState) return;

    const targetDepth = depthOverride || analysisDepth;
    if (depthOverride && depthOverride !== analysisDepth) {
      handleAnalysisDepthChange(depthOverride);
    }

    if (diagnosisAbortControllerRef.current) {
      diagnosisAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    diagnosisAbortControllerRef.current = controller;

    setIsDiagnosing(true);
    setDiagnosisError(null);

    try {
      const optimized = await optimizeImageForDiagnosis(stagedPayload.fileState.file);
      if (optimized.wasOptimized) {
        setOptimizedPayloadNotice(`${formatFileSize(optimized.bytes)} payload`);
      }
      if (controller.signal.aborted) return;

      const result = await submitCircuitDiagnosis(
        {
          image: optimized.dataUrl,
          boardName: stagedPayload.formData.boardName || undefined,
          expectedBehavior: stagedPayload.formData.expectedBehavior,
          observedBehavior: stagedPayload.formData.observedBehavior,
          relevantComponents: stagedPayload.formData.relevantComponents || undefined,
          additionalNotes: stagedPayload.formData.additionalNotes || undefined,
          analysisDepth: targetDepth,
        },
        controller.signal
      );

      if (controller.signal.aborted) return;
      setDiagnosisResult(result);
      onInvestigationUpdate?.({
        diagnosis: result,
        isStaged: true,
        analysisDepth: targetDepth,
      });
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return;
      }
      if (err instanceof DiagnosisClientError) {
        if (err.errorType === 'CANCELLED' || err.statusCode === 499) {
          return;
        }
        let userMessage = err.message;
        const isOutputLimit = err.errorType === 'OUTPUT_TOKEN_LIMIT';
        if (err.errorType === 'MISSING_API_KEY') {
          userMessage = t.missingApiKeyErrorNotice;
        } else if (err.errorType === 'OUTPUT_TOKEN_LIMIT') {
          userMessage = t.outputLimitErrorNotice;
        } else if (err.errorType === 'INVALID_MODEL_OUTPUT') {
          userMessage = t.invalidOutputErrorNotice;
        } else if (err.errorType === 'SCHEMA_VALIDATION_ERROR') {
          userMessage = t.schemaValidationErrorNotice;
        } else if (err.errorType === 'MODEL_REFUSAL') {
          userMessage = t.modelRefusalErrorNotice;
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
          isOutputLimit,
        });
      } else {
        setDiagnosisError({
          title: t.diagnosisErrorTitle,
          message: t.genericErrorNotice,
          isRetryable: true,
        });
      }
    } finally {
      if (diagnosisAbortControllerRef.current === controller) {
        setIsDiagnosing(false);
        diagnosisAbortControllerRef.current = null;
      }
    }
  };

  const handleNewInvestigation = () => {
    if (window.confirm(t.confirmNewInvestigation)) {
      if (diagnosisAbortControllerRef.current) {
        diagnosisAbortControllerRef.current.abort();
        diagnosisAbortControllerRef.current = null;
      }
      blobUrlTrackerRef.current.revokeCurrent();
      previewUrlRef.current = null;
      setFileState(null);
      setFileError(null);
      setOptimizedPayloadNotice(null);
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
      setReassessmentCount(0);
      onActiveInvestigationChange?.(null);
      onNewInvestigationRequest?.();
    }
  };

  if (isStaged && stagedPayload && diagnosisResult) {
    return (
      <div className="diagnosis-flow-container">
        <DiagnosticResults
          key={activeInvestigationRecord?.id || 'active_workbench'}
          diagnosis={diagnosisResult}
          formData={stagedPayload.formData}
          imageFileState={stagedPayload.fileState}
          t={t}
          lang={lang}
          onEditIntake={handleReturnToEdit}
          onNewInvestigation={handleNewInvestigation}
          onReassessmentCountChange={setReassessmentCount}
          investigationId={activeInvestigationRecord?.id}
          initialEvidenceLog={activeInvestigationRecord?.evidenceLog}
          initialReassessments={activeInvestigationRecord?.reassessments}
          initialActivePerspective={activeInvestigationRecord?.activePerspective}
          initialInspectorZoom={activeInvestigationRecord?.inspectorZoom}
          initialInspectorPan={activeInvestigationRecord?.inspectorPan}
          initialAssistantMessages={activeInvestigationRecord?.assistantMessages}
          onInvestigationUpdate={onInvestigationUpdate}
        />
      </div>
    );
  }

  return (
    <section className="card-panel intake-card-panel" aria-labelledby="intake-heading">
      {/* Client-side mock fixture indicator */}
      {typeof window !== 'undefined' && window.location.search.includes('mock=true') && (
        <div className="client-mock-fixture-banner" role="status" aria-label="Mock fixture notice">
          <span className="fixture-badge">CLIENT DEMO FIXTURE (?mock=true)</span>
          <span>
            Pre-populated reference STM32 dataset loaded directly into client state for UI demonstration. No backend network request made.
          </span>
        </div>
      )}

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {!isStaged && (
            <button
              type="button"
              className="control-btn outline-btn"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', borderRadius: '4px' }}
              onClick={() => {
                setFormData({
                  boardName: 'Arduino Uno SMD Edition',
                  expectedBehavior: 'Powers from 5V USB-B or 9V DC barrel jack; 5V and 3.3V rails active with ON LED illuminated.',
                  observedBehavior: 'Dead board; 5V rail collapses to 0.4V on both inputs with excessive current draw; ON LED dark.',
                  relevantComponents: 'U1 (NCP1117ST50T3G), F1 polyfuse, C1/C2 (47uF caps)',
                  additionalNotes: 'Board disconnected immediately to avoid thermal runaway. No visible burns on top side.',
                });
              }}
              title="Pre-fill benchmark Arduino Uno SMD failure scenario for demonstration"
            >
              ⚡ Pre-fill Demo Case
            </button>
          )}
          <span className="stage-status-badge">
            {isStaged ? t.stagedReadyBadge : t.intakeBadge}
          </span>
        </div>
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
                  {stagedPayload.fileState.name} ({stagedPayload.fileState.sizeFormatted}{optimizedPayloadNotice ? ` • ${optimizedPayloadNotice}` : ''})
                </span>
              </div>
              <div className="staged-meta-item">
                <span className="staged-meta-label">{t.stagedComponentsLabel}:</span>
                <span className="staged-meta-value tech-value">
                  {stagedPayload.formData.relevantComponents || t.stagedNotSpecified}
                </span>
              </div>
              <div className="staged-meta-item">
                <span className="staged-meta-label">{t.analysisDepthLabel || 'Analysis Depth'}:</span>
                <span className="staged-meta-value tech-value">
                  <span className="stage-status-badge depth-indicator-badge">
                    {analysisDepth === 'basic'
                      ? (t.depthBasic || 'Basic')
                      : analysisDepth === 'advanced'
                      ? (t.depthAdvanced || 'Advanced')
                      : (t.depthStandard || 'Standard')}
                  </span>
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
                {diagnosisError.isOutputLimit && analysisDepth !== 'basic' && (
                  <button
                    type="button"
                    className="action-btn primary-btn quick-basic-retry-btn"
                    onClick={() => {
                      handleAnalysisDepthChange('basic');
                      handleRunDiagnosis('basic');
                    }}
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
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span>{t.quickSwitchToBasicBtn}</span>
                  </button>
                )}
                {diagnosisError.isRetryable && (
                  <button
                    type="button"
                    className="action-btn primary-btn"
                    onClick={() => handleRunDiagnosis()}
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
              <div className="diagnosis-loading-actions">
                <button
                  type="button"
                  className="action-btn secondary-btn cancel-diagnosis-btn"
                  onClick={handleCancelDiagnosis}
                  aria-label={t.cancelDiagnosisBtn}
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
                  <span>{t.cancelDiagnosisBtn}</span>
                </button>
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
                onClick={() => handleRunDiagnosis()}
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

            {/* Intake Guidance Scenarios */}
            <div className="intake-guidance-container" role="region" aria-label={t.intakeGuidanceLabel}>
              <div className="guidance-chips-group">
                <button
                  type="button"
                  className={`guidance-chip ${intakeScenario === 'fault' ? 'active' : ''}`}
                  onClick={() => handleSelectScenario('fault')}
                  title={t.intakeModeFaultDesc}
                  aria-pressed={intakeScenario === 'fault'}
                >
                  <span className="guidance-chip-icon">⚡</span>
                  <span className="guidance-chip-text">{t.intakeModeFault}</span>
                </button>
                <button
                  type="button"
                  className={`guidance-chip ${intakeScenario === 'uncertain' ? 'active' : ''}`}
                  onClick={() => handleSelectScenario('uncertain')}
                  title={t.intakeModeUncertainDesc}
                  aria-pressed={intakeScenario === 'uncertain'}
                >
                  <span className="guidance-chip-icon">❓</span>
                  <span className="guidance-chip-text">{t.intakeModeUncertain}</span>
                </button>
                <button
                  type="button"
                  className={`guidance-chip ${intakeScenario === 'check' ? 'active' : ''}`}
                  onClick={() => handleSelectScenario('check')}
                  title={t.intakeModeCheckDesc}
                  aria-pressed={intakeScenario === 'check'}
                >
                  <span className="guidance-chip-icon">🔍</span>
                  <span className="guidance-chip-text">{t.intakeModeCheck}</span>
                </button>
              </div>
            </div>

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

            {/* Analysis Depth Selector */}
            <div className="form-field-group depth-control-group">
              <label className="field-label" id="depth-selector-label">
                <span>{t.analysisDepthLabel || 'Analysis Depth'}</span>
              </label>
              <div
                className="depth-selector-group"
                role="radiogroup"
                aria-labelledby="depth-selector-label"
              >
                {(['basic', 'standard', 'advanced'] as AnalysisDepth[]).map((depth) => {
                  const isSelected = analysisDepth === depth;
                  const label =
                    depth === 'basic'
                      ? (t.depthBasic || 'Basic')
                      : depth === 'standard'
                      ? (t.depthStandard || 'Standard')
                      : (t.depthAdvanced || 'Advanced');
                  const desc =
                    depth === 'basic'
                      ? (t.depthBasicDesc || 'Rapid triage & visual defect scan')
                      : depth === 'standard'
                      ? (t.depthStandardDesc || 'Comprehensive diagnosis & safety checks')
                      : (t.depthAdvancedDesc || 'In-depth circuit theory & block modeling');
                  return (
                    <button
                      key={depth}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`depth-option-btn ${isSelected ? 'selected active' : ''}`}
                      onClick={() => handleAnalysisDepthChange(depth)}
                    >
                      <div className="depth-option-header">
                        <span className="depth-option-indicator" aria-hidden="true" />
                        <span className="depth-option-name">{label}</span>
                        {depth === 'standard' && (
                          <span className="depth-default-pill">Default</span>
                        )}
                      </div>
                      <span className="depth-option-desc">{desc}</span>
                    </button>
                  );
                })}
              </div>
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

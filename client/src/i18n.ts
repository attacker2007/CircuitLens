export type SupportedLanguage = 'en' | 'es' | 'ar';

export interface Translations {
  brandName: string;
  brandTagline: string;
  stageBadge: string;
  heroTag: string;
  intakeBadge: string;
  stageTitle: string;
  stageSubtitle: string;
  systemStatusTitle: string;
  statusChecking: string;
  statusConnected: string;
  statusError: string;
  retryButton: string;
  endpointLabel: string;
  serviceLabel: string;
  latencyLabel: string;
  timestampLabel: string;
  targetModelLabel: string;
  apiProxyStatusLabel: string;
  apiProxyVerified: string;
  nextStagesTitle: string;
  nextStagesSubtitle: string;
  stage2Title: string;
  stage2Desc: string;
  stage3Title: string;
  stage3Desc: string;
  stage4Title: string;
  stage4Desc: string;
  themeToggle: string;
  themeDark: string;
  themeLight: string;
  languageSelect: string;
  footerNotice: string;

  // Stage 2: Vision & Schematic Intake
  intakeSectionTitle: string;
  intakeSectionSubtitle: string;
  dropzoneTitle: string;
  dropzoneSubtitle: string;
  dropzoneBrowseBtn: string;
  dropzoneCameraBtn: string;
  dropzoneDragActive: string;
  imageRequiredError: string;
  invalidFileTypeError: string;
  fileSizeExceededError: string;
  fileMissingMimeError: string;
  previewAltText: string;
  previewFilenameLabel: string;
  previewSizeLabel: string;
  replaceImageBtn: string;
  removeImageBtn: string;
  formSectionTitle: string;
  boardNameLabel: string;
  boardNameOptional: string;
  boardNamePlaceholder: string;
  expectedBehaviorLabel: string;
  expectedBehaviorRequired: string;
  expectedBehaviorPlaceholder: string;
  expectedBehaviorRequiredError: string;
  observedBehaviorLabel: string;
  observedBehaviorRequired: string;
  observedBehaviorPlaceholder: string;
  observedBehaviorRequiredError: string;
  componentsLabel: string;
  componentsOptional: string;
  componentsPlaceholder: string;
  notesLabel: string;
  notesOptional: string;
  notesPlaceholder: string;
  reviewInvestigationBtn: string;
  stagedConfirmationTitle: string;
  stagedConfirmationNotice: string;
  stagedReadyBadge: string;
  stagedBoardLabel: string;
  stagedImageLabel: string;
  stagedExpectedLabel: string;
  stagedObservedLabel: string;
  stagedComponentsLabel: string;
  stagedNotesLabel: string;
  stagedNotSpecified: string;
  editIntakeBtn: string;

  // Camera capture
  cameraModalTitle: string;
  cameraInitializing: string;
  cameraSnapBtn: string;
  cameraCancelBtn: string;
  cameraCloseBtn: string;
  cameraPermissionDenied: string;
  cameraNotFound: string;
  cameraInUse: string;
  cameraUnsupported: string;
  cameraCaptureError: string;
  cameraGenericError: string;

  // Stage 3: AI Diagnostics & Results
  startDiagnosisBtn: string;
  diagnosingProgressTitle: string;
  diagnosingProgressSubtitle: string;
  diagnosingTip: string;
  cancelDiagnosisBtn: string;
  retryDiagnosisBtn: string;
  editSymptomsBtn: string;
  newInvestigationBtn: string;
  confirmNewInvestigation: string;
  diagnosisErrorTitle: string;
  missingApiKeyErrorNotice: string;
  networkErrorNotice: string;
  rateLimitErrorNotice: string;
  timeoutErrorNotice: string;
  genericErrorNotice: string;
  outputLimitErrorNotice: string;
  invalidOutputErrorNotice: string;
  schemaValidationErrorNotice: string;
  modelRefusalErrorNotice: string;

  // Results Presentation
  resultsSectionTitle: string;
  resultsSectionSubtitle: string;
  resultsBadge: string;
  executiveSummaryTitle: string;
  visibleObservationsTitle: string;
  visibleObservationsSubtitle: string;
  observationEvidenceLabel: string;
  hypothesesTitle: string;
  hypothesesSubtitle: string;
  hypothesisReasoningLabel: string;
  hypothesisEvidenceLabel: string;
  hypothesisVerificationLabel: string;
  confidenceLabel: string;
  confidenceHigh: string;
  confidenceMedium: string;
  confidenceLow: string;
  recommendedChecksTitle: string;
  recommendedChecksSubtitle: string;
  checkStepLabel: string;
  checkTestTypeLabel: string;
  checkToolsLabel: string;
  checkProcedureLabel: string;
  checkExpectedResultLabel: string;
  checkSafetyNotesLabel: string;
  safetyWarningsTitle: string;
  safetyWarningsNotice: string;
  limitationsTitle: string;
  limitationsSubtitle: string;
  disclaimerNotice: string;

  // Stage 4B: Evidence Capture & Troubleshooting
  troubleshootingSectionTitle: string;
  troubleshootingSectionSubtitle: string;
  openCheckBtn: string;
  closeCheckBtn: string;
  selectedCheckHeading: string;
  noProcedureDetails: string;
  recordEvidenceTitle: string;
  recordEvidenceSubtitle: string;
  outcomeLabel: string;
  outcomePassedLabel: string;
  outcomePassedDesc: string;
  outcomeFailedLabel: string;
  outcomeFailedDesc: string;
  outcomeInconclusiveLabel: string;
  outcomeInconclusiveDesc: string;
  outcomeUnableLabel: string;
  outcomeUnableDesc: string;
  measurementSectionTitle: string;
  numericValueLabel: string;
  numericValuePlaceholder: string;
  measurementUnitLabel: string;
  measurementUnitPlaceholder: string;
  technicianNotesLabel: string;
  technicianNotesPlaceholder: string;
  saveEvidenceBtn: string;
  evidenceLogTitle: string;
  evidenceLogSubtitle: string;
  noEvidenceLogged: string;
  evidenceAttemptLabel: string;
  supersedesLabel: string;
  supersedeOptionLabel: string;
  supersedeOptionDesc: string;
  validationErrorIncompletePair: string;
  validationErrorNumericRange: string;
  validationErrorUnitLength: string;
  validationErrorNotesLength: string;
  validationErrorOutcomeRequired: string;
  evidenceRecordedNotice: string;
  nonMandatoryNotice: string;
  unverifiedDisclaimer: string;
  checkStatusUntested: string;
  checkStatusTested: string;
  totalAttemptsLabel: string;
  activeCheckBadge: string;

  // Stage 4B-4: Reassessment Controls & Results
  reassessButton: string;
  reassessingProgressTitle: string;
  reassessingProgressSubtitle: string;
  reassessmentReadyNotice: string;
  noEvidenceForReassessmentNotice: string;
  evidenceLimitExceededNotice: string;
  reassessErrorTitle: string;
  cancelReassessmentBtn: string;
  retryReassessmentBtn: string;
  reassessmentNotesLabel: string;
  reassessmentNotesPlaceholder: string;
  reassessmentSectionTitle: string;
  reassessmentSectionSubtitle: string;
  evidenceSynthesisTitle: string;
  revisedHypothesesTitle: string;
  revisedHypothesesSubtitle: string;
  hypothesisStatusLabel: string;
  statusSupported: string;
  statusWeakened: string;
  statusUnresolved: string;
  statusContradicted: string;
  hypothesisChangeExplanationLabel: string;
  citingEvidenceLabel: string;
  evidenceCitationRecordNotFound: string;
  evidenceCitationOutcomeLabel: string;
  evidenceCitationValueLabel: string;
  nextRecommendedChecksTitle: string;
  nextRecommendedChecksSubtitle: string;
  noNewVisualInspectionNotice: string;
  reassessmentCycleBadge: string;
  initialChecksCycleBadge: string;
  allChecksCompletedNotice: string;
  initialDiagnosisBadge: string;
  latestReassessmentBadge: string;
  historicalReassessmentBadge: string;
  hypothesesRevisedNotice: string;
  viewLatestReassessmentBtn: string;
  latestStatusLabel: string;
  jumpToHypothesisRevision: string;
  hardwareAccessDisclaimer: string;
  evidenceCitationSuperseded: string;
  evidenceCitationSupersededHint: string;

  // Stage 6B-3: Operational Telemetry & Cost Transparency
  telemetrySectionTitle: string;
  telemetrySectionSubtitle: string;
  telemetryDiagnosisTitle: string;
  telemetryReassessmentTitle: string;
  telemetryProviderLabel: string;
  telemetryModelLabel: string;
  telemetryDurationLabel: string;
  telemetryInputTokensLabel: string;
  telemetryOutputTokensLabel: string;
  telemetryTotalTokensLabel: string;
  telemetryEstimatedCostLabel: string;
  telemetryPartialCostLabel: string;
  telemetryPartialCostBadge: string;
  telemetryPartialCostDisclaimer: string;
  telemetryCostDisclaimer: string;
  telemetryUnavailable: string;
  telemetryDetailsSummary: string;
  telemetryStatusReported: string;
  telemetryStatusPartial: string;
  telemetryStatusUnavailable: string;

  // Stage 6B-4B-1: Interactive Circuit Image Inspection
  inspectorTitle: string;
  inspectorSubtitle: string;
  inspectorZoomIn: string;
  inspectorZoomOut: string;
  inspectorFit: string;
  inspectorReset100: string;
  inspectorFullscreen: string;
  inspectorExitFullscreen: string;
  inspectorZoomLevel: string;
  inspectorPanHint: string;
  inspectorSelectedObservation: string;
  inspectorClearObservation: string;
  inspectorToggleDrawer: string;
  inspectorCloseDrawer: string;
  inspectorOriginalImageBadge: string;

  // Stage 6B-4B-2: Professional Diagnostic Report Export
  exportSectionTitle: string;
  exportSectionSubtitle: string;
  exportPrintPdfBtn: string;
  exportJsonBtn: string;
  exportMarkdownBtn: string;
  exportReportBadge: string;
  exportEpistemicNotice: string;
  exportReportHeaderTitle: string;
  exportInvestigationIdLabel: string;
  exportGeneratedAtLabel: string;
  exportDeviceSectionTitle: string;
  exportObservationsSectionTitle: string;
  exportHypothesesSectionTitle: string;
  exportEvidenceSectionTitle: string;
  exportReassessmentsSectionTitle: string;
  exportChecksSectionTitle: string;
  exportSafetySectionTitle: string;
  exportLimitationsSectionTitle: string;
  exportTelemetrySectionTitle: string;
  exportOriginAi: string;
  exportOriginTech: string;
  exportOriginSystem: string;

  // Stage 6B-4B-3: Hypothesis Evolution & Evidence Timeline
  evolutionMatrixTitle: string;
  evolutionMatrixSubtitle: string;
  evolutionEpistemicNotice: string;
  matrixCycleInitialOnly: string;
  matrixCyclesLogged: string;
  matrixColHypothesis: string;
  matrixColInitial: string;
  matrixColRoundPrefix: string;
  matrixColCurrent: string;
  matrixIntroducedInPrefix: string;
  matrixShowDetails: string;
  matrixHideDetails: string;
  matrixInitialReasoningLabel: string;
  matrixStatusNotPresent: string;
  matrixStatusOmitted: string;
  matrixDeltaUp: string;
  matrixDeltaDown: string;
  matrixCitationsCount: string;
  timelineTitle: string;
  timelineSubtitle: string;
  timelineEventsLogged: string;
  timelineSourceAi: string;
  timelineSourceTech: string;
  timelineSourceSystem: string;
  timelineTimestampMissing: string;
  timelineInitialTag: string;
  timelineSupersededBadge: string;
  timelineInconclusiveNotice: string;
  timelineUnableNotice: string;
  timelineRecordedMeasurement: string;
  timelineJumpToSuperseding: string;
  timelineHypothesisChangesTitle: string;
  timelineSafetyAlert: string;
  currentAssessmentTitle: string;
  currentAssessmentSubtitle: string;
  navToMatrixBtn: string;
  navToTimelineBtn: string;
  assessmentEpistemicHeader: string;
  assessmentEpistemicNotice: string;
  noSupportedHypotheses: string;
  noContradictedHypotheses: string;
  noUnresolvedHypotheses: string;
  strongestSupportingEvidenceTitle: string;
  importantContradictoryEvidenceTitle: string;
  outstandingChecksTitle: string;
  criticalSafetyTitle: string;
  subnavOverview: string;
  subnavMatrix: string;
  subnavTimeline: string;
  subnavReport: string;

  // Stage 6B-4B-3D: Ambiguous Hypothesis Decoupling & Localization
  ambiguousIdentityBadge: string;
  ambiguousIdentityTooltip: string;
  ambiguousMultipleCandidatesNotice: string;
  ambiguousCannotEstablishAcrossRounds: string;
  ambiguousNoTrendNotice: string;
  ambiguousGroupHeader: string;
  ambiguousGroupSubtitle: string;
  ambiguousReappearanceBadge: string;
  ambiguousReappearanceTooltip: string;
  ambiguousRoundIsolatedNotice: string;

  // Stage 6B-4B-3F: Explicit Hypothesis Identity Semantics & Export Completeness
  heuristicTitleMatchBadge: string;
  heuristicTitleMatchTooltip: string;
  heuristicTrackingExplanation: string;
  heuristicNotConfirmedNotice: string;
  matrixDeltaUpTooltip: string;
  matrixDeltaDownTooltip: string;
  matrixDeltaSameTooltip: string;
  matrixOverallDeltaUpTooltip: string;
  matrixOverallDeltaDownTooltip: string;
  exportInitialOnly: string;
  exportNoEvidenceRecorded: string;
  exportInitialReasoningHeading: string;
  exportTechnicianEvidenceHeading: string;
  exportDefaultSafetyNotice: string;
  exportDefaultLimitationsNotice: string;
  viewMeasurementRecordTooltip: string;

  // Stage 6B-5B: Compact Investigation Header & Workspace Shell
  healthPopoverTitle: string;
  healthPopoverClose: string;
  subnavAriaLabel: string;
  investigationRound: string;
  statusActiveAssessment: string;
  statusReassessed: string;
  compactNewInvestigation: string;
  compactEditSymptoms: string;

  // Stage 6B-5C: Desktop Split Diagnostic Workbench
  inspectionRailAriaLabel: string;
  workflowRailAriaLabel: string;
  crossReferenceHint: string;
  crossReferenceClear: string;
  initialTelemetryCardTitle: string;

  // Stage 6B-5E: Mobile Bottom Action Dock
  mobileDockAriaLabel: string;
  dockNavOverview: string;
  dockNavMatrix: string;
  dockNavTimeline: string;
  dockNavReport: string;
  dockActionLogEvidence: string;
  dockActionReassess: string;
  dockActionReassessing: string;

  // Stage 6C-2C: Local-First Investigation Workspace & Persistence
  workspaceTitle: string;
  workspaceSubtitle: string;
  newInvestigationAction: string;
  allInvestigationsBtn: string;
  searchInvestigationsPlaceholder: string;
  filterAll: string;
  filterUnderInvestigation: string;
  filterAwaitingEvidence: string;
  filterAssessmentUpdated: string;
  filterResolved: string;
  filterArchived: string;
  noInvestigationsFound: string;
  noSavedInvestigationsTitle: string;
  noSavedInvestigationsDesc: string;
  savedLocallyNotice: string;
  privacyNotice: string;
  saveStatusSaving: string;
  saveStatusSaved: string;
  saveStatusError: string;
  deleteConfirmTitle: string;
  deleteConfirmMsg: string;
  deleteBtn: string;
  archiveBtn: string;
  unarchiveBtn: string;
  openInvestigationBtn: string;
  renameInvestigationBtn: string;
  lastModifiedLabel: string;
  evidenceCountLabel: string;
  reassessmentsCountLabel: string;
  backToDashboardBtn: string;
  markResolvedBtn: string;
  reopenCaseBtn: string;
  statusNew: string;
  statusUnderInvestigation: string;
  statusAwaitingEvidence: string;
  statusAssessmentUpdated: string;
  statusResolved: string;
  saveRenameBtn: string;
  cancelBtn: string;

  // Stage 6C-3A: Contextual Investigation Assistant
  assistantPanelTitle: string;
  assistantPanelSubtitle: string;
  assistantActiveCaseLabel: string;
  assistantOfflineBadge: string;
  assistantOfflineNotice: string;
  assistantSuggestedHeading: string;
  assistantSuggestLeading: string;
  assistantSuggestUnconfirmed: string;
  assistantSuggestLatestMeasure: string;
  assistantSuggestNext: string;
  assistantSuggestDistinguish: string;
  assistantSuggestEvolution: string;
  assistantInputPlaceholder: string;
  assistantSendBtn: string;
  assistantSending: string;
  assistantKeyboardHint: string;
  assistantEmptyHistory: string;
  assistantClearHistory: string;
  assistantRetryBtn: string;
  assistantCloseBtn: string;
  assistantToggleBtn: string;
  assistantMessagesCount: string;
  assistantLiveBadge: string;
  assistantLiveNotice: string;
  assistantPersistenceError: string;
  assistantRetrySaveBtn: string;
  assistantUnsavedPill: string;
}

export const translations: Record<SupportedLanguage, Translations> = {
  en: {
    brandName: 'CircuitLens',
    brandTagline: 'AI-Assisted Electronics Troubleshooting System',
    stageBadge: 'AI Diagnostic Workbench',
    heroTag: 'Hardware Intelligence',
    intakeBadge: 'Diagnostic Intake',
    stageTitle: 'AI-Powered Circuit Diagnostics Workbench',
    stageSubtitle: 'High-precision visual PCB defect analysis, multi-hypothesis fault reasoning, and ordered safety inspection procedures.',
    systemStatusTitle: 'Subsystem Diagnostics',
    statusChecking: 'Probing /api/health...',
    statusConnected: 'Backend Online',
    statusError: 'Backend Unavailable',
    retryButton: 'Ping Endpoint',
    endpointLabel: 'Proxy Target',
    serviceLabel: 'Service Identifier',
    latencyLabel: 'Round-trip Latency',
    timestampLabel: 'Backend Heartbeat',
    targetModelLabel: 'AI Model Target',
    apiProxyStatusLabel: 'Vite Proxy Pipeline',
    apiProxyVerified: 'Active (/api -> :4000)',
    nextStagesTitle: 'Investigation Pipeline & Core Capabilities',
    nextStagesSubtitle: 'Integrated multimodal hardware diagnostic pipeline implemented in this build:',
    stage2Title: '1. Multimodal Vision Intake',
    stage2Desc: 'High-res image/schematic intake with container signature checks, crop preview, and symptom profiling.',
    stage3Title: '2. Multimodal AI Diagnostics',
    stage3Desc: 'Optical defect observations, unconfirmed fault hypotheses, and prioritized unpowered-first checks.',
    stage4Title: '3. Evidence-Driven Reassessment',
    stage4Desc: 'Physical bench measurement ledger, supersession audit trails, and evidence-cited hypothesis updates.',
    themeToggle: 'Appearance',
    themeDark: 'Dark Mode',
    themeLight: 'Light Mode',
    languageSelect: 'Language',
    footerNotice: 'Engineered for the Meta Global AI Developer Hackathon • Hardware Engineering Diagnostics',

    // Stage 2
    intakeSectionTitle: 'Vision & Schematic Intake',
    intakeSectionSubtitle: 'Select a high-resolution circuit board photo or schematic and define observed operational fault behavior.',
    dropzoneTitle: 'Drag & drop circuit photograph or schematic',
    dropzoneSubtitle: 'Supported formats: JPEG, PNG, or WebP up to 10 MB',
    dropzoneBrowseBtn: 'Browse Files',
    dropzoneCameraBtn: 'Take Photo',
    dropzoneDragActive: 'Drop image file here to inspect...',
    imageRequiredError: 'A circuit photograph or schematic is required to begin diagnostic investigation.',
    invalidFileTypeError: 'Unsupported file format. Please provide a JPEG, PNG, or WebP image.',
    fileSizeExceededError: 'Image file exceeds the 10 MB limit. Please select a smaller photo.',
    fileMissingMimeError: 'Unrecognized image file format. Please upload a valid image file.',
    previewAltText: 'Uploaded circuit board inspection preview',
    previewFilenameLabel: 'File Name',
    previewSizeLabel: 'File Size',
    replaceImageBtn: 'Replace Photo',
    removeImageBtn: 'Remove Photo',
    formSectionTitle: 'Operational Symptom Profile',
    boardNameLabel: 'Board Name / Identifier',
    boardNameOptional: '(Optional)',
    boardNamePlaceholder: 'e.g., ESP32 Motor Driver Rev 2, Buck Converter v1.4',
    expectedBehaviorLabel: 'Expected Nominal Operation',
    expectedBehaviorRequired: '(Required)',
    expectedBehaviorPlaceholder: 'Describe normal intended operation (e.g., 5V rail powers MCU, green status LED blinks at 1Hz)...',
    expectedBehaviorRequiredError: 'Please describe expected circuit operation.',
    observedBehaviorLabel: 'Observed Fault Symptoms',
    observedBehaviorRequired: '(Required)',
    observedBehaviorPlaceholder: 'Describe what actually happens (e.g., LED dark, AMS1117 regulator hot to touch, 3.3V rail measures 0.2V)...',
    observedBehaviorRequiredError: 'Please describe the observed fault symptoms.',
    componentsLabel: 'Suspect Components or ICs',
    componentsOptional: '(Optional)',
    componentsPlaceholder: 'e.g., U2 (AMS1117-3.3), C4 (10µF 0805), D1 (Schottky)',
    notesLabel: 'Additional Diagnostic Notes',
    notesOptional: '(Optional)',
    notesPlaceholder: 'e.g., Board was dropped prior to failure; measured 0.2V on TP1...',
    reviewInvestigationBtn: 'Review Investigation Details',
    stagedConfirmationTitle: 'Investigation Setup Review',
    stagedConfirmationNotice: 'Verify board photo and symptom details before initiating multimodal AI inspection.',
    stagedReadyBadge: 'Ready for Analysis',
    stagedBoardLabel: 'Board Name',
    stagedImageLabel: 'Evidence Image',
    stagedExpectedLabel: 'Expected Behavior',
    stagedObservedLabel: 'Observed Behavior',
    stagedComponentsLabel: 'Suspect Hardware',
    stagedNotesLabel: 'Diagnostic Notes',
    stagedNotSpecified: 'None specified',
    editIntakeBtn: 'Edit Intake Profile',
    cameraModalTitle: 'Live Camera Capture',
    cameraInitializing: 'Initializing camera video stream...',
    cameraSnapBtn: 'Capture Frame',
    cameraCancelBtn: 'Cancel',
    cameraCloseBtn: 'Close Window',
    cameraPermissionDenied: 'Camera permission was denied. Please grant camera access in browser settings or upload a file.',
    cameraNotFound: 'No camera hardware detected on this device. Please connect a camera or choose a file.',
    cameraInUse: 'Camera is currently in use by another application. Please close other software and retry.',
    cameraUnsupported: 'Video capture is unsupported in this browser or requires a secure (HTTPS) origin.',
    cameraCaptureError: 'Failed to capture frame from video stream. Please retry or choose a file.',
    cameraGenericError: 'Unable to start camera. Please upload an image file instead.',

    // Stage 3: AI Diagnostics & Results
    startDiagnosisBtn: 'Run AI Circuit Diagnosis',
    diagnosingProgressTitle: 'Analyzing Circuit Board...',
    diagnosingProgressSubtitle: 'Transmitting PCB photograph and symptom profile for multimodal defect and failure path analysis.',
    diagnosingTip: 'Visual reasoning and safety verification typically take 5 to 20 seconds. Please do not close this window.',
    cancelDiagnosisBtn: 'Cancel Diagnosis',
    retryDiagnosisBtn: 'Retry Diagnosis',
    editSymptomsBtn: 'Edit Intake Parameters',
    newInvestigationBtn: 'New Circuit Investigation',
    confirmNewInvestigation: 'Start a new circuit investigation? Current diagnosis results and staged images will be cleared.',
    diagnosisErrorTitle: 'Diagnostic Analysis Error',
    missingApiKeyErrorNotice: 'Model API key is not configured on the server. Please add your MODEL_API_KEY to the server .env configuration.',
    networkErrorNotice: 'Unable to reach the backend diagnostic service. Please verify that the backend server is running on port 4000.',
    rateLimitErrorNotice: 'Model API rate limit reached. Please wait a moment before trying again.',
    timeoutErrorNotice: 'Diagnostic request timed out. The model or network took too long to complete visual inference.',
    genericErrorNotice: 'An unexpected error occurred during diagnostic processing. Your entered symptoms and image have been preserved.',
    outputLimitErrorNotice: 'The model reached its maximum output token limit before completing the diagnosis. Please provide more concise intake notes or contact support.',
    invalidOutputErrorNotice: 'The model produced an unparseable response. The raw output did not conform to standard JSON syntax.',
    schemaValidationErrorNotice: 'The model output was valid JSON but failed structural schema validation. Required diagnostic fields were missing or invalid.',
    modelRefusalErrorNotice: 'The model refused to process this diagnostic request. Please review the image and symptom text for compliance with safety guidelines.',

    resultsSectionTitle: 'AI Circuit Diagnostic Report',
    resultsSectionSubtitle: 'Multi-hypothesis electronic failure analysis powered by multimodal reasoning.',
    resultsBadge: 'Initial Assessment (R0)',
    executiveSummaryTitle: 'Diagnostic Summary',
    visibleObservationsTitle: 'Direct Optical Observations',
    visibleObservationsSubtitle: 'Concrete physical features directly visible on the board, separated from inferred root causes.',
    observationEvidenceLabel: 'Observable Visual Evidence',
    hypothesesTitle: 'Fault Hypotheses & Inferred Mechanisms',
    hypothesesSubtitle: 'Plausible root-cause mechanisms deduced from visual cues and reported symptoms. Hypotheses are deductions, not confirmed facts.',
    hypothesisReasoningLabel: 'Technical Rationale',
    hypothesisEvidenceLabel: 'Supporting Evidence',
    hypothesisVerificationLabel: 'Suggested Proof / Measurement',
    confidenceLabel: 'Confidence Level',
    confidenceHigh: 'High Confidence',
    confidenceMedium: 'Medium Confidence',
    confidenceLow: 'Low Confidence',
    recommendedChecksTitle: 'Prioritized Safe Troubleshooting Sequence',
    recommendedChecksSubtitle: 'Ordered troubleshooting actions starting with unpowered tests (cold resistance, visual magnification) before in-circuit testing.',
    checkStepLabel: 'Step',
    checkTestTypeLabel: 'Test Category',
    checkToolsLabel: 'Instruments & Tools',
    checkProcedureLabel: 'Step-by-Step Procedure',
    checkExpectedResultLabel: 'Expected Healthy Reading',
    checkSafetyNotesLabel: 'Step Safety Precautions',
    safetyWarningsTitle: 'Critical Electrical Safety Warnings',
    safetyWarningsNotice: 'Review these mandatory safety precautions before placing any probe or connecting power to this board.',
    limitationsTitle: 'Inspection Limitations & Uncertainties',
    limitationsSubtitle: 'Factors such as camera angle, obscured traces, or missing schematics that constrain diagnostic certainty.',
    disclaimerNotice: 'CircuitLens is an AI-assisted diagnostic aid for electronics troubleshooting. Hypotheses must be confirmed safely with appropriate instrumentation before desoldering or replacing components.',

    // Stage 4B: Evidence Capture & Troubleshooting
    troubleshootingSectionTitle: 'Interactive Diagnostic Check Execution',
    troubleshootingSectionSubtitle: 'Select a recommended check below to review safety precautions, execute the procedure, and record measured test evidence.',
    openCheckBtn: 'Perform Check',
    closeCheckBtn: 'Close Check Details',
    selectedCheckHeading: 'Selected Diagnostic Procedure',
    noProcedureDetails: 'The diagnostic output did not include step-by-step procedure details for this check. Follow standard bench testing precautions.',
    recordEvidenceTitle: 'Record Test Outcome',
    recordEvidenceSubtitle: 'Record the empirical outcome observed during this physical check. Measurements are optional.',
    outcomeLabel: 'Test Outcome',
    outcomePassedLabel: 'Passed (Nominal)',
    outcomePassedDesc: 'Measured reading or behavior matches expected healthy circuit values.',
    outcomeFailedLabel: 'Failed (Defective / Anomaly)',
    outcomeFailedDesc: 'Measured reading or behavior indicates an electrical fault or deviation.',
    outcomeInconclusiveLabel: 'Inconclusive',
    outcomeInconclusiveDesc: 'Reading is ambiguous or cannot definitively verify or rule out nominal state.',
    outcomeUnableLabel: 'Unable to Perform',
    outcomeUnableDesc: 'Missing required tools, unsafe conditions, or test point is inaccessible.',
    measurementSectionTitle: 'Measured Values (Optional)',
    numericValueLabel: 'Numeric Value',
    numericValuePlaceholder: 'e.g. 3.3, 0.05, 4700',
    measurementUnitLabel: 'Unit',
    measurementUnitPlaceholder: 'e.g. V, mV, Ω, kΩ, mA',
    technicianNotesLabel: 'Technician Observations',
    technicianNotesPlaceholder: 'Describe probe points, multimeter behavior, ambient conditions, or physical signs (max 500 characters)...',
    saveEvidenceBtn: 'Save to Evidence Log',
    evidenceLogTitle: 'Investigation Evidence Log',
    evidenceLogSubtitle: 'Chronological audit trail of performed diagnostic checks and recorded readings.',
    noEvidenceLogged: 'No diagnostic checks have been recorded yet. Select an available check above to record evidence.',
    evidenceAttemptLabel: 'Attempt',
    supersedesLabel: 'Supersedes prior attempt',
    supersedeOptionLabel: 'Supersede previous attempt for this check',
    supersedeOptionDesc: 'Check this box if this record corrects or updates your earlier attempt. The prior record remains in history.',
    validationErrorIncompletePair: 'Both numeric value and measurement unit must be provided together, or both omitted.',
    validationErrorNumericRange: 'Numeric value must be a valid finite number between -1,000,000,000 and 1,000,000,000.',
    validationErrorUnitLength: 'Measurement unit must be between 1 and 20 characters.',
    validationErrorNotesLength: 'Technician notes must not exceed 500 characters.',
    validationErrorOutcomeRequired: 'Please select a test outcome.',
    evidenceRecordedNotice: 'Evidence recorded successfully.',
    nonMandatoryNotice: 'Recommended checks are guidance only. You are in full control of test execution. Never attempt dangerous live-circuit probing.',
    unverifiedDisclaimer: 'AI hypotheses are deductive possibilities, not confirmed faults. Perform all checks with isolated, appropriate instrumentation.',
    checkStatusUntested: 'Untested',
    checkStatusTested: 'Tested',
    totalAttemptsLabel: 'attempts logged',
    activeCheckBadge: 'Active Selection',

    // Stage 4B-4: Reassessment Controls & Results
    reassessButton: 'Request Diagnostic Reassessment',
    reassessingProgressTitle: 'Reassessing Diagnostic Hypotheses...',
    reassessingProgressSubtitle: 'Synthesizing bench evidence and updating fault probabilities.',
    reassessmentReadyNotice: 'Recorded bench evidence is ready for diagnostic reassessment.',
    noEvidenceForReassessmentNotice: 'Record at least 1 diagnostic check outcome to request AI reassessment.',
    evidenceLimitExceededNotice: 'The current reassessment endpoint accepts up to 20 evidence records. Your investigation currently contains {count} records. Reassessment is temporarily paused to preserve complete history without truncation.',
    reassessErrorTitle: 'Reassessment Failed',
    cancelReassessmentBtn: 'Cancel Reassessment',
    retryReassessmentBtn: 'Retry Reassessment',
    reassessmentNotesLabel: 'Additional Reassessment Notes (Optional)',
    reassessmentNotesPlaceholder: 'Describe any circuit changes, test conditions, or environmental anomalies (max 1000 characters)...',
    reassessmentSectionTitle: 'Evidence-Driven Reassessment Results',
    reassessmentSectionSubtitle: 'Updated diagnostic conclusions evaluated against your empirical bench test measurements.',
    evidenceSynthesisTitle: 'Evidence Synthesis & Diagnostic Rationale',
    revisedHypothesesTitle: 'Revised Fault Hypotheses',
    revisedHypothesesSubtitle: 'Probabilistic fault hypotheses updated according to recorded test outcomes.',
    hypothesisStatusLabel: 'Evaluation Status',
    statusSupported: 'Supported',
    statusWeakened: 'Weakened',
    statusUnresolved: 'Unresolved',
    statusContradicted: 'Contradicted',
    hypothesisChangeExplanationLabel: 'Change Explanation',
    citingEvidenceLabel: 'Directly Citing Evidence',
    evidenceCitationRecordNotFound: 'Referenced evidence ID not found in current history',
    evidenceCitationOutcomeLabel: 'Outcome',
    evidenceCitationValueLabel: 'Value',
    nextRecommendedChecksTitle: 'Follow-Up Recommended Checks',
    nextRecommendedChecksSubtitle: 'Prioritized verification steps generated to resolve remaining fault uncertainties.',
    noNewVisualInspectionNotice: 'Important: Reassessment evaluates your bench test outcomes against the initial visual observations. The circuit board photograph was not re-analyzed.',
    reassessmentCycleBadge: 'Reassessment Round',
    initialChecksCycleBadge: 'Initial Sequence (Round 0)',
    allChecksCompletedNotice: 'All recommended checks for this round have been recorded.',
    initialDiagnosisBadge: 'Initial Diagnosis (Pre-Test)',
    latestReassessmentBadge: 'Latest Evidence-Based Reassessment',
    historicalReassessmentBadge: 'Prior Reassessment Round',
    hypothesesRevisedNotice: 'These initial hypotheses have been updated by recorded test evidence in Reassessment Round #{round}.',
    viewLatestReassessmentBtn: 'View Latest Reassessment',
    latestStatusLabel: 'Latest Evaluated Status',
    jumpToHypothesisRevision: 'Jump to revised evaluation in Latest Round',
    hardwareAccessDisclaimer: 'CircuitLens does not have direct access to physical hardware. Physical tests, measurements, and component changes shown here are based on information reported by the technician.',
    evidenceCitationSuperseded: 'Superseded',
    evidenceCitationSupersededHint: 'This measurement or check was superseded by a later test record.',

    // Stage 6B-3: Operational Telemetry & Cost Transparency
    telemetrySectionTitle: 'Operational Telemetry & Usage',
    telemetrySectionSubtitle: 'Inference latency, provider model, token processing, and estimated cost metrics.',
    telemetryDiagnosisTitle: 'Diagnosis Telemetry',
    telemetryReassessmentTitle: 'Reassessment Telemetry',
    telemetryProviderLabel: 'AI Provider',
    telemetryModelLabel: 'Model',
    telemetryDurationLabel: 'Latency',
    telemetryInputTokensLabel: 'Input Tokens',
    telemetryOutputTokensLabel: 'Output Tokens',
    telemetryTotalTokensLabel: 'Total Tokens',
    telemetryEstimatedCostLabel: 'Estimated Cost',
    telemetryPartialCostLabel: 'Partial Cost Subtotal',
    telemetryPartialCostBadge: 'Partial: {cost}',
    telemetryPartialCostDisclaimer: 'Incomplete usage reported by provider. Displayed cost is a partial subtotal, not the full request cost.',
    telemetryCostDisclaimer: 'Estimated based on published provider token rates. Actual billing may vary.',
    telemetryUnavailable: 'Unavailable',
    telemetryDetailsSummary: 'Operational Telemetry',
    telemetryStatusReported: 'Provider Reported',
    telemetryStatusPartial: 'Partial Usage Reported',
    telemetryStatusUnavailable: 'Usage Unavailable',

    // Stage 6B-4B-1: Interactive Circuit Image Inspection
    inspectorTitle: 'Circuit Board Visual Inspection',
    inspectorSubtitle: 'Inspect fine PCB traces, silkscreen, and solder joints alongside AI observations.',
    inspectorZoomIn: 'Zoom In (+)',
    inspectorZoomOut: 'Zoom Out (-)',
    inspectorFit: 'Fit to View',
    inspectorReset100: '100% Native Scale',
    inspectorFullscreen: 'Fullscreen Inspection',
    inspectorExitFullscreen: 'Exit Fullscreen',
    inspectorZoomLevel: 'Zoom',
    inspectorPanHint: 'Drag to pan around the circuit board',
    inspectorSelectedObservation: 'Referenced Visual Observation',
    inspectorClearObservation: 'Clear Selection',
    inspectorToggleDrawer: 'Inspect Circuit Photo',
    inspectorCloseDrawer: 'Close Inspector',
    inspectorOriginalImageBadge: 'Original Resolution',

    // Stage 6B-4B-2: Professional Diagnostic Report Export
    exportSectionTitle: 'Diagnostic Report & Export',
    exportSectionSubtitle: 'Export comprehensive laboratory reports for technician records, ticketing, or customer handoff.',
    exportPrintPdfBtn: 'Print / Save as PDF',
    exportJsonBtn: 'Download JSON',
    exportMarkdownBtn: 'Download Markdown (.md)',
    exportReportBadge: 'Report Ready',
    exportEpistemicNotice: 'Diagnostic reports document remote AI visual reasoning and technician bench measurements. Suspected faults are analytical hypotheses, not physically confirmed root causes without component isolation.',
    exportReportHeaderTitle: 'CircuitLens Diagnostic Report',
    exportInvestigationIdLabel: 'Investigation ID',
    exportGeneratedAtLabel: 'Generated',
    exportDeviceSectionTitle: 'Circuit & Intake Information',
    exportObservationsSectionTitle: 'Direct Optical Observations',
    exportHypothesesSectionTitle: 'Fault Hypotheses & Evolution',
    exportEvidenceSectionTitle: 'Technician Evidence Ledger',
    exportReassessmentsSectionTitle: 'Reassessment Findings & Synthesis',
    exportChecksSectionTitle: 'Recommended Troubleshooting Checks',
    exportSafetySectionTitle: 'Electrical Safety Precautions',
    exportLimitationsSectionTitle: 'Diagnostic Limitations & Uncertainties',
    exportTelemetrySectionTitle: 'Inference Telemetry & Token Accounting',
    exportOriginAi: 'AI-GENERATED ANALYSIS',
    exportOriginTech: 'TECHNICIAN BENCH RECORD',
    exportOriginSystem: 'SYSTEM METADATA',

    // Stage 6B-4B-3: Hypothesis Evolution & Evidence Timeline
    evolutionMatrixTitle: 'Hypothesis Evolution Matrix',
    evolutionMatrixSubtitle: 'Comparative tracking of fault candidates across initial diagnosis and all reassessment rounds.',
    evolutionEpistemicNotice: 'Historical hypothesis assessments document remote AI visual deductions based on accumulated bench measurements. Supported hypotheses are analytical deductions, never physically confirmed root causes without component isolation.',
    matrixCycleInitialOnly: 'Initial Assessment (R0)',
    matrixCyclesLogged: 'Rounds',
    matrixColHypothesis: 'Fault Hypothesis Candidate',
    matrixColInitial: 'Initial (R0)',
    matrixColRoundPrefix: 'Round',
    matrixColCurrent: 'Current State',
    matrixIntroducedInPrefix: 'Introduced in',
    matrixShowDetails: 'View rationale',
    matrixHideDetails: 'Hide rationale',
    matrixInitialReasoningLabel: 'Initial Deduction',
    matrixStatusNotPresent: '—',
    matrixStatusOmitted: 'Omitted',
    matrixDeltaUp: 'Shifted Up',
    matrixDeltaDown: 'Shifted Down',
    matrixCitationsCount: 'citations total',
    timelineTitle: 'Evidence & Diagnostic Timeline',
    timelineSubtitle: 'Chronological audit trail of physical bench checks, superseded measurements, and AI syntheses.',
    timelineEventsLogged: 'Milestones',
    timelineSourceAi: 'AI-GENERATED',
    timelineSourceTech: 'TECHNICIAN BENCH',
    timelineSourceSystem: 'SYSTEM METADATA',
    timelineTimestampMissing: 'Timestamp not recorded',
    timelineInitialTag: 'Cycle R0 (Initial)',
    timelineSupersededBadge: '[SUPERSEDED]',
    timelineInconclusiveNotice: 'Inconclusive outcome — does not prove or disprove hypotheses',
    timelineUnableNotice: 'Unable to perform check as specified',
    timelineRecordedMeasurement: 'Recorded Value',
    timelineJumpToSuperseding: 'Jump to replacement attempt',
    timelineHypothesisChangesTitle: 'Evaluated Hypothesis Shifts',
    timelineSafetyAlert: 'Safety Precautions',
    currentAssessmentTitle: 'Current Diagnostic State Synthesis',
    currentAssessmentSubtitle: 'Executive tri-state plausibility summary based on accumulated bench measurements.',
    navToMatrixBtn: 'View Evolution Matrix',
    navToTimelineBtn: 'View Evidence Timeline',
    assessmentEpistemicHeader: 'Epistemic Guardrail',
    assessmentEpistemicNotice: 'Supported hypotheses represent analytical plausibility corroborated by bench test readings. They are NEVER physically confirmed root causes without component isolation and desoldering.',
    noSupportedHypotheses: 'No hypotheses supported by current evidence.',
    noContradictedHypotheses: 'No hypotheses ruled out by bench tests yet.',
    noUnresolvedHypotheses: 'No unresolved fault candidates remaining.',
    strongestSupportingEvidenceTitle: 'Decisive Corroborating Evidence',
    importantContradictoryEvidenceTitle: 'Decisive Contradictory Evidence',
    outstandingChecksTitle: 'Prioritized Next Verification Checks',
    criticalSafetyTitle: 'Essential Electrical Safety Precautions',
    subnavOverview: 'Overview',
    subnavMatrix: 'Hypothesis Evolution Matrix',
    subnavTimeline: 'Evidence Timeline',
    subnavReport: 'Report Export',

    // Stage 6B-4B-3D: Ambiguous Hypothesis Decoupling & Localization
    ambiguousIdentityBadge: 'Ambiguous Identity',
    ambiguousIdentityTooltip: 'Multiple candidates share this title. Identity cannot be definitively tracked across rounds.',
    ambiguousMultipleCandidatesNotice: 'Multiple candidates share this title; identity cannot be established across rounds.',
    ambiguousCannotEstablishAcrossRounds: 'Identity cannot be established across diagnostic rounds.',
    ambiguousNoTrendNotice: 'No confidence trend is shown because hypothesis identity across rounds is uncertain.',
    ambiguousGroupHeader: 'Round-Specific Ambiguous Candidates',
    ambiguousGroupSubtitle: 'These fault candidates share identical titles within the same round. They are documented independently without inferred cross-round continuity.',
    ambiguousReappearanceBadge: 'Reappeared (Uncertain Identity)',
    ambiguousReappearanceTooltip: 'Candidate reappeared after being omitted in an earlier round; cross-round continuity cannot be established solely from title equality.',
    ambiguousRoundIsolatedNotice: 'Round-isolated candidate; not linked across rounds.',

    // Stage 6B-4B-3F: Explicit Hypothesis Identity Semantics & Export Completeness
    heuristicTitleMatchBadge: 'Title-Matched Track',
    heuristicTitleMatchTooltip: 'Matched across rounds based on title equality. Continuity is a heuristic, not an independently verified physical identity.',
    heuristicTrackingExplanation: 'Identical titles are used as a tracking heuristic across rounds.',
    heuristicNotConfirmedNotice: 'Hypothesis continuity does not constitute physical fault confirmation.',
    matrixDeltaUpTooltip: 'Confidence increased',
    matrixDeltaDownTooltip: 'Confidence decreased',
    matrixDeltaSameTooltip: 'Confidence maintained',
    matrixOverallDeltaUpTooltip: 'Overall confidence increased',
    matrixOverallDeltaDownTooltip: 'Overall confidence decreased',
    exportInitialOnly: 'Initial assessment only',
    exportNoEvidenceRecorded: 'No physical test measurements or checks were recorded for this investigation.',
    exportInitialReasoningHeading: 'Initial Deductive Reasoning & Proposed Checks',
    exportTechnicianEvidenceHeading: 'Chronological, immutable record of physical measurements and checks conducted on the bench.',
    exportDefaultSafetyNotice: 'Standard unpowered electrical safety procedures apply.',
    exportDefaultLimitationsNotice: 'No explicit operational limitations logged.',
    viewMeasurementRecordTooltip: 'View measurement record',

    // Stage 6B-5B: Compact Investigation Header & Workspace Shell
    healthPopoverTitle: 'Backend Service Status',
    healthPopoverClose: 'Close',
    subnavAriaLabel: 'Diagnostic workstation views',
    investigationRound: 'Round',
    statusActiveAssessment: 'Active Diagnosis',
    statusReassessed: 'Reassessed',
    compactNewInvestigation: 'New Investigation',
    compactEditSymptoms: 'Edit Symptoms',

    // Stage 6B-5C: Desktop Split Diagnostic Workbench
    inspectionRailAriaLabel: 'Circuit inspection workstation',
    workflowRailAriaLabel: 'Diagnostic reasoning and troubleshooting workflow',
    crossReferenceHint: 'Click to cross-reference with circuit photograph',
    crossReferenceClear: 'Click to clear cross-reference',
    initialTelemetryCardTitle: 'Initial Diagnosis Operational Telemetry',

    // Stage 6B-5E: Mobile Bottom Action Dock
    mobileDockAriaLabel: 'Mobile investigation navigation and actions',
    dockNavOverview: 'Overview',
    dockNavMatrix: 'Matrix',
    dockNavTimeline: 'Timeline',
    dockNavReport: 'Report',
    dockActionLogEvidence: 'Log Evidence',
    dockActionReassess: 'Reassess',
    dockActionReassessing: 'Reassessing...',

    // Stage 6C-2C: Local-First Investigation Workspace & Persistence
    workspaceTitle: 'Investigation Workspace',
    workspaceSubtitle: 'Local-first diagnostic ledger, physical bench evidence history, and active circuit cases.',
    newInvestigationAction: 'New Investigation',
    allInvestigationsBtn: 'All Investigations',
    searchInvestigationsPlaceholder: 'Search cases by board name, notes, or fault symptoms...',
    filterAll: 'All Cases',
    filterUnderInvestigation: 'Under Investigation',
    filterAwaitingEvidence: 'Awaiting Evidence',
    filterAssessmentUpdated: 'Assessment Updated',
    filterResolved: 'Resolved',
    filterArchived: 'Archived',
    noInvestigationsFound: 'No investigations found matching your search filter.',
    noSavedInvestigationsTitle: 'No Saved Investigations Yet',
    noSavedInvestigationsDesc: 'Create a new circuit investigation to capture optical defects, record multimeter/scope bench measurements, and track AI reassessment cycles.',
    savedLocallyNotice: 'Saved locally in browser IndexedDB',
    privacyNotice: 'Local-First Privacy: All circuit photos, diagnostic hypotheses, and bench measurements remain solely on this device. No cloud sync or external telemetry.',
    saveStatusSaving: 'Saving...',
    saveStatusSaved: 'Saved locally',
    saveStatusError: 'Storage Error',
    deleteConfirmTitle: 'Permanently Delete Case?',
    deleteConfirmMsg: 'This action will permanently remove this circuit investigation, including all bench measurements, optical crops, and report history from this browser. This cannot be undone.',
    deleteBtn: 'Delete Case',
    archiveBtn: 'Archive',
    unarchiveBtn: 'Unarchive',
    openInvestigationBtn: 'Open Investigation',
    renameInvestigationBtn: 'Rename Case',
    lastModifiedLabel: 'Last updated',
    evidenceCountLabel: 'evidence items',
    reassessmentsCountLabel: 'reassessment cycles',
    backToDashboardBtn: 'Dashboard',
    markResolvedBtn: 'Mark as Resolved',
    reopenCaseBtn: 'Reopen Case',
    statusNew: 'New Case',
    statusUnderInvestigation: 'Under Investigation',
    statusAwaitingEvidence: 'Awaiting Evidence',
    statusAssessmentUpdated: 'Assessment Updated',
    statusResolved: 'Resolved',
    saveRenameBtn: 'Save Name',
    cancelBtn: 'Cancel',

    // Stage 6C-3A: Contextual Investigation Assistant
    assistantPanelTitle: 'Case Assistant',
    assistantPanelSubtitle: 'Contextual AI discussion for the active circuit investigation',
    assistantActiveCaseLabel: 'Active Case',
    assistantOfflineBadge: 'Offline Preview',
    assistantOfflineNotice: 'Deterministic demonstration mode: Responses are derived from active case evidence without third-party model inference.',
    assistantSuggestedHeading: 'Suggested Technical Questions',
    assistantSuggestLeading: 'Explain the leading fault hypothesis',
    assistantSuggestUnconfirmed: 'Why has this hypothesis not been confirmed?',
    assistantSuggestLatestMeasure: 'Interpret the latest measurement cautiously',
    assistantSuggestNext: 'What should I investigate next?',
    assistantSuggestDistinguish: 'What evidence would distinguish the remaining hypotheses?',
    assistantSuggestEvolution: 'Summarize how the assessment changed after the latest evidence',
    assistantInputPlaceholder: 'Ask about hypotheses, bench readings, or component isolation...',
    assistantSendBtn: 'Send',
    assistantSending: 'Analyzing context...',
    assistantKeyboardHint: 'Press Enter to send, Shift+Enter for newline',
    assistantEmptyHistory: 'No messages yet for this investigation. Select a suggested question above or type your inquiry below.',
    assistantClearHistory: 'Clear conversation',
    assistantRetryBtn: 'Retry',
    assistantCloseBtn: 'Close assistant',
    assistantToggleBtn: 'Case Assistant',
    assistantMessagesCount: 'messages',
    assistantLiveBadge: 'Live AI',
    assistantLiveNotice: 'Generated by live model inference provider.',
    assistantPersistenceError: 'Message could not be saved to local storage.',
    assistantRetrySaveBtn: 'Retry Save',
    assistantUnsavedPill: 'Unsaved',
  },
  es: {
    brandName: 'CircuitLens',
    brandTagline: 'Sistema de Diagnóstico de Circuitos Asistido por IA',
    stageBadge: 'Banco de Diagnóstico',
    heroTag: 'Inteligencia para Hardware',
    intakeBadge: 'Admisión de Diagnóstico',
    stageTitle: 'Banco de Diagnóstico de Circuitos por IA',
    stageSubtitle: 'Análisis visual de defectos en PCB, razonamiento de hipótesis de falla y procedimientos ordenados de inspección segura.',
    systemStatusTitle: 'Diagnóstico de Subsistemas',
    statusChecking: 'Comprobando /api/health...',
    statusConnected: 'Servidor Conectado',
    statusError: 'Servidor No Disponible',
    retryButton: 'Probar Conexión',
    endpointLabel: 'Destino del Proxy',
    serviceLabel: 'Identificador del Servicio',
    latencyLabel: 'Latencia de Respuesta',
    timestampLabel: 'Latido del Servidor',
    targetModelLabel: 'Modelo IA Objetivo',
    apiProxyStatusLabel: 'Canal Proxy Vite',
    apiProxyVerified: 'Activo (/api -> :4000)',
    nextStagesTitle: 'Flujo de Diagnóstico y Capacidades',
    nextStagesSubtitle: 'Canal de diagnóstico multimodal integrado y activo en esta versión:',
    stage2Title: '1. Captura de Imagen y Síntomas',
    stage2Desc: 'Carga de fotos de placa vía cámara o archivo, validación de firma de contenedor y perfil de síntomas.',
    stage3Title: '2. Diagnóstico Multimodal por IA',
    stage3Desc: 'Detección visual de anomalías, hipótesis de falla deductivas y pruebas de seguridad ordenadas.',
    stage4Title: '3. Reevaluación Basada en Evidencia',
    stage4Desc: 'Registro de mediciones de banco, trazabilidad de reemplazos y actualización de hipótesis con evidencia.',
    themeToggle: 'Apariencia',
    themeDark: 'Modo Oscuro',
    themeLight: 'Modo Claro',
    languageSelect: 'Idioma',
    footerNotice: 'Creado para el Meta Global AI Developer Hackathon • Diagnóstico de Ingeniería Electrónica',

    // Stage 2
    intakeSectionTitle: 'Captura de Imagen y Esquema',
    intakeSectionSubtitle: 'Seleccione una fotografía o esquema de alta resolución de la placa y defina el comportamiento de la falla observada.',
    dropzoneTitle: 'Arrastre y suelte la imagen o esquema de la placa',
    dropzoneSubtitle: 'Formatos compatibles: JPEG, PNG o WebP hasta 10 MB',
    dropzoneBrowseBtn: 'Explorar Archivos',
    dropzoneCameraBtn: 'Tomar Foto',
    dropzoneDragActive: 'Suelte el archivo de imagen para inspeccionar...',
    imageRequiredError: 'Se requiere una imagen o esquema de la placa para iniciar la investigación.',
    invalidFileTypeError: 'Formato de archivo no compatible. Proporcione una imagen JPEG, PNG o WebP.',
    fileSizeExceededError: 'El archivo de imagen supera el límite de 10 MB. Seleccione un archivo más pequeño.',
    fileMissingMimeError: 'Formato de archivo no reconocido. Suba un archivo de imagen válido.',
    previewAltText: 'Vista previa de inspección de la placa de circuito o esquema subido',
    previewFilenameLabel: 'Nombre de Archivo',
    previewSizeLabel: 'Tamaño',
    replaceImageBtn: 'Reemplazar Foto',
    removeImageBtn: 'Eliminar Foto',
    formSectionTitle: 'Perfil de Síntomas Operativos',
    boardNameLabel: 'Nombre / Identificador de la Placa',
    boardNameOptional: '(Opcional)',
    boardNamePlaceholder: 'ej., ESP32 Motor Controller Rev 2, Fuente Conmutada v1.4',
    expectedBehaviorLabel: 'Comportamiento Nominal Esperado',
    expectedBehaviorRequired: '(Requerido)',
    expectedBehaviorPlaceholder: 'Describa el funcionamiento previsto (ej., carril de 5V alimenta el microcontrolador, LED verde enciende)...',
    expectedBehaviorRequiredError: 'Por favor describa el comportamiento esperado.',
    observedBehaviorLabel: 'Comportamiento Observado de la Falla',
    observedBehaviorRequired: '(Requerido)',
    observedBehaviorPlaceholder: 'Describa qué ocurre realmente (ej., LED apagado, regulador AMS1117 sobrecalentado, carril de 3.3V mide 0.2V)...',
    observedBehaviorRequiredError: 'Por favor describa el comportamiento observado de la falla.',
    componentsLabel: 'Componentes o CI Sospechosos',
    componentsOptional: '(Opcional)',
    componentsPlaceholder: 'ej., U2 (AMS1117-3.3), C4 (10µF 0805), D1 (Schottky)',
    notesLabel: 'Notas Adicionales de Diagnóstico',
    notesOptional: '(Opcional)',
    notesPlaceholder: 'ej., La placa sufrió una caída antes de fallar; se midió 0.2V en el punto TP1...',
    reviewInvestigationBtn: 'Revisar Detalles',
    stagedConfirmationTitle: 'Revisión de la Investigación',
    stagedConfirmationNotice: 'Verifique la foto de la placa y los síntomas antes de iniciar el diagnóstico multimodal.',
    stagedReadyBadge: 'Listo para Análisis',
    stagedBoardLabel: 'Nombre de Placa',
    stagedImageLabel: 'Foto de Evidencia',
    stagedExpectedLabel: 'Comportamiento Esperado',
    stagedObservedLabel: 'Comportamiento Observado',
    stagedComponentsLabel: 'Hardware Sospechoso',
    stagedNotesLabel: 'Notas Diagnósticas',
    stagedNotSpecified: 'Ninguno especificado',
    editIntakeBtn: 'Editar Perfil de Entrada',
    cameraModalTitle: 'Captura en Vivo con Cámara',
    cameraInitializing: 'Inicializando señal de video...',
    cameraSnapBtn: 'Capturar Foto',
    cameraCancelBtn: 'Cancelar',
    cameraCloseBtn: 'Cerrar Diálogo',
    cameraPermissionDenied: 'Permiso de cámara denegado. Habilite el acceso a la cámara en la configuración de su navegador o seleccione un archivo.',
    cameraNotFound: 'No se detectó ningún dispositivo de cámara en el sistema. Conecte una cámara o elija un archivo del disco.',
    cameraInUse: 'La cámara está ocupada o en uso por otra aplicación. Cierre otras aplicaciones que utilicen la cámara y vuelva a intentarlo.',
    cameraUnsupported: 'El acceso a la cámara no es compatible en este navegador o requiere una conexión segura HTTPS.',
    cameraCaptureError: 'No se pudo capturar el fotograma del video. Inténtelo de nuevo o seleccione un archivo de imagen.',
    cameraGenericError: 'No se pudo iniciar la cámara. Por favor suba un archivo de imagen en su lugar.',

    // Stage 3: AI Diagnostics & Results
    startDiagnosisBtn: 'Ejecutar Diagnóstico con IA',
    diagnosingProgressTitle: 'Analizando Placa de Circuito...',
    diagnosingProgressSubtitle: 'Transmitiendo la fotografía y el perfil de síntomas para el análisis multimodal de defectos y fallas.',
    diagnosingTip: 'El razonamiento visual y la verificación de seguridad suelen tardar entre 5 y 20 segundos. No cierre esta ventana.',
    cancelDiagnosisBtn: 'Cancelar Diagnóstico',
    retryDiagnosisBtn: 'Reintentar Diagnóstico',
    editSymptomsBtn: 'Modificar Parámetros de Entrada',
    newInvestigationBtn: 'Nueva Investigación de Circuito',
    confirmNewInvestigation: '¿Desea iniciar una nueva investigación? Los resultados diagnósticos y la imagen actual se borrarán.',
    diagnosisErrorTitle: 'Error en el Análisis Diagnóstico',
    missingApiKeyErrorNotice: 'La clave de Model API no está configurada en el servidor. Agregue MODEL_API_KEY al archivo .env del servidor.',
    networkErrorNotice: 'No se pudo conectar con el servicio backend de diagnóstico. Verifique que el servidor esté activo en el puerto 4000.',
    rateLimitErrorNotice: 'Límite de peticiones de Model API alcanzado. Espere unos momentos antes de reintentar.',
    timeoutErrorNotice: 'La solicitud de diagnóstico excedió el tiempo límite. El modelo tardó demasiado en completar la inferencia visual.',
    genericErrorNotice: 'Ocurrió un error inesperado durante el diagnóstico. Sus síntomas ingresados y la imagen se han preservado.',
    outputLimitErrorNotice: 'El modelo alcanzó el límite máximo de tokens de salida antes de completar el diagnóstico. Proporcione notas de entrada más concisas o comuníquese con soporte.',
    invalidOutputErrorNotice: 'El modelo generó una respuesta no analizable. La salida sin procesar no cumplió con la sintaxis JSON estándar.',
    schemaValidationErrorNotice: 'La salida del modelo era JSON válido pero falló la validación del esquema estructural. Faltaban campos de diagnóstico requeridos o eran inválidos.',
    modelRefusalErrorNotice: 'El modelo se negó a procesar esta solicitud de diagnóstico. Revise la imagen y la descripción de síntomas para verificar el cumplimiento de las pautas de seguridad.',

    resultsSectionTitle: 'Informe Diagnóstico de Circuitos con IA',
    resultsSectionSubtitle: 'Análisis de fallas electrónicas con múltiples hipótesis impulsado por razonamiento multimodal.',
    resultsBadge: 'Evaluación Inicial (R0)',
    executiveSummaryTitle: 'Resumen Ejecutivo',
    visibleObservationsTitle: 'Observaciones Ópticas Directas',
    visibleObservationsSubtitle: 'Características físicas visibles directamente en la placa, claramente separadas de las causas inferidas.',
    observationEvidenceLabel: 'Evidencia Visual Observada',
    hypothesesTitle: 'Hipótesis de Falla y Mecanismos Inferidos',
    hypothesesSubtitle: 'Causas raíz plausibles deducidas a partir de señales visuales y síntomas reportados. Son deducciones, no hechos confirmados.',
    hypothesisReasoningLabel: 'Justificación Técnica',
    hypothesisEvidenceLabel: 'Evidencia que lo Respalda',
    hypothesisVerificationLabel: 'Verificación / Medición Sugerida',
    confidenceLabel: 'Nivel de Confianza',
    confidenceHigh: 'Confianza Alta',
    confidenceMedium: 'Confianza Media',
    confidenceLow: 'Confianza Baja',
    recommendedChecksTitle: 'Secuencia Priorizada de Pruebas Seguras',
    recommendedChecksSubtitle: 'Procedimientos ordenados iniciando con inspección sin energía (resistencia en frío, aumento óptico) antes de pruebas energizadas.',
    checkStepLabel: 'Paso',
    checkTestTypeLabel: 'Tipo de Prueba',
    checkToolsLabel: 'Instrumentos Requeridos',
    checkProcedureLabel: 'Procedimiento Paso a Paso',
    checkExpectedResultLabel: 'Lectura Esperada en Placa Sana',
    checkSafetyNotesLabel: 'Precauciones de Seguridad del Paso',
    safetyWarningsTitle: 'Advertencias Críticas de Seguridad Eléctrica',
    safetyWarningsNotice: 'Revise estas precauciones obligatorias antes de colocar puntas de prueba o suministrar energía a la placa.',
    limitationsTitle: 'Limitaciones e Incertidumbres de la Inspección',
    limitationsSubtitle: 'Factores como ángulo de fotografía, pistas ocultas o falta de esquemático que limitan la certeza diagnóstica.',
    disclaimerNotice: 'CircuitLens es una herramienta de asistencia diagnóstica. Las hipótesis deben confirmarse de manera segura con instrumentos adecuados antes de desoldar o reemplazar componentes.',

    // Stage 4B: Evidence Capture & Troubleshooting
    troubleshootingSectionTitle: 'Ejecución Interactiva de Pruebas Diagnósticas',
    troubleshootingSectionSubtitle: 'Seleccione una prueba recomendada para revisar precauciones de seguridad, ejecutar el procedimiento y registrar evidencias.',
    openCheckBtn: 'Realizar Prueba',
    closeCheckBtn: 'Cerrar Detalles de la Prueba',
    selectedCheckHeading: 'Procedimiento de Prueba Seleccionado',
    noProcedureDetails: 'El diagnóstico no incluyó instrucciones detalladas paso a paso para esta prueba. Siga las precauciones estándar de banco.',
    recordEvidenceTitle: 'Registrar Resultado de la Prueba',
    recordEvidenceSubtitle: 'Registre el resultado empírico observado durante esta prueba física. Las mediciones son opcionales.',
    outcomeLabel: 'Resultado de la Prueba',
    outcomePassedLabel: 'Aprobado (Nominal)',
    outcomePassedDesc: 'La lectura o comportamiento coincide con los valores nominales de un circuito sano.',
    outcomeFailedLabel: 'Fallido (Defectuoso / Anomalía)',
    outcomeFailedDesc: 'La lectura o comportamiento indica una falla eléctrica o desviación.',
    outcomeInconclusiveLabel: 'No Concluyente',
    outcomeInconclusiveDesc: 'La lectura es ambigua o no permite verificar ni descartar el estado nominal.',
    outcomeUnableLabel: 'No se Puede Realizar',
    outcomeUnableDesc: 'Falta de herramientas requeridas, condiciones inseguras o punto de prueba inaccesible.',
    measurementSectionTitle: 'Valores Medidos (Opcional)',
    numericValueLabel: 'Valor Numérico',
    numericValuePlaceholder: 'ej. 3.3, 0.05, 4700',
    measurementUnitLabel: 'Unidad',
    measurementUnitPlaceholder: 'ej. V, mV, Ω, kΩ, mA',
    technicianNotesLabel: 'Observaciones del Técnico',
    technicianNotesPlaceholder: 'Describa puntos de medición, comportamiento del multímetro o signos físicos (máx. 500 caracteres)...',
    saveEvidenceBtn: 'Guardar en el Registro de Evidencias',
    evidenceLogTitle: 'Registro de Evidencias de la Investigación',
    evidenceLogSubtitle: 'Historial cronológico de pruebas diagnósticas realizadas y lecturas registradas.',
    noEvidenceLogged: 'Aún no se han registrado pruebas diagnósticas. Seleccione una prueba arriba para registrar evidencias.',
    evidenceAttemptLabel: 'Intento',
    supersedesLabel: 'Reemplaza intento anterior',
    supersedeOptionLabel: 'Reemplazar el intento anterior de esta prueba',
    supersedeOptionDesc: 'Marque esta casilla si este registro corrige o actualiza su intento anterior. El registro previo se conserva en el historial.',
    validationErrorIncompletePair: 'El valor numérico y la unidad de medida deben suministrarse juntos, o ambos omitirse.',
    validationErrorNumericRange: 'El valor numérico debe ser un número finito válido entre -1.000.000.000 y 1.000.000.000.',
    validationErrorUnitLength: 'La unidad de medida debe tener entre 1 y 20 caracteres.',
    validationErrorNotesLength: 'Las observaciones del técnico no deben superar los 500 caracteres.',
    validationErrorOutcomeRequired: 'Por favor seleccione un resultado de prueba.',
    evidenceRecordedNotice: 'Evidencia registrada exitosamente.',
    nonMandatoryNotice: 'Las pruebas recomendadas son solo una guía. Usted tiene el control total de la ejecución. Nunca intente mediciones peligrosas bajo tensión.',
    unverifiedDisclaimer: 'Las hipótesis de IA son posibilidades deductivas, no fallas confirmadas. Realice todas las pruebas de forma segura con instrumental aislado.',
    checkStatusUntested: 'Sin probar',
    checkStatusTested: 'Probada',
    totalAttemptsLabel: 'intentos registrados',
    activeCheckBadge: 'Selección Activa',

    // Stage 4B-4: Reassessment Controls & Results
    reassessButton: 'Solicitar reevaluación diagnóstica',
    reassessingProgressTitle: 'Reevaluando hipótesis diagnósticas...',
    reassessingProgressSubtitle: 'Sintetizando evidencia física y actualizando probabilidades de falla.',
    reassessmentReadyNotice: 'La evidencia de banco registrada está lista para la reevaluación diagnóstica.',
    noEvidenceForReassessmentNotice: 'Registre al menos 1 resultado de verificación para solicitar la reevaluación por IA.',
    evidenceLimitExceededNotice: 'El punto de conexión actual acepta hasta 20 registros de evidencia. Su investigación contiene actualmente {count} registros. La reevaluación está pausada para preservar el historial completo sin truncamiento.',
    reassessErrorTitle: 'Error en la reevaluación',
    cancelReassessmentBtn: 'Cancelar Reevaluación',
    retryReassessmentBtn: 'Reintentar reevaluación',
    reassessmentNotesLabel: 'Notas adicionales de reevaluación (opcional)',
    reassessmentNotesPlaceholder: 'Describa cambios en el circuito, condiciones de prueba o anomalías ambientales (máx. 1000 caracteres)...',
    reassessmentSectionTitle: 'Resultados de la reevaluación basada en evidencia',
    reassessmentSectionSubtitle: 'Conclusiones diagnósticas actualizadas evaluadas frente a sus mediciones físicas de prueba.',
    evidenceSynthesisTitle: 'Síntesis de evidencia y justificación diagnóstica',
    revisedHypothesesTitle: 'Hipótesis de falla revisadas',
    revisedHypothesesSubtitle: 'Hipótesis probabilísticas de falla actualizadas según los resultados de prueba registrados.',
    hypothesisStatusLabel: 'Estado de evaluación',
    statusSupported: 'Respaldada',
    statusWeakened: 'Debilitada',
    statusUnresolved: 'No resuelta',
    statusContradicted: 'Contradicha',
    hypothesisChangeExplanationLabel: 'Explicación del cambio',
    citingEvidenceLabel: 'Evidencia citada directamente',
    evidenceCitationRecordNotFound: 'ID de evidencia referenciada no encontrada en el historial actual',
    evidenceCitationOutcomeLabel: 'Resultado',
    evidenceCitationValueLabel: 'Valor',
    nextRecommendedChecksTitle: 'Verificaciones de seguimiento recomendadas',
    nextRecommendedChecksSubtitle: 'Pasos de verificación priorizados generados para resolver incertidumbres de falla restantes.',
    noNewVisualInspectionNotice: 'Importante: La reevaluación evalúa los resultados de las pruebas de banco frente a las observaciones visuales iniciales. La fotografía del circuito no se volvió a analizar.',
    reassessmentCycleBadge: 'Ronda de reevaluación',
    initialChecksCycleBadge: 'Secuencia inicial (Ronda 0)',
    allChecksCompletedNotice: 'Se han registrado todas las verificaciones recomendadas para esta ronda.',
    initialDiagnosisBadge: 'Diagnóstico inicial (previo a pruebas)',
    latestReassessmentBadge: 'Última reevaluación basada en evidencia',
    historicalReassessmentBadge: 'Ronda de reevaluación anterior',
    hypothesesRevisedNotice: 'Estas hipótesis iniciales han sido actualizadas con evidencia registrada en la Ronda #{round}.',
    viewLatestReassessmentBtn: 'Ver última reevaluación',
    latestStatusLabel: 'Último estado evaluado',
    jumpToHypothesisRevision: 'Ir a la evaluación revisada en la última ronda',
    hardwareAccessDisclaimer: 'CircuitLens no tiene acceso directo al hardware físico. Las pruebas físicas, mediciones y cambios de componentes que se muestran aquí se basan en la información reportada por el técnico.',
    evidenceCitationSuperseded: 'Reemplazado',
    evidenceCitationSupersededHint: 'Esta medición o verificación fue reemplazada por un registro de prueba posterior.',

    // Stage 6B-3: Operational Telemetry & Cost Transparency
    telemetrySectionTitle: 'Telemetría Operativa y Uso',
    telemetrySectionSubtitle: 'Métricas de latencia de inferencia, modelo de proveedor, procesamiento de tokens y costo estimado.',
    telemetryDiagnosisTitle: 'Telemetría del Diagnóstico',
    telemetryReassessmentTitle: 'Telemetría de Reevaluación',
    telemetryProviderLabel: 'Proveedor de IA',
    telemetryModelLabel: 'Modelo',
    telemetryDurationLabel: 'Latencia',
    telemetryInputTokensLabel: 'Tokens de Entrada',
    telemetryOutputTokensLabel: 'Tokens de Salida',
    telemetryTotalTokensLabel: 'Tokens Totales',
    telemetryEstimatedCostLabel: 'Costo Estimado',
    telemetryPartialCostLabel: 'Subtotal de Costo Parcial',
    telemetryPartialCostBadge: 'Parcial: {cost}',
    telemetryPartialCostDisclaimer: 'Uso incompleto reportado por el proveedor. El costo mostrado es un subtotal parcial, no el costo total del pedido.',
    telemetryCostDisclaimer: 'Estimado según las tarifas de tokens publicadas por el proveedor. La facturación real puede variar.',
    telemetryUnavailable: 'No disponible',
    telemetryDetailsSummary: 'Telemetría Operativa',
    telemetryStatusReported: 'Reportado por Proveedor',
    telemetryStatusPartial: 'Uso Parcial Reportado',
    telemetryStatusUnavailable: 'Uso No Disponible',

    // Stage 6B-4B-1: Interactive Circuit Image Inspection
    inspectorTitle: 'Inspección Visual del Circuito',
    inspectorSubtitle: 'Inspeccione pistas de PCB, serigrafía y soldaduras junto a las observaciones de la IA.',
    inspectorZoomIn: 'Acercar (+)',
    inspectorZoomOut: 'Alejar (-)',
    inspectorFit: 'Ajustar a Vista',
    inspectorReset100: 'Escala 100% Nativa',
    inspectorFullscreen: 'Inspección en Pantalla Completa',
    inspectorExitFullscreen: 'Salir de Pantalla Completa',
    inspectorZoomLevel: 'Zoom',
    inspectorPanHint: 'Arrastre para desplazarse por la placa de circuito',
    inspectorSelectedObservation: 'Observación Visual Referenciada',
    inspectorClearObservation: 'Borrar Selección',
    inspectorToggleDrawer: 'Inspeccionar Foto del Circuito',
    inspectorCloseDrawer: 'Cerrar Inspector',
    inspectorOriginalImageBadge: 'Resolución Original',

    // Stage 6B-4B-2: Professional Diagnostic Report Export
    exportSectionTitle: 'Informe Diagnóstico y Exportación',
    exportSectionSubtitle: 'Exporte informes de laboratorio completos para registros técnicos, tickets o entrega a clientes.',
    exportPrintPdfBtn: 'Imprimir / Guardar como PDF',
    exportJsonBtn: 'Descargar JSON',
    exportMarkdownBtn: 'Descargar Markdown (.md)',
    exportReportBadge: 'Informe Listo',
    exportEpistemicNotice: 'Los informes de diagnóstico documentan el razonamiento visual remoto de IA y las mediciones de banco del técnico. Las fallas sospechosas son hipótesis analíticas, no causas raíz confirmadas físicamente sin aislamiento de componentes.',
    exportReportHeaderTitle: 'Informe Diagnóstico CircuitLens',
    exportInvestigationIdLabel: 'ID de Investigación',
    exportGeneratedAtLabel: 'Generado',
    exportDeviceSectionTitle: 'Información del Circuito y Admisión',
    exportObservationsSectionTitle: 'Observaciones Ópticas Directas',
    exportHypothesesSectionTitle: 'Hipótesis de Falla y Evolución',
    exportEvidenceSectionTitle: 'Libro de Evidencias del Técnico',
    exportReassessmentsSectionTitle: 'Hallazgos y Síntesis de Reevaluación',
    exportChecksSectionTitle: 'Verificaciones de Diagnóstico Recomendadas',
    exportSafetySectionTitle: 'Precauciones de Seguridad Eléctrica',
    exportLimitationsSectionTitle: 'Limitaciones y Dudas Diagnósticas',
    exportTelemetrySectionTitle: 'Telemetría de Inferencia y Uso de Tokens',
    exportOriginAi: 'ANÁLISIS GENERADO POR IA',
    exportOriginTech: 'REGISTRO DE BANCO DEL TÉCNICO',
    exportOriginSystem: 'METADATOS DEL SISTEMA',

    // Stage 6B-4B-3: Hypothesis Evolution & Evidence Timeline
    evolutionMatrixTitle: 'Matriz de Evolución de Hipótesis',
    evolutionMatrixSubtitle: 'Seguimiento comparativo de candidatos de falla en el diagnóstico inicial y todas las rondas de reevaluación.',
    evolutionEpistemicNotice: 'Las evaluaciones históricas de hipótesis documentan deducciones visuales remotas de IA basadas en mediciones de banco acumuladas. Las hipótesis respaldadas son deducciones analíticas, nunca causas raíz confirmadas físicamente sin aislamiento de componentes.',
    matrixCycleInitialOnly: 'Evaluación Inicial (R0)',
    matrixCyclesLogged: 'Rondas',
    matrixColHypothesis: 'Candidato de Hipótesis de Falla',
    matrixColInitial: 'Inicial (R0)',
    matrixColRoundPrefix: 'Ronda',
    matrixColCurrent: 'Estado Actual',
    matrixIntroducedInPrefix: 'Introducida en',
    matrixShowDetails: 'Ver justificación',
    matrixHideDetails: 'Ocultar justificación',
    matrixInitialReasoningLabel: 'Deducción Inicial',
    matrixStatusNotPresent: '—',
    matrixStatusOmitted: 'Omitida',
    matrixDeltaUp: 'Subió',
    matrixDeltaDown: 'Bajó',
    matrixCitationsCount: 'citas totales',
    timelineTitle: 'Línea de Tiempo de Evidencias y Diagnóstico',
    timelineSubtitle: 'Pista de auditoría cronológica de pruebas de banco físicas, mediciones reemplazadas y síntesis de IA.',
    timelineEventsLogged: 'Hitos',
    timelineSourceAi: 'GENERADO POR IA',
    timelineSourceTech: 'BANCO DEL TÉCNICO',
    timelineSourceSystem: 'METADATOS DEL SISTEMA',
    timelineTimestampMissing: 'Hora no registrada',
    timelineInitialTag: 'Ciclo R0 (Inicial)',
    timelineSupersededBadge: '[REEMPLAZADA]',
    timelineInconclusiveNotice: 'Resultado no concluyente: no prueba ni refuta hipótesis',
    timelineUnableNotice: 'No se pudo realizar la prueba según lo especificado',
    timelineRecordedMeasurement: 'Valor Registrado',
    timelineJumpToSuperseding: 'Ir al intento de reemplazo',
    timelineHypothesisChangesTitle: 'Cambios de Estado Evaluados',
    timelineSafetyAlert: 'Precauciones de Seguridad',
    currentAssessmentTitle: 'Síntesis del Estado de Diagnóstico Actual',
    currentAssessmentSubtitle: 'Resumen ejecutivo de plausibilidad de tres estados basado en mediciones de banco acumuladas.',
    navToMatrixBtn: 'Ver Matriz de Evolución',
    navToTimelineBtn: 'Ver Línea de Tiempo',
    assessmentEpistemicHeader: 'Barrera Epistémica',
    assessmentEpistemicNotice: 'Las hipótesis respaldadas representan plausibilidad analítica corroborada por lecturas de pruebas de banco. NUNCA son causas raíz confirmadas físicamente sin aislamiento y desoldado de componentes.',
    noSupportedHypotheses: 'Ninguna hipótesis respaldada por la evidencia actual.',
    noContradictedHypotheses: 'Ninguna hipótesis descartada por pruebas de banco todavía.',
    noUnresolvedHypotheses: 'No quedan candidatos de falla sin resolver.',
    strongestSupportingEvidenceTitle: 'Evidencia Corroborante Decisiva',
    importantContradictoryEvidenceTitle: 'Evidencia Contradictoria Decisiva',
    outstandingChecksTitle: 'Siguientes Pruebas de Verificación Prioritarias',
    criticalSafetyTitle: 'Precauciones Críticas de Seguridad Eléctrica',
    subnavOverview: 'Visión General',
    subnavMatrix: 'Matriz de Evolución',
    subnavTimeline: 'Línea de Tiempo',
    subnavReport: 'Exportar Informe',

    // Stage 6B-4B-3D: Ambiguous Hypothesis Decoupling & Localization
    ambiguousIdentityBadge: 'Identidad Ambigua',
    ambiguousIdentityTooltip: 'Múltiples candidatos comparten este título. La identidad no puede rastrearse con certeza entre rondas.',
    ambiguousMultipleCandidatesNotice: 'Múltiples candidatos comparten este título; la identidad no puede establecerse entre rondas.',
    ambiguousCannotEstablishAcrossRounds: 'No se puede establecer la identidad entre rondas de diagnóstico.',
    ambiguousNoTrendNotice: 'No se muestra tendencia de confianza debido a que la identidad entre rondas es incierta.',
    ambiguousGroupHeader: 'Candidatos Ambiguos Específicos de la Ronda',
    ambiguousGroupSubtitle: 'Estos candidatos de falla comparten títulos idénticos en la misma ronda. Se documentan de forma independiente sin inferir continuidad entre rondas.',
    ambiguousReappearanceBadge: 'Reaparecido (Identidad Incierta)',
    ambiguousReappearanceTooltip: 'El candidato reapareció tras haber sido omitido en una ronda anterior; la continuidad no puede establecerse únicamente por igualdad de título.',
    ambiguousRoundIsolatedNotice: 'Candidato aislado de la ronda; no vinculado entre rondas.',

    // Stage 6B-4B-3F: Explicit Hypothesis Identity Semantics & Export Completeness
    heuristicTitleMatchBadge: 'Seguimiento por Título',
    heuristicTitleMatchTooltip: 'Emparejado entre rondas según la igualdad de títulos. La continuidad es una heurística, no una identidad física verificada independientemente.',
    heuristicTrackingExplanation: 'Los títulos idénticos se utilizan como heurística de seguimiento entre rondas.',
    heuristicNotConfirmedNotice: 'La continuidad de la hipótesis no constituye una confirmación física de la falla.',
    matrixDeltaUpTooltip: 'Confianza incrementada',
    matrixDeltaDownTooltip: 'Confianza disminuida',
    matrixDeltaSameTooltip: 'Confianza mantenida',
    matrixOverallDeltaUpTooltip: 'Confianza general incrementada',
    matrixOverallDeltaDownTooltip: 'Confianza general disminuida',
    exportInitialOnly: 'Evaluación inicial únicamente',
    exportNoEvidenceRecorded: 'No se registraron mediciones ni verificaciones físicas de prueba para esta investigación.',
    exportInitialReasoningHeading: 'Razonamiento Deductivo Inicial y Pruebas Propuestas',
    exportTechnicianEvidenceHeading: 'Registro cronológico e inmutable de mediciones y pruebas físicas realizadas en el banco de trabajo.',
    exportDefaultSafetyNotice: 'Se aplican los procedimientos estándar de seguridad eléctrica sin energía.',
    exportDefaultLimitationsNotice: 'No se registraron limitaciones operativas explícitas.',
    viewMeasurementRecordTooltip: 'Ver registro de medición',

    // Stage 6B-5B: Compact Investigation Header & Workspace Shell
    healthPopoverTitle: 'Estado del servicio backend',
    healthPopoverClose: 'Cerrar',
    subnavAriaLabel: 'Vistas de la estación diagnóstica',
    investigationRound: 'Ronda',
    statusActiveAssessment: 'Diagnóstico activo',
    statusReassessed: 'Reevaluado',
    compactNewInvestigation: 'Nueva investigación',
    compactEditSymptoms: 'Editar síntomas',

    // Stage 6B-5C: Desktop Split Diagnostic Workbench
    inspectionRailAriaLabel: 'Estación de inspección de circuitos',
    workflowRailAriaLabel: 'Flujo de diagnóstico y resolución de problemas',
    crossReferenceHint: 'Haga clic para cotejar con la fotografía del circuito',
    crossReferenceClear: 'Haga clic para borrar el cotejo',
    initialTelemetryCardTitle: 'Telemetría operativa del diagnóstico inicial',

    // Stage 6B-5E: Mobile Bottom Action Dock
    mobileDockAriaLabel: 'Navegación y acciones móviles de investigación',
    dockNavOverview: 'Visión',
    dockNavMatrix: 'Matriz',
    dockNavTimeline: 'Línea',
    dockNavReport: 'Informe',
    dockActionLogEvidence: 'Registrar',
    dockActionReassess: 'Reevaluar',
    dockActionReassessing: 'Reevaluando...',

    // Stage 6C-2C: Local-First Investigation Workspace & Persistence
    workspaceTitle: 'Panel de Investigaciones',
    workspaceSubtitle: 'Historial diagnóstico local, registro de evidencia física de banco y casos activos.',
    newInvestigationAction: 'Nueva Investigación',
    allInvestigationsBtn: 'Todas las Investigaciones',
    searchInvestigationsPlaceholder: 'Buscar por nombre de placa, notas o síntomas...',
    filterAll: 'Todos los Casos',
    filterUnderInvestigation: 'En Investigación',
    filterAwaitingEvidence: 'Esperando Evidencia',
    filterAssessmentUpdated: 'Evaluación Actualizada',
    filterResolved: 'Resuelto',
    filterArchived: 'Archivado',
    noInvestigationsFound: 'No se encontraron investigaciones que coincidan con su búsqueda.',
    noSavedInvestigationsTitle: 'Aún no hay investigaciones guardadas',
    noSavedInvestigationsDesc: 'Inicie un nuevo caso para capturar defectos ópticos, registrar mediciones de banco y seguir los ciclos de reevaluación por IA.',
    savedLocallyNotice: 'Guardado localmente en IndexedDB del navegador',
    privacyNotice: 'Privacidad local: Todas las fotos, hipótesis y mediciones permanecen exclusivamente en este dispositivo.',
    saveStatusSaving: 'Guardando...',
    saveStatusSaved: 'Guardado localmente',
    saveStatusError: 'Error de almacenamiento',
    deleteConfirmTitle: '¿Eliminar caso permanentemente?',
    deleteConfirmMsg: 'Esta acción eliminará de forma permanente esta investigación, incluyendo mediciones, fotos y reportes de este navegador. No se puede deshacer.',
    deleteBtn: 'Eliminar Caso',
    archiveBtn: 'Archivar',
    unarchiveBtn: 'Desarchivar',
    openInvestigationBtn: 'Abrir Caso',
    renameInvestigationBtn: 'Renombrar Caso',
    lastModifiedLabel: 'Última actualización',
    evidenceCountLabel: 'elementos de evidencia',
    reassessmentsCountLabel: 'ciclos de reevaluación',
    backToDashboardBtn: 'Panel de Casos',
    markResolvedBtn: 'Marcar como Resuelto',
    reopenCaseBtn: 'Reabrir Caso',
    statusNew: 'Nuevo Caso',
    statusUnderInvestigation: 'En Investigación',
    statusAwaitingEvidence: 'Esperando Evidencia',
    statusAssessmentUpdated: 'Evaluación Actualizada',
    statusResolved: 'Resuelto',
    saveRenameBtn: 'Guardar Nombre',
    cancelBtn: 'Cancelar',

    // Stage 6C-3A: Contextual Investigation Assistant
    assistantPanelTitle: 'Asistente del Caso',
    assistantPanelSubtitle: 'Discusión contextual de IA para la investigación de circuito activa',
    assistantActiveCaseLabel: 'Caso Activo',
    assistantOfflineBadge: 'Vista Previa sin Conexión',
    assistantOfflineNotice: 'Modo de demostración determinista: Las respuestas se derivan de la evidencia del caso activo sin inferencia de modelos de terceros.',
    assistantSuggestedHeading: 'Preguntas Técnicas Sugeridas',
    assistantSuggestLeading: 'Explicar la hipótesis de fallo principal',
    assistantSuggestUnconfirmed: '¿Por qué no se ha confirmado esta hipótesis?',
    assistantSuggestLatestMeasure: 'Interpretar la última medición con cautela',
    assistantSuggestNext: '¿Qué debo investigar a continuación?',
    assistantSuggestDistinguish: '¿Qué evidencia distinguiría las hipótesis restantes?',
    assistantSuggestEvolution: 'Resumir cómo cambió la evaluación tras la última evidencia',
    assistantInputPlaceholder: 'Pregunte sobre hipótesis, lecturas de banco o aislamiento de componentes...',
    assistantSendBtn: 'Enviar',
    assistantSending: 'Analizando contexto...',
    assistantKeyboardHint: 'Presione Enter para enviar, Shift+Enter para nueva línea',
    assistantEmptyHistory: 'Aún no hay mensajes para esta investigación. Seleccione una pregunta sugerida o escriba su consulta.',
    assistantClearHistory: 'Borrar conversación',
    assistantRetryBtn: 'Reintentar',
    assistantCloseBtn: 'Cerrar asistente',
    assistantToggleBtn: 'Asistente del Caso',
    assistantMessagesCount: 'mensajes',
    assistantLiveBadge: 'IA en vivo',
    assistantLiveNotice: 'Generado por el proveedor de inferencia de modelo en vivo.',
    assistantPersistenceError: 'No se pudo guardar el mensaje en el almacenamiento local.',
    assistantRetrySaveBtn: 'Reintentar guardar',
    assistantUnsavedPill: 'No guardado',
  },
  ar: {
    brandName: 'CircuitLens',
    brandTagline: 'نظام تشخيص واستكشاف أعطال الدوائر الإلكترونية بالذكاء الاصطناعي',
    stageBadge: 'منصة تشخيص الأعطال',
    heroTag: 'ذكاء العتاد الإلكتروني',
    intakeBadge: 'استقبال التشخيص',
    stageTitle: 'منصة تشخيص الدوائر الإلكترونية بالذكاء الاصطناعي',
    stageSubtitle: 'تحليل بصري عالي الدقة لعيوب اللوحات، واستدلال متعدد الفرضيات للأعطال، وإجراءات فحص أمان مرتبة بدقة.',
    systemStatusTitle: 'تشخيص الأنظمة الفرعية',
    statusChecking: 'جارٍ فحص /api/health...',
    statusConnected: 'الخادم الخلفي متصل',
    statusError: 'الخادم غير متاح',
    retryButton: 'إعادة الاتصال',
    endpointLabel: 'وجهة الوكيل',
    serviceLabel: 'معرّف الخدمة',
    latencyLabel: 'زمن الاستجابة',
    timestampLabel: 'نبض الخادم',
    targetModelLabel: 'نموذج الذكاء الاصطناعي المستهدف',
    apiProxyStatusLabel: 'مسار وكيل Vite',
    apiProxyVerified: 'نشط (/api -> :4000)',
    nextStagesTitle: 'مسار التشخيص والقدرات الأساسية',
    nextStagesSubtitle: 'مسار تشخيص العتاد متعدد الوسائط المتكامل والنشط في هذا الإصدار:',
    stage2Title: '1. التقاط الصور وتوصيف الأعراض',
    stage2Desc: 'التقاط صور اللوحة عبر الكاميرا أو الملفات، والتحقق من التوقيع الرقمي، وتوصيف الأعراض بدقة.',
    stage3Title: '2. التشخيص بالذكاء الاصطناعي متعدد الوسائط',
    stage3Desc: 'استخراج الملاحظات البصرية، وفرضيات الأعطال الاستنتاجية، وإجراءات السلامة المرتبة تباعاً.',
    stage4Title: '3. إعادة التقييم القائمة على الأدلة',
    stage4Desc: 'سجل القياسات المخبرية، ومسارات تدقيق الاستبدال، وتعديل الفرضيات استناداً إلى نتائج الفحص.',
    themeToggle: 'المظهر',
    themeDark: 'الوضع الداكن',
    themeLight: 'الوضع الفاتح',
    languageSelect: 'اللغة',
    footerNotice: 'مطور لهاكاثون Meta Global AI للمطورين • تشخيص الهندسة الإلكترونية',

    // Stage 2
    intakeSectionTitle: 'التقاط الصورة والمخطط',
    intakeSectionSubtitle: 'اختر صورة عالية الدقة للوحة الدائرة أو المخطط وحدد معالم ونطاق العطل التشغيلي الملاحظ.',
    dropzoneTitle: 'اسحب وأفلت صورة اللوحة أو المخطط هنا',
    dropzoneSubtitle: 'يدعم صيغ JPEG أو PNG أو WebP حتى 10 ميجابايت',
    dropzoneBrowseBtn: 'استعراض الملفات',
    dropzoneCameraBtn: 'التقاط صورة',
    dropzoneDragActive: 'أفلت ملف الصورة للفحص...',
    imageRequiredError: 'صورة اللوحة أو المخطط مطلوبة لبدء فحص الدائرة.',
    invalidFileTypeError: 'صيغة الملف غير مدعومة. يرجى توفير صورة بصيغة JPEG أو PNG أو WebP.',
    fileSizeExceededError: 'حجم الصورة يتجاوز الحد الأقصى (10 ميجابايت). يرجى اختيار ملف أصغر.',
    fileMissingMimeError: 'نوع الملف غير معروف. يرجى رفع ملف صورة صالح.',
    previewAltText: 'معاينة فحص لوحة الدائرة الإلكترونية أو المخطط المرفوع',
    previewFilenameLabel: 'اسم الملف',
    previewSizeLabel: 'حجم الملف',
    replaceImageBtn: 'استبدال الصورة',
    removeImageBtn: 'إزالة الصورة',
    formSectionTitle: 'توصيف العطل والسياق التشغيلي',
    boardNameLabel: 'اسم أو معرّف اللوحة الإلكترونية',
    boardNameOptional: '(اختياري)',
    boardNamePlaceholder: 'مثال: ESP32 Motor Controller Rev 2, Power Supply V1.2',
    expectedBehaviorLabel: 'السلوك التشغيلي المتوقع',
    expectedBehaviorRequired: '(مطلوب)',
    expectedBehaviorPlaceholder: 'صف الأداء الطبيعي المفترض (مثال: خط 5V يغذي الدوائر، ومؤشر LED الأخضر يعمل بانتظام)...',
    expectedBehaviorRequiredError: 'يرجى وصف السلوك المتوقع للتشغيل.',
    observedBehaviorLabel: 'سلوك العطل الفعلي الملاحظ',
    observedBehaviorRequired: '(مطلوب)',
    observedBehaviorPlaceholder: 'صف ما يحدث في الواقع (مثال: مؤشر LED مطفأ، ومنظم الجهد U2 ساخن جداً، مع قراءة 0.2V على خط 3.3V)...',
    observedBehaviorRequiredError: 'يرجى وصف سلوك العطل الملاحظ بدقة.',
    componentsLabel: 'المكونات أو العناصر المشتبه بها',
    componentsOptional: '(اختياري)',
    componentsPlaceholder: 'مثال: U2 (AMS1117-3.3), C4 (10µF 0805), D1 (Schottky)',
    notesLabel: 'ملاحظات تشخيصية إضافية',
    notesOptional: '(اختياري)',
    notesPlaceholder: 'مثال: سقطت اللوحة قبل حدوث العطل مباشرة؛ تم قياس 0.2V عند النقطة TP1...',
    reviewInvestigationBtn: 'مراجعة تفاصيل الفحص',
    stagedConfirmationTitle: 'مراجعة إعداد الفحص',
    stagedConfirmationNotice: 'تحقق من صورة اللوحة وتفاصيل الأعراض قبل بدء الفحص بالذكاء الاصطناعي.',
    stagedReadyBadge: 'جاهز للتحليل',
    stagedBoardLabel: 'اسم اللوحة',
    stagedImageLabel: 'صورة الفحص',
    stagedExpectedLabel: 'السلوك المتوقع',
    stagedObservedLabel: 'السلوك الملاحظ',
    stagedComponentsLabel: 'العناصر المشتبه بها',
    stagedNotesLabel: 'ملاحظات إضافية',
    stagedNotSpecified: 'لم يُحدد',
    editIntakeBtn: 'تعديل بيانات الفحص',
    cameraModalTitle: 'التقاط مباشر من الكاميرا',
    cameraInitializing: 'جارٍ تهيئة بث الفيديو...',
    cameraSnapBtn: 'التقاط الصورة',
    cameraCancelBtn: 'إلغاء',
    cameraCloseBtn: 'إغلاق النافذة',
    cameraPermissionDenied: 'تم رفض إذن الوصول إلى الكاميرا. يرجى تفعيل إذن الكاميرا في إعدادات المتصفح أو اختيار ملف من جهازك.',
    cameraNotFound: 'لم يتم العثور على أي كاميرا متصلة بالنظام. يرجى توصيل كاميرا أو اختيار ملف من القرص.',
    cameraInUse: 'الكاميرا قيد الاستخدام حالياً بواسطة تطبيق آخر أو غير متاحة. يرجى إغلاق التطبيقات الأخرى وإعادة المحاولة.',
    cameraUnsupported: 'بث الفيديو من الكاميرا غير مدعوم في هذا المتصفح أو يتطلب اتصالاً آمناً (HTTPS).',
    cameraCaptureError: 'تعذر التقاط الصورة من بث الفيديو. يرجى المحاولة مرة أخرى أو اختيار ملف صورة.',
    cameraGenericError: 'تعذر تشغيل الكاميرا. يرجى رفع ملف صورة بدلاً من ذلك.',

    // Stage 3: AI Diagnostics & Results
    startDiagnosisBtn: 'بدء التشخيص بالذكاء الاصطناعي',
    diagnosingProgressTitle: 'جارٍ تحليل لوحة الدائرة الإلكترونية...',
    diagnosingProgressSubtitle: 'جارٍ إرسال صورة اللوحة وملف الأعراض لإجراء الفحص البصري والاستدلالي للأعطال.',
    diagnosingTip: 'يستغرق الاستدلال البصري والتحقق من السلامة عادة ما بين 5 إلى 20 ثانية. يُرجى عدم إغلاق هذه الصفحة.',
    cancelDiagnosisBtn: 'إلغاء التشخيص',
    retryDiagnosisBtn: 'إعادة محاولة التشخيص',
    editSymptomsBtn: 'تعديل معالم وبيانات الفحص',
    newInvestigationBtn: 'فحص دارة جديدة',
    confirmNewInvestigation: 'هل ترغب في بدء فحص جديد؟ سيتم مسح نتائج التشخيص الحالية والصورة المدخلة.',
    diagnosisErrorTitle: 'خطأ في عملية التشخيص',
    missingApiKeyErrorNotice: 'مفتاح Model API غير مهيأ في الخادم. يُرجى إضافة MODEL_API_KEY إلى ملف .env في الخادم.',
    networkErrorNotice: 'تعذر الاتصال بخدمة التشخيص الخلفية. يُرجى التأكد من تشغيل خادم Node.js على المنفذ 4000.',
    rateLimitErrorNotice: 'تم بلوغ الحد الأقصى لمعدل الطلبات في Model API. يُرجى الانتظار قليلاً ثم المحاولة مجدداً.',
    timeoutErrorNotice: 'انتهت مهلة طلب التشخيص. استغرق النموذج وقتاً طويلاً لإتمام المعالجة البصرية.',
    genericErrorNotice: 'حدث خطأ غير متوقع أثناء معالجة التشخيص. تم حفظ بيانات الأعراض والصورة المدخلة بأمان.',
    outputLimitErrorNotice: 'وصل النموذج إلى الحد الأقصى لرموز الإخراج قبل إكمال التشخيص. يرجى تقديم ملاحظات أكثر إيجازًا أو الاتصال بالدعم.',
    invalidOutputErrorNotice: 'أنتج النموذج استجابة غير قابلة للتحليل. لم تتوافق المخرجات مع بنية JSON القياسية.',
    schemaValidationErrorNotice: 'كانت مخرجات النموذج بتنسيق JSON صالح لكنها فشلت في التحقق من صحة المخطط الهيكلي. حقول التشخيص المطلوبة مفقودة أو غير صالحة.',
    modelRefusalErrorNotice: 'رفض النموذج معالجة طلب التشخيص هذا. يرجى مراجعة الصورة ووصف الأعراض للتأكد من التوافق مع إرشادات السلامة.',

    resultsSectionTitle: 'تقرير تشخيص الدائرة بالذكاء الاصطناعي',
    resultsSectionSubtitle: 'تحليل متعدد الفرضيات للأعطال الإلكترونية مدعوم بالاستدلال البصري متعدد الوسائط.',
    resultsBadge: 'التقييم الأولي (R0)',
    executiveSummaryTitle: 'ملخص التشخيص',
    visibleObservationsTitle: 'الملاحظات البصرية المباشرة',
    visibleObservationsSubtitle: 'المعالم والعيوب المادية المرئية مباشرة في الصورة، مفصولة تماماً عن استنتاجات الأعطال.',
    observationEvidenceLabel: 'الأدلة البصرية الملاحظة',
    hypothesesTitle: 'فرضيات الأعطال والآليات المستنتجة',
    hypothesesSubtitle: 'أسباب جذرية محتملة تم استنتاجها من المعالم البصرية والأعراض المبلغ عنها. هذه الفرضيات استنتاجات وليست حقائق مؤكدة.',
    hypothesisReasoningLabel: 'التبرير الفني والتحليلي',
    hypothesisEvidenceLabel: 'الأدلة الداعمة',
    hypothesisVerificationLabel: 'خطوة القياس / التحقق المقترحة',
    confidenceLabel: 'مستوى الثقة',
    confidenceHigh: 'ثقة عالية',
    confidenceMedium: 'ثقة متوسطة',
    confidenceLow: 'ثقة منخفضة',
    recommendedChecksTitle: 'تسلسل خطوات الفحص الآمنة ذات الأولوية',
    recommendedChecksSubtitle: 'إجراءات فحص مرتبة تبدأ باختبارات غير مكهربة (مقاومة باردة، فحص بالمكبر) قبل أي قياس تحت الجهد.',
    checkStepLabel: 'الخطوة',
    checkTestTypeLabel: 'نوع الاختبار',
    checkToolsLabel: 'الأدوات والأجهزة المطلوبة',
    checkProcedureLabel: 'إجراءات الفحص خطوة بخطوة',
    checkExpectedResultLabel: 'القراءة المتوقعة في اللوحة السليمة',
    checkSafetyNotesLabel: 'احتياطات أمان الخطوة',
    safetyWarningsTitle: 'تحذيرات السلامة الكهربائية الحاسمة',
    safetyWarningsNotice: 'راجع هذه الإجراءات الوقائية الإلزامية بعناية قبل وضع أي مجس قياس أو توصيل الطاقة بهذه اللوحة.',
    limitationsTitle: 'محددات الفحص ونقاط عدم اليقين',
    limitationsSubtitle: 'عوامل مثل زاوية التصوير أو المسارات غير المرئية أو غياب المخطط الدقيق التي تحد من الدقة التشخيصية.',
    disclaimerNotice: 'تطبيق CircuitLens هو أداة مساعدة إرشادية لاستكشاف الأعطال. يجب التحقق من كافة الفرضيات بأمان باستخدام أجهزة القياس قبل استبدال أي عنصر.',

    // Stage 4B: Evidence Capture & Troubleshooting
    troubleshootingSectionTitle: 'تنفيذ فحوصات التشخيص التفاعلية',
    troubleshootingSectionSubtitle: 'حدد فحصاً موصى به أدناه لمراجعة احتياطات السلامة وتنفيذ الخطوات وتسجيل نتائج القياس الفعلية.',
    openCheckBtn: 'تنفيذ الفحص',
    closeCheckBtn: 'إغلاق تفاصيل الفحص',
    selectedCheckHeading: 'إجراء الفحص التشخيصي المحدد',
    noProcedureDetails: 'لم تتضمن مخرجات التشخيص خطوات تفصيلية لهذا الفحص. يرجى اتباع احتياطات الفحص المعيارية على طاولة العمل.',
    recordEvidenceTitle: 'تسجيل نتيجة الفحص',
    recordEvidenceSubtitle: 'سجل النتيجة العملية الملاحظة أثناء إجراء هذا الفحص الفيزيائي. إدخال قيم القياس اختياري.',
    outcomeLabel: 'نتيجة الفحص',
    outcomePassedLabel: 'سليم (مطابق للقيم الاسمية)',
    outcomePassedDesc: 'القراءة أو السلوك المقاس يطابق تماماً القيم المتوقعة للدائرة السليمة.',
    outcomeFailedLabel: 'معيب (فشل / وجود خلل)',
    outcomeFailedDesc: 'القراءة أو السلوك المقاس يشير إلى وجود عطل كهربائي أو انحراف عن القيمة الاسمية.',
    outcomeInconclusiveLabel: 'غير حاسم',
    outcomeInconclusiveDesc: 'القراءة مبهمة أو متذبذبة ولا يمكن الجزم بصحة أو عطل الدائرة من خلالها.',
    outcomeUnableLabel: 'تعذر التنفيذ',
    outcomeUnableDesc: 'عدم توفر الأدوات المطلوبة، أو وجود ظروف غير آمنة، أو صعوبة الوصول إلى نقطة الفحص.',
    measurementSectionTitle: 'القيم المقاسة (اختياري)',
    numericValueLabel: 'القيمة العددية',
    numericValuePlaceholder: 'مثال: 3.3، 0.05، 4700',
    measurementUnitLabel: 'وحدة القياس',
    measurementUnitPlaceholder: 'مثال: V, mV, Ω, kΩ, mA',
    technicianNotesLabel: 'ملاحظات الفني',
    technicianNotesPlaceholder: 'صف نقاط المجسات، سلوك الملتيميتر، أو الملاحظات الحرارية والفيزيائية (بحد أقصى 500 حرف)...',
    saveEvidenceBtn: 'حفظ في سجل الأدلة',
    evidenceLogTitle: 'سجل أدلة ونتائج التحقيق',
    evidenceLogSubtitle: 'تسلسل زمني موثق لجميع الفحوصات التشخيصية المنفذة والقياسات المسجلة.',
    noEvidenceLogged: 'لم يتم تسجيل أي فحوصات حتى الآن. حدد أحد الفحوصات الموصى بها أعلاه لتسجيل الأدلة.',
    evidenceAttemptLabel: 'المحاولة',
    supersedesLabel: 'يحل محل محاولة سابقة',
    supersedeOptionLabel: 'استبدال المحاولة السابقة لهذا الفحص',
    supersedeOptionDesc: 'حدد هذا الخيار إذا كان هذا التسجيل يصحح أو يحدّث قراءتك السابقة. سيتم الاحتفاظ بالمحاولة السابقة في السجل التاريخي.',
    validationErrorIncompletePair: 'يجب إدخال القيمة العددية ووحدة القياس معاً، أو تركهما معاً.',
    validationErrorNumericRange: 'يجب أن تكون القيمة العددية رقماً منتهياً صالحاً بين -1,000,000,000 و 1,000,000,000.',
    validationErrorUnitLength: 'يجب أن يتراوح طول وحدة القياس بين حرف واحد و 20 حرفاً.',
    validationErrorNotesLength: 'يجب ألا تتجاوز ملاحظات الفني 500 حرف.',
    validationErrorOutcomeRequired: 'يرجى اختيار نتيجة الفحص.',
    evidenceRecordedNotice: 'تم حفظ الدليل بنجاح.',
    nonMandatoryNotice: 'الفحوصات المقترحة هي توصيات إرشادية فقط. أنت من يتحكم بالكامل في التنفيذ. لا تقدم أبداً على اختبار خطير تحت الجهد العالي.',
    unverifiedDisclaimer: 'فرضيات الذكاء الاصطناعي هي استنتاجات تحليلية وليست أعطالاً مؤكدة قطيعاً. نفّذ كافة الفحوصات بأمان باستخدام أجهزة قياس معزولة.',
    checkStatusUntested: 'لم يُختبر',
    checkStatusTested: 'تم اختباره',
    totalAttemptsLabel: 'محاولات مسجلة',
    activeCheckBadge: 'الفحص النشط',

    // Stage 4B-4: Reassessment Controls & Results
    reassessButton: 'طلب إعادة التقييم التشخيصي',
    reassessingProgressTitle: 'جارٍ إعادة تقييم الفرضيات التشخيصية...',
    reassessingProgressSubtitle: 'تحليل الأدلة المخبرية وتحديث احتمالات الأعطال بالذكاء الاصطناعي.',
    reassessmentReadyNotice: 'أدلة الفحص المخبري المسجلة جاهزة لإعادة التقييم التشخيصي.',
    noEvidenceForReassessmentNotice: 'سجّل نتيجة فحص واحدة على الأقل لطلب إعادة التقييم بالذكاء الاصطناعي.',
    evidenceLimitExceededNotice: 'تقبل نقطة نهاية إعادة التقييم الحالية ما يصل إلى 20 سجلاً من الأدلة. يحتوي فحصك حالياً على {count} سجلاً. تم إيقاف إعادة التقييم مؤقتاً للحفاظ على السجل كاملاً دون اقتطاع.',
    reassessErrorTitle: 'فشلت إعادة التقييم',
    cancelReassessmentBtn: 'إلغاء إعادة التقييم',
    retryReassessmentBtn: 'إعادة محاولة التقييم',
    reassessmentNotesLabel: 'ملاحظات إضافية لإعادة التقييم (اختياري)',
    reassessmentNotesPlaceholder: 'صف أي تغييرات في الدائرة، أو ظروف الاختبار، أو الحالات الشاذة البيئية (بحد أقصى 1000 حرف)...',
    reassessmentSectionTitle: 'نتائج إعادة التقييم القائمة على الأدلة',
    reassessmentSectionSubtitle: 'استنتاجات تشخيصية محدثة تم تقييمها بناءً على قياسات الفحص المخبري الفعلية.',
    evidenceSynthesisTitle: 'تركيب الأدلة والأساس المنطقي التشخيصي',
    revisedHypothesesTitle: 'فرضيات الأعطال المراجعة',
    revisedHypothesesSubtitle: 'فرضيات الأعطال الاحتمالية المحدثة وفقاً لنتائج الفحص المسجلة.',
    hypothesisStatusLabel: 'حالة التقييم',
    statusSupported: 'مدعومة',
    statusWeakened: 'مستبعدة جزئياً',
    statusUnresolved: 'غير محسومة',
    statusContradicted: 'متناقضة',
    hypothesisChangeExplanationLabel: 'تفسير التغيير',
    citingEvidenceLabel: 'أدلة الاستدلال المباشرة',
    evidenceCitationRecordNotFound: 'معرف الدليل المشار إليه غير موجود في السجل الحالي',
    evidenceCitationOutcomeLabel: 'النتيجة',
    evidenceCitationValueLabel: 'القيمة',
    nextRecommendedChecksTitle: 'فحوصات المتابعة الموصى بها',
    nextRecommendedChecksSubtitle: 'خطوات التحقق ذات الأولوية التي تم إنشاؤها لحسم شكوك الأعطال المتبقية.',
    noNewVisualInspectionNotice: 'تنبيه مهم: تعتمد إعادة التقييم على نتائج الفحص المخبري مع الملاحظات البصرية الأولية. لم تتم إعادة فحص صورة الدائرة.',
    reassessmentCycleBadge: 'جولة إعادة التقييم',
    initialChecksCycleBadge: 'التسلسل الأولي (الجولة 0)',
    allChecksCompletedNotice: 'تم تسجيل جميع الفحوصات الموصى بها لهذه الجولة.',
    initialDiagnosisBadge: 'التشخيص الأولي (قبل الفحص)',
    latestReassessmentBadge: 'أحدث إعادة تقييم مستندة إلى الأدلة',
    historicalReassessmentBadge: 'جولة إعادة تقييم سابقة',
    hypothesesRevisedNotice: 'تم تحديث هذه الفرضيات الأولية بأدلة الفحص المسجلة في جولة إعادة التقييم رقم #{round}.',
    viewLatestReassessmentBtn: 'عرض أحدث إعادة تقييم',
    latestStatusLabel: 'أحدث حالة تم تقييمها',
    jumpToHypothesisRevision: 'الانتقال إلى التقييم المراجع في أحدث جولة',
    hardwareAccessDisclaimer: 'لا يمتلك CircuitLens وصولاً مباشراً إلى العتاد المادي. تستند الاختبارات المادية والقياسات وتغييرات المكونات الموضحة هنا إلى المعلومات المسجلة بواسطة الفني.',
    evidenceCitationSuperseded: 'تم استبداله',
    evidenceCitationSupersededHint: 'تم استبدال هذا القياس أو الفحص بسجل اختبار لاحق.',

    // Stage 6B-3: Operational Telemetry & Cost Transparency
    telemetrySectionTitle: 'القياسات التشغيلية والاستخدام',
    telemetrySectionSubtitle: 'زمن استجابة الاستدلال، ونموذج المزود، ومعالجة الرموز، ومقاييس التكلفة المقدرة.',
    telemetryDiagnosisTitle: 'قياسات التشخيص',
    telemetryReassessmentTitle: 'قياسات إعادة التقييم',
    telemetryProviderLabel: 'مزود الذكاء الاصطناعي',
    telemetryModelLabel: 'النموذج',
    telemetryDurationLabel: 'زمن الاستجابة',
    telemetryInputTokensLabel: 'رموز الإدخال',
    telemetryOutputTokensLabel: 'رموز الإخراج',
    telemetryTotalTokensLabel: 'إجمالي الرموز',
    telemetryEstimatedCostLabel: 'التكلفة المقدرة',
    telemetryPartialCostLabel: 'المجموع الجزئي للتكلفة',
    telemetryPartialCostBadge: 'جزئي: {cost}',
    telemetryPartialCostDisclaimer: 'بيانات استخدام غير مكتملة مبلّغة من المزود. التكلفة المعروضة هي مجموع جزئي وليست التكلفة الإجمالية للطلب.',
    telemetryCostDisclaimer: 'تقدير مستند إلى أسعار الرموز المعلنة للمزود. قد تختلف الفاتورة الفعلية.',
    telemetryUnavailable: 'غير متوفر',
    telemetryDetailsSummary: 'القياسات التشغيلية',
    telemetryStatusReported: 'مبلّغ من المزود',
    telemetryStatusPartial: 'استخدام جزئي مبلّغ',
    telemetryStatusUnavailable: 'بيانات الاستخدام غير متوفرة',

    // Stage 6B-4B-1: Interactive Circuit Image Inspection
    inspectorTitle: 'الفحص البصري للوحة الدائرة',
    inspectorSubtitle: 'افحص مسارات اللوحة والطباعة ونقاط اللحام جنباً إلى جنب مع ملاحظات الذكاء الاصطناعي.',
    inspectorZoomIn: 'تكبير (+)',
    inspectorZoomOut: 'تصغير (-)',
    inspectorFit: 'ملاءمة للشاشة',
    inspectorReset100: 'المقياس الأصلي 100%',
    inspectorFullscreen: 'فحص ملء الشاشة',
    inspectorExitFullscreen: 'خروج من ملء الشاشة',
    inspectorZoomLevel: 'مستوى التكبير',
    inspectorPanHint: 'اسحب للتنقل عبر لوحة الدائرة',
    inspectorSelectedObservation: 'الملاحظة البصرية المحددة',
    inspectorClearObservation: 'إلغاء التحديد',
    inspectorToggleDrawer: 'فحص صورة الدائرة',
    inspectorCloseDrawer: 'إغلاق الفاحص',
    inspectorOriginalImageBadge: 'الدقة الأصلية',

    // Stage 6B-4B-2: Professional Diagnostic Report Export
    exportSectionTitle: 'تقرير التشخيص والتصدير',
    exportSectionSubtitle: 'تصدير تقارير فحص مخبرية شاملة لسجلات الفنيين أو التذاكر أو تسليم العملاء.',
    exportPrintPdfBtn: 'طباعة / حفظ كـ PDF',
    exportJsonBtn: 'تنزيل JSON',
    exportMarkdownBtn: 'تنزيل Markdown (.md)',
    exportReportBadge: 'التقرير جاهز',
    exportEpistemicNotice: 'توثق تقارير التشخيص الاستنتاج البصري للذكاء الاصطناعي عن بعد وقياسات الفني في المختبر. الأعطال المشتبه بها هي فرضيات تحليلية وليست أسباباً جذرية مؤكدة مادياً دون عزل للمكونات.',
    exportReportHeaderTitle: 'تقرير تشخيص CircuitLens',
    exportInvestigationIdLabel: 'معرف التحقيق',
    exportGeneratedAtLabel: 'تاريخ الإنشاء',
    exportDeviceSectionTitle: 'معلومات الدائرة والإدخال',
    exportObservationsSectionTitle: 'الملاحظات البصرية المباشرة',
    exportHypothesesSectionTitle: 'فرضيات الأعطال وتطورها',
    exportEvidenceSectionTitle: 'سجل أدلة وقياسات الفني',
    exportReassessmentsSectionTitle: 'نتائج وتوليف إعادة التقييم',
    exportChecksSectionTitle: 'فحوصات استكشاف الأعطال الموصى بها',
    exportSafetySectionTitle: 'احتياطات السلامة الكهربائية',
    exportLimitationsSectionTitle: 'القيود والشكوك التشخيصية',
    exportTelemetrySectionTitle: 'القياسات التشغيلية والرموز',
    exportOriginAi: 'تحليل مولّد بالذكاء الاصطناعي',
    exportOriginTech: 'سجل قياسات الفني الميدانية',
    exportOriginSystem: 'بيانات النظام الوصفية',

    // Stage 6B-4B-3: Hypothesis Evolution & Evidence Timeline
    evolutionMatrixTitle: 'مصفوفة تطور الفرضيات',
    evolutionMatrixSubtitle: 'تتبع مقارن لمرشحي الأعطال عبر التشخيص الأولي وجميع جولات إعادة التقييم.',
    evolutionEpistemicNotice: 'توثق تقييمات الفرضيات التاريخية استنتاجات الذكاء الاصطناعي البصرية بناءً على قياسات الفحص المتراكمة. الفرضيات المدعومة هي استنتاجات تحليلية وليست أسباباً جذرية مؤكدة مادياً دون عزل للمكونات.',
    matrixCycleInitialOnly: 'التقييم الأولي (R0)',
    matrixCyclesLogged: 'جولات',
    matrixColHypothesis: 'فرضية العطل المرشحة',
    matrixColInitial: 'الأولي (R0)',
    matrixColRoundPrefix: 'الجولة',
    matrixColCurrent: 'الحالة الحالية',
    matrixIntroducedInPrefix: 'أُدرجت في',
    matrixShowDetails: 'عرض التعليل',
    matrixHideDetails: 'إخفاء التعليل',
    matrixInitialReasoningLabel: 'الاستدلال الأولي',
    matrixStatusNotPresent: '—',
    matrixStatusOmitted: 'تم تجاوزها',
    matrixDeltaUp: 'ارتفعت الثقة',
    matrixDeltaDown: 'انخفضت الثقة',
    matrixCitationsCount: 'إجمالي الاستشهادات',
    timelineTitle: 'الجدول الزمني للأدلة والتشخيص',
    timelineSubtitle: 'مسار تدقيق زمني لفحوصات المختبر المادية، والقياسات المستبدلة، وتوليفات الذكاء الاصطناعي.',
    timelineEventsLogged: 'محطات رئيسية',
    timelineSourceAi: 'مولّد بالذكاء الاصطناعي',
    timelineSourceTech: 'فحص فني ميداني',
    timelineSourceSystem: 'بيانات النظام الوصفية',
    timelineTimestampMissing: 'الوقت غير مسجل',
    timelineInitialTag: 'الدورة R0 (الأولية)',
    timelineSupersededBadge: '[مستبدلة]',
    timelineInconclusiveNotice: 'نتيجة غير حاسمة — لا تثبت ولا تنفي الفرضيات',
    timelineUnableNotice: 'تعذر إجراء الفحص كما هو محدد',
    timelineRecordedMeasurement: 'القيمة المسجلة',
    timelineJumpToSuperseding: 'الانتقال إلى محاولة القياس البديلة',
    timelineHypothesisChangesTitle: 'تغيرات حالات الفرضيات المقيمة',
    timelineSafetyAlert: 'احتياطات السلامة',
    currentAssessmentTitle: 'توليف حالة التشخيص الحالية',
    currentAssessmentSubtitle: 'ملخص تنفيذي ثلاثي الحالات لرجحان الفرضيات بناءً على قياسات الفحص المتراكمة.',
    navToMatrixBtn: 'عرض مصفوفة التطور',
    navToTimelineBtn: 'عرض الجدول الزمني للأدلة',
    assessmentEpistemicHeader: 'حاجز معرفي',
    assessmentEpistemicNotice: 'تمثل الفرضيات المدعومة احتمالية تحليلية مدعومة بقراءات الاختبارات الميدانية. وهي ليست بأي حال من الأحوال أسباباً جذرية مؤكدة مادياً دون عزل وفك لحام المكونات.',
    noSupportedHypotheses: 'لا توجد فرضيات مدعومة بالأدلة الحالية.',
    noContradictedHypotheses: 'لم يتم استبعاد أي فرضية بالفحوصات حتى الآن.',
    noUnresolvedHypotheses: 'لا توجد فرضيات أعطال متبقية دون حسم.',
    strongestSupportingEvidenceTitle: 'أدلة داعمة حاسمة',
    importantContradictoryEvidenceTitle: 'أدلة نافية حاسمة',
    outstandingChecksTitle: 'الفحوصات ذات الأولوية التالية للتحقق',
    criticalSafetyTitle: 'احتياطات السلامة الكهربائية الأساسية',
    subnavOverview: 'نظرة عامة',
    subnavMatrix: 'مصفوفة تطور الفرضيات',
    subnavTimeline: 'الجدول الزمني للأدلة',
    subnavReport: 'تصدير التقرير',

    // Stage 6B-4B-3D: Ambiguous Hypothesis Decoupling & Localization
    ambiguousIdentityBadge: 'هوية ملتبسة',
    ambiguousIdentityTooltip: 'تشترك عدة فرضيات في هذا العنوان. لا يمكن تتبع الهوية بشكل قاطع عبر الجولات.',
    ambiguousMultipleCandidatesNotice: 'تشترك عدة فرضيات في هذا العنوان عبر الجولات؛ لا يمكن إثبات الهوية المشتركة.',
    ambiguousCannotEstablishAcrossRounds: 'لا يمكن إثبات هوية الفرضية عبر جولات التشخيص.',
    ambiguousNoTrendNotice: 'لا يظهر اتجاه للثقة نظراً لعدم التأكد من هوية الفرضية عبر الجولات.',
    ambiguousGroupHeader: 'فرضيات ملتبسة خاصة بالجولة',
    ambiguousGroupSubtitle: 'تشترك هذه الفرضيات المرشحة في عناوين متطابقة داخل نفس الجولة. تم توثيقها بشكل مستقل دون استنتاج استمرارية مضللة عبر الجولات.',
    ambiguousReappearanceBadge: 'معاودة الظهور (هوية غير مؤكدة)',
    ambiguousReappearanceTooltip: 'عادت الفرضية للظهور بعد أن تم تجاوزها في جولة سابقة؛ لا يمكن إثبات الاستمرارية عبر الجولات بمجرد تطابق العنوان.',
    ambiguousRoundIsolatedNotice: 'فرضية مقصورة على الجولة؛ غير مرتبطة عبر الجولات.',

    // Stage 6B-4B-3F: Explicit Hypothesis Identity Semantics & Export Completeness
    heuristicTitleMatchBadge: 'تتبع مستند إلى العنوان',
    heuristicTitleMatchTooltip: 'تمت المطابقة عبر الجولات استناداً إلى تطابق العنوان. الاستمرارية هي استدلال تقريبي وليست هوية مادية مؤكدة بشكل مستقل.',
    heuristicTrackingExplanation: 'تُستخدم العناوين المتطابقة كاستدلال تتبعي عبر الجولات التشخيصية.',
    heuristicNotConfirmedNotice: 'استمرارية الفرضية لا تشكل تأكيداً مادياً للخلل.',
    matrixDeltaUpTooltip: 'ازدادت الثقة',
    matrixDeltaDownTooltip: 'انخفضت الثقة',
    matrixDeltaSameTooltip: 'بقيت الثقة دون تغيير',
    matrixOverallDeltaUpTooltip: 'ازدادت الثقة العامة',
    matrixOverallDeltaDownTooltip: 'انخفضت الثقة العامة',
    exportInitialOnly: 'التقييم الأولي فقط',
    exportNoEvidenceRecorded: 'لم يتم تسجيل أي قياسات أو اختبارات فحص مادية لهذه العملية التشخيصية.',
    exportInitialReasoningHeading: 'الاستدلال الاستنتاجي الأولي والفحوصات المقترحة',
    exportTechnicianEvidenceHeading: 'سجل زمني ثابت وغير قابل للتعديل للقياسات والاختبارات المادية التي أُجريت على طاولة العمل.',
    exportDefaultSafetyNotice: 'تُطبق إجراءات السلامة الكهربائية القياسية في وضع فصل الطاقة.',
    exportDefaultLimitationsNotice: 'لم يتم تسجيل أي قيود تشغيلية صريحة.',
    viewMeasurementRecordTooltip: 'عرض سجل القياس',

    // Stage 6B-5B: Compact Investigation Header & Workspace Shell
    healthPopoverTitle: 'حالة خدمة الواجهة الخلفية',
    healthPopoverClose: 'إغلاق',
    subnavAriaLabel: 'طرق عرض محطة التشخيص',
    investigationRound: 'الجولة',
    statusActiveAssessment: 'تشخيص نشط',
    statusReassessed: 'تمت إعادة التقييم',
    compactNewInvestigation: 'تحقيق جديد',
    compactEditSymptoms: 'تعديل الأعراض',

    // Stage 6B-5C: Desktop Split Diagnostic Workbench
    inspectionRailAriaLabel: 'محطة فحص الدائرة',
    workflowRailAriaLabel: 'سير عمل الاستدلال التشخيصي واستكشاف الأعطال',
    crossReferenceHint: 'انقر للمطابقة المرجعية مع صورة الدائرة',
    crossReferenceClear: 'انقر لإلغاء المطابقة المرجعية',
    initialTelemetryCardTitle: 'القياسات التشغيلية للتشخيص الأولي',

    // Stage 6B-5E: Mobile Bottom Action Dock
    mobileDockAriaLabel: 'التنقل والإجراءات السريعة للتحقيق على الجوال',
    dockNavOverview: 'نظرة عامة',
    dockNavMatrix: 'المصفوفة',
    dockNavTimeline: 'الجدول',
    dockNavReport: 'التقرير',
    dockActionLogEvidence: 'تسجيل دليل',
    dockActionReassess: 'إعادة التقييم',
    dockActionReassessing: 'جارٍ التقييم...',

    // Stage 6C-2C: Local-First Investigation Workspace & Persistence
    workspaceTitle: 'مساحة عمل التحقيقات',
    workspaceSubtitle: 'سجل التشخيص المحلي، وتاريخ أدلة الفحص المخبري، وحالات الدوائر النشطة.',
    newInvestigationAction: 'فحص جديد',
    allInvestigationsBtn: 'كافة الفحوصات',
    searchInvestigationsPlaceholder: 'البحث عن الحالات باسم اللوحة أو الملاحظات أو الأعراض...',
    filterAll: 'كافة الحالات',
    filterUnderInvestigation: 'قيد التحقيق',
    filterAwaitingEvidence: 'في انتظار الأدلة',
    filterAssessmentUpdated: 'تم تحديث التقييم',
    filterResolved: 'تم الحل',
    filterArchived: 'المؤرشفة',
    noInvestigationsFound: 'لم يتم العثور على أي فحوصات تطابق بحثك.',
    noSavedInvestigationsTitle: 'لا توجد فحوصات محفوظة بعد',
    noSavedInvestigationsDesc: 'ابدأ فحصاً جديداً لتحديد العيوب البصرية، وتسجيل قياسات أجهزة الفحص، وتتبع دورات إعادة التقييم بالذكاء الاصطناعي.',
    savedLocallyNotice: 'محفوظ محلياً في IndexedDB داخل المتصفح',
    privacyNotice: 'الخصوصية المحلية أولاً: جميع صور اللوحات وفرضيات التشخيص وقياسات الفحص تظل آمنة على هذا الجهاز فقط.',
    saveStatusSaving: 'جارٍ الحفظ...',
    saveStatusSaved: 'محفوظ محلياً',
    saveStatusError: 'خطأ في التخزين',
    deleteConfirmTitle: 'هل تريد حذف الفحص نهائياً؟',
    deleteConfirmMsg: 'سيؤدي هذا الإجراء إلى حذف هذا الفحص التشخيصي نهائياً بما في ذلك كافة القياسات والصور وتاريخ التقارير من هذا المتصفح. لا يمكن التراجع عن هذا.',
    deleteBtn: 'حذف الفحص',
    archiveBtn: 'أرشفة',
    unarchiveBtn: 'إلغاء الأرشفة',
    openInvestigationBtn: 'فتح الفحص',
    renameInvestigationBtn: 'إعادة تسمية الفحص',
    lastModifiedLabel: 'آخر تحديث',
    evidenceCountLabel: 'عناصر الأدلة',
    reassessmentsCountLabel: 'دورات إعادة التقييم',
    backToDashboardBtn: 'لوحة التحكم',
    markResolvedBtn: 'تحديد كمحلول',
    reopenCaseBtn: 'إعادة فتح الفحص',
    statusNew: 'حالة جديدة',
    statusUnderInvestigation: 'قيد التحقيق',
    statusAwaitingEvidence: 'في انتظار الأدلة',
    statusAssessmentUpdated: 'تم تحديث التقييم',
    statusResolved: 'تم الحل',
    saveRenameBtn: 'حفظ الاسم',
    cancelBtn: 'إلغاء',

    // Stage 6C-3A: Contextual Investigation Assistant
    assistantPanelTitle: 'مساعد التحقيق',
    assistantPanelSubtitle: 'حوار تشخيصي سياقي بالذكاء الاصطناعي لفحص الدائرة النشط',
    assistantActiveCaseLabel: 'الحالة النشطة',
    assistantOfflineBadge: 'معاينة دون اتصال',
    assistantOfflineNotice: 'وضع العرض التوضيحي الحتمي: تُستمد الاستجابات من أدلة الحالة النشطة دون استدلال نماذج خارجية.',
    assistantSuggestedHeading: 'الأسئلة الفنية المقترحة',
    assistantSuggestLeading: 'اشرح فرضية العطل الرئيسية',
    assistantSuggestUnconfirmed: 'لماذا لم يتم تأكيد هذه الفرضية بعد؟',
    assistantSuggestLatestMeasure: 'تفسير القياس الأخير بحذر هندسي',
    assistantSuggestNext: 'ما الذي يجب فحصه في الخطوة التالية؟',
    assistantSuggestDistinguish: 'ما الدليل الذي يميز بين الفرضيات المتبقية؟',
    assistantSuggestEvolution: 'لخّص كيف تغير التقييم بعد الأدلة الأخيرة',
    assistantInputPlaceholder: 'اسأل عن الفرضيات، أو قراءات أجهزة القياس، أو عزل المكونات...',
    assistantSendBtn: 'إرسال',
    assistantSending: 'جارٍ تحليل السياق...',
    assistantKeyboardHint: 'اضغط Enter للإرسال، وShift+Enter لسطر جديد',
    assistantEmptyHistory: 'لا توجد رسائل لهذا الفحص بعد. اختر سؤالاً مقترحاً أعلاه أو اكتب استفسارك أدناه.',
    assistantClearHistory: 'مسح المحادثة',
    assistantRetryBtn: 'إعادة المحاولة',
    assistantCloseBtn: 'إغلاق المساعد',
    assistantToggleBtn: 'مساعد التحقيق',
    assistantMessagesCount: 'رسائل',
    assistantLiveBadge: 'ذكاء اصطناعي مباشر',
    assistantLiveNotice: 'تم إنشاؤه بواسطة مزود استدلال النماذج المباشر.',
    assistantPersistenceError: 'تعذر حفظ الرسالة في التخزين المحلي.',
    assistantRetrySaveBtn: 'إعادة محاولة الحفظ',
    assistantUnsavedPill: 'غير محفوظ',
  },
};

export const isRtl = (lang: SupportedLanguage): boolean => lang === 'ar';

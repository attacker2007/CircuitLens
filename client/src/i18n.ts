export type SupportedLanguage = 'en' | 'es' | 'ar';

export interface Translations {
  brandName: string;
  brandTagline: string;
  stageBadge: string;
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
}

export const translations: Record<SupportedLanguage, Translations> = {
  en: {
    brandName: 'CircuitLens',
    brandTagline: 'AI-Assisted Electronics Troubleshooting System',
    stageBadge: 'Stage 4 • Evidence-Driven Diagnostics',
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
    targetModelLabel: 'Meta AI Model Target',
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
    reviewInvestigationBtn: 'Review & Stage Investigation',
    stagedConfirmationTitle: 'Intake Profile Staged in Memory',
    stagedConfirmationNotice: 'Circuit image, symptom descriptions, and suspect landmarks are staged locally in browser memory.',
    stagedReadyBadge: 'Ready for AI Diagnosis',
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
    diagnosingProgressSubtitle: 'Transmitting PCB photograph and symptom profile to Meta Model API for multimodal defect and failure path analysis.',
    diagnosingTip: 'Visual reasoning and safety verification typically take 5 to 20 seconds. Please do not close this window.',
    cancelDiagnosisBtn: 'Cancel Diagnosis',
    retryDiagnosisBtn: 'Retry Diagnosis',
    editSymptomsBtn: 'Edit Intake Parameters',
    newInvestigationBtn: 'New Circuit Investigation',
    confirmNewInvestigation: 'Start a new circuit investigation? Current diagnosis results and staged images will be cleared.',
    diagnosisErrorTitle: 'Diagnostic Analysis Error',
    missingApiKeyErrorNotice: 'Meta Model API key is not configured on the server. Please add your MODEL_API_KEY to the server .env configuration.',
    networkErrorNotice: 'Unable to reach the backend diagnostic service. Please verify that the backend server is running on port 4000.',
    rateLimitErrorNotice: 'Meta Model API rate limit reached. Please wait a moment before trying again.',
    timeoutErrorNotice: 'Diagnostic request timed out after 50 seconds. The model or network took too long to complete visual inference.',
    genericErrorNotice: 'An unexpected error occurred during diagnostic processing. Your entered symptoms and image have been preserved.',

    resultsSectionTitle: 'AI Circuit Diagnostic Report',
    resultsSectionSubtitle: 'Multi-hypothesis electronic failure analysis powered by Meta multimodal reasoning.',
    resultsBadge: 'Stage 3 Diagnosis',
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
    reassessingProgressSubtitle: 'Synthesizing bench evidence and refining fault probabilities with Meta AI.',
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
  },
  es: {
    brandName: 'CircuitLens',
    brandTagline: 'Sistema de Diagnóstico de Circuitos Asistido por IA',
    stageBadge: 'Etapa 4 • Diagnóstico Basado en Evidencia',
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
    targetModelLabel: 'Modelo Meta IA Objetivo',
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
    reviewInvestigationBtn: 'Revisar y Preparar Entrada',
    stagedConfirmationTitle: 'Perfil de Entrada Preparado en Memoria',
    stagedConfirmationNotice: 'La imagen del circuito, los síntomas y los componentes sospechosos están preparados localmente en memoria.',
    stagedReadyBadge: 'Listo para Diagnóstico IA',
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
    diagnosingProgressSubtitle: 'Transmitiendo la fotografía y el perfil de síntomas al modelo Meta IA para análisis multimodal de defectos y fallas.',
    diagnosingTip: 'El razonamiento visual y la verificación de seguridad suelen tardar entre 5 y 20 segundos. No cierre esta ventana.',
    cancelDiagnosisBtn: 'Cancelar Diagnóstico',
    retryDiagnosisBtn: 'Reintentar Diagnóstico',
    editSymptomsBtn: 'Modificar Parámetros de Entrada',
    newInvestigationBtn: 'Nueva Investigación de Circuito',
    confirmNewInvestigation: '¿Desea iniciar una nueva investigación? Los resultados diagnósticos y la imagen actual se borrarán.',
    diagnosisErrorTitle: 'Error en el Análisis Diagnóstico',
    missingApiKeyErrorNotice: 'La clave de Meta Model API no está configurada en el servidor. Agregue MODEL_API_KEY al archivo .env del servidor.',
    networkErrorNotice: 'No se pudo conectar con el servicio backend de diagnóstico. Verifique que el servidor esté activo en el puerto 4000.',
    rateLimitErrorNotice: 'Límite de peticiones de Meta Model API alcanzado. Espere unos momentos antes de reintentar.',
    timeoutErrorNotice: 'La solicitud de diagnóstico excedió el tiempo límite (50 s). El modelo tardó demasiado en completar la inferencia visual.',
    genericErrorNotice: 'Ocurrió un error inesperado durante el diagnóstico. Sus síntomas ingresados y la imagen se han preservado.',

    resultsSectionTitle: 'Informe Diagnóstico de Circuitos con IA',
    resultsSectionSubtitle: 'Análisis de fallas electrónicas con múltiples hipótesis impulsado por razonamiento multimodal de Meta.',
    resultsBadge: 'Diagnóstico Etapa 3',
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
    reassessingProgressSubtitle: 'Sintetizando evidencia física y refinando probabilidades de falla con Meta AI.',
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
  },
  ar: {
    brandName: 'CircuitLens',
    brandTagline: 'نظام تشخيص واستكشاف أعطال الدوائر الإلكترونية بالذكاء الاصطناعي',
    stageBadge: 'المرحلة 4 • تشخيص قائم على الأدلة',
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
    targetModelLabel: 'نموذج Meta AI المستهدف',
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
    reviewInvestigationBtn: 'مراجعة وتجهيز بيانات الفحص',
    stagedConfirmationTitle: 'تم تجهيز بيانات الفحص في الذاكرة',
    stagedConfirmationNotice: 'صورة الدائرة وتوصيف الأعراض والمكونات المشتبه بها جاهزة ومخزنة محلياً في الذاكرة.',
    stagedReadyBadge: 'جاهز للتشخيص بالذكاء الاصطناعي',
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
    diagnosingProgressSubtitle: 'جارٍ إرسال صورة اللوحة وملف الأعراض إلى نموذج Meta AI لإجراء الفحص البصري والاستدلالي للأعطال.',
    diagnosingTip: 'يستغرق الاستدلال البصري والتحقق من السلامة عادة ما بين 5 إلى 20 ثانية. يُرجى عدم إغلاق هذه الصفحة.',
    cancelDiagnosisBtn: 'إلغاء التشخيص',
    retryDiagnosisBtn: 'إعادة محاولة التشخيص',
    editSymptomsBtn: 'تعديل معالم وبيانات الفحص',
    newInvestigationBtn: 'فحص دارة جديدة',
    confirmNewInvestigation: 'هل ترغب في بدء فحص جديد؟ سيتم مسح نتائج التشخيص الحالية والصورة المدخلة.',
    diagnosisErrorTitle: 'خطأ في عملية التشخيص',
    missingApiKeyErrorNotice: 'مفتاح Meta Model API غير مهيأ في الخادم. يُرجى إضافة MODEL_API_KEY إلى ملف .env في الخادم.',
    networkErrorNotice: 'تعذر الاتصال بخدمة التشخيص الخلفية. يُرجى التأكد من تشغيل خادم Node.js على المنفذ 4000.',
    rateLimitErrorNotice: 'تم بلوغ الحد الأقصى لمعدل الطلبات في Meta Model API. يُرجى الانتظار قليلاً ثم المحاولة مجدداً.',
    timeoutErrorNotice: 'انتهت مهلة طلب التشخيص (50 ثانية). استغرق النموذج وقتاً طويلاً لإتمام المعالجة البصرية.',
    genericErrorNotice: 'حدث خطأ غير متوقع أثناء معالجة التشخيص. تم حفظ بيانات الأعراض والصورة المدخلة بأمان.',

    resultsSectionTitle: 'تقرير تشخيص الدائرة بالذكاء الاصطناعي',
    resultsSectionSubtitle: 'تحليل متعدد الفرضيات للأعطال الإلكترونية مدعوم بالاستدلال البصري لنموذج Meta AI.',
    resultsBadge: 'تشخيص المرحلة 3',
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
    reassessingProgressSubtitle: 'تحليل الأدلة المخبرية وتحديث احتمالات الأعطال بواسطة Meta AI.',
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
  },
};

export const isRtl = (lang: SupportedLanguage): boolean => lang === 'ar';

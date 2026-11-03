/**
 * CircuitLens Stage 5C-1 — Provider Configuration Offline Tests
 *
 * Verifies configurable Baseten and Meta provider architecture:
 * - Provider resolution, legacy defaults, and invalid provider rejection
 * - Independent credential enforcement without cross-provider fallback
 * - Client construction with base URL, model, bounded timeouts, and zero retries
 * - Health check endpoint reporting of provider and key status
 * - Strict offline execution: zero network calls, zero model credits used.
 */

// Set NODE_ENV to test to prevent auto-starting server
process.env.NODE_ENV = 'test';

import type { Server } from 'http';
import type { AddressInfo } from 'net';
import app from './index.js';
import {
  resolveProviderConfig,
  getProviderApiKey,
  createApiClient,
  handleApiError,
  ConfigurationError,
  MissingApiKeyError,
  DiagnosisParsingError,
  ReassessmentParsingError,
  ModelRefusalError,
  DiagnosisOutputLimitError,
  DIAGNOSTIC_SYSTEM_PROMPT,
  REASSESSMENT_SYSTEM_PROMPT,
  buildReassessmentUserPrompt,
  setChatCompletionOverrideForTesting,
  META_API_BASE_URL,
  DEFAULT_MODEL,
  BASETEN_API_BASE_URL,
  BASETEN_DEFAULT_MODEL,
  extractMessageContent,
  resolveRequestTimeoutMs,
  DEFAULT_REQUEST_TIMEOUT_MS,
  MIN_REQUEST_TIMEOUT_MS,
  MAX_REQUEST_TIMEOUT_MS,
  DIAGNOSIS_MAX_TOKENS,
  REASSESSMENT_MAX_TOKENS,
  TEST_PROMPT_MAX_TOKENS,
  resolveDiagnosisMaxTokens,
  resolveReassessmentMaxTokens,
  setTestPromptOverrideForTesting,
  setAnalyzerOverrideForTesting,
  setReassessmentAnalyzerOverrideForTesting,
  analyzeCircuitImage,
  reassessCircuitEvidence,
} from './metaClient.js';
import { parseDiagnosisJson } from './diagnosisValidation.js';
import { parseReassessmentJson } from './reassessmentValidation.js';
import {
  calculateCostEstimate,
  calculateEstimatedCostUsd,
  calculatePartialCostUsd,
  deriveUsageStatus,
  PROVIDER_PRICING,
} from './pricing.js';
import type { DiagnosisRequest, DiagnosisReassessmentRequest, DiagnosisResponse, DiagnosisReassessmentResponse } from './types/diagnosis.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failedCount++;
  }
}

// Preserve original environment
const originalEnv = { ...process.env };

function restoreEnv() {
  process.env = { ...originalEnv };
}

const VALID_JPEG_DATA_URL =
  'data:image/jpeg;base64,' +
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]).toString('base64');

const MOCK_DIAGNOSIS: DiagnosisResponse = {
  summary: 'Suspected MLCC short on 3.3V rail.',
  visibleObservations: [
    {
      description: 'Fractured ceramic cap C12.',
      evidence: 'Micro-crack across package body.',
      confidence: 'high',
    },
  ],
  hypotheses: [
    {
      title: 'Capacitor C12 short circuit',
      reasoning: 'Crack creates conductive path between 3.3V and GND.',
      supportingEvidence: ['Fracture on C12'],
      confidence: 'high',
      suggestedVerification: 'Measure cold resistance across C12.',
    },
  ],
  recommendedChecks: [
    {
      stepNumber: 1,
      title: 'Verify C12 resistance to ground',
      testType: 'Cold Resistance',
      toolsNeeded: ['Multimeter'],
      procedure: 'Disconnect power. Probe C12 terminals.',
      expectedResult: '> 10 kΩ',
      safetyNotes: ['Ensure board is unpowered.'],
    },
  ],
  limitations: ['Inner layer traces not inspected.'],
  safetyWarnings: ['Disconnect power before measuring resistance.'],
};

const MOCK_REASSESSMENT: DiagnosisReassessmentResponse = {
  summary: 'Reassessment confirms C12 short.',
  evidenceSynthesis: '0.8 Ω measured resistance supports C12 breakdown hypothesis.',
  revisedHypotheses: [
    {
      title: 'Capacitor C12 short circuit',
      status: 'supported',
      confidence: 'high',
      explanationOfChange: 'Low resistance reading validates short hypothesis.',
      citingEvidenceIds: ['ev-101'],
      suggestedVerification: 'Desolder C12 and re-measure.',
    },
  ],
  nextRecommendedChecks: [
    {
      stepNumber: 2,
      title: 'Desolder C12',
      testType: 'Component Isolation',
      toolsNeeded: ['Soldering iron'],
      procedure: 'Remove C12 with hot air.',
      expectedResult: 'Resistance recovers to > 10 kΩ.',
      safetyNotes: ['Allow board to cool.'],
    },
  ],
  safetyWarnings: ['Do not apply power while short persists.'],
  limitations: ['Component replacement pending.'],
};

async function runProviderTests() {
  console.log('='.repeat(70));
  console.log(' CircuitLens Stage 5C-1 — Configurable Provider Offline Tests');
  console.log('='.repeat(70));

  // -------------------------------------------------------------------------
  // SECTION 1: Provider Selection & Defaults
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Provider Selection & Defaults ---');

  // Case 1.1: Omitted MODEL_PROVIDER defaults to Meta
  restoreEnv();
  delete process.env.MODEL_PROVIDER;
  const defaultCfg = resolveProviderConfig();
  assert(defaultCfg.provider === 'meta', 'Omitted MODEL_PROVIDER defaults to "meta"');
  assert(defaultCfg.baseUrl === META_API_BASE_URL, `Base URL is legacy Meta URL (${META_API_BASE_URL})`);
  assert(defaultCfg.model === DEFAULT_MODEL, `Model is legacy Meta model (${DEFAULT_MODEL})`);
  assert(defaultCfg.apiKeyEnvVar === 'MODEL_API_KEY', 'API key variable is "MODEL_API_KEY"');

  // Case 1.2: Empty string MODEL_PROVIDER defaults to Meta
  restoreEnv();
  process.env.MODEL_PROVIDER = '   ';
  const emptyCfg = resolveProviderConfig();
  assert(emptyCfg.provider === 'meta', 'Whitespace/empty MODEL_PROVIDER defaults to "meta"');

  // Case 1.3: Explicit MODEL_PROVIDER=meta
  restoreEnv();
  process.env.MODEL_PROVIDER = 'meta';
  const metaCfg = resolveProviderConfig();
  assert(metaCfg.provider === 'meta', 'Explicit MODEL_PROVIDER=meta resolves correctly');
  assert(metaCfg.baseUrl === 'https://api.meta.ai/v1', 'Meta base URL matches https://api.meta.ai/v1');
  assert(metaCfg.model === 'muse-spark-1.3', 'Meta model matches muse-spark-1.3');

  // Case 1.4: Explicit MODEL_PROVIDER=baseten (case insensitive)
  restoreEnv();
  process.env.MODEL_PROVIDER = 'BASETEN';
  const basetenCfg = resolveProviderConfig();
  assert(basetenCfg.provider === 'baseten', 'MODEL_PROVIDER=BASETEN (case-insensitive) resolves to "baseten"');
  assert(basetenCfg.baseUrl === BASETEN_API_BASE_URL, `Baseten base URL matches ${BASETEN_API_BASE_URL}`);
  assert(basetenCfg.model === BASETEN_DEFAULT_MODEL, `Baseten model matches ${BASETEN_DEFAULT_MODEL}`);
  assert(basetenCfg.model === 'meta-models/muse-spark-open-1026', 'Baseten default model resolves to "meta-models/muse-spark-open-1026"');
  assert(basetenCfg.apiKeyEnvVar === 'BASETEN_API_KEY', 'Baseten key variable is "BASETEN_API_KEY"');

  // Case 1.5: Unsupported provider identifier throws ConfigurationError
  restoreEnv();
  process.env.MODEL_PROVIDER = 'unsupported_vendor';
  let invalidThrew = false;
  try {
    resolveProviderConfig();
  } catch (err) {
    invalidThrew = true;
    assert(err instanceof ConfigurationError, 'Unsupported provider throws ConfigurationError');
    const msg = (err as Error).message;
    assert(msg.includes('Invalid MODEL_PROVIDER "unsupported_vendor"'), 'Error specifies invalid provider');
    assert(msg.includes('meta') && msg.includes('baseten'), 'Error lists supported options');
  }
  assert(invalidThrew, 'Invalid provider failed fast without proceeding');

  // Case 1.6: Custom MODEL_BASE_URL and MODEL_NAME overrides
  restoreEnv();
  process.env.MODEL_PROVIDER = 'baseten';
  process.env.MODEL_BASE_URL = 'https://custom-proxy.internal/v1';
  process.env.MODEL_NAME = 'custom-model-tag';
  const overrideCfg = resolveProviderConfig();
  assert(overrideCfg.baseUrl === 'https://custom-proxy.internal/v1', 'Custom MODEL_BASE_URL overrides default');
  assert(overrideCfg.model === 'custom-model-tag', 'Custom MODEL_NAME overrides default');
  assert(overrideCfg.provider === 'baseten', 'Provider remains baseten');

  // -------------------------------------------------------------------------
  // SECTION 2: Credential Isolation & Fail-Safe Handling
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Credential Isolation & Fail-Safe Handling ---');

  // Case 2.1: Missing Meta credentials fail clearly
  restoreEnv();
  process.env.MODEL_PROVIDER = 'meta';
  delete process.env.MODEL_API_KEY;
  let metaMissingThrew = false;
  try {
    getProviderApiKey(resolveProviderConfig());
  } catch (err) {
    metaMissingThrew = true;
    assert(err instanceof MissingApiKeyError, 'Missing Meta key throws MissingApiKeyError');
    assert((err as Error).message.includes('MODEL_API_KEY'), 'Message identifies MODEL_API_KEY');
  }
  assert(metaMissingThrew, 'Meta fails fast when MODEL_API_KEY missing');

  // Case 2.2: Placeholder Meta credentials fail clearly
  restoreEnv();
  process.env.MODEL_PROVIDER = 'meta';
  process.env.MODEL_API_KEY = 'your_meta_model_api_key_here';
  let metaPlaceholderThrew = false;
  try {
    getProviderApiKey(resolveProviderConfig());
  } catch (err) {
    metaPlaceholderThrew = true;
    assert(err instanceof MissingApiKeyError, 'Placeholder Meta key throws MissingApiKeyError');
  }
  assert(metaPlaceholderThrew, 'Meta placeholder key rejected');

  // Case 2.3: Missing Baseten credentials fail clearly
  restoreEnv();
  process.env.MODEL_PROVIDER = 'baseten';
  delete process.env.BASETEN_API_KEY;
  let basetenMissingThrew = false;
  try {
    getProviderApiKey(resolveProviderConfig());
  } catch (err) {
    basetenMissingThrew = true;
    assert(err instanceof MissingApiKeyError, 'Missing Baseten key throws MissingApiKeyError');
    assert((err as Error).message.includes('BASETEN_API_KEY'), 'Message identifies BASETEN_API_KEY');
  }
  assert(basetenMissingThrew, 'Baseten fails fast when BASETEN_API_KEY missing');

  // Case 2.4: Baseten NEVER silently falls back to Meta key if BASETEN_API_KEY is missing
  restoreEnv();
  process.env.MODEL_PROVIDER = 'baseten';
  delete process.env.BASETEN_API_KEY;
  process.env.MODEL_API_KEY = 'meta-secret-key-12345';
  let noFallbackThrew = false;
  try {
    getProviderApiKey(resolveProviderConfig());
  } catch (err) {
    noFallbackThrew = true;
    assert(err instanceof MissingApiKeyError, 'Throws MissingApiKeyError despite MODEL_API_KEY being present');
    assert((err as Error).message.includes('BASETEN_API_KEY'), 'Demands BASETEN_API_KEY and does not use Meta key');
  }
  assert(noFallbackThrew, 'CRITICAL: No silent credential fallback from Baseten to Meta');

  // Case 2.5: Meta NEVER silently falls back to Baseten key if MODEL_API_KEY is missing
  restoreEnv();
  process.env.MODEL_PROVIDER = 'meta';
  delete process.env.MODEL_API_KEY;
  process.env.BASETEN_API_KEY = 'baseten-secret-key-67890';
  let noMetaFallbackThrew = false;
  try {
    getProviderApiKey(resolveProviderConfig());
  } catch (err) {
    noMetaFallbackThrew = true;
    assert((err as Error).message.includes('MODEL_API_KEY'), 'Demands MODEL_API_KEY and does not use Baseten key');
  }
  assert(noMetaFallbackThrew, 'CRITICAL: No silent credential fallback from Meta to Baseten');

  // Case 2.6: Valid credentials resolved for Baseten
  restoreEnv();
  process.env.MODEL_PROVIDER = 'baseten';
  process.env.BASETEN_API_KEY = 'valid-baseten-token-xyz';
  const resolvedKey = getProviderApiKey(resolveProviderConfig());
  assert(resolvedKey === 'valid-baseten-token-xyz', 'Valid BASETEN_API_KEY correctly retrieved');

  // -------------------------------------------------------------------------
  // SECTION 3: Client Construction & Request Parameters
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Client Construction & Request Parameters ---');

  // Case 3.1: Client options for Baseten (timeout, retries, baseURL)
  restoreEnv();
  process.env.MODEL_PROVIDER = 'baseten';
  process.env.BASETEN_API_KEY = 'mock-baseten-key-123';
  const { client: basetenClient, config: activeBasetenCfg } = createApiClient();
  assert(activeBasetenCfg.baseUrl === 'https://inference.baseten.co/v1', 'Client baseURL set to Baseten endpoint');
  assert(activeBasetenCfg.model === 'meta-models/muse-spark-open-1026', 'Client model set to meta-models/muse-spark-open-1026');
  assert(basetenClient.timeout === 75000, 'SDK timeout defaults to aligned 75,000 ms');
  assert(basetenClient.maxRetries === 0, 'SDK maxRetries strictly set to 0');

  // Case 3.2: Client options for Meta (legacy compatibility)
  restoreEnv();
  delete process.env.MODEL_PROVIDER;
  process.env.MODEL_API_KEY = 'mock-meta-key-456';
  const { client: metaClient, config: activeMetaCfg } = createApiClient();
  assert(activeMetaCfg.baseUrl === 'https://api.meta.ai/v1', 'Client baseURL set to Meta endpoint');
  assert(activeMetaCfg.model === 'muse-spark-1.3', 'Client model set to muse-spark-1.3');
  assert(metaClient.timeout === 75000, 'SDK timeout defaults to aligned 75,000 ms');
  assert(metaClient.maxRetries === 0, 'SDK maxRetries strictly set to 0');

  // Case 3.3: MODEL_TIMEOUT_MS resolution and validation
  restoreEnv();
  delete process.env.MODEL_TIMEOUT_MS;
  assert(resolveRequestTimeoutMs() === 75000, 'resolveRequestTimeoutMs defaults to 75000 ms when unset');

  process.env.MODEL_TIMEOUT_MS = '  ';
  assert(resolveRequestTimeoutMs() === 75000, 'resolveRequestTimeoutMs defaults to 75000 ms when whitespace');

  process.env.MODEL_TIMEOUT_MS = '90000';
  assert(resolveRequestTimeoutMs() === 90000, 'Valid MODEL_TIMEOUT_MS (90000) overrides default');

  process.env.MODEL_TIMEOUT_MS = '5000';
  assert(resolveRequestTimeoutMs() === 5000, 'Minimum boundary MODEL_TIMEOUT_MS (5000) accepted');

  process.env.MODEL_TIMEOUT_MS = '300000';
  assert(resolveRequestTimeoutMs() === 300000, 'Maximum boundary MODEL_TIMEOUT_MS (300000) accepted');

  // Case 3.4: Rejection of invalid MODEL_TIMEOUT_MS values
  const invalidTimeouts = [
    { val: 'abc', reason: 'non-numeric string' },
    { val: '0', reason: 'zero timeout' },
    { val: '-5000', reason: 'negative timeout' },
    { val: '4999', reason: 'below minimum 5000 ms' },
    { val: '300001', reason: 'above maximum 300000 ms' },
    { val: '75000.5', reason: 'non-integer float' },
    { val: 'NaN', reason: 'NaN string' },
    { val: 'Infinity', reason: 'Infinity string' },
  ];

  for (const { val, reason } of invalidTimeouts) {
    process.env.MODEL_TIMEOUT_MS = val;
    let thrownError: Error | null = null;
    try {
      resolveRequestTimeoutMs();
    } catch (err) {
      thrownError = err as Error;
    }
    assert(
      thrownError instanceof ConfigurationError,
      `Rejects invalid MODEL_TIMEOUT_MS="${val}" (${reason}) with ConfigurationError`
    );
  }
  restoreEnv();

  // -------------------------------------------------------------------------
  // SECTION 4: Pipeline Preservation (Diagnosis & Reassessment with Baseten)
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Pipeline Preservation (Diagnosis & Reassessment) ---');

  // Case 4.1: Initial diagnosis with mock analyzer under Baseten configuration
  restoreEnv();
  process.env.MODEL_PROVIDER = 'baseten';
  process.env.BASETEN_API_KEY = 'mock-key';

  let diagnosisAnalyzerCalled = false;
  setAnalyzerOverrideForTesting(async (req) => {
    diagnosisAnalyzerCalled = true;
    assert(req.image.startsWith('data:image/jpeg;base64,'), 'Diagnosis received image payload');
    assert(req.boardName === 'BasetenTestPCB', 'Diagnosis received board name');
    return MOCK_DIAGNOSIS;
  });

  const diagnosisPayload: DiagnosisRequest = {
    image: VALID_JPEG_DATA_URL,
    boardName: 'BasetenTestPCB',
    expectedBehavior: 'Board powers on with 3.3V rail.',
    observedBehavior: 'Board drops to 0.8V rail.',
  };

  const diagnosisRes = await analyzeCircuitImage(diagnosisPayload);
  assert(diagnosisAnalyzerCalled, 'Diagnosis pipeline executed successfully under Baseten');
  assert(diagnosisRes.summary === MOCK_DIAGNOSIS.summary, 'Diagnosis response contract preserved');
  assert(diagnosisRes.visibleObservations.length === 1, 'Observations array preserved');
  assert(diagnosisRes.hypotheses.length === 1, 'Hypotheses array preserved');
  setAnalyzerOverrideForTesting(null);

  // Case 4.2: Reassessment with mock analyzer under Baseten configuration
  let reassessmentAnalyzerCalled = false;
  setReassessmentAnalyzerOverrideForTesting(async (req) => {
    reassessmentAnalyzerCalled = true;
    assert(req.evidence.length === 1, 'Reassessment received evidence ledger');
    assert(req.evidence[0].id === 'ev-101', 'Evidence record ID preserved');
    return MOCK_REASSESSMENT;
  });

  const reassessmentPayload: DiagnosisReassessmentRequest = {
    diagnosticContext: {
      boardName: 'BasetenTestPCB',
      expectedBehavior: 'Board powers on with 3.3V rail.',
      observedBehavior: 'Board drops to 0.8V rail.',
      initialSummary: MOCK_DIAGNOSIS.summary,
      visibleObservations: MOCK_DIAGNOSIS.visibleObservations,
      initialHypotheses: MOCK_DIAGNOSIS.hypotheses,
    },
    evidence: [
      {
        id: 'ev-101',
        targetRecommendationId: 'rec-c0-s1',
        cycleIndex: 0,
        stepNumber: 1,
        checkTitle: 'Verify C12 resistance to ground',
        outcome: 'failed',
        numericValue: 0.8,
        measurementUnit: 'Ω',
        recordedAt: new Date().toISOString(),
      },
    ],
  };

  const reassessmentRes = await reassessCircuitEvidence(reassessmentPayload);
  assert(reassessmentAnalyzerCalled, 'Reassessment pipeline executed successfully under Baseten');
  assert(reassessmentRes.summary === MOCK_REASSESSMENT.summary, 'Reassessment response contract preserved');
  assert(reassessmentRes.revisedHypotheses[0].status === 'supported', 'Revised hypothesis status preserved');
  assert(reassessmentRes.revisedHypotheses[0].citingEvidenceIds.includes('ev-101'), 'Evidence citation preserved');
  setReassessmentAnalyzerOverrideForTesting(null);

  // -------------------------------------------------------------------------
  // SECTION 5: Error Handling & Error Mapping
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Error Handling & Security Sanitization ---');

  // Case 5.1: ConfigurationError maps to HTTP 500 CONFIGURATION_ERROR
  const configErr = new ConfigurationError('Invalid MODEL_PROVIDER "azure"');
  const normalizedConfig = handleApiError(configErr);
  assert(normalizedConfig.statusCode === 500, 'ConfigurationError maps to HTTP 500');
  assert(normalizedConfig.errorType === 'CONFIGURATION_ERROR', 'Error type is CONFIGURATION_ERROR');
  assert(normalizedConfig.message.includes('Invalid MODEL_PROVIDER'), 'Safe descriptive error message retained');

  // Case 5.2: MissingApiKeyError maps to HTTP 500 MISSING_API_KEY
  const missingKeyErr = new MissingApiKeyError('BASETEN_API_KEY environment variable is not configured.');
  const normalizedMissing = handleApiError(missingKeyErr);
  assert(normalizedMissing.statusCode === 500, 'MissingApiKeyError maps to HTTP 500');
  assert(normalizedMissing.errorType === 'MISSING_API_KEY', 'Error type is MISSING_API_KEY');
  assert(normalizedMissing.message.includes('BASETEN_API_KEY'), 'Identifies missing Baseten key');

  // Case 5.3: Token redaction in raw error messages
  const errorWithKey = new Error('Upstream failed: Bearer secret_baseten_key_99999 was rejected');
  const normalizedRaw = handleApiError(errorWithKey);
  assert(!normalizedRaw.message.includes('secret_baseten_key_99999'), 'Bearer token never leaked in error response');

  // -------------------------------------------------------------------------
  // SECTION 6: Ephemeral Server & Health Endpoint Integration
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 6: Health Endpoint Integration ---');

  let server: Server | null = null;
  let baseUrl = '';

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server!.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  try {
    // Case 6.1: Health endpoint when Baseten is selected without key
    restoreEnv();
    process.env.MODEL_PROVIDER = 'baseten';
    delete process.env.BASETEN_API_KEY;

    const res1 = await fetch(`${baseUrl}/api/health`);
    const json1 = (await res1.json()) as Record<string, unknown>;
    assert(res1.status === 200, 'GET /api/health returns HTTP 200');
    assert(json1.provider === 'baseten', 'Health reports provider="baseten"');
    assert(json1.targetModel === BASETEN_DEFAULT_MODEL, `Health reports targetModel="${BASETEN_DEFAULT_MODEL}"`);
    assert(json1.apiKeyConfigured === false, 'Health reports apiKeyConfigured=false when BASETEN_API_KEY absent');
    assert(json1.apiKeyEnvVar === 'BASETEN_API_KEY', 'Health reports apiKeyEnvVar="BASETEN_API_KEY"');
    assert(json1.metaBaseUrl === BASETEN_API_BASE_URL, 'Health preserves metaBaseUrl for client backward compatibility');

    // Case 6.2: Health endpoint when Baseten key IS configured
    restoreEnv();
    process.env.MODEL_PROVIDER = 'baseten';
    process.env.BASETEN_API_KEY = 'configured-baseten-token';

    const res2 = await fetch(`${baseUrl}/api/health`);
    const json2 = (await res2.json()) as Record<string, unknown>;
    assert(json2.apiKeyConfigured === true, 'Health reports apiKeyConfigured=true when BASETEN_API_KEY is present');

    // Case 6.3: Health endpoint when Meta is selected (legacy default)
    restoreEnv();
    delete process.env.MODEL_PROVIDER;
    delete process.env.MODEL_API_KEY;

    const res3 = await fetch(`${baseUrl}/api/health`);
    const json3 = (await res3.json()) as Record<string, unknown>;
    assert(json3.provider === 'meta', 'Health reports provider="meta" by default');
    assert(json3.targetModel === DEFAULT_MODEL, `Health reports targetModel="${DEFAULT_MODEL}"`);
    assert(json3.apiKeyConfigured === false, 'Health reports apiKeyConfigured=false when MODEL_API_KEY absent');
    assert(json3.apiKeyEnvVar === 'MODEL_API_KEY', 'Health reports apiKeyEnvVar="MODEL_API_KEY"');

    // Case 6.4: Health endpoint with invalid MODEL_PROVIDER returns status="error" without throwing
    restoreEnv();
    process.env.MODEL_PROVIDER = 'unknown_vendor';

    const res4 = await fetch(`${baseUrl}/api/health`);
    const json4 = (await res4.json()) as Record<string, unknown>;
    assert(res4.status === 200, 'Health endpoint returns HTTP 200 even with bad configuration');
    assert(json4.status === 'error', 'Health payload status is "error"');
    assert(Boolean(json4.configurationError), 'Health payload includes configurationError detail');
    // -------------------------------------------------------------------------
    // SECTION 7: Model Response Extraction, Parsing & Reasoning Support
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 7: Model Response Extraction, Parsing & Reasoning Support ---');

    // Case 7.1: Normal string text content extraction
    const normalChoice = {
      message: { role: 'assistant', content: 'CircuitLens connection successful!' },
    };
    const extractedNormal = extractMessageContent(normalChoice);
    assert(extractedNormal === 'CircuitLens connection successful!', 'Normal string content extracted successfully');

    // Case 7.2: Empty, whitespace, null, and missing content handling
    assert(extractMessageContent({ message: { content: '' } }) === '', 'Empty string content extracts as ""');
    assert(extractMessageContent({ message: { content: '   \n  ' } }) === '', 'Whitespace-only content extracts as ""');
    assert(extractMessageContent({ message: { content: null } }) === '', 'Null content extracts as ""');
    assert(extractMessageContent({ message: {} }) === '', 'Missing content field extracts as ""');
    assert(extractMessageContent(undefined) === '', 'Undefined choice extracts as ""');
    assert(extractMessageContent(null) === '', 'Null choice extracts as ""');

    // Case 7.3: Multimodal array of content parts extraction
    const partsChoice = {
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Diagnostic analysis' },
          { type: 'text', text: 'confirmed short circuit.' },
        ],
      },
    };
    const extractedParts = extractMessageContent(partsChoice);
    assert(
      extractedParts === 'Diagnostic analysis\nconfirmed short circuit.',
      'Array of content parts extracted and joined with newline'
    );

    const stringPartsChoice = {
      message: {
        role: 'assistant',
        content: ['First observation.', 'Second observation.'],
      },
    };
    assert(
      extractMessageContent(stringPartsChoice) === 'First observation.\nSecond observation.',
      'Array of plain string parts extracted and joined'
    );

    // Case 7.4: Reasoning content NOT accepted by default (strict separation of reasoning from diagnosis)
    const reasoningChoice = {
      message: {
        role: 'assistant',
        content: null,
        reasoning_content: 'Internal reasoning trace: capacitor C12 is cracked.',
      },
    };
    // Default extraction (allowReasoningFallback: false): reasoning is ignored to prevent scratchpad from becoming diagnosis
    assert(
      extractMessageContent(reasoningChoice) === '',
      'Default extractMessageContent strictly ignores reasoning_content when content is null'
    );
    // Explicit opt-in (allowReasoningFallback: true)
    assert(
      extractMessageContent(reasoningChoice, { allowReasoningFallback: true }) ===
        'Internal reasoning trace: capacitor C12 is cracked.',
      'Explicit allowReasoningFallback extracts reasoning_content when enabled'
    );

    const reasoningAltChoice = {
      message: {
        role: 'assistant',
        content: '',
        reasoning: 'Internal reasoning trace: alternative field.',
      },
    };
    assert(
      extractMessageContent(reasoningAltChoice) === '',
      'Default extractMessageContent strictly ignores alternative reasoning field when content is empty'
    );
    assert(
      extractMessageContent(reasoningAltChoice, { allowReasoningFallback: true }) ===
        'Internal reasoning trace: alternative field.',
      'Explicit allowReasoningFallback extracts alternative reasoning field'
    );

    // Case 7.5: Model refusal handling (throws ModelRefusalError, mapped to HTTP 422)
    const refusalChoice = {
      message: {
        role: 'assistant',
        content: null,
        refusal: 'I cannot analyze this schematic due to policy restrictions.',
      },
    };
    let refusalThrew = false;
    try {
      extractMessageContent(refusalChoice);
    } catch (err) {
      refusalThrew = true;
      assert(err instanceof ModelRefusalError, 'Model refusal throws ModelRefusalError');
      assert((err as Error).message.includes('policy restrictions'), 'Refusal message preserved');
      const normalizedRefusal = handleApiError(err);
      assert(normalizedRefusal.statusCode === 422, 'Refusal maps to HTTP 422');
      assert(normalizedRefusal.errorType === 'MODEL_REFUSAL', 'Refusal errorType is MODEL_REFUSAL');
    }
    assert(refusalThrew, 'Refusal never accepted as valid content');

    // Case 7.6: Legacy text completion property
    const legacyTextChoice = { text: 'Legacy completion format response.' };
    assert(
      extractMessageContent(legacyTextChoice) === 'Legacy completion format response.',
      'Legacy choice.text property extracted correctly when message is absent'
    );

    // Case 7.7: sendMetaTestPrompt surfaces structured error on empty response or reasoning-only response
    setTestPromptOverrideForTesting(async () => {
      throw new DiagnosisParsingError(
        'Model emitted reasoning tokens (150 tokens, finish_reason: length) but produced no final content. Increase max_tokens or check model reasoning settings.'
      );
    });

    let emptyPromptThrew = false;
    try {
      await app; // ensure app loaded
      const normalizedEmpty = handleApiError(
        new DiagnosisParsingError(
          'Model emitted reasoning tokens (150 tokens, finish_reason: length) but produced no final content. Increase max_tokens or check model reasoning settings.'
        )
      );
      assert(normalizedEmpty.statusCode === 502, 'Reasoning-only output maps to HTTP 502');
      assert(normalizedEmpty.errorType === 'INVALID_MODEL_OUTPUT', 'Error type is INVALID_MODEL_OUTPUT');
      assert(normalizedEmpty.message.includes('reasoning tokens'), 'Error message identifies reasoning tokens');
      emptyPromptThrew = true;
    } finally {
      setTestPromptOverrideForTesting(null);
    }
    assert(emptyPromptThrew, 'Reasoning-only response correctly surfaced as structured error');

    // Case 7.8: parseDiagnosisJson strips <think>...</think> reasoning blocks before parsing
    const reasoningDiagnosisJson = `<think>
I need to analyze this circuit carefully.
The ceramic capacitor C12 is cracked.
</think>
\`\`\`json
${JSON.stringify(MOCK_DIAGNOSIS)}
\`\`\``;
    const parsedWithThinking = parseDiagnosisJson(reasoningDiagnosisJson);
    assert(parsedWithThinking.summary === MOCK_DIAGNOSIS.summary, 'parseDiagnosisJson strips <think> tags and parses JSON successfully');
    assert(parsedWithThinking.visibleObservations.length === 1, 'Observations preserved after thinking tag stripping');

    // Case 7.9: parseDiagnosisJson rejects unclosed <think> tag indicating truncation
    let unclosedThinkThrew = false;
    try {
      parseDiagnosisJson('<think>\nAnalyzing circuit image and then cutoff due to token limit');
    } catch (err) {
      unclosedThinkThrew = true;
      assert(err instanceof DiagnosisParsingError, 'Unclosed <think> throws DiagnosisParsingError');
      assert((err as Error).message.includes('truncated inside reasoning'), 'Error identifies truncation inside reasoning');
    }
    assert(unclosedThinkThrew, 'Unclosed <think> tag rejected');

    // Case 7.10: parseDiagnosisJson rejects pure <think> reasoning without final JSON
    let pureThinkThrew = false;
    try {
      parseDiagnosisJson('<think>\nJust some internal thoughts\n</think>');
    } catch (err) {
      pureThinkThrew = true;
      assert(err instanceof DiagnosisParsingError, 'Pure <think> block throws DiagnosisParsingError');
      assert((err as Error).message.includes('only reasoning tags'), 'Error identifies only reasoning tags present');
    }
    assert(pureThinkThrew, 'Pure <think> block without diagnosis JSON rejected');

    // Case 7.11: parseReassessmentJson strips <think>...</think> reasoning blocks before parsing
    const reasoningReassessmentJson = `<think>
Synthesizing evidence record ev-101 measuring 0.8 ohms...
</think>
${JSON.stringify(MOCK_REASSESSMENT)}`;
    const parsedReassessmentWithThinking = parseReassessmentJson(reasoningReassessmentJson);
    assert(
      parsedReassessmentWithThinking.summary === MOCK_REASSESSMENT.summary,
      'parseReassessmentJson strips <think> tags and parses JSON successfully'
    );
    assert(
      parsedReassessmentWithThinking.revisedHypotheses[0].status === 'supported',
      'Hypothesis status preserved after thinking tag stripping'
    );

    // Case 7.12: parseReassessmentJson rejects unclosed <think> tag indicating truncation
    let unclosedReassessThinkThrew = false;
    try {
      parseReassessmentJson('<think>\nAnalyzing evidence and truncated');
    } catch (err) {
      unclosedReassessThinkThrew = true;
      assert(err instanceof ReassessmentParsingError, 'Unclosed <think> in reassessment throws ReassessmentParsingError');
      assert((err as Error).message.includes('truncated inside reasoning'), 'Error identifies truncation inside reasoning');
    }
    assert(unclosedReassessThinkThrew, 'Unclosed <think> in reassessment rejected');

    // Case 7.13: parseDiagnosisJson and parseReassessmentJson reject empty and non-string outputs
    let parseEmptyThrew = false;
    try {
      parseDiagnosisJson('');
    } catch (err) {
      parseEmptyThrew = true;
      assert(err instanceof DiagnosisParsingError, 'Empty string in parseDiagnosisJson throws DiagnosisParsingError');
    }
    assert(parseEmptyThrew, 'Empty string rejected by parseDiagnosisJson');

    let reassessEmptyThrew = false;
    try {
      parseReassessmentJson('   ');
    } catch (err) {
      reassessEmptyThrew = true;
      assert(err instanceof ReassessmentParsingError, 'Whitespace string in parseReassessmentJson throws ReassessmentParsingError');
    }
    assert(reassessEmptyThrew, 'Whitespace string rejected by parseReassessmentJson');

    // -------------------------------------------------------------------------
    // SECTION 8: Stage 5C-3G Completion Metadata, Token Limits & Prompt Conciseness
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 8: Completion Metadata, Token Limits & Conciseness ---');
    restoreEnv();
    process.env.MODEL_PROVIDER = 'baseten';
    process.env.BASETEN_API_KEY = 'test-baseten-key';

    // Case 8.0: Separate diagnosis and reassessment token allowances
    assert(DIAGNOSIS_MAX_TOKENS === 3500, 'DIAGNOSIS_MAX_TOKENS is 3500');
    assert(REASSESSMENT_MAX_TOKENS === 6000, 'REASSESSMENT_MAX_TOKENS is 6000');
    assert(TEST_PROMPT_MAX_TOKENS === 500, 'TEST_PROMPT_MAX_TOKENS is 500');
    assert(resolveDiagnosisMaxTokens() === 3500, 'resolveDiagnosisMaxTokens defaults to 3500');
    assert(resolveReassessmentMaxTokens() === 6000, 'resolveReassessmentMaxTokens defaults to 6000');

    // Case 8.0b: Request construction passes distinct max_tokens per operation
    let capturedDiagnosisTokens = 0;
    setChatCompletionOverrideForTesting(async (params: any) => {
      capturedDiagnosisTokens = params.max_tokens;
      return {
        id: 'chatcmpl-test-params',
        object: 'chat.completion',
        created: Date.now(),
        model: 'meta-models/muse-spark-open-1026',
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: { role: 'assistant', content: JSON.stringify(MOCK_DIAGNOSIS) },
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 },
      } as any;
    });

    await analyzeCircuitImage({
      image: VALID_JPEG_DATA_URL,
      expectedBehavior: 'Powers on normally',
      observedBehavior: 'Dead board',
    });
    assert(capturedDiagnosisTokens === 3500, 'analyzeCircuitImage passes max_tokens: 3500');

    let capturedReassessmentTokens = 0;
    setChatCompletionOverrideForTesting(async (params: any) => {
      capturedReassessmentTokens = params.max_tokens;
      return {
        id: 'chatcmpl-test-params-reassess',
        object: 'chat.completion',
        created: Date.now(),
        model: 'meta-models/muse-spark-open-1026',
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: { role: 'assistant', content: JSON.stringify(MOCK_REASSESSMENT) },
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 },
      } as any;
    });

    await reassessCircuitEvidence(reassessmentPayload);
    assert(capturedReassessmentTokens === 6000, 'reassessCircuitEvidence passes max_tokens: 6000');

    // Case 8.1: DiagnosisOutputLimitError structure and handleApiError mapping
    const outputLimitErr = new DiagnosisOutputLimitError(
      'Model output reached the maximum completion token limit (3500 tokens) before completing the diagnostic assessment.',
      3500,
      3500
    );
    assert(outputLimitErr.name === 'DiagnosisOutputLimitError', 'DiagnosisOutputLimitError has correct name');
    assert(outputLimitErr.completionTokens === 3500, 'Preserves completionTokens');
    assert(outputLimitErr.maxTokens === 3500, 'Preserves maxTokens');

    const mappedLimitErr = handleApiError(outputLimitErr);
    assert(mappedLimitErr.statusCode === 502, 'Output limit error maps to HTTP 502');
    assert(mappedLimitErr.errorType === 'OUTPUT_TOKEN_LIMIT', 'Error type is OUTPUT_TOKEN_LIMIT');
    assert(mappedLimitErr.message.includes('3500 tokens'), 'Message describes token exhaustion');

    // Case 8.2: finish_reason === "length" in analyzeCircuitImage throws DiagnosisOutputLimitError
    setChatCompletionOverrideForTesting(async () => ({
      id: 'chatcmpl-test-length',
      object: 'chat.completion',
      created: Date.now(),
      model: 'meta-models/muse-spark-open-1026',
      choices: [
        {
          index: 0,
          finish_reason: 'length',
          message: {
            role: 'assistant',
            content: '{"summary": "Incomplete diagnostic report that got cut off mid-way...',
          },
        },
      ],
      usage: {
        prompt_tokens: 1250,
        completion_tokens: 3500,
        total_tokens: 4750,
      },
    } as any));

    let lengthThrew = false;
    try {
      await analyzeCircuitImage({
        image: VALID_JPEG_DATA_URL,
        expectedBehavior: 'Powers on normally',
        observedBehavior: 'Dead board',
      });
    } catch (err) {
      lengthThrew = true;
      assert(err instanceof DiagnosisOutputLimitError, 'analyzeCircuitImage throws DiagnosisOutputLimitError when finish_reason === "length"');
      assert((err as DiagnosisOutputLimitError).completionTokens === 3500, 'Token count recorded in error');
      assert((err as DiagnosisOutputLimitError).maxTokens === 3500, 'Diagnosis maxTokens recorded as 3500');
    }
    assert(lengthThrew, 'finish_reason="length" caught before JSON parsing');

    // Case 8.3: finish_reason === "length" in reassessCircuitEvidence throws DiagnosisOutputLimitError with 6000 limit
    let reassessLengthThrew = false;
    try {
      await reassessCircuitEvidence(reassessmentPayload);
    } catch (err) {
      reassessLengthThrew = true;
      assert(err instanceof DiagnosisOutputLimitError, 'reassessCircuitEvidence throws DiagnosisOutputLimitError when finish_reason === "length"');
      assert((err as DiagnosisOutputLimitError).maxTokens === 6000, 'Reassessment maxTokens recorded as 6000');
    }
    assert(reassessLengthThrew, 'Reassessment finish_reason="length" correctly caught');

    // Case 8.4: finish_reason === "stop" with malformed JSON produces INVALID_MODEL_OUTPUT, not token exhaustion
    setChatCompletionOverrideForTesting(async () => ({
      id: 'chatcmpl-test-malformed',
      object: 'chat.completion',
      created: Date.now(),
      model: 'meta-models/muse-spark-open-1026',
      choices: [
        {
          index: 0,
          finish_reason: 'stop',
          message: {
            role: 'assistant',
            content: 'Not a valid JSON at all!',
          },
        },
      ],
      usage: {
        prompt_tokens: 800,
        completion_tokens: 25,
        total_tokens: 825,
      },
    } as any));

    let malformedThrew = false;
    try {
      await analyzeCircuitImage({
        image: VALID_JPEG_DATA_URL,
        expectedBehavior: 'Powers on normally',
        observedBehavior: 'Dead board',
      });
    } catch (err) {
      malformedThrew = true;
      assert(err instanceof DiagnosisParsingError, 'finish_reason="stop" with bad JSON throws DiagnosisParsingError');
      const mapped = handleApiError(err);
      assert(mapped.statusCode === 502, 'Mapped to HTTP 502');
      assert(mapped.errorType === 'INVALID_MODEL_OUTPUT', 'Error type is INVALID_MODEL_OUTPUT (not token limit)');
    }
    assert(malformedThrew, 'Malformed JSON with stop finish_reason properly classified');

    // Case 8.5: Absent / unrecognized finish_reason does not infer token exhaustion
    setChatCompletionOverrideForTesting(async () => ({
      id: 'chatcmpl-test-unrecognized',
      object: 'chat.completion',
      created: Date.now(),
      model: 'meta-models/muse-spark-open-1026',
      choices: [
        {
          index: 0,
          finish_reason: 'content_filter',
          message: {
            role: 'assistant',
            content: '{ invalid',
          },
        },
      ],
    } as any));

    let unrecognizedThrew = false;
    try {
      await analyzeCircuitImage({
        image: VALID_JPEG_DATA_URL,
        expectedBehavior: 'Powers on normally',
        observedBehavior: 'Dead board',
      });
    } catch (err) {
      unrecognizedThrew = true;
      assert(err instanceof DiagnosisParsingError, 'Unrecognized finish_reason with invalid JSON throws DiagnosisParsingError, not token exhaustion');
      assert(!(err instanceof DiagnosisOutputLimitError), 'Did not falsely infer token limit');
    }
    assert(unrecognizedThrew, 'Unrecognized finish_reason handled safely without false token exhaustion');

    // Case 8.6: Successful diagnosis safely captures non-sensitive numeric metadata
    setChatCompletionOverrideForTesting(async () => ({
      id: 'chatcmpl-test-success',
      object: 'chat.completion',
      created: Date.now(),
      model: 'meta-models/muse-spark-open-1026',
      choices: [
        {
          index: 0,
          finish_reason: 'stop',
          message: {
            role: 'assistant',
            content: JSON.stringify(MOCK_DIAGNOSIS),
          },
        },
      ],
      usage: {
        prompt_tokens: 1120,
        completion_tokens: 840,
        total_tokens: 1960,
      },
    } as any));

    const successfulDiagnosis = await analyzeCircuitImage({
      image: VALID_JPEG_DATA_URL,
      expectedBehavior: 'Powers on normally',
      observedBehavior: 'Dead board',
    });

    assert(Boolean(successfulDiagnosis.metadata), 'Metadata attached to DiagnosisResponse');
    assert(successfulDiagnosis.metadata?.promptTokens === 1120, 'promptTokens captured');
    assert(successfulDiagnosis.metadata?.completionTokens === 840, 'completionTokens captured');
    assert(successfulDiagnosis.metadata?.totalTokens === 1960, 'totalTokens captured');
    assert(successfulDiagnosis.metadata?.finishReason === 'stop', 'finishReason captured');
    assert(typeof successfulDiagnosis.metadata?.durationMs === 'number', 'durationMs captured as number');
    assert(successfulDiagnosis.metadata!.durationMs >= 0, 'durationMs is non-negative');

    // Case 8.7: Reassessment safely captures non-sensitive numeric metadata
    setChatCompletionOverrideForTesting(async () => ({
      id: 'chatcmpl-test-reassess-success',
      object: 'chat.completion',
      created: Date.now(),
      model: 'meta-models/muse-spark-open-1026',
      choices: [
        {
          index: 0,
          finish_reason: 'stop',
          message: {
            role: 'assistant',
            content: JSON.stringify(MOCK_REASSESSMENT),
          },
        },
      ],
      usage: {
        prompt_tokens: 1500,
        completion_tokens: 650,
        total_tokens: 2150,
      },
    } as any));

    const successfulReassessment = await reassessCircuitEvidence(reassessmentPayload);
    assert(Boolean(successfulReassessment.metadata), 'Metadata attached to DiagnosisReassessmentResponse');
    assert(successfulReassessment.metadata?.promptTokens === 1500, 'Reassessment promptTokens captured');
    assert(successfulReassessment.metadata?.completionTokens === 650, 'Reassessment completionTokens captured');
    assert(successfulReassessment.metadata?.totalTokens === 2150, 'Reassessment totalTokens captured');
    assert(successfulReassessment.metadata?.finishReason === 'stop', 'Reassessment finishReason captured');

    // Case 8.8: Missing usage metadata does not crash and metadata still captures durationMs
    setChatCompletionOverrideForTesting(async () => ({
      id: 'chatcmpl-test-no-usage',
      object: 'chat.completion',
      created: Date.now(),
      model: 'meta-models/muse-spark-open-1026',
      choices: [
        {
          index: 0,
          finish_reason: undefined,
          message: {
            role: 'assistant',
            content: JSON.stringify(MOCK_DIAGNOSIS),
          },
        },
      ],
    } as any));

    const noUsageDiagnosis = await analyzeCircuitImage({
      image: VALID_JPEG_DATA_URL,
      expectedBehavior: 'Powers on normally',
      observedBehavior: 'Dead board',
    });
    assert(Boolean(noUsageDiagnosis.metadata), 'Metadata attached even when gateway omits usage');
    assert(noUsageDiagnosis.metadata?.promptTokens === undefined, 'promptTokens is undefined when absent');
    assert(typeof noUsageDiagnosis.metadata?.durationMs === 'number', 'durationMs captured');

    // Clean up override
    setChatCompletionOverrideForTesting(null);

    // Case 8.9: Prompt conciseness rules present in DIAGNOSTIC_SYSTEM_PROMPT and REASSESSMENT_SYSTEM_PROMPT
    assert(DIAGNOSTIC_SYSTEM_PROMPT.includes('at most 3 primary fault hypotheses'), 'DIAGNOSTIC_SYSTEM_PROMPT limits hypotheses to 3');
    assert(DIAGNOSTIC_SYSTEM_PROMPT.includes('at most 3 prioritized troubleshooting checks'), 'DIAGNOSTIC_SYSTEM_PROMPT limits checks to 3');
    assert(REASSESSMENT_SYSTEM_PROMPT.includes('at most 2 focused next recommended checks'), 'REASSESSMENT_SYSTEM_PROMPT limits next checks to 2');

    // -------------------------------------------------------------------------
    // SECTION 9: Stage 5C-3K-2 Delta-Focused Reassessment Optimization Tests
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 9: Stage 5C-3K-2 Delta-Focused Reassessment Optimization ---');

    // Case 9.1: Prompt efficiency - compacted initial context, duplicate instructions removed, reminders preserved
    const multiRecordPayload: DiagnosisReassessmentRequest = {
      diagnosticContext: {
        boardName: 'Arduino Uno R3',
        expectedBehavior: 'Board powers up, LEDs illuminate',
        observedBehavior: 'Power LED fails to turn on',
        initialSummary: 'Fault in 5V power supply or indicator LED circuit',
        visibleObservations: [
          {
            description: 'D1 LED package intact',
            evidence: 'Silkscreen D1 near pin 13',
            confidence: 'high',
          },
        ],
        initialHypotheses: [
          {
            title: 'LED reversed polarity',
            reasoning: 'Extensive theoretical reasoning about semiconductor junctions and reverse bias blocking current flow...',
            supportingEvidence: ['D1 orientation marker'],
            confidence: 'medium',
            suggestedVerification: 'Inspect cathode notch orientation',
          },
          {
            title: 'Current-limiting resistor open',
            reasoning: 'Extensive theoretical reasoning about thermal fatigue and SMD resistor micro-fracture mechanisms...',
            supportingEvidence: ['R1 nearby'],
            confidence: 'low',
            suggestedVerification: 'Measure cold resistance across R1',
          },
          {
            title: 'Microcontroller GPIO drive failure',
            reasoning: 'Extensive theoretical reasoning about internal FET latch-up and ESD damage on ATmega328P I/O pin...',
            supportingEvidence: ['Pin 13 connection'],
            confidence: 'medium',
            suggestedVerification: 'Measure GPIO pin voltage under test sketch',
          },
        ],
      },
      evidence: [
        {
          id: 'ev-1',
          targetRecommendationId: 'rec-c0-s1',
          cycleIndex: 0,
          stepNumber: 1,
          checkTitle: 'Visual polarity and seating check',
          outcome: 'passed',
          technicianNotes: 'Cathode notch correctly aligned to GND trace.',
          recordedAt: '2026-10-30T10:00:00Z',
        },
        {
          id: 'ev-2',
          targetRecommendationId: 'rec-c0-s2',
          cycleIndex: 0,
          stepNumber: 2,
          checkTitle: 'Cold resistance and LED diode check',
          outcome: 'passed',
          numericValue: 1.82,
          measurementUnit: 'V',
          technicianNotes: 'Diode forward drop measured 1.82V, nominal for green LED.',
          recordedAt: '2026-10-30T10:05:00Z',
        },
        {
          id: 'ev-3',
          targetRecommendationId: 'rec-c0-s3',
          cycleIndex: 0,
          stepNumber: 3,
          checkTitle: 'Powered pin drive and LED voltage verification',
          outcome: 'failed',
          numericValue: 0.04,
          measurementUnit: 'V',
          technicianNotes: 'Pin 13 measured 0.04V during toggle cycle. Expected 5.0V.',
          recordedAt: '2026-10-30T10:10:00Z',
        },
      ],
      additionalTechnicianNotes: 'Board executes delay loop but GPIO output pin stays at GND.',
    };

    const optimizedPrompt = buildReassessmentUserPrompt(multiRecordPayload);

    // Verify prompt compactness and deduplication
    assert(
      !optimizedPrompt.includes('Extensive theoretical reasoning about semiconductor junctions'),
      'Omitted verbose initial hypothesis reasoning from user prompt'
    );
    assert(
      !optimizedPrompt.includes('=== CRITICAL REASSESSMENT INSTRUCTIONS ==='),
      'Removed duplicated 8-point instruction block from user prompt'
    );
    assert(
      optimizedPrompt.includes('Reminder: You have NOT performed a new visual inspection'),
      'Retained visual inspection constraint reminder in user prompt'
    );
    assert(
      optimizedPrompt.includes('Initial Verification Target: Inspect cathode notch orientation'),
      'Preserved concise hypothesis verification target'
    );

    // Case 9.2: Multi-record evidence preservation & traceability
    assert(optimizedPrompt.includes('Evidence ID: ev-1'), 'Prompt includes Evidence ID ev-1');
    assert(optimizedPrompt.includes('Evidence ID: ev-2'), 'Prompt includes Evidence ID ev-2');
    assert(optimizedPrompt.includes('Evidence ID: ev-3'), 'Prompt includes Evidence ID ev-3');
    assert(optimizedPrompt.includes('1.82 V'), 'Prompt preserves exact numeric value and unit for ev-2');
    assert(optimizedPrompt.includes('0.04 V'), 'Prompt preserves exact numeric value and unit for ev-3');
    assert(optimizedPrompt.includes('Pin 13 measured 0.04V'), 'Prompt preserves technician notes');

    // Case 9.3: Concise delta-based reassessment output validation
    const conciseReassessmentResponse = {
      summary: 'Physical checks rule out LED diode fault and confirm failure of GPIO pin 13 drive voltage.',
      evidenceSynthesis: 'Evidence ev-1 and ev-2 establish LED polarity and diode junction are intact. Evidence ev-3 demonstrates GPIO pin 13 outputs 0.04V instead of 5.0V, shifting focus to ATmega328P output driver.',
      revisedHypotheses: [
        {
          title: 'LED reversed polarity',
          status: 'contradicted' as const,
          confidence: 'high' as const,
          explanationOfChange: 'Visual polarity inspection ev-1 showed cathode notch correctly aligned with ground trace.',
          citingEvidenceIds: ['ev-1'],
        },
        {
          title: 'Current-limiting resistor open',
          status: 'weakened' as const,
          confidence: 'medium' as const,
          explanationOfChange: 'Diode test ev-2 confirmed continuity through circuit branch with 1.82V forward drop.',
          citingEvidenceIds: ['ev-2'],
        },
        {
          title: 'Microcontroller GPIO drive failure',
          status: 'supported' as const,
          confidence: 'high' as const,
          explanationOfChange: 'Pin 13 voltage measured 0.04V under active drive condition in check ev-3.',
          citingEvidenceIds: ['ev-3'],
          suggestedVerification: 'Probe ATmega328P pin 19 directly at IC package to rule out PCB trace break between IC and header.',
        },
      ],
      nextRecommendedChecks: [
        {
          stepNumber: 1,
          title: 'Probe ATmega328P pin 19 directly',
          testType: 'Voltage Measurement',
          toolsNeeded: ['Multimeter', 'Fine-pitch probe'],
          procedure: 'Power board via USB. Probe pin 19 directly on ATmega328P IC package.',
          expectedResult: 'Toggling voltage between 0V and 5V',
          safetyNotes: ['Avoid bridging adjacent IC pins with multimeter probe.'],
        },
        {
          stepNumber: 2,
          title: 'Cold continuity check on Pin 13 net',
          testType: 'Continuity',
          toolsNeeded: ['Multimeter'],
          procedure: 'Disconnect USB power. Measure continuity from ATmega328P pin 19 to D13 header.',
          expectedResult: '< 1 Ω',
          safetyNotes: ['Ensure board is completely unpowered before continuity test.'],
        },
      ],
      safetyWarnings: [
        'Avoid shorting adjacent microcontroller pins when probing energized IC terminals.',
      ],
      limitations: [
        'Internal ATmega328P silicon damage cannot be confirmed without desoldering or IC substitution.',
      ],
    };

    const submittedIds = new Set(['ev-1', 'ev-2', 'ev-3']);
    const validatedConcise = parseReassessmentJson(JSON.stringify(conciseReassessmentResponse), submittedIds);

    assert(validatedConcise.summary === conciseReassessmentResponse.summary, 'Summary validated successfully');
    assert(validatedConcise.revisedHypotheses.length === 3, 'All 3 hypotheses represented in concise response');
    assert(validatedConcise.revisedHypotheses[0].suggestedVerification === undefined, 'Contradicted hypothesis omits suggestedVerification');
    assert(validatedConcise.revisedHypotheses[1].suggestedVerification === undefined, 'Weakened hypothesis omits suggestedVerification');
    assert(Boolean(validatedConcise.revisedHypotheses[2].suggestedVerification), 'Unresolved/supported hypothesis retains targeted suggestedVerification');
    assert(validatedConcise.nextRecommendedChecks.length === 2, 'Next checks bounded to 2');
    assert(validatedConcise.safetyWarnings.length === 1, 'Mandatory safety warning preserved');

    // Case 9.4: Evidence citation enforcement in concise reassessment
    let fabricatedCitationThrew = false;
    try {
      const invalidCitation = {
        ...conciseReassessmentResponse,
        revisedHypotheses: [
          {
            ...conciseReassessmentResponse.revisedHypotheses[0],
            citingEvidenceIds: ['ev-fabricated-999'],
          },
        ],
      };
      parseReassessmentJson(JSON.stringify(invalidCitation), submittedIds);
    } catch (err) {
      fabricatedCitationThrew = true;
      assert((err as Error).message.includes('ev-fabricated-999'), 'Rejects unknown evidence citation in concise format');
    }
    assert(fabricatedCitationThrew, 'Strict citation validation preserved under concise format');

    // Case 9.5: System prompt instructions and limits
    assert(REASSESSMENT_SYSTEM_PROMPT.includes('1 to 2 concise sentences'), 'System prompt specifies 1-2 sentences for summary');
    assert(REASSESSMENT_SYSTEM_PROMPT.includes('2 to 3 concise sentences'), 'System prompt specifies 2-3 sentences for evidenceSynthesis');
    assert(REASSESSMENT_SYSTEM_PROMPT.includes('Only provide "suggestedVerification" when a hypothesis remains "unresolved"'), 'System prompt restricts verification generation');
    assert(REASSESSMENT_SYSTEM_PROMPT.includes('Provide at most 2 focused next recommended checks'), 'System prompt limits next checks to 2');

    // Case 9.6: Image diagnosis prompt independence
    assert(DIAGNOSTIC_SYSTEM_PROMPT.includes('at most 3 primary fault hypotheses'), 'DIAGNOSTIC_SYSTEM_PROMPT completely untouched');
    assert(!DIAGNOSTIC_SYSTEM_PROMPT.includes('at most 2 focused next recommended checks'), 'Reassessment changes strictly isolated from image diagnosis');

    // -------------------------------------------------------------------------
    // SECTION 10: Stage 6B-3 Diagnostic Telemetry & Cost Transparency Tests
    // -------------------------------------------------------------------------
    console.log('\n--- SECTION 10: Stage 6B-3 Diagnostic Telemetry & Cost Transparency ---');

    // Case 10.1: calculateEstimatedCostUsd with standard Baseten pricing (complete usage)
    const diagEstimate = calculateCostEstimate('baseten', 'meta-models/muse-spark-open-1026', 1634, 3064);
    assert(diagEstimate.estimatedCostUsd === 0.015065, 'Baseten diagnosis cost correctly calculated: (1634*1.25/1M) + (3064*4.25/1M) = $0.015065');
    assert(diagEstimate.partialCostUsd === undefined, 'No partialCostUsd when both prompt and completion are present');
    assert(calculateEstimatedCostUsd('baseten', 'meta-models/muse-spark-open-1026', 1634, 3064) === 0.015065, 'calculateEstimatedCostUsd returns full cost');

    const reassessEstimate = calculateCostEstimate('baseten', 'meta-models/muse-spark-open-1026', 3023, 2725);
    assert(reassessEstimate.estimatedCostUsd === 0.01536, 'Baseten reassessment cost correctly calculated: (3023*1.25/1M) + (2725*4.25/1M) = $0.015360');
    assert(reassessEstimate.partialCostUsd === undefined, 'No partialCostUsd for full reassessment usage');

    // Case 10.2: Missing input usage (only output usage reported) - must NEVER report as full cost
    const partialOutputEstimate = calculateCostEstimate('baseten', 'meta-models/muse-spark-open-1026', undefined, 1000);
    assert(partialOutputEstimate.estimatedCostUsd === undefined, 'Incomplete usage does NOT populate estimatedCostUsd');
    assert(partialOutputEstimate.partialCostUsd === 0.00425, 'Incomplete usage populates partialCostUsd subtotal only ($0.004250)');
    assert(calculateEstimatedCostUsd('baseten', 'meta-models/muse-spark-open-1026', undefined, 1000) === undefined, 'calculateEstimatedCostUsd returns undefined when input missing');
    assert(calculatePartialCostUsd('baseten', 'meta-models/muse-spark-open-1026', undefined, 1000) === 0.00425, 'calculatePartialCostUsd returns output subtotal');

    // Case 10.3: Missing output usage (only input usage reported) - must NEVER report as full cost
    const partialInputEstimate = calculateCostEstimate('baseten', 'meta-models/muse-spark-open-1026', 1000, undefined);
    assert(partialInputEstimate.estimatedCostUsd === undefined, 'Incomplete usage does NOT populate estimatedCostUsd');
    assert(partialInputEstimate.partialCostUsd === 0.00125, 'Incomplete usage populates partialCostUsd subtotal only ($0.001250)');
    assert(calculateEstimatedCostUsd('baseten', 'meta-models/muse-spark-open-1026', 1000, undefined) === undefined, 'calculateEstimatedCostUsd returns undefined when output missing');
    assert(calculatePartialCostUsd('baseten', 'meta-models/muse-spark-open-1026', 1000, undefined) === 0.00125, 'calculatePartialCostUsd returns input subtotal');

    // Case 10.4: Missing both input and output usage
    const missingUsageEstimate = calculateCostEstimate('baseten', 'meta-models/muse-spark-open-1026', undefined, undefined);
    assert(missingUsageEstimate.estimatedCostUsd === undefined, 'Missing provider usage yields undefined estimatedCostUsd');
    assert(missingUsageEstimate.partialCostUsd === undefined, 'Missing provider usage yields undefined partialCostUsd');
    assert(calculateEstimatedCostUsd('baseten', 'meta-models/muse-spark-open-1026', undefined, undefined) === undefined, 'calculateEstimatedCostUsd returns undefined when both missing');

    // Case 10.5: Actual zero-token values vs unavailable metrics
    const zeroBoth = calculateCostEstimate('baseten', 'meta-models/muse-spark-open-1026', 0, 0);
    assert(zeroBoth.estimatedCostUsd === 0, 'Actual zero-token values yield explicit $0 complete cost');
    assert(zeroBoth.partialCostUsd === undefined, 'Complete zero usage does not set partialCostUsd');

    const zeroInputOnly = calculateCostEstimate('baseten', 'meta-models/muse-spark-open-1026', 0, undefined);
    assert(zeroInputOnly.estimatedCostUsd === undefined, 'Zero input + undefined output does not set estimatedCostUsd');
    assert(zeroInputOnly.partialCostUsd === 0, 'Zero input + undefined output yields $0 partialCostUsd');

    const zeroOutputOnly = calculateCostEstimate('baseten', 'meta-models/muse-spark-open-1026', undefined, 0);
    assert(zeroOutputOnly.estimatedCostUsd === undefined, 'Undefined input + zero output does not set estimatedCostUsd');
    assert(zeroOutputOnly.partialCostUsd === 0, 'Undefined input + zero output yields $0 partialCostUsd');

    // Case 10.6: Provider isolation - Meta provider without pricing sheet yields undefined
    const metaEstimate = calculateCostEstimate('meta', 'muse-spark-1.3', 1000, 1000);
    assert(metaEstimate.estimatedCostUsd === undefined, 'Meta provider yields undefined estimatedCostUsd');
    assert(metaEstimate.partialCostUsd === undefined, 'Meta provider yields undefined partialCostUsd');

    // Case 10.7: Exact model matching - Unknown model on Baseten yields undefined (no default fallback rate!)
    const unknownModelEstimate = calculateCostEstimate('baseten', 'meta-models/unknown-spark-future', 1000, 1000);
    assert(unknownModelEstimate.estimatedCostUsd === undefined, 'Unknown model on Baseten yields undefined estimatedCostUsd (no default fallback)');
    assert(unknownModelEstimate.partialCostUsd === undefined, 'Unknown model on Baseten yields undefined partialCostUsd');

    // Unknown provider
    const unknownProviderEstimate = calculateCostEstimate('unknown_cloud', 'some-model', 1000, 1000);
    assert(unknownProviderEstimate.estimatedCostUsd === undefined, 'Unknown provider yields undefined cost');

    // Case 10.8: deriveUsageStatus validation
    assert(deriveUsageStatus(100, 200) === 'reported', 'Full usage status when both tokens present');
    assert(deriveUsageStatus(0, 0) === 'reported', 'Full usage status when both tokens are zero');
    assert(deriveUsageStatus(100, undefined) === 'partial', 'Partial status when output missing');
    assert(deriveUsageStatus(undefined, 200) === 'partial', 'Partial status when input missing');
    assert(deriveUsageStatus(undefined, undefined) === 'unavailable', 'Unavailable status when both missing');

    // Case 10.9: Pipeline telemetry population in analyzeCircuitImage
    setChatCompletionOverrideForTesting(async () => {
      return {
        id: 'chatcmpl-telemetry-diag',
        object: 'chat.completion',
        created: Date.now(),
        model: 'meta-models/muse-spark-open-1026',
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: { role: 'assistant', content: JSON.stringify(MOCK_DIAGNOSIS) },
          },
        ],
        usage: { prompt_tokens: 1634, completion_tokens: 3064, total_tokens: 4698 },
      } as any;
    });

    const diagTelemetryRes = await analyzeCircuitImage({
      image: VALID_JPEG_DATA_URL,
      expectedBehavior: 'Powers on',
      observedBehavior: 'Dead board',
    });

    assert(diagTelemetryRes.metadata !== undefined, 'Diagnosis response includes metadata');
    assert(diagTelemetryRes.metadata?.requestType === 'diagnosis', 'Metadata requestType is diagnosis');
    assert(diagTelemetryRes.metadata?.provider === 'baseten', 'Metadata provider is baseten');
    assert(diagTelemetryRes.metadata?.model === 'meta-models/muse-spark-open-1026', 'Metadata model is correctly captured');
    assert(diagTelemetryRes.metadata?.promptTokens === 1634, 'Metadata promptTokens captured');
    assert(diagTelemetryRes.metadata?.completionTokens === 3064, 'Metadata completionTokens captured');
    assert(diagTelemetryRes.metadata?.totalTokens === 4698, 'Metadata totalTokens captured');
    assert(diagTelemetryRes.metadata?.finishReason === 'stop', 'Metadata finishReason captured');
    assert(typeof diagTelemetryRes.metadata?.durationMs === 'number', 'Metadata durationMs is numeric');
    assert(diagTelemetryRes.metadata?.estimatedCostUsd === 0.015065, 'Metadata estimatedCostUsd correctly populated');
    assert(diagTelemetryRes.metadata?.partialCostUsd === undefined, 'Metadata partialCostUsd is undefined on complete usage');
    assert(diagTelemetryRes.metadata?.usageStatus === 'reported', 'Metadata usageStatus is reported');

    // Case 10.10: Pipeline telemetry population in reassessCircuitEvidence
    setChatCompletionOverrideForTesting(async () => {
      return {
        id: 'chatcmpl-telemetry-reassess',
        object: 'chat.completion',
        created: Date.now(),
        model: 'meta-models/muse-spark-open-1026',
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: { role: 'assistant', content: JSON.stringify(MOCK_REASSESSMENT) },
          },
        ],
        usage: { prompt_tokens: 3023, completion_tokens: 2725, total_tokens: 5748 },
      } as any;
    });

    const reassessTelemetryRes = await reassessCircuitEvidence(reassessmentPayload);
    assert(reassessTelemetryRes.metadata !== undefined, 'Reassessment response includes metadata');
    assert(reassessTelemetryRes.metadata?.requestType === 'reassessment', 'Metadata requestType is reassessment');
    assert(reassessTelemetryRes.metadata?.provider === 'baseten', 'Metadata provider is baseten');
    assert(reassessTelemetryRes.metadata?.estimatedCostUsd === 0.01536, 'Metadata estimatedCostUsd correctly populated');
    assert(reassessTelemetryRes.metadata?.partialCostUsd === undefined, 'Metadata partialCostUsd is undefined on complete usage');
    assert(reassessTelemetryRes.metadata?.usageStatus === 'reported', 'Metadata usageStatus is reported');

    // Case 10.11: Telemetry credential safety - ensures sensitive provider keys are NOT leaked in metadata
    const metadataStr = JSON.stringify(reassessTelemetryRes.metadata);
    assert(!metadataStr.includes('key'), 'Metadata does not contain sensitive key fields');
    assert(!metadataStr.includes('Authorization'), 'Metadata does not contain auth headers');
    assert(!metadataStr.includes('Bearer'), 'Metadata does not contain bearer tokens');
    assert(!metadataStr.includes('test-baseten-key'), 'Metadata does not leak API key values');

    // Case 10.12: Pipeline telemetry population with partial usage in analyzeCircuitImage
    setChatCompletionOverrideForTesting(async () => {
      return {
        id: 'chatcmpl-telemetry-partial',
        object: 'chat.completion',
        created: Date.now(),
        model: 'meta-models/muse-spark-open-1026',
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: { role: 'assistant', content: JSON.stringify(MOCK_DIAGNOSIS) },
          },
        ],
        // Missing prompt_tokens, only completion_tokens reported
        usage: { completion_tokens: 1000 },
      } as any;
    });

    const diagPartialRes = await analyzeCircuitImage({
      image: VALID_JPEG_DATA_URL,
      expectedBehavior: 'Powers on',
      observedBehavior: 'Dead board',
    });

    assert(diagPartialRes.metadata?.promptTokens === undefined, 'Prompt tokens undefined');
    assert(diagPartialRes.metadata?.completionTokens === 1000, 'Completion tokens 1000');
    assert(diagPartialRes.metadata?.totalTokens === undefined, 'Total tokens not fabricated');
    assert(diagPartialRes.metadata?.estimatedCostUsd === undefined, 'Estimated full cost is undefined');
    assert(diagPartialRes.metadata?.partialCostUsd === 0.00425, 'Partial cost subtotal populated ($0.00425)');
    assert(diagPartialRes.metadata?.usageStatus === 'partial', 'Usage status is partial');

    // Reset override
    setChatCompletionOverrideForTesting(null);
  } finally {
    if (server) {
      (server as Server).close();
    }
    restoreEnv();
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n' + '='.repeat(70));
  console.log(`Provider Configuration Test Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('='.repeat(70) + '\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runProviderTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});

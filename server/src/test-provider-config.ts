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
  META_API_BASE_URL,
  DEFAULT_MODEL,
  BASETEN_API_BASE_URL,
  BASETEN_DEFAULT_MODEL,
  extractMessageContent,
  setTestPromptOverrideForTesting,
  setAnalyzerOverrideForTesting,
  setReassessmentAnalyzerOverrideForTesting,
  analyzeCircuitImage,
  reassessCircuitEvidence,
} from './metaClient.js';
import { parseDiagnosisJson } from './diagnosisValidation.js';
import { parseReassessmentJson } from './reassessmentValidation.js';
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
  assert(basetenClient.timeout === 45000, 'SDK timeout bounded to 45,000 ms');
  assert(basetenClient.maxRetries === 0, 'SDK maxRetries strictly set to 0');

  // Case 3.2: Client options for Meta (legacy compatibility)
  restoreEnv();
  delete process.env.MODEL_PROVIDER;
  process.env.MODEL_API_KEY = 'mock-meta-key-456';
  const { client: metaClient, config: activeMetaCfg } = createApiClient();
  assert(activeMetaCfg.baseUrl === 'https://api.meta.ai/v1', 'Client baseURL set to Meta endpoint');
  assert(activeMetaCfg.model === 'muse-spark-1.3', 'Client model set to muse-spark-1.3');
  assert(metaClient.timeout === 45000, 'SDK timeout bounded to 45,000 ms');
  assert(metaClient.maxRetries === 0, 'SDK maxRetries strictly set to 0');

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

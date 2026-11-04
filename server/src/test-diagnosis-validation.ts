/**
 * CircuitLens Stage 3 — Offline Tests for Diagnosis Request & Response Validation and Error Handling
 *
 * Verifies request validation, response validation, and credential/path error sanitization
 * without making any external API calls or consuming model credits.
 */

import {
  parseDiagnosisJson,
  validateDiagnosisResponse,
  DiagnosisValidationError,
  DiagnosisParsingError,
  LIMITS as RESPONSE_LIMITS,
} from './diagnosisValidation.js';
import {
  validateDiagnosisRequest,
  validateImageDataUrl,
  DiagnosisRequestValidationError,
  REQUEST_LIMITS,
} from './diagnosisRequestValidation.js';
import { handleApiError, MissingApiKeyError } from './metaClient.js';
import type { DiagnosisResponse } from './types/diagnosis.js';

// Minimal valid header signatures for testing
const VALID_JPEG_DATA_URL =
  'data:image/jpeg;base64,' +
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]).toString(
    'base64'
  );

const VALID_PNG_DATA_URL =
  'data:image/png;base64,' +
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]).toString(
    'base64'
  );

const VALID_WEBP_DATA_URL =
  'data:image/webp;base64,' +
  Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x14, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38,
    0x20,
  ]).toString('base64');

function getValidResponseFixture(): DiagnosisResponse {
  return {
    summary:
      'Visual inspection indicates plausible thermal stress on LDO regulator U2 with missing 3.3V rail.',
    visibleObservations: [
      {
        description: 'Slight surface discoloration and flux residue near AMS1117-3.3 pin 2 (VOUT).',
        evidence: 'Darkened epoxy package around SOT-223 package near silkscreen label U2.',
        confidence: 'medium',
      },
      {
        description: 'SMD decoupling capacitor C4 shows no obvious physical cracks or bridging.',
        evidence: 'Clean 0805 capacitor terminal fillets adjacent to U2 output trace.',
        confidence: 'high',
      },
    ],
    hypotheses: [
      {
        title: 'LDO Regulator Internal Thermal Breakdown or Overload',
        reasoning:
          'Input voltage is nominal (5.0V) but output voltage reads 0V with discoloration on U2 package.',
        supportingEvidence: [
          'Visible discoloration on U2 package.',
          'Downstream microcontroller does not power on.',
        ],
        confidence: 'medium',
        suggestedVerification:
          'Perform unpowered cold resistance check from U2 VOUT pin to GND.',
      },
    ],
    recommendedChecks: [
      {
        stepNumber: 1,
        title: 'Cold Resistance Measurement from 3.3V Rail to Ground',
        testType: 'Unpowered Resistance',
        toolsNeeded: ['Digital Multimeter', 'Fine Needle Probes'],
        procedure:
          'Disconnect all power sources. Set DMM to low-resistance range. Place black probe on GND and red probe on U2 pin 2 (tab).',
        expectedResult:
          'Reading greater than 50 Ohms. Reading near 0 Ohms indicates a shorted rail or decoupling cap.',
        safetyNotes: [
          'Ensure circuit is completely disconnected from power before taking resistance measurements.',
          'Discharge bulk capacitors before probing.',
        ],
      },
    ],
    limitations: [
      'Bottom side of the two-layer board is not visible in the supplied single-angle photograph.',
    ],
    safetyWarnings: [
      'Do not probe PCB while USB power is connected without eye protection.',
      'Never touch components with fingers while powered; thermal overload can cause burns.',
    ],
  };
}

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

function runTests() {
  console.log('='.repeat(70));
  console.log(' CircuitLens - Stage 3 Diagnostic Hardening & Offline Tests');
  console.log('='.repeat(70));

  // =========================================================================
  // SECTION 1: REQUEST VALIDATION TESTS
  // =========================================================================
  console.log('\n--- SECTION 1: Request Validation (diagnosisRequestValidation.ts) ---');

  // Case 1.1: Valid JPEG, PNG, and WebP data URLs
  console.log('\n[Case 1.1] Valid image MIME types and format signatures');
  try {
    const jpegRes = validateImageDataUrl(VALID_JPEG_DATA_URL);
    assert(jpegRes.mime === 'image/jpeg', 'Valid JPEG data URL accepted');

    const pngRes = validateImageDataUrl(VALID_PNG_DATA_URL);
    assert(pngRes.mime === 'image/png', 'Valid PNG data URL accepted');

    const webpRes = validateImageDataUrl(VALID_WEBP_DATA_URL);
    assert(webpRes.mime === 'image/webp', 'Valid WebP data URL accepted');

    const fullValidReq = validateDiagnosisRequest({
      image: VALID_JPEG_DATA_URL,
      expectedBehavior: 'Board should output 3.3V on test point TP1 when powered via 5V USB.',
      observedBehavior: 'TP1 measures 0V, power LED D1 is dark, MCU is unpowered.',
      boardName: 'Rev-2 Motor Controller',
      relevantComponents: 'U2 (AMS1117), C4, D1',
      additionalNotes: 'Measured 5.0V on input side of U2; no warm spots detected.',
    });
    assert(fullValidReq.boardName === 'Rev-2 Motor Controller', 'Complete valid request accepted');
    assert(fullValidReq.image === VALID_JPEG_DATA_URL, 'Image data URL preserved');
  } catch (err) {
    assert(false, 'Unexpected failure on valid request', String(err));
  }

  // Case 1.2: Unsupported MIME Types
  console.log('\n[Case 1.2] Unsupported MIME types');
  const unsupportedMimes = ['image/gif', 'application/pdf', 'image/bmp', 'text/plain'];
  for (const mime of unsupportedMimes) {
    try {
      validateImageDataUrl(`data:${mime};base64,QUJDRA==`);
      assert(false, `Should reject unsupported MIME "${mime}"`);
    } catch (err) {
      assert(err instanceof DiagnosisRequestValidationError, `Rejects unsupported MIME "${mime}"`);
    }
  }

  // Case 1.3: Malformed Data URLs and Invalid Base64
  console.log('\n[Case 1.3] Malformed data URLs and base64 corruption');
  const malformedUrls = [
    'not-a-data-url',
    'http://example.com/image.jpg',
    'data:image/jpeg;plain,ABC',
    'data:image/jpeg;base64,invalid!characters!@#$',
    'data:image/jpeg;base64,ABC', // length 3 (not a multiple of 4, invalid padding)
  ];
  for (const badUrl of malformedUrls) {
    try {
      validateImageDataUrl(badUrl);
      assert(false, `Should reject malformed URL "${badUrl.slice(0, 30)}"`);
    } catch (err) {
      assert(err instanceof DiagnosisRequestValidationError, `Rejects malformed URL: ${err instanceof Error ? err.message : ''}`);
    }
  }

  // Case 1.4: Mismatched Magic Bytes
  console.log('\n[Case 1.4] Mismatched container magic bytes');
  try {
    // Declared as JPEG but payload is PNG magic bytes
    const fakeJpeg = 'data:image/jpeg;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]).toString('base64');
    validateImageDataUrl(fakeJpeg);
    assert(false, 'Should reject JPEG with PNG header signature');
  } catch (err) {
    assert(err instanceof DiagnosisRequestValidationError, 'Rejects MIME/signature mismatch');
  }

  // Case 1.5: Empty Images and Images Exceeding Size Limit
  console.log('\n[Case 1.5] Empty images and size limit enforcement');
  try {
    validateImageDataUrl('');
    assert(false, 'Should reject empty image string');
  } catch (err) {
    assert(err instanceof DiagnosisRequestValidationError, 'Rejects empty image string');
  }

  try {
    // Test with a tight limit (10 bytes) against a 12-byte payload
    validateImageDataUrl(VALID_JPEG_DATA_URL, 10);
    assert(false, 'Should reject image exceeding configured size limit');
  } catch (err) {
    assert(err instanceof DiagnosisRequestValidationError, 'Rejects image exceeding maxBytes limit');
  }

  // Case 1.6: Missing or Whitespace-Only Required Symptom Fields
  console.log('\n[Case 1.6] Required symptom fields validation');
  try {
    validateDiagnosisRequest({
      image: VALID_JPEG_DATA_URL,
      expectedBehavior: '   ',
      observedBehavior: '0V on TP1',
    });
    assert(false, 'Should reject whitespace-only expectedBehavior');
  } catch (err) {
    assert(err instanceof DiagnosisRequestValidationError, 'Rejects whitespace-only expectedBehavior');
  }

  try {
    validateDiagnosisRequest({
      image: VALID_JPEG_DATA_URL,
      expectedBehavior: 'Nominal 3.3V',
      observedBehavior: '',
    });
    assert(false, 'Should reject empty observedBehavior');
  } catch (err) {
    assert(err instanceof DiagnosisRequestValidationError, 'Rejects empty observedBehavior');
  }

  // Case 1.7: Incorrect Types and Oversized Optional Fields
  console.log('\n[Case 1.7] Field types and bounds in request');
  try {
    validateDiagnosisRequest({
      image: VALID_JPEG_DATA_URL,
      expectedBehavior: 'Nominal 3.3V',
      observedBehavior: '0V on TP1',
      boardName: 12345, // Invalid type
    });
    assert(false, 'Should reject non-string boardName');
  } catch (err) {
    assert(err instanceof DiagnosisRequestValidationError, 'Rejects non-string boardName');
  }

  try {
    validateDiagnosisRequest({
      image: VALID_JPEG_DATA_URL,
      expectedBehavior: 'Nominal 3.3V',
      observedBehavior: '0V on TP1',
      boardName: 'X'.repeat(REQUEST_LIMITS.MAX_BOARD_NAME_LENGTH + 1),
    });
    assert(false, 'Should reject oversized boardName');
  } catch (err) {
    assert(err instanceof DiagnosisRequestValidationError, 'Rejects oversized boardName');
  }

  // =========================================================================
  // SECTION 2: ERROR NORMALIZATION & SENSITIVE DATA LEAK PREVENTION
  // =========================================================================
  console.log('\n--- SECTION 2: Error Normalization & Security (metaClient.ts) ---');

  // Case 2.1: Generic internal error sanitization
  console.log('\n[Case 2.1] Preventing internal error and filesystem path leaks');
  const sensitiveInternalError = new Error('ENOENT: no such file at C:\\Users\\Administrator\\secret\\config.key');
  const normalizedInternal = handleApiError(sensitiveInternalError);

  assert(normalizedInternal.statusCode === 500, 'Maps unexpected error to HTTP 500');
  assert(normalizedInternal.errorType === 'INTERNAL_ERROR', 'Assigns INTERNAL_ERROR code');
  assert(
    !normalizedInternal.message.includes('C:\\Users') &&
      !normalizedInternal.message.includes('secret') &&
      !normalizedInternal.message.includes('config.key'),
    'Raw error path/message is completely scrubbed from client output'
  );
  assert(
    normalizedInternal.message === 'An unexpected internal error occurred during diagnostic processing.',
    'Returns controlled generic message to client'
  );

  // Case 2.2: Diagnosis Request Validation Error mapping
  console.log('\n[Case 2.2] Mapping request validation errors');
  const requestValError = new DiagnosisRequestValidationError('Unsupported image format');
  const normalizedReq = handleApiError(requestValError);
  assert(normalizedReq.statusCode === 400, 'Maps validation error to HTTP 400');
  assert(normalizedReq.errorType === 'INVALID_REQUEST', 'Error type is INVALID_REQUEST');
  assert(normalizedReq.message === 'Unsupported image format', 'Preserves safe validation message');

  // Case 2.3: Missing API Key Error mapping
  console.log('\n[Case 2.3] Missing API key handling');
  const missingKeyError = new MissingApiKeyError('MODEL_API_KEY is not configured');
  const normalizedKey = handleApiError(missingKeyError);
  assert(normalizedKey.statusCode === 500, 'Maps missing API key to HTTP 500');
  assert(normalizedKey.errorType === 'MISSING_API_KEY', 'Error type is MISSING_API_KEY');

  // =========================================================================
  // SECTION 3: RESPONSE PARSING & VALIDATION INTEGRITY
  // =========================================================================
  console.log('\n--- SECTION 3: Response Parsing & Validation (diagnosisValidation.ts) ---');

  // Case 3.1: Valid Diagnosis Response
  console.log('\n[Case 3.1] Valid diagnosis fixture verification');
  const validResp = getValidResponseFixture();
  const validated = validateDiagnosisResponse(validResp);
  assert(validated.summary === validResp.summary, 'Valid response validated successfully');
  assert(validated.visibleObservations.length === 2, 'Visible observations count preserved');
  assert(validated.hypotheses.length === 1, 'Hypotheses count preserved');
  assert(validated.recommendedChecks.length === 1, 'Recommended checks count preserved');

  // Case 3.2: Fenced JSON unwrapping
  console.log('\n[Case 3.2] Fenced markdown JSON unwrapping');
  const fenced = `\`\`\`json\n${JSON.stringify(validResp)}\n\`\`\``;
  const parsedFenced = parseDiagnosisJson(fenced);
  assert(parsedFenced.summary === validResp.summary, 'Successfully parses fenced JSON object');

  // Case 3.3: Invalid confidence level rejection
  console.log('\n[Case 3.3] Rejection of invalid confidence levels');
  try {
    const badConfidence = getValidResponseFixture();
    (badConfidence.visibleObservations[0] as unknown as Record<string, unknown>).confidence = 'unlikely';
    validateDiagnosisResponse(badConfidence);
    assert(false, 'Should reject non-enum confidence');
  } catch (err) {
    assert(err instanceof DiagnosisValidationError, 'Rejects non-enum confidence ("unlikely")');
  }

  // Case 3.4: Bounded response protection
  console.log('\n[Case 3.4] Response output bounds');
  try {
    const hugeSummary = getValidResponseFixture();
    hugeSummary.summary = 'X'.repeat(RESPONSE_LIMITS.MAX_SUMMARY_LENGTH + 1);
    validateDiagnosisResponse(hugeSummary);
    assert(false, 'Should reject summary exceeding limit');
  } catch (err) {
    assert(err instanceof DiagnosisValidationError, 'Enforces max summary length bound');
  }

  // Case 3.5: String-to-array safe normalization without data loss
  console.log('\n[Case 3.5] String-to-array safe normalization');
  const stringifiedListsFixture: any = getValidResponseFixture();
  stringifiedListsFixture.safetyWarnings = 'Ensure main disconnect is open before touching circuit traces.';
  stringifiedListsFixture.limitations = 'Single camera perspective limits visibility of obscured leads.';
  stringifiedListsFixture.hypotheses[0].supportingEvidence = 'Discolored resistor package';
  stringifiedListsFixture.recommendedChecks[0].toolsNeeded = 'Digital Multimeter';
  stringifiedListsFixture.recommendedChecks[0].safetyNotes = 'Wear protective eyewear';

  const normalizedStringLists = validateDiagnosisResponse(stringifiedListsFixture);
  assert(Array.isArray(normalizedStringLists.safetyWarnings), 'Normalized safetyWarnings to array');
  assert(normalizedStringLists.safetyWarnings[0].includes('Ensure main disconnect'), 'Preserved safety warning text');
  assert(Array.isArray(normalizedStringLists.limitations), 'Normalized limitations to array');
  assert(normalizedStringLists.limitations[0].includes('Single camera perspective'), 'Preserved limitation text');
  assert(Array.isArray(normalizedStringLists.hypotheses[0].supportingEvidence), 'Normalized supportingEvidence to array');
  assert(Array.isArray(normalizedStringLists.recommendedChecks[0].toolsNeeded), 'Normalized toolsNeeded to array');
  assert(Array.isArray(normalizedStringLists.recommendedChecks[0].safetyNotes), 'Normalized safetyNotes to array');

  // Case 3.6: Confidence casing and synonym normalization
  console.log('\n[Case 3.6] Confidence casing and synonym normalization');
  const mixedConfidenceFixture: any = getValidResponseFixture();
  mixedConfidenceFixture.visibleObservations[0].confidence = 'High';
  mixedConfidenceFixture.visibleObservations[1].confidence = ' MEDIUM ';
  mixedConfidenceFixture.hypotheses[0].confidence = 'moderate';
  const normalizedConfidence = validateDiagnosisResponse(mixedConfidenceFixture);
  assert(normalizedConfidence.visibleObservations[0].confidence === 'high', 'Normalized "High" to "high"');
  assert(normalizedConfidence.visibleObservations[1].confidence === 'medium', 'Normalized " MEDIUM " to "medium"');
  assert(normalizedConfidence.hypotheses[0].confidence === 'medium', 'Normalized "moderate" to "medium"');

  // Case 3.7: Step number string parsing
  console.log('\n[Case 3.7] Step number string parsing and invalid rejection');
  const stringStepFixture: any = getValidResponseFixture();
  stringStepFixture.recommendedChecks[0].stepNumber = '1';
  const normalizedStep = validateDiagnosisResponse(stringStepFixture);
  assert(normalizedStep.recommendedChecks[0].stepNumber === 1, 'Normalized string stepNumber "1" to integer 1');

  try {
    const invalidStepFixture: any = getValidResponseFixture();
    invalidStepFixture.recommendedChecks[0].stepNumber = '0';
    validateDiagnosisResponse(invalidStepFixture);
    assert(false, 'Should reject stepNumber 0');
  } catch (err) {
    assert(err instanceof DiagnosisValidationError, 'Rejects non-positive stepNumber');
  }

  try {
    const nonNumericStepFixture: any = getValidResponseFixture();
    nonNumericStepFixture.recommendedChecks[0].stepNumber = 'step_one';
    validateDiagnosisResponse(nonNumericStepFixture);
    assert(false, 'Should reject non-numeric stepNumber string');
  } catch (err) {
    assert(err instanceof DiagnosisValidationError, 'Rejects non-numeric stepNumber');
  }

  // Case 3.8: Optional limitations fallback to empty array
  console.log('\n[Case 3.8] Optional limitations fallback to empty array');
  const omittedLimitationsFixture: any = getValidResponseFixture();
  delete omittedLimitationsFixture.limitations;
  const normalizedOmittedLimitations = validateDiagnosisResponse(omittedLimitationsFixture);
  assert(Array.isArray(normalizedOmittedLimitations.limitations), 'Omitted limitations defaults to array');
  assert(normalizedOmittedLimitations.limitations.length === 0, 'Omitted limitations defaults to empty array []');

  // Case 3.9: Mandatory safety warnings enforcement
  console.log('\n[Case 3.9] Mandatory safety warnings enforcement');
  try {
    const emptyWarningsFixture: any = getValidResponseFixture();
    emptyWarningsFixture.safetyWarnings = [];
    validateDiagnosisResponse(emptyWarningsFixture);
    assert(false, 'Should reject empty safetyWarnings array');
  } catch (err) {
    assert(err instanceof DiagnosisValidationError, 'Rejects empty safetyWarnings array');
  }

  try {
    const missingWarningsFixture: any = getValidResponseFixture();
    delete missingWarningsFixture.safetyWarnings;
    validateDiagnosisResponse(missingWarningsFixture);
    assert(false, 'Should reject missing safetyWarnings');
  } catch (err) {
    assert(err instanceof DiagnosisValidationError, 'Rejects missing safetyWarnings');
  }

  // Case 3.10: Structural rejection of missing core fields
  console.log('\n[Case 3.10] Structural rejection of missing core fields');
  try {
    const missingSummary: any = getValidResponseFixture();
    delete missingSummary.summary;
    validateDiagnosisResponse(missingSummary);
    assert(false, 'Should reject missing summary');
  } catch (err) {
    assert(err instanceof DiagnosisValidationError, 'Rejects missing summary');
  }

  try {
    const missingHypotheses: any = getValidResponseFixture();
    delete missingHypotheses.hypotheses;
    validateDiagnosisResponse(missingHypotheses);
    assert(false, 'Should reject missing hypotheses');
  } catch (err) {
    assert(err instanceof DiagnosisValidationError, 'Rejects missing hypotheses');
  }

  try {
    const missingChecks: any = getValidResponseFixture();
    delete missingChecks.recommendedChecks;
    validateDiagnosisResponse(missingChecks);
    assert(false, 'Should reject missing recommendedChecks');
  } catch (err) {
    assert(err instanceof DiagnosisValidationError, 'Rejects missing recommendedChecks');
  }

  // Case 3.11: Basic, Standard, and Advanced depth payloads
  console.log('\n[Case 3.11] Analysis depth payload preservation');
  const basicFixture: any = getValidResponseFixture();
  basicFixture.analysisDepth = 'basic';
  const validatedBasic = validateDiagnosisResponse(basicFixture);
  assert(validatedBasic.analysisDepth === 'basic', 'Preserves basic analysis depth');

  const advancedFixture: any = getValidResponseFixture();
  advancedFixture.analysisDepth = 'advanced';
  advancedFixture.circuitUnderstanding = {
    operatingPrinciple: 'Buck converter step-down regulator.',
    expectedBehavior: 'Converts 12V to stable 3.3V.',
    failureMechanismTheory: 'Overcurrent causes thermal shutdown.',
    relevantComponents: [{ designator: 'U2', function: 'Regulator', status: 'confirmed' }],
  };
  const validatedAdvanced = validateDiagnosisResponse(advancedFixture);
  assert(validatedAdvanced.analysisDepth === 'advanced', 'Preserves advanced analysis depth');
  assert(Boolean(validatedAdvanced.circuitUnderstanding?.operatingPrinciple.includes('Buck converter')), 'Preserves circuit understanding');

  // Case 3.12: Truncated JSON / unclosed think block parsing rejection
  console.log('\n[Case 3.12] Truncated JSON and malformed output handling');
  try {
    parseDiagnosisJson('<think>Analyzing circuit image step 1... Still thinking...');
    assert(false, 'Should reject unclosed <think> tag');
  } catch (err) {
    assert(err instanceof DiagnosisParsingError, 'Rejects truncated reasoning block with DiagnosisParsingError');
  }

  try {
    parseDiagnosisJson('{"summary": "Broken trace", "visibleObservations": [');
    assert(false, 'Should reject truncated JSON');
  } catch (err) {
    assert(err instanceof DiagnosisParsingError, 'Rejects truncated JSON with DiagnosisParsingError');
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log(`Test Execution Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('='.repeat(70));

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();

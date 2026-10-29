/**
 * CircuitLens Stage 3 — Substage 3: Endpoint Integration Tests
 *
 * Starts the Express application on an ephemeral port and tests endpoint routing,
 * request validation, credit protection, error middleware, and response shapes using native fetch.
 * ZERO external API calls or model credits are used.
 */

// Set NODE_ENV to test to prevent auto-starting app.listen on port 4000
process.env.NODE_ENV = 'test';

import type { Server } from 'http';
import type { AddressInfo } from 'net';
import app from './index.js';
import {
  setAnalyzerOverrideForTesting,
  DiagnosisValidationError,
  DiagnosisParsingError,
} from './metaClient.js';
import type { DiagnosisResponse } from './types/diagnosis.js';

let server: Server;
let baseUrl: string;
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

const VALID_JPEG_DATA_URL =
  'data:image/jpeg;base64,' +
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]).toString(
    'base64'
  );

const MOCK_DIAGNOSIS: DiagnosisResponse = {
  summary: 'Thermal breakdown detected on AMS1117 regulator U2.',
  visibleObservations: [
    {
      description: 'Discoloration on U2 package tab.',
      evidence: 'Darkened epoxy package around SOT-223.',
      confidence: 'high',
    },
  ],
  hypotheses: [
    {
      title: 'Short circuit on 3.3V rail causing LDO thermal overload.',
      reasoning: 'Input 5V rail is active but 3.3V measures 0V.',
      supportingEvidence: ['Package discoloration', 'Missing 3.3V rail'],
      confidence: 'medium',
      suggestedVerification: 'Measure cold resistance between U2 VOUT and GND.',
    },
  ],
  recommendedChecks: [
    {
      stepNumber: 1,
      title: 'Unpowered continuity check',
      testType: 'Cold Resistance',
      toolsNeeded: ['Digital Multimeter'],
      procedure: 'Disconnect power. Place DMM on resistance mode and probe VOUT to GND.',
      expectedResult: 'Reading > 50 Ohms.',
      safetyNotes: ['Ensure board is unpowered before probing resistance.'],
    },
  ],
  limitations: ['Single angle photo; underside of board not visible.'],
  safetyWarnings: ['Do not probe while powered.'],
};

async function runEndpointTests() {
  console.log('='.repeat(70));
  console.log(' CircuitLens - Stage 3 Substage 3: Endpoint Integration Tests');
  console.log('='.repeat(70));

  // Start Express on ephemeral port (port 0)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      console.log(`Ephemeral test server listening on ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // -----------------------------------------------------------------------
    // Test 1: GET /api/health
    // -----------------------------------------------------------------------
    console.log('[Test 1] Health check endpoint (GET /api/health)');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthJson = (await healthRes.json()) as Record<string, unknown>;
    assert(healthRes.status === 200, 'GET /api/health returns HTTP 200');
    assert(healthJson.status === 'ok', 'Status is "ok"');
    assert(healthJson.service === 'CircuitLens Backend API', 'Service name matches');

    // -----------------------------------------------------------------------
    // Test 2: GET /api/test-meta (missing key handling)
    // -----------------------------------------------------------------------
    console.log('\n[Test 2] Meta test endpoint with missing key (GET /api/test-meta)');
    const savedModelKey = process.env.MODEL_API_KEY;
    const savedBasetenKey = process.env.BASETEN_API_KEY;
    delete process.env.MODEL_API_KEY;
    delete process.env.BASETEN_API_KEY;
    try {
      const metaTestRes = await fetch(`${baseUrl}/api/test-meta`);
      const metaTestJson = (await metaTestRes.json()) as Record<string, unknown>;
      assert(metaTestRes.status === 500, 'GET /api/test-meta returns HTTP 500 when key missing');
      assert(metaTestJson.errorType === 'MISSING_API_KEY', 'Error type is MISSING_API_KEY');
    } finally {
      if (savedModelKey !== undefined) process.env.MODEL_API_KEY = savedModelKey;
      if (savedBasetenKey !== undefined) process.env.BASETEN_API_KEY = savedBasetenKey;
    }

    // -----------------------------------------------------------------------
    // Test 3: POST /api/diagnose - Valid request with mock analyzer (HTTP 200)
    // -----------------------------------------------------------------------
    console.log('\n[Test 3] Successful diagnosis flow (POST /api/diagnose)');
    let analyzerCallCount = 0;
    setAnalyzerOverrideForTesting(async (req) => {
      analyzerCallCount++;
      assert(req.boardName === 'TestBoard-1', 'Analyzer received sanitized request payload');
      return MOCK_DIAGNOSIS;
    });

    const validPayload = {
      image: VALID_JPEG_DATA_URL,
      expectedBehavior: 'Board boots with green LED on and 3.3V rail active.',
      observedBehavior: 'Board does not boot, LED dark, 3.3V measures 0V.',
      boardName: 'TestBoard-1',
      relevantComponents: 'U2, C4',
      additionalNotes: 'Measured 5V on input side.',
    };

    const diagRes = await fetch(`${baseUrl}/api/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const diagJson = (await diagRes.json()) as DiagnosisResponse;
    assert(diagRes.status === 200, 'Valid diagnosis returns HTTP 200');
    assert(diagJson.summary === MOCK_DIAGNOSIS.summary, 'Summary matches DiagnosisResponse');
    assert(Array.isArray(diagJson.visibleObservations), 'Observations array is present');
    assert(Array.isArray(diagJson.hypotheses), 'Hypotheses array is present');
    assert(Array.isArray(diagJson.recommendedChecks), 'Recommended checks array is present');
    assert(analyzerCallCount === 1, 'Analyzer was called exactly once for valid request');

    // -----------------------------------------------------------------------
    // Test 4: Credit Protection - Invalid request does NOT invoke model (HTTP 400)
    // -----------------------------------------------------------------------
    console.log('\n[Test 4] Credit Protection: Invalid symptom fields (missing expectedBehavior)');
    analyzerCallCount = 0; // reset counter

    const invalidSymptomPayload = {
      image: VALID_JPEG_DATA_URL,
      expectedBehavior: '   ', // whitespace only
      observedBehavior: '0V on TP1',
    };

    const invalidSymptomRes = await fetch(`${baseUrl}/api/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidSymptomPayload),
    });

    const invalidSymptomJson = (await invalidSymptomRes.json()) as Record<string, unknown>;
    assert(invalidSymptomRes.status === 400, 'Rejects invalid symptom with HTTP 400');
    assert(invalidSymptomJson.errorType === 'INVALID_REQUEST', 'Error type is INVALID_REQUEST');
    assert(analyzerCallCount === 0, 'CREDIT PROTECTION: Model was NOT called when request validation failed');

    // -----------------------------------------------------------------------
    // Test 5: Credit Protection - Unsupported image format (HTTP 400)
    // -----------------------------------------------------------------------
    console.log('\n[Test 5] Credit Protection: Unsupported image format (image/gif)');
    analyzerCallCount = 0;

    const gifPayload = {
      image: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      expectedBehavior: 'Board boots',
      observedBehavior: 'Board dark',
    };

    const gifRes = await fetch(`${baseUrl}/api/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gifPayload),
    });

    const gifJson = (await gifRes.json()) as Record<string, unknown>;
    assert(gifRes.status === 400, 'Rejects unsupported GIF image with HTTP 400');
    assert(typeof gifJson.message === 'string' && gifJson.message.includes('Unsupported image MIME type'), 'Informs user of supported MIME types');
    assert(analyzerCallCount === 0, 'CREDIT PROTECTION: Model was NOT called for unsupported MIME');

    // -----------------------------------------------------------------------
    // Test 6: Credit Protection - Container format / magic bytes mismatch (HTTP 400)
    // -----------------------------------------------------------------------
    console.log('\n[Test 6] Credit Protection: Declared MIME does not match magic bytes');
    analyzerCallCount = 0;

    const fakeJpegPayload = {
      image: 'data:image/jpeg;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]).toString('base64'),
      expectedBehavior: 'Board boots',
      observedBehavior: 'Board dark',
    };

    const fakeJpegRes = await fetch(`${baseUrl}/api/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fakeJpegPayload),
    });

    assert(fakeJpegRes.status === 400, 'Rejects MIME/signature mismatch with HTTP 400');
    assert(analyzerCallCount === 0, 'CREDIT PROTECTION: Model was NOT called on signature mismatch');

    // -----------------------------------------------------------------------
    // Test 7: Malformed JSON body in request (HTTP 400)
    // -----------------------------------------------------------------------
    console.log('\n[Test 7] Body parser error: Malformed JSON body');
    const malformedJsonRes = await fetch(`${baseUrl}/api/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"image": "data:... incomplete json',
    });

    const malformedJson = (await malformedJsonRes.json()) as Record<string, unknown>;
    assert(malformedJsonRes.status === 400, 'Malformed JSON returns HTTP 400');
    assert(malformedJson.errorType === 'INVALID_JSON', 'Error type is INVALID_JSON');

    // -----------------------------------------------------------------------
    // Test 8: Oversized payload on 100 KB general route (HTTP 413)
    // -----------------------------------------------------------------------
    console.log('\n[Test 8] Body parser limit: Oversized payload on general route (/api/test-meta)');
    const largePrompt = 'A'.repeat(120 * 1024); // 120 KB (> 100 KB general limit)
    const largeRes = await fetch(`${baseUrl}/api/test-meta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: largePrompt }),
    });

    const largeJson = (await largeRes.json()) as Record<string, unknown>;
    assert(largeRes.status === 413, 'General route rejects >100 KB payload with HTTP 413');
    assert(largeJson.errorType === 'PAYLOAD_TOO_LARGE', 'Error type is PAYLOAD_TOO_LARGE');

    // -----------------------------------------------------------------------
    // Test 9: Model schema validation failure normalization (HTTP 502)
    // -----------------------------------------------------------------------
    console.log('\n[Test 9] Model output error: Schema validation failure (HTTP 502)');
    setAnalyzerOverrideForTesting(async () => {
      throw new DiagnosisValidationError('Field "summary" is missing from model output.');
    });

    const schemaFailRes = await fetch(`${baseUrl}/api/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const schemaFailJson = (await schemaFailRes.json()) as Record<string, unknown>;
    assert(schemaFailRes.status === 502, 'Schema error maps to HTTP 502');
    assert(schemaFailJson.errorType === 'SCHEMA_VALIDATION_ERROR', 'Error type is SCHEMA_VALIDATION_ERROR');

    // -----------------------------------------------------------------------
    // Test 10: Model parsing failure normalization (HTTP 502)
    // -----------------------------------------------------------------------
    console.log('\n[Test 10] Model output error: Invalid JSON parsing failure (HTTP 502)');
    setAnalyzerOverrideForTesting(async () => {
      throw new DiagnosisParsingError('Model output is not valid JSON.');
    });

    const parseFailRes = await fetch(`${baseUrl}/api/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload),
    });

    const parseFailJson = (await parseFailRes.json()) as Record<string, unknown>;
    assert(parseFailRes.status === 502, 'Parse error maps to HTTP 502');
    assert(parseFailJson.errorType === 'INVALID_MODEL_OUTPUT', 'Error type is INVALID_MODEL_OUTPUT');
  } finally {
    // Reset test override
    setAnalyzerOverrideForTesting(null);

    // Close server cleanly
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    console.log('\nEphemeral test server closed.');
  }

  // Summary
  console.log('='.repeat(70));
  console.log(`Endpoint Integration Tests Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('='.repeat(70));

  if (failedCount > 0) {
    process.exit(1);
  }
}

runEndpointTests().catch((err) => {
  console.error('Unhandled failure in endpoint tests:', err);
  process.exit(1);
});

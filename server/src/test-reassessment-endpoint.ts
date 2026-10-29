/**
 * CircuitLens Stage 4B-2 — Endpoint Integration Tests for POST /api/reassess
 *
 * Starts the Express application on an ephemeral port and tests:
 * - Successful reassessment flow with mock analyzer
 * - Credit protection on invalid requests (empty evidence, >20 records, bad enum, broken pair)
 * - Malformed request body handling
 * - Supersession history reaching inference with full context
 * - User prompt safety framing (no new image inspection, untrusted user data)
 * - Safe handling of model schema validation failures, parsing errors, hallucinated citations, and missing safety warnings
 * - Upstream Meta-client failures (timeout, internal errors)
 * - ZERO live API calls, zero credit consumption.
 */

// Set NODE_ENV to test to prevent auto-starting app.listen on port 4000
process.env.NODE_ENV = 'test';

import type { Server } from 'http';
import type { AddressInfo } from 'net';
import OpenAI from 'openai';
import app from './index.js';
import {
  setReassessmentAnalyzerOverrideForTesting,
  buildReassessmentUserPrompt,
  ReassessmentValidationError,
  ReassessmentParsingError,
} from './metaClient.js';
import type {
  DiagnosisReassessmentRequest,
  DiagnosisReassessmentResponse,
} from './types/diagnosis.js';

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

const VALID_REASSESSMENT_PAYLOAD: DiagnosisReassessmentRequest = {
  diagnosticContext: {
    boardName: 'STM32-H7 Motor Driver',
    expectedBehavior: 'Board powers up from 24V supply and outputs 3.3V on TP1 with blue LED illuminated.',
    observedBehavior: 'No LED activity; 3.3V rail reads 0V; bench PSU shows 450mA current draw at 24V.',
    relevantComponents: 'U3 (LDO), C12 (bulk cap)',
    additionalNotes: 'Board operated for 1 hour before thermal shutdown.',
    initialSummary: 'Visual analysis suggests thermal failure or short circuit near 3.3V power regulator U3.',
    visibleObservations: [
      {
        description: 'Slight discoloration on epoxy casing of U3.',
        evidence: 'Darkened region between pins 2 and 3.',
        confidence: 'medium',
      },
    ],
    initialHypotheses: [
      {
        title: 'LDO internal pass transistor breakdown causing rail short',
        reasoning: 'Discoloration and high idle current draw indicate internal breakdown.',
        supportingEvidence: ['Package discoloration', '0V rail output'],
        confidence: 'high',
        suggestedVerification: 'Perform cold resistance check from U3 VOUT pin to GND.',
      },
    ],
  },
  evidence: [
    {
      id: 'ev-rec-1',
      targetRecommendationId: 'r0-s1-cold-resistance',
      cycleIndex: 0,
      stepNumber: 1,
      checkTitle: 'Cold resistance check on 3.3V rail to GND',
      outcome: 'failed',
      numericValue: 0.2,
      measurementUnit: 'Ohm',
      technicianNotes: 'Measures dead short (0.2 Ohms) across VOUT and GND.',
      recordedAt: '2026-10-28T10:15:30Z',
    },
  ],
  additionalTechnicianNotes: 'Bench PSU current limited to 100mA for safety.',
};

const MOCK_REASSESSMENT_RESPONSE: DiagnosisReassessmentResponse = {
  summary: 'Reassessment confirms short circuit on 3.3V rail, strongly supporting LDO internal breakdown.',
  evidenceSynthesis: 'Cold resistance reading of 0.2 Ohms directly confirms short on 3.3V regulated rail.',
  revisedHypotheses: [
    {
      title: 'LDO internal pass transistor breakdown causing rail short',
      status: 'supported',
      confidence: 'high',
      explanationOfChange: 'Physical measurement of 0.2 Ohms confirms direct path to ground.',
      citingEvidenceIds: ['ev-rec-1'],
      suggestedVerification: 'Desolder U3 and check if short clears.',
    },
  ],
  nextRecommendedChecks: [
    {
      stepNumber: 1,
      title: 'Component Isolation Desoldering Test',
      testType: 'Unpowered Isolation',
      toolsNeeded: ['Hot Air Rework Station', 'Digital Multimeter'],
      procedure: 'Disconnect all power. Desolder U3. Measure resistance from pad 2 to GND.',
      expectedResult: 'Resistance rises to >10k Ohms if U3 was the short source.',
      safetyNotes: ['Ensure board is unpowered and cooled down before probing.'],
    },
  ],
  safetyWarnings: [
    'CRITICAL: Do not apply power while short circuit is present on the 3.3V rail.',
  ],
  limitations: [
    'Downstream components cannot be tested until short is isolated.',
  ],
};

async function runEndpointTests() {
  console.log('='.repeat(70));
  console.log(' CircuitLens — Stage 4B-2 Reassessment Endpoint Integration Tests');
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
    // Test 1: Valid reassessment request returns structured response (HTTP 200)
    // -----------------------------------------------------------------------
    console.log('[Test 1] Successful reassessment flow (POST /api/reassess)');
    let analyzerCallCount = 0;
    setReassessmentAnalyzerOverrideForTesting(async (req) => {
      analyzerCallCount++;
      assert(req.diagnosticContext.boardName === 'STM32-H7 Motor Driver', 'Analyzer received sanitized request');
      assert(req.evidence.length === 1, 'Analyzer received evidence records');
      return MOCK_REASSESSMENT_RESPONSE;
    });

    const res1 = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_REASSESSMENT_PAYLOAD),
    });

    const json1 = (await res1.json()) as DiagnosisReassessmentResponse;
    assert(res1.status === 200, 'Valid reassessment returns HTTP 200');
    assert(json1.summary === MOCK_REASSESSMENT_RESPONSE.summary, 'Summary matches expected response');
    assert(json1.revisedHypotheses[0].status === 'supported', 'Revised hypothesis has cautious status');
    assert(json1.safetyWarnings.length === 1, 'Mandatory safety warnings present');
    assert(analyzerCallCount === 1, 'Inference analyzer was called exactly once');

    // -----------------------------------------------------------------------
    // Test 2: Credit Protection - Empty evidence array rejected (HTTP 400)
    // -----------------------------------------------------------------------
    console.log('\n[Test 2] Credit Protection: Empty evidence array rejected without inference');
    analyzerCallCount = 0;
    const emptyPayload = {
      ...VALID_REASSESSMENT_PAYLOAD,
      evidence: [],
    };

    const res2 = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emptyPayload),
    });

    const json2 = (await res2.json()) as Record<string, unknown>;
    assert(res2.status === 400, 'Empty evidence array returns HTTP 400');
    assert(json2.errorType === 'INVALID_REQUEST', 'Error type is INVALID_REQUEST');
    assert(analyzerCallCount === 0, 'CREDIT PROTECTION: Inference was NOT called');

    // -----------------------------------------------------------------------
    // Test 3: Credit Protection - Over 20 evidence records rejected (HTTP 400)
    // -----------------------------------------------------------------------
    console.log('\n[Test 3] Credit Protection: Over 20 evidence records rejected without inference');
    analyzerCallCount = 0;
    const over20Records = Array.from({ length: 21 }, (_, i) => ({
      id: `ev-rec-${i + 1}`,
      targetRecommendationId: `r0-s${i + 1}-check`,
      cycleIndex: 0,
      stepNumber: i + 1,
      checkTitle: `Step ${i + 1}`,
      outcome: 'passed',
      recordedAt: '2026-10-28T10:15:30Z',
    }));

    const res3 = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...VALID_REASSESSMENT_PAYLOAD,
        evidence: over20Records,
      }),
    });

    const json3 = (await res3.json()) as Record<string, unknown>;
    assert(res3.status === 400, '>20 evidence records returns HTTP 400');
    assert(json3.errorType === 'INVALID_REQUEST', 'Error type is INVALID_REQUEST');
    assert(analyzerCallCount === 0, 'CREDIT PROTECTION: Inference was NOT called');

    // -----------------------------------------------------------------------
    // Test 4: Credit Protection - Invalid outcome enum rejected (HTTP 400)
    // -----------------------------------------------------------------------
    console.log('\n[Test 4] Credit Protection: Invalid outcome enum rejected without inference');
    analyzerCallCount = 0;
    const badOutcomePayload = {
      ...VALID_REASSESSMENT_PAYLOAD,
      evidence: [
        {
          ...VALID_REASSESSMENT_PAYLOAD.evidence[0],
          outcome: 'nominal_pass', // unauthorized enum
        },
      ],
    };

    const res4 = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(badOutcomePayload),
    });

    const json4 = (await res4.json()) as Record<string, unknown>;
    assert(res4.status === 400, 'Invalid outcome returns HTTP 400');
    assert(json4.errorType === 'INVALID_REQUEST', 'Error type is INVALID_REQUEST');
    assert(analyzerCallCount === 0, 'CREDIT PROTECTION: Inference was NOT called');

    // -----------------------------------------------------------------------
    // Test 5: Credit Protection - Incomplete measurement pair rejected (HTTP 400)
    // -----------------------------------------------------------------------
    console.log('\n[Test 5] Credit Protection: Incomplete measurement pair rejected without inference');
    analyzerCallCount = 0;
    const incompletePairPayload = {
      ...VALID_REASSESSMENT_PAYLOAD,
      evidence: [
        {
          ...VALID_REASSESSMENT_PAYLOAD.evidence[0],
          numericValue: 4.95,
          measurementUnit: undefined, // Missing unit!
        },
      ],
    };

    const res5 = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incompletePairPayload),
    });

    const json5 = (await res5.json()) as Record<string, unknown>;
    assert(res5.status === 400, 'Incomplete measurement pair returns HTTP 400');
    assert(json5.errorType === 'INVALID_REQUEST', 'Error type is INVALID_REQUEST');
    assert(analyzerCallCount === 0, 'CREDIT PROTECTION: Inference was NOT called');

    // -----------------------------------------------------------------------
    // Test 6: Malformed request body returns appropriate client error (HTTP 400)
    // -----------------------------------------------------------------------
    console.log('\n[Test 6] Malformed JSON request body returns HTTP 400');
    const res6 = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"diagnosticContext": incomplete json syntax',
    });

    const json6 = (await res6.json()) as Record<string, unknown>;
    assert(res6.status === 400, 'Malformed JSON returns HTTP 400');
    assert(json6.errorType === 'INVALID_JSON', 'Error type is INVALID_JSON');

    // -----------------------------------------------------------------------
    // Test 7: Supersession history reaches inference with expected context and evidence
    // -----------------------------------------------------------------------
    console.log('\n[Test 7] Request with supersession history reaches inference');
    let capturedReq: DiagnosisReassessmentRequest | null = null;
    analyzerCallCount = 0;
    setReassessmentAnalyzerOverrideForTesting(async (req) => {
      analyzerCallCount++;
      capturedReq = req;
      return MOCK_REASSESSMENT_RESPONSE;
    });

    const supersedingPayload: DiagnosisReassessmentRequest = {
      ...VALID_REASSESSMENT_PAYLOAD,
      evidence: [
        {
          id: 'ev-rec-1',
          targetRecommendationId: 'r0-s1-cold-resistance',
          cycleIndex: 0,
          stepNumber: 1,
          checkTitle: 'Cold resistance check on 3.3V rail',
          outcome: 'inconclusive',
          technicianNotes: 'Probe slipping; reading unstable.',
          recordedAt: '2026-10-28T10:15:30Z',
        },
        {
          id: 'ev-rec-2',
          targetRecommendationId: 'r0-s1-cold-resistance',
          cycleIndex: 0,
          stepNumber: 1,
          checkTitle: 'Cold resistance check on 3.3V rail',
          outcome: 'failed',
          numericValue: 0.2,
          measurementUnit: 'Ohm',
          technicianNotes: 'Cleaned probe tips; confirmed dead short.',
          recordedAt: '2026-10-28T10:18:00Z',
          supersedesEvidenceId: 'ev-rec-1',
        },
      ],
    };

    const res7 = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(supersedingPayload),
    });

    assert(res7.status === 200, 'Superseding request returns HTTP 200');
    assert(analyzerCallCount === 1, 'Inference called once');
    const receivedReq = capturedReq as DiagnosisReassessmentRequest | null;
    assert(receivedReq !== null && receivedReq.evidence.length === 2, 'Inference received all 2 evidence records');
    assert(receivedReq?.evidence[1].supersedesEvidenceId === 'ev-rec-1', 'Supersession reference preserved');

    // -----------------------------------------------------------------------
    // Test 8: Prompt contains context & evidence, states NO new image inspection
    // -----------------------------------------------------------------------
    console.log('\n[Test 8] Prompt structure verification (buildReassessmentUserPrompt)');
    const generatedPrompt = buildReassessmentUserPrompt(supersedingPayload);
    assert(
      generatedPrompt.includes('NO NEW PHOTO INSPECTION PERFORMED'),
      'Prompt explicitly states no new photo inspection occurred'
    );
    assert(
      generatedPrompt.includes('You have NOT performed a new visual inspection'),
      'Prompt instructs model not to claim image re-examination'
    );
    assert(
      generatedPrompt.includes('UNTRUSTED USER DATA'),
      'Prompt labels symptoms and technician notes as untrusted user data'
    );
    assert(
      generatedPrompt.includes('ev-rec-1') && generatedPrompt.includes('ev-rec-2'),
      'Prompt includes both evidence record IDs'
    );
    assert(
      generatedPrompt.includes('Supersedes Prior Evidence: ev-rec-1'),
      'Prompt reflects supersession relationship for model reasoning'
    );

    // -----------------------------------------------------------------------
    // Test 9: Valid model output returned after response validation
    // -----------------------------------------------------------------------
    console.log('\n[Test 9] Valid model output returns validated response');
    setReassessmentAnalyzerOverrideForTesting(async () => MOCK_REASSESSMENT_RESPONSE);
    const res9 = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_REASSESSMENT_PAYLOAD),
    });
    const json9 = (await res9.json()) as DiagnosisReassessmentResponse;
    assert(res9.status === 200, 'Returns HTTP 200');
    assert(Array.isArray(json9.revisedHypotheses), 'Revised hypotheses array returned');
    assert(Array.isArray(json9.nextRecommendedChecks), 'Next recommended checks array returned');

    // -----------------------------------------------------------------------
    // Test 10: Malformed model JSON rejected safely (HTTP 502)
    // -----------------------------------------------------------------------
    console.log('\n[Test 10] Model parsing error maps to HTTP 502');
    setReassessmentAnalyzerOverrideForTesting(async () => {
      throw new ReassessmentParsingError('Model returned invalid JSON syntax.');
    });

    const res10 = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_REASSESSMENT_PAYLOAD),
    });

    const json10 = (await res10.json()) as Record<string, unknown>;
    assert(res10.status === 502, 'Parsing error maps to HTTP 502');
    assert(json10.errorType === 'INVALID_MODEL_OUTPUT', 'Error type is INVALID_MODEL_OUTPUT');

    // -----------------------------------------------------------------------
    // Test 11: Fabricated evidence citation rejected (HTTP 502)
    // -----------------------------------------------------------------------
    console.log('\n[Test 11] Fabricated evidence citation maps to HTTP 502');
    setReassessmentAnalyzerOverrideForTesting(async () => {
      throw new ReassessmentValidationError(
        'Field "revisedHypotheses[0].citingEvidenceIds" cites unknown evidence ID "ev-fabricated-999".'
      );
    });

    const res11 = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_REASSESSMENT_PAYLOAD),
    });

    const json11 = (await res11.json()) as Record<string, unknown>;
    assert(res11.status === 502, 'Citation failure maps to HTTP 502');
    assert(json11.errorType === 'SCHEMA_VALIDATION_ERROR', 'Error type is SCHEMA_VALIDATION_ERROR');

    // -----------------------------------------------------------------------
    // Test 12: Missing safety warnings rejected (HTTP 502)
    // -----------------------------------------------------------------------
    console.log('\n[Test 12] Missing safety warnings maps to HTTP 502');
    setReassessmentAnalyzerOverrideForTesting(async () => {
      throw new ReassessmentValidationError(
        'Field "safetyWarnings" must contain at least 1 item.'
      );
    });

    const res12 = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_REASSESSMENT_PAYLOAD),
    });

    const json12 = (await res12.json()) as Record<string, unknown>;
    assert(res12.status === 502, 'Missing safety warning maps to HTTP 502');
    assert(json12.errorType === 'SCHEMA_VALIDATION_ERROR', 'Error type is SCHEMA_VALIDATION_ERROR');

    // -----------------------------------------------------------------------
    // Test 13: Upstream Meta-client connection failure maps safely (HTTP 503)
    // -----------------------------------------------------------------------
    console.log('\n[Test 13] Upstream connection failure maps to HTTP 503');
    setReassessmentAnalyzerOverrideForTesting(async () => {
      throw new OpenAI.APIConnectionError({ message: 'Connection reset' });
    });

    const res13 = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_REASSESSMENT_PAYLOAD),
    });

    const json13 = (await res13.json()) as Record<string, unknown>;
    assert(res13.status === 503, 'Connection failure maps to HTTP 503');
    assert(json13.errorType === 'CONNECTION_ERROR', 'Error type is CONNECTION_ERROR');

    // -----------------------------------------------------------------------
    // Test 14: Upstream Meta-client timeout maps safely (HTTP 504)
    // -----------------------------------------------------------------------
    console.log('\n[Test 14] Upstream timeout maps to HTTP 504');
    setReassessmentAnalyzerOverrideForTesting(async () => {
      throw new OpenAI.APIConnectionTimeoutError({ message: 'Request timed out' });
    });

    const res14 = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_REASSESSMENT_PAYLOAD),
    });

    const json14 = (await res14.json()) as Record<string, unknown>;
    assert(res14.status === 504, 'Timeout maps to HTTP 504');
    assert(json14.errorType === 'GATEWAY_TIMEOUT', 'Error type is GATEWAY_TIMEOUT');

    // -----------------------------------------------------------------------
    // Test 15: Body size limit (> 100 KB on default route returns HTTP 413)
    // -----------------------------------------------------------------------
    console.log('\n[Test 15] Body size limit (>100 KB payload rejected with HTTP 413)');
    const oversizedPayload = {
      ...VALID_REASSESSMENT_PAYLOAD,
      additionalTechnicianNotes: 'A'.repeat(120 * 1024), // 120 KB > 100 KB Express parser limit
    };

    const res15 = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(oversizedPayload),
    });

    const json15 = (await res15.json()) as Record<string, unknown>;
    assert(res15.status === 413, 'Oversized body returns HTTP 413');
    assert(json15.errorType === 'PAYLOAD_TOO_LARGE', 'Error type is PAYLOAD_TOO_LARGE');

  } finally {
    // Reset test override
    setReassessmentAnalyzerOverrideForTesting(null);

    // Close server cleanly
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    console.log('\nEphemeral test server closed.');
  }

  // Summary
  console.log('='.repeat(70));
  console.log(`Reassessment Endpoint Integration Tests: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('='.repeat(70));

  if (failedCount > 0) {
    process.exit(1);
  }
}

runEndpointTests().catch((err) => {
  console.error('Unhandled failure in reassessment endpoint tests:', err);
  process.exit(1);
});

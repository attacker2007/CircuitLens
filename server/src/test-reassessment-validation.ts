/**
 * CircuitLens Stage 4B-1 — Offline Tests for Reassessment Request & Response Validation
 *
 * Verifies request validation, response validation, measurement-pair rules,
 * bounds checking, timestamp validation, evidence citation verification,
 * and regression protection for Stage 3 validators without external API calls.
 */

import {
  validateReassessmentRequest,
  validateReassessmentResponse,
  parseReassessmentJson,
  isValidIsoTimestamp,
  ReassessmentRequestValidationError,
  ReassessmentValidationError,
  ReassessmentParsingError,
  REASSESSMENT_REQUEST_LIMITS,
  REASSESSMENT_RESPONSE_LIMITS,
} from './reassessmentValidation.js';
import {
  validateDiagnosisRequest,
} from './diagnosisRequestValidation.js';
import {
  validateDiagnosisResponse,
} from './diagnosisValidation.js';
import type {
  DiagnosisReassessmentRequest,
  DiagnosisReassessmentResponse,
  EvidenceRecord,
  DiagnosticContextPayload,
} from './types/diagnosis.js';

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

function getValidDiagnosticContext(): DiagnosticContextPayload {
  return {
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
  };
}

function createEvidenceRecord(
  index: number,
  overrides?: Partial<EvidenceRecord>
): EvidenceRecord {
  return {
    id: `ev-rec-${index + 1}`,
    targetRecommendationId: `r0-s${index + 1}-check-${index + 1}`,
    cycleIndex: 0,
    stepNumber: index + 1,
    checkTitle: `Diagnostic Step #${index + 1}`,
    outcome: 'passed',
    numericValue: 3.3,
    measurementUnit: 'V',
    technicianNotes: 'Voltage reading stable on multimeter.',
    recordedAt: '2026-10-28T10:15:30Z',
    ...overrides,
  };
}

function getValidReassessmentResponseFixture(
  submittedEvidenceIds?: Set<string>
): DiagnosisReassessmentResponse {
  const citingId = submittedEvidenceIds && submittedEvidenceIds.size > 0
    ? Array.from(submittedEvidenceIds)[0]
    : 'ev-rec-1';

  return {
    summary: 'Evidence confirms a dead short on the 3.3V rail, strongly supporting LDO internal breakdown.',
    evidenceSynthesis: 'Cold resistance reading of 0.2 Ohms confirms direct path to ground on the regulated output.',
    revisedHypotheses: [
      {
        title: 'LDO internal pass transistor breakdown causing rail short',
        status: 'supported',
        confidence: 'high',
        explanationOfChange: 'Cold resistance of 0.2 Ohms strongly supports direct rail short.',
        citingEvidenceIds: [citingId],
        suggestedVerification: 'Remove U3 and re-measure resistance on 3.3V rail to isolate regulator from load.',
      },
    ],
    nextRecommendedChecks: [
      {
        stepNumber: 1,
        title: 'Component Isolation Desoldering Test',
        testType: 'Unpowered Isolation',
        toolsNeeded: ['Hot Air Rework Station', 'Tweezers', 'Digital Multimeter'],
        procedure: 'Disconnect all power. Desolder U3 carefully using hot air. Clean pads with wick. Measure resistance from pad 2 to GND.',
        expectedResult: 'Resistance rises to >10k Ohms if U3 was the short source.',
        safetyNotes: ['Allow PCB and desoldered IC to cool before touching; wear ESD strap.'],
      },
    ],
    safetyWarnings: [
      'CRITICAL: Do not reconnect 24V supply while rail resistance measures under 10 Ohms; risk of trace vaporization.',
      'Ensure all bulk capacitors are fully discharged before reworking.',
    ],
    limitations: [
      'Downstream microcontroller U1 condition cannot be assessed until the power rail short is removed.',
    ],
  };
}

function runTests() {
  console.log('='.repeat(70));
  console.log(' CircuitLens — Stage 4B-1 Reassessment Validation Offline Tests');
  console.log('='.repeat(70));

  // =========================================================================
  // SECTION 1: REQUEST VALIDATION TESTS
  // =========================================================================
  console.log('\n--- SECTION 1: Request Validation (validateReassessmentRequest) ---');

  // Case 1.1: Valid requests with 1, 5, and 20 evidence records
  console.log('\n[Case 1.1] Valid requests with varying evidence counts (1, 5, 20)');
  for (const count of [1, 5, 20]) {
    try {
      const records = Array.from({ length: count }, (_, i) => createEvidenceRecord(i));
      const req: DiagnosisReassessmentRequest = {
        diagnosticContext: getValidDiagnosticContext(),
        evidence: records,
        additionalTechnicianNotes: `Technician completed ${count} checks.`,
      };
      const validated = validateReassessmentRequest(req);
      assert(validated.evidence.length === count, `Valid request with ${count} evidence record(s) accepted`);
      assert(validated.diagnosticContext.expectedBehavior === req.diagnosticContext.expectedBehavior, 'Preserves context');
    } catch (err) {
      assert(false, `Unexpected failure with count ${count}`, String(err));
    }
  }

  // Case 1.2: Empty and over-limit evidence arrays
  console.log('\n[Case 1.2] Evidence count bounds (0 items and 21 items)');
  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [],
    });
    assert(false, 'Should reject empty evidence array');
  } catch (err) {
    assert(err instanceof ReassessmentRequestValidationError, 'Rejects empty evidence array (0 items)');
  }

  try {
    const tooMany = Array.from({ length: 21 }, (_, i) => createEvidenceRecord(i));
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: tooMany,
    });
    assert(false, 'Should reject >20 evidence records');
  } catch (err) {
    assert(err instanceof ReassessmentRequestValidationError, 'Rejects over-limit evidence array (21 items)');
  }

  // Case 1.3: Invalid outcome enum values
  console.log('\n[Case 1.3] Invalid check outcome enum values');
  for (const badOutcome of ['success', 'error', 'ok', 'verified', '']) {
    try {
      validateReassessmentRequest({
        diagnosticContext: getValidDiagnosticContext(),
        evidence: [createEvidenceRecord(0, { outcome: badOutcome as any })],
      });
      assert(false, `Should reject invalid outcome "${badOutcome}"`);
    } catch (err) {
      assert(err instanceof ReassessmentRequestValidationError, `Rejects invalid outcome "${badOutcome}"`);
    }
  }

  // Case 1.4: Measurement pair rules (paired requirement & no coercion to zero)
  console.log('\n[Case 1.4] Measurement pair rules (numericValue and measurementUnit)');
  // Value without unit -> rejected
  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [createEvidenceRecord(0, { numericValue: 12.5, measurementUnit: undefined })],
    });
    assert(false, 'Should reject numericValue without measurementUnit');
  } catch (err) {
    assert(err instanceof ReassessmentRequestValidationError, 'Rejects numericValue without measurementUnit');
  }

  // Unit without value -> rejected
  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [createEvidenceRecord(0, { numericValue: undefined, measurementUnit: 'V' })],
    });
    assert(false, 'Should reject measurementUnit without numericValue');
  } catch (err) {
    assert(err instanceof ReassessmentRequestValidationError, 'Rejects measurementUnit without numericValue');
  }

  // Both omitted -> accepted (qualitative check) and missing value is NOT coerced to zero
  try {
    const req = validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [createEvidenceRecord(0, { numericValue: undefined, measurementUnit: undefined })],
    });
    assert(
      req.evidence[0].numericValue === undefined && req.evidence[0].measurementUnit === undefined,
      'Allows both omitted and preserves numericValue as undefined (never coerced to 0)'
    );
  } catch (err) {
    assert(false, 'Should allow omitting both numericValue and measurementUnit', String(err));
  }

  // Case 1.5: Numeric bounds, NaN, and Infinity
  console.log('\n[Case 1.5] Numeric bounds, NaN, and Infinity checks');
  // Boundary values
  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [createEvidenceRecord(0, { numericValue: -1e9, measurementUnit: 'V' })],
    });
    assert(true, 'Accepts minimum bound -1e9');

    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [createEvidenceRecord(0, { numericValue: 1e9, measurementUnit: 'V' })],
    });
    assert(true, 'Accepts maximum bound 1e9');
  } catch (err) {
    assert(false, 'Should accept boundary numeric values', String(err));
  }

  // Exceeding bounds
  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [createEvidenceRecord(0, { numericValue: 1e9 + 1, measurementUnit: 'V' })],
    });
    assert(false, 'Should reject numericValue > 1e9');
  } catch (err) {
    assert(err instanceof ReassessmentRequestValidationError, 'Rejects numericValue > 1e9');
  }

  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [createEvidenceRecord(0, { numericValue: -1e9 - 1, measurementUnit: 'V' })],
    });
    assert(false, 'Should reject numericValue < -1e9');
  } catch (err) {
    assert(err instanceof ReassessmentRequestValidationError, 'Rejects numericValue < -1e9');
  }

  // NaN and Infinity
  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [createEvidenceRecord(0, { numericValue: NaN, measurementUnit: 'V' })],
    });
    assert(false, 'Should reject NaN');
  } catch (err) {
    assert(err instanceof ReassessmentRequestValidationError, 'Rejects NaN measurement value');
  }

  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [createEvidenceRecord(0, { numericValue: Infinity, measurementUnit: 'V' })],
    });
    assert(false, 'Should reject Infinity');
  } catch (err) {
    assert(err instanceof ReassessmentRequestValidationError, 'Rejects Infinity measurement value');
  }

  // Case 1.6: Measurement unit length limits
  console.log('\n[Case 1.6] Measurement unit limits');
  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [createEvidenceRecord(0, { numericValue: 5, measurementUnit: ' ' })],
    });
    assert(false, 'Should reject whitespace-only measurementUnit');
  } catch (err) {
    assert(err instanceof ReassessmentRequestValidationError, 'Rejects empty/whitespace measurementUnit');
  }

  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [createEvidenceRecord(0, { numericValue: 5, measurementUnit: 'A'.repeat(21) })],
    });
    assert(false, 'Should reject measurementUnit > 20 chars');
  } catch (err) {
    assert(err instanceof ReassessmentRequestValidationError, 'Rejects measurementUnit exceeding 20 chars');
  }

  // Case 1.7: ISO timestamp validation
  console.log('\n[Case 1.7] ISO timestamp calendar date verification');
  assert(isValidIsoTimestamp('2026-10-28T10:15:30Z'), 'Accepts valid UTC ISO timestamp');
  assert(isValidIsoTimestamp('2026-10-28T10:15:30.123Z'), 'Accepts ISO timestamp with millis');
  assert(isValidIsoTimestamp('2026-10-28T12:15:30+02:00'), 'Accepts ISO timestamp with timezone offset');
  assert(!isValidIsoTimestamp('not-a-timestamp'), 'Rejects arbitrary string');
  assert(!isValidIsoTimestamp('2026-02-30T10:00:00Z'), 'Rejects non-existent calendar date (Feb 30th)');
  assert(!isValidIsoTimestamp('2026-13-10T10:00:00Z'), 'Rejects invalid month 13');
  assert(!isValidIsoTimestamp(''), 'Rejects empty string');

  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [createEvidenceRecord(0, { recordedAt: '2026-02-30T10:00:00Z' })],
    });
    assert(false, 'Should reject invalid timestamp in evidence record');
  } catch (err) {
    assert(err instanceof ReassessmentRequestValidationError, 'Rejects invalid calendar date in evidence');
  }

  // Case 1.8: Duplicate evidence IDs and supersession rules
  console.log('\n[Case 1.8] Duplicate evidence IDs and supersession rules');
  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [
        createEvidenceRecord(0, { id: 'dup-id' }),
        createEvidenceRecord(1, { id: 'dup-id' }),
      ],
    });
    assert(false, 'Should reject duplicate evidence IDs');
  } catch (err) {
    assert(err instanceof ReassessmentRequestValidationError, 'Rejects duplicate evidence IDs in request');
  }

  // Self-referential supersedesEvidenceId
  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [createEvidenceRecord(0, { id: 'ev-1', supersedesEvidenceId: 'ev-1' })],
    });
    assert(false, 'Should reject self-referential supersedesEvidenceId');
  } catch (err) {
    assert(err instanceof ReassessmentRequestValidationError, 'Rejects self-referential supersedesEvidenceId');
  }

  // Referencing non-existent evidence record
  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [createEvidenceRecord(0, { id: 'ev-1', supersedesEvidenceId: 'ev-non-existent' })],
    });
    assert(false, 'Should reject unknown supersedesEvidenceId');
  } catch (err) {
    assert(err instanceof ReassessmentRequestValidationError, 'Rejects reference to unknown supersedesEvidenceId');
  }

  // Valid supersession (ev-2 supersedes ev-1)
  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [
        createEvidenceRecord(0, { id: 'ev-1', outcome: 'inconclusive' }),
        createEvidenceRecord(1, { id: 'ev-2', outcome: 'passed', supersedesEvidenceId: 'ev-1' }),
      ],
    });
    assert(true, 'Accepts valid superseding evidence reference');
  } catch (err) {
    assert(false, 'Should allow valid supersession', String(err));
  }

  // Case 1.9: Oversized string fields in request
  console.log('\n[Case 1.9] Oversized string fields');
  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [
        createEvidenceRecord(0, {
          technicianNotes: 'X'.repeat(REASSESSMENT_REQUEST_LIMITS.MAX_TECHNICIAN_NOTES_LENGTH + 1),
        }),
      ],
    });
    assert(false, 'Should reject technicianNotes > 500 chars');
  } catch (err) {
    assert(err instanceof ReassessmentRequestValidationError, 'Rejects technicianNotes > 500 chars');
  }

  try {
    validateReassessmentRequest({
      diagnosticContext: getValidDiagnosticContext(),
      evidence: [createEvidenceRecord(0)],
      additionalTechnicianNotes: 'X'.repeat(REASSESSMENT_REQUEST_LIMITS.MAX_ADDITIONAL_NOTES_LENGTH + 1),
    });
    assert(false, 'Should reject additionalTechnicianNotes > 1000 chars');
  } catch (err) {
    assert(err instanceof ReassessmentRequestValidationError, 'Rejects additionalTechnicianNotes > 1000 chars');
  }

  // =========================================================================
  // SECTION 2: RESPONSE VALIDATION TESTS
  // =========================================================================
  console.log('\n--- SECTION 2: Response Validation (validateReassessmentResponse) ---');

  // Case 2.1: Valid reassessment response
  console.log('\n[Case 2.1] Valid response validation');
  try {
    const validEvidenceIds = new Set(['ev-rec-1', 'ev-rec-2']);
    const fixture = getValidReassessmentResponseFixture(validEvidenceIds);
    const validatedResp = validateReassessmentResponse(fixture, validEvidenceIds);
    assert(validatedResp.summary === fixture.summary, 'Valid response passes validation');
    assert(validatedResp.revisedHypotheses[0].status === 'supported', 'Preserves cautious hypothesis status');
    assert(validatedResp.safetyWarnings.length === 2, 'Preserves safety warnings');
  } catch (err) {
    assert(false, 'Unexpected failure on valid response', String(err));
  }

  // Case 2.2: Invalid hypothesis status enums
  console.log('\n[Case 2.2] Cautious hypothesis status validation');
  for (const badStatus of ['confirmed', 'refuted', 'proven', 'plausible', 'invalid']) {
    try {
      const fixture = getValidReassessmentResponseFixture();
      (fixture.revisedHypotheses[0] as any).status = badStatus;
      validateReassessmentResponse(fixture);
      assert(false, `Should reject non-cautious status "${badStatus}"`);
    } catch (err) {
      assert(err instanceof ReassessmentValidationError, `Rejects unauthorized status "${badStatus}"`);
    }
  }

  // Case 2.3: Unknown evidence citation rejection
  console.log('\n[Case 2.3] Evidence citation verification');
  try {
    const fixture = getValidReassessmentResponseFixture();
    fixture.revisedHypotheses[0].citingEvidenceIds = ['ev-ghost-99'];
    validateReassessmentResponse(fixture, new Set(['ev-rec-1', 'ev-rec-2']));
    assert(false, 'Should reject citingEvidenceId not in submitted evidence');
  } catch (err) {
    assert(err instanceof ReassessmentValidationError, 'Rejects hallucinated citingEvidenceId');
  }

  // Case 2.4: Mandatory safety warnings enforcement
  console.log('\n[Case 2.4] Mandatory safety warning enforcement');
  try {
    const noSafety = getValidReassessmentResponseFixture();
    noSafety.safetyWarnings = [];
    validateReassessmentResponse(noSafety);
    assert(false, 'Should reject response with 0 safety warnings');
  } catch (err) {
    assert(err instanceof ReassessmentValidationError, 'Rejects response missing safety warnings');
  }

  // Case 2.5: Invalid nested recommended checks
  console.log('\n[Case 2.5] Nested recommended check validation');
  try {
    const badCheck = getValidReassessmentResponseFixture();
    (badCheck.nextRecommendedChecks[0] as any).stepNumber = -1; // invalid stepNumber
    validateReassessmentResponse(badCheck);
    assert(false, 'Should reject negative stepNumber in recommended check');
  } catch (err) {
    assert(err instanceof ReassessmentValidationError, 'Rejects invalid stepNumber in recommended checks');
  }

  // Case 2.6: JSON parsing and fenced code stripping
  console.log('\n[Case 2.6] JSON parsing with and without markdown code fences');
  const validJson = JSON.stringify(getValidReassessmentResponseFixture());
  const fencedJson = `\`\`\`json\n${validJson}\n\`\`\``;

  try {
    const parsed1 = parseReassessmentJson(validJson);
    assert(parsed1.summary.length > 0, 'Parses clean JSON response');

    const parsed2 = parseReassessmentJson(fencedJson);
    assert(parsed2.summary === parsed1.summary, 'Strips ```json code fences and parses validly');
  } catch (err) {
    assert(false, 'Unexpected error parsing JSON', String(err));
  }

  try {
    parseReassessmentJson('not-valid-json { [ }');
    assert(false, 'Should throw ReassessmentParsingError on malformed JSON');
  } catch (err) {
    assert(err instanceof ReassessmentParsingError, 'Throws ReassessmentParsingError on malformed JSON');
  }

  // =========================================================================
  // SECTION 3: REGRESSION PROTECTION FOR STAGE 3 VALIDATORS
  // =========================================================================
  console.log('\n--- SECTION 3: Regression Protection for Stage 3 Contracts ---');

  try {
    const validJpegDataUrl =
      'data:image/jpeg;base64,' +
      Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]).toString(
        'base64'
      );

    const initialReq = validateDiagnosisRequest({
      image: validJpegDataUrl,
      expectedBehavior: 'Board boots with green LED',
      observedBehavior: 'Board stays dark',
      boardName: 'Legacy Test Board',
    });
    assert(initialReq.boardName === 'Legacy Test Board', 'Stage 3 validateDiagnosisRequest remains fully functional');

    const initialResp = validateDiagnosisResponse({
      summary: 'Legacy summary',
      visibleObservations: [
        {
          description: 'Solder bridge',
          evidence: 'Pin 1 to 2',
          confidence: 'high',
        },
      ],
      hypotheses: [
        {
          title: 'Bridged pins',
          reasoning: 'Visual solder blob',
          supportingEvidence: ['Blob on pins'],
          confidence: 'high',
          suggestedVerification: 'Inspect under magnifier',
        },
      ],
      recommendedChecks: [
        {
          stepNumber: 1,
          title: 'Visual inspection',
          testType: 'Optical',
          toolsNeeded: ['Magnifier'],
          procedure: 'Look at pin 1',
          expectedResult: 'No solder bridge',
          safetyNotes: ['Unpowered check'],
        },
      ],
      limitations: ['Single angle'],
      safetyWarnings: ['Unplug power'],
    });
    assert(initialResp.summary === 'Legacy summary', 'Stage 3 validateDiagnosisResponse remains fully functional');
  } catch (err) {
    assert(false, 'Regression detected in Stage 3 validators', String(err));
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log(`Reassessment Validation Offline Tests: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('='.repeat(70));

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();

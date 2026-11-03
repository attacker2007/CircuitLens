/**
 * CircuitLens Stage 5C-3L-2 — Realistic Offline Reassessment Scenarios Test Suite
 *
 * Implements deterministic application-level tests covering:
 * - Scenario A: Confirmed physical fault area (Arduino Uno LED ground path restoration)
 * - Scenario B: Contradictory evidence (component tested normal against prior suspicion)
 * - Scenario C: Incomplete evidence (uninvestigated hypotheses, missing measurements)
 * - Scenario D: Conflicting evidence (contradictory readings acknowledged, unresolved)
 * - Scenario E: Superseded evidence (traceable supersession, rejection of invalid references)
 * - Integrity Scenario F: Unsupported physical confirmation analysis
 * - Integrity Scenario G: Citation integrity (unknown IDs, malformed types, empty arrays)
 *
 * All tests are strictly offline with ZERO live API calls, zero credit consumption,
 * and zero reliance on external network connectivity.
 */

// Set NODE_ENV to test to prevent auto-starting app.listen on port 4000
process.env.NODE_ENV = 'test';

import type { Server } from 'http';
import type { AddressInfo } from 'net';
import app from './index.js';
import {
  setReassessmentAnalyzerOverrideForTesting,
  buildReassessmentUserPrompt,
  REASSESSMENT_SYSTEM_PROMPT,
  ReassessmentValidationError,
  ReassessmentRequestValidationError,
  ReassessmentParsingError,
} from './metaClient.js';
import {
  validateReassessmentRequest,
  validateReassessmentResponse,
  parseReassessmentJson,
} from './reassessmentValidation.js';
import type {
  DiagnosisReassessmentRequest,
  DiagnosisReassessmentResponse,
  DiagnosticContextPayload,
  EvidenceRecord,
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

// ===========================================================================
// FIXTURE: Base Arduino Uno LED Circuit Diagnostic Context
// ===========================================================================
function getArduinoLedDiagnosticContext(): DiagnosticContextPayload {
  return {
    boardName: 'Arduino Uno R3 (ATmega328P)',
    expectedBehavior:
      'Arduino Uno powered via 5V USB executes blink sketch on digital pin D8, toggling external LED with 220-ohm resistor once per second.',
    observedBehavior:
      'External LED remains completely unlit. Sketch uploads successfully with no IDE errors; on-board power LED (ON) is illuminated.',
    relevantComponents: 'External 5mm red LED, 220-ohm resistor, breadboard tie-point wires, header pins D8 and GND',
    additionalNotes: 'Visual inspection shows breadboard jumper wires seated, but GND path is suspect.',
    initialSummary:
      'Visual and symptom analysis indicates a potential open circuit in the LED drive path, suspecting an ungrounded return line, reverse polarity, or pin failure.',
    visibleObservations: [
      {
        description: 'Breadboard jumper wire connected between LED cathode row and Arduino GND header.',
        evidence: 'Black jumper wire appears plugged into header socket labeled GND.',
        confidence: 'medium',
      },
      {
        description: '5mm red tinted diffused LED inserted across breadboard rows 10 and 11.',
        evidence: 'Longer anode lead appears positioned in row 10 connected to 220-ohm resistor.',
        confidence: 'medium',
      },
    ],
    initialHypotheses: [
      {
        title: 'Open or Disconnected Ground Return Path',
        reasoning: 'If the cathode return to Arduino GND is broken, no current can flow through the LED.',
        supportingEvidence: ['Black jumper wire seating uncertain', 'LED completely dark'],
        confidence: 'high',
        suggestedVerification: 'Perform continuity check between LED cathode lead and Arduino board ground shield.',
      },
      {
        title: 'Reverse Polarity LED Installation',
        reasoning: 'LEDs are polar diodes; backwards insertion blocks current under 5V drive without damage.',
        supportingEvidence: ['Lead length difficult to verify conclusively under current lighting'],
        confidence: 'medium',
        suggestedVerification: 'Verify flat edge of LED collar corresponds to cathode return line.',
      },
      {
        title: 'Microcontroller Pin D8 Output Driver Failure',
        reasoning: 'Electrostatic discharge or prior overcurrent may have damaged the internal I/O FET driver.',
        supportingEvidence: ['No optical damage to ATmega328P DIP package'],
        confidence: 'low',
        suggestedVerification: 'Measure voltage at D8 header pin with oscilloscope or multimeter during sketch execution.',
      },
    ],
  };
}

async function runScenarioTests() {
  console.log('='.repeat(70));
  console.log(' CircuitLens — Stage 5C-3L-2 Realistic Reassessment Scenario Tests');
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
    // =======================================================================
    // SCENARIO A: Confirmed physical fault area (Arduino Uno LED ground path)
    // =======================================================================
    console.log('\n--- SCENARIO A: Confirmed Physical Fault Area ---');

    const scenarioAEvidence: EvidenceRecord[] = [
      {
        id: 'ev-a1',
        targetRecommendationId: 'rec_inv_scen_a_c0_s1',
        cycleIndex: 0,
        stepNumber: 1,
        checkTitle: 'GND Return Continuity Check',
        outcome: 'failed',
        numericValue: 1e9,
        measurementUnit: 'Ohm',
        technicianNotes: 'Open circuit detected. Black jumper wire was loose in breadboard tie point.',
        recordedAt: '2026-10-30T10:00:00Z',
      },
      {
        id: 'ev-a2',
        targetRecommendationId: 'rec_inv_scen_a_c0_s2',
        cycleIndex: 0,
        stepNumber: 2,
        checkTitle: 'Ground Connection Restoration',
        outcome: 'passed',
        technicianNotes: 'Re-seated black jumper wire into Arduino GND header pin. Continuity verified (< 0.1 Ohm).',
        recordedAt: '2026-10-30T10:02:00Z',
      },
      {
        id: 'ev-a3',
        targetRecommendationId: 'rec_inv_scen_a_c0_s3',
        cycleIndex: 0,
        stepNumber: 3,
        checkTitle: 'Dynamic LED Blink Verification',
        outcome: 'passed',
        technicianNotes: 'External red LED now blinks rhythmically once per second in sync with D8 sketch.',
        recordedAt: '2026-10-30T10:03:30Z',
      },
      {
        id: 'ev-a4',
        targetRecommendationId: 'rec_inv_scen_a_c0_s4',
        cycleIndex: 0,
        stepNumber: 4,
        checkTitle: 'D8 HIGH Output Voltage Measurement',
        outcome: 'passed',
        numericValue: 4.82,
        measurementUnit: 'V',
        technicianNotes: 'D8 measures 4.82V when HIGH and 0.02V when LOW.',
        recordedAt: '2026-10-30T10:05:00Z',
      },
    ];

    const scenarioARequest: DiagnosisReassessmentRequest = {
      diagnosticContext: getArduinoLedDiagnosticContext(),
      evidence: scenarioAEvidence,
      additionalTechnicianNotes: 'Restoring the physical GND jumper restored full nominal circuit behavior.',
    };

    // 1. Verify prompt construction attributes technician evidence and preserves prior findings
    const promptA = buildReassessmentUserPrompt(scenarioARequest);
    assert(promptA.includes('ev-a1') && promptA.includes('ev-a2'), 'Scenario A: Prompt includes all evidence IDs');
    assert(promptA.includes('Open circuit detected'), 'Scenario A: Prompt includes technician notes');
    assert(promptA.includes('4.82 V'), 'Scenario A: Prompt includes exact measured numeric value and unit');
    assert(
      promptA.includes('ROUND 0 — NO NEW PHOTO INSPECTION PERFORMED'),
      'Scenario A: Prompt explicitly clarifies no new visual inspection was performed'
    );
    assert(
      promptA.includes('UNTRUSTED USER DATA'),
      'Scenario A: Prompt frames intake context under injection-resistant guardrails'
    );

    // 2. Mock model response reflecting cautious reassessment
    const scenarioAMockResponse: DiagnosisReassessmentResponse = {
      summary:
        'Restoring the disconnected Arduino GND jumper wire re-established the circuit return path, completely restoring nominal 1 Hz LED blinking.',
      evidenceSynthesis:
        'Physical test evidence establishes that the circuit failure was caused solely by an ungrounded return line. Nominal 4.82V drive on D8 confirms the MCU output stage is intact.',
      revisedHypotheses: [
        {
          title: 'Open or Disconnected Ground Return Path',
          status: 'supported',
          confidence: 'high',
          explanationOfChange:
            'Technician verified an open ground circuit (ev-a1) and confirmed full circuit recovery upon re-seating the jumper wire (ev-a2, ev-a3).',
          citingEvidenceIds: ['ev-a1', 'ev-a2', 'ev-a3'],
        },
        {
          title: 'Reverse Polarity LED Installation',
          status: 'contradicted',
          confidence: 'high',
          explanationOfChange:
            'Rhythmic 1 Hz illumination upon ground restoration demonstrates the LED anode and cathode were correctly oriented.',
          citingEvidenceIds: ['ev-a2', 'ev-a3'],
        },
        {
          title: 'Microcontroller Pin D8 Output Driver Failure',
          status: 'contradicted',
          confidence: 'high',
          explanationOfChange:
            'Direct voltage measurement of 4.82V during HIGH state and normal blinking confirm nominal driver operation.',
          citingEvidenceIds: ['ev-a3', 'ev-a4'],
        },
      ],
      nextRecommendedChecks: [],
      safetyWarnings: [
        'Always disconnect 5V USB power before re-seating jumper wires or modifying breadboard connections to prevent accidental pin shorts.',
      ],
      limitations: [
        'Current limit margin under prolonged continuous HIGH state was not tested but nominal blink operation is confirmed.',
      ],
    };

    setReassessmentAnalyzerOverrideForTesting(async (req) => {
      assert(req.evidence.length === 4, 'Scenario A: Analyzer received exactly 4 evidence records');
      return scenarioAMockResponse;
    });

    const resA = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenarioARequest),
    });

    const dataA = (await resA.json()) as DiagnosisReassessmentResponse;
    assert(resA.status === 200, 'Scenario A: POST /api/reassess returns HTTP 200');
    assert(dataA.revisedHypotheses.length === 3, 'Scenario A: All 3 hypotheses evaluated');
    assert(dataA.revisedHypotheses[0].status === 'supported', 'Scenario A: Ground path hypothesis is supported');
    assert(dataA.revisedHypotheses[1].status === 'contradicted', 'Scenario A: Polarity hypothesis is contradicted');
    assert(dataA.revisedHypotheses[2].status === 'contradicted', 'Scenario A: Pin failure hypothesis is contradicted');
    assert(
      dataA.revisedHypotheses[0].suggestedVerification === undefined,
      'Scenario A: Optional suggestedVerification safely omitted on supported hypothesis'
    );
    assert(
      dataA.nextRecommendedChecks.length === 0,
      'Scenario A: Empty nextRecommendedChecks accepted when troubleshooting is complete'
    );

    // =======================================================================
    // SCENARIO B: Contradictory evidence (component tested normal against prior suspicion)
    // =======================================================================
    console.log('\n--- SCENARIO B: Contradictory Evidence ---');

    const scenarioBEvidence: EvidenceRecord[] = [
      {
        id: 'ev-b1',
        targetRecommendationId: 'rec_inv_scen_b_c0_s1',
        cycleIndex: 0,
        stepNumber: 1,
        checkTitle: 'Cold Resistance Check on Current Limiting Resistor',
        outcome: 'passed',
        numericValue: 219.4,
        measurementUnit: 'Ohm',
        technicianNotes: 'Measured 219.4 Ohms out of circuit; nominal 220-Ohm +/- 5% tolerance verified.',
        recordedAt: '2026-10-30T10:10:00Z',
      },
    ];

    const scenarioBContext = getArduinoLedDiagnosticContext();
    scenarioBContext.initialHypotheses.push({
      title: 'Current Limiting Resistor R1 Open Circuit',
      reasoning: 'A blown or cracked resistor body would prevent all current from reaching the LED.',
      supportingEvidence: ['No glow on LED'],
      confidence: 'medium',
      suggestedVerification: 'Measure cold resistance of R1.',
    });

    const scenarioBRequest: DiagnosisReassessmentRequest = {
      diagnosticContext: scenarioBContext,
      evidence: scenarioBEvidence,
    };

    const scenarioBMockResponse: DiagnosisReassessmentResponse = {
      summary:
        'Bench measurement of 219.4 Ohms confirms the 220-Ohm current-limiting resistor is intact, ruling it out as the root cause.',
      evidenceSynthesis:
        'Physical measurement directly contradicts the hypothesis of an open resistor. Focus shifts to wiring and semiconductor integrity.',
      revisedHypotheses: [
        {
          title: 'Current Limiting Resistor R1 Open Circuit',
          status: 'contradicted',
          confidence: 'high',
          explanationOfChange:
            'Direct cold resistance measurement of 219.4 Ohms matches the 220-Ohm specification within 1%, disproving an open circuit.',
          citingEvidenceIds: ['ev-b1'],
        },
        {
          title: 'Open or Disconnected Ground Return Path',
          status: 'unresolved',
          confidence: 'medium',
          explanationOfChange: 'Ground path remains untested.',
          citingEvidenceIds: [],
          suggestedVerification: 'Perform continuity check from LED cathode to Arduino GND.',
        },
      ],
      nextRecommendedChecks: [
        {
          stepNumber: 1,
          title: 'GND Return Path Continuity',
          testType: 'Unpowered Continuity',
          toolsNeeded: ['Digital Multimeter'],
          procedure: 'Probe from LED cathode to GND pin.',
          expectedResult: 'Continuity buzzer sounds (< 1 Ohm).',
          safetyNotes: ['Ensure USB power is removed.'],
        },
      ],
      safetyWarnings: ['Ensure circuit is unpowered during resistance and continuity tests.'],
      limitations: ['LED junction condition remains unverified.'],
    };

    setReassessmentAnalyzerOverrideForTesting(async () => scenarioBMockResponse);

    const resB = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenarioBRequest),
    });

    const dataB = (await resB.json()) as DiagnosisReassessmentResponse;
    assert(resB.status === 200, 'Scenario B: Returns HTTP 200');
    assert(
      dataB.revisedHypotheses[0].status === 'contradicted',
      'Scenario B: Resistor hypothesis is contradicted based on measurement'
    );
    assert(
      dataB.revisedHypotheses[0].citingEvidenceIds.includes('ev-b1'),
      'Scenario B: Contradicted hypothesis cites the decisive evidence record'
    );
    assert(
      dataB.revisedHypotheses[1].status === 'unresolved',
      'Scenario B: Untested hypothesis remains cautiously unresolved'
    );

    // =======================================================================
    // SCENARIO C: Incomplete evidence (uninvestigated hypotheses, missing measurements)
    // =======================================================================
    console.log('\n--- SCENARIO C: Incomplete Evidence & Empty Citations ---');

    const scenarioCEvidence: EvidenceRecord[] = [
      {
        id: 'ev-c1',
        targetRecommendationId: 'rec_inv_scen_c_c0_s1',
        cycleIndex: 0,
        stepNumber: 1,
        checkTitle: 'Visual Inspection of LED Anode/Cathode Leads',
        outcome: 'inconclusive',
        technicianNotes: 'Leads are cropped short inside breadboard sockets; internal anvil/post geometry is ambiguous through red epoxy.',
        recordedAt: '2026-10-30T10:15:00Z',
      },
    ];

    const scenarioCRequest: DiagnosisReassessmentRequest = {
      diagnosticContext: getArduinoLedDiagnosticContext(),
      evidence: scenarioCEvidence,
    };

    const scenarioCMockResponse: DiagnosisReassessmentResponse = {
      summary:
        'Visual inspection was inconclusive. All primary fault candidates remain unresolved until electrical checks are conducted.',
      evidenceSynthesis:
        'Because optical inspection could not confirm polarity and no electrical measurements were recorded, confidence cannot be upgraded.',
      revisedHypotheses: [
        {
          title: 'Open or Disconnected Ground Return Path',
          status: 'unresolved',
          confidence: 'medium',
          explanationOfChange: 'No ground continuity tests were performed in this cycle.',
          citingEvidenceIds: [],
          suggestedVerification: 'Perform cold resistance check from LED cathode to GND.',
        },
        {
          title: 'Reverse Polarity LED Installation',
          status: 'unresolved',
          confidence: 'medium',
          explanationOfChange: 'Visual inspection was inconclusive due to cropped leads (ev-c1).',
          citingEvidenceIds: ['ev-c1'],
          suggestedVerification: 'Use multimeter diode test function to verify forward voltage drop.',
        },
        {
          title: 'Microcontroller Pin D8 Output Driver Failure',
          status: 'unresolved',
          confidence: 'low',
          explanationOfChange: 'Output pin voltage has not been measured.',
          citingEvidenceIds: [],
          suggestedVerification: 'Measure D8 voltage during sketch operation.',
        },
      ],
      nextRecommendedChecks: [
        {
          stepNumber: 1,
          title: 'Multimeter Diode Mode Test',
          testType: 'Unpowered Diode Check',
          toolsNeeded: ['Digital Multimeter with Diode Mode'],
          procedure: 'Place red probe on row 10 and black probe on row 11.',
          expectedResult: 'Display shows ~1.8V to 2.1V forward drop and LED dimly glows.',
          safetyNotes: ['Unplug USB cable before probing.'],
        },
      ],
      safetyWarnings: ['Do not apply power until polarity and wiring are confirmed.'],
      limitations: ['No numerical electrical measurements have been recorded yet.'],
    };

    setReassessmentAnalyzerOverrideForTesting(async () => scenarioCMockResponse);

    const resC = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenarioCRequest),
    });

    const dataC = (await resC.json()) as DiagnosisReassessmentResponse;
    assert(resC.status === 200, 'Scenario C: Returns HTTP 200');
    assert(
      dataC.revisedHypotheses.every((h) => h.status === 'unresolved'),
      'Scenario C: All hypotheses remain strictly unresolved under incomplete evidence'
    );
    assert(
      Array.isArray(dataC.revisedHypotheses[0].citingEvidenceIds) &&
        dataC.revisedHypotheses[0].citingEvidenceIds.length === 0,
      'Scenario C: Empty citation array correctly accepted for uninvestigated hypothesis'
    );
    assert(
      dataC.revisedHypotheses.every((h) => typeof h.suggestedVerification === 'string' && h.suggestedVerification.length > 0),
      'Scenario C: Suggested verification provided for all unresolved hypotheses'
    );

    // =======================================================================
    // SCENARIO D: Conflicting evidence (contradictory readings acknowledged)
    // =======================================================================
    console.log('\n--- SCENARIO D: Conflicting Evidence ---');

    const scenarioDEvidence: EvidenceRecord[] = [
      {
        id: 'ev-d1',
        targetRecommendationId: 'rec_inv_scen_d_c0_s1',
        cycleIndex: 0,
        stepNumber: 1,
        checkTitle: 'Out-of-Circuit Diode Test on LED',
        outcome: 'passed',
        numericValue: 1.85,
        measurementUnit: 'V',
        technicianNotes: 'LED removed from breadboard and tested with multimeter diode mode: 1.85V forward drop, LED lights up dimly.',
        recordedAt: '2026-10-30T10:20:00Z',
      },
      {
        id: 'ev-d2',
        targetRecommendationId: 'rec_inv_scen_d_c0_s2',
        cycleIndex: 0,
        stepNumber: 2,
        checkTitle: 'In-Circuit LED Voltage Under Drive',
        outcome: 'failed',
        numericValue: 0.0,
        measurementUnit: 'V',
        technicianNotes: 'Re-inserted LED into breadboard. During sketch execution, voltage across LED leads measures 0.00V.',
        recordedAt: '2026-10-30T10:22:00Z',
      },
    ];

    const scenarioDRequest: DiagnosisReassessmentRequest = {
      diagnosticContext: getArduinoLedDiagnosticContext(),
      evidence: scenarioDEvidence,
    };

    // Verify prompt retains both contradictory records
    const promptD = buildReassessmentUserPrompt(scenarioDRequest);
    assert(promptD.includes('ev-d1') && promptD.includes('ev-d2'), 'Scenario D: Prompt preserves both conflicting records');
    assert(promptD.includes('1.85 V') && promptD.includes('0 V'), 'Scenario D: Prompt includes both contradictory readings');

    const scenarioDMockResponse: DiagnosisReassessmentResponse = {
      summary:
        'Conflicting observations detected: LED junction is functional out-of-circuit (1.85V), but receives 0.00V in-circuit, indicating a contact or trace fault on the breadboard.',
      evidenceSynthesis:
        'The discrepancy between normal out-of-circuit diode operation (ev-d1) and zero in-circuit voltage (ev-d2) proves the LED is functional but isolated from the drive voltage by socket or jumper faults.',
      revisedHypotheses: [
        {
          title: 'Defective LED Component',
          status: 'contradicted',
          confidence: 'high',
          explanationOfChange:
            'Bench diode test (ev-d1) confirms the LED junction emits light and drops 1.85V, ruling out a dead diode.',
          citingEvidenceIds: ['ev-d1'],
        },
        {
          title: 'Breadboard Contact or Interconnect Open Circuit',
          status: 'supported',
          confidence: 'high',
          explanationOfChange:
            'Zero voltage across the functional LED in-circuit (ev-d2) despite intact diode junction (ev-d1) points to high resistance in the breadboard socket.',
          citingEvidenceIds: ['ev-d1', 'ev-d2'],
        },
      ],
      nextRecommendedChecks: [
        {
          stepNumber: 1,
          title: 'Breadboard Tie-Point Contact Resistance Probe',
          testType: 'Unpowered Continuity',
          toolsNeeded: ['Digital Multimeter with fine probe tips'],
          procedure: 'Measure resistance from D8 wire to LED anode lead inside the breadboard spring clip.',
          expectedResult: '< 0.5 Ohm contact resistance.',
          safetyNotes: ['Unpowered test only.'],
        },
      ],
      safetyWarnings: ['Ensure circuit is unpowered while probing breadboard spring contacts.'],
      limitations: ['Internal spring clip oxidation cannot be seen without disassembly.'],
    };

    setReassessmentAnalyzerOverrideForTesting(async () => scenarioDMockResponse);

    const resD = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenarioDRequest),
    });

    const dataD = (await resD.json()) as DiagnosisReassessmentResponse;
    assert(resD.status === 200, 'Scenario D: Returns HTTP 200');
    assert(
      dataD.revisedHypotheses[1].citingEvidenceIds.includes('ev-d1') &&
        dataD.revisedHypotheses[1].citingEvidenceIds.includes('ev-d2'),
      'Scenario D: Synthesis cites both conflicting evidence records'
    );
    assert(
      dataD.nextRecommendedChecks.length === 1,
      'Scenario D: Recommends safe focused follow-up check to resolve conflict'
    );

    // =======================================================================
    // SCENARIO E: Superseded evidence (traceable supersession)
    // =======================================================================
    console.log('\n--- SCENARIO E: Superseded Evidence ---');

    const scenarioEEvidence: EvidenceRecord[] = [
      {
        id: 'ev-e1',
        targetRecommendationId: 'rec_inv_scen_e_c0_s1',
        cycleIndex: 0,
        stepNumber: 1,
        checkTitle: 'D8 Pin Output Voltage Check',
        outcome: 'failed',
        numericValue: 0.05,
        measurementUnit: 'V',
        technicianNotes: 'Initial measurement showed ~0V. Technician later noted probe was touching plastic shroud.',
        recordedAt: '2026-10-30T10:30:00Z',
      },
      {
        id: 'ev-e2',
        targetRecommendationId: 'rec_inv_scen_e_c0_s1',
        cycleIndex: 0,
        stepNumber: 1,
        checkTitle: 'D8 Pin Output Voltage Check (Repeat with Proper Probe Seating)',
        outcome: 'passed',
        numericValue: 4.88,
        measurementUnit: 'V',
        technicianNotes: 'Probe firmly placed on metal header pin. Voltage alternates 4.88V HIGH to 0.01V LOW.',
        recordedAt: '2026-10-30T10:32:00Z',
        supersedesEvidenceId: 'ev-e1',
      },
    ];

    const scenarioERequest: DiagnosisReassessmentRequest = {
      diagnosticContext: getArduinoLedDiagnosticContext(),
      evidence: scenarioEEvidence,
    };

    // 1. Verify valid request passes validation and builds prompt with supersession trail
    const promptE = buildReassessmentUserPrompt(scenarioERequest);
    assert(promptE.includes('ev-e1') && promptE.includes('ev-e2'), 'Scenario E: Both original and superseding records in prompt');
    assert(
      promptE.includes('Supersedes Prior Evidence: ev-e1'),
      'Scenario E: Supersession relationship explicitly annotated in prompt'
    );

    // 2. Verify invalid supersession references are rejected by server validation (fail fast)
    console.log('\n[Scenario E Sub-test] Rejection of invalid supersession references');
    try {
      validateReassessmentRequest({
        ...scenarioERequest,
        evidence: [
          {
            ...scenarioEEvidence[1],
            supersedesEvidenceId: 'ev-e2', // Self-reference
          },
        ],
      });
      assert(false, 'Self-referencing supersession should throw');
    } catch (err) {
      assert(
        err instanceof ReassessmentRequestValidationError &&
          err.message.includes('cannot reference its own ID'),
        'Rejects self-referencing supersedesEvidenceId with 400 error'
      );
    }

    try {
      validateReassessmentRequest({
        ...scenarioERequest,
        evidence: [
          {
            ...scenarioEEvidence[1],
            supersedesEvidenceId: 'ev-nonexistent-99', // Unknown ID
          },
        ],
      });
      assert(false, 'Nonexistent supersession reference should throw');
    } catch (err) {
      assert(
        err instanceof ReassessmentRequestValidationError &&
          err.message.includes('references unknown evidence ID'),
        'Rejects unknown supersedesEvidenceId reference with 400 error'
      );
    }

    // 3. Endpoint execution with valid supersession
    const scenarioEMockResponse: DiagnosisReassessmentResponse = {
      summary:
        'Corrected measurement superseding the initial flawed probe contact confirms D8 produces nominal 4.88V output.',
      evidenceSynthesis:
        'Evidence record ev-e2 supersedes ev-e1; the properly seated probe demonstrates normal pin drive, ruling out microcontroller port failure.',
      revisedHypotheses: [
        {
          title: 'Microcontroller Pin D8 Output Driver Failure',
          status: 'contradicted',
          confidence: 'high',
          explanationOfChange:
            'Corrected measurement ev-e2 (superseding ev-e1) confirms pin D8 generates nominal 4.88V HIGH pulses.',
          citingEvidenceIds: ['ev-e1', 'ev-e2'],
        },
      ],
      nextRecommendedChecks: [],
      safetyWarnings: ['Ensure test probes do not bridge adjacent header pins to GND.'],
      limitations: [],
    };

    setReassessmentAnalyzerOverrideForTesting(async () => scenarioEMockResponse);

    const resE = await fetch(`${baseUrl}/api/reassess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenarioERequest),
    });

    assert(resE.status === 200, 'Scenario E: Endpoint returns HTTP 200 for valid supersession ledger');

    // =======================================================================
    // INTEGRITY SCENARIO F: Unsupported physical confirmation analysis
    // =======================================================================
    console.log('\n--- INTEGRITY SCENARIO F: Unsupported Physical Confirmation ---');

    // Case F.1: Model emits forbidden "confirmed" status in structured field
    console.log('[Case F.1] Model attempts to declare hypothesis status as "confirmed"');
    const mockConfirmedStatusResponse = {
      ...scenarioAMockResponse,
      revisedHypotheses: [
        {
          ...scenarioAMockResponse.revisedHypotheses[0],
          status: 'confirmed', // ILLEGAL enum
        },
      ],
    };

    try {
      validateReassessmentResponse(mockConfirmedStatusResponse, new Set(['ev-a1', 'ev-a2', 'ev-a3', 'ev-a4']));
      assert(false, 'Status "confirmed" must be rejected');
    } catch (err) {
      assert(
        err instanceof ReassessmentValidationError && err.message.includes('must be one of: supported, weakened, unresolved, contradicted'),
        'Case F.1: Schema validation strictly catches and rejects "confirmed" status'
      );
    }

    // Case F.2: Model emits valid status "supported", but uses natural-language text claiming AI physically confirmed the fault
    console.log('\n[Case F.2] Model emits valid "supported" status with deceptive natural-language claim in text');
    const mockDeceptiveProseResponse: DiagnosisReassessmentResponse = {
      ...scenarioAMockResponse,
      summary: 'CircuitLens AI has independently physically confirmed and proven on the bench that the ground rail is defective.',
      revisedHypotheses: [
        {
          ...scenarioAMockResponse.revisedHypotheses[0],
          explanationOfChange:
            'CircuitLens AI directly physically touched and measured the circuit pins to verify this root cause.',
        },
      ],
    };

    // Evaluate what the schema validator catches vs what it cannot catch
    let schemaAcceptedDeceptive = false;
    try {
      validateReassessmentResponse(mockDeceptiveProseResponse, new Set(['ev-a1', 'ev-a2', 'ev-a3', 'ev-a4']));
      schemaAcceptedDeceptive = true;
    } catch {
      schemaAcceptedDeceptive = false;
    }

    assert(
      schemaAcceptedDeceptive === true,
      'Case F.2: Schema validator accepts syntactically valid strings in prose fields without brittle keyword blacklisting'
    );
    console.log('    [Finding F.2]: Structural schema validation enforces status enums and citation links.');
    console.log('    [Finding F.2]: Deceptive prose ("AI independently confirmed") is prevented by:');
    console.log('      1. System Prompt Rule 1 ("NO NEW VISUAL INSPECTION") & Rule 3 ("Physical confirmation rests exclusively with the technician").');
    console.log('      2. UI Presentation Layer: Banner explicitly announces "No new visual inspection occurred. Reassessment is based strictly on documented bench test evidence."');
    console.log('      3. Hypothesis badge renders "Supported" (never "Confirmed").');

    // =======================================================================
    // INTEGRITY SCENARIO G: Citation integrity
    // =======================================================================
    console.log('\n--- INTEGRITY SCENARIO G: Citation Integrity ---');

    const validEvidenceIds = new Set(['ev-1', 'ev-2']);

    // G.1 Valid citation IDs
    console.log('[Case G.1] Valid evidence citations');
    const validCitationHyp = {
      summary: 'Valid summary.',
      evidenceSynthesis: 'Valid synthesis.',
      revisedHypotheses: [
        {
          title: 'H1',
          status: 'supported' as const,
          confidence: 'high' as const,
          explanationOfChange: 'Supported by ev-1.',
          citingEvidenceIds: ['ev-1', 'ev-2'],
        },
      ],
      nextRecommendedChecks: [],
      safetyWarnings: ['Warning.'],
      limitations: [],
    };
    const validatedG1 = validateReassessmentResponse(validCitationHyp, validEvidenceIds);
    assert(validatedG1.revisedHypotheses[0].citingEvidenceIds.length === 2, 'Case G.1: Valid citations accepted');

    // G.2 Unknown/hallucinated citation ID
    console.log('\n[Case G.2] Unknown / hallucinated citation ID');
    const hallucinatedCitationHyp = {
      ...validCitationHyp,
      revisedHypotheses: [
        {
          ...validCitationHyp.revisedHypotheses[0],
          citingEvidenceIds: ['ev-1', 'ev-hallucinated-999'],
        },
      ],
    };
    try {
      validateReassessmentResponse(hallucinatedCitationHyp, validEvidenceIds);
      assert(false, 'Hallucinated citation must be rejected');
    } catch (err) {
      assert(
        err instanceof ReassessmentValidationError &&
          err.message.includes('cites unknown evidence ID "ev-hallucinated-999"'),
        'Case G.2: Rejects unknown citation ID with ReassessmentValidationError'
      );
    }

    // G.3 Incorrectly typed citation ID (e.g., number or empty string)
    console.log('\n[Case G.3] Incorrectly typed citation ID (number or empty string)');
    const nonStringCitationHyp = {
      ...validCitationHyp,
      revisedHypotheses: [
        {
          ...validCitationHyp.revisedHypotheses[0],
          citingEvidenceIds: [123],
        },
      ],
    };
    try {
      validateReassessmentResponse(nonStringCitationHyp, validEvidenceIds);
      assert(false, 'Numeric citation ID must be rejected');
    } catch (err) {
      assert(
        err instanceof ReassessmentValidationError &&
          err.message.includes('must be a non-empty string'),
        'Case G.3: Rejects non-string citation ID'
      );
    }

    const emptyStringCitationHyp = {
      ...validCitationHyp,
      revisedHypotheses: [
        {
          ...validCitationHyp.revisedHypotheses[0],
          citingEvidenceIds: ['   '],
        },
      ],
    };
    try {
      validateReassessmentResponse(emptyStringCitationHyp, validEvidenceIds);
      assert(false, 'Whitespace citation ID must be rejected');
    } catch (err) {
      assert(
        err instanceof ReassessmentValidationError &&
          err.message.includes('must be a non-empty string'),
        'Case G.3: Rejects whitespace citation ID'
      );
    }

    // G.4 Missing citingEvidenceIds field
    console.log('\n[Case G.4] Missing citingEvidenceIds array');
    const missingCitationHyp = {
      ...validCitationHyp,
      revisedHypotheses: [
        {
          title: 'H1',
          status: 'supported' as const,
          confidence: 'high' as const,
          explanationOfChange: 'Supported.',
          // citingEvidenceIds omitted
        },
      ],
    };
    try {
      validateReassessmentResponse(missingCitationHyp, validEvidenceIds);
      assert(false, 'Missing citingEvidenceIds must be rejected');
    } catch (err) {
      assert(
        err instanceof ReassessmentValidationError &&
          err.message.includes('citingEvidenceIds" must be an array'),
        'Case G.4: Rejects missing citingEvidenceIds'
      );
    }

    // G.5 Empty citation array for unresolved hypothesis
    console.log('\n[Case G.5] Empty citation array for unresolved hypothesis');
    const emptyCitationHyp = {
      ...validCitationHyp,
      revisedHypotheses: [
        {
          title: 'H1',
          status: 'unresolved' as const,
          confidence: 'low' as const,
          explanationOfChange: 'No evidence collected yet.',
          citingEvidenceIds: [],
        },
      ],
    };
    const validatedG5 = validateReassessmentResponse(emptyCitationHyp, validEvidenceIds);
    assert(
      validatedG5.revisedHypotheses[0].citingEvidenceIds.length === 0,
      'Case G.5: Empty citation array accepted for unresolved hypothesis'
    );

    // G.6 Citation of superseded evidence
    console.log('\n[Case G.6] Citation referencing superseded evidence record');
    // When the model cites both the old flawed attempt and the new attempt to explain the correction
    const supersededEvidenceIds = new Set(['ev-orig', 'ev-corrected']);
    const citingSupersededHyp = {
      ...validCitationHyp,
      revisedHypotheses: [
        {
          title: 'H1',
          status: 'contradicted' as const,
          confidence: 'high' as const,
          explanationOfChange: 'Original measurement ev-orig was flawed; corrected measurement ev-corrected refutes fault.',
          citingEvidenceIds: ['ev-orig', 'ev-corrected'],
        },
      ],
    };
    const validatedG6 = validateReassessmentResponse(citingSupersededHyp, supersededEvidenceIds);
    assert(
      validatedG6.revisedHypotheses[0].citingEvidenceIds.length === 2,
      'Case G.6: Citing both original and superseded record accepted when both are in evidence history'
    );

    // =======================================================================
    // STAGE 5C-3L-4 ADVERSARIAL INTEGRITY SCENARIOS
    // =======================================================================
    console.log('\n--- STAGE 5C-3L-4 ADVERSARIAL INTEGRITY SCENARIOS ---');

    // Adversarial A: First-person physical agency claims
    console.log('\n[Adversarial A] First-person physical agency claims and attribution guardrails');
    assert(
      REASSESSMENT_SYSTEM_PROMPT.includes('remote AI electronics analytical assistant'),
      'Adversarial A.1: System prompt establishes remote analytical assistant role'
    );
    assert(
      REASSESSMENT_SYSTEM_PROMPT.includes('zero direct access to physical hardware'),
      'Adversarial A.2: System prompt explicitly states zero physical hardware access'
    );
    assert(
      REASSESSMENT_SYSTEM_PROMPT.includes('NEVER claim or imply first-person physical agency'),
      'Adversarial A.3: System prompt strictly prohibits first-person physical claims'
    );
    assert(
      REASSESSMENT_SYSTEM_PROMPT.includes('Attribute all physical actions, measurements, rework, and bench outcomes strictly to the technician'),
      'Adversarial A.4: System prompt mandates attributing physical actions to the technician'
    );
    const testPromptWithReminder = buildReassessmentUserPrompt(scenarioARequest);
    assert(
      testPromptWithReminder.includes('without direct hardware access') &&
        testPromptWithReminder.includes('All measurements were conducted by the technician'),
      'Adversarial A.5: User prompt reinforces lack of hardware access and technician attribution'
    );
    const firstPersonProseResponse = {
      ...validCitationHyp,
      summary: 'We physically probed pin 13 with our oscilloscope and measured 0V.',
    };
    const validatedFirstPerson = validateReassessmentResponse(firstPersonProseResponse, validEvidenceIds);
    assert(
      validatedFirstPerson.summary.includes('We physically probed'),
      'Adversarial A.6: Demonstrates schema validator accepts prose syntax; prompt rules & UI disclaimer are necessary safeguards'
    );

    // Adversarial B: Status/prose contradiction
    console.log('\n[Adversarial B] Status/prose contradiction');
    const statusContradictionResponse = {
      ...validCitationHyp,
      revisedHypotheses: [
        {
          title: 'H1',
          status: 'supported' as const,
          confidence: 'high' as const,
          explanationOfChange: 'The technician measurements completely disproved this mechanism.',
          citingEvidenceIds: ['ev-1'],
        },
      ],
    };
    const validatedContradiction = validateReassessmentResponse(statusContradictionResponse, validEvidenceIds);
    assert(
      validatedContradiction.revisedHypotheses[0].status === 'supported',
      'Adversarial B.1: Demonstrates schema validator checks enum validity but cannot evaluate prose semantic contradiction'
    );
    assert(
      REASSESSMENT_SYSTEM_PROMPT.includes('HONEST UNCERTAINTY & CONFLICTING EVIDENCE'),
      'Adversarial B.2: System prompt contains explicit rule governing conflicting evidence and uncertainty'
    );

    // Adversarial C: Uncited status changes
    console.log('\n[Adversarial C] Uncited status changes');
    for (const nonUnresolvedStatus of ['supported', 'weakened', 'contradicted'] as const) {
      const uncitedHyp = {
        ...validCitationHyp,
        revisedHypotheses: [
          {
            title: 'H1',
            status: nonUnresolvedStatus,
            confidence: 'high' as const,
            explanationOfChange: 'Status changed without evidence citation.',
            citingEvidenceIds: [],
          },
        ],
      };
      try {
        validateReassessmentResponse(uncitedHyp, validEvidenceIds);
        assert(false, `Status "${nonUnresolvedStatus}" with empty citingEvidenceIds must be rejected`);
      } catch (err) {
        assert(
          err instanceof ReassessmentValidationError &&
            err.message.includes(`must contain at least one evidence citation when status is "${nonUnresolvedStatus}"`),
          `Adversarial C: Rejects "${nonUnresolvedStatus}" hypothesis with empty citation array`
        );
      }
    }
    const duplicateCitationHyp = {
      ...validCitationHyp,
      revisedHypotheses: [
        {
          title: 'H1',
          status: 'supported' as const,
          confidence: 'high' as const,
          explanationOfChange: 'Supported.',
          citingEvidenceIds: ['ev-1', 'ev-1'],
        },
      ],
    };
    try {
      validateReassessmentResponse(duplicateCitationHyp, validEvidenceIds);
      assert(false, 'Duplicate citingEvidenceIds must be rejected');
    } catch (err) {
      assert(
        err instanceof ReassessmentValidationError &&
          err.message.includes('contains duplicate evidence citation'),
        'Adversarial C.4: Rejects duplicate citation IDs within a hypothesis'
      );
    }

    // Adversarial D: Non-existent evidence
    console.log('\n[Adversarial D] Non-existent evidence citation');
    const ghostEvidenceHyp = {
      ...validCitationHyp,
      revisedHypotheses: [
        {
          title: 'H1',
          status: 'supported' as const,
          confidence: 'high' as const,
          explanationOfChange: 'Supported by ghost evidence.',
          citingEvidenceIds: ['ev-nonexistent-777'],
        },
      ],
    };
    try {
      validateReassessmentResponse(ghostEvidenceHyp, validEvidenceIds);
      assert(false, 'Unknown evidence ID must be rejected');
    } catch (err) {
      assert(
        err instanceof ReassessmentValidationError &&
          err.message.includes('cites unknown evidence ID "ev-nonexistent-777"'),
        'Adversarial D.1: Rejects unknown evidence citation ID'
      );
    }

    // Adversarial E: Superseded evidence preservation
    console.log('\n[Adversarial E] Superseded evidence preservation and distinction');
    const multiAttemptIds = new Set(['ev-attempt-1', 'ev-attempt-2']);
    const citingOldAndNew = {
      ...validCitationHyp,
      revisedHypotheses: [
        {
          title: 'H1',
          status: 'supported' as const,
          confidence: 'high' as const,
          explanationOfChange: 'Initial test ev-attempt-1 failed due to slip; second attempt ev-attempt-2 confirmed reading.',
          citingEvidenceIds: ['ev-attempt-1', 'ev-attempt-2'],
        },
      ],
    };
    const validatedOldAndNew = validateReassessmentResponse(citingOldAndNew, multiAttemptIds);
    assert(
      validatedOldAndNew.revisedHypotheses[0].citingEvidenceIds.length === 2,
      'Adversarial E.1: Preserves historical citations to both superseded and active evidence'
    );

    // Adversarial F: Unsupported certainty
    console.log('\n[Adversarial F] Unsupported certainty and pseudo-confirmation');
    assert(
      REASSESSMENT_SYSTEM_PROMPT.includes('ANTI-CONFIRMATION') &&
        REASSESSMENT_SYSTEM_PROMPT.includes('Do NOT claim absolute certainty') &&
        REASSESSMENT_SYSTEM_PROMPT.includes('Do NOT use pseudo-confirmation titles'),
      'Adversarial F.1: System prompt explicitly forbids absolute certainty and pseudo-confirmation titles'
    );

    // Adversarial G: Hypothesis title drift
    console.log('\n[Adversarial G] Hypothesis title drift');
    assert(
      REASSESSMENT_SYSTEM_PROMPT.includes('Preserve the identity of initial hypotheses unless a refinement is genuinely justified'),
      'Adversarial G.1: System prompt mandates preserving original hypothesis identity'
    );
    const renamedHypothesis = {
      ...validCitationHyp,
      revisedHypotheses: [
        {
          title: 'A Subtly Refined Hypothesis Title',
          status: 'supported' as const,
          confidence: 'high' as const,
          explanationOfChange: 'Legitimate refined wording.',
          citingEvidenceIds: ['ev-1'],
        },
      ],
    };
    const validatedRenamed = validateReassessmentResponse(renamedHypothesis, validEvidenceIds);
    assert(
      validatedRenamed.revisedHypotheses[0].title === 'A Subtly Refined Hypothesis Title',
      'Adversarial G.2: Schema allows legitimate title refinements without breaking contract'
    );

    // Adversarial H: Legitimate technical language preservation
    console.log('\n[Adversarial H] Legitimate technical language preservation');
    const legitimateTechnicalResponse = {
      summary: 'The technician measured 4.8 V on the supply rail, supporting the nominal voltage hypothesis.',
      evidenceSynthesis: 'The technician confirmed the rail voltage is within normal operating tolerance.',
      revisedHypotheses: [
        {
          title: 'Supply Rail Voltage Regulation Failure',
          status: 'contradicted' as const,
          confidence: 'high' as const,
          explanationOfChange: 'The recorded test supports the ground-path hypothesis. The evidence is consistent with an open return path.',
          citingEvidenceIds: ['ev-1'],
          suggestedVerification: undefined,
        },
      ],
      nextRecommendedChecks: [
        {
          stepNumber: 1,
          title: 'Perform continuity check',
          testType: 'Continuity',
          toolsNeeded: ['Multimeter'],
          procedure: 'A further continuity test is recommended from LED cathode to GND.',
          expectedResult: 'Resistance < 1 Ohm',
          safetyNotes: ['Ensure board is unpowered.'],
        },
      ],
      safetyWarnings: ['Ensure circuit is completely unpowered before measuring resistance.'],
      limitations: ['Secondary microcontroller GPIO integrity remains unverified.'],
    };
    const validatedLegit = validateReassessmentResponse(legitimateTechnicalResponse, validEvidenceIds);
    assert(
      validatedLegit.summary.includes('The technician measured 4.8 V') &&
        validatedLegit.revisedHypotheses[0].explanationOfChange.includes('consistent with an open return path'),
      'Adversarial H.1: Legitimate technician-attributed engineering statements are accepted without false rejection'
    );

    // Adversarial I: Diagnostic Language & Incomplete Measurement Evidence
    console.log('\n[Adversarial I] Diagnostic language guidance & empirical measurement vs root cause');
    assert(
      REASSESSMENT_SYSTEM_PROMPT.includes('EMPIRICAL MEASUREMENTS VS. PHYSICAL ROOT CAUSE'),
      'Adversarial I.1: System prompt mandates empirical measurement distinction vs physical root cause'
    );
    assert(
      REASSESSMENT_SYSTEM_PROMPT.includes('account for the populated board: parallel loads'),
      'Adversarial I.2: System prompt requires accounting for populated board and parallel loads'
    );
    assert(
      REASSESSMENT_SYSTEM_PROMPT.includes('specific component-level fault locations remain strictly unresolved until physical isolation evidence'),
      'Adversarial I.3: System prompt mandates component-level faults remain unresolved without isolation evidence'
    );

    // Test that cautious empirical wording on populated board passes schema validation
    const cautiousPopulatedBoardResponse = {
      summary: 'The technician measured 2.1 Ω between 5V and GND, indicating severe low impedance on the populated rail consistent with an overload or short circuit.',
      evidenceSynthesis: 'A 2.1 Ω cold resistance measurement on the populated 5V rail indicates abnormally low impedance; however, because bypass capacitors, the linear regulator, and ICs share the net, specific component-level location remains unresolved without isolation testing.',
      revisedHypotheses: [
        {
          title: '5V Rail Low-Impedance Fault',
          status: 'supported' as const,
          confidence: 'high' as const,
          explanationOfChange: 'The technician-measured 2.1 Ω resistance supports severe low-impedance loading on the 5V rail; specific root-cause component remains unisolated.',
          citingEvidenceIds: ['ev-1'],
        },
      ],
      nextRecommendedChecks: [
        {
          stepNumber: 1,
          title: 'Isolate regulator output pin',
          testType: 'Component Isolation',
          toolsNeeded: ['Soldering iron', 'Multimeter'],
          procedure: 'Lift regulator output pin to decouple regulator from downstream rail.',
          expectedResult: 'Rail resistance increases to > 1 kΩ if short is in regulator.',
          safetyNotes: ['Ensure board is unpowered.'],
        },
      ],
      safetyWarnings: ['Do not power the board while low rail resistance persists.'],
      limitations: ['Component-level isolation has not been performed; parallel loads cannot be distinguished.'],
    };
    const validatedCautious = validateReassessmentResponse(cautiousPopulatedBoardResponse, validEvidenceIds);
    assert(
      validatedCautious.summary.includes('indicating severe low impedance') &&
        validatedCautious.limitations[0].includes('Component-level isolation has not been performed'),
      'Adversarial I.4: Cautious empirical statements accounting for populated boards and unisolated components pass validation'
    );

  } finally {
    // Teardown ephemeral server cleanly
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('\nEphemeral test server closed.');
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('='.repeat(70));
  console.log(`Reassessment Scenarios Test Suite: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('='.repeat(70));

  if (failedCount > 0) {
    process.exit(1);
  }
}

// Execute tests
runScenarioTests().catch((err) => {
  console.error('Unhandled test suite failure:', err);
  process.exit(1);
});

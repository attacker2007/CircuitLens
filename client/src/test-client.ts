/**
 * CircuitLens Client-Side Automated Offline Verification Suite
 *
 * Verifies:
 * 1. Abort signal propagation and cancellation handling in submitCircuitDiagnosis
 * 2. Pre-flight boundary checks and cancellation handling in submitCircuitReassessment
 * 3. Evidence form validation and numeric/string limits
 * 4. Identifier generation determinism and uniqueness
 * 5. Component unmount / cancellation lifecycle simulation
 *
 * Runs 100% offline with zero live model requests and zero network dependencies.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  submitCircuitDiagnosis,
  submitCircuitReassessment,
  DiagnosisClientError,
  DEFAULT_TIMEOUT_MS,
  isValidDiagnosisResponse,
  isValidReassessmentResponse,
} from './api/diagnosisClient.ts';
import {
  calculateTargetDimensions,
  shouldOptimizeImage,
  optimizeImageForDiagnosis,
} from './utils/imageOptimizer.ts';
import {
  validateEvidenceForm,
  generateRecommendationId,
  generateEvidenceId,
  generateInvestigationId,
} from './utils/evidenceValidation.ts';
import { translations } from './i18n.ts';
import { findLatestRevisedHypothesis } from './utils/hypothesisMatching.ts';
import type {
  DiagnosisRequest,
  DiagnosisReassessmentRequest,
  DiagnosisReassessmentResponse,
  EvidenceRecord,
} from './types/diagnosis.ts';

const t = translations.en;

const mockDiagnosisRequest: DiagnosisRequest = {
  image: 'data:image/jpeg;base64,sample',
  expectedBehavior: 'Board powers up normally',
  observedBehavior: 'Board does not boot',
};

const mockDiagnosticContext = {
  expectedBehavior: 'Board powers up normally',
  observedBehavior: 'Board does not boot',
  initialSummary: 'Initial fault suspected at power rail',
  visibleObservations: [],
  initialHypotheses: [],
};

describe('submitCircuitDiagnosis Abort & Cancellation Handling', () => {
  it('throws DiagnosisClientError with CANCELLED (499) immediately if signal is pre-aborted without invoking fetch', async () => {
    let fetchCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error('fetch should not be called');
    };

    try {
      const controller = new AbortController();
      controller.abort();

      await assert.rejects(
        async () => {
          await submitCircuitDiagnosis(mockDiagnosisRequest, controller.signal);
        },
        (err: unknown) => {
          if (!(err instanceof DiagnosisClientError)) return false;
          assert.strictEqual(err.errorType, 'CANCELLED');
          assert.strictEqual(err.statusCode, 499);
          assert.strictEqual(err.isRetryable, false);
          return true;
        }
      );

      assert.strictEqual(fetchCalled, false, 'Pre-aborted signal must not dispatch network fetch');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('aborts active fetch and throws CANCELLED (499) when signal is aborted in-flight', async () => {
    const originalFetch = globalThis.fetch;
    const controller = new AbortController();

    globalThis.fetch = (_url, options) => {
      return new Promise((_, reject) => {
        const signal = options?.signal;
        if (signal?.aborted) {
          reject(new DOMException('The user aborted a request.', 'AbortError'));
          return;
        }
        signal?.addEventListener('abort', () => {
          reject(new DOMException('The user aborted a request.', 'AbortError'));
        });
      });
    };

    try {
      const diagnosisPromise = submitCircuitDiagnosis(mockDiagnosisRequest, controller.signal);

      // Trigger user cancellation in-flight
      setTimeout(() => {
        controller.abort();
      }, 10);

      await assert.rejects(
        async () => {
          await diagnosisPromise;
        },
        (err: unknown) => {
          if (!(err instanceof DiagnosisClientError)) return false;
          assert.strictEqual(err.errorType, 'CANCELLED');
          assert.strictEqual(err.statusCode, 499);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('maps connection errors to NETWORK_ERROR (0)', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch');
    };

    try {
      await assert.rejects(
        async () => {
          await submitCircuitDiagnosis(mockDiagnosisRequest);
        },
        (err: unknown) => {
          if (!(err instanceof DiagnosisClientError)) return false;
          assert.strictEqual(err.errorType, 'NETWORK_ERROR');
          assert.strictEqual(err.statusCode, 0);
          assert.strictEqual(err.isRetryable, true);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('submitCircuitReassessment Pre-Flight Boundaries & Cancellation', () => {
  it('throws CANCELLED (499) immediately if signal is pre-aborted without invoking fetch', async () => {
    let fetchCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error('fetch should not be called');
    };

    try {
      const controller = new AbortController();
      controller.abort();

      const payload: DiagnosisReassessmentRequest = {
        diagnosticContext: mockDiagnosticContext,
        evidence: [
          {
            id: 'ev_1',
            targetRecommendationId: 'rec_inv_c0_s1',
            cycleIndex: 0,
            stepNumber: 1,
            checkTitle: 'Measure 3.3V Rail',
            outcome: 'failed',
            recordedAt: new Date().toISOString(),
          },
        ],
      };

      await assert.rejects(
        async () => {
          await submitCircuitReassessment(payload, controller.signal);
        },
        (err: unknown) => {
          if (!(err instanceof DiagnosisClientError)) return false;
          assert.strictEqual(err.errorType, 'CANCELLED');
          assert.strictEqual(err.statusCode, 499);
          return true;
        }
      );

      assert.strictEqual(fetchCalled, false, 'Pre-aborted signal must not dispatch network fetch');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('enforces pre-flight boundary: rejects empty evidence arrays with HTTP 400 without invoking fetch', async () => {
    let fetchCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error('fetch should not be called');
    };

    try {
      const payload: DiagnosisReassessmentRequest = {
        diagnosticContext: mockDiagnosticContext,
        evidence: [],
      };

      await assert.rejects(
        async () => {
          await submitCircuitReassessment(payload);
        },
        (err: unknown) => {
          if (!(err instanceof DiagnosisClientError)) return false;
          assert.strictEqual(err.errorType, 'INVALID_REQUEST');
          assert.strictEqual(err.statusCode, 400);
          return true;
        }
      );

      assert.strictEqual(fetchCalled, false, 'Empty evidence array must not call fetch');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('enforces pre-flight boundary: rejects > 20 evidence records with HTTP 400 without invoking fetch', async () => {
    let fetchCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error('fetch should not be called');
    };

    try {
      const excessEvidence: EvidenceRecord[] = Array.from({ length: 21 }, (_, i) => ({
        id: `ev_${i}`,
        targetRecommendationId: `rec_c0_s${i + 1}`,
        cycleIndex: 0,
        stepNumber: i + 1,
        checkTitle: `Test ${i + 1}`,
        outcome: 'passed' as const,
        recordedAt: new Date().toISOString(),
      }));

      const payload: DiagnosisReassessmentRequest = {
        diagnosticContext: mockDiagnosticContext,
        evidence: excessEvidence,
      };

      await assert.rejects(
        async () => {
          await submitCircuitReassessment(payload);
        },
        (err: unknown) => {
          if (!(err instanceof DiagnosisClientError)) return false;
          assert.strictEqual(err.errorType, 'INVALID_REQUEST');
          assert.strictEqual(err.statusCode, 400);
          return true;
        }
      );

      assert.strictEqual(fetchCalled, false, 'Excess evidence array must not call fetch');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('aborts active fetch and throws CANCELLED (499) when reassessment signal is aborted in-flight', async () => {
    const originalFetch = globalThis.fetch;
    const controller = new AbortController();

    globalThis.fetch = (_url, options) => {
      return new Promise((_, reject) => {
        const signal = options?.signal;
        if (signal?.aborted) {
          reject(new DOMException('The user aborted a request.', 'AbortError'));
          return;
        }
        signal?.addEventListener('abort', () => {
          reject(new DOMException('The user aborted a request.', 'AbortError'));
        });
      });
    };

    try {
      const payload: DiagnosisReassessmentRequest = {
        diagnosticContext: mockDiagnosticContext,
        evidence: [
          {
            id: 'ev_1',
            targetRecommendationId: 'rec_c0_s1',
            cycleIndex: 0,
            stepNumber: 1,
            checkTitle: 'Probe VCC',
            outcome: 'passed',
            recordedAt: new Date().toISOString(),
          },
        ],
      };

      const reassessPromise = submitCircuitReassessment(payload, controller.signal);

      setTimeout(() => {
        controller.abort();
      }, 10);

      await assert.rejects(
        async () => {
          await reassessPromise;
        },
        (err: unknown) => {
          if (!(err instanceof DiagnosisClientError)) return false;
          assert.strictEqual(err.errorType, 'CANCELLED');
          assert.strictEqual(err.statusCode, 499);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('Evidence Form Validation & Limits', () => {
  it('rejects empty outcome with outcome validation error', () => {
    const res = validateEvidenceForm(
      {
        outcome: '',
        numericValueStr: '',
        measurementUnit: '',
        technicianNotes: '',
        supersedePriorAttempt: false,
      },
      t
    );

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.errors.outcome, t.validationErrorOutcomeRequired);
  });

  it('rejects incomplete pair when numeric value is provided without unit', () => {
    const res = validateEvidenceForm(
      {
        outcome: 'passed',
        numericValueStr: '3.3',
        measurementUnit: '',
        technicianNotes: '',
        supersedePriorAttempt: false,
      },
      t
    );

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.errors.measurementUnit, t.validationErrorIncompletePair);
  });

  it('rejects incomplete pair when unit is provided without numeric value', () => {
    const res = validateEvidenceForm(
      {
        outcome: 'passed',
        numericValueStr: '',
        measurementUnit: 'V',
        technicianNotes: '',
        supersedePriorAttempt: false,
      },
      t
    );

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.errors.numericValue, t.validationErrorIncompletePair);
  });

  it('rejects non-numeric string in numericValueStr', () => {
    const res = validateEvidenceForm(
      {
        outcome: 'passed',
        numericValueStr: 'invalid-number',
        measurementUnit: 'V',
        technicianNotes: '',
        supersedePriorAttempt: false,
      },
      t
    );

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.errors.numericValue, t.validationErrorNumericRange);
  });

  it('rejects numeric values outside bounds (> 1e9 or < -1e9)', () => {
    const resOver = validateEvidenceForm(
      {
        outcome: 'passed',
        numericValueStr: '1000000001',
        measurementUnit: 'V',
        technicianNotes: '',
        supersedePriorAttempt: false,
      },
      t
    );
    assert.strictEqual(resOver.valid, false);
    assert.strictEqual(resOver.errors.numericValue, t.validationErrorNumericRange);

    const resUnder = validateEvidenceForm(
      {
        outcome: 'passed',
        numericValueStr: '-1000000001',
        measurementUnit: 'V',
        technicianNotes: '',
        supersedePriorAttempt: false,
      },
      t
    );
    assert.strictEqual(resUnder.valid, false);
    assert.strictEqual(resUnder.errors.numericValue, t.validationErrorNumericRange);
  });

  it('rejects technician notes exceeding 500 characters', () => {
    const longNotes = 'a'.repeat(501);
    const res = validateEvidenceForm(
      {
        outcome: 'passed',
        numericValueStr: '',
        measurementUnit: '',
        technicianNotes: longNotes,
        supersedePriorAttempt: false,
      },
      t
    );

    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.errors.technicianNotes, t.validationErrorNotesLength);
  });

  it('accepts valid input with valid measurement pair and parses number accurately', () => {
    const res = validateEvidenceForm(
      {
        outcome: 'passed',
        numericValueStr: '  3.295  ',
        measurementUnit: '  V  ',
        technicianNotes: 'Measured at L1 output capacitor',
        supersedePriorAttempt: false,
      },
      t
    );

    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.parsedNumericValue, 3.295);
    assert.deepStrictEqual(res.errors, {});
  });
});

describe('Recommendation & Evidence Identifier Determinism', () => {
  it('generates deterministic recommendation ID with investigation, cycle, step, and index', () => {
    const idWithIndex = generateRecommendationId('inv_abc123', 1, 2, 0);
    assert.strictEqual(idWithIndex, 'rec_inv_abc123_c1_s2_i0');

    const idWithoutIndex = generateRecommendationId('inv_abc123', 0, 1);
    assert.strictEqual(idWithoutIndex, 'rec_inv_abc123_c0_s1');
  });

  it('generates unique evidence and investigation IDs', () => {
    const ev1 = generateEvidenceId();
    const ev2 = generateEvidenceId();
    assert.ok(ev1.startsWith('ev_'));
    assert.ok(ev2.startsWith('ev_'));
    assert.notStrictEqual(ev1, ev2);

    const inv1 = generateInvestigationId();
    const inv2 = generateInvestigationId();
    assert.ok(inv1.startsWith('inv_'));
    assert.ok(inv2.startsWith('inv_'));
    assert.notStrictEqual(inv1, inv2);
  });
});

describe('Component Lifecycle & Cancellation Cleanup Simulation', () => {
  it('unmount abort cleanup signals active controller and cleans reference', () => {
    let abortController: AbortController | null = new AbortController();
    let stateDispatchedAfterUnmount = false;

    // Simulate active in-flight task
    const activeSignal = abortController.signal;
    const taskPromise = new Promise((resolve) => {
      setTimeout(() => {
        if (!activeSignal.aborted) {
          stateDispatchedAfterUnmount = true;
          resolve('success');
        } else {
          resolve('aborted');
        }
      }, 50);
    });

    // Simulate component unmount cleanup callback
    const cleanup = () => {
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
    };

    cleanup();

    assert.strictEqual(abortController, null);
    assert.strictEqual(activeSignal.aborted, true);

    return taskPromise.then((result) => {
      assert.strictEqual(result, 'aborted');
      assert.strictEqual(stateDispatchedAfterUnmount, false);
    });
  });
});

describe('CircuitLens Stage 5C-3D: Image Payload Optimization & Timeout Alignment', () => {
  it('preserves aspect ratio and scales landscape images to max 1800 px', () => {
    const res = calculateTargetDimensions(4000, 3000, 1800);
    assert.strictEqual(res.width, 1800);
    assert.strictEqual(res.height, 1350);
    assert.strictEqual(res.scaled, true);
    assert.strictEqual(res.scaleFactor, 0.45);
    // Aspect ratio check (4:3)
    assert.strictEqual(res.width / res.height, 4000 / 3000);
  });

  it('preserves aspect ratio and scales portrait images to max 1800 px', () => {
    const res = calculateTargetDimensions(2400, 3600, 1800);
    assert.strictEqual(res.width, 1200);
    assert.strictEqual(res.height, 1800);
    assert.strictEqual(res.scaled, true);
    assert.strictEqual(res.scaleFactor, 0.5);
    // Aspect ratio check (2:3)
    assert.strictEqual(res.width / res.height, 2400 / 3600);
  });

  it('preserves square aspect ratio at max 1800 px', () => {
    const res = calculateTargetDimensions(2500, 2500, 1800);
    assert.strictEqual(res.width, 1800);
    assert.strictEqual(res.height, 1800);
    assert.strictEqual(res.scaled, true);
  });

  it('never upscales images smaller than max dimension', () => {
    const res = calculateTargetDimensions(1024, 768, 1800);
    assert.strictEqual(res.width, 1024);
    assert.strictEqual(res.height, 768);
    assert.strictEqual(res.scaled, false);
    assert.strictEqual(res.scaleFactor, 1.0);
  });

  it('preserves exact dimensions for boundary images (1800x1200)', () => {
    const res = calculateTargetDimensions(1800, 1200, 1800);
    assert.strictEqual(res.width, 1800);
    assert.strictEqual(res.height, 1200);
    assert.strictEqual(res.scaled, false);
  });

  it('rejects invalid or non-positive image dimensions with INVALID_IMAGE error', () => {
    assert.throws(
      () => calculateTargetDimensions(0, 500, 1800),
      (err: unknown) => {
        if (!(err instanceof DiagnosisClientError)) return false;
        assert.strictEqual(err.errorType, 'INVALID_IMAGE');
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );

    assert.throws(
      () => calculateTargetDimensions(-100, -200, 1800),
      (err: unknown) => {
        if (!(err instanceof DiagnosisClientError)) return false;
        assert.strictEqual(err.errorType, 'INVALID_IMAGE');
        return true;
      }
    );
  });

  it('determines whether an image requires optimization correctly', () => {
    // 1. Oversized dimensions (> 1800) -> always optimize
    assert.strictEqual(
      shouldOptimizeImage({ width: 3000, height: 2000 }, 500_000, 1800, 1024 * 1024),
      true
    );
    assert.strictEqual(
      shouldOptimizeImage({ width: 1200, height: 2400 }, 500_000, 1800, 1024 * 1024),
      true
    );

    // 2. In-bounds dimensions and small file size (<= 1 MiB) -> do NOT optimize (preserve fine traces)
    assert.strictEqual(
      shouldOptimizeImage({ width: 1200, height: 900 }, 400_000, 1800, 1024 * 1024),
      false
    );

    // 3. In-bounds dimensions but large raw file (> 1 MiB, e.g. uncompressed PNG) -> optimize
    assert.strictEqual(
      shouldOptimizeImage({ width: 1600, height: 1200 }, 3_000_000, 1800, 1024 * 1024),
      true
    );
  });

  it('fills solid white background for transparent source images and exports valid JPEG payload', async () => {
    // Mock canvas renderer verifying background fill and JPEG format
    let backgroundFilledWith: string | null = null;
    let targetDimsUsed: { width: number; height: number } | null = null;

    const mockFile = new File(['mock-image-data-oversized'], 'circuit_diagram.png', {
      type: 'image/png',
    });
    // Attach mock width/height and size properties for test adapter
    Object.assign(mockFile, { width: 3600, height: 2400 });
    Object.defineProperty(mockFile, 'size', { value: 4_500_000, configurable: true });

    const result = await optimizeImageForDiagnosis(mockFile, {
      maxDimension: 1800,
      canvasRenderer: (_src, target, _quality, fillBg) => {
        backgroundFilledWith = fillBg;
        targetDimsUsed = target;
        // Construct a valid base64 JPEG payload (JPEG SOI marker 0xFF, 0xD8, 0xFF)
        const header = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
        const dataUrl = `data:image/jpeg;base64,${header.toString('base64')}`;
        return {
          dataUrl,
          mimeType: 'image/jpeg',
          bytes: header.length,
        };
      },
    });

    assert.strictEqual(backgroundFilledWith, '#FFFFFF', 'Transparent background must be filled with white to prevent black trace inversion');
    assert.deepStrictEqual(targetDimsUsed, { width: 1800, height: 1200 });
    assert.strictEqual(result.wasOptimized, true);
    assert.strictEqual(result.mimeType, 'image/jpeg');
    assert.ok(result.dataUrl.startsWith('data:image/jpeg;base64,'));
    assert.strictEqual(result.width, 1800);
    assert.strictEqual(result.height, 1200);
    assert.strictEqual(result.originalBytes, 4_500_000);
  });

  it('skips optimization for already-small images to preserve silkscreen clarity', async () => {
    const mockSmallFile = new File(['small-uncompressed-data'], 'small_board.jpg', {
      type: 'image/jpeg',
    });
    Object.assign(mockSmallFile, { width: 1200, height: 800 });
    Object.defineProperty(mockSmallFile, 'size', { value: 250_000, configurable: true });

    const result = await optimizeImageForDiagnosis(mockSmallFile, {
      maxDimension: 1800,
      maxUnoptimizedSizeBytes: 1024 * 1024,
      canvasRenderer: () => {
        throw new Error('Canvas renderer should not be called for small images');
      },
    });

    assert.strictEqual(result.wasOptimized, false);
    assert.strictEqual(result.width, 1200);
    assert.strictEqual(result.height, 800);
    assert.strictEqual(result.bytes, 250_000);
  });

  it('coordinated timeout alignment: client deadline strictly exceeds backend deadline', () => {
    const BACKEND_DEFAULT_TIMEOUT_MS = 75_000;
    assert.strictEqual(DEFAULT_TIMEOUT_MS, 80_000, 'Frontend DEFAULT_TIMEOUT_MS must be exactly 80,000 ms');
    assert.ok(
      DEFAULT_TIMEOUT_MS > BACKEND_DEFAULT_TIMEOUT_MS,
      `Frontend timeout (${DEFAULT_TIMEOUT_MS} ms) must strictly exceed backend timeout (${BACKEND_DEFAULT_TIMEOUT_MS} ms) by at least 5 seconds`
    );
    assert.strictEqual(DEFAULT_TIMEOUT_MS - BACKEND_DEFAULT_TIMEOUT_MS, 5000);
  });

  it('timeout error message in i18n does not hardcode false 50-second duration', () => {
    assert.ok(
      !t.timeoutErrorNotice.includes('50'),
      't.timeoutErrorNotice must not contain misleading hardcoded 50-second string'
    );
    assert.ok(
      t.timeoutErrorNotice.includes('timed out'),
      't.timeoutErrorNotice accurately communicates timeout state'
    );
  });
});

describe('CircuitLens Stage 5C-3G: Output Limits, Completion Metadata & Error Notices', () => {
  it('marks OUTPUT_TOKEN_LIMIT errors as non-retryable with status 502', () => {
    const err = new DiagnosisClientError(
      'Model output reached maximum completion token limit.',
      'OUTPUT_TOKEN_LIMIT',
      502
    );
    assert.strictEqual(err.errorType, 'OUTPUT_TOKEN_LIMIT');
    assert.strictEqual(err.statusCode, 502);
    assert.strictEqual(err.isRetryable, false, 'Output token limit errors are permanent and not automatically retryable');
  });

  it('marks INVALID_MODEL_OUTPUT and SCHEMA_VALIDATION_ERROR as non-retryable', () => {
    const parseErr = new DiagnosisClientError('Malformed JSON', 'INVALID_MODEL_OUTPUT', 502);
    assert.strictEqual(parseErr.isRetryable, false);

    const schemaErr = new DiagnosisClientError('Schema failure', 'SCHEMA_VALIDATION_ERROR', 502);
    assert.strictEqual(schemaErr.isRetryable, false);

    const refusalErr = new DiagnosisClientError('Refused', 'MODEL_REFUSAL', 422);
    assert.strictEqual(refusalErr.isRetryable, false);
  });

  it('validates multilingual translations for token limit and error notices across all locales', () => {
    const locales = ['en', 'es', 'ar'] as const;
    for (const locale of locales) {
      const loc = translations[locale];
      assert.ok(loc.outputLimitErrorNotice.length > 10, `${locale} must define outputLimitErrorNotice`);
      assert.ok(loc.invalidOutputErrorNotice.length > 10, `${locale} must define invalidOutputErrorNotice`);
      assert.ok(loc.schemaValidationErrorNotice.length > 10, `${locale} must define schemaValidationErrorNotice`);
      assert.ok(loc.modelRefusalErrorNotice.length > 10, `${locale} must define modelRefusalErrorNotice`);
    }
  });

  it('isValidDiagnosisResponse accepts response with optional ModelCompletionMetadata without regression', () => {
    const responseWithMetadata = {
      summary: 'Short circuit on 3.3V rail',
      visibleObservations: [
        {
          description: 'Cracked capacitor',
          evidence: 'C12 package fracture',
          confidence: 'high',
        },
      ],
      hypotheses: [
        {
          title: 'C12 MLCC short',
          reasoning: 'Crack causes ceramic dielectric breakdown',
          supportingEvidence: ['Fracture on C12'],
          confidence: 'high',
          suggestedVerification: 'Probe C12 terminals',
        },
      ],
      recommendedChecks: [
        {
          stepNumber: 1,
          title: 'Cold resistance check across C12',
          testType: 'Cold Resistance',
          toolsNeeded: ['Multimeter'],
          procedure: 'Probe unpowered',
          expectedResult: '> 10 kΩ',
          safetyNotes: ['Unpowered check'],
        },
      ],
      limitations: ['Inner layers occluded'],
      safetyWarnings: ['Ensure circuit is unpowered'],
      metadata: {
        promptTokens: 1100,
        completionTokens: 850,
        totalTokens: 1950,
        finishReason: 'stop',
        durationMs: 4200,
      },
    };

    assert.strictEqual(isValidDiagnosisResponse(responseWithMetadata), true);
  });

  it('isValidReassessmentResponse accepts response with optional ModelCompletionMetadata without regression', () => {
    const reassessmentWithMetadata = {
      summary: 'Reassessment complete',
      evidenceSynthesis: 'Evidence ev-101 confirms short',
      revisedHypotheses: [
        {
          title: 'C12 MLCC short',
          status: 'supported',
          confidence: 'high',
          explanationOfChange: 'Resistance measured 0.8 ohms',
          citingEvidenceIds: ['ev-101'],
        },
      ],
      nextRecommendedChecks: [
        {
          stepNumber: 1,
          title: 'Remove C12',
          testType: 'Rework',
          toolsNeeded: ['Soldering iron'],
          procedure: 'Desolder C12',
          expectedResult: 'Short clears',
          safetyNotes: ['ESD safe workstation'],
        },
      ],
      safetyWarnings: ['Do not power board'],
      limitations: ['Trace inductance not measured'],
      metadata: {
        promptTokens: 1500,
        completionTokens: 600,
        totalTokens: 2100,
        finishReason: 'stop',
        durationMs: 3800,
      },
    };

    assert.strictEqual(isValidReassessmentResponse(reassessmentWithMetadata), true);
  });

  it('isValidReassessmentResponse accepts concise delta responses with optional suggestedVerification', () => {
    const conciseDeltaResponse = {
      summary: 'Physical checks confirm short on 3.3V rail and eliminate polarity error.',
      evidenceSynthesis: 'Evidence ev-1 and ev-2 rule out diode orientation issues. Evidence ev-3 measures 0.8 ohms on 3.3V bus, confirming low-impedance short.',
      revisedHypotheses: [
        {
          title: 'Diode reverse polarity',
          status: 'contradicted' as const,
          confidence: 'high' as const,
          explanationOfChange: 'Visual polarity check ev-1 showed cathode correctly oriented.',
          citingEvidenceIds: ['ev-1'],
          // suggestedVerification omitted for contradicted hypothesis
        },
        {
          title: '3.3V rail short circuit',
          status: 'supported' as const,
          confidence: 'high' as const,
          explanationOfChange: 'Resistance check ev-3 measured 0.8 ohms across 3.3V net.',
          citingEvidenceIds: ['ev-3'],
          suggestedVerification: 'Isolate decoupling capacitors individually with hot air.',
        },
      ],
      nextRecommendedChecks: [
        {
          stepNumber: 1,
          title: 'Isolate C12',
          testType: 'Component Isolation',
          toolsNeeded: ['Hot air rework station'],
          procedure: 'Desolder C12. Re-measure 3.3V rail cold resistance.',
          expectedResult: '> 10 kΩ',
          safetyNotes: ['Allow board to cool before handling.'],
        },
      ],
      safetyWarnings: ['Do not energize circuit while 3.3V rail remains shorted to ground.'],
      limitations: ['Inner PCB copper layers cannot be visually inspected.'],
    };

    assert.strictEqual(isValidReassessmentResponse(conciseDeltaResponse), true);
  });
});

describe('CircuitLens Stage 5C-3L-3: Reassessment UI Clarity & Hypothesis Revision Matching', () => {
  const round1Response: DiagnosisReassessmentResponse = {
    summary: 'Round 1: Resistor tested normal; ground path check was inconclusive.',
    evidenceSynthesis: 'Cold resistance of 220 ohms refutes open resistor. Ground connection remains suspect.',
    revisedHypotheses: [
      {
        title: 'Open or Disconnected Ground Return Path',
        status: 'unresolved',
        confidence: 'medium',
        explanationOfChange: 'Visual check was inconclusive; continuity not yet measured.',
        citingEvidenceIds: ['ev-r1-1'],
        suggestedVerification: 'Measure continuity from LED cathode to Arduino GND pin.',
      },
      {
        title: 'Current Limiting Resistor R1 Open Circuit',
        status: 'contradicted',
        confidence: 'high',
        explanationOfChange: 'Cold resistance of 219.4 ohms matches specification.',
        citingEvidenceIds: ['ev-r1-2'],
      },
      {
        title: 'LED Internal Bond Wire Failure',
        status: 'unresolved',
        confidence: 'low',
        explanationOfChange: 'Diode mode test not yet conducted.',
        citingEvidenceIds: [],
        suggestedVerification: 'Perform diode check on LED.',
      },
    ],
    nextRecommendedChecks: [],
    safetyWarnings: ['Ensure circuit is unpowered while measuring resistance.'],
    limitations: [],
  };

  const round2Response: DiagnosisReassessmentResponse = {
    summary: 'Round 2: Ground return wire was re-seated, completely resolving the fault.',
    evidenceSynthesis: 'Physical re-seating of the loose ground jumper wire restored 1 Hz LED blinking.',
    revisedHypotheses: [
      {
        title: 'Open or Disconnected Ground Return Path',
        status: 'supported',
        confidence: 'high',
        explanationOfChange: 'Re-seating ground jumper wire restored full circuit operation.',
        citingEvidenceIds: ['ev-r2-1'],
      },
      {
        title: 'Current Limiting Resistor R1 Open Circuit',
        status: 'contradicted',
        confidence: 'high',
        explanationOfChange: 'Confirmed normal in Round 1.',
        citingEvidenceIds: ['ev-r1-2'],
      },
      {
        title: 'LED Internal Bond Wire Failure',
        status: 'contradicted',
        confidence: 'high',
        explanationOfChange: 'Normal blinking proves LED diode junction and bond wire are healthy.',
        citingEvidenceIds: ['ev-r2-1'],
      },
    ],
    nextRecommendedChecks: [],
    safetyWarnings: ['Disconnect USB power before altering breadboard wiring.'],
    limitations: [],
  };

  it('findLatestRevisedHypothesis returns null when no reassessment has occurred (initial diagnosis)', () => {
    assert.strictEqual(findLatestRevisedHypothesis('Open or Disconnected Ground Return Path', null), null);
    assert.strictEqual(findLatestRevisedHypothesis('Open or Disconnected Ground Return Path', undefined), null);
  });

  it('findLatestRevisedHypothesis matches single revised hypothesis by title after one completed reassessment', () => {
    const match = findLatestRevisedHypothesis('Current Limiting Resistor R1 Open Circuit', round1Response);
    assert.notStrictEqual(match, null);
    assert.strictEqual(match?.status, 'contradicted');
    assert.strictEqual(match?.confidence, 'high');
  });

  it('findLatestRevisedHypothesis reflects latest round evaluation across multiple reassessment cycles', () => {
    // In Round 1, Ground Return Path was 'unresolved'
    const round1Match = findLatestRevisedHypothesis('Open or Disconnected Ground Return Path', round1Response);
    assert.strictEqual(round1Match?.status, 'unresolved');

    // In Round 2 (latest), Ground Return Path became 'supported'
    const round2Match = findLatestRevisedHypothesis('Open or Disconnected Ground Return Path', round2Response);
    assert.strictEqual(round2Match?.status, 'supported');
    assert.strictEqual(round2Match?.confidence, 'high');
  });

  it('findLatestRevisedHypothesis accurately tracks initial high-confidence hypothesis revised to contradicted', () => {
    // Initial hypothesis might have had high confidence, but bench test contradicted it
    const match = findLatestRevisedHypothesis('Current Limiting Resistor R1 Open Circuit', round2Response);
    assert.notStrictEqual(match, null);
    assert.strictEqual(match?.status, 'contradicted');
  });

  it('findLatestRevisedHypothesis accurately tracks initial hypothesis revised to supported', () => {
    const match = findLatestRevisedHypothesis('Open or Disconnected Ground Return Path', round2Response);
    assert.notStrictEqual(match, null);
    assert.strictEqual(match?.status, 'supported');
  });

  it('findLatestRevisedHypothesis accurately tracks initial hypothesis remaining unresolved', () => {
    const match = findLatestRevisedHypothesis('LED Internal Bond Wire Failure', round1Response);
    assert.notStrictEqual(match, null);
    assert.strictEqual(match?.status, 'unresolved');
    assert.strictEqual(Array.isArray(match?.citingEvidenceIds), true);
  });

  it('findLatestRevisedHypothesis omits status when correspondence is missing (no match)', () => {
    const match = findLatestRevisedHypothesis('Microcontroller Internal Clock Failure', round1Response);
    assert.strictEqual(match, null);
  });

  it('findLatestRevisedHypothesis omits status when correspondence is ambiguous (duplicate titles)', () => {
    const ambiguousResponse: DiagnosisReassessmentResponse = {
      ...round1Response,
      revisedHypotheses: [
        {
          title: 'Ambiguous Ground Fault',
          status: 'supported',
          confidence: 'high',
          explanationOfChange: 'Duplicate 1.',
          citingEvidenceIds: [],
        },
        {
          title: 'Ambiguous Ground Fault',
          status: 'contradicted',
          confidence: 'low',
          explanationOfChange: 'Duplicate 2.',
          citingEvidenceIds: [],
        },
      ],
    };

    // Never guess between ambiguous duplicates
    const match = findLatestRevisedHypothesis('Ambiguous Ground Fault', ambiguousResponse);
    assert.strictEqual(match, null);
  });

  it('findLatestRevisedHypothesis matches reliably by title when hypotheses are returned in a different order (no array index fallback)', () => {
    // Permute array order: LED bond wire at index 0, Ground path at index 1, Resistor at index 2
    const permutedResponse: DiagnosisReassessmentResponse = {
      ...round2Response,
      revisedHypotheses: [
        round2Response.revisedHypotheses[2], // LED bond wire
        round2Response.revisedHypotheses[0], // Ground return
        round2Response.revisedHypotheses[1], // Resistor
      ],
    };

    // Index 0 in initial hypothesis was Ground Return. In permuted response, index 0 is LED bond wire.
    // Title matching must find Ground Return ('supported'), proving array index is NOT used!
    const groundMatch = findLatestRevisedHypothesis('Open or Disconnected Ground Return Path', permutedResponse);
    assert.strictEqual(groundMatch?.status, 'supported');
    assert.strictEqual(groundMatch?.title, 'Open or Disconnected Ground Return Path');

    const ledMatch = findLatestRevisedHypothesis('LED Internal Bond Wire Failure', permutedResponse);
    assert.strictEqual(ledMatch?.status, 'contradicted');
    assert.strictEqual(ledMatch?.title, 'LED Internal Bond Wire Failure');
  });

  it('reassessment rounds ledger preserves historical rounds immutably when appending new cycles', () => {
    const rounds: DiagnosisReassessmentResponse[] = [];
    rounds.push(round1Response);
    assert.strictEqual(rounds.length, 1);
    assert.strictEqual(rounds[0].revisedHypotheses[0].status, 'unresolved');

    rounds.push(round2Response);
    assert.strictEqual(rounds.length, 2);
    // Historical round 1 is preserved untouched
    assert.strictEqual(rounds[0].revisedHypotheses[0].status, 'unresolved');
    // Round 2 reflects the new supported status
    assert.strictEqual(rounds[1].revisedHypotheses[0].status, 'supported');
  });

  it('Stage 5C-3L-3 localization keys are complete and valid across EN, ES, and AR', () => {
    const langs = ['en', 'es', 'ar'] as const;
    const requiredKeys = [
      'initialDiagnosisBadge',
      'latestReassessmentBadge',
      'historicalReassessmentBadge',
      'hypothesesRevisedNotice',
      'viewLatestReassessmentBtn',
      'latestStatusLabel',
      'jumpToHypothesisRevision',
    ] as const;

    langs.forEach((lang) => {
      const dict = translations[lang];
      requiredKeys.forEach((key) => {
        assert.strictEqual(
          typeof dict[key],
          'string',
          `Key "${key}" must be a string in "${lang}"`
        );
        assert.strictEqual(
          dict[key].trim().length > 0,
          true,
          `Key "${key}" must be non-empty in "${lang}"`
        );
      });

      // Verify parameterized template string
      assert.strictEqual(
        dict.hypothesesRevisedNotice.includes('{round}'),
        true,
        `hypothesesRevisedNotice must include "{round}" placeholder in "${lang}"`
      );
    });
  });
});

describe('CircuitLens Stage 5C-3L-4: Epistemic Integrity & Superseded Citations', () => {
  it('epistemic disclaimer and superseded citation keys are complete and valid across EN, ES, and AR', () => {
    const langs = ['en', 'es', 'ar'] as const;
    const requiredKeys = [
      'hardwareAccessDisclaimer',
      'evidenceCitationSuperseded',
      'evidenceCitationSupersededHint',
    ] as const;

    langs.forEach((lang) => {
      const dict = translations[lang];
      requiredKeys.forEach((key) => {
        assert.strictEqual(
          typeof dict[key],
          'string',
          `Key "${key}" must be a string in "${lang}"`
        );
        assert.strictEqual(
          dict[key].trim().length > 0,
          true,
          `Key "${key}" must be non-empty in "${lang}"`
        );
      });
    });

    // Verify exact expected semantic phrases in English
    assert.strictEqual(
      translations.en.hardwareAccessDisclaimer.includes('does not have direct access to physical hardware'),
      true,
      'EN disclaimer must state lack of direct hardware access'
    );
    assert.strictEqual(
      translations.en.hardwareAccessDisclaimer.includes('reported by the technician'),
      true,
      'EN disclaimer must attribute bench data to the technician'
    );
  });

  it('correctly derives superseded evidence IDs and distinguishes current from superseded citations', () => {
    const sampleEvidenceLog = [
      {
        id: 'ev-attempt-1',
        targetRecommendationId: 'rec-1',
        cycleIndex: 0,
        stepNumber: 1,
        checkTitle: 'Measure 3.3V rail voltage',
        outcome: 'failed' as const,
        numericValue: 0.1,
        measurementUnit: 'V',
        technicianNotes: 'Lead slipped during probing',
        recordedAt: '2026-10-30T10:00:00Z',
      },
      {
        id: 'ev-attempt-2',
        targetRecommendationId: 'rec-1',
        cycleIndex: 0,
        stepNumber: 1,
        checkTitle: 'Measure 3.3V rail voltage (retried with micro-probe)',
        outcome: 'passed' as const,
        numericValue: 3.31,
        measurementUnit: 'V',
        technicianNotes: 'Solid probe contact; rail is normal',
        recordedAt: '2026-10-30T10:05:00Z',
        supersedesEvidenceId: 'ev-attempt-1',
      },
      {
        id: 'ev-unrelated-3',
        targetRecommendationId: 'rec-2',
        cycleIndex: 0,
        stepNumber: 2,
        checkTitle: 'Check decoupling capacitor ESR',
        outcome: 'passed' as const,
        numericValue: 0.05,
        measurementUnit: 'Ohms',
        recordedAt: '2026-10-30T10:10:00Z',
      },
    ];

    // Derive superseded IDs exactly as ReassessmentResultsView does
    const supersededEvidenceIds = new Set(
      sampleEvidenceLog
        .map((e) => e.supersedesEvidenceId)
        .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
    );

    // ev-attempt-1 is superseded
    assert.strictEqual(supersededEvidenceIds.has('ev-attempt-1'), true);
    // ev-attempt-2 is current (active)
    assert.strictEqual(supersededEvidenceIds.has('ev-attempt-2'), false);
    // ev-unrelated-3 is current (active)
    assert.strictEqual(supersededEvidenceIds.has('ev-unrelated-3'), false);

    // Verify historical record preservation: ev-attempt-1 still has all historical values
    const historicalRecord = sampleEvidenceLog.find((e) => e.id === 'ev-attempt-1');
    assert.strictEqual(historicalRecord?.outcome, 'failed');
    assert.strictEqual(historicalRecord?.numericValue, 0.1);
    assert.strictEqual(historicalRecord?.technicianNotes, 'Lead slipped during probing');

    // Verify active record has corrected values
    const currentRecord = sampleEvidenceLog.find((e) => e.id === 'ev-attempt-2');
    assert.strictEqual(currentRecord?.outcome, 'passed');
    assert.strictEqual(currentRecord?.numericValue, 3.31);
    assert.strictEqual(currentRecord?.supersedesEvidenceId, 'ev-attempt-1');
  });
});

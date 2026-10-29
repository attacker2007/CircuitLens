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
} from './api/diagnosisClient.ts';
import {
  validateEvidenceForm,
  generateRecommendationId,
  generateEvidenceId,
  generateInvestigationId,
} from './utils/evidenceValidation.ts';
import { translations } from './i18n.ts';
import type {
  DiagnosisRequest,
  DiagnosisReassessmentRequest,
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

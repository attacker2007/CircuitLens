import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import {
  META_API_BASE_URL,
  DEFAULT_MODEL,
  sendMetaTestPrompt,
  analyzeCircuitImage,
  reassessCircuitEvidence,
  handleApiError,
} from './metaClient.js';
import { validateDiagnosisRequest } from './diagnosisRequestValidation.js';
import { validateReassessmentRequest } from './reassessmentValidation.js';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

app.use(cors());

// Route-scoped bounded body parser for diagnostic intake (10 MiB image + ~33% base64 overhead ≈ 14 MB)
app.use('/api/diagnose', express.json({ limit: '16mb' }));

// Default strict body parser for other endpoints (100 KB limit to prevent unbounded memory usage)
app.use(express.json({ limit: '100kb' }));

// Basic health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  const hasKey = Boolean(
    process.env.MODEL_API_KEY &&
      process.env.MODEL_API_KEY.trim() !== '' &&
      process.env.MODEL_API_KEY !== 'your_meta_model_api_key_here'
  );
  res.json({
    status: 'ok',
    service: 'CircuitLens Backend API',
    apiKeyConfigured: hasKey,
    targetModel: DEFAULT_MODEL,
    metaBaseUrl: META_API_BASE_URL,
    timestamp: new Date().toISOString(),
  });
});

// GET endpoint to perform connectivity test with default prompt
app.get('/api/test-meta', async (_req: Request, res: Response) => {
  try {
    const result = await sendMetaTestPrompt();
    res.json(result);
  } catch (error) {
    const normalized = handleApiError(error);
    console.error(`[Meta API Test Error] [${normalized.errorType}] HTTP ${normalized.statusCode}: ${normalized.message}`);
    res.status(normalized.statusCode).json({
      success: false,
      errorType: normalized.errorType,
      message: normalized.message,
    });
  }
});

// POST endpoint to perform connectivity test with optional custom prompt
app.post('/api/test-meta', async (req: Request, res: Response) => {
  const { prompt } = req.body || {};

  if (prompt !== undefined && typeof prompt !== 'string') {
    res.status(400).json({
      success: false,
      errorType: 'INVALID_INPUT',
      message: 'The "prompt" field must be a string if provided.',
    });
    return;
  }

  try {
    const result = await sendMetaTestPrompt({ prompt: prompt || undefined });
    res.json(result);
  } catch (error) {
    const normalized = handleApiError(error);
    console.error(`[Meta API Test Error] [${normalized.errorType}] HTTP ${normalized.statusCode}: ${normalized.message}`);
    res.status(normalized.statusCode).json({
      success: false,
      errorType: normalized.errorType,
      message: normalized.message,
    });
  }
});

// POST endpoint for AI circuit diagnosis
app.post('/api/diagnose', async (req: Request, res: Response) => {
  const abortController = new AbortController();

  const onResClose = () => {
    // Only abort if the response has not completed (client disconnected prematurely)
    if (!res.writableEnded) {
      abortController.abort();
    }
  };

  res.on('close', onResClose);

  try {
    // 1. Authoritative server-side validation & sanitization before any API dispatch
    const validatedRequest = validateDiagnosisRequest(req.body);

    // 2. Call Meta vision inference with validated payload and abort signal
    const diagnosis = await analyzeCircuitImage(validatedRequest, { signal: abortController.signal });

    // 3. Return validated DiagnosisResponse if response is still open
    if (!res.headersSent && !res.writableEnded) {
      res.json(diagnosis);
    }
  } catch (error) {
    if (res.headersSent || res.writableEnded) {
      return;
    }
    const normalized = handleApiError(error);
    if (normalized.statusCode === 499 || abortController.signal.aborted) {
      res.status(499).json({
        success: false,
        errorType: 'CLIENT_CLOSED_REQUEST',
        message: 'Request was cancelled before completion.',
      });
      return;
    }
    console.error(`[Diagnosis Error] [${normalized.errorType}] HTTP ${normalized.statusCode}: ${normalized.message}`);
    res.status(normalized.statusCode).json({
      success: false,
      errorType: normalized.errorType,
      message: normalized.message,
    });
  } finally {
    res.off('close', onResClose);
  }
});

// POST endpoint for AI circuit diagnostic reassessment based on accumulated evidence
app.post('/api/reassess', async (req: Request, res: Response) => {
  const abortController = new AbortController();

  const onResClose = () => {
    // Only abort if the response has not completed (client disconnected prematurely)
    if (!res.writableEnded) {
      abortController.abort();
    }
  };

  res.on('close', onResClose);

  try {
    // 1. Authoritative server-side validation & sanitization before any API dispatch
    const validatedRequest = validateReassessmentRequest(req.body);

    // 2. Call Meta inference with validated payload and abort signal
    const reassessment = await reassessCircuitEvidence(validatedRequest, { signal: abortController.signal });

    // 3. Return validated DiagnosisReassessmentResponse if response is still open
    if (!res.headersSent && !res.writableEnded) {
      res.json(reassessment);
    }
  } catch (error) {
    if (res.headersSent || res.writableEnded) {
      return;
    }
    const normalized = handleApiError(error);
    if (normalized.statusCode === 499 || abortController.signal.aborted) {
      res.status(499).json({
        success: false,
        errorType: 'CLIENT_CLOSED_REQUEST',
        message: 'Request was cancelled before completion.',
      });
      return;
    }
    console.error(`[Reassessment Error] [${normalized.errorType}] HTTP ${normalized.statusCode}: ${normalized.message}`);
    res.status(normalized.statusCode).json({
      success: false,
      errorType: normalized.errorType,
      message: normalized.message,
    });
  } finally {
    res.off('close', onResClose);
  }
});

// Global error-handling middleware for JSON body parsing errors (400, 413) and unexpected pipeline failures
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  // Handle body-parser / express.json payload too large
  if (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    (err as { status: number }).status === 413
  ) {
    res.status(413).json({
      success: false,
      errorType: 'PAYLOAD_TOO_LARGE',
      message: 'Request payload exceeds the allowed size limit.',
    });
    return;
  }

  // Handle body-parser / express.json malformed JSON syntax error
  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as { status: number }).status === 400 &&
    'body' in err
  ) {
    res.status(400).json({
      success: false,
      errorType: 'INVALID_JSON',
      message: 'Malformed JSON payload in request body.',
    });
    return;
  }

  const normalized = handleApiError(err);
  res.status(normalized.statusCode).json({
    success: false,
    errorType: normalized.errorType,
    message: normalized.message,
  });
});

// Start the server only when executed directly, allowing clean imports in tests
const isDirectRun = Boolean(
  process.argv[1] &&
    (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js')) &&
    process.env.NODE_ENV !== 'test'
);

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`CircuitLens backend server running on http://localhost:${PORT}`);
    console.log(`- Health check:     GET  http://localhost:${PORT}/api/health`);
    console.log(`- Meta Test (GET):  GET  http://localhost:${PORT}/api/test-meta`);
    console.log(`- Meta Test (POST): POST http://localhost:${PORT}/api/test-meta`);
    console.log(`- Circuit Diagnose: POST http://localhost:${PORT}/api/diagnose`);
    console.log(`- Reassessment:     POST http://localhost:${PORT}/api/reassess`);
    console.log(`- Target Model:     ${DEFAULT_MODEL}`);
    console.log(`- Meta Base URL:    ${META_API_BASE_URL}`);

    if (!process.env.MODEL_API_KEY || process.env.MODEL_API_KEY === 'your_meta_model_api_key_here') {
      console.warn(
        `[WARNING] MODEL_API_KEY is not configured yet in .env! Requests to /api/diagnose and /api/test-meta will return a missing key error.`
      );
    } else {
      console.log(`[INFO] MODEL_API_KEY is detected.`);
    }
  });
}

export default app;

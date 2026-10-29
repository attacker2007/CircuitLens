# CircuitLens ⚡

> Mobile-friendly, AI-assisted electronics troubleshooting & circuit diagnosis application built for the Meta Global AI Developer Hackathon.

---

## 1. Project Purpose & Target Users

Troubleshooting printed circuit boards (PCBs) is often tedious, slow, and prone to diagnostic blind spots and confirmation bias. **CircuitLens** assists electronics engineers, bench technicians, hardware makers, and electrical engineering students by converting high-resolution visual PCB inspection and operational symptom reports into structured, actionable, and safety-prioritized troubleshooting procedures.

Modern multimodal AI models can identify visual defects, but naive chat implementations suffer from severe diagnostic drift—hallucinating that an unproven hypothesis is "confirmed" or claiming they re-examined an image when only measurements were provided. CircuitLens eliminates this through a disciplined **dual-cycle investigation architecture**:
1. **Initial Multimodal Diagnosis:** Analyzes visual board landmarks and reported operational symptoms to propose candidate hypotheses and prioritized, non-destructive safety checks.
2. **Physical Evidence Ledger & Reassessment:** Technicians execute bench tests with multimeters or oscilloscopes and log empirical readings. The system re-evaluates hypotheses against this accumulated evidence ledger—strictly forbidding the model from claiming image re-inspection and requiring rigorous evidence citations for every status shift.

---

## 2. System Architecture & Dual-Cycle Workflow

```
+-----------------------------------------------------------------------------------+
|                                CIRCUITLENS CLIENT                                 |
|                         (React 19 + TypeScript + Vite)                            |
+-----------------------------------------------------------------------------------+
       |                                                               |
  [1] Multimodal Intake                                           [3] Bench Evidence
  (Photo + Expected vs. Observed)                                 (Multimeter readings)
       |                                                               |
       v                                                               v
+------------------------------------+               +------------------------------+
|       POST /api/diagnose           |               |      POST /api/reassess      |
|  - Validates MIME & Magic Bytes    |               |  - Validates Evidence Ledger |
|  - Enforces <= 10 MiB limits       |               |  - Validates Citations       |
|  - Sanitizes user symptom inputs   |               |  - Zero raw image re-send    |
+------------------------------------+               +------------------------------+
       |                                                               |
       | (OpenAI-compatible vision)                                    | (Structured text context)
       v                                                               v
+-----------------------------------------------------------------------------------+
|                                 META MODEL API                                    |
|                        (Endpoint: https://api.meta.ai/v1)                         |
|                             Model: muse-spark-1.3                                 |
+-----------------------------------------------------------------------------------+
       |                                                               |
       | Raw JSON Completion                                           | Raw JSON Completion
       v                                                               v
+------------------------------------+               +------------------------------+
|     Diagnosis Response Parser      |               |    Reassessment Parser       |
|  - Strips markdown code fences     |               |  - Strips markdown fences    |
|  - Validates Observations & Hypo   |               |  - Validates Cautious Status |
|  - Enforces Step Sequencing        |               |  - Checks Evidence Citations |
|  - Enforces Safety Warnings        |               |  - Mandates Safety Warnings  |
+------------------------------------+               +------------------------------+
       |                                                               |
       v                                                               v
  [2] Diagnostic Results View                                     [4] Revised Hypotheses View
  - Direct Optical Observations                                   - Hypothesis Status Updates
  - Deductive Fault Hypotheses                                    - Cited Bench Evidence
  - Prioritized Check Sequence                                    - Follow-up Diagnostic Steps
```

### Key Architectural Separation

- **Visual Observations vs. Fault Hypotheses:**
  - `visibleObservations`: Strictly factual optical findings directly observable in the photo (e.g., darkened solder joints, flux residue, silkscreen designations, package markings).
  - `hypotheses`: Deductive potential root causes connecting visible cues and reported symptoms (e.g., thermal pass-transistor breakdown, open feedback resistor). Hypotheses are never presented as confirmed without physical bench verification.
- **Evidence-Based Reassessment:**
  - Technicians log categorical outcomes (`passed`, `failed`, `inconclusive`, `unable_to_perform`), optional numeric measurements with units (e.g., `0.2 Ohm`, `3.28 V`), and technician commentary.
  - Superseded attempts are tracked with backward references (`supersedesEvidenceId`), preserving a complete historical audit trail while allowing technicians to correct probe errors or record repeat measurements.
  - Reassessment requests re-evaluate hypotheses using only four cautious statuses: `supported`, `weakened`, `unresolved`, or `contradicted`. The AI is strictly barred from marking faults as definitively "confirmed" or "refuted".
  - Every hypothesis revision must explicitly cite valid, historical evidence record IDs in `citingEvidenceIds`.

---

## 3. Technology Stack

- **Frontend:**
  - React 19, TypeScript, Vite
  - Custom responsive layout with dark/light themes and full mobile viewport support
  - Native internationalization (`i18n.ts`) supporting English (EN), Spanish (ES), and Arabic (AR) with complete right-to-left (RTL) layout switching
- **Backend:**
  - Node.js, Express, TypeScript (NodeNext ESM modules)
  - OpenAI Node.js SDK (v4.86.1) configured for Meta Model API compatibility
  - Zero-dependency runtime schema validators and magic-byte container signature verifiers
- **Security & Safety:**
  - Zero client-side API keys; all credentials restricted to backend environment
  - Strict input sanitization, bounded string lengths, and payload caps
  - Automated regex redaction in error handlers preventing token leakage in logs or responses

---

## 4. API Endpoints & Data Contracts

### Core Endpoints

| Method | Endpoint | Description | Request Payload | Response Contract |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service and proxy connectivity probe | None | Health status, target model, timestamp |
| `GET` | `/api/test-meta` | Minimal test prompt to Meta Model API | None | Connectivity status and token latency |
| `POST` | `/api/test-meta` | Custom test prompt to Meta Model API | `{ prompt?: string }` | Model response and token usage |
| `POST` | `/api/diagnose` | Multimodal PCB fault diagnosis | `DiagnosisRequest` | `DiagnosisResponse` |
| `POST` | `/api/reassess` | Evidence-driven hypothesis reassessment | `DiagnosisReassessmentRequest` | `DiagnosisReassessmentResponse` |

### Diagnosis Request (`DiagnosisRequest`)
```typescript
interface DiagnosisRequest {
  image: string;                  // Base64 data URL (JPEG, PNG, WebP; max 10 MiB decoded)
  boardName?: string;             // Optional identifier (max 200 chars)
  expectedBehavior: string;       // Required nominal description (max 2000 chars)
  observedBehavior: string;       // Required fault symptoms (max 2000 chars)
  relevantComponents?: string;    // Optional IC/part designations (max 500 chars)
  additionalNotes?: string;       // Optional technician commentary (max 2000 chars)
}
```

### Diagnosis Response (`DiagnosisResponse`)
```typescript
interface DiagnosisResponse {
  summary: string;
  visibleObservations: Array<{
    description: string;
    evidence: string;
    confidence: 'low' | 'medium' | 'high';
  }>;
  hypotheses: Array<{
    title: string;
    reasoning: string;
    supportingEvidence: string[];
    confidence: 'low' | 'medium' | 'high';
    suggestedVerification: string;
  }>;
  recommendedChecks: Array<{
    stepNumber: number;
    title: string;
    testType: string;
    toolsNeeded: string[];
    procedure: string;
    expectedResult: string;
    safetyNotes: string[];
  }>;
  limitations: string[];
  safetyWarnings: string[];
}
```

### Reassessment Request (`DiagnosisReassessmentRequest`)
```typescript
interface DiagnosisReassessmentRequest {
  diagnosticContext: {
    boardName?: string;
    expectedBehavior: string;
    observedBehavior: string;
    relevantComponents?: string;
    additionalNotes?: string;
    initialSummary: string;
    visibleObservations: VisibleObservation[];
    initialHypotheses: FaultHypothesis[];
  };
  evidence: Array<{
    id: string;
    targetRecommendationId: string;
    cycleIndex: number;
    stepNumber: number;
    checkTitle: string;
    outcome: 'passed' | 'failed' | 'inconclusive' | 'unable_to_perform';
    numericValue?: number;
    measurementUnit?: string;
    technicianNotes?: string;
    recordedAt: string;           // ISO 8601 timestamp
    supersedesEvidenceId?: string;
  }>;
  additionalTechnicianNotes?: string;
}
```

### Reassessment Response (`DiagnosisReassessmentResponse`)
```typescript
interface DiagnosisReassessmentResponse {
  summary: string;
  evidenceSynthesis: string;
  revisedHypotheses: Array<{
    title: string;
    status: 'supported' | 'weakened' | 'unresolved' | 'contradicted';
    confidence: 'low' | 'medium' | 'high';
    explanationOfChange: string;
    citingEvidenceIds: string[];  // Validated against submitted evidence IDs
    suggestedVerification?: string;
  }>;
  nextRecommendedChecks: RecommendedCheck[];
  safetyWarnings: string[];       // Enforced minimum of 1 electrical warning
  limitations: string[];
}
```

---

## 5. Prerequisites & Environment Configuration

### Prerequisites
- **Node.js:** v20.x or higher (verified on Node.js v22/v24)
- **npm:** v10.x or higher
- **OS:** Windows 10/11, macOS, or Linux

### Environment Configuration

1. Copy the `.env.example` template to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Configure your environment variables:
   ```env
   # Meta Model API Key for CircuitLens (required for live inference)
   MODEL_API_KEY=your_actual_meta_model_api_key_here

   # Backend server listening port (default: 4000)
   PORT=4000
   ```
> ⚠️ **Security Notice:** The `.env` file is excluded from version control via `.gitignore`. Never commit API keys or paste credentials into client code.

---

## 6. Installation & Startup Instructions

### Install Dependencies
Install all workspace packages across root, backend, and frontend:
```powershell
npm run install:all
```

### Run in Development Mode
Launch both the Express backend and the Vite frontend simultaneously:
```powershell
npm run dev
```
- **Frontend Workbench:** `http://localhost:5173`
- **Backend API:** `http://localhost:4000`
- **API Proxy:** Vite automatically proxies `/api/*` requests from `:5173` to `:4000`.

### Typechecking & Production Build
```powershell
# Typecheck both backend and frontend
npm run typecheck

# Build production bundles
npm run build

# Start backend in production mode
npm run start
```

---

## 7. Verification & Offline Automated Test Suites

CircuitLens includes comprehensive offline test suites that execute **190 static assertions** across 4 suites using mock analyzers and ephemeral local servers. **Zero external API calls are made and zero model credits are consumed during testing.**

Execute all backend test suites with:
```powershell
npm --prefix server run test
```

### Individual Test Suites

1. **Diagnosis Request & Response Validation (`test:validation`)**
   ```powershell
   npm --prefix server run test:validation
   ```
   - **Coverage (43 assertions):** Image data URL parsing, JPEG/PNG/WebP magic-byte signatures, payload size limits, request string bounds, response schema checking, markdown fence stripping, and error sanitization.

2. **Diagnosis Endpoint Integration (`test:endpoint`)**
   ```powershell
   npm --prefix server run test:endpoint
   ```
   - **Coverage (29 assertions):** Ephemeral server startup, `/api/health` probe, `/api/test-meta` missing key behavior, valid `/api/diagnose` routing with mock analyzer, credit protection preventing upstream model calls when inputs are invalid, and payload size limit enforcement.

3. **Reassessment Validation & Citations (`test:reassessment-validation`)**
   ```powershell
   npm --prefix server run test:reassessment-validation
   ```
   - **Coverage (72 assertions):** Reassessment request structure, evidence record schema, measurement-pair validation (`numericValue` + `measurementUnit`), ISO 8601 calendar date rollover verification, cross-record supersession integrity, cautious status enums, response bound checks, hallucinated citation rejection, and mandatory safety warning validation.

4. **Reassessment Endpoint Integration (`test:reassessment-endpoint`)**
   ```powershell
   npm --prefix server run test:reassessment-endpoint
   ```
   - **Coverage (46 assertions):** Ephemeral server startup, POST `/api/reassess` integration with mock analyzer, credit protection on invalid evidence lists, supersession reasoning injected into model prompt, prompt framing forbidding image re-examination, response parsing/validation, and upstream error normalization.

*(Note: Automated tests currently cover backend contracts, endpoints, and validation logic. Automated frontend integration tests are not included in the repository.)*

---

## 8. Electrical Safety Rules & Diagnostic Limitations

- **Advisory Only:** All diagnostic hypotheses and recommendations produced by CircuitLens are advisory. They do not supersede standard electrical engineering practices, component manufacturer datasheets, or institutional safety protocols.
- **Unpowered Checks First:** The system enforces prioritization of non-destructive, unpowered tests (cold resistance, diode checks, continuity) before suggesting powered in-circuit measurements.
- **Single-Angle Photographic Limitations:** The model can only evaluate components visible in the uploaded image. Underside layers, inner PCB traces, and obscured components cannot be visually inspected.
- **Live Inference Notice:** Live inference requires a valid `MODEL_API_KEY` configured in `.env`. Offline testing verifies complete request/response schemas and endpoints without making network calls.

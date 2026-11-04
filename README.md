# CircuitLens ⚡

> An evidence-driven, AI-assisted electronics troubleshooting workbench built for the Meta Global AI Developer Hackathon.

CircuitLens bridges the gap between multimodal visual analysis and physical bench instrumentation. It transforms circuit board photographs, operational symptom reports, and multimeter/oscilloscope readings into structured, safety-prioritized troubleshooting workflows—strictly enforcing epistemic humility and preventing false confirmation of faults.

---

## 1. Project Overview

Troubleshooting modern printed circuit boards (PCBs) is challenging, prone to diagnostic blind spots, and susceptible to confirmation bias. When visual anomalies appear—such as flux residue, package discoloration, or tilted passives—technicians frequently jump to premature conclusions, desoldering healthy components while missing the true root cause.

Generic multimodal AI chat tools worsen this problem through **diagnostic drift**:
- They treat visual inferences as confirmed physical facts.
- They falsely claim to "re-inspect" photos when only electrical numbers are provided.
- They misinterpret low resistance across populated power rails as dead component shorts, ignoring parallel bypass capacitors and semiconductor protection diodes.

**CircuitLens** resolves this through an **evidence-driven dual-cycle architecture**:
1. **Initial Multimodal Intake:** Evaluates high-resolution PCB imagery against reported symptoms to generate candidate fault hypotheses, visible optical observations, and non-destructive cold checks.
2. **Physical Bench Evidence Ledger & Reassessment:** Technicians execute hands-on bench tests and log empirical measurements. CircuitLens re-evaluates hypotheses against this accumulated evidence ledger—requiring explicit citations for every status revision and prohibiting the model from claiming physical confirmation.

---

## 2. Key Features

- **Circuit Image Intake & Multimodal Diagnosis:**
  High-resolution image intake (JPEG, PNG, WebP) with client-side downscaling (max 1800 px) to preserve silkscreen legibility while guarding upload bandwidth.
- **Strict Separation of Observations vs. Hypotheses:**
  - `visibleObservations`: Factual optical landmarks directly visible in the image (e.g. silkscreen labels, solder joints, physical burn marks).
  - `hypotheses`: Deductive potential failure mechanisms connecting visual observations to symptoms. Never labeled as confirmed without electrical isolation.
- **Structured Technician Evidence Logging:**
  Technicians log discrete check outcomes (`passed`, `failed`, `inconclusive`, `unable_to_perform`), physical values with engineering units (e.g. `2.1 Ω`, `4.85 V`), and probe notes.
- **Evidence-Driven Reassessment & Hypothesis Evolution:**
  Subsequent diagnostic cycles update candidate hypotheses using four cautious statuses: `supported`, `weakened`, `unresolved`, or `contradicted`. Hypotheses must cite specific evidence record IDs (`citingEvidenceIds`).
- **Interactive Hypothesis Evolution Matrix & Evidence Timeline:**
  Visual progression tracking showing exactly how each candidate hypothesis transitioned across diagnostic cycles, alongside a chronological audit timeline.
- **Circuit Image Inspector:**
  Interactive image viewing tool with pan and zoom controls, allowing technicians to inspect component packages and solder fillets alongside diagnostic recommendations.
- **Contextual Investigation Assistant:**
  An investigation-scoped discussion drawer where technicians can ask technical questions about active hypotheses, measurement interpretations (e.g. populated board parallel paths), and next checks. Includes structured XML context encapsulation and Offline Preview provenance labelling.
- **Local-First Investigation Workspace (IndexedDB):**
  Full multi-investigation management with automatic saving, case renaming, archiving, and deletion with tombstoning protection. Zero cloud accounts, cookies, or external databases required.
- **Professional Multi-Format Export:**
  - **Print / PDF:** Clean, professional printable stylesheet formatted for bench handoff and hardware archiving.
  - **Markdown:** Structured text export for technical wikis and issue trackers.
  - **JSON:** Fully structured telemetry and case records complying with **CircuitLens Schema v1.1.0**.
- **Full Internationalization (i18n):**
  Native multilingual interface supporting English (EN), Spanish (ES), and Arabic (AR) with complete right-to-left (RTL) layout switching.
- **Mobile Responsive:**
  Adaptive layouts down to 320px viewports with a dedicated Mobile Bottom Action Dock for bench technicians holding smartphones.

---

## 3. How It Works

```
                                 THE CIRCUITLENS WORKFLOW

  [1] Circuit Image + Symptoms
               │
               ▼
  [2] Optical Observations & Candidate Hypotheses (Round 0)
               │
               ▼
  [3] Safe, Non-Destructive Recommended Checks
               │
               ▼
  [4] Technician Bench Measurements (DMM, Scope, Thermal)
               │
               ▼
  [5] Evidence-Driven Reassessment (Round 1..n)
               │
               ▼
  [6] Hypothesis Evolution Matrix & Professional Report (Schema v1.1.0)
```

### Critical Epistemic Distinctions:
1. **Technician Measurements $\neq$ AI Observations:**
   Technician measurements are empirical physical data from bench instruments. AI observations are optical inferences from visual images.
2. **Hypotheses $\neq$ Confirmed Faults:**
   AI-generated assessments are prioritized diagnostic candidates to guide multimeter probes—never definitive physical certifications.
3. **Populated Board Parallel Paths:**
   A multimeter reading of $2.1\ \Omega$ across a power rail on a fully populated circuit board does not independently prove an IC is shorted. Decoupling capacitors, transient voltage suppressors, and ESD diodes share the power net. Faults remain unresolved until physical isolation (lifted pin, desoldered rail jumper) is achieved.

---

## 4. Technology Stack

- **Frontend:**
  - **React 19** (`^19.3.1`) & **React DOM**
  - **TypeScript** (`~6.0.3`) in strict configuration
  - **Vite** (`^8.3.5`) with HMR and optimized production bundling
  - **Native IndexedDB** (`circuitlens_db` v1) with transaction-level write serialization and memory fallback
  - Pure CSS variables with light and dark themes, mobile touch dock, and RTL support
- **Backend:**
  - **Node.js** (v20+ recommended, tested on Node v22/v24)
  - **Express** (`^4.21.2`) with route-scoped body limits (16 MiB intake, 100 KB general API)
  - **OpenAI Node.js SDK** (`^4.86.1`) configured for OpenAI-compatible inference endpoints
  - **TypeScript** (`^5.7.3`) with NodeNext ESM module resolution
  - **dotenv** (`^16.4.7`) for environment variable management
  - **cors** (`^2.8.5`) for local development origin negotiation
- **Zero-Dependency Architecture:**
  No heavy UI frameworks, no external state libraries, no cloud database drivers.

---

## 5. System Architecture & API Contracts

```
┌────────────────────────────────────────────────────────────────────────┐
│                           CIRCUITLENS CLIENT                           │
│                      (React 19 + Vite + IndexedDB)                     │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Vite Proxy (/api/* -> :4000)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CIRCUITLENS BACKEND API                         │
│                       (Express + Node.js ESM)                          │
├────────────────────────────────────────────────────────────────────────┤
│ GET  /api/health          - Proxy & active model configuration check   │
│ GET  /api/test-meta       - Upstream model connectivity ping           │
│ POST /api/test-meta       - Upstream test prompt execution             │
│ POST /api/diagnose        - Multimodal PCB fault intake (max 16 MiB)   │
│ POST /api/reassess        - Evidence ledger reassessment (max 100 KB)  │
│ POST /api/assistant/chat  - Contextual case discussion (max 100 KB)    │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ Upstream HTTPS
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      CONFIGURED INFERENCE PROVIDER                     │
│  - Meta Model API (default): https://api.meta.ai/v1 (muse-spark-1.3)   │
│  - Baseten: https://inference.baseten.co/v1 (muse-spark-open-1026)     │
└────────────────────────────────────────────────────────────────────────┘
```

### Backend API Endpoints:

| Method | Endpoint | Description | Payload Constraints |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health & active model provider status | None |
| `GET` | `/api/test-meta` | Upstream connectivity verification | None |
| `POST` | `/api/test-meta` | Upstream prompt test | `{ prompt?: string }` |
| `POST` | `/api/diagnose` | Initial multimodal PCB fault diagnosis | Valid base64 image (max 10 MiB decoded), `expectedBehavior`, `observedBehavior` |
| `POST` | `/api/reassess` | Evidence ledger hypothesis revision | `diagnosticContext`, `evidence` array (1–20 items), no raw image |
| `POST` | `/api/assistant/chat` | Contextual investigation assistant discussion | `investigationId`, `message` ($\le 2000$ chars), `context` ($\le 80\text{ KB}$), `conversationHistory` ($\le 50$ items) |

---

## 6. Installation & Local Development

### Prerequisites
- **Node.js:** v20.x or higher (tested on Node.js v22 and v24)
- **npm:** v10.x or higher
- **OS:** Windows 10/11, macOS, or Linux

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/CircuitLens.git
cd CircuitLens
```

### 2. Install Dependencies
Install all workspace packages across root, client, and server:
```bash
npm run install:all
```

### 3. Configure Environment Variables
Create your local server configuration from the provided template:
```bash
# On Windows (PowerShell):
Copy-Item .env.example server/.env

# On macOS/Linux:
cp .env.example server/.env
```

Edit `server/.env` with your desired configuration:
```env
# Model Provider: "meta" (default) or "baseten"
MODEL_PROVIDER=meta

# API Keys (configure the one corresponding to your MODEL_PROVIDER):
MODEL_API_KEY=your_meta_model_api_key_here
BASETEN_API_KEY=your_baseten_api_key_here

# Backend server port
PORT=4000
```
> ⚠️ **Security Warning:** Never commit `.env` files to Git. Both root and server `.gitignore` files exclude `.env`.

### 4. Run Development Servers
Start both the backend server and Vite frontend simultaneously:
```bash
npm run dev
```
- **Frontend Workbench:** `http://localhost:5173`
- **Backend API:** `http://localhost:4000`

### 5. Production Build & Verification
```bash
# Typecheck TypeScript across client and server
npm run typecheck

# Build optimized production bundles
npm run build

# Start production server
npm run start
```

---

## 7. AI Provider Configuration

CircuitLens supports configurable model providers defined in `server/src/metaClient.ts`:

1. **Meta Model API (Default):**
   - `MODEL_PROVIDER=meta`
   - Base URL: `https://api.meta.ai/v1`
   - Default Model: `muse-spark-1.3`
   - Key Variable: `MODEL_API_KEY`
2. **Baseten Provider:**
   - `MODEL_PROVIDER=baseten`
   - Base URL: `https://inference.baseten.co/v1`
   - Verified Model: `meta-models/muse-spark-open-1026`
   - Key Variable: `BASETEN_API_KEY`

### Optional Provider Overrides:
- `MODEL_BASE_URL`: Custom proxy or gateway URL.
- `MODEL_NAME`: Custom model identifier.
- `MODEL_TIMEOUT_MS`: Upstream request timeout in ms (default: `75000`, bounds: `5000`–`300000`).

> ℹ️ **Notice on Contextual Assistant Inference:**
> The Contextual Investigation Assistant currently generates **Offline Preview** responses derived from active case evidence. All responses carry explicit `Offline Preview` metadata badges. The server system prompt and XML context boundaries (`assistantPrompt.ts`) are hardened and ready for live provider integration once enabled.

---

## 8. Deterministic Demonstration Mode (Hackathon Demo)

CircuitLens includes an isolated deterministic offline demonstration environment that replays realistic diagnostic scenarios without making live model requests or spending API credits.

### Running the Demo:

1. **Option A: One-Command Full Demo (Recommended):**
   ```bash
   npm run demo
   ```
   This concurrently launches:
   - The offline mock server on port `4001`
   - The Vite frontend client with demo proxy routing to port `4001` (`npm run dev:demo`)

2. **Option B: Step-by-Step:**
   ```bash
   # Terminal 1: Launch the demo mock server (port 4001)
   node server/demo/demo_mock_server.mjs

   # Terminal 2: Launch the frontend in demo mode
   npm --prefix client run dev:demo
   ```
   Open your browser to `http://localhost:5173`.

### Live Development vs. Offline Demo Isolation:
| Workflow | Backend Port | Target Server | UI Health Badge | Results Provenance |
|---|---|---|---|---|
| `npm run dev` | `4000` | Real Express Backend (`server/src/index.ts`) | `LIVE BACKEND` (Cyan) | `🟢 Live Vision Model` |
| `npm run demo` | `4001` | Offline Mock Server (`server/demo/demo_mock_server.mjs`) | `OFFLINE DEMO` (Amber) | `⚠️ Deterministic Offline Replay` |

3. **Demonstration Flow:**
   - **Step 1 — Intake:** Upload an image or use the pre-staged Arduino Uno case. Click *Run AI Diagnostic Analysis*.
   - **Step 2 — Initial Assessment:** Review optical findings, initial candidate hypotheses, and recommended cold resistance checks with explicit provenance indicators.
   - **Step 3 — Log Evidence:** Log a $2.1\ \Omega$ cold rail reading on the 5V bus.
   - **Step 4 — AI Reassessment:** Click *Reassess with AI* to observe hypothesis evolution from initial candidate to `supported`, accompanied by populated board parallel path warnings.
   - **Step 5 — Assistant Discussion:** Open the *Case Assistant* drawer to ask: *"Interpret the latest measurement cautiously"* and observe populated board reasoning.
   - **Step 6 — Export Report:** Switch to the *Report* perspective to preview the bench document, export Markdown, or download structured JSON (**CircuitLens Schema v1.1.0**).

> ⚠️ Replayed responses in demo mode are deterministic fixtures designed for presentation consistency. Technician measurements in the demo are sample bench inputs.

---

## 9. Limitations & Responsible Use

- **CircuitLens does not physically measure hardware:** It is a remote analytical decision-support software tool. It has zero hardware access and cannot verify physical continuity.
- **Hypotheses are not certified root causes:** All diagnostic outputs are candidate hypotheses to guide hands-on troubleshooting. Physical confirmation rests exclusively with the human technician.
- **Low rail resistance on populated boards is not proof of a short:** In-circuit measurements reflect parallel branches (capacitors, diodes, IC internal silicon). Components must be physically isolated before confirming failure.
- **Local-First Single-Operator Session:** Data is stored in the browser's native IndexedDB. It is intended for a single operator per browser profile; it does not currently provide multi-tab write conflict resolution or cloud synchronization.
- **Not a Certified Medical or Safety System:** CircuitLens is a hackathon development prototype. Do not use for life-critical, avionics, medical, or high-voltage mains diagnostic certification without independent qualification.

---

## 10. Automated Testing & Verification

CircuitLens includes comprehensive client and server automated test suites that execute completely offline with zero external network requests and zero model credit consumption:

```bash
# Run all client and server test suites
npm test
```

### Verified Test Summary:

| Suite | Individual Test Cases | Assertions Verified | Test Runner / Framework | Status |
| :--- | :---: | :---: | :--- | :---: |
| **Client Test Suite** | **155** | 400+ | Node `--experimental-strip-types` (27 suites) | **PASS** |
| - *Client Cancellation & Abort* | 3 | 12 | Node assert | PASS |
| - *Reassessment Boundaries* | 4 | 14 | Node assert | PASS |
| - *Evidence Validation & Limits* | 7 | 25 | Node assert | PASS |
| - *Image Optimization & Scaler* | 11 | 35 | Node assert | PASS |
| - *Reassessment UI Matching* | 10 | 28 | Node assert | PASS |
| - *Evolution Matrix & Timeline* | 16 | 45 | Node assert | PASS |
| - *Report Builder & Schema v1.1.0* | 18 | 50 | Node assert | PASS |
| - *Workspace & IndexedDB Store* | 13 | 42 | Node assert | PASS |
| - *Persistence Concurrency & Lifecycle* | 9 | 30 | Node assert | PASS |
| - *Contextual Assistant & Freshness* | 15 | 45 | Node assert | PASS |
| - *P0-2 Mock/Live Isolation & Provenance* | 3 | 12 | Node assert | PASS |
| **Server Test Suite** | **95** | **508** | `tsx` / Node ESM (7 suites) | **PASS** |
| - *Provider Config & Credential Isolation* | 10 sections | 258 | Node assert | PASS |
| - *Diagnosis Intake & Signature Validation* | 14 cases | 37 | Node assert | PASS |
| - *Diagnosis Endpoint Integration* | 10 tests | 30 | Ephemeral HTTP server | PASS |
| - *Reassessment Request & Citation Validation* | 15 cases | 54 | Node assert | PASS |
| - *Reassessment Endpoint Integration* | 15 tests | 45 | Ephemeral HTTP server | PASS |
| - *Adversarial Integrity & Safety Scenarios* | 9 scenarios | 62 | Node assert | PASS |
| - *Assistant Deep Validation & Prompt Safety* | 22 tests | 22 | Ephemeral HTTP server | PASS |
| **Total Automated Tests** | **250 Cases** | **900+ Assertions** | **All suites passed, 0 failures** | **PASS** |

### Project Status:
CircuitLens is a hackathon prototype developed for the Meta Global AI Developer Hackathon. A formal open-source license has not yet been attached to this repository. All rights are reserved by the original authors pending submission and release review.

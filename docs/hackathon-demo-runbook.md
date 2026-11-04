# CircuitLens — Hackathon Demonstration Runbook (3-Minute Presentation)

**Target Video Duration:** Exactly 3 minutes (180 seconds)  
**Execution Environment:** 100% Offline Deterministic Replay Mode  
**Backend Port:** `4001` (Isolated demo mock server)  
**Frontend URL:** `http://localhost:5173`  
**Scenario Board:** Arduino Uno SMD Edition (Global 5V/3.3V Rail Collapse)

---

## 1. Quick Startup & Environment Setup

### Terminal 1: Launch the Demo Environment
Run the one-command demo workflow from the repository root:
```bash
npm run demo
```
*What this launches:*
- Deterministic Mock Backend on port `4001` (`server/demo/demo_mock_server.mjs`)
- Vite Frontend Workbench on port `5173` configured to proxy `/api` traffic to port `4001`

### Browser Navigation:
Open Google Chrome or Chromium to:
```
http://localhost:5173
```

### Verification Before Hitting Record:
- [ ] Amber banner across the top is visible: `OFFLINE DEMO MODE (PORT 4001)`.
- [ ] Top-right connectivity badge reads: `OFFLINE DEMO` in amber (`#f59e0b`).
- [ ] Browser window is set to 1920x1080 (1080p) or 1440x900 for clean video capture.
- [ ] Image file ready on Desktop or file manager: `scratch/validation_images/img1_arduino_smd.jpg`.

---

## 2. Minute-by-Minute Recording Script & Action Guide

```
┌────────────────────────────────────────────────────────────────────────┐
│ TIMELINE OVERVIEW (180 SECONDS TOTAL)                                  │
├──────────────┬───────────────────────────────────────────┬─────────────┤
│ 0:00 - 0:30  │ The Electronics Problem & Multimodal Intake│ 30 seconds  │
│ 0:30 - 1:15  │ Initial AI Assessment & Hypothesis Ranking│ 45 seconds  │
│ 1:15 - 1:55  │ Empirical Evidence Logging & Reassessment │ 40 seconds  │
│ 1:55 - 2:30  │ Contextual Investigation Assistant        │ 35 seconds  │
│ 2:30 - 3:00  │ Evolution Matrix & Laboratory Export      │ 30 seconds  │
└──────────────┴───────────────────────────────────────────┴─────────────┘
```

---

### Segment 1: The Problem & Multimodal Intake (0:00 – 0:30)

#### Actions on Screen:
1. Start recording showing the CircuitLens clean workbench.
2. Drag and drop `img1_arduino_smd.jpg` into the dropzone (or click Browse and select it).
3. Click the `⚡ Pre-fill Demo Case` button (instantly populates board name and symptoms).
4. Point out the analysis depth selector (Standard / Advanced).
5. Click **"Run AI Diagnostic Analysis"**.

#### Spoken Script (Voiceover):
> *"When electronics technicians troubleshoot dead hardware, generic AI chatbots fail. They lack optical circuit awareness, hallucinate fake pin voltages, and pretend to physically test components they cannot touch.*
>
> *This is CircuitLens — an investigation-aware diagnostic workbench built specifically for electronics technicians. Here we have a dead Arduino Uno SMD board where both power rails have collapsed. We upload a high-resolution photograph, input our bench symptoms, and initiate diagnostic analysis."*

---

### Segment 2: Initial Assessment & Honest Epistemics (0:30 – 1:15)

#### Actions on Screen:
1. The analysis completes (~800ms simulated latency).
2. Point out the `⚠️ Deterministic Offline Replay` badge and amber disclosure banner:
   - *Explain that this benchmark demo runs deterministically offline.*
3. Scroll through the **Direct Optical Observations**:
   - Highlight ATmega328P TQFP-32 package recognition, NCP1117 regulator, polyfuse.
4. Scroll through the **Candidate Hypotheses**:
   - Point out Hypothesis 1: Dead short on 5V rail (High confidence).
   - Point out Hypothesis 2: Shorted 3.3V LP2985 regulator dragging 5V down (Medium confidence).
   - Point out Hypothesis 3: Failed NCP1117 internal semiconductor short (Medium confidence).
5. Highlight the **Recommended Checks**:
   - Check #1: Unpowered cold resistance check on 5V and 3.3V rails.

#### Spoken Script (Voiceover):
> *"Notice the clear execution provenance: our demo server runs transparently in offline replay mode with full epistemic honesty. CircuitLens does not fabricate certainty.*
>
> *First, it extracts direct optical landmarks: the ATmega328P SMD package, the NCP1117 5V regulator, and the polyfuse. It formulates prioritized diagnostic candidates: a dead short on the 5V net, a secondary short on the 3.3V regulator, or an internal silicon breakdown.*
>
> *Crucially, CircuitLens knows it is remote software. It does not certify a fault; instead, it prescribes targeted bench tests: an unpowered cold resistance check."*

---

### Segment 3: Empirical Bench Evidence & AI Reassessment (1:15 – 1:55)

#### Actions on Screen:
1. Under Recommended Checks, click **"Log Evidence"** on Step 1.
2. The Evidence Capture Drawer opens.
3. Select Outcome: **"Abnormal / Failed"**.
4. Enter Value: `2.1`, Unit: `Ω`.
5. Enter Technician Notes: `"5V rail measures 2.1 ohms to GND (hard short). 3.3V rail measures 4.2 k ohms (normal)."`
6. Click **"Save Evidence Record"**.
7. In the results panel, click **"Reassess with AI"** (simulate 900ms).
8. View the updated reassessment card:
   - Hypothesis 1 (5V dead short): **SUPPORTED** (Green badge).
   - Hypothesis 2 (3.3V regulator short): **CONTRADICTED** (Red badge).
   - Hypothesis 3 (NCP1117 internal short): **UNRESOLVED** (Amber badge).

#### Spoken Script (Voiceover):
> *"Now we go to our bench multimeter and probe the unpowered rails. We log our physical empirical measurement: 2.1 ohms on the 5V rail — a dead short — while the 3.3V rail reads healthy at 4.2 kilohms. We click Save and hit Reassess with AI.*
>
> *Watch how the diagnostic state evolves. Hypothesis 1 is upgraded to Supported. Hypothesis 2 is Contradicted because the 3.3V rail is healthy. And Hypothesis 3 remains Unresolved, with CircuitLens warning us that internal regulator faults cannot be distinguished from parallel capacitor shorts without physical component isolation."*

---

### Segment 4: Contextual Case Assistant (1:55 – 2:30)

#### Actions on Screen:
1. In the top subnavigation, click **"Case Assistant"** (or click the assistant floating button).
2. The Assistant Drawer opens showing the active investigation badge: `Case: Arduino Uno SMD`.
3. Click the prompt shortcut chip or type:  
   *"Why has the leading hypothesis not been confirmed?"*
4. Press Enter.
5. Review the assistant's immediate response:
   - Explains: Populated circuit board parallel paths, decoupling capacitors, and lack of component isolation.

#### Spoken Script (Voiceover):
> *"Next, we open our Case Assistant. This is not a generic chatbot — it has bounded, zero-leak context of our active investigation, our evidence log, and every revision round.*
>
> *We ask: 'Why has the leading hypothesis not been confirmed?' The assistant explains the critical engineering reality: on a populated circuit board, parallel capacitors and protection diodes share the power net. A multimeter reading alone does not prove the IC failed — physical confirmation requires desoldering or lifting a pin."*

---

### Segment 5: Hypothesis Matrix & Laboratory Report Export (2:30 – 3:00)

#### Actions on Screen:
1. In the subnavigation, click **"Matrix"** to show the **Hypothesis Evolution Matrix**:
   - Point out Round 0 (Candidates) vs Round 1 (Reassessment) side-by-side progression.
2. In the subnavigation, click **"Report"** to show the printable laboratory report:
   - Point out structured metadata, evidence citations, and ISO timestamps.
   - Click **"Export JSON (Schema v1.1.0)"** (triggers instant clean download).
3. Switch back to Dashboard view showing saved case in IndexedDB.

#### Spoken Script (Voiceover):
> *"In the Hypothesis Evolution Matrix, technicians can visually audit how evidence reshaped the diagnostic candidate list over time.*
>
> *Finally, we switch to the Report view. CircuitLens generates a complete, audit-ready laboratory report adhering to CircuitLens Schema v1.1.0. We can export to Markdown or download structured JSON for shop work orders, fully persisted in native browser IndexedDB.*
>
> *CircuitLens: bridging optical AI vision with physical bench testing."*

---

## 3. Strict Rules: What NOT to Claim During the Video

| ❌ NEVER CLAIM (Prohibited) | ✅ ACCURATE STATEMENT (Mandatory) |
|---|---|
| *"The AI measures voltage and resistance."* | *"The human technician probes the hardware and logs empirical measurements."* |
| *"CircuitLens confirmed the chip is blown."* | *"CircuitLens prioritizes candidate hypotheses to guide multimeter troubleshooting."* |
| *"A 2.1-ohm rail reading proves the regulator is shorted."* | *"In-circuit measurements reflect parallel capacitors; faults remain unresolved until physical isolation."* |
| *"This demo is running live cloud inference right now."* | *"This demo runs on our local deterministic replay server with explicit offline provenance."* |
| *"CircuitLens certified this board safe to power."* | *"CircuitLens is a decision-support tool; power-on safety rests with the certified technician."* |

---

## 4. Troubleshooting & Recovery Plan

| Issue | Immediate Fix |
|---|---|
| **Port 4001 address already in use** | Kill stale node instances: `Get-Process node \| Stop-Process -Force`, then run `npm run demo`. |
| **Old cached investigation data showing** | Click "New Investigation" in top header, or open Chrome DevTools -> Application -> Storage -> IndexedDB -> `circuitlens_db` -> Clear. |
| **Health badge displays red "BACKEND UNAVAILABLE"** | Ensure the mock server is running in your terminal; check `http://localhost:4001/api/health`. |
| **Accidental live inference request** | Not possible under `npm run demo` — port 4001 has no outbound cloud provider logic or API keys. |

---

## 5. Verification Checklist Before Recording

1. [ ] Run `npm run demo` in Terminal.
2. [ ] Open `http://localhost:5173` in a clean browser window.
3. [ ] Confirm top banner: `OFFLINE DEMO MODE (PORT 4001)`.
4. [ ] Confirm amber status badge: `OFFLINE DEMO`.
5. [ ] Rehearse the 3-minute sequence once before recording.
6. [ ] Record video with screen + microphone at 1080p.
7. [ ] Verify video length is $\le$ 3 minutes (180 seconds).

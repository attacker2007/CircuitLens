import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enforce port 4001 for demo mock server, preventing accidental collision with real Express backend (port 4000)
const requestedPort = process.env.DEMO_PORT ? parseInt(process.env.DEMO_PORT, 10) : 4001;
if (process.env.PORT && parseInt(process.env.PORT, 10) === 4000 && !process.env.DEMO_PORT) {
  console.warn('[CircuitLens Demo Mock Server] WARNING: Environment variable PORT=4000 detected (reserved for live Express backend).');
  console.warn('[CircuitLens Demo Mock Server] Enforcing isolated port 4001 for offline mock server to prevent port collision.');
} else if (requestedPort === 4000) {
  console.error('[CircuitLens Demo Mock Server] FATAL ERROR: Port 4000 is reserved for the live Express backend.');
  console.error('[CircuitLens Demo Mock Server] Refusing to bind to port 4000 to prevent mock masquerading and live proxy hijacking.');
  process.exit(1);
}
const PORT = requestedPort;
const diagPath = path.join(__dirname, 'fixtures', 'diagnosis_response.json');
const reassessPath = path.join(__dirname, 'fixtures', 'reassessment_response_6b2.json');

const diagData = JSON.parse(fs.readFileSync(diagPath, 'utf8'));
const reassessData = JSON.parse(fs.readFileSync(reassessPath, 'utf8'));

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'CircuitLens Offline Deterministic Demo Mock Server',
      mode: 'mock_demo',
      provider: null,
      apiKeyConfigured: false,
      targetModel: null,
      baseUrl: null,
      metaBaseUrl: null,
      inferenceVerified: false,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  if (url.pathname === '/api/diagnose' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let requestedDepth = diagData.analysisDepth || 'standard';
      try {
        const parsed = JSON.parse(body);
        if (parsed.analysisDepth) requestedDepth = parsed.analysisDepth;
      } catch {
        // ignore
      }
      // Simulate realistic AI inference latency (800ms)
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ...diagData,
          analysisDepth: requestedDepth,
          provenance: 'offline_fixture',
          isOfflineMock: true,
          executionMode: 'mock_demo',
        }));
      }, 800);
    });
    return;
  }

  if (url.pathname === '/api/reassess' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let dynamicReassess = { ...reassessData };
      try {
        const payload = JSON.parse(body || '{}');
        const submittedEvidence = payload.evidence || [];
        if (submittedEvidence.length > 0) {
          const latestId = submittedEvidence[submittedEvidence.length - 1].id;
          dynamicReassess = JSON.parse(JSON.stringify(reassessData));
          for (const rh of dynamicReassess.revisedHypotheses || []) {
            if (rh.citingEvidenceIds && rh.citingEvidenceIds.includes('ev-bench-101')) {
              rh.citingEvidenceIds = [latestId];
            }
          }
          if (dynamicReassess.evidenceSynthesis) {
            dynamicReassess.evidenceSynthesis = dynamicReassess.evidenceSynthesis.replace(/ev-bench-101/g, latestId);
          }
        }
      } catch {
        // Fallback to static fixture
      }

      // Simulate realistic AI reassessment latency (900ms)
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ...dynamicReassess,
          provenance: 'offline_fixture',
          isOfflineMock: true,
          executionMode: 'mock_demo',
        }));
      }, 900);
    });
    return;
  }

  if (url.pathname === '/api/assistant/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { investigationId, message, context } = payload;
        const msgLower = (message || '').toLowerCase().trim();
        const boardName = context?.boardName || 'the circuit board';
        const currentHypotheses = context?.currentHypotheses || [];
        const evidenceLog = context?.technicianEvidenceLog || [];
        const recommendedChecks = context?.recommendedChecks || [];

        let replyContent = '';
        const suggestedActions = [];

        if (msgLower.includes('leading') || msgLower.includes('primary hypothesis') || msgLower.includes('top fault') || msgLower.includes('explain the leading')) {
          const topHyp = currentHypotheses.find(h => h.confidence === 'high') || currentHypotheses[0] || {
            title: 'Solder Bridge or Short on 5V / RESET Bus',
            confidence: 'high',
            reasoning: 'Visual inspection shows optical bridging near MCU headers; USB voltage rail collapses under load.'
          };
          replyContent = `The leading candidate hypothesis for **${boardName}** is:

### ${topHyp.title} (Confidence: ${(topHyp.confidence || 'high').toUpperCase()})
- **Analytical Reasoning:** ${topHyp.reasoning}

> **Engineering Caution:** This hypothesis is a prioritized diagnostic candidate derived from optical observations and symptom correlation. It has **not** been physically confirmed. Physical confirmation requires direct electrical verification by the technician.`;
          suggestedActions.push({
            id: `action_hyp_${Date.now()}`,
            type: 'view_hypothesis',
            label: `Inspect "${topHyp.title}" in Matrix`
          });
        } else if (msgLower.includes('not confirmed') || msgLower.includes('why has this') || msgLower.includes('confirm') || msgLower.includes('unconfirmed')) {
          replyContent = `### Why the Leading Hypothesis Remains Unconfirmed

1. **Optical vs Electrical Boundary:** Visual analysis detects visible thermal stress or solder bridge anomalies, but cannot detect internal silicon junction failure or sub-surface track opens.
2. **Populated Circuit Parallel Paths:** When testing components installed on a fully populated board, parallel resistances, decoupling capacitors, and protection diodes across the power nets frequently cause low-resistance readings that mimic short circuits.
3. **Lack of Isolation:** A component fault can only be considered confirmed once the component is electrically isolated (e.g., lifted pin, desoldered rail jumper, or isolated rail injection).

CircuitLens presents hypotheses as candidate fault mechanisms to guide your multimeter and oscilloscope checks—**physical confirmation rests exclusively with technician-verified measurements**.`;
        } else if (msgLower.includes('latest measurement') || msgLower.includes('interpret') || msgLower.includes('measurement cautiously') || msgLower.includes('recent reading')) {
          if (evidenceLog.length === 0) {
            replyContent = `No technician bench measurements have been recorded yet for **${boardName}**. Log a bench measurement (e.g., cold rail resistance, diode forward drop, or power supply rail voltage) using the **Log Evidence** panel.`;
          } else {
            const latestEv = evidenceLog[evidenceLog.length - 1];
            const numDisplay = latestEv.numericValue !== undefined && (latestEv.measurementUnit || latestEv.unit)
              ? `${latestEv.numericValue} ${latestEv.measurementUnit || latestEv.unit}`
              : (latestEv.observedValue || latestEv.outcome || 'abnormal');
            const checkTitle = latestEv.checkTitle || latestEv.testType || 'Diagnostic Check';

            replyContent = `### Cautious Interpretation of Latest Bench Evidence
- **Check Title:** ${checkTitle}
- **Recorded Reading:** **${numDisplay}** (Outcome: \`${(latestEv.outcome || 'abnormal').toUpperCase()}\`)

> **Populated Board Assessment:**
> A reading of **${numDisplay}** on a populated circuit board must be interpreted cautiously. On unpowered populated boards, semiconductor junctions and low-ESR ceramic capacitors frequently create parallel low-impedance paths.
>
> **Conclusion:** This measurement indicates abnormal bus impedance, but does **not** single-handedly prove a root cause component failure without isolating surrounding branch components.`;
            suggestedActions.push({
              id: `action_ev_${Date.now()}`,
              type: 'inspect_observation',
              label: `View Evidence Record ${latestEv.id}`
            });
          }
        } else if (msgLower.includes('investigate next') || msgLower.includes('what next') || msgLower.includes('next check') || msgLower.includes('next step') || msgLower.includes('what should i')) {
          replyContent = `### Recommended Next Diagnostic Check

**Step 1: Unpowered Resistance Check across 5V and GND**
- **Target Component:** \`5V Power Rail / Decoupling Loop\`
- **Rationale:** Verify if low impedance is isolated to 5V rail or extends into 3.3V LDO branch.
- ⚠️ **Safety Warning:** Disconnect USB and DC barrel power before probing resistance.

Record your multimeter reading in the **Log Evidence** panel once completed.`;
        } else if (msgLower.includes('distinguish') || msgLower.includes('differentiate') || msgLower.includes('remaining hypotheses')) {
          replyContent = `### Distinguishing Between Competing Hypotheses

To isolate which candidate is responsible:
1. **Differential Power Isolation:** Measure impedance from the affected rail directly at Candidate A's input pins versus Candidate B's pins. If separated by an inductor or series diode, measure on both sides of the passive element.
2. **Cold Diode Check:** Compare the forward voltage drop of each candidate's protective ESD diodes relative to circuit GND.
3. **Log the Differential Measurement:** Document the specific pin reading so AI reassessment can systematically weaken or contradict the incorrect candidate.`;
        } else {
          replyContent = `Regarding your inquiry on **${boardName}**:

The current investigation focuses on the active hypotheses and documented bench evidence.

> **Diagnostic Guidance:** All recommendations provided by CircuitLens are decision-support hypotheses intended to assist hands-on bench troubleshooting. Always disconnect power before probing component resistance, and avoid assuming a single measurement on a populated board confirms a component failure.`;
        }

        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: {
              id: `asst_mock_${Date.now()}`,
              investigationId,
              role: 'assistant',
              content: replyContent,
              timestamp: new Date().toISOString(),
              status: 'sent',
              isOfflinePreview: true,
              provenance: 'offline_preview',
              suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined
            },
            warning: 'Offline preview mode: Responses are generated using deterministic case-context logic without third-party model inference.'
          }));
        }, 500);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`[CircuitLens Demo Mock Server] Running on http://localhost:${PORT}`);
  console.log(`[CircuitLens Demo Mock Server] Deterministic Arduino Uno SMD scenario loaded.`);
});

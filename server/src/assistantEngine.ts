/**
 * CircuitLens Stage 6C-3A — Contextual Investigation Assistant Engine
 *
 * Provides deterministic, investigation-scoped reasoning and technical guidance.
 * Strictly adheres to empirical measurement vs AI observation boundaries,
 * never invents physical certainty, and warns about populated board constraints.
 *
 * ZERO external model inference or credit consumption.
 */

import type {
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantMessage,
  AssistantSuggestedAction,
  AssistantInvestigationContext,
} from './types/assistant.js';
import { createApiClient, extractMessageContent } from './metaClient.js';
import { ASSISTANT_SYSTEM_PROMPT, buildAssistantUserPrompt } from './assistantPrompt.js';

export const generateOfflineAssistantResponse = generateAssistantResponse;

export function generateAssistantResponse(request: AssistantChatRequest): AssistantChatResponse {
  const { investigationId, message, context } = request;
  const msgLower = message.toLowerCase().trim();

  const boardName = context.boardName || 'the circuit board';
  const currentHypotheses = context.currentHypotheses || [];
  const evidenceLog = context.technicianEvidenceLog || [];
  const recommendedChecks = context.recommendedChecks || [];
  const initialObservations = context.initialDiagnosisR0?.visualObservations || [];
  const reassessments = context.reassessmentCycles || [];

  let replyContent = '';
  const suggestedActions: AssistantSuggestedAction[] = [];

  // 1. Topic: Leading Fault Hypothesis
  if (
    msgLower.includes('leading') ||
    msgLower.includes('primary hypothesis') ||
    msgLower.includes('top fault') ||
    msgLower.includes('explain the leading')
  ) {
    if (currentHypotheses.length === 0) {
      replyContent = `For **${boardName}**, no diagnostic fault hypotheses have been generated yet. Please run an initial AI visual diagnosis to generate candidate hypotheses.`;
    } else {
      // Find highest confidence hypothesis
      const highConf = currentHypotheses.find((h) => h.confidence === 'high') || currentHypotheses[0];
      const safeStatus = typeof highConf.status === 'string' ? highConf.status.toUpperCase() : 'UNRESOLVED';
      const safeConfidence = typeof highConf.confidence === 'string' ? highConf.confidence.toUpperCase() : 'UNKNOWN';
      const statusNote = highConf.isFromReassessment
        ? `In reassessment round ${highConf.cycleIndex}, its status is currently marked as **${safeStatus}**.`
        : `This is an initial candidate hypothesis from visual inspection (Round 0).`;

      replyContent = `The leading candidate hypothesis for **${boardName}** is:

### ${highConf.title} (Confidence: ${safeConfidence})
- **Status:** ${statusNote}
- **Analytical Reasoning:** ${highConf.reasoning || 'Reasoning not specified.'}

> **Engineering Caution:** This hypothesis is a prioritized diagnostic candidate derived from optical observations and symptom correlation. It has **not** been physically confirmed. Physical confirmation requires direct electrical verification by the technician.`;

      suggestedActions.push({
        id: `action_view_hyp_${Date.now()}`,
        type: 'view_hypothesis',
        label: `Inspect "${highConf.title}" in Matrix`,
        targetId: highConf.title,
      });
    }
  }

  // 2. Topic: Why not confirmed / physical confirmation requirements
  else if (
    msgLower.includes('not confirmed') ||
    msgLower.includes('why has this') ||
    msgLower.includes('confirm') ||
    msgLower.includes('unconfirmed')
  ) {
    const topHyp = currentHypotheses[0];
    const hypTitle = topHyp ? `"${topHyp.title}"` : 'the current hypothesis';

    replyContent = `### Why ${hypTitle} Remains Unconfirmed

1. **Optical vs Electrical Boundary:** Visual analysis detects visible thermal stress, solder bridge anomalies, or discoloration, but cannot detect internal silicon junction failure, dielectric breakdown, or sub-surface track opens.
2. **Populated Circuit Parallel Paths:** When testing components installed on a fully populated board, parallel resistances, decoupling capacitors, and protection diodes across the power nets frequently cause low-resistance readings that mimic short circuits.
3. **Lack of Isolation:** A component fault can only be considered confirmed once the component is electrically isolated (e.g., lifted pin, desoldered rail jumper, or isolated rail injection).

CircuitLens presents hypotheses as candidate fault mechanisms to guide your multimeter and oscilloscope checks—**physical confirmation rests exclusively with technician-verified measurements**.`;

    if (recommendedChecks.length > 0) {
      suggestedActions.push({
        id: `action_chk_${Date.now()}`,
        type: 'suggest_check',
        label: 'View Recommended Isolation Checks',
      });
    }
  }

  // 3. Topic: Interpret latest measurement cautiously
  else if (
    msgLower.includes('latest measurement') ||
    msgLower.includes('interpret') ||
    msgLower.includes('measurement cautiously') ||
    msgLower.includes('recent reading')
  ) {
    if (evidenceLog.length === 0) {
      replyContent = `No technician bench measurements have been recorded yet for **${boardName}**.

To interpret physical evidence, log a bench measurement (e.g., cold rail resistance, diode forward drop, or power supply rail voltage) using the **Log Evidence** panel.`;
    } else {
      const latestEv = evidenceLog[evidenceLog.length - 1];
      const numDisplay = latestEv.numericValue !== undefined && latestEv.measurementUnit
        ? `${latestEv.numericValue} ${latestEv.measurementUnit}`
        : latestEv.outcome;
      const safeOutcome = typeof latestEv.outcome === 'string' ? latestEv.outcome.toUpperCase() : 'UNKNOWN';

      replyContent = `### Cautious Interpretation of Latest Bench Evidence
- **Check Title:** Step ${latestEv.stepNumber}: ${latestEv.checkTitle}
- **Recorded Reading / Outcome:** **${numDisplay}** (Outcome: \`${safeOutcome}\`)
${latestEv.technicianNotes ? `- **Technician Notes:** ${latestEv.technicianNotes}` : ''}

> **Populated Board Assessment:**
> A reading of **${numDisplay}** on a populated circuit board must be interpreted cautiously. On unpowered populated boards, semiconductor junctions (such as microcontroller I/O clamping diodes or buck converter switching FETs) and low-ESR ceramic capacitors frequently create parallel low-impedance paths.
>
> **Conclusion:** This measurement indicates abnormal bus impedance, but does **not** single-handedly prove a root cause component failure without isolating surrounding branch components.`;

      suggestedActions.push({
        id: `action_ev_${Date.now()}`,
        type: 'inspect_observation',
        label: `View Evidence Record ${latestEv.id}`,
        targetId: latestEv.id,
      });
    }
  }

  // 4. Topic: What to investigate next / Recommended Next Check
  else if (
    msgLower.includes('investigate next') ||
    msgLower.includes('what next') ||
    msgLower.includes('next check') ||
    msgLower.includes('next step') ||
    msgLower.includes('what should i')
  ) {
    const uncompletedChecks = recommendedChecks.filter((c) => !c.isCompleted);
    if (uncompletedChecks.length > 0) {
      const nextCheck = uncompletedChecks[0];
      const safetyText = nextCheck.safetyNotes && nextCheck.safetyNotes.length > 0
        ? nextCheck.safetyNotes.join('; ')
        : 'Disconnect all power sources and discharge bulk capacitors before taking resistance measurements.';

      replyContent = `### Recommended Next Diagnostic Check

**Step ${nextCheck.stepNumber}: ${nextCheck.title}**
- **Test Classification:** \`${nextCheck.testType}\`
- **Procedure:** ${nextCheck.procedure}
- **Expected Nominal:** ${nextCheck.expectedResult}
- ⚠️ **Safety Precautions:** ${safetyText}

Once performed, record your reading in the **Log Evidence** panel to advance the diagnostic investigation.`;

      suggestedActions.push({
        id: `action_check_next_${Date.now()}`,
        type: 'suggest_check',
        label: `Log Step ${nextCheck.stepNumber} Evidence`,
        targetId: nextCheck.id,
      });
    } else {
      replyContent = `All standard diagnostic checks recommended for **${boardName}** have been documented.

**Suggested Next Engineering Actions:**
1. **Component Isolation:** If an electrical rail remains shorted or depressed, desolder series ferrite beads or lift the VCC pin of candidate ICs to divide the power plane.
2. **Thermal / Current-Limited Inspection:** Apply a current-limited DC bench supply (e.g., 1.0 V, 200 mA limit) to the affected rail while inspecting with isopropyl alcohol evaporation or thermal imaging to locate the localized heat source.
3. **Reassess Investigation:** Click **Reassess with AI** to re-evaluate the full evidence history against candidate hypotheses.`;
    }
  }

  // 5. Topic: Distinguish remaining hypotheses
  else if (
    msgLower.includes('distinguish') ||
    msgLower.includes('differentiate') ||
    msgLower.includes('remaining hypotheses') ||
    msgLower.includes('separate')
  ) {
    if (currentHypotheses.length < 2) {
      replyContent = `There is currently only ${currentHypotheses.length} active hypothesis recorded for **${boardName}**. Distinguishing requires at least two competing candidates.`;
    } else {
      const h1 = currentHypotheses[0];
      const h2 = currentHypotheses[1];

      replyContent = `### Distinguishing Between Competing Hypotheses

**Candidate A:** ${h1.title}
**Candidate B:** ${h2.title}

To isolate which candidate is responsible:
1. **Differential Power Isolation:** Measure impedance from the affected rail directly at Candidate A's input pins versus Candidate B's pins. If separated by an inductor or series diode, measure on both sides of the passive element.
2. **Cold Diode Check:** Compare the forward voltage drop of each candidate's protective ESD diodes relative to circuit GND. A shorted silicon junction will measure near 0.00 V, whereas an intact IC will display 0.5 V to 0.7 V.
3. **Log the Differential Measurement:** Document the specific pin reading so AI reassessment can systematically weaken or contradict the incorrect candidate.`;
    }
  }

  // 6. Topic: Assessment changes / reassessment summary
  else if (
    msgLower.includes('assessment changed') ||
    msgLower.includes('changed after') ||
    msgLower.includes('summarize how') ||
    msgLower.includes('evolution') ||
    msgLower.includes('reassessment summary')
  ) {
    if (reassessments.length === 0) {
      replyContent = `**${boardName}** is currently at initial diagnostic assessment (**Round 0**).

No AI reassessment cycles have occurred yet. The current hypotheses are based solely on the initial visual image intake and technician symptoms. Log bench measurements and click **Reassess with AI** to initiate Round 1.`;
    } else {
      const latestR = reassessments[reassessments.length - 1];
      const supported = latestR.revisedHypotheses.filter((h) => h.status === 'supported');
      const contradicted = latestR.revisedHypotheses.filter((h) => h.status === 'contradicted');
      const unresolved = latestR.revisedHypotheses.filter((h) => h.status === 'unresolved');

      replyContent = `### Assessment Evolution Summary (Through Round ${latestR.cycleIndex})

- **Overall Assessment:** ${latestR.summary}
- **Supported Hypotheses (${supported.length}):** ${supported.map((h) => `\`${h.title}\``).join(', ') || 'None yet'}
- **Contradicted Hypotheses (${contradicted.length}):** ${contradicted.map((h) => `\`${h.title}\``).join(', ') || 'None'}
- **Unresolved Hypotheses (${unresolved.length}):** ${unresolved.map((h) => `\`${h.title}\``).join(', ') || 'None'}

> Reassessment successfully updated hypothesis statuses based on your documented bench evidence citations without hallucinating new visual features.`;
    }
  }

  // 7. Fallback / General Diagnostic Inquiries
  else {
    const topHyp = currentHypotheses[0]?.title || 'visual inspection findings';
    replyContent = `Regarding your inquiry on **${boardName}**:

The current investigation focuses on **${topHyp}**.

Key context for this case:
- **Observed Symptoms:** ${context.technicianSymptoms.observedBehavior || 'Unspecified symptoms'}
- **Recorded Bench Evidence:** ${evidenceLog.length} bench measurements logged
- **Active Hypotheses:** ${currentHypotheses.length} candidate mechanisms under evaluation

> **Diagnostic Guidance:** All recommendations provided by CircuitLens are decision-support hypotheses intended to assist hands-on bench troubleshooting. Always disconnect power before probing component resistance, and avoid assuming a single measurement on a populated board confirms a component failure.`;
  }

  const responseMessage: AssistantMessage = {
    id: `asst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    investigationId,
    role: 'assistant',
    content: replyContent,
    timestamp: new Date().toISOString(),
    status: 'sent',
    isOfflinePreview: true, // Visibly flags response as deterministic preview
    provenance: 'offline_preview',
    suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
  };

  return {
    success: true,
    message: responseMessage,
    warning: 'Offline preview mode: Responses are generated using deterministic case-context logic without third-party model inference.',
  };
}

/**
 * Extracts contextual suggested actions from live model output.
 */
function extractLiveSuggestedActions(
  replyText: string,
  context: AssistantInvestigationContext
): AssistantSuggestedAction[] {
  const actions: AssistantSuggestedAction[] = [];
  const lower = replyText.toLowerCase();

  // If a hypothesis is mentioned, offer matrix inspection
  for (const hyp of (context.currentHypotheses || []).slice(0, 3)) {
    if (lower.includes(hyp.title.toLowerCase().slice(0, 20))) {
      actions.push({
        id: `act_hyp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        type: 'view_hypothesis',
        label: `View "${hyp.title.slice(0, 25)}..." in Matrix`,
        targetId: hyp.title,
      });
      break;
    }
  }

  // If isolation or checks are discussed, offer to view recommended checks
  if (lower.includes('isolation') || lower.includes('recommended check') || lower.includes('multimeter')) {
    actions.push({
      id: `act_chk_${Date.now()}`,
      type: 'suggest_check',
      label: 'View Recommended Checks',
    });
  }

  return actions;
}

/**
 * Executes a live contextual assistant chat call through the configured model provider (Meta/Baseten).
 * Maintains zero client-side credentials, strict XML context encapsulation, and epistemic safety.
 */
export async function executeLiveAssistantChat(
  request: AssistantChatRequest,
  options?: { signal?: AbortSignal }
): Promise<AssistantChatResponse> {
  const { client, config } = createApiClient({ timeout: 45000, maxRetries: 0 });

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: ASSISTANT_SYSTEM_PROMPT,
    },
  ];

  // Include recent conversation turns for dialogue continuity (up to 6)
  if (request.conversationHistory && request.conversationHistory.length > 0) {
    const recent = request.conversationHistory.slice(-6);
    for (const item of recent) {
      if (item.role === 'user' || item.role === 'assistant') {
        messages.push({
          role: item.role,
          content: item.content,
        });
      }
    }
  }

  // Current user prompt with structured context
  messages.push({
    role: 'user',
    content: buildAssistantUserPrompt(request),
  });

  const completion = (await client.chat.completions.create(
    {
      model: config.model,
      messages,
      temperature: 0.3,
      max_tokens: 1500,
    },
    { signal: options?.signal }
  )) as any;

  const replyText = extractMessageContent(completion.choices?.[0]);
  if (!replyText || replyText.trim().length === 0) {
    throw new Error('Model produced empty response content for contextual assistant.');
  }

  const suggestedActions = extractLiveSuggestedActions(replyText, request.context);

  const responseMessage: AssistantMessage = {
    id: `asst_live_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    investigationId: request.investigationId,
    role: 'assistant',
    content: replyText.trim(),
    timestamp: new Date().toISOString(),
    status: 'sent',
    isOfflinePreview: false,
    provenance: 'live_provider',
    providerName: config.provider,
    suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
  };

  return {
    success: true,
    message: responseMessage,
  };
}

/**
 * CircuitLens Stage 6B-4B-3 — Evolution & Timeline Builder Utilities
 *
 * Deterministically constructs multi-round hypothesis matrices, chronological
 * evidence timelines, and high-level assessment summaries.
 * Strictly avoids positional array indexing and never fabricates historical states.
 */

import type {
  DiagnosisResponse,
  DiagnosisReassessmentResponse,
  EvidenceRecord,
  ConfidenceLevel,
} from '../types/diagnosis.ts';
import type {
  EvolutionHypothesisRow,
  RoundAssessmentRecord,
  RoundHypothesisStatus,
  ConfidenceDelta,
  TimelineEvent,
  CurrentDiagnosticSummary,
  AmbiguousHypothesisGroup,
} from '../types/evolution.ts';

const CONFIDENCE_RANKS: Record<ConfidenceLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

function calculateConfidenceDelta(
  prevConf: ConfidenceLevel | null | undefined,
  currConf: ConfidenceLevel | null | undefined
): ConfidenceDelta | null {
  if (!currConf) return null;
  if (!prevConf) return 'initial';
  const prevRank = CONFIDENCE_RANKS[prevConf] ?? 0;
  const currRank = CONFIDENCE_RANKS[currConf] ?? 0;
  if (currRank > prevRank) return 'increased';
  if (currRank < prevRank) return 'decreased';
  return 'unchanged';
}

/**
 * Normalizes title string into a strict, unambiguous canonical matching key.
 */
export function normalizeHypothesisKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Builds the complete multi-round Hypothesis Evolution Matrix.
 *
 * Core Guarantees:
 * 1. Matches hypotheses strictly by normalized title, never by array position.
 * 2. Hypotheses introduced in later rounds are marked 'not_present' for earlier rounds.
 * 3. Hypotheses omitted by the model in later rounds are marked 'omitted', not guessed.
 * 4. Tracks confidence deltas across consecutive evaluated rounds.
 * 5. Partitions citing evidence into supporting vs contradictory references.
 * 6. Hardcodes isConfirmedPhysicalFault to false.
 */
export function buildHypothesisEvolutionMatrix(
  initialDiagnosis: DiagnosisResponse,
  reassessments: DiagnosisReassessmentResponse[] = [],
  _evidenceLog: EvidenceRecord[] = []
): EvolutionHypothesisRow[] {
  const rowsMap = new Map<string, EvolutionHypothesisRow>();

  // 1. Group initial hypotheses by baseKey to detect duplicates in Round 0
  const initialGroups = new Map<string, Array<{ hyp: any; index: number }>>();
  (initialDiagnosis.hypotheses || []).forEach((hyp, idx) => {
    const rawTitle = hyp.title || (hyp as any).hypothesisTitle || 'Unknown Hypothesis';
    const baseKey = normalizeHypothesisKey(rawTitle);
    if (!baseKey) return;
    if (!initialGroups.has(baseKey)) {
      initialGroups.set(baseKey, []);
    }
    initialGroups.get(baseKey)!.push({ hyp, index: idx });
  });

  initialGroups.forEach((items, baseKey) => {
    const isAmbiguous = items.length > 1;
    items.forEach((item, occIdx) => {
      const { hyp } = item;
      const rawTitle = hyp.title || (hyp as any).hypothesisTitle || 'Unknown Hypothesis';
      const initialConf = hyp.confidence || (hyp as any).initialConfidence || 'medium';
      const trackingKey = isAmbiguous ? `${baseKey}::r0-occ${occIdx}` : baseKey;

      const round0Record: RoundAssessmentRecord = {
        roundNumber: 0,
        status: 'unresolved',
        confidence: initialConf,
        confidenceDelta: isAmbiguous ? null : 'initial',
        explanation: hyp.reasoning || null,
        citingEvidenceIds: [],
        supportingEvidenceIds: [],
        contradictoryEvidenceIds: [],
        isAmbiguous,
        disambiguationIndex: isAmbiguous ? occIdx : null,
      };

      rowsMap.set(trackingKey, {
        trackingKey,
        displayTitle: rawTitle,
        initialReasoning: hyp.reasoning || null,
        initialConfidence: initialConf,
        introducedInRound: 0,
        isolatedRoundNumber: isAmbiguous ? 0 : null,
        matchKind: isAmbiguous ? 'ambiguous_candidate' : 'title_matched_heuristic',
        ambiguousGroupId: isAmbiguous ? `group-${baseKey}-r0` : null,
        roundAssessments: { 0: round0Record },
        currentStatus: 'unresolved',
        currentConfidence: initialConf,
        overallConfidenceDelta: null,
        allCitingEvidenceIds: [],
        isConfirmedPhysicalFault: false,
        isAmbiguous,
        disambiguationIndex: isAmbiguous ? occIdx : null,
      });
    });
  });

  // 2. Process each subsequent reassessment round (R1, R2, ...)
  reassessments.forEach((round, rIdx) => {
    const roundNumber = rIdx + 1;
    const evaluatedTrackingKeysThisRound = new Set<string>();

    // Group revised hypotheses by baseKey
    const roundGroups = new Map<string, any[]>();
    (round.revisedHypotheses || []).forEach((rev) => {
      const rawTitle = rev.title || (rev as any).hypothesisTitle || '';
      const baseKey = normalizeHypothesisKey(rawTitle);
      if (!baseKey) return;
      if (!roundGroups.has(baseKey)) {
        roundGroups.set(baseKey, []);
      }
      roundGroups.get(baseKey)!.push(rev);
    });

    // Process each baseKey group in this round
    roundGroups.forEach((revList, baseKey) => {
      // Find all existing rows that correspond to this baseKey
      const existingMatchingRows = Array.from(rowsMap.values()).filter(
        (r) => r.trackingKey === baseKey || r.trackingKey.startsWith(`${baseKey}::`)
      );

      // Check if there is an active, unambiguous continuing candidate from roundNumber - 1
      const activeContinuousRow =
        existingMatchingRows.length === 1 &&
        !existingMatchingRows[0].isAmbiguous &&
        existingMatchingRows[0].matchKind !== 'ambiguous_candidate' &&
        existingMatchingRows[0].roundAssessments[roundNumber - 1]?.status !== 'omitted' &&
        existingMatchingRows[0].roundAssessments[roundNumber - 1]?.status !== 'not_present'
          ? existingMatchingRows[0]
          : null;

      // Check if there is an existing row that was previously OMITTED (Identity gap / reappearance)
      const omittedEarlierRow =
        existingMatchingRows.length === 1 &&
        !existingMatchingRows[0].isAmbiguous &&
        (existingMatchingRows[0].roundAssessments[roundNumber - 1]?.status === 'omitted' ||
          (existingMatchingRows[0].introducedInRound < roundNumber - 1 &&
            existingMatchingRows[0].currentStatus === 'omitted'))
          ? existingMatchingRows[0]
          : null;

      if (revList.length === 1 && activeContinuousRow) {
        // Case A: Clean 1-to-1 unambiguous continuation
        const row = activeContinuousRow;
        const rev = revList[0];
        evaluatedTrackingKeysThisRound.add(row.trackingKey);

        const citingIds = rev.citingEvidenceIds || [];
        const supportingIds: string[] = [];
        const contradictoryIds: string[] = [];

        citingIds.forEach((evId: string) => {
          if (rev.status === 'supported') supportingIds.push(evId);
          else if (rev.status === 'contradicted') contradictoryIds.push(evId);
        });

        // Determine previous evaluated confidence
        let prevEvaluatedConf: ConfidenceLevel | null = null;
        for (let prevR = roundNumber - 1; prevR >= 0; prevR--) {
          const priorRec = row.roundAssessments[prevR];
          if (
            priorRec &&
            priorRec.status !== 'not_present' &&
            priorRec.status !== 'omitted' &&
            priorRec.confidence
          ) {
            prevEvaluatedConf = priorRec.confidence;
            break;
          }
        }

        const confDelta = calculateConfidenceDelta(prevEvaluatedConf, rev.confidence);

        row.roundAssessments[roundNumber] = {
          roundNumber,
          status: rev.status,
          confidence: rev.confidence,
          confidenceDelta: confDelta,
          explanation: rev.explanationOfChange || null,
          citingEvidenceIds: citingIds,
          supportingEvidenceIds: supportingIds,
          contradictoryEvidenceIds: contradictoryIds,
          isAmbiguous: false,
          disambiguationIndex: null,
        };

        row.currentStatus = rev.status;
        row.currentConfidence = rev.confidence;

        citingIds.forEach((id: string) => {
          if (!row.allCitingEvidenceIds.includes(id)) {
            row.allCitingEvidenceIds.push(id);
          }
        });
      } else if (revList.length === 1 && existingMatchingRows.length === 0) {
        // Case B: Clean single newly introduced hypothesis
        const rev = revList[0];
        const trackingKey = baseKey;
        evaluatedTrackingKeysThisRound.add(trackingKey);

        const initialRoundMap: Record<number, RoundAssessmentRecord> = {};
        for (let prior = 0; prior < roundNumber; prior++) {
          initialRoundMap[prior] = {
            roundNumber: prior,
            status: 'not_present',
            confidence: null,
            confidenceDelta: null,
            explanation: null,
            citingEvidenceIds: [],
            supportingEvidenceIds: [],
            contradictoryEvidenceIds: [],
            isAmbiguous: false,
          };
        }

        const citingIds = rev.citingEvidenceIds || [];
        const supportingIds: string[] = [];
        const contradictoryIds: string[] = [];

        citingIds.forEach((evId: string) => {
          if (rev.status === 'supported') supportingIds.push(evId);
          else if (rev.status === 'contradicted') contradictoryIds.push(evId);
        });

        initialRoundMap[roundNumber] = {
          roundNumber,
          status: rev.status,
          confidence: rev.confidence,
          confidenceDelta: 'initial',
          explanation: rev.explanationOfChange || null,
          citingEvidenceIds: citingIds,
          supportingEvidenceIds: supportingIds,
          contradictoryEvidenceIds: contradictoryIds,
          isAmbiguous: false,
        };

        const newRow: EvolutionHypothesisRow = {
          trackingKey,
          displayTitle: rev.title || (rev as any).hypothesisTitle || baseKey,
          initialReasoning: null,
          initialConfidence: null,
          introducedInRound: roundNumber,
          matchKind: 'new_hypothesis',
          roundAssessments: initialRoundMap,
          currentStatus: rev.status,
          currentConfidence: rev.confidence,
          overallConfidenceDelta: null,
          allCitingEvidenceIds: [...citingIds],
          isConfirmedPhysicalFault: false,
          isAmbiguous: false,
        };

        rowsMap.set(trackingKey, newRow);
      } else if (revList.length === 1 && omittedEarlierRow) {
        // Case C: Reappearance after omission (Task 2)
        // 1. Earlier row stays omitted in roundNumber (preserve historical gap)
        const earlierRow = omittedEarlierRow;
        earlierRow.roundAssessments[roundNumber] = {
          roundNumber,
          status: 'omitted',
          confidence: null,
          confidenceDelta: null,
          explanation: 'Hypothesis omitted in earlier rounds; not automatically reconnected.',
          citingEvidenceIds: [],
          supportingEvidenceIds: [],
          contradictoryEvidenceIds: [],
          isAmbiguous: false,
        };

        // 2. Create new independent reappearing row (identity cannot be established across gap)
        const rev = revList[0];
        const trackingKey = `${baseKey}::reappeared-r${roundNumber}`;
        evaluatedTrackingKeysThisRound.add(trackingKey);

        const initialRoundMap: Record<number, RoundAssessmentRecord> = {};
        for (let prior = 0; prior < roundNumber; prior++) {
          initialRoundMap[prior] = {
            roundNumber: prior,
            status: 'not_present',
            confidence: null,
            confidenceDelta: null,
            explanation: null,
            citingEvidenceIds: [],
            supportingEvidenceIds: [],
            contradictoryEvidenceIds: [],
            isAmbiguous: true,
          };
        }

        const citingIds = rev.citingEvidenceIds || [];
        const supportingIds: string[] = [];
        const contradictoryIds: string[] = [];

        citingIds.forEach((evId: string) => {
          if (rev.status === 'supported') supportingIds.push(evId);
          else if (rev.status === 'contradicted') contradictoryIds.push(evId);
        });

        initialRoundMap[roundNumber] = {
          roundNumber,
          status: rev.status,
          confidence: rev.confidence,
          confidenceDelta: null, // Suppress directional delta across omission gap
          explanation: rev.explanationOfChange || null,
          citingEvidenceIds: citingIds,
          supportingEvidenceIds: supportingIds,
          contradictoryEvidenceIds: contradictoryIds,
          isAmbiguous: true,
        };

        const reappearingRow: EvolutionHypothesisRow = {
          trackingKey,
          displayTitle: rev.title || (rev as any).hypothesisTitle || baseKey,
          initialReasoning: null,
          initialConfidence: null,
          introducedInRound: roundNumber,
          matchKind: 'reappearing_candidate',
          isReappearance: true,
          isAmbiguous: true,
          roundAssessments: initialRoundMap,
          currentStatus: rev.status,
          currentConfidence: rev.confidence,
          overallConfidenceDelta: null,
          allCitingEvidenceIds: [...citingIds],
          isConfirmedPhysicalFault: false,
        };

        rowsMap.set(trackingKey, reappearingRow);
      } else {
        // Case D: Ambiguous Candidates (Multiple in revList, or existing was ambiguous)
        // Task 1: Never pair ambiguous duplicate candidates across rounds based on array position!
        // Mark any earlier active rows for this baseKey as ambiguous and omitted for this round
        existingMatchingRows.forEach((r) => {
          r.isAmbiguous = true;
          if (r.isolatedRoundNumber === null || r.isolatedRoundNumber === undefined) {
            // It was a continuous row, but this round output duplicates or failed to match
            r.roundAssessments[roundNumber] = {
              roundNumber,
              status: 'omitted',
              confidence: null,
              confidenceDelta: null,
              explanation: 'Multiple ambiguous candidates emitted; continuity cannot be established.',
              citingEvidenceIds: [],
              supportingEvidenceIds: [],
              contradictoryEvidenceIds: [],
              isAmbiguous: true,
            };
          }
        });

        // Each candidate in revList is registered as a round-specific ambiguous candidate
        revList.forEach((rev, occIdx) => {
          const trackingKey = `${baseKey}::r${roundNumber}-occ${occIdx}`;
          evaluatedTrackingKeysThisRound.add(trackingKey);

          const citingIds = rev.citingEvidenceIds || [];
          const supportingIds: string[] = [];
          const contradictoryIds: string[] = [];

          citingIds.forEach((evId: string) => {
            if (rev.status === 'supported') supportingIds.push(evId);
            else if (rev.status === 'contradicted') contradictoryIds.push(evId);
          });

          const initialRoundMap: Record<number, RoundAssessmentRecord> = {};
          for (let prior = 0; prior < roundNumber; prior++) {
            initialRoundMap[prior] = {
              roundNumber: prior,
              status: 'not_present',
              confidence: null,
              confidenceDelta: null,
              explanation: null,
              citingEvidenceIds: [],
              supportingEvidenceIds: [],
              contradictoryEvidenceIds: [],
              isAmbiguous: true,
              disambiguationIndex: occIdx,
            };
          }

          initialRoundMap[roundNumber] = {
            roundNumber,
            status: rev.status,
            confidence: rev.confidence,
            confidenceDelta: null, // Suppress directional delta when identity is ambiguous
            explanation: rev.explanationOfChange || null,
            citingEvidenceIds: citingIds,
            supportingEvidenceIds: supportingIds,
            contradictoryEvidenceIds: contradictoryIds,
            isAmbiguous: true,
            disambiguationIndex: occIdx,
          };

          const ambiguousRow: EvolutionHypothesisRow = {
            trackingKey,
            displayTitle: rev.title || (rev as any).hypothesisTitle || baseKey,
            initialReasoning: null,
            initialConfidence: null,
            introducedInRound: roundNumber,
            isolatedRoundNumber: roundNumber,
            matchKind: 'ambiguous_candidate',
            ambiguousGroupId: `group-${baseKey}-r${roundNumber}`,
            roundAssessments: initialRoundMap,
            currentStatus: rev.status,
            currentConfidence: rev.confidence,
            overallConfidenceDelta: null,
            allCitingEvidenceIds: [...citingIds],
            isConfirmedPhysicalFault: false,
            isAmbiguous: true,
            disambiguationIndex: occIdx,
          };

          rowsMap.set(trackingKey, ambiguousRow);
        });
      }
    });

    // 3. Mark any tracked hypotheses not evaluated in this round as 'omitted' (or 'not_present' for isolated)
    rowsMap.forEach((row, k) => {
      if (!evaluatedTrackingKeysThisRound.has(k)) {
        if (row.isolatedRoundNumber !== null && row.isolatedRoundNumber !== undefined) {
          // Round-isolated candidate only exists in its specific round
          if (!row.roundAssessments[roundNumber]) {
            row.roundAssessments[roundNumber] = {
              roundNumber,
              status: 'not_present',
              confidence: null,
              confidenceDelta: null,
              explanation: null,
              citingEvidenceIds: [],
              supportingEvidenceIds: [],
              contradictoryEvidenceIds: [],
              isAmbiguous: true,
              disambiguationIndex: row.disambiguationIndex ?? null,
            };
          }
        } else if (row.introducedInRound <= roundNumber) {
          // Continuous hypothesis was omitted in this round
          if (!row.roundAssessments[roundNumber]) {
            row.roundAssessments[roundNumber] = {
              roundNumber,
              status: 'omitted',
              confidence: null,
              confidenceDelta: null,
              explanation: 'Hypothesis was not evaluated in this reassessment round.',
              citingEvidenceIds: [],
              supportingEvidenceIds: [],
              contradictoryEvidenceIds: [],
              isAmbiguous: row.isAmbiguous || false,
              disambiguationIndex: row.disambiguationIndex ?? null,
            };
            row.currentStatus = 'omitted';
            row.currentConfidence = null;
          }
        }
      }
    });
  });

  // 4. Calculate overall confidence delta for each row
  rowsMap.forEach((row) => {
    if (
      row.isAmbiguous ||
      row.isReappearance ||
      row.matchKind === 'ambiguous_candidate' ||
      row.matchKind === 'reappearing_candidate'
    ) {
      row.overallConfidenceDelta = null;
    } else {
      const firstEvaluated = row.roundAssessments[row.introducedInRound]?.confidence;
      const latestEvaluated = row.currentConfidence;
      row.overallConfidenceDelta = calculateConfidenceDelta(firstEvaluated, latestEvaluated);
    }
  });

  return Array.from(rowsMap.values());
}

/**
 * Extracts clustered ambiguous hypothesis groups by round.
 */
export function extractAmbiguousHypothesisGroups(
  rows: EvolutionHypothesisRow[]
): AmbiguousHypothesisGroup[] {
  const groupsMap = new Map<string, AmbiguousHypothesisGroup>();

  rows.forEach((row) => {
    if (row.isAmbiguous && row.isolatedRoundNumber !== null && row.isolatedRoundNumber !== undefined) {
      const r = row.isolatedRoundNumber;
      const baseTitle = row.displayTitle;
      const groupId = `group-${normalizeHypothesisKey(baseTitle)}-r${r}`;

      if (!groupsMap.has(groupId)) {
        groupsMap.set(groupId, {
          groupId,
          roundNumber: r,
          baseTitle,
          candidates: [],
        });
      }

      const assessment = row.roundAssessments[r];
      if (assessment && assessment.status !== 'not_present') {
        groupsMap.get(groupId)!.candidates.push({
          candidateId: row.trackingKey,
          roundNumber: r,
          occurrenceIndex: row.disambiguationIndex ?? 0,
          title: row.displayTitle,
          status: assessment.status,
          confidence: assessment.confidence,
          explanation: assessment.explanation,
          citingEvidenceIds: assessment.citingEvidenceIds,
          supportingEvidenceIds: assessment.supportingEvidenceIds,
          contradictoryEvidenceIds: assessment.contradictoryEvidenceIds,
        });
      }
    }
  });

  return Array.from(groupsMap.values());
}

/**
 * Builds the chronological Evidence and Diagnostic Timeline.
 */
export function buildEvidenceTimeline(
  arg1: string | DiagnosisResponse,
  arg2?: DiagnosisResponse | DiagnosisReassessmentResponse[] | EvidenceRecord[],
  arg3?: EvidenceRecord[] | DiagnosisReassessmentResponse[],
  arg4?: DiagnosisReassessmentResponse[] | string | null,
  arg5?: string | null
): TimelineEvent[] {
  let investigationId: string;
  let initialDiagnosis: DiagnosisResponse;
  let evidenceLog: EvidenceRecord[];
  let reassessments: DiagnosisReassessmentResponse[];
  let initialTimestamp: string | null;

  if (typeof arg1 === 'string') {
    investigationId = arg1;
    initialDiagnosis = (arg2 as DiagnosisResponse) || { summary: '', visibleObservations: [], hypotheses: [], recommendedChecks: [], safetyWarnings: [] };
    evidenceLog = (arg3 as EvidenceRecord[]) || [];
    reassessments = (arg4 as DiagnosisReassessmentResponse[]) || [];
    initialTimestamp = arg5 || null;
  } else {
    investigationId = 'INV-DEFAULT';
    initialDiagnosis = arg1;
    if (Array.isArray(arg2) && arg2.length > 0 && 'reassessmentSummary' in (arg2[0] as any)) {
      reassessments = arg2 as DiagnosisReassessmentResponse[];
      evidenceLog = (arg3 as EvidenceRecord[]) || [];
    } else {
      reassessments = (arg2 as DiagnosisReassessmentResponse[]) || [];
      evidenceLog = (arg3 as EvidenceRecord[]) || [];
    }
    initialTimestamp = (arg4 as string) || null;
  }

  const events: TimelineEvent[] = [];

  // 1. Initial Diagnostic Event
  events.push({
    id: `event-init-${investigationId}`,
    eventType: 'initial_diagnosis',
    source: 'ai',
    cycleIndex: 0,
    timestamp: initialTimestamp,
    title: 'Initial Visual AI Diagnosis',
    subtitle: `${initialDiagnosis.visibleObservations?.length || 0} optical observations, ${initialDiagnosis.hypotheses?.length || 0} fault hypotheses formed`,
    summary: initialDiagnosis.summary,
    safetyWarnings: initialDiagnosis.safetyWarnings || [],
  });

  // Track map of superseding pointers
  const supersededByMap = new Map<string, string>();
  evidenceLog.forEach((e) => {
    if (e.supersedesEvidenceId) {
      supersededByMap.set(e.supersedesEvidenceId, e.id);
    }
  });

  // 2. Technician Bench Evidence Events
  evidenceLog.forEach((ev) => {
    const supersedingId = supersededByMap.get(ev.id) || ev.supersededByEvidenceId || null;
    const isSuperseded = Boolean(supersedingId);
    events.push({
      id: `event-ev-${ev.id}`,
      eventType: isSuperseded ? 'evidence_superseded' : 'evidence_submitted',
      source: 'technician',
      cycleIndex: ev.cycleIndex ?? 0,
      timestamp: ev.recordedAt || null,
      title: isSuperseded ? `Bench Measurement Superseded [${ev.id}]` : `Bench Measurement Recorded [${ev.id}]`,
      subtitle: `Step #${ev.stepNumber}: ${ev.checkTitle}`,
      evidenceDetails: {
        evidenceId: ev.id,
        checkTitle: ev.checkTitle,
        stepNumber: ev.stepNumber,
        outcome: ev.outcome,
        numericValue: typeof ev.numericValue === 'number' ? ev.numericValue : null,
        measurementUnit: ev.measurementUnit || null,
        isSuperseded,
        supersedesEvidenceId: ev.supersedesEvidenceId || null,
        supersededByEvidenceId: supersedingId,
        technicianNotes: ev.technicianNotes || null,
      },
    });
  });

  // 3. Reassessment Events
  reassessments.forEach((round, rIdx) => {
    const cycleIndex = rIdx + 1;
    const statusChanges: TimelineEvent['hypothesisChanges'] = [];

    // Find previous round status for each revised hypothesis
    (round.revisedHypotheses || []).forEach((rev) => {
      const key = normalizeHypothesisKey(rev.title);
      let previousStatus: RoundHypothesisStatus = 'unresolved';
      let previousConf: ConfidenceLevel | null = null;

      if (rIdx === 0) {
        // Compare with initial diagnosis
        const initMatch = (initialDiagnosis.hypotheses || []).find(
          (h) => normalizeHypothesisKey(h.title) === key
        );
        if (initMatch) {
          previousStatus = 'unresolved';
          previousConf = initMatch.confidence || null;
        } else {
          previousStatus = 'not_present';
        }
      } else {
        // Compare with previous reassessment
        const prevRound = reassessments[rIdx - 1];
        const prevMatch = (prevRound?.revisedHypotheses || []).find(
          (h) => normalizeHypothesisKey(h.title) === key
        );
        if (prevMatch) {
          previousStatus = prevMatch.status;
          previousConf = prevMatch.confidence;
        } else {
          previousStatus = 'omitted';
        }
      }

      statusChanges.push({
        hypothesisTitle: rev.title,
        previousStatus,
        newStatus: rev.status,
        previousConfidence: previousConf,
        newConfidence: rev.confidence,
      });
    });

    events.push({
      id: `event-reassess-${cycleIndex}`,
      eventType: 'reassessment_completed',
      source: 'ai',
      cycleIndex,
      timestamp: null, // Model gateway does not return response timestamp; do not fabricate
      title: `Reassessment Round #${cycleIndex} Synthesis`,
      subtitle: `${round.revisedHypotheses?.length || 0} hypotheses revised, ${round.nextRecommendedChecks?.length || 0} next checks prioritized`,
      summary: round.summary,
      hypothesisChanges: statusChanges,
      safetyWarnings: round.safetyWarnings || [],
    });
  });

  // Sort events chronologically where timestamps exist, preserving cycle index ordering
  return events.sort((a, b) => {
    // If both have timestamps, sort by timestamp
    if (a.timestamp && b.timestamp) {
      const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      if (diff !== 0) return diff;
    }
    // Fall back to cycleIndex
    if (a.cycleIndex !== b.cycleIndex) {
      return a.cycleIndex - b.cycleIndex;
    }
    // Initial diagnosis always first in cycle 0
    if (a.eventType === 'initial_diagnosis') return -1;
    if (b.eventType === 'initial_diagnosis') return 1;
    return 0;
  });
}

/**
 * Builds the current diagnostic assessment summary.
 */
export function buildCurrentDiagnosticSummary(
  firstArg: EvolutionHypothesisRow[] | DiagnosisResponse,
  secondArg?: DiagnosisResponse | DiagnosisReassessmentResponse[],
  thirdArg?: DiagnosisReassessmentResponse[] | EvidenceRecord[],
  fourthArg?: EvidenceRecord[]
): CurrentDiagnosticSummary {
  let evolutionRows: EvolutionHypothesisRow[];
  let initialDiagnosis: DiagnosisResponse;
  let reassessments: DiagnosisReassessmentResponse[];
  let evidenceLog: EvidenceRecord[];

  if (Array.isArray(firstArg)) {
    evolutionRows = firstArg;
    initialDiagnosis = (secondArg as DiagnosisResponse) || { summary: '', visibleObservations: [], hypotheses: [], recommendedChecks: [], safetyWarnings: [] };
    reassessments = (thirdArg as DiagnosisReassessmentResponse[]) || [];
    evidenceLog = fourthArg || [];
  } else {
    initialDiagnosis = firstArg;
    reassessments = (secondArg as DiagnosisReassessmentResponse[]) || [];
    evidenceLog = (thirdArg as EvidenceRecord[]) || [];
    evolutionRows = buildHypothesisEvolutionMatrix(initialDiagnosis, reassessments, evidenceLog);
  }

  const supportedHypotheses: EvolutionHypothesisRow[] = [];
  const contradictedHypotheses: EvolutionHypothesisRow[] = [];
  const unresolvedHypotheses: EvolutionHypothesisRow[] = [];

  evolutionRows.forEach((row) => {
    if (row.currentStatus === 'supported') {
      supportedHypotheses.push(row);
    } else if (row.currentStatus === 'contradicted') {
      contradictedHypotheses.push(row);
    } else {
      unresolvedHypotheses.push(row);
    }
  });

  // Active (non-superseded) evidence
  const activeEvidence = evidenceLog.filter((e) => !e.supersededByEvidenceId);

  // Map evidence to hypotheses they cite
  const evidenceCitations = new Map<string, string[]>();
  evolutionRows.forEach((row) => {
    row.allCitingEvidenceIds.forEach((evId) => {
      const list = evidenceCitations.get(evId) || [];
      if (!list.includes(row.displayTitle)) {
        list.push(row.displayTitle);
      }
      evidenceCitations.set(evId, list);
    });
  });

  const strongestSupportingEvidence: CurrentDiagnosticSummary['strongestSupportingEvidence'] = [];
  const importantContradictoryEvidence: CurrentDiagnosticSummary['importantContradictoryEvidence'] = [];

  activeEvidence.forEach((ev) => {
    const citedHypotheses = evidenceCitations.get(ev.id) || [];
    const valFormatted =
      typeof ev.numericValue === 'number' && ev.measurementUnit
        ? `${ev.numericValue} ${ev.measurementUnit}`
        : ev.outcome.toUpperCase();

    // Check if cites any supported hypotheses
    const citesSupported = supportedHypotheses.some((h) => h.allCitingEvidenceIds.includes(ev.id));
    if (citesSupported) {
      strongestSupportingEvidence.push({
        evidenceId: ev.id,
        checkTitle: ev.checkTitle,
        measurementFormatted: valFormatted,
        outcome: ev.outcome,
        citesHypotheses: citedHypotheses,
      });
    }

    // Check if cites any contradicted hypotheses
    const citesContradicted = contradictedHypotheses.some((h) => h.allCitingEvidenceIds.includes(ev.id));
    if (citesContradicted) {
      importantContradictoryEvidence.push({
        evidenceId: ev.id,
        checkTitle: ev.checkTitle,
        measurementFormatted: valFormatted,
        outcome: ev.outcome,
        citesHypotheses: citedHypotheses,
      });
    }
  });

  // Outstanding checks: from latest reassessment round, or initial diagnosis
  const latestRound = reassessments.length > 0 ? reassessments[reassessments.length - 1] : null;
  const rawChecks = latestRound?.nextRecommendedChecks?.length
    ? latestRound.nextRecommendedChecks
    : initialDiagnosis.recommendedChecks || [];

  const outstandingChecks = rawChecks.map((chk, idx) => ({
    stepNumber: chk.stepNumber ?? idx + 1,
    title: chk.title,
    procedure: chk.procedure || '',
    expectedResult: chk.expectedResult || '',
  }));

  // Deduplicated safety warnings
  const warningsSet = new Set<string>();
  (initialDiagnosis.safetyWarnings || []).forEach((w) => warningsSet.add(w));
  reassessments.forEach((r) => (r.safetyWarnings || []).forEach((w) => warningsSet.add(w)));

  return {
    supportedHypotheses,
    contradictedHypotheses,
    unresolvedHypotheses,
    strongestSupportingEvidence,
    importantContradictoryEvidence,
    outstandingChecks,
    safetyWarnings: Array.from(warningsSet),
    totalCyclesCompleted: reassessments.length,
  };
}

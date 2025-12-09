import type { BellsHelper } from "$lib/hellclock/bells";
import { BELL_TYPES_BY_ID } from "$lib/hellclock/bells";
import type {
  StatModifierNodeAffixDefinition,
  StatusNodeAffixDefinition,
} from "$lib/hellclock/constellations";
import type { StatusHelper } from "$lib/hellclock/status";
import type { EvaluationContribution, ContributionDelta } from "$lib/context/evaluation-types";
import { translate } from "$lib/hellclock/lang";
import { getContext, setContext } from "svelte";
import { useBellEquipped } from "$lib/context/bellequipped.svelte";
import { useStatusEvaluation } from "$lib/context/statusevaluation.svelte";
import {
  ContributionTracker,
  type TrackedState,
} from "./contribution-tracker";

export type BellModSource = {
  source: string;
  amount: number;
  layer: string;
  meta: {
    type: string;
    bellId: string;
    nodeId: string;
    level: string;
    value: string;
  };
};

export type BellModCollection = Record<string, BellModSource[]>;

export type BellEvaluationAPI = {
  // Get unified contribution for evaluation (only active bell) - legacy
  getContribution: () => EvaluationContribution;

  // Get delta for incremental updates (new)
  getDelta: () => ContributionDelta;

  // Reset tracker state (for full rebuild)
  resetTracker: () => void;

  // Check if bells have changed (for cache invalidation)
  get bellHash(): string;
};

const bellEvaluationKey = Symbol("bell-evaluation");

export function provideBellEvaluation(
  bellsHelper?: BellsHelper,
  statusHelper?: StatusHelper,
  lang = "en",
): BellEvaluationAPI {
  const bellEquippedApi = useBellEquipped();
  const statusEvaluationApi = useStatusEvaluation();
  const tracker = new ContributionTracker();

  /**
   * Build tracked state with consumer_ids for all contributions
   */
  function buildTrackedState(): TrackedState {
    const state: TrackedState = { mods: {}, flags: {}, broadcasts: [] };

    if (!bellsHelper) {
      return state;
    }

    const activeBellId = bellEquippedApi.activeBellId;
    const bell = bellsHelper.getBellById(activeBellId);
    if (!bell) {
      return state;
    }

    const bellType = BELL_TYPES_BY_ID[activeBellId];
    const bellName = `${bellType} Bell`;

    // Only process nodes for the active bell
    for (const [_key, allocated] of bellEquippedApi.allocatedNodes.entries()) {
      // Skip nodes not belonging to the active bell
      if (allocated.constellationId !== activeBellId) continue;
      if (allocated.level === 0) continue;

      const node = bellsHelper.getNodeById(
        allocated.constellationId,
        allocated.nodeId,
      );
      if (!node) continue;

      const nodeName = translate(node.nameLocalizationKey, lang);

      // Process each affix in the node
      for (let affixIndex = 0; affixIndex < node.affixes.length; affixIndex++) {
        const affix = node.affixes[affixIndex];
        if (affix.type === "StatModifierNodeAffixDefinition") {
          const statAffix = affix as StatModifierNodeAffixDefinition;

          // Map the stat to the format expected by the engine
          const statKey = statAffix.eStatDefinition.replaceAll(" ", "");

          if (!(statKey in state.mods)) {
            state.mods[statKey] = [];
          }

          // Calculate the effective value
          const effectiveValue = bellsHelper.getStatValueAtLevel(
            statAffix.value,
            allocated.level,
            statAffix.statModifierType,
          );

          // Determine layer based on modifier type
          let layer = "base";
          const lowerModifierType = statAffix.statModifierType.toLowerCase();
          if (lowerModifierType === "additive") {
            layer = "add";
          } else if (lowerModifierType === "multiplicative") {
            layer = "mult";
          } else if (lowerModifierType === "multiplicativeadditive") {
            layer = "multadd";
          }

          // Consumer ID pattern: bell:{bellId}:{nodeId}:{affixIndex}
          const consumerId = `bell:${activeBellId}:${allocated.nodeId}:${affixIndex}`;

          state.mods[statKey].push({
            consumer_id: consumerId,
            source: `${bellName} - ${nodeName}${allocated.level > 1 ? ` (x${allocated.level})` : ""}`,
            amount: effectiveValue,
            layer: layer,
            meta: {
              type: "bell",
              bellId: String(allocated.constellationId),
              nodeId: allocated.nodeId,
              level: String(allocated.level),
              value: String(statAffix.value),
            },
          });
        }
      }
    }

    return state;
  }

  // Sync status effects from bell nodes to StatusEvaluation
  function syncBellStatusEffects(): void {
    if (!statusHelper || !bellsHelper || !statusEvaluationApi) return;

    // Clear all bell-sourced statuses first
    statusEvaluationApi.clearBySource("bell:");

    const activeBellId = bellEquippedApi.activeBellId;
    const bell = bellsHelper.getBellById(activeBellId);
    if (!bell) return;

    const bellType = BELL_TYPES_BY_ID[activeBellId];
    const bellName = `${bellType} Bell`;

    // Process each allocated bell node (only active bell)
    for (const [_key, allocated] of bellEquippedApi.allocatedNodes.entries()) {
      // Skip nodes not belonging to the active bell
      if (allocated.constellationId !== activeBellId) continue;
      if (allocated.level === 0) continue;

      const node = bellsHelper.getNodeById(
        allocated.constellationId,
        allocated.nodeId,
      );
      if (!node) continue;

      const nodeName = translate(node.nameLocalizationKey, lang);

      // Process each affix in the node
      for (const affix of node.affixes) {
        if (affix.type === "StatusNodeAffixDefinition") {
          const statusAffix = affix as StatusNodeAffixDefinition;

          // Get the status definition from the reference
          const statusDef = statusHelper.getStatusFromReference(
            statusAffix.statusDefinition,
          );

          if (statusDef) {
            statusEvaluationApi.addStatus({
              statusId: statusDef.id,
              source: `bell:${bellName} - ${nodeName}`,
              intensity: 1,
              stacks: 1,
              duration: statusAffix.duration,
              meta: {
                bellId: allocated.constellationId,
                nodeId: allocated.nodeId,
                level: allocated.level,
                bellName,
                nodeName,
              },
            });
          }
        }
      }
    }
  }

  // Use $effect to sync status effects when bell allocation or active bell changes
  $effect(() => {
    // Track dependencies for reactive updates
    bellEquippedApi.allocatedNodes.size;
    bellEquippedApi.activeBellId;
    syncBellStatusEffects();
  });

  /**
   * Get delta for incremental updates (new API)
   */
  function getDelta(): ContributionDelta {
    const currentState = buildTrackedState();
    return tracker.getDelta(currentState);
  }

  /**
   * Reset tracker state (for full rebuild scenarios)
   */
  function resetTracker(): void {
    tracker.reset();
  }

  /**
   * Get unified contribution for evaluation (legacy API)
   */
  function getContribution(): EvaluationContribution {
    const state = buildTrackedState();

    // Convert to unified type
    const mods: EvaluationContribution["mods"] = {};
    for (const [statName, sources] of Object.entries(state.mods)) {
      mods[statName] = sources.map((s) => ({
        consumer_id: s.consumer_id,
        source: s.source,
        amount: s.amount,
        layer: s.layer,
        meta: { ...s.meta },
      }));
    }

    return { mods, flags: {}, broadcasts: [] };
  }

  const api: BellEvaluationAPI = {
    getContribution,
    getDelta,
    resetTracker,

    get bellHash() {
      // Include active bell ID in hash since switching bells changes evaluation
      const activeBellId = bellEquippedApi.activeBellId;

      // Only include nodes from the active bell in the hash
      const allocated = Array.from(
        bellEquippedApi.allocatedNodes.entries(),
      ).filter(([_, value]) => value.constellationId === activeBellId);

      return (
        `bell:${activeBellId}|` +
        allocated
          .map(([key, value]) => `${key}:${value.level}`)
          .sort()
          .join("|")
      );
    },
  };

  setContext(bellEvaluationKey, api);
  return api;
}

export function useBellEvaluation(): BellEvaluationAPI {
  const ctx = getContext<BellEvaluationAPI>(bellEvaluationKey);
  if (!ctx) {
    throw new Error(
      "BellEvaluation context not found. Did you call provideBellEvaluation() in +layout.svelte?",
    );
  }
  return ctx;
}

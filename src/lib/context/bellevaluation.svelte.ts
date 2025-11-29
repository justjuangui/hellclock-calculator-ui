import type {
  BellsHelper,
  GreatBellSkillTreeDefinition,
} from "$lib/hellclock/bells";
import { BELL_TYPES_BY_ID } from "$lib/hellclock/bells";
import type {
  StatModifierNodeAffixDefinition,
  StatusNodeAffixDefinition,
} from "$lib/hellclock/constellations";
import type { StatusHelper } from "$lib/hellclock/status";
import { getValueFromMultiplier } from "$lib/hellclock/formats";
import { translate } from "$lib/hellclock/lang";
import { getContext, setContext } from "svelte";
import { useBellEquipped } from "$lib/context/bellequipped.svelte";
import { useStatusEvaluation } from "$lib/context/statusevaluation.svelte";

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
  // Get current bell modifications for evaluation (only active bell)
  getBellMods: () => BellModCollection;

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

  function getBellMods(): BellModCollection {
    const mods: BellModCollection = {};

    if (!bellsHelper) {
      return mods;
    }

    const activeBellId = bellEquippedApi.activeBellId;
    const bell = bellsHelper.getBellById(activeBellId);
    if (!bell) {
      return mods;
    }

    const bellType = BELL_TYPES_BY_ID[activeBellId];
    const bellName = `${bellType} Bell`;

    // Only process nodes for the active bell
    for (const [key, allocated] of bellEquippedApi.allocatedNodes.entries()) {
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
        if (affix.type === "StatModifierNodeAffixDefinition") {
          const statAffix = affix as StatModifierNodeAffixDefinition;

          // Map the stat to the format expected by the engine
          const statKey = statAffix.eStatDefinition.replaceAll(" ", "");

          if (!(statKey in mods)) {
            mods[statKey] = [];
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

          mods[statKey].push({
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

    return mods;
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
    for (const [key, allocated] of bellEquippedApi.allocatedNodes.entries()) {
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
    // Track both node count and active bell ID
    const _nodeCount = bellEquippedApi.allocatedNodes.size;
    const _activeBellId = bellEquippedApi.activeBellId;
    syncBellStatusEffects();
  });

  const api: BellEvaluationAPI = {
    getBellMods,

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

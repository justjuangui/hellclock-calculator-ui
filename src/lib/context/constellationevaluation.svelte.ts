import type {
  ConstellationsHelper,
  StatModifierNodeAffixDefinition,
  StatusNodeAffixDefinition,
  StatProxyModifierNodeAffixDefinition,
  SkillBehaviorNodeAffixDefinition,
} from "$lib/hellclock/constellations";
import type { StatsHelper } from "$lib/hellclock/stats";
import type { StatusHelper } from "$lib/hellclock/status";
import type { EvaluationContribution, ContributionDelta, TrackedBroadcastContribution } from "$lib/context/evaluation-types";
import {
  getValueFromMultiplier,
  formatStatModNumber,
} from "$lib/hellclock/formats";
import { translate } from "$lib/hellclock/lang";
import { getContext, setContext } from "svelte";
import { useConstellationEquipped } from "$lib/context/constellationequipped.svelte";
import { useStatusEvaluation } from "$lib/context/statusevaluation.svelte";
import {
  getLayerFromModifierType,
  normalizeStatName,
  createProxyFlagName,
  effectConverterRegistry,
  type ConstellationConverterContext,
  type BroadcastContribution,
} from "$lib/context/affix-converters";
import {
  ContributionTracker,
  type TrackedState,
} from "./contribution-tracker";

export type ConstellationModSource = {
  source: string;
  amount: number;
  layer: string;
  meta: {
    type: string;
    constellationId: string;
    nodeId: string;
    level: string;
    value: string;
  };
};

export type ConstellationModCollection = Record<
  string,
  ConstellationModSource[]
>;

export type ConstellationFlagSource = {
  source: string;
  enabled: boolean;
  meta: {
    type: string;
    constellationId: string;
    nodeId: string;
    level: string;
  };
};

export type ConstellationFlagCollection = Record<
  string,
  ConstellationFlagSource[]
>;

export type ConstellationEvaluationAPI = {
  // Get unified contribution for evaluation (legacy)
  getContribution: () => EvaluationContribution;

  // Get delta for incremental updates (new)
  getDelta: () => ContributionDelta;

  // Reset tracker state (for full rebuild)
  resetTracker: () => void;

  // Check if constellations have changed (for cache invalidation)
  get constellationHash(): string;
};

const constellationEvaluationKey = Symbol("constellation-evaluation");

export function provideConstellationEvaluation(
  constellationsHelper?: ConstellationsHelper,
  statusHelper?: StatusHelper,
  statsHelper?: StatsHelper,
  lang = "en",
): ConstellationEvaluationAPI {
  const constellationEquippedApi = useConstellationEquipped();
  const statusEvaluationApi = useStatusEvaluation();
  const tracker = new ContributionTracker();

  // Store broadcasts collected during the last getConstellationMods call
  let lastCollectedBroadcasts: BroadcastContribution[] = [];

  /**
   * Build tracked state with consumer_ids for all contributions
   */
  function buildTrackedState(): TrackedState {
    const state: TrackedState = { mods: {}, flags: {}, broadcasts: [] };
    const broadcasts: TrackedBroadcastContribution[] = [];

    if (!constellationsHelper) {
      lastCollectedBroadcasts = [];
      return state;
    }

    let affixCounter = 0; // Global counter for unique IDs within skill behavior affixes

    for (const [
      _key,
      allocated,
    ] of constellationEquippedApi.allocatedNodes.entries()) {
      if (allocated.level === 0) continue;

      const node = constellationsHelper.getNodeById(
        allocated.constellationId,
        allocated.nodeId,
      );
      if (!node) continue;

      const constellation = constellationsHelper.getConstellationById(
        allocated.constellationId,
      );
      if (!constellation) continue;

      const constellationName = translate(constellation.nameKey, lang);
      const nodeName = translate(node.nameLocalizationKey, lang);

      // Process each affix in the node
      for (let affixIndex = 0; affixIndex < node.affixes.length; affixIndex++) {
        const affix = node.affixes[affixIndex];
        if (affix.type === "StatModifierNodeAffixDefinition") {
          const statAffix = affix as StatModifierNodeAffixDefinition;

          // Map the stat to the format expected by the engine
          const statKey = normalizeStatName(statAffix.eStatDefinition);

          if (!(statKey in state.mods)) {
            state.mods[statKey] = [];
          }

          // Calculate the effective value
          const effectiveValue = getValueFromMultiplier(
            statAffix.value,
            statAffix.statModifierType,
            1,
            1,
            1,
          );

          // Determine layer based on modifier type
          const layer = getLayerFromModifierType(statAffix.statModifierType);

          // Generate description from stat value and label
          let affixDescription = "";
          if (statsHelper) {
            const statDef = statsHelper.getStatByName(
              statAffix.eStatDefinition,
            );
            if (statDef) {
              const formattedValue = formatStatModNumber(
                statAffix.value,
                statDef.eStatFormat,
                statAffix.statModifierType || "Additive",
                1,
                0,
                1,
              );
              const statLabel = statsHelper.getLabelForStat(
                statAffix.eStatDefinition,
                lang,
              );
              affixDescription = `${formattedValue} ${statLabel}`;
            }
          }

          // Consumer ID pattern: const:{constId}:{nodeId}:{affixIndex}
          const consumerId = `const:${allocated.constellationId}:${allocated.nodeId}:${affixIndex}`;

          state.mods[statKey].push({
            consumer_id: consumerId,
            source: `${constellationName} - ${nodeName}${allocated.level > 1 ? ` (x${allocated.level})` : ""}${affixDescription ? `: ${affixDescription}` : ""}`,
            amount: effectiveValue * allocated.level,
            layer: layer,
            meta: {
              type: "constellation",
              constellationId: String(allocated.constellationId),
              nodeId: allocated.nodeId,
              level: String(allocated.level),
              value: String(statAffix.value),
            },
          });
        } else if (affix.type === "SkillBehaviorNodeAffixDefinition") {
          affixCounter = processSkillBehaviorAffixTracked(
            affix as SkillBehaviorNodeAffixDefinition,
            constellationName,
            nodeName,
            allocated.constellationId,
            allocated.nodeId,
            allocated.level,
            affixIndex,
            state,
            broadcasts,
            affixCounter,
          );
        } else if (affix.type === "StatProxyModifierNodeAffixDefinition") {
          // Process proxy flags
          const proxyAffix = affix as StatProxyModifierNodeAffixDefinition;
          const flagKey = createProxyFlagName(
            proxyAffix.sourceStat,
            proxyAffix.targetStat,
          );

          // Generate description from stat labels
          let affixDescription = "";
          if (statsHelper) {
            const sourceLabel = statsHelper.getLabelForStat(
              proxyAffix.sourceStat,
              lang,
            );
            const targetLabel = statsHelper.getLabelForStat(
              proxyAffix.targetStat,
              lang,
            );
            affixDescription = `${sourceLabel} → ${targetLabel}`;
          }

          if (!(flagKey in state.flags)) {
            state.flags[flagKey] = [];
          }

          // Consumer ID pattern: const:{constId}:{nodeId}:flag:{affixIndex}
          const flagConsumerId = `const:${allocated.constellationId}:${allocated.nodeId}:flag:${affixIndex}`;

          state.flags[flagKey].push({
            consumer_id: flagConsumerId,
            source: `${constellationName} - ${nodeName}${allocated.level > 1 ? ` (x${allocated.level})` : ""}${affixDescription ? `: ${affixDescription}` : ""}`,
            enabled: true,
            meta: {
              type: "constellation",
              constellationId: String(allocated.constellationId),
              nodeId: allocated.nodeId,
              level: String(allocated.level),
            },
          });
        }
      }
    }

    // Add devotion point stats
    const devotionStatMap: Record<string, string> = {
      Red: "FuryPoints",
      Green: "DisciplinePoints",
      Blue: "FaithPoints",
    };

    for (const [category, statName] of Object.entries(devotionStatMap)) {
      const points =
        constellationEquippedApi.getCurrentDevotionCategoryPoints(category);

      // Consumer ID pattern: const:devotion:{category}
      const consumerId = `const:devotion:${category}`;

      state.mods[statName] = [
        {
          consumer_id: consumerId,
          source: `Devotion (${statName})`,
          amount: points,
          layer: "simple",
          meta: {
            type: "constellation",
            constellationId: "devotion",
            nodeId: category,
            level: "1",
            value: String(points),
          },
        },
      ];
    }

    // Store broadcasts
    state.broadcasts = broadcasts;
    lastCollectedBroadcasts = broadcasts;

    return state;
  }

  /**
   * Process skill behavior affix and add to tracked state with consumer_ids
   */
  function processSkillBehaviorAffixTracked(
    affix: SkillBehaviorNodeAffixDefinition,
    constellationName: string,
    nodeName: string,
    constellationId: number,
    nodeId: string,
    nodeLevel: number,
    affixIndex: number,
    state: TrackedState,
    broadcasts: TrackedBroadcastContribution[],
    effectCounter: number,
  ): number {
    if (!affix.behaviorData) {
      console.warn(
        `Affix behavior data missing for ${constellationName} - ${nodeName} - ${nodeId}`,
      );
      return effectCounter;
    }

    const affixValue = affix.valuePerLevel * nodeLevel;

    const context: ConstellationConverterContext = {
      system: "constellation",
      sourceName: `${constellationName} - ${nodeName}`,
      sourceType: "node",
      constellationId: String(constellationId),
      nodeId,
      nodeLevel,
      affixId: 0,
      affixValue,
      variables: affix.behaviorData.variables?.variables || [],
      rollVariableName: "Roll",
      skillName: affix.behaviorData.skillDefinition.name || "",
      behaviorData: {
        affectMultipleSkills: affix.behaviorData.affectMultipleSkills || false,
        useListOfSkills: String(affix.behaviorData.useListOfSkills || ""),
        listOfSkills: affix.behaviorData.listOfSkills || [],
        skillTagFilter: affix.behaviorData.skillTagFilter || "",
      },
    };

    for (const effect of affix.behaviorData.effects || []) {
      const conversionResult = effectConverterRegistry.convert(
        effect as any,
        context,
      );
      if (conversionResult) {
        // Collect mods with consumer_ids
        for (let modIdx = 0; modIdx < conversionResult.mods.length; modIdx++) {
          const { statName, modSource } = conversionResult.mods[modIdx];
          if (!(statName in state.mods)) {
            state.mods[statName] = [];
          }
          // Consumer ID pattern: const:{constId}:{nodeId}:effect:{effectCounter}:{modIdx}
          const consumerId = `const:${constellationId}:${nodeId}:effect:${effectCounter}:${modIdx}`;
          state.mods[statName].push({
            ...modSource,
            consumer_id: consumerId,
          } as any);
        }
        // Collect broadcasts with consumer_ids
        if (conversionResult.broadcasts) {
          for (let bcIdx = 0; bcIdx < conversionResult.broadcasts.length; bcIdx++) {
            const broadcast = conversionResult.broadcasts[bcIdx];
            // Consumer ID pattern: bc:const:{constId}:{nodeId}:{effectCounter}:{bcIdx}
            const bcConsumerId = `bc:const:${constellationId}:${nodeId}:${effectCounter}:${bcIdx}`;
            broadcasts.push({
              ...broadcast,
              consumer_id: bcConsumerId,
            });
          }
        }
      }
      effectCounter++;
    }
    return effectCounter;
  }

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

    const flags: EvaluationContribution["flags"] = {};
    for (const [flagName, sources] of Object.entries(state.flags)) {
      flags[flagName] = sources.map((s) => ({
        consumer_id: s.consumer_id,
        source: s.source,
        enabled: s.enabled,
        meta: { ...s.meta },
      }));
    }

    return { mods, flags, broadcasts: lastCollectedBroadcasts };
  }

  // Sync status effects from constellation nodes to StatusEvaluation
  function syncConstellationStatusEffects(): void {
    if (!statusHelper || !constellationsHelper || !statusEvaluationApi) return;

    console.debug("Syncing constellation status effects...");
    // Clear all constellation-sourced statuses first
    statusEvaluationApi.clearBySource("constellation:");

    // Process each allocated constellation node
    for (const [
      _key,
      allocated,
    ] of constellationEquippedApi.allocatedNodes.entries()) {
      if (allocated.level === 0) continue;

      const node = constellationsHelper.getNodeById(
        allocated.constellationId,
        allocated.nodeId,
      );
      if (!node) continue;

      const constellation = constellationsHelper.getConstellationById(
        allocated.constellationId,
      );
      if (!constellation) continue;

      const constellationName = translate(constellation.nameKey, lang);
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
            // Register the status with StatusEvaluation
            // Duration is specified in the affix, default intensity and stacks
            statusEvaluationApi.addStatus({
              statusId: statusDef.id,
              source: `constellation:${constellationName} - ${nodeName}`,
              intensity: 1, // Constellations typically use base intensity
              stacks: 1, // Constellations typically grant single stack
              duration: statusAffix.duration,
              meta: {
                constellationId: allocated.constellationId,
                nodeId: allocated.nodeId,
                level: allocated.level,
                constellationName,
                nodeName,
              },
            });
          }
        }
      }
    }
  }

  // Use $effect to sync status effects when constellation allocation changes
  $effect(() => {
    // Explicitly track map size to ensure effect re-runs on any change
    const _nodeCount = constellationEquippedApi.allocatedNodes.size;
    syncConstellationStatusEffects();
  });

  const api: ConstellationEvaluationAPI = {
    getContribution,
    getDelta,
    resetTracker,

    get constellationHash() {
      // Create a hash of allocated constellation nodes for cache invalidation
      const allocated = Array.from(
        constellationEquippedApi.allocatedNodes.entries(),
      );
      return allocated
        .map(([key, value]) => `${key}:${value.level}`)
        .sort()
        .join("|");
    },
  };

  setContext(constellationEvaluationKey, api);
  return api;
}

export function useConstellationEvaluation(): ConstellationEvaluationAPI {
  const ctx = getContext<ConstellationEvaluationAPI>(
    constellationEvaluationKey,
  );
  if (!ctx) {
    throw new Error(
      "ConstellationEvaluation context not found. Did you call provideConstellationEvaluation() in +layout.svelte?",
    );
  }
  return ctx;
}

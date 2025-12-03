import type {
  ConstellationsHelper,
  StatModifierNodeAffixDefinition,
  StatusNodeAffixDefinition,
  StatProxyModifierNodeAffixDefinition,
  SkillBehaviorNodeAffixDefinition,
} from "$lib/hellclock/constellations";
import type { StatsHelper } from "$lib/hellclock/stats";
import type { StatusHelper } from "$lib/hellclock/status";
import type { EvaluationContribution } from "$lib/context/evaluation-types";
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
  // Get unified contribution for evaluation
  getContribution: () => EvaluationContribution;

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

  // Store broadcasts collected during the last getConstellationMods call
  let lastCollectedBroadcasts: BroadcastContribution[] = [];

  function getConstellationMods(): ConstellationModCollection {
    const mods: ConstellationModCollection = {};
    const broadcasts: BroadcastContribution[] = [];

    if (!constellationsHelper) {
      lastCollectedBroadcasts = [];
      return mods;
    }

    for (const [
      key,
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
        if (affix.type === "StatModifierNodeAffixDefinition") {
          const statAffix = affix as StatModifierNodeAffixDefinition;

          // Map the stat to the format expected by the engine
          const statKey = normalizeStatName(statAffix.eStatDefinition);

          if (!(statKey in mods)) {
            mods[statKey] = [];
          }

          // Calculate the effective value
          // Some nodes may have their values multiplied by level
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

          mods[statKey].push({
            source: `${constellationName} - ${nodeName}${allocated.level > 1 ? ` (x${allocated.level})` : ""}${affixDescription ? `: ${affixDescription}` : ""}`,
            amount: effectiveValue * allocated.level, // Multiply by level if multi-level nodes
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
          processSkillBehaviorAffix(
            affix as SkillBehaviorNodeAffixDefinition,
            constellationName,
            nodeName,
            allocated.constellationId,
            allocated.nodeId,
            allocated.level,
            mods,
            broadcasts,
          );
        }
        // TODO: Handle other affix types:
        // - UnlockSkillNodeAffixDefinition
        // - SkillModifierNodeAffixDefinition
        // - AttributeNodeAffixDefinition
      }
    }

    // Add devotion point stats
    // Map category colors to stat names
    const devotionStatMap: Record<string, string> = {
      Red: "FuryPoints",
      Green: "DisciplinePoints",
      Blue: "FaithPoints",
    };

    for (const [category, statName] of Object.entries(devotionStatMap)) {
      const points =
        constellationEquippedApi.getCurrentDevotionCategoryPoints(category);
      if (points > 0) {
        mods[statName] = [
          {
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
    }

    // Store broadcasts for getConstellationBroadcasts
    lastCollectedBroadcasts = broadcasts;

    return mods;
  }

  function getContribution(): EvaluationContribution {
    const constellationMods = getConstellationMods();
    const constellationFlags = getConstellationFlags();

    // Convert mods to unified type
    const mods: EvaluationContribution["mods"] = {};
    for (const [statName, sources] of Object.entries(constellationMods)) {
      mods[statName] = sources.map((s) => ({
        source: s.source,
        amount: s.amount,
        layer: s.layer,
        meta: { ...s.meta },
      }));
    }

    // Convert flags to unified type
    const flags: EvaluationContribution["flags"] = {};
    for (const [flagName, sources] of Object.entries(constellationFlags)) {
      flags[flagName] = sources.map((s) => ({
        source: s.source,
        enabled: s.enabled,
        meta: { ...s.meta },
      }));
    }

    return { mods, flags, broadcasts: lastCollectedBroadcasts };
  }

  function processSkillBehaviorAffix(
    affix: SkillBehaviorNodeAffixDefinition,
    constellationName: string,
    nodeName: string,
    constellationId: number,
    nodeId: string,
    nodeLevel: number,
    mods: ConstellationModCollection,
    broadcasts: BroadcastContribution[],
  ): void {
    // Calculate value based on level
    const affixValue = affix.valuePerLevel * nodeLevel;

    const context: ConstellationConverterContext = {
      system: "constellation",
      sourceName: `${constellationName} - ${nodeName}`,
      sourceType: "node",
      constellationId: String(constellationId),
      nodeId,
      nodeLevel,
      affixId: 0, // Constellation affixes don't have IDs like relics
      affixValue,
      variables: affix.behaviorData.variables?.variables || [],
      rollVariableName: "", // Constellations don't have roll variables
      skillName: affix.behaviorData.skillDefinition.name || "",
      // Add behavior data for multi-skill targeting
      behaviorData: {
        affectMultipleSkills: affix.behaviorData.affectMultipleSkills || false,
        useListOfSkills: String(affix.behaviorData.useListOfSkills || ""),
        listOfSkills: affix.behaviorData.listOfSkills || [],
        skillTagFilter: affix.behaviorData.skillTagFilter || "",
      },
    };

    for (const effect of affix.behaviorData.effects || []) {
      // Cast to SkillEffect since constellation and relic effect types are structurally compatible
      const conversionResult = effectConverterRegistry.convert(
        effect as any,
        context,
      );
      if (conversionResult) {
        // Collect mods
        for (const { statName, modSource } of conversionResult.mods) {
          if (!(statName in mods)) {
            mods[statName] = [];
          }
          mods[statName].push(modSource as ConstellationModSource);
        }
        // Collect broadcasts
        if (conversionResult.broadcasts) {
          for (const broadcast of conversionResult.broadcasts) {
            broadcasts.push(broadcast);
          }
        }
      }
    }
  }

  function getConstellationFlags(): ConstellationFlagCollection {
    const flags: ConstellationFlagCollection = {};

    if (!constellationsHelper) {
      return flags;
    }

    for (const [
      key,
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

      for (const affix of node.affixes) {
        if (affix.type === "StatProxyModifierNodeAffixDefinition") {
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

          if (!(flagKey in flags)) {
            flags[flagKey] = [];
          }

          flags[flagKey].push({
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

    return flags;
  }

  // Sync status effects from constellation nodes to StatusEvaluation
  function syncConstellationStatusEffects(): void {
    if (!statusHelper || !constellationsHelper || !statusEvaluationApi) return;

    console.debug("Syncing constellation status effects...");
    // Clear all constellation-sourced statuses first
    statusEvaluationApi.clearBySource("constellation:");

    // Process each allocated constellation node
    for (const [
      key,
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

import type {
  ConstellationsHelper,
  StatModifierNodeAffixDefinition,
  StatusNodeAffixDefinition,
  StatProxyModifierNodeAffixDefinition,
} from "$lib/hellclock/constellations";
import type { StatsHelper } from "$lib/hellclock/stats";
import type {
  SkillBehaviorStatusDefinition,
  StatusHelper,
} from "$lib/hellclock/status";
import { getValueFromMultiplier, formatStatModNumber } from "$lib/hellclock/formats";
import { translate } from "$lib/hellclock/lang";
import { getContext, setContext } from "svelte";
import { useConstellationEquipped } from "$lib/context/constellationequipped.svelte";
import { useStatusEvaluation } from "$lib/context/statusevaluation.svelte";

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
  // Get current constellation modifications for evaluation
  getConstellationMods: () => ConstellationModCollection;

  // Get current constellation flags for evaluation
  getConstellationFlags: () => ConstellationFlagCollection;

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

  function mapStatModifierForEval(
    statName: string,
    modifierType: string,
  ): string {
    // Normalize stat name
    let normalizedStatName = statName.replaceAll(" ", "");

    // Map modifier type to suffix
    let suffix = "";
    const lowerModifierType = modifierType.toLowerCase();
    if (lowerModifierType === "additive") {
      suffix = ".add";
    } else if (lowerModifierType === "multiplicative") {
      suffix = ".mult";
    } else if (lowerModifierType === "multiplicativeadditive") {
      suffix = ".multadd";
    }

    return normalizedStatName + suffix;
  }

  /**
   * Create proxy flag name from source/target stats
   * Removes "Damage" word from stat names
   * Example: "PhysicalDamage" + "PlagueDamage" → "ProxyPhysicalToPlague"
   */
  function createProxyFlagName(sourceStat: string, targetStat: string): string {
    const cleanSource = sourceStat.replace("Damage", "");
    const cleanTarget = targetStat.replace("Damage", "");
    return `Proxy${cleanSource}To${cleanTarget}`;
  }

  function getConstellationMods(): ConstellationModCollection {
    const mods: ConstellationModCollection = {};

    if (!constellationsHelper) {
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
          const statKey = statAffix.eStatDefinition.replaceAll(" ", "");

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
          let layer = "base";
          const lowerModifierType = statAffix.statModifierType.toLowerCase();
          if (lowerModifierType === "additive") {
            layer = "add";
          } else if (lowerModifierType === "multiplicative") {
            layer = "mult";
          } else if (lowerModifierType === "multiplicativeadditive") {
            layer = "multadd";
          }

          // Generate description from stat value and label
          let affixDescription = "";
          if (statsHelper) {
            const statDef = statsHelper.getStatByName(statAffix.eStatDefinition);
            if (statDef) {
              const formattedValue = formatStatModNumber(
                statAffix.value,
                statDef.eStatFormat,
                statAffix.statModifierType || "Additive",
                1,
                0,
                1,
              );
              const statLabel = statsHelper.getLabelForStat(statAffix.eStatDefinition, lang);
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
      "Red": "FuryPoints",
      "Green": "DisciplinePoints",
      "Blue": "FaithPoints",
    };

    for (const [category, statName] of Object.entries(devotionStatMap)) {
      const points = constellationEquippedApi.getCurrentDevotionCategoryPoints(category);
      if (points > 0) {
        mods[statName] = [{
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
        }];
      }
    }

    return mods;
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
            const sourceLabel = statsHelper.getLabelForStat(proxyAffix.sourceStat, lang);
            const targetLabel = statsHelper.getLabelForStat(proxyAffix.targetStat, lang);
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
    getConstellationMods,
    getConstellationFlags,

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

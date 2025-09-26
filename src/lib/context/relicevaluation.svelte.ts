import type { RelicAffix, RelicsHelper } from "$lib/hellclock/relics";
import type { RelicItemWithPosition } from "$lib/context/relicequipped.svelte";
import type { StatsHelper } from "$lib/hellclock/stats";
import { getValueFromMultiplier } from "$lib/hellclock/formats";
import { fmtValue } from "$lib/hellclock/utils";
import { getContext, setContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import { useRelicInventory } from "$lib/context/relicequipped.svelte";

export type RelicModSource = {
  source: string;
  amount: number;
  layer: string;
  meta: {
    type: string;
    id: string;
    position: string;
    affixType: string;
    value: string;
  };
};

export type RelicModCollection = Record<string, RelicModSource[]>;

export type RelicEvaluationAPI = {
  // Get current relic modifications for evaluation
  getRelicMods: () => RelicModCollection;

  // Check if relics have changed (for cache invalidation)
  get relicHash(): string;
};

const relicEvaluationKey = Symbol("relic-evaluation");

export function provideRelicEvaluation(
  relicsHelper?: RelicsHelper,
  statsHelper?: StatsHelper,
  lang = "en",
): RelicEvaluationAPI {
  const relicInventoryApi = useRelicInventory();

  function mapModForEval(affix: RelicAffix): string {
    if (affix.type !== "StatModifierAffixDefinition" || !affix.eStatDefinition) {
      return "";
    }

    let statName = affix.eStatDefinition;
    const modifierType = affix.statModifierType?.toLowerCase() || "additive";

    if (modifierType === "additive") {
      statName = `${statName}.add`;
    } else if (modifierType === "multiplicative") {
      statName = `${statName}.mult`;
    } else if (modifierType === "multiplicativeadditive") {
      statName = `${statName}.multadd`;
    }

    return statName;
  }

  function getRelicMods(): RelicModCollection {
    const mods: RelicModCollection = {};

    // Get all unique relics from the inventory
    const uniqueRelics = new SvelteMap<string, RelicItemWithPosition>();
    for (const [, relic] of relicInventoryApi.relics) {
      // Use relic ID + position as unique key to avoid duplicates
      const key = `${relic.id}_${relic.position.x}_${relic.position.y}`;
      if (!uniqueRelics.has(key)) {
        uniqueRelics.set(key, relic);
      }
    }

    for (const relic of uniqueRelics.values()) {
      const relicName = relic.name;
      const positionKey = `${relic.position.x},${relic.position.y}`;

      // Process primary affixes
      if (relic.selectedPrimaryAffixes) {
        for (const affix of relic.selectedPrimaryAffixes) {
          if (affix.type === "StatModifierAffixDefinition") {
            processAffix(
              affix,
              relic.primaryAffixValues?.[affix.id] || 0,
              relicName,
              positionKey,
              "primary",
              mods
            );
          }
        }
      }

      // Process secondary affixes
      if (relic.selectedSecondaryAffixes) {
        for (const affix of relic.selectedSecondaryAffixes) {
          if (affix.type === "StatModifierAffixDefinition") {
            processAffix(
              affix,
              relic.secondaryAffixValues?.[affix.id] || 0,
              relicName,
              positionKey,
              "secondary",
              mods
            );
          }
        }
      }

      // Process devotion affix
      if (relic.selectedDevotionAffix && relic.selectedDevotionAffix.type === "StatModifierAffixDefinition") {
        processAffix(
          relic.selectedDevotionAffix,
          relic.implicitAffixValues?.[relic.selectedDevotionAffix.id] || 0,
          relicName,
          positionKey,
          "devotion",
          mods
        );
      }

      // Process corruption affix
      if (relic.selectedCorruptionAffix && relic.selectedCorruptionAffix.type === "StatModifierAffixDefinition") {
        processAffix(
          relic.selectedCorruptionAffix,
          relic.implicitAffixValues?.[relic.selectedCorruptionAffix.id] || 0,
          relicName,
          positionKey,
          "corrupted",
          mods
        );
      }
    }

    return mods;
  }

  function processAffix(
    affix: RelicAffix,
    value: number,
    relicName: string,
    positionKey: string,
    affixType: string,
    mods: RelicModCollection
  ): void {
    const statInfo = mapModForEval(affix);
    if (!statInfo) return;

    const [statName, layer] = statInfo.split(".");

    if (!(statName in mods)) {
      mods[statName] = [];
    }

    // Create a mock mod object for fmtValue compatibility
    const mockMod = {
      type: "StatModifierDefinition" as const,
      eStatDefinition: affix.eStatDefinition!,
      modifierType: affix.statModifierType!,
      value: value,
      selectedValue: value,
    };

    mods[statName].push({
      source: `${relicName} (${affixType})`,
      amount: getValueFromMultiplier(
        value,
        affix.statModifierType!,
        value,
        1,
        1,
      ),
      layer: layer || "base",
      meta: {
        type: "relic",
        id: String(affix.id),
        position: positionKey,
        affixType: affixType,
        value: fmtValue(
          mockMod,
          lang,
          statsHelper!,
          1,
          1,
        ),
      },
    });
  }

  const api: RelicEvaluationAPI = {
    getRelicMods,

    get relicHash() {
      // Create a hash of equipped relics for cache invalidation
      const relicEntries = [];

      // Get unique relics to avoid duplicates from multi-slot relics
      const uniqueRelics = new SvelteMap<string, RelicItemWithPosition>();
      for (const [, relic] of relicInventoryApi.relics) {
        const key = `${relic.id}_${relic.position.x}_${relic.position.y}`;
        if (!uniqueRelics.has(key)) {
          uniqueRelics.set(key, relic);
        }
      }

      for (const relic of uniqueRelics.values()) {
        let affixHash = "";

        // Hash primary affixes
        if (relic.selectedPrimaryAffixes) {
          affixHash += relic.selectedPrimaryAffixes
            .map((a: RelicAffix) => `p${a.id}:${relic.primaryAffixValues?.[a.id] || 0}`)
            .join(",");
        }

        // Hash secondary affixes
        if (relic.selectedSecondaryAffixes) {
          affixHash += relic.selectedSecondaryAffixes
            .map((a: RelicAffix) => `s${a.id}:${relic.secondaryAffixValues?.[a.id] || 0}`)
            .join(",");
        }

        // Hash devotion affix
        if (relic.selectedDevotionAffix) {
          affixHash += `d${relic.selectedDevotionAffix.id}:${relic.implicitAffixValues?.[relic.selectedDevotionAffix.id] || 0}`;
        }

        // Hash corruption affix
        if (relic.selectedCorruptionAffix) {
          affixHash += `c${relic.selectedCorruptionAffix.id}:${relic.implicitAffixValues?.[relic.selectedCorruptionAffix.id] || 0}`;
        }

        relicEntries.push(`${relic.position.x},${relic.position.y}:${relic.id}:${affixHash}`);
      }

      return relicEntries.sort().join("|");
    },
  };

  setContext(relicEvaluationKey, api);
  return api;
}

export function useRelicEvaluation(): RelicEvaluationAPI {
  const ctx = getContext<RelicEvaluationAPI>(relicEvaluationKey);
  if (!ctx) {
    throw new Error(
      "RelicEvaluation context not found. Did you call provideRelicEvaluation() in +layout.svelte?",
    );
  }
  return ctx;
}

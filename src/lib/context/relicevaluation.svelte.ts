import type {
  AddSkillValueModifierSkillEffectData,
  AddStatusToTargetSkillEffectData,
  RelicAffix,
  RelicsHelper,
} from "$lib/hellclock/relics";
import type { RelicItemWithPosition } from "$lib/context/relicequipped.svelte";
import type { StatsHelper } from "$lib/hellclock/stats";
import type { StatusHelper } from "$lib/hellclock/status";
import {
  getValueFromMultiplier,
  normalizedValueFromRange,
} from "$lib/hellclock/formats";
import { fmtValue } from "$lib/hellclock/utils";
import { getContext, setContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import { useRelicInventory } from "$lib/context/relicequipped.svelte";
import { useStatusEvaluation } from "$lib/context/statusevaluation.svelte";

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
  statusHelper?: StatusHelper,
  lang = "en",
): RelicEvaluationAPI {
  const relicInventoryApi = useRelicInventory();
  const statusEvaluationApi = useStatusEvaluation();

  function mapModForEval(affix: RelicAffix): string {
    if (
      affix.type !== "StatModifierAffixDefinition" ||
      !affix.eStatDefinition
    ) {
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
          processAffix(
            affix,
            relic.primaryAffixValues?.[affix.id] || 0,
            relicName,
            positionKey,
            "primary",
            relic.tier,
            relic.rank,
            relicsHelper!,
            mods,
          );
        }
      }

      // Process secondary affixes
      if (relic.selectedSecondaryAffixes) {
        for (const affix of relic.selectedSecondaryAffixes) {
          processAffix(
            affix,
            relic.secondaryAffixValues?.[affix.id] || 0,
            relicName,
            positionKey,
            "secondary",
            relic.tier,
            relic.rank,
            relicsHelper!,
            mods,
          );
        }
      }

      // Process devotion affix
      if (relic.selectedDevotionAffix) {
        processAffix(
          relic.selectedDevotionAffix,
          relic.implicitAffixValues?.[relic.selectedDevotionAffix.id] || 0,
          relicName,
          positionKey,
          "devotion",
          relic.tier,
          relic.rank,
          relicsHelper!,
          mods,
        );
      }

      // Process corruption affix
      if (relic.selectedCorruptionAffix) {
        processAffix(
          relic.selectedCorruptionAffix,
          relic.implicitAffixValues?.[relic.selectedCorruptionAffix.id] || 0,
          relicName,
          positionKey,
          "corrupted",
          relic.tier,
          relic.rank,
          relicsHelper!,
          mods,
        );
      }

      // Process special affix
      if (relic.selectedSpecialAffix) {
        processAffix(
          relic.selectedSpecialAffix,
          relic.specialAffixValues?.[relic.selectedSpecialAffix.id] || 0,
          relicName,
          positionKey,
          "Special",
          relic.tier,
          relic.rank,
          relicsHelper!,
          mods,
        );
      }
    }

    return mods;
  }

  function processAffix(
    affix: RelicAffix,
    valueNormalized: number,
    relicName: string,
    positionKey: string,
    affixType: string,
    tier: number,
    rank: number,
    relicHelper: RelicsHelper,
    mods: RelicModCollection,
  ): void {
    let range = relicHelper.getAffixValueRange(affix.id, tier, rank);
    let value = normalizedValueFromRange(
      valueNormalized,
      0,
      1,
      range[0],
      range[1],
    );

    if (affix.type === "StatModifierAffixDefinition") {
      processStatModifierAffix(
        affix,
        value,
        relicName,
        positionKey,
        affixType,
        mods,
      );
    } else if (affix.type === "SkillBehaviorAffixDefinition") {
      processSkillBehaviorAffix(
        affix,
        value,
        relicName,
        positionKey,
        affixType,
        mods,
      );
    }
  }

  function processSkillBehaviorAffix(
    affix: RelicAffix,
    value: number,
    relicName: string,
    positionKey: string,
    affixType: string,
    mods: RelicModCollection,
  ): void {
    // For now only support for SkillDefinition behavior affixes
    if (affix.behaviorData?.skillDefinition?.name) {
      for (const effect of affix.behaviorData.effects?.filter(
        (e) =>
          e.type === "AddSkillValueModifierSkillEffectData" &&
          e.effectTrigger === "Always",
      ) ?? []) {
        const addEffect = effect as AddSkillValueModifierSkillEffectData;
        for (const modifier of addEffect.modifiers) {
          const skillValueModifierName =
            modifier.skillValueModifierKey.replaceAll(" ", "");

          if (skillValueModifierName.includes("!Status")) {
            continue;
          }
          let layer = "add";
          const modifierType = modifier.modifierType.toLowerCase();
          if (modifierType === "multiplicative") {
            layer = "mult";
          } else if (modifierType === "multiplicativeadditive") {
            layer = "multadd";
          }
          const statName = `skill_${affix.behaviorData.skillDefinition.name}_${skillValueModifierName}`.replaceAll(" ","");

          if (!(statName in mods)) {
            mods[statName] = [];
          }

          let valueToUse = value;

          if (affix.rollVariableName !== modifier.value.valueOrName) {
            // Search for variable if exists and get the baseValue
            const varValue = affix.behaviorData.variables.variables.find(
              (v) => v.name === modifier.value.valueOrName,
            );

            if (varValue) {
              valueToUse = varValue.baseValue;
            } else {
              valueToUse = Number(modifier.value.valueOrName) || 0;
            }
          }
          mods[statName].push({
            source: `${relicName} (${affixType})`,
            amount: getValueFromMultiplier(
              valueToUse,
              modifier.modifierType,
              1,
              1,
              1,
            ),
            layer: layer || "base",
            meta: {
              type: "relic",
              id: String(affix.id),
              position: positionKey,
              affixType: affixType,
              value: String(valueToUse),
            },
          });
        }
      }
    }
  }

  // Sync status effects from relics to StatusEvaluation
  function syncRelicStatusEffects(): void {
    if (!statusHelper || !statusEvaluationApi) return;

    // Clear all relic-sourced statuses first
    statusEvaluationApi.clearBySource("relic:");

    // Get all unique relics from the inventory
    const uniqueRelics = new SvelteMap<string, RelicItemWithPosition>();
    for (const [, relic] of relicInventoryApi.relics) {
      const key = `${relic.id}_${relic.position.x}_${relic.position.y}`;
      if (!uniqueRelics.has(key)) {
        uniqueRelics.set(key, relic);
      }
    }

    // Process each relic's affixes for status effects
    for (const relic of uniqueRelics.values()) {
      const relicName = relic.name;
      const allAffixes = [
        ...(relic.selectedPrimaryAffixes || []),
        ...(relic.selectedSecondaryAffixes || []),
        ...(relic.selectedDevotionAffix ? [relic.selectedDevotionAffix] : []),
        ...(relic.selectedCorruptionAffix ? [relic.selectedCorruptionAffix] : []),
        ...(relic.selectedSpecialAffix ? [relic.selectedSpecialAffix] : []),
      ];

      for (const affix of allAffixes) {
        if (affix.type === "SkillBehaviorAffixDefinition" && affix.behaviorData?.effects) {
          for (const effect of affix.behaviorData.effects.filter(
            (e: any) =>
              e.type === "AddStatusToTargetSkillEffectData" &&
              e.effectTrigger === "Always",
          )) {
            const statusEffect = effect as AddStatusToTargetSkillEffectData;

            // Get status reference from the effect
            const statusDef = statusHelper.getStatusFromReference(
              statusEffect.statusDefinition,
            );

            if (statusDef) {
              // Extract intensity and stacks from variables
              const intensity = Number(
                statusEffect.statusIntensity?.valueOrName || 1,
              );
              const stacks = Number(statusEffect.stackAmount?.valueOrName || 1);

              // Register the status with StatusEvaluation
              statusEvaluationApi.addStatus({
                statusId: statusDef.id,
                source: `relic:${relicName}`,
                intensity,
                stacks,
                meta: {
                  relicId: relic.id,
                  relicName: relicName,
                  affixId: affix.id,
                  affixName: affix.name,
                },
              });
            }
          }
        }
      }
    }
  }

  // Use $effect to sync status effects when relics change
  $effect(() => {
    // Access reactive state to trigger effect
    relicInventoryApi.relics;
    syncRelicStatusEffects();
  });

  function processStatModifierAffix(
    affix: RelicAffix,
    value: number,
    relicName: string,
    positionKey: string,
    affixType: string,
    mods: RelicModCollection,
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
        value: fmtValue(mockMod, lang, statsHelper!, 1, 1),
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
            .map(
              (a: RelicAffix) =>
                `p${a.id}:${relic.primaryAffixValues?.[a.id] || 0}`,
            )
            .join(",");
        }

        // Hash secondary affixes
        if (relic.selectedSecondaryAffixes) {
          affixHash += relic.selectedSecondaryAffixes
            .map(
              (a: RelicAffix) =>
                `s${a.id}:${relic.secondaryAffixValues?.[a.id] || 0}`,
            )
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

        // Hash special affix
        if (relic.selectedSpecialAffix) {
          affixHash += `x${relic.selectedSpecialAffix.id}:${relic.specialAffixValues?.[relic.selectedSpecialAffix.id] || 0}`;
        }

        relicEntries.push(
          `${relic.position.x},${relic.position.y}:${relic.id}:${affixHash}`,
        );
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

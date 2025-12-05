import type {
  AddStatusToTargetSkillEffectData,
  RelicAffix,
  RelicsHelper,
} from "$lib/hellclock/relics";
import {
  effectConverterRegistry,
  type RelicConverterContext,
  type BroadcastContribution,
} from "$lib/context/affix-converters";
import type { EvaluationContribution } from "$lib/context/evaluation-types";
import type { RelicItemWithPosition } from "$lib/context/relicequipped.svelte";
import type { StatsHelper } from "$lib/hellclock/stats";
import type { StatusHelper } from "$lib/hellclock/status";
import { getValueFromMultiplier } from "$lib/hellclock/formats";
import { fmtValue } from "$lib/hellclock/utils";
import { getContext, setContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import { useRelicInventory } from "$lib/context/relicequipped.svelte";
import { useStatusEvaluation } from "$lib/context/statusevaluation.svelte";

export type RelicModSource = {
  source: string;
  amount: number;
  layer: string;
  calculation?: string;
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
  // Get unified contribution for evaluation
  getContribution: () => EvaluationContribution;

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

  // Store broadcasts collected during the last getRelicMods call
  let lastCollectedBroadcasts: BroadcastContribution[] = [];

  function getRelicMods(): RelicModCollection {
    const mods: RelicModCollection = {};
    const broadcasts: BroadcastContribution[] = [];

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
            broadcasts,
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
            broadcasts,
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
          broadcasts,
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
          broadcasts,
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
          broadcasts,
        );
      }
    }

    // Store broadcasts for getRelicBroadcasts
    lastCollectedBroadcasts = broadcasts;

    return mods;
  }

  function getContribution(): EvaluationContribution {
    const relicMods = getRelicMods();

    // Convert to unified type
    const mods: EvaluationContribution["mods"] = {};
    for (const [statName, sources] of Object.entries(relicMods)) {
      mods[statName] = sources.map((s) => ({
        source: s.source,
        amount: s.amount,
        layer: s.layer,
        calculation: s.calculation,
        meta: { ...s.meta },
      }));
    }

    return { mods, flags: {}, broadcasts: lastCollectedBroadcasts };
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
    broadcasts: BroadcastContribution[],
  ): void {
    debugger;
    const value = relicHelper.getAffixValueFromRoll(
      affix.id,
      valueNormalized,
      tier,
      rank,
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
        tier,
        rank,
        mods,
        broadcasts,
      );
    }
  }

  function processSkillBehaviorAffix(
    affix: RelicAffix,
    value: number,
    relicName: string,
    positionKey: string,
    affixType: string,
    tier: number,
    rank: number,
    mods: RelicModCollection,
    broadcasts: BroadcastContribution[],
  ): void {
    if (!affix.behaviorData) {
      console.warn(
        `Affix behavior data missing for affix ID ${affix.id} (${affix.name})`
      );
      return;
    }

    const context: RelicConverterContext = {
      system: "relic",
      sourceName: relicName,
      sourceType: affixType,
      positionKey,
      affixId: affix.id,
      tier,
      rank,
      affixValue: value,
      variables: affix.behaviorData.variables?.variables || [],
      rollVariableName: affix.rollVariableName || "",
      skillName: affix.behaviorData.skillDefinition.name,
      // Add behavior data for multi-skill targeting
      behaviorData: {
        affectMultipleSkills: affix.behaviorData.affectMultipleSkills || false,
        useListOfSkills: String(affix.behaviorData.useListOfSkills || ""),
        listOfSkills: affix.behaviorData.listOfSkills || [],
        skillTagFilter: affix.behaviorData.skillTagFilter || "",
      },
    };

    for (const effect of affix.behaviorData.effects || []) {
      const conversionResult = effectConverterRegistry.convert(effect, context);
      if (conversionResult) {
        // Collect mods
        for (const { statName, modSource } of conversionResult.mods) {
          if (!(statName in mods)) {
            mods[statName] = [];
          }
          // Cast to RelicModSource since we know we're in relic context
          mods[statName].push(modSource as RelicModSource);
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
        ...(relic.selectedCorruptionAffix
          ? [relic.selectedCorruptionAffix]
          : []),
        ...(relic.selectedSpecialAffix ? [relic.selectedSpecialAffix] : []),
      ];

      for (const affix of allAffixes) {
        if (
          affix.type === "SkillBehaviorAffixDefinition" &&
          affix.behaviorData?.effects
        ) {
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

    // handle additionalStatModifierDefinitions with applyRollToAdditionalStatModifiers
    if (affix.additionalStatModifierDefinitions?.length) {
      for (const addModDef of affix.additionalStatModifierDefinitions) {
        const statNameAddModDef = addModDef.eStatDefinition;
        const modifierType = addModDef.modifierType.toLowerCase() || "additive";
        let layerAddModDef = "add";
        if (modifierType === "additive") {
          layerAddModDef = `add`;
        } else if (modifierType === "multiplicative") {
          layerAddModDef = `mult`;
        } else if (modifierType === "multiplicativeadditive") {
          layerAddModDef = `multadd`;
        }

        if (!(statNameAddModDef in mods)) {
          mods[statNameAddModDef] = [];
        }

        const addModValue = affix.applyRollToAdditionalStatModifiers
          ? value
          : addModDef.value;

        const mockAddMod = {
          type: "StatModifierDefinition" as const,
          eStatDefinition: addModDef.eStatDefinition!,
          modifierType: addModDef.modifierType,
          value: addModValue,
          selectedValue: addModValue,
        };

        mods[statNameAddModDef].push({
          source: `${relicName} (${affixType})`,
          amount: getValueFromMultiplier(
            addModValue,
            addModDef.modifierType,
            addModValue,
            1,
            1,
          ),
          layer: layerAddModDef || "base",
          meta: {
            type: "relic",
            id: String(affix.id),
            position: positionKey,
            affixType: affixType,
            value: fmtValue(mockAddMod, lang, statsHelper!, 1, 1),
          },
        });
      }
    }
  }

  const api: RelicEvaluationAPI = {
    getContribution,

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

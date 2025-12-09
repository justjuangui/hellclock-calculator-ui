import type {
  AddStatusToTargetSkillEffectData,
  RelicAffix,
  RelicsHelper,
  StatModifierDefinition,
} from "$lib/hellclock/relics";
import {
  effectConverterRegistry,
  type RelicConverterContext,
  type BroadcastContribution,
} from "$lib/context/affix-converters";
import type { EvaluationContribution, ContributionDelta, TrackedBroadcastContribution } from "$lib/context/evaluation-types";
import type { RelicItemWithPosition } from "$lib/context/relicequipped.svelte";
import type { StatsHelper } from "$lib/hellclock/stats";
import type { StatusHelper } from "$lib/hellclock/status";
import { getValueFromMultiplier } from "$lib/hellclock/formats";
import { fmtValue } from "$lib/hellclock/utils";
import { getContext, setContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import { useRelicInventory } from "$lib/context/relicequipped.svelte";
import { useStatusEvaluation } from "$lib/context/statusevaluation.svelte";
import {
  ContributionTracker,
  type TrackedState,
} from "./contribution-tracker";

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
  // Get unified contribution for evaluation (legacy)
  getContribution: () => EvaluationContribution;

  // Get delta for incremental updates (new)
  getDelta: () => ContributionDelta;

  // Reset tracker state (for full rebuild)
  resetTracker: () => void;

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
  const tracker = new ContributionTracker();

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

  // Store broadcasts collected during the last buildTrackedState call
  let lastCollectedBroadcasts: BroadcastContribution[] = [];

  /**
   * Build tracked state with consumer_ids for all contributions
   */
  function buildTrackedState(): TrackedState {
    const state: TrackedState = { mods: {}, flags: {}, broadcasts: [] };
    const broadcasts: TrackedBroadcastContribution[] = [];

    // Get all unique relics from the inventory
    const uniqueRelics = new SvelteMap<string, RelicItemWithPosition>();
    for (const [, relic] of relicInventoryApi.relics) {
      const key = `${relic.id}_${relic.position.x}_${relic.position.y}`;
      if (!uniqueRelics.has(key)) {
        uniqueRelics.set(key, relic);
      }
    }

    let effectCounter = 0;

    for (const relic of uniqueRelics.values()) {
      const relicName = relic.name;
      const positionKey = `${relic.position.x},${relic.position.y}`;

      // Process primary affixes
      if (relic.selectedPrimaryAffixes) {
        for (let i = 0; i < relic.selectedPrimaryAffixes.length; i++) {
          const affix = relic.selectedPrimaryAffixes[i];
          effectCounter = processAffixTracked(
            affix,
            relic.primaryAffixValues?.[affix.id] || 0,
            relicName,
            positionKey,
            "primary",
            i,
            relic.tier,
            relic.rank,
            relicsHelper!,
            state,
            broadcasts,
            effectCounter,
          );
        }
      }

      // Process secondary affixes
      if (relic.selectedSecondaryAffixes) {
        for (let i = 0; i < relic.selectedSecondaryAffixes.length; i++) {
          const affix = relic.selectedSecondaryAffixes[i];
          effectCounter = processAffixTracked(
            affix,
            relic.secondaryAffixValues?.[affix.id] || 0,
            relicName,
            positionKey,
            "secondary",
            i,
            relic.tier,
            relic.rank,
            relicsHelper!,
            state,
            broadcasts,
            effectCounter,
          );
        }
      }

      // Process devotion affix
      if (relic.selectedDevotionAffix) {
        effectCounter = processAffixTracked(
          relic.selectedDevotionAffix,
          relic.implicitAffixValues?.[relic.selectedDevotionAffix.id] || 0,
          relicName,
          positionKey,
          "devotion",
          0,
          relic.tier,
          relic.rank,
          relicsHelper!,
          state,
          broadcasts,
          effectCounter,
        );
      }

      // Process corruption affix
      if (relic.selectedCorruptionAffix) {
        effectCounter = processAffixTracked(
          relic.selectedCorruptionAffix,
          relic.implicitAffixValues?.[relic.selectedCorruptionAffix.id] || 0,
          relicName,
          positionKey,
          "corrupted",
          0,
          relic.tier,
          relic.rank,
          relicsHelper!,
          state,
          broadcasts,
          effectCounter,
        );
      }

      // Process special affix
      if (relic.selectedSpecialAffix) {
        effectCounter = processAffixTracked(
          relic.selectedSpecialAffix,
          relic.specialAffixValues?.[relic.selectedSpecialAffix.id] || 0,
          relicName,
          positionKey,
          "special",
          0,
          relic.tier,
          relic.rank,
          relicsHelper!,
          state,
          broadcasts,
          effectCounter,
        );
      }
    }

    // Store broadcasts
    state.broadcasts = broadcasts;
    lastCollectedBroadcasts = broadcasts;

    return state;
  }

  /**
   * Process a single affix and add to tracked state with consumer_ids
   */
  function processAffixTracked(
    affix: RelicAffix,
    valueNormalized: number,
    relicName: string,
    positionKey: string,
    affixType: string,
    affixIndex: number,
    tier: number,
    rank: number,
    relicHelper: RelicsHelper,
    state: TrackedState,
    broadcasts: TrackedBroadcastContribution[],
    effectCounter: number,
  ): number {
    const value = relicHelper.getAffixValueFromRoll(
      affix.id,
      valueNormalized,
      tier,
      rank,
    );

    if (affix.type === "StatModifierAffixDefinition") {
      processStatModifierAffixTracked(
        affix,
        value,
        relicName,
        positionKey,
        affixType,
        affixIndex,
        state,
      );
    } else if (affix.type === "SkillBehaviorAffixDefinition") {
      effectCounter = processSkillBehaviorAffixTracked(
        affix,
        value,
        relicName,
        positionKey,
        affixType,
        tier,
        rank,
        state,
        broadcasts,
        effectCounter,
      );
    }
    return effectCounter;
  }

  /**
   * Process stat modifier affix with consumer_id
   */
  function processStatModifierAffixTracked(
    affix: RelicAffix,
    value: number,
    relicName: string,
    positionKey: string,
    affixType: string,
    affixIndex: number,
    state: TrackedState,
  ): void {
    const statInfo = mapModForEval(affix);
    if (!statInfo) return;

    const [statName, layer] = statInfo.split(".");

    if (!(statName in state.mods)) {
      state.mods[statName] = [];
    }

    // Consumer ID pattern: relic:{positionKey}:{affixType}:{affixId}:0
    const consumerId = `relic:${positionKey}:${affixType}:${affix.id}:0`;

    const mockMod = {
      type: "StatModifierDefinition" as const,
      eStatDefinition: affix.eStatDefinition!,
      modifierType: affix.statModifierType!,
      value: value,
      selectedValue: value,
    };

    state.mods[statName].push({
      consumer_id: consumerId,
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

    // Handle additionalStatModifierDefinitions
    if (affix.additionalStatModifierDefinitions?.length) {
      for (let addIdx = 0; addIdx < affix.additionalStatModifierDefinitions.length; addIdx++) {
        const addModDef: StatModifierDefinition = affix.additionalStatModifierDefinitions[addIdx];
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

        if (!(statNameAddModDef in state.mods)) {
          state.mods[statNameAddModDef] = [];
        }

        const addModValue = affix.applyRollToAdditionalStatModifiers
          ? value
          : addModDef.value;

        // Consumer ID pattern: relic:{positionKey}:{affixType}:{affixId}:add:{addIdx}
        const addConsumerId = `relic:${positionKey}:${affixType}:${affix.id}:add:${addIdx}`;

        const mockAddMod = {
          type: "StatModifierDefinition" as const,
          eStatDefinition: addModDef.eStatDefinition!,
          modifierType: addModDef.modifierType,
          value: addModValue,
          selectedValue: addModValue,
        };

        state.mods[statNameAddModDef].push({
          consumer_id: addConsumerId,
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

  /**
   * Process skill behavior affix with consumer_ids
   */
  function processSkillBehaviorAffixTracked(
    affix: RelicAffix,
    value: number,
    relicName: string,
    positionKey: string,
    affixType: string,
    tier: number,
    rank: number,
    state: TrackedState,
    broadcasts: TrackedBroadcastContribution[],
    effectCounter: number,
  ): number {
    if (!affix.behaviorData) {
      console.warn(
        `Affix behavior data missing for affix ID ${affix.id} (${affix.name})`
      );
      return effectCounter;
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
        // Collect mods with consumer_ids
        for (let modIdx = 0; modIdx < conversionResult.mods.length; modIdx++) {
          const { statName, modSource } = conversionResult.mods[modIdx];
          if (!(statName in state.mods)) {
            state.mods[statName] = [];
          }
          // Consumer ID pattern: relic:{positionKey}:{affixType}:{affixId}:effect:{effectCounter}:{modIdx}
          const consumerId = `relic:${positionKey}:${affixType}:${affix.id}:effect:${effectCounter}:${modIdx}`;
          state.mods[statName].push({
            ...modSource,
            consumer_id: consumerId,
          } as any);
        }
        // Collect broadcasts with consumer_ids
        if (conversionResult.broadcasts) {
          for (let bcIdx = 0; bcIdx < conversionResult.broadcasts.length; bcIdx++) {
            const broadcast = conversionResult.broadcasts[bcIdx];
            // Consumer ID pattern: bc:relic:{positionKey}:{affixId}:{effectCounter}:{bcIdx}
            const bcConsumerId = `bc:relic:${positionKey}:${affix.id}:${effectCounter}:${bcIdx}`;
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
        calculation: (s as any).calculation,
        meta: { ...s.meta },
      }));
    }

    return { mods, flags: {}, broadcasts: lastCollectedBroadcasts };
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

  const api: RelicEvaluationAPI = {
    getContribution,
    getDelta,
    resetTracker,

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

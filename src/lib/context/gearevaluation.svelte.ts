import type { GearItem, GearSlot, GearsHelper } from "$lib/hellclock/gears";
import type { StatsHelper, StatMod } from "$lib/hellclock/stats";
import type { EvaluationContribution, ContributionDelta } from "$lib/context/evaluation-types";
import { getValueFromMultiplier } from "$lib/hellclock/formats";
import { fmtValue } from "$lib/hellclock/utils";
import { translate } from "$lib/hellclock/lang";
import { getContext, setContext } from "svelte";
import { useEquipped, ESlotsType } from "$lib/context/equipped.svelte";
import {
  ContributionTracker,
  type TrackedState,
} from "./contribution-tracker";

export type GearModSource = {
  source: string;
  amount: number;
  layer: string;
  meta: {
    type: string;
    id: string;
    slot: GearSlot;
    value: string;
  };
};

export type GearModCollection = Record<string, GearModSource[]>;

export type GearEvaluationAPI = {
  // Get unified contribution for evaluation (legacy)
  getContribution: () => EvaluationContribution;

  // Get delta for incremental updates (new)
  getDelta: () => ContributionDelta;

  // Reset tracker state (for full rebuild)
  resetTracker: () => void;

  // Check if gear has changed (for cache invalidation)
  get gearHash(): string;
};

const gearEvaluationKey = Symbol("gear-evaluation");

export function provideGearEvaluation(
  gearsHelper?: GearsHelper,
  statsHelper?: StatsHelper,
  lang = "en",
): GearEvaluationAPI {
  const blessedSlotsApi = useEquipped(ESlotsType.BlessedGear);
  const trinketSlotsApi = useEquipped(ESlotsType.TrinkedGear);
  const tracker = new ContributionTracker();

  function mapModForEval(mod: StatMod): string {
    let statName = mod.eStatDefinition;
    const modifierType = mod.modifierType.toLowerCase();
    if (modifierType === "additive") {
      statName = `${statName}.add`;
    } else if (modifierType === "multiplicative") {
      statName = `${statName}.mult`;
    } else if (modifierType === "multiplicativeadditive") {
      statName = `${statName}.multadd`;
    }
    return statName;
  }

  /**
   * Build tracked state with consumer_ids for all contributions
   */
  function buildTrackedState(): TrackedState {
    const state: TrackedState = { mods: {}, flags: {}, broadcasts: [] };

    // Process blessed gear
    Object.entries(blessedSlotsApi.equipped).forEach(([slot, item]) => {
      if (item) {
        addItemToState(item, "blessed", slot as GearSlot, state);
      }
    });

    // Process trinket gear
    Object.entries(trinketSlotsApi.equipped).forEach(([slot, item]) => {
      if (item) {
        addItemToState(item, "trinket", slot as GearSlot, state);
      }
    });

    return state;
  }

  function addItemToState(
    item: GearItem,
    gearType: "blessed" | "trinket",
    slot: GearSlot,
    state: TrackedState,
  ): void {
    for (let modIndex = 0; modIndex < item.mods.length; modIndex++) {
      const mod = item.mods[modIndex];
      const statInfo = mapModForEval(mod);
      const [statName, layer] = statInfo.split(".");

      if (!(statName in state.mods)) {
        state.mods[statName] = [];
      }

      // Consumer ID pattern: gear:{gearType}:{slot}:{defId}:{modIndex}
      const consumerId = `gear:${gearType}:${slot}:${item.defId}:${modIndex}`;
      const sourceType = gearType === "blessed" ? "Blessed Gear" : "Trinket Gear";

      state.mods[statName].push({
        consumer_id: consumerId,
        source: `Equipped ${translate(item.prefixLocalizedName, lang)} ${translate(item.localizedName, lang)}`,
        amount: getValueFromMultiplier(
          mod.value,
          mod.modifierType,
          mod.selectedValue!,
          item.multiplierRange[0],
          item.multiplierRange[1],
        ),
        layer: layer || "base",
        meta: {
          type: sourceType,
          id: String(item.defId),
          slot: slot,
          value: fmtValue(
            mod,
            lang,
            statsHelper!,
            item.multiplierRange[0],
            item.multiplierRange[1],
          ),
        },
      });
    }
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

    return { mods, flags: {}, broadcasts: [] };
  }

  const api: GearEvaluationAPI = {
    getContribution,
    getDelta,
    resetTracker,

    get gearHash() {
      // Create a hash of equipped gear for cache invalidation
      const blessed = Object.entries(blessedSlotsApi.equipped)
        .filter(([, item]) => item)
        .map(
          ([slot, item]) =>
            `${slot}:${item!.defId}:${item!.multiplierRange.join(",")}`,
        )
        .sort();

      const trinket = Object.entries(trinketSlotsApi.equipped)
        .filter(([, item]) => item)
        .map(
          ([slot, item]) =>
            `${slot}:${item!.defId}:${item!.multiplierRange.join(",")}`,
        )
        .sort();

      return [...blessed, ...trinket].join("|");
    },
  };

  setContext(gearEvaluationKey, api);
  return api;
}

export function useGearEvaluation(): GearEvaluationAPI {
  const ctx = getContext<GearEvaluationAPI>(gearEvaluationKey);
  if (!ctx) {
    throw new Error(
      "GearEvaluation context not found. Did you call provideGearEvaluation() in +layout.svelte?",
    );
  }
  return ctx;
}


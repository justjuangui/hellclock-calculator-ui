import type { GearItem, GearSlot, GearsHelper } from "$lib/hellclock/gears";
import type { StatsHelper, StatMod } from "$lib/hellclock/stats";
import type { EvaluationContribution } from "$lib/context/evaluation-types";
import { getValueFromMultiplier } from "$lib/hellclock/formats";
import { fmtValue } from "$lib/hellclock/utils";
import { translate } from "$lib/hellclock/lang";
import { getContext, setContext } from "svelte";
import { useEquipped, ESlotsType } from "$lib/context/equipped.svelte";

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
  // Get unified contribution for evaluation
  getContribution: () => EvaluationContribution;

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

  function mapModSource(
    item: GearItem,
    sourceType: string,
    slot: GearSlot,
    mods: GearModCollection,
  ): void {
    for (const mod of item.mods) {
      const statInfo = mapModForEval(mod);
      const [statName, layer] = statInfo.split(".");

      if (!(statName in mods)) {
        mods[statName] = [];
      }
      mods[statName].push({
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

  function getGearMods(): GearModCollection {
    const mods: GearModCollection = {};

    // Process blessed gear
    Object.entries(blessedSlotsApi.equipped).forEach(([key, item]) => {
      if (item) {
        mapModSource(item, "Blessed Gear", key as GearSlot, mods);
      }
    });

    // Process trinket gear
    Object.entries(trinketSlotsApi.equipped).forEach(([key, item]) => {
      if (item) {
        mapModSource(item, "Trinket Gear", key as GearSlot, mods);
      }
    });

    return mods;
  }

  function getContribution(): EvaluationContribution {
    const gearMods = getGearMods();

    // Convert to unified type
    const mods: EvaluationContribution["mods"] = {};
    for (const [statName, sources] of Object.entries(gearMods)) {
      mods[statName] = sources.map((s) => ({
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


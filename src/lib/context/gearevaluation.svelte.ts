import type { GearItem, GearSlot, GearsHelper } from "$lib/hellclock/gears";
import type { StatsHelper, StatMod } from "$lib/hellclock/stats";
import { getValueFromMultiplier } from "$lib/hellclock/formats";
import { fmtValue } from "$lib/hellclock/utils";
import { translate } from "$lib/hellclock/lang";
import { getContext, setContext } from "svelte";
import { useEquipped, ESlotsType } from "$lib/context/equipped.svelte";

export type GearModSource = {
  source: string;
  amount: number;
  meta: {
    type: string;
    id: string;
    slot: GearSlot;
    value: string;
  };
};

export type GearModCollection = Record<string, GearModSource[]>;

export type GearEvaluationAPI = {
  // Get current gear modifications for evaluation
  getGearMods: () => GearModCollection;
  
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
    let modifierType = mod.modifierType.toLowerCase();
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
      const statName = mapModForEval(mod);
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
  
  const api: GearEvaluationAPI = {
    getGearMods,
    
    get gearHash() {
      // Create a hash of equipped gear for cache invalidation
      const blessed = Object.entries(blessedSlotsApi.equipped)
        .filter(([, item]) => item)
        .map(([slot, item]) => `${slot}:${item!.defId}:${item!.multiplierRange.join(",")}`)
        .sort();
      
      const trinket = Object.entries(trinketSlotsApi.equipped)
        .filter(([, item]) => item)
        .map(([slot, item]) => `${slot}:${item!.defId}:${item!.multiplierRange.join(",")}`)
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
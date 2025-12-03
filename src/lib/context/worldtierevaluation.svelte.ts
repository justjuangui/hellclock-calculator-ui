import type {
  WorldTierStatModifier,
  WorldTiersHelper,
} from "$lib/hellclock/worldtiers";
import type { EvaluationContribution } from "$lib/context/evaluation-types";
import { getContext, setContext } from "svelte";
import { useWorldTierEquipped } from "./worldtierequipped.svelte";

export type WorldTierModSource = {
  source: string;
  amount: number;
  layer: string;
  meta: {
    type: string;
    id: string;
    statDefinition: string;
  };
};

export type WorldTierModCollection = Record<string, WorldTierModSource[]>;

export type WorldTierEvaluationAPI = {
  // Get unified contribution for evaluation
  getContribution: () => EvaluationContribution;
  get worldTierHash(): string;
};

const worldTierEvaluationKey = Symbol("world-tier-evaluation");

/**
 * Maps a world tier stat modifier to evaluation format
 * Following the same pattern as gearevaluation.svelte.ts
 */
function mapModForEval(mod: WorldTierStatModifier): string {
  let statName = mod.eStatDefinition;
  const modifierType = mod.modifierType.toLowerCase();

  if (modifierType === "additive") {
    statName = `${statName}.add`;
  } else if (modifierType === "multiplicative") {
    statName = `${statName}.mult`;
  }

  return statName;
}

export function provideWorldTierEvaluation(
  worldTiersHelper?: WorldTiersHelper,
): WorldTierEvaluationAPI {
  const worldTierEquippedApi = useWorldTierEquipped();

  function getWorldTierMods(): WorldTierModCollection {
    const mods: WorldTierModCollection = {};
    const worldTier = worldTierEquippedApi.selectedWorldTier;

    if (!worldTier) {
      return mods;
    }

    // Get the tier key using the helper
    const tierKey = worldTiersHelper?.getWorldTierKey(worldTier) ?? worldTier.name.split(" ")[0];

    // Process all stat modifiers from the selected world tier
    for (const mod of worldTier.playerStatModifiers) {
      const statInfo = mapModForEval(mod);
      const [statName, layer] = statInfo.split(".");

      if (!(statName in mods)) {
        mods[statName] = [];
      }

      mods[statName].push({
        source: `World Tier ${worldTier.worldTierRomanNumber} (${tierKey})`,
        amount: mod.value, // Direct value, no rarity multiplier needed
        layer: layer || "base",
        meta: {
          type: "worldtier",
          id: tierKey,
          statDefinition: mod.eStatDefinition,
        },
      });
    }

    return mods;
  }

  function getContribution(): EvaluationContribution {
    const worldTierMods = getWorldTierMods();

    // Convert to unified type
    const mods: EvaluationContribution["mods"] = {};
    for (const [statName, sources] of Object.entries(worldTierMods)) {
      mods[statName] = sources.map((s) => ({
        source: s.source,
        amount: s.amount,
        layer: s.layer,
        meta: { ...s.meta },
      }));
    }

    return { mods, flags: {}, broadcasts: [] };
  }

  const api: WorldTierEvaluationAPI = {
    getContribution,

    get worldTierHash(): string {
      return worldTierEquippedApi.worldTierHash;
    },
  };

  setContext(worldTierEvaluationKey, api);
  return api;
}

export function useWorldTierEvaluation(): WorldTierEvaluationAPI {
  const ctx = getContext<WorldTierEvaluationAPI>(worldTierEvaluationKey);
  if (!ctx) {
    throw new Error(
      "WorldTierEvaluation context not found. Did you call provideWorldTierEvaluation() in +layout.svelte?",
    );
  }
  return ctx;
}

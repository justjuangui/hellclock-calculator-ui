import type {
  WorldTierStatModifier,
  WorldTiersHelper,
} from "$lib/hellclock/worldtiers";
import type { EvaluationContribution, ContributionDelta } from "$lib/context/evaluation-types";
import { getContext, setContext } from "svelte";
import { useWorldTierEquipped } from "./worldtierequipped.svelte";
import {
  ContributionTracker,
  type TrackedState,
} from "./contribution-tracker";

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
  // Get unified contribution for evaluation (legacy)
  getContribution: () => EvaluationContribution;
  // Get delta for incremental updates (new)
  getDelta: () => ContributionDelta;
  // Reset tracker state (for full rebuild)
  resetTracker: () => void;
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
  const tracker = new ContributionTracker();

  /**
   * Build tracked state with consumer_ids for all contributions
   */
  function buildTrackedState(): TrackedState {
    const state: TrackedState = { mods: {}, flags: {}, broadcasts: [] };
    const worldTier = worldTierEquippedApi.selectedWorldTier;

    if (!worldTier) {
      return state;
    }

    // Get the tier key using the helper
    const tierKey =
      worldTiersHelper?.getWorldTierKey(worldTier) ??
      worldTier.name.split(" ")[0];

    // Process all stat modifiers from the selected world tier
    for (let modIndex = 0; modIndex < worldTier.playerStatModifiers.length; modIndex++) {
      const mod = worldTier.playerStatModifiers[modIndex];
      const statInfo = mapModForEval(mod);
      const [statName, layer] = statInfo.split(".");

      if (!(statName in state.mods)) {
        state.mods[statName] = [];
      }

      // Consumer ID pattern: wt:{tierKey}:{modIndex}
      const consumerId = `wt:${tierKey}:${modIndex}`;

      state.mods[statName].push({
        consumer_id: consumerId,
        source: `World Tier ${worldTier.worldTierRomanNumber} (${tierKey})`,
        amount: mod.value,
        layer: layer || "base",
        meta: {
          type: "worldtier",
          id: tierKey,
          statDefinition: mod.eStatDefinition,
        },
      });
    }

    return state;
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
   * Get unified contribution for evaluation (legacy API - kept for backward compatibility)
   */
  function getContribution(): EvaluationContribution {
    const state = buildTrackedState();

    // Convert tracked state to contribution format
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

  const api: WorldTierEvaluationAPI = {
    getContribution,
    getDelta,
    resetTracker,

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

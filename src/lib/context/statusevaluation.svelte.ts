import { getContext, setContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import type {
  ActiveStatus,
  StatusHelper,
  StatModifierStatusDefinition,
} from "$lib/hellclock/status";
import type { EvaluationContribution, ContributionDelta } from "$lib/context/evaluation-types";
import {
  ContributionTracker,
  type TrackedState,
} from "./contribution-tracker";

export type StatusModSource = {
  source: string;
  amount: number;
  layer: string;
  meta: {
    type: string;
    statusId: number;
    statusName: string;
    intensity?: number;
    stacks?: number;
    originalSource: string;
  };
};

export type StatusModCollection = Record<string, StatusModSource[]>;

export type StatusEvaluationAPI = {
  // Add a status to the active status list
  addStatus: (status: ActiveStatus) => void;

  // Remove a specific status by source and ID
  removeStatus: (source: string, statusId: number) => void;

  // Clear all statuses from a specific source
  clearBySource: (source: string) => void;

  // Clear all active statuses
  clearAll: () => void;

  // Get all active statuses
  getActiveStatuses: () => ActiveStatus[];

  // Get unified contribution for evaluation (legacy)
  getContribution: () => EvaluationContribution;

  // Get delta for incremental updates (new)
  getDelta: () => ContributionDelta;

  // Reset tracker state (for full rebuild)
  resetTracker: () => void;

  // Get hash for cache invalidation
  get statusHash(): string;
};

const statusEvaluationKey = Symbol("status-evaluation");

export function provideStatusEvaluation(
  statusHelper?: StatusHelper,
): StatusEvaluationAPI {
  // Store active statuses using a reactive map
  // Key: `${source}:${statusId}` to allow same status from different sources
  const activeStatuses = new SvelteMap<string, ActiveStatus>();
  const tracker = new ContributionTracker();

  function addStatus(status: ActiveStatus): void {
    const key = `${status.source}:${status.statusId}`;
    activeStatuses.set(key, status);
  }

  function removeStatus(source: string, statusId: number): void {
    const key = `${source}:${statusId}`;
    activeStatuses.delete(key);
  }

  function clearBySource(source: string): void {
    for (const [key] of activeStatuses) {
      if (key.startsWith(`${source}:`)) {
        activeStatuses.delete(key);
      }
    }
  }

  function clearAll(): void {
    activeStatuses.clear();
  }

  function getActiveStatuses(): ActiveStatus[] {
    return Array.from(activeStatuses.values());
  }

  /**
   * Build tracked state with consumer_ids for all contributions
   */
  function buildTrackedState(): TrackedState {
    const state: TrackedState = { mods: {}, flags: {}, broadcasts: [] };

    if (!statusHelper) {
      return state;
    }

    for (const activeStatus of activeStatuses.values()) {
      // Get the status definition
      const statusDef = statusHelper.getStatusById(activeStatus.statusId);
      if (!statusDef) {
        console.warn(
          `Status definition not found for ID ${activeStatus.statusId}`,
        );
        continue;
      }

      // Only process StatModifierStatusDefinition for now
      if (!statusHelper.isStatModifierStatus(statusDef)) {
        continue;
      }

      // Extract stat mods from the status
      const intensity = activeStatus.intensity ?? 1;
      const stacks = activeStatus.stacks ?? 1;

      const statMods = statusHelper.extractStatMods(
        statusDef as StatModifierStatusDefinition,
        intensity,
        stacks,
      );

      // Add each stat mod to the collection
      for (let modIndex = 0; modIndex < statMods.length; modIndex++) {
        const statMod = statMods[modIndex];
        const statName = statMod.eStatDefinition;

        if (!(statName in state.mods)) {
          state.mods[statName] = [];
        }

        // Consumer ID pattern: status:{source}:{statusId}:{modIndex}
        const consumerId = `status:${activeStatus.source}:${activeStatus.statusId}:${modIndex}`;

        state.mods[statName].push({
          consumer_id: consumerId,
          source: activeStatus.source,
          amount: statMod.value,
          layer: statMod.layer,
          meta: {
            type: "status",
            statusId: activeStatus.statusId,
            statusName: statusDef.name,
            intensity,
            stacks,
            originalSource: activeStatus.source,
            ...activeStatus.meta,
          },
        });
      }
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

  const api: StatusEvaluationAPI = {
    addStatus,
    removeStatus,
    clearBySource,
    clearAll,
    getActiveStatuses,
    getContribution,
    getDelta,
    resetTracker,

    get statusHash() {
      // Create a hash of active statuses for cache invalidation
      const statusEntries = [];

      for (const status of activeStatuses.values()) {
        const intensity = status.intensity ?? 1;
        const stacks = status.stacks ?? 1;
        statusEntries.push(
          `${status.source}:${status.statusId}:${intensity}:${stacks}`,
        );
      }

      return statusEntries.sort().join("|");
    },
  };

  setContext(statusEvaluationKey, api);
  return api;
}

export function useStatusEvaluation(): StatusEvaluationAPI {
  const ctx = getContext<StatusEvaluationAPI>(statusEvaluationKey);
  if (!ctx) {
    throw new Error(
      "StatusEvaluation context not found. Did you call provideStatusEvaluation() in +layout.svelte?",
    );
  }
  return ctx;
}

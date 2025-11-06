import { getContext, setContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import type {
  ActiveStatus,
  StatusHelper,
  StatModifierStatusDefinition,
} from "$lib/hellclock/status";

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

  // Get stat modifications from all active statuses
  getStatusMods: () => StatusModCollection;

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

  function getStatusMods(): StatusModCollection {
    if (!statusHelper) {
      return {};
    }

    const mods: StatusModCollection = {};

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
      for (const statMod of statMods) {
        const statName = statMod.eStatDefinition;

        if (!(statName in mods)) {
          mods[statName] = [];
        }

        mods[statName].push({
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

    return mods;
  }

  const api: StatusEvaluationAPI = {
    addStatus,
    removeStatus,
    clearBySource,
    clearAll,
    getActiveStatuses,
    getStatusMods,

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

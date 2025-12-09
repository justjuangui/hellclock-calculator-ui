import type {
  EvaluationModSource,
  EvaluationFlagSource,
  EvaluationModCollection,
  EvaluationFlagCollection,
  ContributionDelta,
  TrackedBroadcastContribution,
  BroadcastRemoval,
} from "./evaluation-types";
import { createEmptyDelta } from "./evaluation-types";

/**
 * Tracked contribution state with consumer_id for each mod/flag
 */
export type TrackedState = {
  mods: EvaluationModCollection;
  flags: EvaluationFlagCollection;
  broadcasts: TrackedBroadcastContribution[];
};

/**
 * Create an empty tracked state
 */
export function createEmptyTrackedState(): TrackedState {
  return {
    mods: {},
    flags: {},
    broadcasts: [],
  };
}

/**
 * Compute delta between previous and current tracked states
 * Returns what needs to be removed and what needs to be added
 */
export function computeDelta(
  prev: TrackedState,
  next: TrackedState,
): ContributionDelta {
  const delta = createEmptyDelta();

  // Process stat removals and additions
  const allStatNames = new Set([
    ...Object.keys(prev.mods),
    ...Object.keys(next.mods),
  ]);

  for (const statName of allStatNames) {
    const prevMods = prev.mods[statName] || [];
    const nextMods = next.mods[statName] || [];

    // Build maps by consumer_id
    const prevByConsumer = new Map<string, EvaluationModSource>();
    for (const mod of prevMods) {
      if (mod.consumer_id) {
        prevByConsumer.set(mod.consumer_id, mod);
      }
    }

    const nextByConsumer = new Map<string, EvaluationModSource>();
    for (const mod of nextMods) {
      if (mod.consumer_id) {
        nextByConsumer.set(mod.consumer_id, mod);
      }
    }

    // Find removals (in prev but not in next)
    const toRemove: string[] = [];
    for (const consumerId of prevByConsumer.keys()) {
      if (!nextByConsumer.has(consumerId)) {
        toRemove.push(consumerId);
      }
    }
    if (toRemove.length > 0) {
      delta.removeStats[statName] = toRemove;
      delta.hasChanges = true;
    }

    // Find additions (in next but not in prev, or changed)
    const toAdd: EvaluationModSource[] = [];
    for (const [consumerId, mod] of nextByConsumer) {
      const prevMod = prevByConsumer.get(consumerId);
      if (!prevMod || !modsEqual(prevMod, mod)) {
        // If changed, add to removals too
        if (prevMod) {
          if (!delta.removeStats[statName]) {
            delta.removeStats[statName] = [];
          }
          delta.removeStats[statName].push(consumerId);
        }
        toAdd.push(mod);
      }
    }
    if (toAdd.length > 0) {
      delta.stats[statName] = toAdd;
      delta.hasChanges = true;
    }
  }

  // Process flag removals and additions
  const allFlagNames = new Set([
    ...Object.keys(prev.flags),
    ...Object.keys(next.flags),
  ]);

  for (const flagName of allFlagNames) {
    const prevFlags = prev.flags[flagName] || [];
    const nextFlags = next.flags[flagName] || [];

    const hadFlag = prevFlags.length > 0;
    const hasFlag = nextFlags.length > 0;

    if (hadFlag && !hasFlag) {
      // Flag removed
      delta.removeFlags.push(flagName);
      delta.hasChanges = true;
    } else if (hasFlag) {
      // Check if flag changed (flags have replacement semantics)
      const prevFlag = prevFlags[0];
      const nextFlag = nextFlags[0];
      if (!prevFlag || !flagsEqual(prevFlag, nextFlag)) {
        if (hadFlag) {
          delta.removeFlags.push(flagName);
        }
        delta.flags[flagName] = nextFlags;
        delta.hasChanges = true;
      }
    }
  }

  // Process broadcast removals and additions
  const prevBroadcastByKey = new Map<string, TrackedBroadcastContribution>();
  for (const bc of prev.broadcasts) {
    const key = `${bc.consumer_id}:${bc.flag_suffix}:${bc.stat_suffix}`;
    prevBroadcastByKey.set(key, bc);
  }

  const nextBroadcastByKey = new Map<string, TrackedBroadcastContribution>();
  for (const bc of next.broadcasts) {
    const key = `${bc.consumer_id}:${bc.flag_suffix}:${bc.stat_suffix}`;
    nextBroadcastByKey.set(key, bc);
  }

  // Group removals by flag_suffix + stat_suffix
  const removalsMap = new Map<string, string[]>();
  for (const [key, bc] of prevBroadcastByKey) {
    if (!nextBroadcastByKey.has(key)) {
      const groupKey = `${bc.flag_suffix}:${bc.stat_suffix}`;
      if (!removalsMap.has(groupKey)) {
        removalsMap.set(groupKey, []);
      }
      removalsMap.get(groupKey)!.push(bc.consumer_id);
    }
  }

  for (const [groupKey, consumerIds] of removalsMap) {
    const [flag_suffix, stat_suffix] = groupKey.split(":");
    delta.removeBroadcasts.push({
      flag_suffix,
      stat_suffix,
      consumer_ids: consumerIds,
    });
    delta.hasChanges = true;
  }

  // Find added broadcasts
  for (const [key, bc] of nextBroadcastByKey) {
    const prevBc = prevBroadcastByKey.get(key);
    if (!prevBc || !broadcastsEqual(prevBc, bc)) {
      // If changed, add to removals too
      if (prevBc) {
        const groupKey = `${bc.flag_suffix}:${bc.stat_suffix}`;
        let removal = delta.removeBroadcasts.find(
          (r) => `${r.flag_suffix}:${r.stat_suffix}` === groupKey,
        );
        if (!removal) {
          removal = {
            flag_suffix: bc.flag_suffix,
            stat_suffix: bc.stat_suffix,
            consumer_ids: [],
          };
          delta.removeBroadcasts.push(removal);
        }
        if (!removal.consumer_ids.includes(bc.consumer_id)) {
          removal.consumer_ids.push(bc.consumer_id);
        }
      }
      delta.broadcasts.push(bc);
      delta.hasChanges = true;
    }
  }

  return delta;
}

/**
 * Check if two mods are equal (for change detection)
 */
function modsEqual(a: EvaluationModSource, b: EvaluationModSource): boolean {
  return (
    a.consumer_id === b.consumer_id &&
    a.source === b.source &&
    a.amount === b.amount &&
    a.layer === b.layer &&
    a.condition === b.condition &&
    a.calculation === b.calculation
  );
}

/**
 * Check if two flags are equal (for change detection)
 */
function flagsEqual(a: EvaluationFlagSource, b: EvaluationFlagSource): boolean {
  return a.source === b.source && a.enabled === b.enabled;
}

/**
 * Check if two broadcasts are equal (for change detection)
 */
function broadcastsEqual(
  a: TrackedBroadcastContribution,
  b: TrackedBroadcastContribution,
): boolean {
  return (
    a.consumer_id === b.consumer_id &&
    a.flag_suffix === b.flag_suffix &&
    a.stat_suffix === b.stat_suffix &&
    a.contribution.source === b.contribution.source &&
    a.contribution.amount === b.contribution.amount &&
    a.contribution.layer === b.contribution.layer &&
    a.contribution.condition === b.contribution.condition &&
    a.contribution.calculation === b.contribution.calculation
  );
}

/**
 * ContributionTracker class for managing provider contributions
 * Tracks the last sent state and computes deltas on changes
 */
export class ContributionTracker {
  private lastState: TrackedState = createEmptyTrackedState();
  private initialized = false;

  /**
   * Get delta between last sent state and new state
   * Updates internal tracking after computing delta
   */
  getDelta(newState: TrackedState): ContributionDelta {
    if (!this.initialized) {
      // First time: everything is an addition
      this.lastState = this.cloneState(newState);
      this.initialized = true;

      // Build initial delta (all additions)
      const delta = createEmptyDelta();
      delta.hasChanges = true;

      for (const [statName, mods] of Object.entries(newState.mods)) {
        delta.stats[statName] = [...mods];
      }

      for (const [flagName, flags] of Object.entries(newState.flags)) {
        delta.flags[flagName] = [...flags];
      }

      delta.broadcasts = [...newState.broadcasts];

      return delta;
    }

    const delta = computeDelta(this.lastState, newState);

    if (delta.hasChanges) {
      this.lastState = this.cloneState(newState);
    }

    return delta;
  }

  /**
   * Get current tracked state (for debugging)
   */
  getLastState(): TrackedState {
    return this.lastState;
  }

  /**
   * Reset tracker state (for full rebuild scenarios)
   */
  reset(): void {
    this.lastState = createEmptyTrackedState();
    this.initialized = false;
  }

  /**
   * Check if tracker has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Deep clone state to avoid reference issues
   */
  private cloneState(state: TrackedState): TrackedState {
    return {
      mods: this.cloneMods(state.mods),
      flags: this.cloneFlags(state.flags),
      broadcasts: state.broadcasts.map((bc) => ({ ...bc })),
    };
  }

  private cloneMods(mods: EvaluationModCollection): EvaluationModCollection {
    const result: EvaluationModCollection = {};
    for (const [key, value] of Object.entries(mods)) {
      result[key] = value.map((mod) => ({ ...mod }));
    }
    return result;
  }

  private cloneFlags(flags: EvaluationFlagCollection): EvaluationFlagCollection {
    const result: EvaluationFlagCollection = {};
    for (const [key, value] of Object.entries(flags)) {
      result[key] = value.map((flag) => ({ ...flag }));
    }
    return result;
  }
}

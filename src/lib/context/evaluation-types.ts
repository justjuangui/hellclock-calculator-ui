import type { BroadcastContribution } from "./affix-converters";

// Base mod source - all evaluation classes use this shape
export type EvaluationModSource = {
  consumer_id?: string; // Unique ID for tracking/removing this contribution
  source: string;
  amount: number;
  layer: string;
  condition?: string;
  calculation?: string;
  meta: Record<string, string | number | boolean | undefined>;
};

// Base flag source
export type EvaluationFlagSource = {
  consumer_id?: string; // Unique ID for tracking/removing this contribution
  source: string;
  enabled: boolean;
  meta: Record<string, string | number | boolean | undefined>;
};

export type EvaluationModCollection = Record<string, EvaluationModSource[]>;
export type EvaluationFlagCollection = Record<string, EvaluationFlagSource[]>;

// Unified contribution returned by all evaluation classes
export type EvaluationContribution = {
  mods: EvaluationModCollection;
  flags: EvaluationFlagCollection;
  broadcasts: BroadcastContribution[];
};

// Helper to create empty contribution
export function createEmptyContribution(): EvaluationContribution {
  return { mods: {}, flags: {}, broadcasts: [] };
}

// Helper to merge contributions
export function mergeContributions(
  ...contributions: EvaluationContribution[]
): EvaluationContribution {
  const result = createEmptyContribution();

  for (const contribution of contributions) {
    // Merge mods
    for (const [statName, sources] of Object.entries(contribution.mods)) {
      if (!(statName in result.mods)) {
        result.mods[statName] = [];
      }
      result.mods[statName].push(...sources);
    }

    // Merge flags
    for (const [flagName, sources] of Object.entries(contribution.flags)) {
      if (!(flagName in result.flags)) {
        result.flags[flagName] = [];
      }
      result.flags[flagName].push(...sources);
    }

    // Merge broadcasts
    result.broadcasts.push(...contribution.broadcasts);
  }

  return result;
}

// ============================================================================
// Delta Types for Incremental Updates
// ============================================================================

/**
 * Tracked broadcast contribution with consumer_id for removal
 */
export type TrackedBroadcastContribution = BroadcastContribution & {
  consumer_id: string;
};

/**
 * Broadcast removal request
 */
export type BroadcastRemoval = {
  flag_suffix: string;
  stat_suffix: string;
  consumer_ids: string[];
};

/**
 * Delta representing changes to send to the engine
 */
export type ContributionDelta = {
  hasChanges: boolean;
  removeStats: Record<string, string[]>; // statName -> consumer_ids to remove
  stats: EvaluationModCollection;
  removeFlags: string[];
  flags: EvaluationFlagCollection;
  removeBroadcasts: BroadcastRemoval[];
  broadcasts: TrackedBroadcastContribution[];
};

/**
 * Create an empty delta (no changes)
 */
export function createEmptyDelta(): ContributionDelta {
  return {
    hasChanges: false,
    removeStats: {},
    stats: {},
    removeFlags: [],
    flags: {},
    removeBroadcasts: [],
    broadcasts: [],
  };
}

/**
 * Merge multiple deltas into one
 */
export function mergeDeltas(...deltas: ContributionDelta[]): ContributionDelta {
  const result = createEmptyDelta();

  for (const delta of deltas) {
    if (!delta.hasChanges) continue;
    result.hasChanges = true;

    // Merge removeStats
    for (const [statName, consumerIds] of Object.entries(delta.removeStats)) {
      if (!(statName in result.removeStats)) {
        result.removeStats[statName] = [];
      }
      result.removeStats[statName].push(...consumerIds);
    }

    // Merge stats
    for (const [statName, sources] of Object.entries(delta.stats)) {
      if (!(statName in result.stats)) {
        result.stats[statName] = [];
      }
      result.stats[statName].push(...sources);
    }

    // Merge removeFlags
    result.removeFlags.push(...delta.removeFlags);

    // Merge flags
    for (const [flagName, sources] of Object.entries(delta.flags)) {
      if (!(flagName in result.flags)) {
        result.flags[flagName] = [];
      }
      result.flags[flagName].push(...sources);
    }

    // Merge removeBroadcasts
    result.removeBroadcasts.push(...delta.removeBroadcasts);

    // Merge broadcasts
    result.broadcasts.push(...delta.broadcasts);
  }

  return result;
}

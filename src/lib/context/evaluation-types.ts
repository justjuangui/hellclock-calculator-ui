import type { BroadcastContribution } from "./affix-converters";

// Base mod source - all evaluation classes use this shape
export type EvaluationModSource = {
  source: string;
  amount: number;
  layer: string;
  condition?: string;
  calculation?: string;
  meta: Record<string, string | number | boolean | undefined>;
};

// Base flag source
export type EvaluationFlagSource = {
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

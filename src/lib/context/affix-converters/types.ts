import type {
  SkillEffect,
  SkillEffectVariable,
  SkillEffectVariableReference,
} from "$lib/hellclock/relics";

/**
 * Skill definition reference for multi-skill targeting
 */
export type SkillDefinitionRef = {
  name: string;
  id: number;
  type: string;
};

/**
 * Behavior data context for multi-skill targeting
 */
export type BehaviorDataContext = {
  affectMultipleSkills: boolean;
  useListOfSkills: string; // "UseSkillTag" | "UseListOfSkills" | "UseSkillTagAndListOfSkills"
  listOfSkills: SkillDefinitionRef[];
  skillTagFilter: string;
};

/**
 * Base context that all systems share for effect conversion
 */
export type EffectConverterContextBase = {
  sourceName: string; // "Relic Name" or "Constellation: Fire I"
  sourceType: string; // "implicit" | "explicit" | "node" | etc.
  affixId: number;
  affixValue: number;
  variables: SkillEffectVariable[];
  rollVariableName: string;
  skillName: string;
  behaviorData?: BehaviorDataContext; // For multi-skill targeting
};

/**
 * Relic-specific context extension
 */
export type RelicConverterContext = EffectConverterContextBase & {
  system: "relic";
  positionKey: string;
  tier: number;
  rank: number;
};

/**
 * Constellation-specific context extension
 */
export type ConstellationConverterContext = EffectConverterContextBase & {
  system: "constellation";
  constellationId: string;
  nodeId: string;
  nodeLevel: number;
};

/**
 * Union type for converter input - discriminated by 'system' field
 */
export type EffectConverterContext =
  | RelicConverterContext
  | ConstellationConverterContext;

/**
 * Generic mod source with system-specific metadata
 */
export type ModSource<TMeta = Record<string, string>> = {
  source: string;
  amount: number;
  layer: string;
  calculation?: string;
  meta: TMeta;
};

/**
 * Relic-specific metadata
 */
export type RelicModMeta = {
  type: "relic";
  id: string;
  position: string;
  affixType: string;
  value: string;
};

/**
 * Constellation-specific metadata
 */
export type ConstellationModMeta = {
  type: "constellation";
  constellationId: string;
  nodeId: string;
  level: string;
  value: string;
};

/**
 * Union of all possible metadata types
 */
export type AnyModMeta = RelicModMeta | ConstellationModMeta;

/**
 * Type aliases for convenience
 */
export type RelicModSource = ModSource<RelicModMeta>;
export type ConstellationModSource = ModSource<ConstellationModMeta>;

/**
 * Broadcast contribution for multi-skill targeting
 * Uses flag suffix matching to apply to all skills with a tag
 */
export type BroadcastContribution = {
  flag_suffix: string; // e.g., "tag_Melee"
  stat_suffix: string; // e.g., "DamageModifier"
  contribution: {
    source: string;
    amount: number;
    layer: string;
    meta: Record<string, string>;
    condition?: string;
    calculation?: string;
  };
};

/**
 * Result of converting an effect to mods
 */
export type EffectConversionResult<TMeta = AnyModMeta> = {
  mods: Array<{
    statName: string;
    modSource: ModSource<TMeta>;
  }>;
  broadcasts?: BroadcastContribution[];
};

/**
 * Interface for effect converters
 */
export interface EffectConverter<TEffect extends SkillEffect = SkillEffect> {
  readonly effectType: string;
  convert(
    effect: TEffect,
    context: EffectConverterContext,
  ): EffectConversionResult;
  canHandle?(effect: TEffect, context: EffectConverterContext): boolean;
}

/**
 * Variable modifier to stat reference mapping
 */
export type VariableModifierMapping = {
  modifier: string;
  statReference: string;
  operation: "multiply" | "add";
};

/**
 * Helper function to build metadata based on system type
 */
export function buildModMeta(
  context: EffectConverterContext,
  value: number,
): AnyModMeta {
  if (context.system === "relic") {
    return {
      type: "relic",
      id: String(context.affixId),
      position: context.positionKey,
      affixType: context.sourceType,
      value: String(value),
    };
  } else {
    return {
      type: "constellation",
      constellationId: context.constellationId,
      nodeId: context.nodeId,
      level: String(context.nodeLevel),
      value: String(value),
    };
  }
}

/**
 * Helper function to build source label
 */
export function buildSourceLabel(context: EffectConverterContext): string {
  return `${context.sourceName} (${context.sourceType})`;
}

export type { SkillEffect, SkillEffectVariable, SkillEffectVariableReference };

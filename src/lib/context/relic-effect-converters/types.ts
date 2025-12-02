import type {
  SkillEffect,
  SkillEffectVariable,
  SkillEffectVariableReference,
} from "$lib/hellclock/relics";

/**
 * Context passed to effect converters containing all necessary information
 * about the relic, affix, and calculated values
 */
export type EffectConverterContext = {
  relicName: string;
  positionKey: string;
  affixId: number;
  affixType: string;
  tier: number;
  rank: number;
  affixValue: number;
  variables: SkillEffectVariable[];
  rollVariableName: string;
  skillName: string;
};

/**
 * Extended RelicModSource with optional calculation expression
 */
export type RelicModSourceWithCalculation = {
  source: string;
  amount: number;
  layer: string;
  calculation?: string;
  meta: {
    type: string;
    id: string;
    position: string;
    affixType: string;
    value: string;
  };
};

/**
 * Result of converting an effect to mods
 */
export type EffectConversionResult = {
  mods: Array<{
    statName: string;
    modSource: RelicModSourceWithCalculation;
  }>;
};

/**
 * Interface for effect converters
 */
export interface EffectConverter<T extends SkillEffect = SkillEffect> {
  readonly effectType: string;
  convert(effect: T, context: EffectConverterContext): EffectConversionResult;
  canHandle?(effect: T, context: EffectConverterContext): boolean;
}

/**
 * Variable modifier to stat reference mapping
 */
export type VariableModifierMapping = {
  modifier: string;
  statReference: string;
  operation: "multiply" | "add";
};

export type { SkillEffect, SkillEffectVariable, SkillEffectVariableReference };

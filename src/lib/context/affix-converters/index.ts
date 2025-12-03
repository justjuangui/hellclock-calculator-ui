// Export types
export type {
  EffectConverterContextBase,
  RelicConverterContext,
  ConstellationConverterContext,
  EffectConverterContext,
  ModSource,
  RelicModMeta,
  ConstellationModMeta,
  AnyModMeta,
  RelicModSource,
  ConstellationModSource,
  EffectConversionResult,
  EffectConverter,
  VariableModifierMapping,
  SkillEffect,
  SkillEffectVariable,
  SkillEffectVariableReference,
  BroadcastContribution,
  BehaviorDataContext,
  SkillDefinitionRef,
} from "./types";

// Export type helpers
export { buildModMeta, buildSourceLabel } from "./types";

// Export registry
export { effectConverterRegistry } from "./registry";
export type { EffectConverterRegistry } from "./registry";

// Export layer mapping utilities
export {
  getLayerFromModifierType,
  normalizeStatName,
  buildStatKey,
  createProxyFlagName,
} from "./layer-mapping";
export type { StatLayer } from "./layer-mapping";

// Export variable modifier utilities
export {
  VARIABLE_MODIFIER_STAT_MAP,
  parseVariableModifiers,
  hasDynamicModifiers,
  getBaseValue,
  buildCalculationExpression,
  hasUseMultipliedModifier,
  hasLimitToValue,
} from "./variable-modifiers";

// Export converters
export { addCharacterStatModifierConverter } from "./converters/add-character-stat-modifier";
export { addSkillValueModifierConverter } from "./converters/add-skill-value-modifier";

// Register converters
import { effectConverterRegistry } from "./registry";
import { addCharacterStatModifierConverter } from "./converters/add-character-stat-modifier";
import { addSkillValueModifierConverter } from "./converters/add-skill-value-modifier";

effectConverterRegistry.register(addCharacterStatModifierConverter);
effectConverterRegistry.register(addSkillValueModifierConverter);

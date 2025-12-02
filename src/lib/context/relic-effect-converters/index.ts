import { effectConverterRegistry } from "./registry";
import {
  addSkillValueModifierConverter,
  addCharacterStatModifierConverter,
} from "./converters";

// Register built-in converters
effectConverterRegistry.register(addSkillValueModifierConverter);
effectConverterRegistry.register(addCharacterStatModifierConverter);

// Export registry
export { effectConverterRegistry } from "./registry";

// Export types
export type {
  EffectConverter,
  EffectConverterContext,
  EffectConversionResult,
  RelicModSourceWithCalculation,
  VariableModifierMapping,
} from "./types";

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

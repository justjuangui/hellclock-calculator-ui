import type {
  AddCharacterStatModifierSkillEffectData,
  SkillEffectStatModifierDefinition,
} from "$lib/hellclock/relics";
import { getValueFromMultiplier } from "$lib/hellclock/formats";
import type {
  EffectConverter,
  EffectConverterContext,
  EffectConversionResult,
  RelicModSourceWithCalculation,
} from "../types";
import { getBaseValue, buildCalculationExpression } from "../variable-modifiers";

/**
 * Converter for AddCharacterStatModifierSkillEffectData effects.
 * These effects add modifiers to character stats (like CriticalDamage, Life, etc.)
 */
export const addCharacterStatModifierConverter: EffectConverter<AddCharacterStatModifierSkillEffectData> =
  {
    effectType: "AddCharacterStatModifierSkillEffectData",

    canHandle(
      effect: AddCharacterStatModifierSkillEffectData,
    ): boolean {
      // Handle effects with Always trigger or characterEffectTrigger Always
      if (effect.effectTrigger === "Always") {
        return true;
      }
      if (
        effect.useCharacterEffectTrigger &&
        effect.characterEffectTrigger === "Always"
      ) {
        return true;
      }
      return false;
    },

    convert(
      effect: AddCharacterStatModifierSkillEffectData,
      context: EffectConverterContext,
    ): EffectConversionResult {
      const result: EffectConversionResult = { mods: [] };

      // Access statModifiers - the field name in the actual data
      // Note: Type definition in relics.ts uses "modifiers" but actual data uses "statModifiers"
      const statModifiers: SkillEffectStatModifierDefinition[] =
        (effect as any).statModifiers || (effect as any).modifiers || [];

      if (statModifiers.length === 0) {
        return result;
      }

      for (const statModifier of statModifiers) {
        const converted = convertStatModifier(statModifier, context);
        if (converted) {
          result.mods.push(converted);
        }
      }

      return result;
    },
  };

function convertStatModifier(
  statModifier: SkillEffectStatModifierDefinition,
  context: EffectConverterContext,
): { statName: string; modSource: RelicModSourceWithCalculation } | null {
  const {
    relicName,
    positionKey,
    affixId,
    affixType,
    affixValue,
    variables,
    rollVariableName,
  } = context;

  // Get stat name and clean it
  const statName = statModifier.eStatDefinition.replaceAll(" ", "");

  // Determine layer from modifier type
  let layer = "add";
  const modifierType = statModifier.modifierType.toLowerCase();
  if (modifierType === "multiplicative") {
    layer = "mult";
  } else if (modifierType === "multiplicativeadditive") {
    layer = "multadd";
  }

  // Resolve base value from variable reference
  const baseValue = getBaseValue(
    statModifier.value,
    variables,
    rollVariableName,
    affixValue,
  );

  // Apply multiplier to get effective value
  const effectiveValue = getValueFromMultiplier(
    baseValue,
    statModifier.modifierType,
    1,
    1,
    1,
  );

  // Build calculation expression if there are dynamic modifiers
  const calculation = buildCalculationExpression(statModifier.value);

  const modSource: RelicModSourceWithCalculation = {
    source: `${relicName} (${affixType})`,
    amount: effectiveValue,
    layer,
    meta: {
      type: "relic",
      id: String(affixId),
      position: positionKey,
      affixType,
      value: String(effectiveValue),
    },
  };

  if (calculation) {
    modSource.calculation = calculation;
  }

  return { statName, modSource };
}

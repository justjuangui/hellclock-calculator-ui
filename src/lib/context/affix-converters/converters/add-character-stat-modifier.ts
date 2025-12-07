import type {
  AddCharacterStatModifierSkillEffectData,
  SkillEffectStatModifierDefinition,
  SkillEffectVariableReference,
} from "$lib/hellclock/relics";
import { getValueFromMultiplier } from "$lib/hellclock/formats";
import type {
  EffectConverter,
  EffectConverterContext,
  EffectConversionResult,
  ModSource,
  AnyModMeta,
} from "../types";
import { buildModMeta, buildSourceLabel } from "../types";
import {
  getBaseValue,
  buildCalculationExpression,
  hasLimitToValue,
} from "../variable-modifiers";
import { getLayerFromModifierType, normalizeStatName } from "../layer-mapping";

/**
 * Converter for AddCharacterStatModifierSkillEffectData effects.
 * These effects add modifiers to character stats (like CriticalDamage, Life, etc.)
 * Works for both relic and constellation systems.
 */
export const addCharacterStatModifierConverter: EffectConverter<AddCharacterStatModifierSkillEffectData> =
  {
    effectType: "AddCharacterStatModifierSkillEffectData",

    canHandle(effect: AddCharacterStatModifierSkillEffectData): boolean {
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
): { statName: string; modSource: ModSource<AnyModMeta> } | null {
  const { affixValue, variables, rollVariableName } = context;

  // Get stat name and clean it
  const statName = normalizeStatName(statModifier.eStatDefinition);

  // Determine layer from modifier type
  const layer = getLayerFromModifierType(statModifier.modifierType);

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
  let calculation = buildCalculationExpression(statModifier.value);

  // If modifier have LimitToValue then
  if (hasLimitToValue(statModifier.value.eSkillEffectVariableModifier)) {
    const limitValueRef: Partial<SkillEffectVariableReference> = {
      valueOrName: statModifier.value.supportVariableValueOrName,
    };
    const limitValue = getBaseValue(
      limitValueRef,
      variables,
      rollVariableName,
      affixValue,
    );

    calculation = `min(${calculation}, ${limitValue})`;
  }

  // Build system-specific metadata
  const meta = buildModMeta(context, effectiveValue);

  const modSource: ModSource<AnyModMeta> = {
    source: buildSourceLabel(context),
    amount: effectiveValue,
    layer,
    meta,
  };

  if (calculation) {
    modSource.calculation = calculation;
  }

  return { statName, modSource };
}

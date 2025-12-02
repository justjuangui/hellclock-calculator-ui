import type { AddSkillValueModifierSkillEffectData } from "$lib/hellclock/relics";
import { getValueFromMultiplier } from "$lib/hellclock/formats";
import type {
  EffectConverter,
  EffectConverterContext,
  EffectConversionResult,
  RelicModSourceWithCalculation,
} from "../types";
import { getBaseValue, buildCalculationExpression } from "../variable-modifiers";

/**
 * Converter for AddSkillValueModifierSkillEffectData effects.
 * Migrated from existing processSkillBehaviorAffix logic.
 */
export const addSkillValueModifierConverter: EffectConverter<AddSkillValueModifierSkillEffectData> =
  {
    effectType: "AddSkillValueModifierSkillEffectData",

    canHandle(
      effect: AddSkillValueModifierSkillEffectData,
    ): boolean {
      return effect.effectTrigger === "Always";
    },

    convert(
      effect: AddSkillValueModifierSkillEffectData,
      context: EffectConverterContext,
    ): EffectConversionResult {
      const result: EffectConversionResult = { mods: [] };
      const {
        relicName,
        positionKey,
        affixId,
        affixType,
        affixValue,
        variables,
        rollVariableName,
        skillName,
      } = context;

      if (!effect.modifiers || effect.modifiers.length === 0) {
        return result;
      }

      for (const modifier of effect.modifiers) {
        const skillValueModifierName = modifier.skillValueModifierKey.replaceAll(
          " ",
          "",
        );

        // Skip status-related modifiers
        if (skillValueModifierName.includes("!Status")) {
          continue;
        }

        // Determine layer from modifier type
        let layer = "add";
        const modifierType = modifier.modifierType.toLowerCase();
        if (modifierType === "multiplicative") {
          layer = "mult";
        } else if (modifierType === "multiplicativeadditive") {
          layer = "multadd";
        }

        // Build stat name
        const statName = `skill_${skillName}_${skillValueModifierName}`.replaceAll(
          " ",
          "",
        );

        // Resolve value from variable or roll
        const valueToUse = getBaseValue(
          modifier.value,
          variables,
          rollVariableName,
          affixValue,
        );

        // Build calculation expression if there are dynamic modifiers
        const calculation = buildCalculationExpression(modifier.value);

        const modSource: RelicModSourceWithCalculation = {
          source: `${relicName} (${affixType})`,
          amount: getValueFromMultiplier(
            valueToUse,
            modifier.modifierType,
            1,
            1,
            1,
          ),
          layer: layer || "base",
          meta: {
            type: "relic",
            id: String(affixId),
            position: positionKey,
            affixType: affixType,
            value: String(valueToUse),
          },
        };

        if (calculation) {
          modSource.calculation = calculation;
        }

        result.mods.push({ statName, modSource });
      }

      return result;
    },
  };

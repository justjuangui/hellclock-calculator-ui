import type {
  AddSkillValueModifierSkillEffectData,
  SkillEffectSkillModifierDefinition,
} from "$lib/hellclock/relics";
import { getValueFromMultiplier } from "$lib/hellclock/formats";
import type {
  EffectConverter,
  EffectConverterContext,
  EffectConversionResult,
  ModSource,
  AnyModMeta,
  BroadcastContribution,
} from "../types";
import { buildModMeta, buildSourceLabel } from "../types";
import {
  getBaseValue,
  buildCalculationExpression,
} from "../variable-modifiers";
import { getLayerFromModifierType } from "../layer-mapping";

/**
 * Build a direct skill mod for a single skill
 */
function buildDirectSkillMod(
  modifier: SkillEffectSkillModifierDefinition,
  skillName: string,
  context: EffectConverterContext,
): { statName: string; modSource: ModSource<AnyModMeta> } {
  const { affixValue, variables, rollVariableName } = context;

  const skillValueModifierName = modifier.skillValueModifierKey.replaceAll(
    " ",
    "",
  );

  // Determine layer from modifier type
  const layer = getLayerFromModifierType(modifier.modifierType);

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

  // Build system-specific metadata
  const meta = buildModMeta(context, valueToUse);

  const modSource: ModSource<AnyModMeta> = {
    source: buildSourceLabel(context),
    amount: getValueFromMultiplier(valueToUse, modifier.modifierType, 1, 1, 1),
    layer: layer || "base",
    meta,
  };

  if (calculation) {
    modSource.calculation = calculation;
  }

  return { statName, modSource };
}

/**
 * Build a broadcast contribution for tag-based skill targeting
 */
function buildBroadcast(
  modifier: SkillEffectSkillModifierDefinition,
  skillTagFilter: string,
  context: EffectConverterContext,
): BroadcastContribution {
  const { affixValue, variables, rollVariableName } = context;

  const skillValueModifierName = modifier.skillValueModifierKey.replaceAll(
    " ",
    "",
  );

  // Determine layer from modifier type
  const layer = getLayerFromModifierType(modifier.modifierType);

  // Resolve value from variable or roll
  const valueToUse = getBaseValue(
    modifier.value,
    variables,
    rollVariableName,
    affixValue,
  );

  // Build calculation expression if there are dynamic modifiers
  const calculation = buildCalculationExpression(modifier.value);

  // Build meta as string record for broadcast
  const meta: Record<string, string> = {};
  if (context.system === "relic") {
    meta.type = "relic";
    meta.id = String(context.affixId);
    meta.position = context.positionKey;
    meta.affixType = context.sourceType;
  } else {
    meta.type = "constellation";
    meta.constellationId = context.constellationId;
    meta.nodeId = context.nodeId;
    meta.level = String(context.nodeLevel);
  }
  meta.value = String(valueToUse);

  // Build flag suffix from tag filter (preserve case)
  // "Everything" -> "tag_everything", others -> "tag_<Original>"
  const flagSuffix =
    skillTagFilter.toLowerCase() === "everything"
      ? "tag_everything"
      : `tag_${skillTagFilter}`;

  const broadcast: BroadcastContribution = {
    flag_suffix: flagSuffix,
    stat_suffix: skillValueModifierName,
    contribution: {
      source: buildSourceLabel(context),
      amount: getValueFromMultiplier(
        valueToUse,
        modifier.modifierType,
        1,
        1,
        1,
      ),
      layer: layer || "base",
      meta,
    },
  };

  if (calculation) {
    broadcast.contribution.calculation = calculation;
  }

  return broadcast;
}

/**
 * Converter for AddSkillValueModifierSkillEffectData effects.
 * Works for both relic and constellation systems.
 * Supports multi-skill targeting via broadcast system.
 */
export const addSkillValueModifierConverter: EffectConverter<AddSkillValueModifierSkillEffectData> =
  {
    effectType: "AddSkillValueModifierSkillEffectData",

    canHandle(effect: AddSkillValueModifierSkillEffectData): boolean {
      return effect.effectTrigger === "Always";
    },

    convert(
      effect: AddSkillValueModifierSkillEffectData,
      context: EffectConverterContext,
    ): EffectConversionResult {
      const result: EffectConversionResult = { mods: [], broadcasts: [] };
      const { skillName, behaviorData } = context;

      if (!effect.modifiers || effect.modifiers.length === 0) {
        return result;
      }

      for (const modifier of effect.modifiers) {
        const skillValueModifierName =
          modifier.skillValueModifierKey.replaceAll(" ", "");

        // Skip status-related modifiers
        if (skillValueModifierName.includes("!Status")) {
          continue;
        }

        // Check if this is multi-skill targeting
        if (!behaviorData?.affectMultipleSkills) {
          // Single skill (current behavior)
          if (skillName == null || skillName === "") {
            console.warn(
              `effect targets single skill but no skillName in context - ${effect.name}`,
            );
            continue;
          }
          result.mods.push(buildDirectSkillMod(modifier, skillName, context));
        } else {
          // Multi-skill targeting based on useListOfSkills
          switch (behaviorData.useListOfSkills) {
            case "UseSkillTag":
              // Broadcast only - skip if tag filter is "0" (no skill)
              if (behaviorData.skillTagFilter !== "0") {
                result.broadcasts!.push(
                  buildBroadcast(
                    modifier,
                    behaviorData.skillTagFilter,
                    context,
                  ),
                );
              }
              break;

            case "UseListOfSkills":
              // Direct skills from list
              for (const skill of behaviorData.listOfSkills) {
                result.mods.push(
                  buildDirectSkillMod(modifier, skill.name, context),
                );
              }
              break;

            case "UseSkillTagAndListOfSkills":
              // Both broadcast AND direct skills
              if (behaviorData.skillTagFilter !== "0") {
                result.broadcasts!.push(
                  buildBroadcast(
                    modifier,
                    behaviorData.skillTagFilter,
                    context,
                  ),
                );
              }
              for (const skill of behaviorData.listOfSkills) {
                result.mods.push(
                  buildDirectSkillMod(modifier, skill.name, context),
                );
              }
              break;

            default:
              // Unknown mode - fall back to single skill
              result.mods.push(
                buildDirectSkillMod(modifier, skillName, context),
              );
          }
        }
      }

      return result;
    },
  };

import type {
  VariableModifierMapping,
  SkillEffectVariableReference,
  SkillEffectVariable,
} from "./types";

/**
 * Mapping of variable modifiers to their corresponding stat references
 * Based on constellation evaluation: Green->DisciplinePoints, Red->FuryPoints, Blue->FaithPoints
 */
export const VARIABLE_MODIFIER_STAT_MAP: Record<
  string,
  VariableModifierMapping
> = {
  MultiplyByGreenDevotionAmount: {
    modifier: "MultiplyByGreenDevotionAmount",
    statReference: "DisciplinePoints",
    operation: "multiply",
  },
  MultiplyByRedDevotionAmount: {
    modifier: "MultiplyByRedDevotionAmount",
    statReference: "FuryPoints",
    operation: "multiply",
  },
  MultiplyByBlueDevotionAmount: {
    modifier: "MultiplyByBlueDevotionAmount",
    statReference: "FaithPoints",
    operation: "multiply",
  },
  MultiplyByMaximumLife: {
    modifier: "MultiplyByMaximumLife",
    statReference: "Life",
    operation: "multiply",
  },
  MultiplyByCurrentMana: {
    modifier: "MultiplyByCurrentMana",
    statReference: "Mana",
    operation: "multiply",
  },
  MultiplyByMissingLife: {
    modifier: "MultiplyByMissingLife",
    statReference: "MissingLife",
    operation: "multiply",
  },
  MultiplyByMissingManaRatio: {
    modifier: "MultiplyByMissingManaRatio",
    statReference: "MissingManaRatio",
    operation: "multiply",
  },
  MultiplyBySkillDamage: {
    modifier: "MultiplyBySkillDamage",
    statReference: "{skill}DamageModifier",
    operation: "multiply",
  },
  // MultiplyByStatusStacks: {
  //   modifier: "MultiplyByStatusStacks",
  //   statReference: "StatusStacks",
  //   operation: "multiply",
  // },
  MultiplyByTargetStatusStacks: {
    modifier: "MultiplyByTargetStatusStacks",
    statReference: "TargetStatusStacks",
    operation: "multiply",
  },
  MultiplyByCurrentSummonAmount: {
    modifier: "MultiplyByCurrentSummonAmount",
    statReference: "CurrentSummonAmount",
    operation: "multiply",
  },
  MultiplyByDamageDealt: {
    modifier: "MultiplyByDamageDealt",
    statReference: "DamageDealt",
    operation: "multiply",
  },
  MultiplyByBarrier: {
    modifier: "MultiplyByBarrier",
    statReference: "Barrier",
    operation: "multiply",
  },
  MultiplyBySkillNonIgnorableCooldown: {
    modifier: "MultiplyBySkillNonIgnorableCooldown",
    statReference: "{skill}NonIgnorableCooldown",
    operation: "multiply",
  },
};

/**
 * Parse eSkillEffectVariableModifier string into array of modifiers.
 * Handles:
 * - "0" -> empty array (no modifiers)
 * - Single modifier: "MultiplyByGreenDevotionAmount"
 * - Comma-separated: "MultiplyByGreenDevotionAmount, LimitToValue"
 */
export function parseVariableModifiers(modifierString: string): string[] {
  if (!modifierString || modifierString === "0") {
    return [];
  }
  return modifierString
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m && m !== "0");
}

/**
 * Check if variable reference has dynamic modifiers that need calculation expressions
 */
export function hasDynamicModifiers(
  variableRef: SkillEffectVariableReference,
): boolean {
  const modifiers = parseVariableModifiers(
    variableRef.eSkillEffectVariableModifier,
  );
  return modifiers.some((mod) => VARIABLE_MODIFIER_STAT_MAP[mod] !== undefined);
}

/**
 * Get base value from variable reference, resolving variable names
 */
export function getBaseValue(
  variableRef: Partial<SkillEffectVariableReference>,
  variables: SkillEffectVariable[],
  rollVariableName: string,
  rollValue: number,
): number {
  const valueName = variableRef.valueOrName;

  // If this is the rolled variable, use the roll value
  if (valueName === rollVariableName) {
    return rollValue;
  }

  // Look for a named variable
  const variable = variables.find((v) => v.name === valueName);
  if (variable) {
    return variable.baseValue;
  }

  // Try to parse as a number
  const parsed = Number(valueName);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Build calculation expression from variable modifiers.
 * Returns null if no dynamic modifiers need calculation.
 * Otherwise returns expression like "val * DisciplinePoints" or "val * DisciplinePoints * FuryPoints"
 */
export function buildCalculationExpression(
  variableRef: SkillEffectVariableReference,
): string | null {
  const modifiers = parseVariableModifiers(
    variableRef.eSkillEffectVariableModifier,
  );

  if (modifiers.length === 0) {
    return null;
  }

  let expression = "val";
  let hasStatModifier = false;

  const useMultipliedModifier = hasUseMultipliedModifier(
    variableRef.eSkillEffectVariableModifier,
  );
  for (const modifier of modifiers) {
    const mapping = VARIABLE_MODIFIER_STAT_MAP[modifier];
    if (mapping) {
      hasStatModifier = true;
      if (!useMultipliedModifier && mapping.operation === "multiply") {
        expression = `${expression} * ${mapping.statReference}`;
      } else if (!useMultipliedModifier && mapping.operation === "add") {
        expression = `${expression} + ${mapping.statReference}`;
      } else if (useMultipliedModifier && mapping.operation === "multiply") {
        expression = `((${expression}) - 1) * ${mapping.statReference} + 1`;
      }
    }
    // Other modifiers like LimitToValue are handled elsewhere or ignored
  }

  return hasStatModifier ? expression : null;
}

/**
 * Check if modifiers include UseMultipliedModifier
 */
export function hasUseMultipliedModifier(modifierString: string): boolean {
  const modifiers = parseVariableModifiers(modifierString);
  return modifiers.includes("UseMultipliedModifier");
}

/**
 * Check if modifiers include LimitToValue
 */
export function hasLimitToValue(modifierString: string): boolean {
  const modifiers = parseVariableModifiers(modifierString);
  return modifiers.includes("LimitToValue");
}

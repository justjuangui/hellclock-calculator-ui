// SkillCard Value Resolution
// Resolves display values from evaluation results or skill properties

import type { RowConfig, SkillSelected } from "./skillcard-types";

/**
 * Build evaluation key from skill ID and short key
 */
export function getEvaluationKey(skillId: string, shortKey: string): string {
  return `skill_${skillId}_${shortKey}`.replaceAll(" ", "");
}

/**
 * Compute special values that require custom logic
 */
export function computeValue(
  key: string,
  skill: SkillSelected,
  evaluationResult: Record<string, unknown>,
  skillId: string,
): unknown {
  switch (key) {
    case "attackSpeedOrCooldown":
      if (skill.skill.useAttackSpeed) {
        return evaluationResult["AttackSpeed"] || "1.0s";
      } else {
        return skill.skill.cooldown ? `${skill.skill.cooldown}s` : "N/A";
      }

    case "damagePerMana": {
      const damageKey = getEvaluationKey(skillId, "Dmg_Total");
      const damage = (evaluationResult[damageKey] as number) || 0;
      const mana = skill.skill.manaCost || 1;
      return damage / mana;
    }

    case "effectiveDPS": {
      const dpsKey = getEvaluationKey(skillId, "DPS");
      return evaluationResult[dpsKey] || 0;
    }

    case "totalHits": {
      const bulletCount =
        ((skill.skill as any as Record<string, unknown>)[
          "bulletCount"
        ] as number) || 1;
      return bulletCount;
    }

    default:
      return null;
  }
}

/**
 * Resolve value for a row based on its valueType
 */
export function resolveValue(
  row: RowConfig,
  skill: SkillSelected,
  evaluationResult: Record<string, unknown>,
  skillId: string,
): unknown {
  switch (row.valueType) {
    case "const":
      return row.value;

    case "evaluate": {
      const key = getEvaluationKey(skillId, row.value as string);
      return evaluationResult[key] ?? null;
    }

    case "fromSkillSelected": {
      const skillSelectedData = skill as any as Record<string, unknown>;
      return skillSelectedData[row.value as string];
    }
    case "fromSkill": {
      const skillData = skill.skill as any as Record<string, unknown>;
      return skillData[row.value as string];
    }

    case "computed":
      return computeValue(
        row.value as string,
        skill,
        evaluationResult,
        skillId,
      );

    default:
      return null;
  }
}

/**
 * Resolve all row values for a section
 */
export function resolveRowValues(
  rows: RowConfig[],
  skill: SkillSelected,
  evaluationResult: Record<string, unknown>,
  skillId: string,
): Map<string, unknown> {
  const values = new Map<string, unknown>();

  for (const row of rows) {
    values.set(row.id, resolveValue(row, skill, evaluationResult, skillId));
  }

  return values;
}

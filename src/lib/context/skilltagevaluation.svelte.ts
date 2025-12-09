import { getContext, setContext } from "svelte";
import { useSkillEquipped } from "$lib/context/skillequipped.svelte";
import type { EvaluationContribution, EvaluationFlagCollection, EvaluationFlagSource, ContributionDelta } from "$lib/context/evaluation-types";
import {
  ContributionTracker,
  type TrackedState,
} from "./contribution-tracker";

export type SkillTagFlagSource = EvaluationFlagSource & {
  meta: {
    type: "skill-tag";
    skillName: string;
    tag: string;
  };
};

export type SkillTagEvaluationAPI = {
  // Evaluation integration (base tags only → flags)
  getContribution: () => EvaluationContribution;
  // Get delta for incremental updates (new)
  getDelta: () => ContributionDelta;
  // Reset tracker state (for full rebuild)
  resetTracker: () => void;
  get skillTagHash(): string;

  // UI utilities (for SkillCardHeader display)
  getBaseTagsForSkill: (skillName: string) => string[];
  getDamageTagsFromDistribution: (
    skillName: string,
    evalResult: Record<string, unknown>
  ) => string[];
};

const skillTagEvaluationKey = Symbol("skill-tag-evaluation");

/**
 * Damage type tags that should be excluded from base tags.
 * These are calculated dynamically from damage distribution instead.
 */
const DAMAGE_TYPE_TAGS = new Set([
  "Physical Damage",
  "Fire Damage",
  "Lightning Damage",
  "Plague Damage",
  "Elemental Damage",
  // Also handle normalized versions
  "PhysicalDamage",
  "FireDamage",
  "LightningDamage",
  "PlagueDamage",
  "ElementalDamage",
]);

/**
 * Check if a tag is a damage type tag (should be excluded from base tags).
 */
function isDamageTypeTag(tag: string): boolean {
  return DAMAGE_TYPE_TAGS.has(tag) || DAMAGE_TYPE_TAGS.has(normalizeTag(tag));
}

/**
 * Normalizes a tag string by removing spaces and special characters.
 * "Single Target" → "SingleTarget"
 * "Physical Damage" → "PhysicalDamage"
 */
function normalizeTag(tag: string): string {
  return tag.replace(/\s+/g, "");
}

export function provideSkillTagEvaluation(): SkillTagEvaluationAPI {
  const skillEquippedApi = useSkillEquipped();
  const tracker = new ContributionTracker();

  /**
   * Build tracked state with consumer_ids for all flags
   */
  function buildTrackedState(): TrackedState {
    const state: TrackedState = { mods: {}, flags: {}, broadcasts: [] };
    const activeSkills = skillEquippedApi.activeSkills;

    for (const skillSelected of activeSkills) {
      const skill = skillSelected.skill;
      const skillName = skill.name;
      const normalizedSkillName = skillName.replaceAll(" ", "");
      const skillTags = skill.skillTags || [];

      // Add _everything tag for all skills (always enabled)
      const everythingFlagKey = `skill_${normalizedSkillName}_tag_everything`;
      // Consumer ID pattern: tag:{skillName}:{tag}
      const everythingConsumerId = `tag:${normalizedSkillName}:everything`;

      if (!(everythingFlagKey in state.flags)) {
        state.flags[everythingFlagKey] = [];
      }
      state.flags[everythingFlagKey].push({
        consumer_id: everythingConsumerId,
        source: `Skill Tag - ${skill.localizedName || skillName}`,
        enabled: true,
        meta: {
          type: "skill-tag",
          skillName: normalizedSkillName,
          tag: "everything",
        },
      });

      for (const tag of skillTags) {
        // Skip damage type tags - they come from damage distribution
        if (isDamageTypeTag(tag)) continue;

        const normalizedTag = normalizeTag(tag);
        const flagKey = `skill_${normalizedSkillName}_tag_${normalizedTag}`;
        // Consumer ID pattern: tag:{skillName}:{tag}
        const consumerId = `tag:${normalizedSkillName}:${normalizedTag}`;

        if (!(flagKey in state.flags)) {
          state.flags[flagKey] = [];
        }

        state.flags[flagKey].push({
          consumer_id: consumerId,
          source: `Skill Tag - ${skill.localizedName || skillName}`,
          enabled: true,
          meta: {
            type: "skill-tag",
            skillName,
            tag: normalizedTag,
          },
        });
      }
    }

    return state;
  }

  /**
   * Get delta for incremental updates (new API)
   */
  function getDelta(): ContributionDelta {
    const currentState = buildTrackedState();
    return tracker.getDelta(currentState);
  }

  /**
   * Reset tracker state (for full rebuild scenarios)
   */
  function resetTracker(): void {
    tracker.reset();
  }

  /**
   * Get unified contribution for evaluation (legacy API)
   */
  function getContribution(): EvaluationContribution {
    const state = buildTrackedState();
    return { mods: {}, flags: state.flags, broadcasts: [] };
  }

  /**
   * Get base tags for a specific skill (from skillTags field).
   * Excludes damage type tags.
   * For UI display purposes.
   */
  function getBaseTagsForSkill(skillName: string): string[] {
    const activeSkills = skillEquippedApi.activeSkills;
    // Normalize input for comparison since resolver may pass normalized skillId
    const normalizedInput = skillName.replaceAll(" ", "");
    const skill = activeSkills.find(
      (s) => s.skill.name.replaceAll(" ", "") === normalizedInput
    );

    if (!skill) return [];

    // Filter out damage type tags
    return (skill.skill.skillTags || []).filter((tag) => !isDamageTypeTag(tag));
  }

  /**
   * Calculate damage tags from evaluation result.
   * This is for UI display only - NOT sent to evaluation.
   *
   * Looks for: skill_[SkillName]_Dst_[Type]
   * Types: Physical, Fire, Lightning, Plague
   *
   * If any elemental type (Fire, Lightning, Plague) > 0, adds "Elemental Damage" tag.
   */
  function getDamageTagsFromDistribution(
    skillName: string,
    evalResult: Record<string, unknown>
  ): string[] {
    const tags: string[] = [];
    const normalizedSkillName = skillName.replaceAll(" ", "");

    const physical = (evalResult[`skill_${normalizedSkillName}_Dst_Physical`] as number) || 0;
    const fire = (evalResult[`skill_${normalizedSkillName}_Dst_Fire`] as number) || 0;
    const lightning = (evalResult[`skill_${normalizedSkillName}_Dst_Lightning`] as number) || 0;
    const plague = (evalResult[`skill_${normalizedSkillName}_Dst_Plague`] as number) || 0;

    if (physical > 0) tags.push("Physical Damage");
    if (fire > 0) tags.push("Fire Damage");
    if (lightning > 0) tags.push("Lightning Damage");
    if (plague > 0) tags.push("Plague Damage");

    // ElementalDamage if any elemental type is present
    if (fire > 0 || lightning > 0 || plague > 0) {
      tags.push("Elemental Damage");
    }

    return tags;
  }

  const api: SkillTagEvaluationAPI = {
    getContribution,
    getDelta,
    resetTracker,

    get skillTagHash() {
      // Create a hash of equipped skills' tags for cache invalidation
      const activeSkills = skillEquippedApi.activeSkills;
      const tagEntries: string[] = [];

      for (const skillSelected of activeSkills) {
        const skillName = skillSelected.skill.name;
        // Only hash non-damage tags (those are what we send to evaluation)
        const tags = (skillSelected.skill.skillTags || [])
          .filter((tag) => !isDamageTypeTag(tag))
          .sort()
          .join(",");
        tagEntries.push(`${skillName}:${tags}`);
      }

      return tagEntries.sort().join("|");
    },

    getBaseTagsForSkill,
    getDamageTagsFromDistribution,
  };

  setContext(skillTagEvaluationKey, api);
  return api;
}

export function useSkillTagEvaluation(): SkillTagEvaluationAPI {
  const ctx = getContext<SkillTagEvaluationAPI>(skillTagEvaluationKey);
  if (!ctx) {
    throw new Error(
      "SkillTagEvaluation context not found. Did you call provideSkillTagEvaluation() in +layout.svelte?",
    );
  }
  return ctx;
}

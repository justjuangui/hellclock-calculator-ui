import type { SkillsHelper, SkillUpgradeModifier } from "$lib/hellclock/skills";
import type { EvaluationContribution, ContributionDelta } from "$lib/context/evaluation-types";
import { getValueFromMultiplier } from "$lib/hellclock/formats";
import { translate } from "$lib/hellclock/lang";
import { getContext, setContext } from "svelte";
import { useSkillEquipped } from "$lib/context/skillequipped.svelte";
import {
  ContributionTracker,
  type TrackedState,
} from "./contribution-tracker";

export type SkillModSource = {
  source: string;
  amount: number;
  layer: string;
  condition?: string;
  meta: {
    type: string;
    id: string;
    slot: string;
    base?: string;
    level?: string;
    value: string;
  };
};

export type SkillModCollection = Record<string, SkillModSource[]>;

export type SkillEvaluationAPI = {
  // Get unified contribution for evaluation (legacy)
  getContribution: () => EvaluationContribution;

  // Get delta for incremental updates (new)
  getDelta: () => ContributionDelta;

  // Reset tracker state (for full rebuild)
  resetTracker: () => void;

  // Check if skills have changed (for cache invalidation)
  get skillHash(): string;
};

const skillEvaluationKey = Symbol("skill-evaluation");

export function provideSkillEvaluation(
  skillsHelper?: SkillsHelper,
  lang = "en",
): SkillEvaluationAPI {
  const skillSlotsApi = useSkillEquipped();
  const tracker = new ContributionTracker();

  function mapSkillModForEval(mod: SkillUpgradeModifier): string {
    let statName = mod.skillValueModifierKey.replaceAll(" ", "");
    const modifierType = mod.modifierType.toLowerCase();
    if (modifierType === "additive") {
      statName = `${statName}.add`;
    } else if (modifierType === "multiplicative") {
      statName = `${statName}.mult`;
    } else if (modifierType === "multiplicativeadditive") {
      statName = `${statName}.multadd`;
    }
    return statName;
  }

  /**
   * Build tracked state with consumer_ids for all contributions
   */
  function buildTrackedState(): TrackedState {
    const state: TrackedState = { mods: {}, flags: {}, broadcasts: [] };

    Object.entries(skillSlotsApi.skillsEquipped).forEach(([slot, skill]) => {
      if (!skill) return;

      const normalizedSkillName = skill.skill.name.replaceAll(" ", "");
      const skillLevelStatName = `skill_${normalizedSkillName}_Level`;

      // Add skill level stat
      // Consumer ID pattern: skill:{slot}:{skillId}:level
      const levelConsumerId = `skill:${slot}:${skill.skill.id}:level`;

      if (!(skillLevelStatName in state.mods)) {
        state.mods[skillLevelStatName] = [];
      }
      state.mods[skillLevelStatName].push({
        consumer_id: levelConsumerId,
        source: `Skill ${translate(skill.skill.localizedName, lang)} Level`,
        amount: skill.selectedLevel,
        layer: "simple",
        meta: {
          type: "skill",
          id: String(skill.skill.id),
          slot: slot,
          value: String(skill.selectedLevel),
        },
      });

      // If the skill contain summoned entities add in mods
      const summonAmount = (skill.skill as any).summonAmount ?? 0;
      if (summonAmount > 0) {
        const currentSummonsStatName = `CurrentSummonAmount`;
        // Consumer ID pattern: skill:{slot}:{skillId}:summon
        const summonConsumerId = `skill:${slot}:${skill.skill.id}:summon`;

        if (!(currentSummonsStatName in state.mods)) {
          state.mods[currentSummonsStatName] = [];
        }
        state.mods[currentSummonsStatName].push({
          consumer_id: summonConsumerId,
          source: `Skill ${translate(skill.skill.localizedName, lang)} Summons`,
          amount: summonAmount,
          layer: "simple",
          meta: {
            type: "skill",
            id: String(skill.skill.id),
            slot: slot,
            value: String(summonAmount),
          },
        });
      }

      // Add base value modifiers
      const baseValMods = skillsHelper?.getSkillBaseValueModsById(
        skill.skill.name,
      );

      if (!baseValMods?.length) {
        console.warn(`baseValMods not found for skill ${skill.skill.name}`);
        return;
      }

      for (let baseIndex = 0; baseIndex < baseValMods.length; baseIndex++) {
        const baseValMod = baseValMods[baseIndex];
        if (baseValMod.value.startsWith("IGNORE")) {
          continue;
        }
        const skillGroup =
          `skill_${skill.skill.name}_${baseValMod.id}`.replaceAll(" ", "");

        if (!(skillGroup in state.mods)) {
          state.mods[skillGroup] = [];
        }

        let amount = 0;
        if (baseValMod.value.startsWith("CONST:N")) {
          const [, , val] = baseValMod.value.split(":");
          amount = Number(val) ?? 0;
        } else if (baseValMod.value.startsWith("RANDOM:")) {
          const [_, valRange] = baseValMod.value.split(":");
          const range = (skill.skill as any)[valRange] ?? [0, 0];
          amount =
            Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
        } else if (baseValMod.value.startsWith("DEEP:")) {
          const deepEval = baseValMod.value.replace("DEEP:", "").split(":");
          let val;
          for (const part of deepEval) {
            val = val ? val[part] : (skill.skill as any)[part];
          }
          amount = Number(val) ?? 0;
        } else {
          amount = Number((skill.skill as any)[baseValMod.value]) ?? 0;
        }

        // Consumer ID pattern: skill:{slot}:{skillId}:base:{baseIndex}
        const baseConsumerId = `skill:${slot}:${skill.skill.id}:base:${baseIndex}`;

        state.mods[skillGroup].push({
          consumer_id: baseConsumerId,
          source: `Skill ${translate(skill.skill.localizedName, lang)}`,
          amount: amount,
          layer: "base",
          meta: {
            type: "skill",
            id: String(skill.skill.id),
            slot: slot,
            base: baseValMod.value,
            value: String(amount),
          },
        });
      }

      // Add level-based modifiers for ALL levels with conditions
      for (const [levelKey, levelModifiers] of Object.entries(
        skill.skill.modifiersPerLevel,
      )) {
        for (let modIndex = 0; modIndex < levelModifiers.length; modIndex++) {
          const modifier = levelModifiers[modIndex];
          // Skip status modifiers
          if (modifier.skillValueModifierKey.includes("!Status")) {
            continue;
          }

          const [statInfo, layer] = mapSkillModForEval(modifier).split(".");
          const statName = `skill_${skill.skill.name}_${statInfo}`.replaceAll(
            " ",
            "",
          );

          if (!(statName in state.mods)) {
            state.mods[statName] = [];
          }

          // Consumer ID pattern: skill:{slot}:{skillId}:mod:{levelKey}:{modIndex}
          const modConsumerId = `skill:${slot}:${skill.skill.id}:mod:${levelKey}:${modIndex}`;

          state.mods[statName].push({
            consumer_id: modConsumerId,
            source: `Skill ${translate(skill.skill.localizedName, lang)} Level ${levelKey}`,
            amount: getValueFromMultiplier(
              modifier.value,
              modifier.modifierType,
              1,
              1,
              1,
            ),
            layer: layer || "base",
            condition: `${skillLevelStatName} == ${levelKey}`,
            meta: {
              type: "skill",
              id: String(skill.skill.id),
              slot: slot,
              level: levelKey,
              value: String(modifier.value),
            },
          });
        }
      }
    });

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

    // Convert to unified type
    const mods: EvaluationContribution["mods"] = {};
    for (const [statName, sources] of Object.entries(state.mods)) {
      mods[statName] = sources.map((s) => ({
        consumer_id: s.consumer_id,
        source: s.source,
        amount: s.amount,
        layer: s.layer,
        condition: s.condition,
        meta: { ...s.meta },
      }));
    }

    return { mods, flags: {}, broadcasts: [] };
  }

  const api: SkillEvaluationAPI = {
    getContribution,
    getDelta,
    resetTracker,

    get skillHash() {
      // Create a hash of equipped skills for cache invalidation
      return Object.entries(skillSlotsApi.skillsEquipped)
        .filter(([, skill]) => skill)
        .map(
          ([slot, skill]) =>
            `${slot}:${skill!.skill.id}:${skill!.selectedLevel}`,
        )
        .sort()
        .join("|");
    },
  };

  setContext(skillEvaluationKey, api);
  return api;
}

export function useSkillEvaluation(): SkillEvaluationAPI {
  const ctx = getContext<SkillEvaluationAPI>(skillEvaluationKey);
  if (!ctx) {
    throw new Error(
      "SkillEvaluation context not found. Did you call provideSkillEvaluation() in +layout.svelte?",
    );
  }
  return ctx;
}

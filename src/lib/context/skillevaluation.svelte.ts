import type { SkillsHelper, SkillUpgradeModifier } from "$lib/hellclock/skills";
import { getValueFromMultiplier } from "$lib/hellclock/formats";
import { translate } from "$lib/hellclock/lang";
import { getContext, setContext } from "svelte";
import { useSkillEquipped } from "$lib/context/skillequipped.svelte";

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
  // Get current skill modifications for evaluation
  getSkillMods: () => SkillModCollection;

  // Check if skills have changed (for cache invalidation)
  get skillHash(): string;
};

const skillEvaluationKey = Symbol("skill-evaluation");

export function provideSkillEvaluation(
  skillsHelper?: SkillsHelper,
  lang = "en",
): SkillEvaluationAPI {
  const skillSlotsApi = useSkillEquipped();

  function mapSkillModForEval(mod: SkillUpgradeModifier): string {
    let statName = mod.skillValueModifierKey.replaceAll(" ", "");
    let modifierType = mod.modifierType.toLowerCase();
    if (modifierType === "additive") {
      statName = `${statName}.add`;
    } else if (modifierType === "multiplicative") {
      statName = `${statName}.mult`;
    } else if (modifierType === "multiplicativeadditive") {
      statName = `${statName}.multadd`;
    }
    return statName;
  }

  function getSkillMods(): SkillModCollection {
    const mods: SkillModCollection = {};

    Object.entries(skillSlotsApi.skillsEquipped).forEach(([slot, skill]) => {
      if (!skill) return;

      // Add skill level stat
      const skillLevelStatName = `skill_${skill.skill.name.replaceAll(" ", "")}_Level`;

      mods[skillLevelStatName] = [
        {
          source: `Skill ${translate(skill.skill.localizedName, lang)} Level`,
          amount: skill.selectedLevel,
          layer: "simple",
          meta: {
            type: "skill",
            id: String(skill.skill.id),
            slot: slot,
            value: String(skill.selectedLevel),
          },
        },
      ];

      // Add base value modifiers
      const baseValMods = skillsHelper?.getSkillBaseValueModsById(
        skill.skill.name,
      );

      if (!baseValMods?.length) {
        console.warn(`baseValMods not found for skill ${skill.skill.name}`);
        return;
      }

      for (const baseValMod of baseValMods) {
        if (baseValMod.value.startsWith("IGNORE")) {
          continue;
        }
        const skillGroup =
          `skill_${skill.skill.name}_${baseValMod.id}`.replaceAll(" ", "");
        if (!(skillGroup in mods)) {
          mods[skillGroup] = [];
        }

        let amount = 0;
        if (baseValMod.value.startsWith("CONST:N")) {
          let [, , val] = baseValMod.value.split(":");
          amount = Number(val) ?? 0;
        } else if (baseValMod.value.startsWith("RANDOM:")) {
          let [_, valRange] = baseValMod.value.split(":");
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
        mods[skillGroup].push({
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
        for (const modifier of levelModifiers) {
          // Skip status modifiers
          if (modifier.skillValueModifierKey.includes("!Status")) {
            continue;
          }

          const [statInfo, layer] = mapSkillModForEval(modifier).split(".");
          const statName = `skill_${skill.skill.name}_${statInfo}`.replaceAll(
            " ",
            "",
          );

          if (!(statName in mods)) {
            mods[statName] = [];
          }

          mods[statName].push({
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

    return mods;
  }

  const api: SkillEvaluationAPI = {
    getSkillMods,

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

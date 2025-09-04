import type { SkillSelected, SkillsHelper, SkillUpgradeModifier } from "$lib/hellclock/skills";
import { getValueFromMultiplier } from "$lib/hellclock/formats";
import { translate } from "$lib/hellclock/lang";
import { getContext, setContext } from "svelte";
import { useSkillEquipped } from "$lib/context/skillequipped.svelte";

export type SkillModSource = {
  source: string;
  amount: number;
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
      
      // Add base value modifiers
      const baseValMods = skillsHelper?.getSkillBaseValueModsById(skill.skill.name);
      
      if (!baseValMods?.length) {
        console.warn(`baseValMods not found for skill ${skill.skill.name}`);
        return;
      }
      
      for (const baseValMod of baseValMods) {
        const skillGroup = `skill.${skill.skill.name}.${baseValMod.id}.base`;
        if (!(skillGroup in mods)) {
          mods[skillGroup] = [];
        }
        
        const amount = (skill.skill as any)[baseValMod.value] || 0;
        mods[skillGroup].push({
          source: `Skill ${translate(skill.skill.localizedName, lang)}`,
          amount: amount,
          meta: {
            type: "skill",
            id: String(skill.skill.id),
            slot: slot,
            base: baseValMod.value,
            value: String(amount),
          },
        });
      }
      
      // Add level-based modifiers
      let valueModByLevel = skill.skill.modifiersPerLevel[skill.selectedLevel];
      if (!valueModByLevel) {
        console.warn(
          `ValueModifiers not found for skill ${skill.skill.name} at level ${skill.selectedLevel}, using level 7`,
        );
        valueModByLevel = skill.skill.modifiersPerLevel[7];
      }
      
      for (const modifier of valueModByLevel) {
        const statName = `skill.${skill.skill.name}.${mapSkillModForEval(modifier)}`;
        if (!(statName in mods)) {
          mods[statName] = [];
        }
        mods[statName].push({
          source: `Skill ${translate(skill.skill.localizedName, lang)} Level ${skill.selectedLevel}`,
          amount: getValueFromMultiplier(
            modifier.value,
            modifier.modifierType,
            1,
            1,
            1
          ),
          meta: {
            type: "skill",
            id: String(skill.skill.id),
            slot: slot,
            level: String(skill.selectedLevel),
            value: String(modifier.value),
          },
        });
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
        .map(([slot, skill]) => `${slot}:${skill!.skill.id}:${skill!.selectedLevel}`)
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
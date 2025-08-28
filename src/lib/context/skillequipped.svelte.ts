import type { SkillSelected, SkillSlotDefinition } from "$lib/hellclock/skills";
import { getContext, setContext } from "svelte";

export type SkillEquippedMap = Partial<
  Record<SkillSlotDefinition, SkillSelected | null>
>;
export type SkillEquippedAPI = {
  skillsEquipped: SkillEquippedMap;
  set: (slot: SkillSlotDefinition, skill: SkillSelected) => void;
  unset: (slot: SkillSlotDefinition) => void;
  clear: () => void;
};

const skillEquippedKey = Symbol("skill-equipped");

export function provideSkillEquipped(
  initial?: SkillEquippedMap,
): SkillEquippedAPI {
  const skillsEquipped = $state<SkillEquippedMap>(
    structuredClone(initial ?? {}),
  );
  const api: SkillEquippedAPI = {
    skillsEquipped,
    set: (slot, skill) => {
      skillsEquipped[slot] = skill;
    },
    unset: (slot) => {
      delete skillsEquipped[slot];
    },
    clear: () => {
      for (const k of Object.keys(skillsEquipped)) {
        delete skillsEquipped[k as SkillSlotDefinition];
      }
    },
  };
  setContext(skillEquippedKey, api);
  return api;
}

export function useSkillEquipped(): SkillEquippedAPI {
  const ctx = getContext<SkillEquippedAPI>(skillEquippedKey);
  if (!ctx) {
    throw new Error(
      "Skill Equipped context not found. Did you call provideSkillEquipped() in +layout.svelte?",
    );
  }
  return ctx;
}

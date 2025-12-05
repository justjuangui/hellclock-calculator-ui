import type {
  SkillSelected,
  SkillSlotDefinition,
  SkillsHelper,
  SkillValueGroup,
} from "$lib/hellclock/skills";
import { getContext, setContext } from "svelte";

export type SkillEquippedMap = Partial<
  Record<SkillSlotDefinition, SkillSelected | null>
>;

export type SkillEvaluation = {
  skill: SkillSelected;
  result: any | null;
  valueGroups: SkillValueGroup[];
  error: string | null;
  loading: boolean;
};

export type SkillEquippedAPI = {
  skillsEquipped: SkillEquippedMap;
  set: (slot: SkillSlotDefinition, skill: SkillSelected) => void;
  unset: (slot: SkillSlotDefinition) => void;
  clear: () => void;

  // Enhanced functionality
  get activeSkills(): SkillSelected[];
  get skillSlots(): SkillSlotDefinition[];

  // Evaluation state (coordinated through EvaluationManager)
  clearEvaluations: () => void;
  setCurrentEvaluation: (evaluation: SkillEvaluation | null) => void;

  // Current evaluation state
  get currentEvaluation(): SkillEvaluation | null;
  get selectedSkill(): SkillSelected | null;
  setSelectedSkill: (skill: SkillSelected | null) => void;
};

const skillEquippedKey = Symbol("skill-equipped");

export function provideSkillEquipped(
  initial?: SkillEquippedMap,
  skillsHelper?: SkillsHelper,
): SkillEquippedAPI {
  const skillsEquipped = $state<SkillEquippedMap>(
    structuredClone(initial ?? {}),
  );

  let currentEvaluation = $state<SkillEvaluation | null>(null);
  let selectedSkill = $state<SkillSelected | null>(null);

  // Reactive effect to clear evaluation when skills change
  $effect(() => {
    // Watch skillsEquipped for changes
    const currentSkills = Object.values(skillsEquipped);
    const currentSelected = selectedSkill;

    // If the selected skill is no longer in the equipped skills, clear it
    if (currentSelected) {
      const stillExists = currentSkills.some(
        (skill) => skill && skill.skill.name === currentSelected.skill.name,
      );

      if (!stillExists) {
        selectedSkill = null;
        currentEvaluation = null;
      }
    }
  });


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

    // Enhanced functionality
    get activeSkills() {
      return Object.values(skillsEquipped).filter(
        (skill): skill is SkillSelected =>
          skill !== null && skill !== undefined,
      );
    },

    get skillSlots() {
      return skillsHelper?.getSkillSlotsDefinitions() ?? [];
    },

    // Evaluation state management (coordinated through EvaluationManager)
    clearEvaluations: () => {
      currentEvaluation = null;
      selectedSkill = null;
    },
    
    setCurrentEvaluation: (evaluation) => {
      currentEvaluation = evaluation;
    },

    // Current evaluation state
    get currentEvaluation() {
      return currentEvaluation;
    },
    get selectedSkill() {
      return selectedSkill;
    },
    setSelectedSkill: (skill) => {
      selectedSkill = skill;
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

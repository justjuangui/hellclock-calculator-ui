import { getContext, setContext } from "svelte";
import { useBellEquipped } from "$lib/context/bellequipped.svelte";
import type { BellsHelper } from "$lib/hellclock/bells";
import type { SkillsHelper } from "$lib/hellclock/skills";
import type { CharacterIncrementNodeAffixDefinition } from "$lib/hellclock/constellations";

export type MaxSkillLevelAPI = {
  // The calculated max skill level (reactive)
  get maxSkillLevel(): number;

  // The base max skill level from config
  get baseMaxSkillLevel(): number;

  // The bonus from bell allocations
  get bellBonus(): number;
};

const maxSkillLevelKey = Symbol("max-skill-level");

export function provideMaxSkillLevel(
  bellsHelper?: BellsHelper,
  skillsHelper?: SkillsHelper,
): MaxSkillLevelAPI {
  const bellEquippedApi = useBellEquipped();

  // Calculate bell bonus from the ACTIVE bell's allocated nodes with MaximumSkillLevelIncrementAmount
  function calculateBellBonus(): number {
    if (!bellsHelper) return 0;

    let bonus = 0;
    const activeBellId = bellEquippedApi.activeBellId;

    // Only check the active bell
    for (const [_key, allocated] of bellEquippedApi.allocatedNodes.entries()) {
      if (allocated.constellationId !== activeBellId) continue;
      if (allocated.level === 0) continue;

      const node = bellsHelper.getNodeById(activeBellId, allocated.nodeId);
      if (!node) continue;

      for (const affix of node.affixes) {
        if (affix.type === "CharacterIncrementNodeAffixDefinition") {
          const charAffix = affix as CharacterIncrementNodeAffixDefinition;
          if (
            charAffix.eCharacterIncrement === "MaximumSkillLevelIncrementAmount"
          ) {
            // valuePerLevel * allocatedLevel gives the total bonus from this node
            bonus += charAffix.valuePerLevel * allocated.level;
          }
        }
      }
    }

    return bonus;
  }

  const api: MaxSkillLevelAPI = {
    get baseMaxSkillLevel() {
      // From SkillsHelper.getMaxSkillLevel(): maxSkillUpgradeLevelBonus + 7 = 10
      return skillsHelper?.getMaxSkillLevel() ?? 10;
    },

    get bellBonus() {
      // Access allocatedNodes.size and activeBellId to create reactive dependencies
      const _triggerSize = bellEquippedApi.allocatedNodes.size;
      const _triggerBell = bellEquippedApi.activeBellId;
      return calculateBellBonus();
    },

    get maxSkillLevel() {
      // Base level 1 + bell bonus (skills start at level 1)
      return 1 + this.bellBonus;
    },
  };

  setContext(maxSkillLevelKey, api);
  return api;
}

export function useMaxSkillLevel(): MaxSkillLevelAPI {
  const ctx = getContext<MaxSkillLevelAPI>(maxSkillLevelKey);
  if (!ctx) {
    throw new Error(
      "MaxSkillLevel context not found. Did you call provideMaxSkillLevel() in +layout.svelte?",
    );
  }
  return ctx;
}

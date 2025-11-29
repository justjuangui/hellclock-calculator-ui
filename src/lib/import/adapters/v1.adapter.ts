/**
 * V1 Adapter for parsing Hell Clock save files
 * Handles save files with version 1 or no version specified
 */

import type { ImportAdapter } from "./base";
import type {
  ParsedSkill,
  ParsedRelic,
  ParsedConstellation,
  ParsedGear,
  ParsedBell,
  RelicLoadoutSummary,
  GearLoadoutSummary,
  SaveFile,
  SaveFileSkillSlot,
  SaveFileSkillLevel,
  SaveFileRelicLoadoutsData,
  SaveFileConstellationsData,
  SaveFileGearLoadoutsData,
  SaveFileBellSkillTree,
  ParsedAffix,
  ParsedImplicitAffix,
} from "../types";

export class V1Adapter implements ImportAdapter {
  readonly version = 1;

  canHandle(saveData: unknown): boolean {
    if (!saveData || typeof saveData !== "object") return false;

    const data = saveData as Record<string, unknown>;

    // V1 has no saveVersion or saveVersion === 1
    const version = data.saveVersion;
    if (version !== undefined && version !== 7) return false;

    // Must have required fields
    return (
      Array.isArray(data.skillSlots) &&
      Array.isArray(data._skillAndLevels) &&
      typeof data._relicLoadoutsSaveData === "object" &&
      typeof data.constellationsData === "object"
    );
  }

  parseSkills(saveData: unknown): ParsedSkill[] {
    const data = saveData as SaveFile
    const skillSlots = data.skillSlots as SaveFileSkillSlot[];
    const skillLevels = data._skillAndLevels as SaveFileSkillLevel[];

    // Build a map of skill ID → level
    const levelMap = new Map<number, number>();
    for (const entry of skillLevels) {
      levelMap.set(entry._skill, entry._level);
    }

    // Parse equipped skills (filter out empty slots where _skillHashId === -1)
    const parsed: ParsedSkill[] = [];

    for (const slot of skillSlots) {
      if (slot._skillHashId === -1) continue; // Empty slot

      parsed.push({
        slotIndex: slot._slotIndex,
        skillId: slot._skillHashId,
        level: levelMap.get(slot._skillHashId) ?? 0,
      });
    }

    return parsed;
  }

  getRelicLoadouts(saveData: unknown): RelicLoadoutSummary[] {
    const data = saveData as SaveFile;
    const relicData = data._relicLoadoutsSaveData as SaveFileRelicLoadoutsData;

    const summaries: RelicLoadoutSummary[] = [];

    for (let i = 0; i < relicData._loadouts.length; i++) {
      const loadout = relicData._loadouts[i];
      summaries.push({
        index: i,
        relicCount: loadout.Items?.length ?? 0,
        isCurrentInGame: i === relicData._currentIndex,
      });
    }

    return summaries;
  }

  parseRelics(saveData: unknown, loadoutIndex: number): ParsedRelic[] {
    const data = saveData as SaveFile;
    const relicData = data._relicLoadoutsSaveData as SaveFileRelicLoadoutsData;

    if (loadoutIndex < 0 || loadoutIndex >= relicData._loadouts.length) {
      return [];
    }

    const loadout = relicData._loadouts[loadoutIndex];
    const items = loadout.Items ?? [];

    return items.map((item) => {
      // Parse regular affixes
      const affixes: ParsedAffix[] = (item._affixesData ?? []).map((a) => ({
        affixId: a._relicAffixDefinitionId,
        rollValue: a._rollValue,
        tier: a._tier,
        locked: a._locked,
      }));

      // Parse implicit affixes (devotion, etc.)
      const implicitAffixes: ParsedImplicitAffix[] = (
        item._implicitAffixesData ?? []
      ).map((ia) => ({
        category: ia._eImplicitAffixCategory,
        affix: {
          affixId: ia._relicAffixData._relicAffixDefinitionId,
          rollValue: ia._relicAffixData._rollValue,
          tier: ia._relicAffixData._tier,
          locked: ia._relicAffixData._locked,
        },
      }));

      return {
        baseId: item._relicBaseDefinitionID,
        tier: item._tier,
        rarity: item._eRelicRarity,
        upgradeLevel: item._upgradeLevel,
        position: {
          x: item._position.x,
          y: item._position.y,
        },
        affixes,
        implicitAffixes,
        isCorrupted: item._isCorrupted,
        ascended: item._ascended,
      };
    });
  }

  parseConstellations(saveData: unknown): ParsedConstellation[] {
    const data = saveData as SaveFile;
    const constData = data.constellationsData as SaveFileConstellationsData;

    const parsed: ParsedConstellation[] = [];

    for (const tree of constData.skillTreesData) {
      for (const node of tree._skillTreeNodes) {
        // Only include allocated nodes (level > 0)
        if (node._upgradeLevel > 0) {
          parsed.push({
            constellationId: tree._skillTreeHashId,
            nodeGuid: node._nodeDefinitionGuid,
            level: node._upgradeLevel,
          });
        }
      }
    }

    return parsed;
  }

  getGearLoadouts(saveData: unknown): GearLoadoutSummary[] {
    const data = saveData as SaveFile;
    const gearData = data._blessedGearLoadoutsSaveData as
      | SaveFileGearLoadoutsData
      | undefined;

    if (!gearData) return [];

    const summaries: GearLoadoutSummary[] = [];

    for (let i = 0; i < gearData._loadouts.length; i++) {
      const loadout = gearData._loadouts[i];
      summaries.push({
        index: i,
        gearCount: loadout._gear?.length ?? 0,
        isCurrentInGame: i === gearData._currentIndex,
      });
    }

    return summaries;
  }

  parseGear(saveData: unknown, loadoutIndex: number): ParsedGear[] {
    const data = saveData as SaveFile;
    const gearData = data._blessedGearLoadoutsSaveData as
      | SaveFileGearLoadoutsData
      | undefined;

    if (
      !gearData ||
      loadoutIndex < 0 ||
      loadoutIndex >= gearData._loadouts.length
    ) {
      return [];
    }

    const loadout = gearData._loadouts[loadoutIndex];
    const items = loadout._gear ?? [];

    return items.map((g) => ({
      defId: g._gearDefinitionHashId,
      variantIndex: g._variantIndex,
      multiplier: Math.fround(g._multiplier),
    }));
  }

  /**
   * Parse world tier from save file
   * Maps numeric index to world tier key
   * Returns "Normal" as fallback for missing/invalid values
   */
  parseWorldTier(saveData: unknown): string {
    const data = saveData as SaveFile;
    const worldTierIndex = data.worldTier;

    // Map index to world tier key
    const WORLD_TIER_MAP: Record<number, string> = {
      0: "Normal",
      1: "Abyss",
      2: "Oblivion",
      3: "Void",
    };

    if (worldTierIndex === undefined || worldTierIndex === null) {
      return "Normal"; // Default fallback
    }

    return WORLD_TIER_MAP[worldTierIndex] ?? "Normal";
  }

  /**
   * Parse bell skill tree node allocations
   * Returns only allocated nodes (level > 0)
   */
  parseBells(saveData: unknown): ParsedBell[] {
    const data = saveData as SaveFile;
    const bellData = data.greatBellSkillTreeData as
      | SaveFileBellSkillTree
      | undefined;

    if (!bellData) return [];

    const parsed: ParsedBell[] = [];

    for (const node of bellData._skillTreeNodes) {
      // Only include allocated nodes (level > 0)
      if (node._upgradeLevel > 0) {
        parsed.push({
          bellId: bellData._skillTreeHashId,
          nodeGuid: node._nodeDefinitionGuid,
          level: node._upgradeLevel,
        });
      }
    }

    return parsed;
  }
}

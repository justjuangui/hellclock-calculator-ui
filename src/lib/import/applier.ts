/**
 * Import Applier
 * Applies validated parsed data to context APIs
 */

import type { SkillsHelper, SkillSlotDefinition } from "$lib/hellclock/skills";
import type {
  RelicsHelper,
  RelicItem,
  RelicAffix,
  RelicConfiguration,
  RelicRarity,
} from "$lib/hellclock/relics";
import type { SkillEquippedAPI } from "$lib/context/skillequipped.svelte";
import type { RelicInventoryAPI } from "$lib/context/relicequipped.svelte";
import type { ConstellationEquippedAPI } from "$lib/context/constellationequipped.svelte";
import type {
  ParsedSkill,
  ParsedRelic,
  ParsedConstellation,
  ParsedAffix,
} from "./types";

// Skill slot index to slot definition mapping
const SLOT_MAP: Record<number, SkillSlotDefinition> = {
  0: "SKILL_SLOT_1",
  1: "SKILL_SLOT_2",
  2: "SKILL_SLOT_3",
  3: "SKILL_SLOT_4",
  4: "SKILL_SLOT_5",
};

// Relic rarity enum mapping (save file enum to calculator string)
const RARITY_MAP: Record<number, string> = {
  0: "Common",
  1: "Magic",
  2: "Rare",
};

export class ImportApplier {
  constructor(
    private skillsHelper: SkillsHelper,
    private relicsHelper: RelicsHelper,
  ) {}

  /**
   * Apply skills to the skill equipped context
   */
  applySkills(skills: ParsedSkill[], api: SkillEquippedAPI): number {
    // Clear existing skills
    api.clear();

    let appliedCount = 0;

    for (const parsed of skills) {
      const slotDef = SLOT_MAP[parsed.slotIndex];
      if (!slotDef) continue;

      const skill = this.skillsHelper.getSkillById(parsed.skillId);
      if (!skill) continue;

      // Cap level to max available
      const maxLevel = this.skillsHelper.getMaxSkillLevel();
      const level = Math.min(parsed.level + 1, maxLevel);

      api.set(slotDef, {
        skill,
        selectedLevel: level,
      });

      appliedCount++;
    }

    return appliedCount;
  }

  /**
   * Apply relics to the relic inventory context
   */
  applyRelics(relics: ParsedRelic[], api: RelicInventoryAPI): number {
    // Clear existing relics
    api.clear();

    let appliedCount = 0;

    // Set max tier to accommodate all relics
    api.setTier(4);

    // Get inventory shape height for Y coordinate flipping
    const inventoryShape = this.relicsHelper.getPlayerInventoryShapeByTier(4);
    const gridHeight = inventoryShape?.height || 6;

    for (const parsed of relics) {
      const relicItem = this.createRelicItem(parsed);
      if (!relicItem) continue;

      // Flip Y coordinate (save uses bottom-up, UI uses top-down)
      const flippedY = gridHeight - parsed.position.y - relicItem.height;
      const success = api.placeRelic(relicItem, parsed.position.x, flippedY);
      if (success) {
        appliedCount++;
      }
    }

    return appliedCount;
  }

  /**
   * Create a RelicItem from parsed data
   */
  private createRelicItem(parsed: ParsedRelic): RelicItem | null {
    // Find base definition
    const relicDefs = this.relicsHelper.getRelicDefinitions();
    const baseDef = relicDefs.find((r) => r.id === parsed.baseId);
    if (!baseDef) return null;

    // Get size config
    const sizeConfig = this.relicsHelper.getRelicSizeConfig(baseDef.eRelicSize);

    // Map rarity - unique relics always have "Unique" rarity
    const rarity: RelicRarity =
      baseDef.type === "UniqueRelicBaseDefinition"
        ? "Unique"
        : ((RARITY_MAP[parsed.rarity] || "Common") as RelicRarity);

    // Use createDefaultConfiguration to get proper affix structure
    const config = this.relicsHelper.createDefaultConfiguration(
      baseDef,
      rarity,
      parsed.tier,
      parsed.upgradeLevel,
    );

    // Split affixes into primary/secondary/special using config's available affixes
    // For Rare/Unique, first affix from _affixesData is the special affix
    const {
      primaryAffixes,
      secondaryAffixes,
      specialAffix,
      primaryValues,
      secondaryValues,
      specialValues,
    } = this.categorizeAffixesFromConfig(parsed.affixes, config, rarity);

    // Process implicit affixes (devotion, corruption) using config
    // Categories 0-2 → devotion, Category 3 → corruption
    const { devotionAffix, corruptionAffix, implicitValues, corruptionValues } =
      this.processImplicitAffixesFromConfig(parsed.implicitAffixes);

    // Get sprite and name using helper methods
    const sprite = this.relicsHelper.getRelicSpriteUrl(baseDef, parsed.tier);
    const name = this.relicsHelper.getRelicDisplayName(
      baseDef,
      "en",
      specialAffix,
      primaryAffixes,
      secondaryAffixes,
    );

    return {
      id: `imported-${baseDef.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name,
      size: baseDef.eRelicSize,
      tier: parsed.tier,
      rank: parsed.upgradeLevel,
      rarity,
      sprite,
      width: sizeConfig?.relicInventoryShape.width || 1,
      height: sizeConfig?.relicInventoryShape.height || 1,
      imbuedType: "None",
      selectedPrimaryAffixes: primaryAffixes,
      selectedSecondaryAffixes: secondaryAffixes,
      selectedDevotionAffix: devotionAffix,
      selectedCorruptionAffix: corruptionAffix,
      selectedSpecialAffix: specialAffix,
      primaryAffixValues: primaryValues,
      secondaryAffixValues: secondaryValues,
      implicitAffixValues: implicitValues,
      corruptionAffixValues: corruptionValues,
      specialAffixValues: specialValues,
    };
  }

  /**
   * Categorize affixes into primary/secondary/special using config's available affixes
   * For Rare/Unique relics, the first affix in _affixesData is the special affix
   */
  private categorizeAffixesFromConfig(
    affixes: ParsedAffix[],
    config: RelicConfiguration,
    rarity: RelicRarity,
  ): {
    primaryAffixes: RelicAffix[];
    secondaryAffixes: RelicAffix[];
    specialAffix?: RelicAffix;
    primaryValues: Record<number, number>;
    secondaryValues: Record<number, number>;
    specialValues: Record<number, number>;
  } {
    const primaryAffixes: RelicAffix[] = [];
    const secondaryAffixes: RelicAffix[] = [];
    let specialAffix: RelicAffix | undefined;
    const primaryValues: Record<number, number> = {};
    const secondaryValues: Record<number, number> = {};
    const specialValues: Record<number, number> = {};

    // Get primary and secondary IDs from config's available affixes
    const primaryIds = new Set(
      config.availablePrimaryAffixes?.map((a) => a.id) ?? [],
    );
    const secondaryIds = new Set(
      config.availableSecondaryAffixes?.map((a) => a.id) ?? [],
    );

    // For Rare/Unique: first affix is the special affix
    const affixesToProcess = [...affixes];
    if (
      (rarity === "Rare" || rarity === "Unique") &&
      affixesToProcess.length > 0
    ) {
      const firstParsed = affixesToProcess.shift()!;
      const affix = this.relicsHelper.getRelicAffixById(firstParsed.affixId);
      if (affix) {
        specialAffix = affix;
        specialValues[affix.id] = Math.min(firstParsed.rollValue / 1.2, 1);
      }
    }

    // Remaining affixes go to primary/secondary based on pool membership
    for (const parsed of affixesToProcess) {
      const affix = this.relicsHelper.getRelicAffixById(parsed.affixId);
      if (!affix) continue;

      // Normalize roll value (save uses 0-1.2 range, we store as 0-1)
      const normalizedValue = Math.min(parsed.rollValue / 1.2, 1);

      if (primaryIds.has(parsed.affixId)) {
        primaryAffixes.push(affix);
        primaryValues[affix.id] = normalizedValue;
      } else if (secondaryIds.has(parsed.affixId)) {
        secondaryAffixes.push(affix);
        secondaryValues[affix.id] = normalizedValue;
      } else {
        // Default to secondary if not found in available pools
        secondaryAffixes.push(affix);
        secondaryValues[affix.id] = normalizedValue;
      }
    }

    return {
      primaryAffixes,
      secondaryAffixes,
      specialAffix,
      primaryValues,
      secondaryValues,
      specialValues,
    };
  }

  /**
   * Process implicit affixes (devotion, corruption) using config
   * Categories 0-2 (FuryImbued, FaithImbued, DisciplineImbued) → devotion
   * Category 3 (Corrupted) → corruption
   * Note: Special affixes come from _affixesData, not _implicitAffixesData
   */
  private processImplicitAffixesFromConfig(
    implicitAffixes: ParsedRelic["implicitAffixes"],
  ): {
    devotionAffix?: RelicAffix;
    corruptionAffix?: RelicAffix;
    implicitValues: Record<number, number>;
    corruptionValues: Record<number, number>;
  } {
    let devotionAffix: RelicAffix | undefined;
    let corruptionAffix: RelicAffix | undefined;
    const implicitValues: Record<number, number> = {};
    const corruptionValues: Record<number, number> = {};

    for (const implicit of implicitAffixes) {
      const affix = this.relicsHelper.getRelicAffixById(implicit.affix.affixId);
      if (!affix) continue;

      const normalizedValue = Math.min(implicit.affix.rollValue / 1.2, 1);
      const category = implicit.category;

      if (category === 3) {
        // Corrupted
        corruptionAffix = affix;
        corruptionValues[affix.id] = normalizedValue;
      } else if (category >= 0 && category <= 2) {
        // FuryImbued (0), FaithImbued (1), DisciplineImbued (2) → devotion
        devotionAffix = affix;
        implicitValues[affix.id] = normalizedValue;
      }
    }

    return {
      devotionAffix,
      corruptionAffix,
      implicitValues,
      corruptionValues,
    };
  }

  /**
   * Apply constellations to the constellation equipped context
   * Delegates to the API's importNodes method which handles tick() for reactivity
   */
  applyConstellations(
    nodes: ParsedConstellation[],
    api: ConstellationEquippedAPI,
  ): number {
    // Transform parsed nodes to the format expected by importNodes
    const nodesToImport = nodes.map((parsed) => ({
      constellationId: parsed.constellationId,
      nodeId: parsed.nodeGuid,
      level: parsed.level,
    }));

    return api.importNodes(nodesToImport);
  }
}

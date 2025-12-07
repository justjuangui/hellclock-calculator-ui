/**
 * Code adapter for importing from exported build codes
 * Handles the base64 encoded binary format
 */

import type { ImportAdapter } from "./base";
import type {
  ParsedSkill,
  ParsedRelic,
  ParsedConstellation,
  ParsedGear,
  ParsedBell,
  ParsedAffix,
  ParsedImplicitAffix,
  RelicLoadoutSummary,
  GearLoadoutSummary,
} from "../types";
import {
  decodeBuild,
  isExportCode,
  type SerializableBuild,
  type SerializableRelic,
  type SerializableAffix,
} from "$lib/export";
import { RARITY_REVERSE } from "$lib/export/format";

// World tier index to key mapping
const WORLD_TIER_KEYS: Record<number, string> = {
  0: "Normal",
  1: "Abyss",
  2: "Oblivion",
  3: "Void",
};

/**
 * Code adapter - imports from base64 export codes
 */
export class CodeAdapter implements ImportAdapter {
  readonly version = -1; // Special version for code imports

  private cachedBuild: SerializableBuild | null = null;

  /**
   * Check if this adapter can handle the given data
   */
  canHandle(data: unknown): boolean {
    if (typeof data !== "string") {
      return false;
    }
    return isExportCode(data);
  }

  /**
   * Decode and cache the build
   */
  private getBuild(data: unknown): SerializableBuild | null {
    if (typeof data !== "string") {
      return null;
    }

    // Use cached build if available
    if (this.cachedBuild) {
      return this.cachedBuild;
    }

    const result = decodeBuild(data);
    if (result.success && result.build) {
      this.cachedBuild = result.build;
      return result.build;
    }

    return null;
  }

  /**
   * Clear cached build (call when switching data sources)
   */
  clearCache(): void {
    this.cachedBuild = null;
  }

  /**
   * Parse skill slots and levels
   */
  parseSkills(data: unknown): ParsedSkill[] {
    const build = this.getBuild(data);
    if (!build?.skills) return [];

    return build.skills.map((skill) => ({
      slotIndex: skill.slotIndex,
      skillId: skill.skillId,
      level: skill.level,
    }));
  }

  /**
   * Get relic loadout summary
   * Code imports only have one "loadout" - the exported data
   */
  getRelicLoadouts(data: unknown): RelicLoadoutSummary[] {
    const build = this.getBuild(data);
    if (!build?.relics) return [];

    return [
      {
        index: 0,
        relicCount: build.relics.relics.length,
        isCurrentInGame: true, // Always "current" for code imports
      },
    ];
  }

  /**
   * Parse relics from the export
   * loadoutIndex is ignored since code exports only have one set
   */
  parseRelics(data: unknown, _loadoutIndex: number): ParsedRelic[] {
    const build = this.getBuild(data);
    if (!build?.relics) return [];

    return build.relics.relics.map((relic) =>
      this.convertRelic(relic, build.relics!.tier),
    );
  }

  /**
   * Convert a SerializableRelic to ParsedRelic
   */
  private convertRelic(relic: SerializableRelic, inventoryTier: number): ParsedRelic {
    const affixes: ParsedAffix[] = [];
    const implicitAffixes: ParsedImplicitAffix[] = [];

    // Convert special affixes (first in the affix list for Rare/Unique)
    for (const affix of relic.specialAffixes) {
      affixes.push(this.convertAffix(affix, relic.tier));
    }

    // Convert primary affixes
    for (const affix of relic.primaryAffixes) {
      affixes.push(this.convertAffix(affix, relic.tier));
    }

    // Convert secondary affixes
    for (const affix of relic.secondaryAffixes) {
      affixes.push(this.convertAffix(affix, relic.tier));
    }

    // Convert devotion affix (implicit, categories 0-2)
    if (relic.devotionAffix) {
      // Use category 0 for devotion (FuryImbued)
      // The actual category would need the relic definition to determine
      implicitAffixes.push({
        category: 0, // Default to Fury, applier will handle correctly
        affix: this.convertAffix(relic.devotionAffix, relic.tier),
      });
    }

    // Convert corruption affix (implicit, category 3)
    if (relic.corruptionAffix) {
      implicitAffixes.push({
        category: 3, // Corruption category
        affix: this.convertAffix(relic.corruptionAffix, relic.tier),
      });
    }

    return {
      baseId: relic.baseId,
      tier: relic.tier,
      rarity: relic.rarity,
      upgradeLevel: relic.rank,
      position: { x: relic.x, y: relic.y },
      affixes,
      implicitAffixes,
      isCorrupted: relic.isCorrupted,
      ascended: false, // Not tracked in export format
    };
  }

  /**
   * Convert a SerializableAffix to ParsedAffix
   */
  private convertAffix(affix: SerializableAffix, tier: number): ParsedAffix {
    return {
      affixId: affix.id,
      rollValue: affix.roll,
      tier,
      locked: false, // Not tracked in export format
    };
  }

  /**
   * Parse constellation allocations
   */
  parseConstellations(data: unknown): ParsedConstellation[] {
    const build = this.getBuild(data);
    if (!build?.constellations) return [];

    return build.constellations.nodes.map((node) => ({
      constellationId: node.constellationId,
      nodeGuid: node.nodeGuid,
      level: node.level,
    }));
  }

  /**
   * Get gear loadout summary
   * Code imports only have one "loadout" - the exported data
   */
  getGearLoadouts(data: unknown): GearLoadoutSummary[] {
    const build = this.getBuild(data);
    const gearCount = (build?.blessedGear?.length ?? 0) + (build?.trinketGear?.length ?? 0);

    if (gearCount === 0) return [];

    return [
      {
        index: 0,
        gearCount,
        isCurrentInGame: true,
      },
    ];
  }

  /**
   * Parse gear from the export
   * loadoutIndex is ignored since code exports only have one set
   * Note: Returns only blessed gear, as that's what the import system expects
   */
  parseGear(data: unknown, _loadoutIndex: number): ParsedGear[] {
    const build = this.getBuild(data);
    if (!build?.blessedGear) return [];

    return build.blessedGear.map((gear) => ({
      defId: gear.defId,
      variantIndex: gear.variantIndex,
      multiplier: gear.multiplier,
    }));
  }

  /**
   * Parse world tier
   */
  parseWorldTier(data: unknown): string {
    const build = this.getBuild(data);
    if (build?.worldTier === undefined) return "Normal";

    return WORLD_TIER_KEYS[build.worldTier] ?? "Normal";
  }

  /**
   * Parse bell skill tree allocations
   */
  parseBells(data: unknown): ParsedBell[] {
    const build = this.getBuild(data);
    if (!build?.bells) return [];

    return build.bells.nodes.map((node) => ({
      bellId: node.bellId,
      nodeGuid: node.nodeGuid,
      level: node.level,
    }));
  }
}

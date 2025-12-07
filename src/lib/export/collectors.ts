/**
 * Data collectors for extracting build data from context APIs
 * These functions convert the runtime context state to serializable format
 */

import type { EquippedAPI, ESlotsType } from "$lib/context/equipped.svelte";
import type { SkillEquippedAPI } from "$lib/context/skillequipped.svelte";
import type { RelicInventoryAPI } from "$lib/context/relicequipped.svelte";
import type { BellEquippedAPI } from "$lib/context/bellequipped.svelte";
import type { ConstellationEquippedAPI } from "$lib/context/constellationequipped.svelte";
import type { WorldTierEquippedAPI } from "$lib/context/worldtierequipped.svelte";
import type { GearItem, GearSlot, GearsHelper } from "$lib/hellclock/gears";
import type {
  SerializableBuild,
  SerializableGear,
  SerializableSkill,
  SerializableRelicInventory,
  SerializableRelic,
  SerializableAffix,
  SerializableBellState,
  SerializableBellNode,
  SerializableConstellationState,
  SerializableConstellationNode,
} from "./types";
import { GEAR_SLOT_MAP, SKILL_SLOT_MAP, RARITY_MAP } from "./format";

// ============================================================================
// Gear Collection
// ============================================================================

/**
 * Get the variant index for a gear item
 * Uses stored variantIndex, with fallback to sprite matching for backwards compatibility
 */
function findVariantIndex(gearItem: GearItem, gearsHelper: GearsHelper): number {
  // Use stored variant index if available
  if (gearItem.variantIndex !== undefined) {
    return gearItem.variantIndex;
  }

  // Fallback to sprite matching for backwards compatibility
  const def = gearsHelper.getGearDefinitionById(gearItem.defId);
  if (!def || !def.variants || def.variants.length === 0) {
    return 0;
  }

  if (gearItem.sprite) {
    for (let i = 0; i < def.variants.length; i++) {
      if (def.variants[i].value.sprite === gearItem.sprite) {
        return i;
      }
    }
  }

  return 0;
}

/**
 * Collect gear data from an equipped API
 */
export function collectGear(
  api: EquippedAPI,
  gearsHelper: GearsHelper,
): SerializableGear[] {
  const result: SerializableGear[] = [];

  for (const [slot, item] of Object.entries(api.equipped)) {
    if (!item) continue;

    const slotValue = GEAR_SLOT_MAP[slot as GearSlot];
    if (slotValue === undefined) continue;

    // Get the multiplier from the first mod's selectedValue
    const multiplier = item.mods[0]?.selectedValue ?? 1;
    const variantIndex = findVariantIndex(item, gearsHelper);

    result.push({
      slot: slotValue,
      defId: item.defId,
      variantIndex,
      multiplier,
    });
  }

  return result;
}

// ============================================================================
// Skills Collection
// ============================================================================

/**
 * Collect skills data from the skill equipped API
 */
export function collectSkills(api: SkillEquippedAPI): SerializableSkill[] {
  const result: SerializableSkill[] = [];

  for (const [slot, skillData] of Object.entries(api.skillsEquipped)) {
    if (!skillData) continue;

    const slotIndex = SKILL_SLOT_MAP[slot];
    if (slotIndex === undefined) continue;

    result.push({
      slotIndex,
      skillId: skillData.skill.id,
      level: skillData.selectedLevel,
    });
  }

  return result;
}

// ============================================================================
// Relics Collection
// ============================================================================

/**
 * Convert affix values record to serializable affixes
 */
function collectAffixList(
  affixes: { id: number }[] | undefined,
  values: Record<number, number> | undefined,
): SerializableAffix[] {
  if (!affixes || !values) return [];

  return affixes.map((affix) => ({
    id: affix.id,
    roll: values[affix.id] ?? 0,
  }));
}

/**
 * Collect a single affix (for devotion/corruption)
 */
function collectSingleAffix(
  affix: { id: number } | undefined,
  values: Record<number, number> | undefined,
): SerializableAffix | undefined {
  if (!affix || !values) return undefined;

  return {
    id: affix.id,
    roll: values[affix.id] ?? 0,
  };
}

/**
 * Collect relics data from the relic inventory API
 */
export function collectRelics(api: RelicInventoryAPI): SerializableRelicInventory {
  const result: SerializableRelicInventory = {
    tier: api.currentTier,
    relics: [],
  };

  // Get grid height for Y coordinate flipping
  // Export uses bottom-up Y (like save files), UI uses top-down
  const gridShape = api.getCurrentShape();
  const gridHeight = gridShape?.height || 6;

  // Get unique relics (not duplicated across grid cells)
  const uniqueRelics = api.getUniqueRelics();

  for (const relic of uniqueRelics) {
    const rarityValue = RARITY_MAP[relic.rarity] ?? 0;

    // Flip Y coordinate to match save file convention (bottom-up)
    const flippedY = gridHeight - relic.position.y - relic.height;

    const serializedRelic: SerializableRelic = {
      baseId: parseInt(relic.id.split("-")[1]) || 0, // Extract base ID from generated ID
      x: relic.position.x,
      y: flippedY,
      tier: relic.tier,
      rank: relic.rank,
      rarity: rarityValue,
      isCorrupted: relic.selectedCorruptionAffix !== undefined,
      specialAffixes: collectAffixList(
        relic.selectedSpecialAffix ? [relic.selectedSpecialAffix] : [],
        relic.specialAffixValues,
      ),
      primaryAffixes: collectAffixList(
        relic.selectedPrimaryAffixes,
        relic.primaryAffixValues,
      ),
      secondaryAffixes: collectAffixList(
        relic.selectedSecondaryAffixes,
        relic.secondaryAffixValues,
      ),
      devotionAffix: collectSingleAffix(
        relic.selectedDevotionAffix,
        relic.implicitAffixValues,
      ),
      corruptionAffix: collectSingleAffix(
        relic.selectedCorruptionAffix,
        relic.corruptionAffixValues,
      ),
    };

    result.relics.push(serializedRelic);
  }

  return result;
}

// ============================================================================
// Bells Collection
// ============================================================================

/**
 * Collect bells data from the bell equipped API
 */
export function collectBells(api: BellEquippedAPI): SerializableBellState {
  const nodes: SerializableBellNode[] = [];

  // Iterate through allocated nodes
  for (const [key, node] of api.allocatedNodes.entries()) {
    // Key format is "bellId:nodeId"
    const [bellIdStr] = key.split(":");
    const bellId = parseInt(bellIdStr);

    nodes.push({
      bellId,
      nodeGuid: node.nodeId,
      level: node.level,
    });
  }

  return {
    activeBellId: api.activeBellId,
    nodes,
  };
}

// ============================================================================
// Constellations Collection
// ============================================================================

/**
 * Collect constellations data from the constellation equipped API
 */
export function collectConstellations(
  api: ConstellationEquippedAPI,
): SerializableConstellationState {
  const nodes: SerializableConstellationNode[] = [];

  // Iterate through allocated nodes
  for (const node of api.allocatedNodes.values()) {
    nodes.push({
      constellationId: node.constellationId,
      nodeGuid: node.nodeId,
      level: node.level,
    });
  }

  return { nodes };
}

// ============================================================================
// World Tier Collection
// ============================================================================

/**
 * World tier name to index mapping
 */
const WORLD_TIER_INDEX: Record<string, number> = {
  Normal: 0,
  Abyss: 1,
  Oblivion: 2,
  Void: 3,
};

/**
 * Collect world tier data from the world tier API
 */
export function collectWorldTier(api: WorldTierEquippedAPI): number {
  if (!api.selectedWorldTier) return 0;

  // Extract tier name from the worldTierHash or name
  const tierKey = api.worldTierHash || "Normal";
  return WORLD_TIER_INDEX[tierKey] ?? 0;
}

// ============================================================================
// Full Build Collection
// ============================================================================

export type CollectorContext = {
  blessedGearApi: EquippedAPI;
  trinketGearApi: EquippedAPI;
  skillApi: SkillEquippedAPI;
  relicApi: RelicInventoryAPI;
  bellApi: BellEquippedAPI;
  constellationApi: ConstellationEquippedAPI;
  worldTierApi: WorldTierEquippedAPI;
  gearsHelper: GearsHelper;
};

/**
 * Collect all build data from context APIs
 */
export function collectBuild(ctx: CollectorContext): SerializableBuild {
  const build: SerializableBuild = {};

  // Collect gear
  const blessedGear = collectGear(ctx.blessedGearApi, ctx.gearsHelper);
  if (blessedGear.length > 0) {
    build.blessedGear = blessedGear;
  }

  const trinketGear = collectGear(ctx.trinketGearApi, ctx.gearsHelper);
  if (trinketGear.length > 0) {
    build.trinketGear = trinketGear;
  }

  // Collect skills
  const skills = collectSkills(ctx.skillApi);
  if (skills.length > 0) {
    build.skills = skills;
  }

  // Collect relics
  const relics = collectRelics(ctx.relicApi);
  if (relics.relics.length > 0) {
    build.relics = relics;
  }

  // Collect bells
  const bells = collectBells(ctx.bellApi);
  if (bells.nodes.length > 0) {
    build.bells = bells;
  }

  // Collect constellations
  const constellations = collectConstellations(ctx.constellationApi);
  if (constellations.nodes.length > 0) {
    build.constellations = constellations;
  }

  // Always include world tier
  build.worldTier = collectWorldTier(ctx.worldTierApi);

  return build;
}

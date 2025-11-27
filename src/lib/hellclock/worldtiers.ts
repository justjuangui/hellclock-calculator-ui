import { translate, type LangText } from "$lib/hellclock/lang";

// Stat modifier type for world tier effects
export type WorldTierStatModifier = {
  type: string;
  eStatDefinition: string;
  modifierType: "Additive" | "Multiplicative";
  value: number;
};

// Increment modifier type (e.g., HellClockTimerIncrease)
export type WorldTierIncrementModifier = {
  type: string;
  eCharacterIncrement: string;
  modifierType: "Additive" | "Multiplicative";
  value: number;
};

// World tier configuration
export type WorldTier = {
  name: string;
  type: string;
  worldSheetScaling: object;
  regularWorldSheetScaling: object;
  playerStatModifiers: WorldTierStatModifier[];
  playerIncrementModifiers: WorldTierIncrementModifier[];
  additionalEliteAffixAmount: number;
  worldTierRomanNumber: string;
  worldTierLocalizationKey: LangText[];
  worldTierColor: string;
};

// Root type for the JSON structure
export type WorldTiersRoot = {
  "World Tiers": WorldTier[];
};

export class WorldTiersHelper {
  private worldTiersRoot: WorldTiersRoot;

  constructor(worldTiersRoot: WorldTiersRoot) {
    this.worldTiersRoot = worldTiersRoot;
  }

  /**
   * Get all world tiers
   */
  getAllWorldTiers(): WorldTier[] {
    return this.worldTiersRoot["World Tiers"];
  }

  /**
   * Derive the world tier key from the tier name
   * e.g., "Normal World Tier Config" → "Normal"
   */
  getWorldTierKey(tier: WorldTier): string {
    // Extract the first word from the name (e.g., "Normal World Tier Config" → "Normal")
    return tier.name.split(" ")[0];
  }

  /**
   * Get a world tier by its key
   */
  getWorldTierByKey(key: string): WorldTier | undefined {
    return this.worldTiersRoot["World Tiers"].find(
      (tier) => this.getWorldTierKey(tier) === key,
    );
  }

  /**
   * Get the default world tier (Normal / Tier I)
   */
  getDefaultWorldTier(): WorldTier {
    return (
      this.worldTiersRoot["World Tiers"].find(
        (tier) => this.getWorldTierKey(tier) === "Normal",
      ) ?? this.worldTiersRoot["World Tiers"][0]
    );
  }

  /**
   * Get the localized name for a world tier
   */
  getLocalizedName(tier: WorldTier, langCode?: string): string {
    return translate(tier.worldTierLocalizationKey, langCode);
  }
}

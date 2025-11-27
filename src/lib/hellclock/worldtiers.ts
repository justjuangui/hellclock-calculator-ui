export type WorldTierStatModifier = {
  statDefinition: string;
  statDefinitionInt: number;
  modifierType: "Additive" | "Multiplicative";
  modifierTypeInt: number;
  value: number;
  isMultiplicativeBelowOne: boolean;
};

export type WorldTier = {
  worldTierKey: string;
  configName: string;
  worldTierRomanNumber: string;
  worldTierLocalizationKey: string;
  playerStatModifiers: WorldTierStatModifier[];
};

export type WorldTiersRoot = {
  worldTiers: WorldTier[];
};

export class WorldTiersHelper {
  private worldTiersRoot: WorldTiersRoot;

  constructor(worldTiersRoot: WorldTiersRoot) {
    this.worldTiersRoot = worldTiersRoot;
  }

  getAllWorldTiers(): WorldTier[] {
    return this.worldTiersRoot.worldTiers;
  }

  getWorldTierByKey(key: string): WorldTier | undefined {
    return this.worldTiersRoot.worldTiers.find(
      (tier) => tier.worldTierKey === key,
    );
  }

  getDefaultWorldTier(): WorldTier {
    // Normal is the default tier (Tier I)
    return (
      this.worldTiersRoot.worldTiers.find(
        (tier) => tier.worldTierKey === "Normal",
      ) ?? this.worldTiersRoot.worldTiers[0]
    );
  }
}

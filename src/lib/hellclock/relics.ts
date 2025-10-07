import { type LangText, translate } from "$lib/hellclock/lang";
import type {
  StatMod,
  StatModifierType,
  StatsHelper,
} from "$lib/hellclock/stats";
import {
  formatSkillEffectVariableModNumber,
  formatStatModNumber,
} from "$lib/hellclock/formats";
import {
  formatHCStyle,
  formatIndexed,
  parseRGBA01ToCss,
  type TooltipLine,
} from "$lib/hellclock/utils";
import type { SkillsHelper } from "$lib/hellclock/skills";

export type RelicSize = "Small" | "Large" | "Exalted" | "Grand";
export type RelicRarity = "Common" | "Magic" | "Rare" | "Unique";
export type RelicImbuedType =
  | "None"
  | "FuryImbued"
  | "DisciplineImbued"
  | "FaithImbued"
  | "Corrupted";

export type TierCategoryRollRange = {
  type: "TierCategoryRollRange";
  tier: number;
  rollRange: [number, number];
};

export type WeightedAffixReference = {
  weight: number;
  value: {
    name: string;
    id: number;
    type: string;
  };
};

export type RelicInventoryShape = {
  type: "RelicInventoryShape";
  width: number;
  height: number;
  shape: boolean[];
};

export type RelicBaseDefinition = {
  name: string;
  id: number;
  type: "RelicBaseDefinition" | "UniqueRelicBaseDefinition";
  eRelicSize: RelicSize;
  primaryAffixAmount: [number, number];
  primaryAffixPool: WeightedAffixReference[];
  secondaryAffixAmount: [number, number];
  secondaryAffixPool: WeightedAffixReference[];
  sprite?: string;
  nameLocalizationKey?: LangText[];
  intrinsicAffixes?: RelicAffix[];
};

export type AffixSkillDefinition = {
  id: number;
  name: string;
};

export type VariableFormat =
  | "Multiplicative"
  | "NoFormat"
  | "Rounded"
  | "Percentage"
  | "MultiplicativeAdditive";

export type SkillEffectVariableReference = {
  type: "SkillEffectVariableReference";
  valueOrName: string;
  eSkillEffectVariableModifier: string;
  statusToStack: Record<string, any>;
  supportVariableValueOrName: string;
  supportESkillEffectVariableModifier: string;
  supportStatusToStack: Record<string, any>;
};

export type SkillEffectVariable = {
  type: "SkillEffectVariable";
  name: string;
  baseValue: number;
  eSkillEffectVariableStackType: string;
  eSkillEffectVariableFormat: VariableFormat;
};

export type SkillEffectVariables = {
  type: "SkillEffectVariables";
  variables: SkillEffectVariable[];
};

export type SkillBehaviorLocalizationVariable = {
  type: "SkillBehaviorLocalizationVariable";
  skillEffectVariableReference: SkillEffectVariableReference;
  overrideFormat: boolean;
  valueFormatOverride: VariableFormat;
};

export type SkillEffectRuleSet = {
  type: "SkillEffectRuleSet";
  rules: any[]; // Could be expanded with specific rule types if needed
};

export type SkillEffectAreaValueOverride = {
  type: "SkillEffectAreaValueOverride";
  valueKey: string;
  value: SkillEffectVariableReference;
};

export type ModifierType =
  | "Additive"
  | "Multiplicative"
  | "MultiplicativeAdditive";

export type SkillEffectSkillModifierDefinition = {
  type: "SkillEffectSkillModifierDefinition";
  skillValueModifierKey: string;
  modifierType: ModifierType;
  value: SkillEffectVariableReference;
  useStatConversion: boolean;
  conversionStatDefinition: string;
  listenToVariableModifiersUpdate: boolean;
};

export type SkillEffectStatModifierDefinition = {
  type: "SkillEffectStatModifierDefinition";
  eStatDefinition: string;
  modifierType: ModifierType;
  value: SkillEffectVariableReference;
  useStatConversion: boolean;
  conversionStatDefinition: string;
  listenToVariableModifiersUpdate: boolean;
};

export type StatusDefinition = {
  name: string;
  id: number;
  type: string;
};

// Base interface for all skill effects
export type BaseSkillEffect = {
  name: string;
  type: string;
  useCharacterEffectTrigger: boolean;
  effectTrigger: string;
  characterEffectTrigger: string;
  ruleSet: SkillEffectRuleSet;
  revertOnRuleFail: boolean;
  triggerTargetValue: SkillEffectVariableReference;
  triggerTargetEnumValue: number;
  triggerTargetStringValue: string;
  subEffects: any[];
};

export type PlaceEffectAreaSkillEffectData = BaseSkillEffect & {
  type: "PlaceEffectAreaSkillEffectData";
  effectTarget: string;
  parentToTarget: boolean;
  useSkillRadius: boolean;
  useSkillAsSource: boolean;
  useSkillDamage: boolean;
  effectAreaConfig: string;
  effectAreaValueOverrides: SkillEffectAreaValueOverride[];
};

export type AddSkillValueModifierSkillEffectData = BaseSkillEffect & {
  type: "AddSkillValueModifierSkillEffectData";
  modifiers: SkillEffectSkillModifierDefinition[];
};

export type RegenSkillEffectData = BaseSkillEffect & {
  type: "RegenSkillEffectData";
  eStatRegen: "Life" | "Mana";
  regenValue: SkillEffectVariableReference;
  eRegenSourceValue: string;
};

export type AddStatusToTargetSkillEffectData = BaseSkillEffect & {
  type: "AddStatusToTargetSkillEffectData";
  removeOnEffectReversion: boolean;
  effectTarget: string;
  statusDefinition: StatusDefinition;
  statusDuration: SkillEffectVariableReference;
  statusIntensity: SkillEffectVariableReference;
  stackAmount: SkillEffectVariableReference;
};

export type AddSkillStatModifierSkillEffectData = BaseSkillEffect & {
  type: "AddSkillStatModifierSkillEffectData";
  modifiers: any[]; // Could be expanded with specific modifier types
};

export type AddCharacterStatModifierSkillEffectData = BaseSkillEffect & {
  type: "AddCharacterStatModifierSkillEffectData";
  modifiers: any[]; // Could be expanded with specific modifier types
};

export type DamageTargetSkillEffectData = BaseSkillEffect & {
  type: "DamageTargetSkillEffectData";
  damageValue: SkillEffectVariableReference;
  damageType: string;
  effectTarget: string;
};

export type RemoveStatusFromTargetSkillEffectData = BaseSkillEffect & {
  type: "RemoveStatusFromTargetSkillEffectData";
  statusDefinition: StatusDefinition;
  effectTarget: string;
};

export type AddEffectAreaEffectData = BaseSkillEffect & {
  type: "AddEffectAreaEffectData";
  effectAreaDefinition: any;
  overrideLayerMask: boolean;
  layerMask: string;
  effectAreaValueOverrides: SkillEffectAreaValueOverride[];
};

export type PlayGameplayFxSkillEffectData = BaseSkillEffect & {
  type: "PlayGameplayFxSkillEffectData";
  fxPrefab: string;
  effectTarget: string;
};

export type AddBarrierSkillEffectData = BaseSkillEffect & {
  type: "AddBarrierSkillEffectData";
  barrierValue: SkillEffectVariableReference;
  effectTarget: string;
};

export type DrainTargetResourceSkillEffectData = BaseSkillEffect & {
  type: "DrainTargetResourceSkillEffectData";
  resourceType: string;
  drainValue: SkillEffectVariableReference;
  effectTarget: string;
};

// Union type for all possible skill effects
export type SkillEffect =
  | PlaceEffectAreaSkillEffectData
  | AddSkillValueModifierSkillEffectData
  | RegenSkillEffectData
  | AddStatusToTargetSkillEffectData
  | AddSkillStatModifierSkillEffectData
  | AddCharacterStatModifierSkillEffectData
  | DamageTargetSkillEffectData
  | RemoveStatusFromTargetSkillEffectData
  | AddEffectAreaEffectData
  | PlayGameplayFxSkillEffectData
  | AddBarrierSkillEffectData
  | DrainTargetResourceSkillEffectData;

export type SkillBehaviorData = {
  type: "SkillBehaviorData";
  affectMultipleSkills: boolean;
  useListOfSkills: boolean;
  listOfSkills: any[];
  skillTagFilter: string;
  skillDefinition: {
    name: string;
    id: number;
    type: string;
  };
  variables: SkillEffectVariables;
  effects: SkillEffect[];
};

export type RelicAffix = {
  name: string;
  id: number;
  type:
    | "RegenOnKillAffixDefinition"
    | "StatModifierAffixDefinition"
    | "SkillLevelAffixDefinition"
    | "StatusMaxStacksAffixDefinition"
    | "SkillBehaviorAffixDefinition";
  eStatRegen?: "Life" | "Mana";
  flatRegen?: boolean;
  customIcon?: string;
  tierRollRanges: TierCategoryRollRange[];
  nameLocalizationKey: LangText[];
  description?: LangText[];
  statModifiersDefinitions?: StatMod[];
  eSkillType?: string;
  skillLevelModifier?: number;
  eAffixRarity?: "Common" | "Special" | "Unique";
  blockCraftOnRelicSizes?: string;
  eStatusType?: string;
  stackModifier?: number;
  eStatDefinition?: string;
  statModifierType?: StatModifierType;
  skillDefinition?: AffixSkillDefinition;
  // SkillBehaviorAffixDefinition specific fields
  rollVariableName?: string;
  descriptionValuePrefix?: string;
  additionalLocalizationVariables?: SkillBehaviorLocalizationVariable[];
  behaviorData?: SkillBehaviorData;
};

export type RelicSizeConfig = {
  name: string;
  type: "RelicSizeConfig";
  relicInventoryShape: RelicInventoryShape;
  backgroundSprite: string;
  implicitAffixPool: Record<RelicImbuedType, WeightedAffixReference[]>;
};

export type RelicRarityConfig = {
  type: "RelicRarityConfig";
  eRelicRarity: RelicRarity;
  additionalPrimaryAffixAmount: Record<RelicSize, [number, number]>;
  additionalSecondaryAffixAmount: Record<RelicSize, [number, number]>;
  rarityNameKey: LangText[];
  color: string;
  secondaryColor: string;
};

export type RelicTierConfig = {
  type: "RelicTierConfig";
  tier: number;
  backgroundColor: string;
  background: string;
  spritePerSize: Record<RelicSize, string>;
};

export type RelicUpgradeModifierConfig = {
  name: string;
  type: "RelicUpgradeModifierConfig";
  modifierType: "Multiplicative";
  upgradeModifier: Record<string, number>;
};

export type RelicAffixIcons = {
  type: "RelicAffixIcons";
  defaultIcon: string;
  lockedIcon: string;
  implicitIcon: string;
};

export type RelicInventoryConfig = {
  name: "RelicInventoryConfig";
  type: "RelicInventoryConfig";
  playerInventoryShapeTiers: RelicInventoryShape[];
  externalInventoryWidth: number;
  externalInventoryHeight: number;
  relicSizeConfigs: Record<RelicSize, RelicSizeConfig>;
  maxUpgradeLevel: number;
  maxRoll: number;
  relicUpgradeDisassembleRefundMultiplier: number;
  relicUpgradeCost: number[];
  defaultRelicUpgradeModifier: RelicUpgradeModifierConfig;
  relicRarityConfigs: RelicRarityConfig[];
  relicTierConfigs: RelicTierConfig[];
  relicAffixIcons: RelicAffixIcons;
  startPages: number;
  pagePrice: number;
  relicDisassembleValueMultiplierPerTier: number[];
  relicShopCostMultiplierPerTier: number[];
  nonUniqueRelicDisassembleValuePerAffix: number;
};

export type RelicsDB = {
  Relics: RelicBaseDefinition[];
};

export type RelicAffixesDB = {
  "Relic Affixes": RelicAffix[];
};

export class RelicsHelper {
  private relicsDB: RelicsDB;
  private relicInventoryConfig: RelicInventoryConfig;
  private relicAffixesDB: RelicAffixesDB;

  constructor(
    relicsDB: RelicsDB,
    relicInventoryConfig: RelicInventoryConfig,
    relicAffixesDB: RelicAffixesDB,
  ) {
    this.relicsDB = relicsDB;
    this.relicInventoryConfig = relicInventoryConfig;
    this.relicAffixesDB = relicAffixesDB;
  }

  /**
   * Get the player inventory shape tiers (5 different inventory shapes)
   */
  getPlayerInventoryShapeTiers(): RelicInventoryShape[] {
    return this.relicInventoryConfig.playerInventoryShapeTiers;
  }

  /**
   * Get a specific player inventory shape by tier (0-4)
   */
  getPlayerInventoryShapeByTier(tier: number): RelicInventoryShape | undefined {
    if (
      tier < 0 ||
      tier >= this.relicInventoryConfig.playerInventoryShapeTiers.length
    ) {
      return undefined;
    }
    return this.relicInventoryConfig.playerInventoryShapeTiers[tier];
  }

  /**
   * Get all relic base definitions
   */
  getRelicDefinitions(): RelicBaseDefinition[] {
    return this.relicsDB.Relics;
  }

  /**
   * Get relic definitions filtered by size
   */
  getRelicDefinitionsBySize(size: RelicSize): RelicBaseDefinition[] {
    return this.relicsDB.Relics.filter((relic) => relic.eRelicSize === size);
  }

  /**
   * Get all relic affixes
   */
  getRelicAffixes(): RelicAffix[] {
    return this.relicAffixesDB["Relic Affixes"];
  }

  /**
   * Get a specific relic affix by ID
   */
  getRelicAffixById(id: number): RelicAffix | undefined {
    return this.relicAffixesDB["Relic Affixes"].find(
      (affix) => affix.id === id,
    );
  }

  /**
   * Get relic size configuration for a specific size
   */
  getRelicSizeConfig(size: RelicSize): RelicSizeConfig | undefined {
    return this.relicInventoryConfig.relicSizeConfigs[size];
  }

  /**
   * Get all relic rarity configurations
   */
  getRelicRarityConfigs(): RelicRarityConfig[] {
    return this.relicInventoryConfig.relicRarityConfigs;
  }

  /**
   * Get relic rarity configuration by rarity type
   */
  getRelicRarityConfig(rarity: RelicRarity): RelicRarityConfig | undefined {
    return this.relicInventoryConfig.relicRarityConfigs.find(
      (config) => config.eRelicRarity === rarity,
    );
  }

  /**
   * Get all relic tier configurations
   */
  getRelicTierConfigs(): RelicTierConfig[] {
    return this.relicInventoryConfig.relicTierConfigs;
  }

  /**
   * Get relic tier configuration by tier number
   */
  getRelicTierConfig(tier: number): RelicTierConfig | undefined {
    return this.relicInventoryConfig.relicTierConfigs.find(
      (config) => config.tier === tier,
    );
  }

  /**
   * Get the external inventory dimensions
   */
  getExternalInventoryDimensions(): { width: number; height: number } {
    return {
      width: this.relicInventoryConfig.externalInventoryWidth,
      height: this.relicInventoryConfig.externalInventoryHeight,
    };
  }

  /**
   * Get the maximum upgrade level for relics
   */
  getMaxUpgradeLevel(): number {
    return this.relicInventoryConfig.maxUpgradeLevel;
  }

  /**
   * Get relic upgrade cost for a specific level
   */
  getRelicUpgradeCost(level: number): number {
    if (
      level < 0 ||
      level >= this.relicInventoryConfig.relicUpgradeCost.length
    ) {
      return 0;
    }
    return this.relicInventoryConfig.relicUpgradeCost[level];
  }

  /**
   * Get relic affix icons configuration
   */
  getRelicAffixIcons(): RelicAffixIcons {
    return this.relicInventoryConfig.relicAffixIcons;
  }

  /**
   * Get implicit affix pool for a specific size and imbued type
   */
  getImplicitAffixPool(
    size: RelicSize,
    imbuedType: RelicImbuedType,
  ): WeightedAffixReference[] {
    if (imbuedType === "None") return [];

    const sizeConfig = this.getRelicSizeConfig(size);
    if (!sizeConfig) {
      return [];
    }
    return sizeConfig.implicitAffixPool[imbuedType] || [];
  }

  /**
   * Get available imbued types for a specific relic size
   */
  getAvailableImbuedTypesForSize(size: RelicSize): RelicImbuedType[] {
    const sizeConfig = this.getRelicSizeConfig(size);
    if (!sizeConfig) {
      return ["None"];
    }

    const availableTypes: RelicImbuedType[] = ["None"];

    // Check which imbued types have affix pools for this size
    const imbuedTypes: RelicImbuedType[] = [
      "FuryImbued",
      "DisciplineImbued",
      "FaithImbued",
      "Corrupted",
    ];
    imbuedTypes.forEach((type) => {
      if (
        sizeConfig.implicitAffixPool[type] &&
        sizeConfig.implicitAffixPool[type].length > 0
      ) {
        availableTypes.push(type);
      }
    });

    return availableTypes;
  }

  /**
   * Check if coordinates are valid in a given inventory shape
   */
  isValidInventoryPosition(
    shape: RelicInventoryShape,
    x: number,
    y: number,
  ): boolean {
    if (x < 0 || x >= shape.width || y < 0 || y >= shape.height) {
      return false;
    }
    const index = y * shape.width + x;
    return shape.shape[index] === true;
  }

  /**
   * Get available slots count for a given inventory shape
   */
  getAvailableSlotCount(shape: RelicInventoryShape): number {
    return shape.shape.filter((slot) => slot === true).length;
  }

  /**
   * Create a sample relic item for testing
   */
  createSampleRelic(
    size: RelicSize,
    tier: number = 1,
  ): {
    id: string;
    name: string;
    size: RelicSize;
    tier: number;
    rarity: string;
    sprite: string;
    width: number;
    height: number;
  } {
    const sizeConfig = this.getRelicSizeConfig(size);
    const tierConfig = this.getRelicTierConfig(tier);

    return {
      id: `sample-${size.toLowerCase()}-${Date.now()}`,
      name: `Sample ${size} Relic`,
      size,
      tier,
      rarity: "Common",
      sprite: tierConfig?.spritePerSize[size] || `IconRelic_${size}1`,
      width: sizeConfig?.relicInventoryShape.width || 1,
      height: sizeConfig?.relicInventoryShape.height || 1,
    };
  }

  /**
   * Get relic sprite for size and tier
   */
  getRelicSprite(size: RelicSize, tier: number = 1): string {
    const tierConfig = this.getRelicTierConfig(tier);
    return tierConfig?.spritePerSize[size] || `IconRelic_${size}1`;
  }

  /**
   * Get relic background sprite for size
   */
  getRelicBackgroundSprite(size: RelicSize): string {
    const sizeConfig = this.getRelicSizeConfig(size);
    return sizeConfig?.backgroundSprite || "IconRelic_bg_Small";
  }

  /**
   * Get relic color for rarity
   */
  getRelicRarityColor(rarity: RelicRarity): string {
    const rarityConfig = this.getRelicRarityConfig(rarity);
    return rarityConfig?.color || "RGBA(0.226, 0.206, 0.206, 1.000)";
  }

  /**
   * Get available relics that can fit in the given space constraints
   */
  getAvailableRelics(
    maxWidth: number,
    maxHeight: number,
  ): RelicBaseDefinition[] {
    return this.relicsDB.Relics.filter((relic) => {
      const sizeConfig = this.getRelicSizeConfig(relic.eRelicSize);
      if (!sizeConfig) return false;

      const relicWidth = sizeConfig.relicInventoryShape.width;
      const relicHeight = sizeConfig.relicInventoryShape.height;

      return relicWidth <= maxWidth && relicHeight <= maxHeight;
    });
  }

  /**
   * Generate a relic item from a base definition
   */
  generateRelicItem(
    baseDefinition: RelicBaseDefinition,
    rarity: RelicRarity = "Common",
    tier: number = 1,
  ): Omit<RelicItem, "position"> {
    const sizeConfig = this.getRelicSizeConfig(baseDefinition.eRelicSize);
    const tierConfig = this.getRelicTierConfig(tier);

    return {
      id: `relic-${baseDefinition.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: baseDefinition.name,
      size: baseDefinition.eRelicSize,
      tier,
      rarity,
      sprite:
        tierConfig?.spritePerSize[baseDefinition.eRelicSize] ||
        `IconRelic_${baseDefinition.eRelicSize}1`,
      width: sizeConfig?.relicInventoryShape.width || 1,
      height: sizeConfig?.relicInventoryShape.height || 1,
    };
  }

  /**
   * Get relics filtered by size that can fit in constraints
   */
  getFilteredRelicItems(
    maxWidth: number,
    maxHeight: number,
    rarity: RelicRarity = "Common",
    tier: number = 1,
  ): Array<Omit<RelicItem, "position">> {
    const availableRelics = this.getAvailableRelics(maxWidth, maxHeight);

    return availableRelics.map((baseDefinition) =>
      this.generateRelicItem(baseDefinition, rarity, tier),
    );
  }

  /**
   * Get available affixes for a relic's primary or secondary pools
   */
  getAvailableAffixes(
    relicDefinition: RelicBaseDefinition,
    affixType: "primary" | "secondary",
  ): RelicAffix[] {
    const pool =
      affixType === "primary"
        ? relicDefinition.primaryAffixPool
        : relicDefinition.secondaryAffixPool;

    if (pool.length === 0) return [];

    // Get affix IDs from the pool
    const affixIds = pool.map((ref) => ref.value.id);

    // Return actual affix definitions
    return this.relicAffixesDB["Relic Affixes"].filter((affix) =>
      affixIds.includes(affix.id),
    );
  }

  /**
   * Get implicit affixes for a given size and imbued type
   */
  getImplicitAffixesForSize(
    size: RelicSize,
    imbuedType: RelicImbuedType,
  ): RelicAffix[] {
    // Return empty array for None imbued type
    if (imbuedType === "None") return [];

    const sizeConfig = this.getRelicSizeConfig(size);
    if (!sizeConfig) return [];

    const implicitPool = sizeConfig.implicitAffixPool[imbuedType] || [];
    const affixIds = implicitPool.map((ref) => ref.value.id);

    return this.relicAffixesDB["Relic Affixes"].filter((affix) =>
      affixIds.includes(affix.id),
    );
  }

  /**
   * Get affix value range for a specific tier
   */
  getAffixValueRange(affixId: number, tier: number): [number, number] {
    const affix = this.getRelicAffixById(affixId);
    if (!affix) return [0, 0];

    const tierRange = affix.tierRollRanges.find((range) => range.tier === tier);
    return tierRange?.rollRange || [0, 0];
  }

  /**
   * Get maximum number of affixes for a rarity and size combination
   */
  getMaxAffixCounts(
    relicDefinition: RelicBaseDefinition,
    rarity: RelicRarity,
  ): { primary: number; secondary: number } {
    const rarityConfig = this.getRelicRarityConfig(rarity);
    if (!rarityConfig) {
      return {
        primary: relicDefinition.primaryAffixAmount[1],
        secondary: relicDefinition.secondaryAffixAmount[1],
      };
    }

    const additionalPrimary = rarityConfig.additionalPrimaryAffixAmount[
      relicDefinition.eRelicSize
    ] || [0, 0];
    const additionalSecondary = rarityConfig.additionalSecondaryAffixAmount[
      relicDefinition.eRelicSize
    ] || [0, 0];

    return {
      primary: relicDefinition.primaryAffixAmount[1] + additionalPrimary[1],
      secondary:
        relicDefinition.secondaryAffixAmount[1] + additionalSecondary[1],
    };
  }

  /**
   * Create a default configuration for a relic
   */
  createDefaultConfiguration(
    baseDefinition: RelicBaseDefinition,
    rarity: RelicRarity = "Common",
    tier: number = 1,
  ): RelicConfiguration {
    const corruptedAffixes = this.getImplicitAffixesForSize(
      baseDefinition.eRelicSize,
      "Corrupted",
    );

    const furyAffixes = this.getImplicitAffixesForSize(
      baseDefinition.eRelicSize,
      "FuryImbued",
    );

    const disciplineAffixes = this.getImplicitAffixesForSize(
      baseDefinition.eRelicSize,
      "DisciplineImbued",
    );

    const faithAffixes = this.getImplicitAffixesForSize(
      baseDefinition.eRelicSize,
      "FaithImbued",
    );

    const primaryAffixes = this.getAvailableAffixes(baseDefinition, "primary");
    const secondaryAffixes = this.getAvailableAffixes(
      baseDefinition,
      "secondary",
    );
    const maxCounts = this.getMaxAffixCounts(baseDefinition, rarity);

    // Get Special Affix
    const specialAffix = [];
    let selectedSpecialAffix: RelicAffix | undefined = undefined;
    let specialAffixValue: Record<number, number> = {};
    if (rarity === "Rare") {
      specialAffix.push(
        ...this.getRelicAffixes().filter(
          (st) =>
            st.eAffixRarity === "Special" &&
            st.tierRollRanges.some((t) => t.tier === tier),
        ),
      );
    } else if (rarity === "Unique") {
      // unique hace intrinsic special affix and should be selected by default
      const affixs = this.getRelicAffixById(
        baseDefinition.intrinsicAffixes![0].id,
      )!;
      specialAffix.push(affixs);
      selectedSpecialAffix = affixs;
      specialAffixValue = {
        [affixs.id]: affixs.tierRollRanges.find((t) => t.tier === tier)!
          .rollRange[1],
      };
    }

    return {
      rarity,
      tier,
      maxPrimaryAffixes: maxCounts.primary,
      maxSecondaryAffixes: maxCounts.secondary,
      maxDevotionAffixes: 1,
      maxCorruptionAffixes: 1,
      maxSpecialAffixes: specialAffix.length > 0 ? 1 : 0,
      availableSpecialAffixes: specialAffix,
      availablePrimaryAffixes: primaryAffixes,
      availableSecondaryAffixes: secondaryAffixes,
      availableFuryImbuedAffixes: furyAffixes,
      availableDisciplineImbuedAffixes: disciplineAffixes,
      availableFaithImbuedAffixes: faithAffixes,
      availableCorruptionAffixes: corruptedAffixes,
      selectedPrimaryAffixes: [],
      selectedSecondaryAffixes: [],
      selectedDevotionAffix: undefined,
      selectedCorruptionAffix: undefined,
      selectedSpecialAffix,
      primaryAffixValues: {},
      secondaryAffixValues: {},
      implicitAffixValues: {},
      corruptionAffixValues: {},
      specialAffixValues: specialAffixValue,
    };
  }

  /**
   * Get tooltip lines for a relic item
   */
  getTooltipLines(
    relic: RelicItem,
    lang: string,
    statsHelper?: StatsHelper,
    skillsHelper?: SkillsHelper,
  ): TooltipLine[] {
    if (!relic) return [{ text: "Empty", type: "info" }];

    const lines: TooltipLine[] = [];
    const rarityColor = parseRGBA01ToCss(
      this.getRelicRarityColor(relic.rarity as RelicRarity),
    );

    // Relic name with rarity color
    lines.push({
      text: relic.name,
      color: rarityColor,
      type: "header",
    });

    // Relic size and tier
    lines.push({
      text: `${relic.size} Relic`,
      type: "info",
    });

    lines.push({
      text: `Tier ${relic.tier}`,
      type: "info",
    });

    // First divider
    lines.push({ text: "", type: "divider" });

    const affixIcons = this.getRelicAffixIcons();

    if (relic.selectedSpecialAffix) {
      const value = relic.specialAffixValues?.[relic.selectedSpecialAffix.id];
      lines.push({
        text: this.formatRelicAffix(
          relic.selectedSpecialAffix,
          value,
          lang,
          statsHelper,
          skillsHelper,
        ),
        icon: this.getAffixIconByAffix(
          relic.selectedSpecialAffix,
          affixIcons.defaultIcon,
          skillsHelper!,
        ),
        type: "affix",
      });
      lines.push({ text: "", type: "divider" });
    }

    // Corrupted affix (implicit)
    if (relic.selectedCorruptionAffix) {
      const value =
        relic.implicitAffixValues?.[relic.selectedCorruptionAffix.id];
      lines.push({
        text: this.formatRelicAffix(
          relic.selectedCorruptionAffix,
          value,
          lang,
          statsHelper,
          skillsHelper,
        ),
        icon: this.getAffixIconByAffix(
          relic.selectedCorruptionAffix,
          affixIcons.implicitIcon,
          skillsHelper!,
        ),
        type: "affix",
      });
    }

    // Devotion affix (implicit)
    if (relic.selectedDevotionAffix) {
      const value = relic.implicitAffixValues?.[relic.selectedDevotionAffix.id];
      lines.push({
        text: this.formatRelicAffix(
          relic.selectedDevotionAffix,
          value,
          lang,
          statsHelper,
          skillsHelper,
        ),
        icon: this.getAffixIconByAffix(
          relic.selectedDevotionAffix,
          affixIcons.implicitIcon,
          skillsHelper!,
        ),
        type: "affix",
      });
    }

    // Second divider if we have implicit affixes
    if (relic.selectedCorruptionAffix || relic.selectedDevotionAffix) {
      lines.push({ text: "", type: "divider" });
    }

    // Primary affixes
    if (relic.selectedPrimaryAffixes?.length) {
      for (const affix of relic.selectedPrimaryAffixes) {
        const value = relic.primaryAffixValues?.[affix.id];
        lines.push({
          text: this.formatRelicAffix(affix, value, lang, statsHelper),
          icon: affixIcons.defaultIcon,
          type: "affix",
        });
      }
    }

    // Secondary affixes
    if (relic.selectedSecondaryAffixes?.length) {
      for (const affix of relic.selectedSecondaryAffixes) {
        const value = relic.secondaryAffixValues?.[affix.id];
        lines.push({
          text: this.formatRelicAffix(affix, value, lang, statsHelper),
          icon: affixIcons.defaultIcon,
          type: "affix",
        });
      }
    }

    if (
      relic.selectedPrimaryAffixes?.length ||
      relic.selectedSecondaryAffixes?.length
    ) {
      lines.push({ text: "", type: "divider" });
    }

    if (relic.selectedCorruptionAffix) {
      lines.push({
        text: "Corrupted",
        type: "header",
        color: "rgba(255,0,0,0.8)",
      });
    }

    return lines;
  }

  private getAffixIconByAffix(
    affix: RelicAffix,
    defaultIcon: string,
    skillsHelper: SkillsHelper,
  ): string {
    if (affix.customIcon) {
      return affix.customIcon;
    }

    if (affix.type === "SkillBehaviorAffixDefinition" && affix.behaviorData) {
      const skill = skillsHelper?.getSkillById(
        affix.behaviorData.skillDefinition.id,
      );
      return skill!.icon;
    }

    return defaultIcon;
  }

  /**
   * Format a relic affix for display
   */
  private formatRelicAffix(
    affix: RelicAffix,
    value: number | undefined,
    lang: string,
    statsHelper?: StatsHelper,
    skillsHelper?: SkillsHelper,
  ): string {
    // Get the localized name
    const affixName = translate(affix.nameLocalizationKey, lang) || affix.name;

    if (value === undefined) {
      return affixName;
    }

    // Format based on affix type
    switch (affix.type) {
      case "StatModifierAffixDefinition":
        if (statsHelper && affix.eStatDefinition) {
          const statDefinition = statsHelper.getStatByName(
            affix.eStatDefinition,
          );
          if (statDefinition) {
            const formattedValue = formatStatModNumber(
              value,
              statDefinition.eStatFormat,
              affix.statModifierType || "Additive",
              1, // selectedValue
              0, // minMultiplier
              1, // maxMultiplier
            );
            const statLabel = statsHelper.getLabelForStat(
              affix.eStatDefinition,
              lang,
            );
            return `${formattedValue} ${statLabel}`;
          }
        }
        return `${value} ${affixName}`;

      case "RegenOnKillAffixDefinition":
        const statsLabel = statsHelper!.getLabelForStat(affix.eStatRegen!, lang);
        const formattedRegen = formatStatModNumber(value, affix.flatRegen ? "DEFAULT" : "PERCENTAGE", "Additive", 1, 0, 1);
        return `${formattedRegen} ${statsLabel} on Kill`;

      case "SkillLevelAffixDefinition":
        const skill = skillsHelper?.getSkillById(affix.skillDefinition!.id);
        const skillName = translate(skill!.localizedName, lang);
        return `+${value} to ${skillName} Level`;

      case "StatusMaxStacksAffixDefinition":
        const stackLabel = translate(affix.description, lang) || affix.name;
        return formatIndexed(formatHCStyle(stackLabel), `+${value}`);
      case "SkillBehaviorAffixDefinition":
        const desc = translate(affix.description, lang);
        // check if have additional params
        const extraParams: any[] = [];
        if (affix.additionalLocalizationVariables?.length) {
          for (let varName of affix.additionalLocalizationVariables) {
            const variable = affix.behaviorData!.variables.variables.find(
              (v) =>
                v.name === varName.skillEffectVariableReference.valueOrName,
            );
            if (variable) {
              extraParams.push(
                formatSkillEffectVariableModNumber(
                  variable.baseValue,
                  variable.eSkillEffectVariableFormat,
                ),
              );
            } else {
              extraParams.push(
                varName.skillEffectVariableReference.valueOrName || "",
              );
            }
          }
        }

        return formatIndexed(
          formatHCStyle(desc),
          formatSkillEffectVariableModNumber(
            value,
            affix.behaviorData!.variables.variables[0]
              .eSkillEffectVariableFormat,
          ),
          ...extraParams,
        );

      default:
        return `${value} ${affixName}`;
    }
  }
}

// Enhanced data structures for relic configuration
export type RelicConfiguration = {
  rarity: RelicRarity;
  tier: number;
  imbuedType?: RelicImbuedType;
  maxPrimaryAffixes: number;
  maxSecondaryAffixes: number;
  maxDevotionAffixes: number;
  maxCorruptionAffixes: number;
  maxSpecialAffixes?: number;
  availableSpecialAffixes?: RelicAffix[];
  availablePrimaryAffixes?: RelicAffix[];
  availableSecondaryAffixes?: RelicAffix[];
  availableFuryImbuedAffixes?: RelicAffix[];
  availableDisciplineImbuedAffixes?: RelicAffix[];
  availableFaithImbuedAffixes?: RelicAffix[];
  availableCorruptionAffixes?: RelicAffix[];
  selectedPrimaryAffixes: RelicAffix[];
  selectedSecondaryAffixes: RelicAffix[];
  selectedDevotionAffix?: RelicAffix;
  selectedCorruptionAffix?: RelicAffix;
  selectedSpecialAffix?: RelicAffix;
  primaryAffixValues: Record<number, number>; // affixId -> selected value
  secondaryAffixValues: Record<number, number>; // affixId -> selected value
  implicitAffixValues: Record<number, number>; // affixId -> selected value
  corruptionAffixValues: Record<number, number>; // affixId -> selected value
  specialAffixValues: Record<number, number>; // affixId -> selected value
};

export type RelicItem = {
  id: string;
  name: string;
  size: RelicSize;
  tier: number;
  rarity: string;
  sprite: string;
  width: number;
  height: number;
  imbuedType?: RelicImbuedType;
  selectedPrimaryAffixes?: RelicAffix[];
  selectedSecondaryAffixes?: RelicAffix[];
  selectedDevotionAffix?: RelicAffix;
  selectedCorruptionAffix?: RelicAffix;
  selectedSpecialAffix?: RelicAffix;
  primaryAffixValues?: Record<number, number>; // affixId -> selected value
  secondaryAffixValues?: Record<number, number>; // affixId -> selected value
  implicitAffixValues?: Record<number, number>; // affixId -> selected value
  corruptionAffixValues?: Record<number, number>; // affixId -> selected value
  specialAffixValues?: Record<number, number>; // affixId -> selected value
};

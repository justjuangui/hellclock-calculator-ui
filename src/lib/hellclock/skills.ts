import type { StatMod, StatModifierType } from "$lib/hellclock/stats";
import type { LangText } from "./lang";

export type DamageType = "PHYSICAL" | "FIRE" | "PLAGUE" | "LIGHTNING";

export interface SkillUpgradeModifier {
  type: "SkillUpgradeModifier";
  skillValueModifierKey: string;
  modifierType: StatModifierType;
  value: number;
  selectedValue?: number;
}

export interface SkillValueModifierConfig {
  type: "SkillValueModifierConfig";
  skillValueModifierKey: string;
  multiplicativeStats: string[];
  additiveStats: string[];
}

export interface RangedAttackConfig {
  type: "RangedAttackConfig";
  manaRegenOnHit: number;
  intervalBetweenShots: number;
  hasAnticipation: boolean;
  anticipationTime: number;
  anticipationDelay: number;
  bounceDelay: number;
}

export interface NamedRef<TType extends string = string> {
  name: string;
  id: number;
  type: TType;
}

export interface TeleportConfig {
  type: "TeleportConfig";
  anticipationTime: number;
  recoveryTime: number;
}

export interface FallingProjectileConfig {
  type: "FallingProjectileConfig";
  fallHeight: number;
  fallAngle: number;
  damageAreaConfig: string;
}

export type SpawnMode = "ByDuration" | "ByAmount";

export interface FallingProjectileSpawnerConfig {
  type: "FallingProjectileSpawnerConfig";
  spawnMode: SpawnMode;
  amount: number;
  duration: number;
  intervalBetweenSpawns: number;
  spawnAreaRadius: number;
  fallingProjectileConfig: FallingProjectileConfig;
}

export type Skill =
  | RangedAttackSkillDefinition
  | SplitshotSkillDefinition
  | ShadowDashSkillDefinition
  | RepeaterSkillDefinition
  | ReflexesSkillDefinition
  | PrayerOfHealthSkillDefinition
  | PrayerOfVengeanceSkillDefinition
  | TheOldBellSkillDefinition
  | PlaceEffectAreaSkillDefinition
  | DoubleKnivesSkillDefinition
  | PassageSkillDefinition
  | LassoSkillDefinition
  | SlashSkillDefinition
  | UsePotionSkillDefinition
  | ClosedBodySkillDefinition
  | SpawnFallingProjectilesSkillDefinition
  | SummonTheGuardSkillDefinition;

export type SkillType =
  | "RangedAttackSkillDefinition"
  | "SplitshotSkillDefinition"
  | "ShadowDashSkillDefinition"
  | "RepeaterSkillDefinition"
  | "ReflexesSkillDefinition"
  | "PrayerOfHealthSkillDefinition"
  | "PrayerOfVengeanceSkillDefinition"
  | "TheOldBellSkillDefinition"
  | "PlaceEffectAreaSkillDefinition"
  | "DoubleKnivesSkillDefinition"
  | "PassageSkillDefinition"
  | "LassoSkillDefinition"
  | "SlashSkillDefinition"
  | "UsePotionSkillDefinition"
  | "ClosedBodySkillDefinition"
  | "SpawnFallingProjectilesSkillDefinition"
  | "SummonTheGuardSkillDefinition";

export interface SkillBase {
  name: string;
  id: number;
  type: SkillType; // discriminator
  manaCost: number;
  useNegativeMana: boolean;
  lifeCost: number;
  baseSkillSpeed: number;
  localizedName: LangText[];
  descriptionKey: LangText[];
  icon: string;
  baseDamageMod: number;
  eDamageType: DamageType;
  /** keys are level strings like "1"..."7"; can be empty {} */
  modifiersPerLevel: Record<string, SkillUpgradeModifier[]>;
  statModifiersPerRankUpgrade: StatMod[];
  skillValueModifierConfigs: SkillValueModifierConfig[];
  cooldown: number;
  minCooldown: number;
  useAttackSpeed: boolean;
  ignoreCooldownSpeed: boolean;
  range: number;
  skillTags: string[];
}

export interface RangedAttackSkillDefinition extends SkillBase {
  type: "RangedAttackSkillDefinition";
  rangedAttackConfig: RangedAttackConfig;
  bulletCount: number;
  bounceAmount: number;
  canPierce: boolean;
}

export interface SplitshotSkillDefinition extends SkillBase {
  type: "SplitshotSkillDefinition";
  chargedShotRangedAttackConfig: RangedAttackConfig;
  rangedAttackConfig: RangedAttackConfig;
  bulletCount: number;
  bounceAmount: number;
  canPierce: boolean;
}

export interface ShadowDashSkillDefinition extends SkillBase {
  type: "ShadowDashSkillDefinition";
  hitRadius: number;
  distance: number;
  timeToComplete: number;
}

export interface RepeaterSkillDefinition extends SkillBase {
  type: "RepeaterSkillDefinition";
  rangedAttackConfig: RangedAttackConfig;
  bulletCount: number;
  bounceAmount: number;
  canPierce: boolean;
  recoveryTime: number;
  loopInterval: number;
  useCooldownSpeedForLoop: boolean;
}

export interface ReflexesSkillDefinition extends SkillBase {
  type: "ReflexesSkillDefinition";
  targetIndicatorAnticipationTime: number;
  anticipationTime: number;
  durationTime: number;
  knivesCount: number;
  knifeThrowDistanceBonus: number;
  knifeRegenTime: number;
  throwKnifeInterval: number;
}

export interface PrayerOfHealthSkillDefinition extends SkillBase {
  type: "PrayerOfHealthSkillDefinition";
  activationLifeRestored: number;
  activationBuffDuration: number;
  activationBuffStatusDefinition: NamedRef<"StatModifierStatusDefinition">;
  auraStatusDefinition: NamedRef<"AuraStatusDefinition">;
}

export interface PrayerOfVengeanceSkillDefinition extends SkillBase {
  type: "PrayerOfVengeanceSkillDefinition";
  activationIntensityBuff: NamedRef<"IntensityModifierStatusDefinition">;
  activationBuffDuration: number;
  auraStatusDefinition: NamedRef<"AuraStatusDefinition">;
}

export interface TheOldBellSkillDefinition extends SkillBase {
  type: "TheOldBellSkillDefinition";
  anticipationTime: number;
  duration: number;
  radius: number;
}

export interface PlaceEffectAreaSkillDefinition extends SkillBase {
  type: "PlaceEffectAreaSkillDefinition";
  /** e.g. "HellClock.Skill.Area.EffectAreaConfig`1[HellClock.Skill.Area.EffectAreaDefinition]" */
  effectAreaConfig: string;
  canPlaceMultiple: boolean;
  parentToCaster: boolean;
}

export interface DoubleKnivesSkillDefinition extends SkillBase {
  type: "DoubleKnivesSkillDefinition";
  areaDefinition: NamedRef<"IntervalDamageStatusAreaDefinition">;
  baseSpinSpeed: number;
  moveSpeedSlow: number;
  recoveryTime: number;
  loopInterval: number;
  useCooldownSpeedForLoop: boolean;
}

export interface PassageSkillDefinition extends SkillBase {
  type: "PassageSkillDefinition";
  startAreaConfig: string;
  distance: number;
  teleportToTargetPosition: boolean;
  teleportConfig: TeleportConfig;
}

export interface LassoSkillDefinition extends SkillBase {
  type: "LassoSkillDefinition";
  minimumRange: number;
  areaRadius: number;
  angle: number;
  delay: number;
  timeToPull: number;
  recoveryTime: number;
  bleedingStatusDefinition: NamedRef<"BleedingDamageOverTimeStatusDefinition">;
  chanceToBleed: number;
  bleedingIntensity: number;
  bleedingDuration: number;
  stunDuration: number;
}

export interface SlashSkillDefinition extends SkillBase {
  type: "SlashSkillDefinition";
  slashAreaAngle: number;
  slashDuration: number;
}

export interface UsePotionSkillDefinition extends SkillBase {
  type: "UsePotionSkillDefinition";
}

export interface ClosedBodySkillDefinition extends SkillBase {
  type: "ClosedBodySkillDefinition";
  retaliationAuraStatusDuration: number;
  retaliationAuraStatusDefinition: NamedRef<"ClosedBodyAuraStatusDefinition">;
  baseConvictionPercentage: number;
}

export interface SpawnFallingProjectilesSkillDefinition extends SkillBase {
  type: "SpawnFallingProjectilesSkillDefinition";
  projectileSpawnerConfig: FallingProjectileSpawnerConfig;
}

export interface SummonTheGuardSkillDefinition extends SkillBase {
  type: "SummonTheGuardSkillDefinition";
  summonAttackSpeedModifier: number;
  companionBuff: NamedRef<"StatModifierStatusDefinition">;
  companionBuffDuration: number;
  companionSpawnDelay: number;
  alternativeSkillPool: Array<{
    weight: number;
    value: { name: string; id: number; type: SkillType | string };
  }>;
  summonAmount: number;
  companionDefinition: NamedRef<"PlayerCompanionDefinition">;
}

export type SkillsRoot = {
  Skills: Skill[];
};

export type SkillSlotDefinition =
  | "SKILL_SLOT_1"
  | "SKILL_SLOT_2"
  | "SKILL_SLOT_3"
  | "SKILL_SLOT_4"
  | "SKILL_SLOT_5";

export type SkillSelected = {
  skill: Skill;
  selectedLevel: number;
};

export type SkillValueMod = {
  id: string;
  displayName: string;
};

export type SkillBaseValueMod = {
  id: string;
  value: string;
};

export type SkillValueGroup = {
  id: string;
  displayName: string;
  displayValueMods: SkillValueMod[];
};

export type SkillCalculatorDinition = {
  id: string;
  displayGroups: SkillValueGroup[];
  baseModsMapping: SkillBaseValueMod[];
};

export type SkillsCalculatorRoot = {
  skills: SkillCalculatorDinition[];
};

export class SkillsHelper {
  private skillsRoot: SkillsRoot;
  private skillsCalculator: SkillsCalculatorRoot;
  constructor(skillsRoot: SkillsRoot, skillsCalculator: SkillsCalculatorRoot) {
    this.skillsRoot = skillsRoot;
    this.skillsCalculator = skillsCalculator;
  }

  getSkillById(id: number): Skill | undefined {
    return this.skillsRoot.Skills.find((skill) => skill.id === id);
  }

  getSkillByName(name: string): Skill | undefined {
    return this.skillsRoot.Skills.find((skill) => skill.name === name);
  }

  getSkillSlotsDefinitions(): SkillSlotDefinition[] {
    return [
      "SKILL_SLOT_1",
      "SKILL_SLOT_2",
      "SKILL_SLOT_3",
      "SKILL_SLOT_4",
      "SKILL_SLOT_5",
    ];
  }

  getSkillDisplayValueModsById(id: string): SkillValueGroup[] {
    return (
      this.skillsCalculator.skills.find((s) => s.id === id)?.displayGroups || []
    );
  }

  getSkillBaseValueModsById(id: string): SkillBaseValueMod[] {
    return (
      this.skillsCalculator.skills.find((s) => s.id === id)?.baseModsMapping ||
      []
    );
  }

  getAllSkillDefinitions(): Skill[] {
    return this.skillsRoot.Skills;
  }
}

import { type LangText, translate } from "$lib/hellclock/lang";
import type { StatMod } from "$lib/hellclock/stats";

// ============================================================================
// Type Definitions for Status.json
// ============================================================================

export type StatusDefinitionBase = {
  name: string;
  id: number;
  type: string;
  statusDisplayInfo?: StatusDisplayInfo;
  hideFromHud?: boolean;
  isBuff?: boolean;
  isCrowdControl?: boolean;
  eStatusStackBehavior?: string;
  maxStacks?: number;
  removeStackAndRefreshOnDurationEnd?: boolean;
  effectInterval?: number;
  shouldEchoClone?: boolean;
  purgeOnDeath?: boolean;
  purgeOnSourceDeath?: boolean;
};

export type StatusDisplayInfo = {
  type: "StatusDisplayInfo";
  nameKey?: LangText[];
  descriptionKey?: LangText[];
  icon?: string;
};

export type StatModifierStatusDefinition = StatusDefinitionBase & {
  type: "StatModifierStatusDefinition";
  statModifierDefinitions: StatMod[];
};

export type EffectAreaStatusDefinition = StatusDefinitionBase & {
  type: "EffectAreaStatusDefinition";
  effectAreaDefinition: Record<string, any>;
};

export type DamageOverTimeStatusDefinition = StatusDefinitionBase & {
  type: "DamageOverTimeStatusDefinition";
  damageBypassBarrier?: boolean;
  useFixedBaseDamage?: boolean;
  damageMod?: number;
  eDamageType?: string;
  hasSpecificResistance?: boolean;
};

export type HealStatusDefinition = StatusDefinitionBase & {
  type: "HealStatusDefinition";
  healPercent?: number;
  healAmount?: number;
};

export type AuraStatusDefinition = StatusDefinitionBase & {
  type: "AuraStatusDefinition";
  auraRadius?: number;
  auraStatusDefinition?: Record<string, any>;
};

export type SkillBehaviorStatusDefinition = StatusDefinitionBase & {
  type: "SkillBehaviorStatusDefinition";
  skillBehaviorData?: Record<string, any>;
};

// Union type for all status definitions
export type StatusDefinition =
  | StatModifierStatusDefinition
  | EffectAreaStatusDefinition
  | DamageOverTimeStatusDefinition
  | HealStatusDefinition
  | AuraStatusDefinition
  | SkillBehaviorStatusDefinition
  | StatusDefinitionBase;

export type StatusDB = {
  Status: StatusDefinition[];
};

// ============================================================================
// Status Reference Types (used in relics, constellations, skills)
// ============================================================================

export type StatusReference = {
  name: string;
  id: number;
  type: string;
};

// ============================================================================
// Active Status Types (for tracking applied statuses)
// ============================================================================

export type ActiveStatus = {
  statusId: number;
  source: string; // e.g., "Relic: Tempestade", "Constellation: Devotion Node"
  intensity?: number;
  stacks?: number;
  duration?: number; // Not used in static evaluation, but kept for future
  meta?: Record<string, any>;
};

// ============================================================================
// StatusHelper Class
// ============================================================================

export class StatusHelper {
  private statusDB: StatusDB;
  private statusByIdMap: Map<number, StatusDefinition>;
  private statusByNameMap: Map<string, StatusDefinition>;

  constructor(statusDB: StatusDB) {
    this.statusDB = statusDB;

    // Build lookup maps for efficient queries
    this.statusByIdMap = new Map();
    this.statusByNameMap = new Map();

    for (const status of statusDB.Status) {
      this.statusByIdMap.set(status.id, status);
      this.statusByNameMap.set(status.name, status);
    }
  }

  /**
   * Get all status definitions
   */
  getAllStatuses(): StatusDefinition[] {
    return this.statusDB.Status;
  }

  /**
   * Get a status definition by ID
   */
  getStatusById(id: number): StatusDefinition | undefined {
    return this.statusByIdMap.get(id);
  }

  /**
   * Get a status definition by name
   */
  getStatusByName(name: string): StatusDefinition | undefined {
    return this.statusByNameMap.get(name);
  }

  /**
   * Get a status from a reference object (used in relics, constellations)
   */
  getStatusFromReference(ref: StatusReference): StatusDefinition | undefined {
    // Prefer lookup by ID if available, fallback to name
    if (ref.id !== undefined && ref.id !== null) {
      return this.getStatusById(ref.id);
    }
    return this.getStatusByName(ref.name);
  }

  /**
   * Get all statuses of a specific type
   */
  getStatusesByType(type: string): StatusDefinition[] {
    return this.statusDB.Status.filter((status) => status.type === type);
  }

  /**
   * Get all StatModifierStatusDefinition statuses
   */
  getStatModifierStatuses(): StatModifierStatusDefinition[] {
    return this.getStatusesByType(
      "StatModifierStatusDefinition"
    ) as StatModifierStatusDefinition[];
  }

  /**
   * Check if a status definition is a StatModifierStatusDefinition
   */
  isStatModifierStatus(
    status: StatusDefinition
  ): status is StatModifierStatusDefinition {
    return status.type === "StatModifierStatusDefinition";
  }

  /**
   * Extract stat modifications from a StatModifierStatusDefinition
   *
   * @param status - The status definition
   * @param intensity - Intensity multiplier (default: 1)
   * @param stacks - Number of stacks (default: 1)
   * @returns Array of stat modifications with calculated values
   */
  extractStatMods(
    status: StatModifierStatusDefinition,
    intensity: number = 1,
    stacks: number = 1
  ): Array<StatMod & { statKey: string; layer: string }> {
    const mods: Array<StatMod & { statKey: string; layer: string }> = [];

    for (const statMod of status.statModifierDefinitions) {
      // Calculate effective value: base value * intensity * stacks
      const effectiveValue = statMod.value * intensity * stacks;

      // Map modifierType to evaluation layer
      let layer: string;
      switch (statMod.modifierType) {
        case "Additive":
          layer = "add";
          break;
        case "Multiplicative":
          layer = "mult";
          break;
        case "MultiplicativeAdditive":
          layer = "multadd";
          break;
        default:
          layer = "add"; // Default to additive
          break;
      }

      // Create stat key for evaluation system
      const statKey = `${statMod.eStatDefinition}.${layer}`;

      mods.push({
        ...statMod,
        value: effectiveValue,
        statKey,
        layer,
      });
    }

    return mods;
  }

  /**
   * Get localized name for a status
   */
  getStatusName(status: StatusDefinition, lang: string): string {
    if (status.statusDisplayInfo?.nameKey) {
      return translate(status.statusDisplayInfo.nameKey, lang);
    }
    return status.name; // Fallback to internal name
  }

  /**
   * Get localized description for a status
   */
  getStatusDescription(status: StatusDefinition, lang: string): string {
    if (status.statusDisplayInfo?.descriptionKey) {
      return translate(status.statusDisplayInfo.descriptionKey, lang);
    }
    return ""; // No description available
  }

  /**
   * Get icon for a status
   */
  getStatusIcon(status: StatusDefinition): string | undefined {
    return status.statusDisplayInfo?.icon;
  }

  /**
   * Check if a status is a buff
   */
  isStatusBuff(status: StatusDefinition): boolean {
    return status.isBuff === true;
  }

  /**
   * Check if a status is crowd control
   */
  isStatusCrowdControl(status: StatusDefinition): boolean {
    return status.isCrowdControl === true;
  }

  /**
   * Get maximum stacks for a status
   */
  getMaxStacks(status: StatusDefinition): number {
    return status.maxStacks ?? 1;
  }

  /**
   * Get stack behavior for a status
   */
  getStackBehavior(status: StatusDefinition): string {
    return status.eStatusStackBehavior ?? "Refresh";
  }
}

/**
 * Export system types for Hell Clock Calculator
 * Handles serialization of build data to binary format
 */

// ============================================================================
// Component Flags
// ============================================================================

/**
 * Bitmask flags for components in export data
 */
export enum ExportComponent {
  BlessedGear = 0x01,
  TrinketGear = 0x02,
  Skills = 0x04,
  Relics = 0x08,
  Bells = 0x10,
  Constellations = 0x20,
  WorldTier = 0x40,
}

// ============================================================================
// Export Result Types
// ============================================================================

export type ExportResult = {
  success: boolean;
  code?: string; // Base64 encoded string
  error?: string;
  stats?: ExportStats;
};

export type ExportStats = {
  totalBytes: number;
  base64Length: number;
  componentBytes: Partial<Record<keyof typeof ExportComponent, number>>;
};

// ============================================================================
// Serializable Data Types
// ============================================================================

/**
 * Complete serializable build state
 */
export type SerializableBuild = {
  blessedGear?: SerializableGear[];
  trinketGear?: SerializableGear[];
  skills?: SerializableSkill[];
  relics?: SerializableRelicInventory;
  bells?: SerializableBellState;
  constellations?: SerializableConstellationState;
  worldTier?: number;
};

/**
 * Serializable gear item
 */
export type SerializableGear = {
  slot: number; // GearSlot enum value
  defId: number;
  variantIndex: number;
  multiplier: number; // 0.0 - 2.0 typically
};

/**
 * Serializable skill slot
 */
export type SerializableSkill = {
  slotIndex: number; // 0-4
  skillId: number;
  level: number;
};

/**
 * Serializable relic inventory
 */
export type SerializableRelicInventory = {
  tier: number; // Inventory tier 0-4
  relics: SerializableRelic[];
};

/**
 * Serializable relic with all affixes
 */
export type SerializableRelic = {
  baseId: number;
  x: number;
  y: number;
  tier: number; // Relic tier 1-5
  rank: number; // Upgrade rank 0-5
  rarity: number; // 0=Common, 1=Magic, 2=Rare, 3=Unique
  isCorrupted: boolean;
  specialAffixes: SerializableAffix[];
  primaryAffixes: SerializableAffix[];
  secondaryAffixes: SerializableAffix[];
  devotionAffix?: SerializableAffix;
  corruptionAffix?: SerializableAffix;
};

/**
 * Serializable affix
 */
export type SerializableAffix = {
  id: number;
  roll: number; // 0.0-1.0 normalized
};

/**
 * Serializable bell state
 */
export type SerializableBellState = {
  activeBellId: number;
  nodes: SerializableBellNode[];
};

/**
 * Serializable bell node
 */
export type SerializableBellNode = {
  bellId: number;
  nodeGuid: string;
  level: number;
};

/**
 * Serializable constellation state
 */
export type SerializableConstellationState = {
  nodes: SerializableConstellationNode[];
};

/**
 * Serializable constellation node
 */
export type SerializableConstellationNode = {
  constellationId: number;
  nodeGuid: string;
  level: number;
};

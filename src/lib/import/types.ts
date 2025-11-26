/**
 * Import system types for Hell Clock Calculator
 * Handles parsing and importing game save files (PlayerSave0.json)
 */

// ============================================================================
// Import Options & Results
// ============================================================================

export type ImportOptions = {
	skills: boolean;
	relics: boolean;
	relicLoadoutIndex: number; // 0, 1, or 2 - user selected
	constellations: boolean;
};

export type ImportResult = {
	success: boolean;
	imported: {
		skills: number;
		relics: number;
		constellations: number;
	};
	errors: ImportError[];
	warnings: ImportWarning[];
};

export type ImportError = {
	system: "skills" | "relics" | "constellations";
	message: string;
	data?: unknown;
};

export type ImportWarning = {
	system: "skills" | "relics" | "constellations";
	message: string;
};

export type ValidationResult = {
	valid: boolean;
	error?: string;
	warning?: string;
};

// ============================================================================
// Parsed Data Structures
// ============================================================================

export type ParsedSkill = {
	slotIndex: number;
	skillId: number;
	level: number;
};

export type ParsedRelic = {
	baseId: number;
	tier: number;
	rarity: number;
	upgradeLevel: number;
	position: { x: number; y: number };
	affixes: ParsedAffix[];
	implicitAffixes: ParsedImplicitAffix[];
	isCorrupted: boolean;
	ascended: boolean;
};

export type ParsedAffix = {
	affixId: number;
	rollValue: number;
	tier: number;
	locked: boolean;
};

export type ParsedImplicitAffix = {
	category: number;
	affix: ParsedAffix;
};

export type ParsedConstellation = {
	constellationId: number;
	nodeGuid: string;
	level: number;
};

// ============================================================================
// Relic Loadout Summary
// ============================================================================

export type RelicLoadoutSummary = {
	index: number;
	relicCount: number;
	isCurrentInGame: boolean; // Was _currentIndex in save
};

// ============================================================================
// Save File Structure Types (for parsing)
// ============================================================================

export type SaveFileSkillSlot = {
	_skillHashId: number;
	_slotIndex: number;
};

export type SaveFileSkillLevel = {
	_skill: number;
	_level: number;
};

export type SaveFileRelicAffix = {
	_relicAffixDefinitionId: number;
	_rollValue: number;
	_tier: number;
	_locked: boolean;
};

export type SaveFileImplicitAffix = {
	_eImplicitAffixCategory: number;
	_relicAffixData: SaveFileRelicAffix;
};

export type SaveFileRelic = {
	_relicBaseDefinitionID: number;
	_eRelicRarity: number;
	_ascended: boolean;
	_upgradeLevel: number;
	_tier: number;
	_position: { x: number; y: number };
	_isCorrupted: boolean;
	_affixesData: SaveFileRelicAffix[];
	_implicitAffixesData: SaveFileImplicitAffix[];
};

export type SaveFileRelicLoadout = {
	Items: SaveFileRelic[];
};

export type SaveFileRelicLoadoutsData = {
	_currentIndex: number;
	_loadouts: SaveFileRelicLoadout[];
};

export type SaveFileConstellationNode = {
	_nodeDefinitionGuid: string;
	_upgradeLevel: number;
};

export type SaveFileConstellation = {
	_skillTreeHashId: number;
	_skillTreeNodes: SaveFileConstellationNode[];
};

export type SaveFileConstellationsData = {
	interactedForTheFirstTime: boolean;
	constellationPoints: number;
	permanentConstellationPoints: number;
	skillTreesData: SaveFileConstellation[];
};

export type SaveFile = {
	saveVersion?: number;
	skillSlots: SaveFileSkillSlot[];
	_skillAndLevels: SaveFileSkillLevel[];
	_relicLoadoutsSaveData: SaveFileRelicLoadoutsData;
	constellationsData: SaveFileConstellationsData;
	// Other fields not needed for import
	[key: string]: unknown;
};

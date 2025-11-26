/**
 * Base interface for import adapters
 * Adapters handle parsing different save file versions
 */

import type {
	ParsedSkill,
	ParsedRelic,
	ParsedConstellation,
	RelicLoadoutSummary,
} from "../types";

export interface ImportAdapter {
	/**
	 * Version this adapter handles
	 */
	readonly version: number;

	/**
	 * Check if this adapter can handle the given save data
	 */
	canHandle(saveData: unknown): boolean;

	/**
	 * Parse skill slots and levels from save data
	 * Returns only equipped skills (excludes empty slots)
	 */
	parseSkills(saveData: unknown): ParsedSkill[];

	/**
	 * Get summary of all relic loadouts for UI selection
	 */
	getRelicLoadouts(saveData: unknown): RelicLoadoutSummary[];

	/**
	 * Parse relics from a specific loadout
	 * @param loadoutIndex - 0, 1, or 2
	 */
	parseRelics(saveData: unknown, loadoutIndex: number): ParsedRelic[];

	/**
	 * Parse constellation node allocations
	 * Returns only allocated nodes (level > 0)
	 */
	parseConstellations(saveData: unknown): ParsedConstellation[];
}

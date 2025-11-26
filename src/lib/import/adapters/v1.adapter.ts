/**
 * V1 Adapter for parsing Hell Clock save files
 * Handles save files with version 1 or no version specified
 */

import type { ImportAdapter } from "./base";
import type {
	ParsedSkill,
	ParsedRelic,
	ParsedConstellation,
	RelicLoadoutSummary,
	SaveFile,
	SaveFileSkillSlot,
	SaveFileSkillLevel,
	SaveFileRelicLoadoutsData,
	SaveFileConstellationsData,
	ParsedAffix,
	ParsedImplicitAffix,
} from "../types";

export class V1Adapter implements ImportAdapter {
	readonly version = 1;

	canHandle(saveData: unknown): boolean {
		if (!saveData || typeof saveData !== "object") return false;

		const data = saveData as Record<string, unknown>;

		// V1 has no saveVersion or saveVersion === 1
		const version = data.saveVersion;
		if (version !== undefined && version !== 7) return false;

		// Must have required fields
		return (
			Array.isArray(data.skillSlots) &&
			Array.isArray(data._skillAndLevels) &&
			typeof data._relicLoadoutsSaveData === "object" &&
			typeof data.constellationsData === "object"
		);
	}

	parseSkills(saveData: unknown): ParsedSkill[] {
		const data = saveData as SaveFile;
		const skillSlots = data.skillSlots as SaveFileSkillSlot[];
		const skillLevels = data._skillAndLevels as SaveFileSkillLevel[];

		// Build a map of skill ID → level
		const levelMap = new Map<number, number>();
		for (const entry of skillLevels) {
			levelMap.set(entry._skill, entry._level);
		}

		// Parse equipped skills (filter out empty slots where _skillHashId === -1)
		const parsed: ParsedSkill[] = [];

		for (const slot of skillSlots) {
			if (slot._skillHashId === -1) continue; // Empty slot

			parsed.push({
				slotIndex: slot._slotIndex,
				skillId: slot._skillHashId,
				level: levelMap.get(slot._skillHashId) ?? 0,
			});
		}

		return parsed;
	}

	getRelicLoadouts(saveData: unknown): RelicLoadoutSummary[] {
		const data = saveData as SaveFile;
		const relicData = data._relicLoadoutsSaveData as SaveFileRelicLoadoutsData;

		const summaries: RelicLoadoutSummary[] = [];

		for (let i = 0; i < relicData._loadouts.length; i++) {
			const loadout = relicData._loadouts[i];
			summaries.push({
				index: i,
				relicCount: loadout.Items?.length ?? 0,
				isCurrentInGame: i === relicData._currentIndex,
			});
		}

		return summaries;
	}

	parseRelics(saveData: unknown, loadoutIndex: number): ParsedRelic[] {
		const data = saveData as SaveFile;
		const relicData = data._relicLoadoutsSaveData as SaveFileRelicLoadoutsData;

		if (loadoutIndex < 0 || loadoutIndex >= relicData._loadouts.length) {
			return [];
		}

		const loadout = relicData._loadouts[loadoutIndex];
		const items = loadout.Items ?? [];

		return items.map((item) => {
			// Parse regular affixes
			const affixes: ParsedAffix[] = (item._affixesData ?? []).map((a) => ({
				affixId: a._relicAffixDefinitionId,
				rollValue: a._rollValue,
				tier: a._tier,
				locked: a._locked,
			}));

			// Parse implicit affixes (devotion, etc.)
			const implicitAffixes: ParsedImplicitAffix[] = (item._implicitAffixesData ?? []).map(
				(ia) => ({
					category: ia._eImplicitAffixCategory,
					affix: {
						affixId: ia._relicAffixData._relicAffixDefinitionId,
						rollValue: ia._relicAffixData._rollValue,
						tier: ia._relicAffixData._tier,
						locked: ia._relicAffixData._locked,
					},
				}),
			);

			return {
				baseId: item._relicBaseDefinitionID,
				tier: item._tier,
				rarity: item._eRelicRarity,
				upgradeLevel: item._upgradeLevel,
				position: {
					x: item._position.x,
					y: item._position.y,
				},
				affixes,
				implicitAffixes,
				isCorrupted: item._isCorrupted,
				ascended: item._ascended,
			};
		});
	}

	parseConstellations(saveData: unknown): ParsedConstellation[] {
		const data = saveData as SaveFile;
		const constData = data.constellationsData as SaveFileConstellationsData;

		const parsed: ParsedConstellation[] = [];

		for (const tree of constData.skillTreesData) {
			for (const node of tree._skillTreeNodes) {
				// Only include allocated nodes (level > 0)
				if (node._upgradeLevel > 0) {
					parsed.push({
						constellationId: tree._skillTreeHashId,
						nodeGuid: node._nodeDefinitionGuid,
						level: node._upgradeLevel,
					});
				}
			}
		}

		return parsed;
	}
}

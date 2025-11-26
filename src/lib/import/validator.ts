/**
 * Import Validator
 * Validates parsed data before applying to contexts
 */

import type { SkillsHelper } from "$lib/hellclock/skills";
import type { RelicsHelper } from "$lib/hellclock/relics";
import type { ConstellationsHelper } from "$lib/hellclock/constellations";
import type {
	ParsedSkill,
	ParsedRelic,
	ParsedConstellation,
	ValidationResult,
	ImportError,
	ImportWarning,
} from "./types";

export type ValidatedData<T> = {
	data: T;
	errors: ImportError[];
	warnings: ImportWarning[];
};

export class ImportValidator {
	constructor(
		private skillsHelper: SkillsHelper,
		private relicsHelper: RelicsHelper,
		private constellationsHelper: ConstellationsHelper,
	) {}

	/**
	 * Validate a single skill
	 */
	validateSkill(skill: ParsedSkill): ValidationResult {
		const skillDef = this.skillsHelper.getSkillById(skill.skillId);

		if (!skillDef) {
			return {
				valid: false,
				error: `Unknown skill ID: ${skill.skillId}`,
			};
		}

		// Check if slot index is valid (0-4)
		if (skill.slotIndex < 0 || skill.slotIndex > 4) {
			return {
				valid: false,
				error: `Invalid slot index: ${skill.slotIndex}`,
			};
		}

		// Check if level is valid
		// modifiersPerLevel is a Record<string, SkillUpgradeModifier[]> with keys "1", "2", etc.
		const maxLevel = Object.keys(skillDef.modifiersPerLevel ?? {}).length;
		if (skill.level > maxLevel) {
			return {
				valid: true, // Still valid, but warn and cap
				warning: `Skill level ${skill.level} exceeds max ${maxLevel}, will be capped`,
			};
		}

		return { valid: true };
	}

	/**
	 * Validate all skills
	 */
	validateSkills(skills: ParsedSkill[]): ValidatedData<ParsedSkill[]> {
		const validSkills: ParsedSkill[] = [];
		const errors: ImportError[] = [];
		const warnings: ImportWarning[] = [];

		for (const skill of skills) {
			const result = this.validateSkill(skill);

			if (!result.valid) {
				errors.push({
					system: "skills",
					message: result.error!,
					data: skill,
				});
			} else {
				validSkills.push(skill);
				if (result.warning) {
					warnings.push({
						system: "skills",
						message: result.warning,
					});
				}
			}
		}

		return { data: validSkills, errors, warnings };
	}

	/**
	 * Validate a single relic
	 */
	validateRelic(relic: ParsedRelic): ValidationResult {
		// Find relic base definition by ID
		const relicDefs = this.relicsHelper.getRelicDefinitions();
		const baseDef = relicDefs.find((r) => r.id === relic.baseId);

		if (!baseDef) {
			return {
				valid: false,
				error: `Unknown relic base ID: ${relic.baseId}`,
			};
		}

		// Validate affixes exist
		for (const affix of relic.affixes) {
			const affixDef = this.relicsHelper.getRelicAffixById(affix.affixId);
			if (!affixDef) {
				return {
					valid: false,
					error: `Unknown affix ID: ${affix.affixId} on relic ${baseDef.name}`,
				};
			}
		}

		// Validate implicit affixes exist
		for (const implicit of relic.implicitAffixes) {
			const affixDef = this.relicsHelper.getRelicAffixById(implicit.affix.affixId);
			if (!affixDef) {
				return {
					valid: false,
					error: `Unknown implicit affix ID: ${implicit.affix.affixId} on relic ${baseDef.name}`,
				};
			}
		}

		// Validate tier is reasonable (0-4)
		if (relic.tier < 0 || relic.tier > 4) {
			return {
				valid: true,
				warning: `Relic tier ${relic.tier} is outside normal range (0-4)`,
			};
		}

		return { valid: true };
	}

	/**
	 * Validate all relics
	 */
	validateRelics(relics: ParsedRelic[]): ValidatedData<ParsedRelic[]> {
		const validRelics: ParsedRelic[] = [];
		const errors: ImportError[] = [];
		const warnings: ImportWarning[] = [];

		for (const relic of relics) {
			const result = this.validateRelic(relic);

			if (!result.valid) {
				errors.push({
					system: "relics",
					message: result.error!,
					data: relic,
				});
			} else {
				validRelics.push(relic);
				if (result.warning) {
					warnings.push({
						system: "relics",
						message: result.warning,
					});
				}
			}
		}

		return { data: validRelics, errors, warnings };
	}

	/**
	 * Validate a single constellation node
	 */
	validateConstellation(node: ParsedConstellation): ValidationResult {
		const constellation = this.constellationsHelper.getConstellationById(node.constellationId);

		if (!constellation) {
			return {
				valid: false,
				error: `Unknown constellation ID: ${node.constellationId}`,
			};
		}

		const nodeDef = this.constellationsHelper.getNodeById(node.constellationId, node.nodeGuid);

		if (!nodeDef) {
			return {
				valid: false,
				error: `Unknown node GUID: ${node.nodeGuid} in constellation ${constellation.name}`,
			};
		}

		// Check level is valid
		const maxLevel = nodeDef.maxLevel ?? 1;
		if (node.level > maxLevel) {
			return {
				valid: true,
				warning: `Node level ${node.level} exceeds max ${maxLevel}, will be capped`,
			};
		}

		return { valid: true };
	}

	/**
	 * Validate all constellation nodes
	 */
	validateConstellations(
		nodes: ParsedConstellation[],
	): ValidatedData<ParsedConstellation[]> {
		const validNodes: ParsedConstellation[] = [];
		const errors: ImportError[] = [];
		const warnings: ImportWarning[] = [];

		for (const node of nodes) {
			const result = this.validateConstellation(node);

			if (!result.valid) {
				errors.push({
					system: "constellations",
					message: result.error!,
					data: node,
				});
			} else {
				validNodes.push(node);
				if (result.warning) {
					warnings.push({
						system: "constellations",
						message: result.warning,
					});
				}
			}
		}

		return { data: validNodes, errors, warnings };
	}
}

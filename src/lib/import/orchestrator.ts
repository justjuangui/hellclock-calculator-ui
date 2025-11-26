/**
 * Import Orchestrator
 * Coordinates the import process: adapter → validator → applier
 */

import type { SkillsHelper } from "$lib/hellclock/skills";
import type { RelicsHelper } from "$lib/hellclock/relics";
import type { ConstellationsHelper } from "$lib/hellclock/constellations";
import type { SkillEquippedAPI } from "$lib/context/skillequipped.svelte";
import type { RelicInventoryAPI } from "$lib/context/relicequipped.svelte";
import type { ConstellationEquippedAPI } from "$lib/context/constellationequipped.svelte";

import type { ImportAdapter } from "./adapters/base";
import { V1Adapter } from "./adapters/v1.adapter";
import { ImportValidator } from "./validator";
import { ImportApplier } from "./applier";
import type {
  ImportOptions,
  ImportResult,
  ImportError,
  ImportWarning,
  ParsedSkill,
  ParsedRelic,
  ParsedConstellation,
  RelicLoadoutSummary,
} from "./types";

export type ImportPreview = {
  skills: ParsedSkill[];
  relicLoadouts: RelicLoadoutSummary[];
  constellations: ParsedConstellation[];
  errors: ImportError[];
  warnings: ImportWarning[];
};

export class ImportOrchestrator {
  private adapters: ImportAdapter[];
  private validator: ImportValidator;
  private applier: ImportApplier;

  constructor(
    private skillsHelper: SkillsHelper,
    private relicsHelper: RelicsHelper,
    private constellationsHelper: ConstellationsHelper,
  ) {
    // Register adapters (add new versions here)
    this.adapters = [new V1Adapter()];

    // Initialize validator and applier
    this.validator = new ImportValidator(
      skillsHelper,
      relicsHelper,
      constellationsHelper,
    );
    this.applier = new ImportApplier(skillsHelper, relicsHelper);
  }

  /**
   * Find the appropriate adapter for the save data
   */
  private findAdapter(saveData: unknown): ImportAdapter | null {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(saveData)) {
        return adapter;
      }
    }
    return null;
  }

  /**
   * Preview what will be imported without applying
   * Returns parsed data for UI display
   */
  preview(saveData: unknown): ImportPreview {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    // Find adapter
    const adapter = this.findAdapter(saveData);
    if (!adapter) {
      errors.push({
        system: "skills",
        message: "Unsupported save file format",
      });
      return {
        skills: [],
        relicLoadouts: [],
        constellations: [],
        errors,
        warnings,
      };
    }

    // Parse all data
    const skills = adapter.parseSkills(saveData);
    const relicLoadouts = adapter.getRelicLoadouts(saveData);
    const constellations = adapter.parseConstellations(saveData);

    // Validate (but don't filter out invalid items for preview)
    const skillValidation = this.validator.validateSkills(skills);
    const constellationValidation =
      this.validator.validateConstellations(constellations);

    // Collect all errors and warnings
    errors.push(...skillValidation.errors);
    errors.push(...constellationValidation.errors);
    warnings.push(...skillValidation.warnings);
    warnings.push(...constellationValidation.warnings);

    return {
      skills,
      relicLoadouts,
      constellations,
      errors,
      warnings,
    };
  }

  /**
   * Get relics for a specific loadout (for preview)
   */
  previewRelics(
    saveData: unknown,
    loadoutIndex: number,
  ): {
    relics: ParsedRelic[];
    errors: ImportError[];
    warnings: ImportWarning[];
  } {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    const adapter = this.findAdapter(saveData);
    if (!adapter) {
      errors.push({
        system: "relics",
        message: "Unsupported save file format",
      });
      return { relics: [], errors, warnings };
    }

    const relics = adapter.parseRelics(saveData, loadoutIndex);
    const validation = this.validator.validateRelics(relics);

    return {
      relics,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  /**
   * Import data into the application
   */
  async import(
    saveData: unknown,
    options: ImportOptions,
    contexts: {
      skillApi: SkillEquippedAPI;
      relicApi: RelicInventoryAPI;
      constellationApi: ConstellationEquippedAPI;
    },
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: {
        skills: 0,
        relics: 0,
        constellations: 0,
      },
      errors: [],
      warnings: [],
    };

    // Find adapter
    const adapter = this.findAdapter(saveData);
    if (!adapter) {
      result.success = false;
      result.errors.push({
        system: "skills",
        message: "Unsupported save file format",
      });
      return result;
    }

    // Import skills
    if (options.skills) {
      const skills = adapter.parseSkills(saveData);
      const validation = this.validator.validateSkills(skills);

      result.errors.push(...validation.errors);
      result.warnings.push(...validation.warnings);

      if (validation.data.length > 0) {
        result.imported.skills = this.applier.applySkills(
          validation.data,
          contexts.skillApi,
        );
      }
    }

    // Import relics
    if (options.relics) {
      const relics = adapter.parseRelics(saveData, options.relicLoadoutIndex);
      const validation = this.validator.validateRelics(relics);

      result.errors.push(...validation.errors);
      result.warnings.push(...validation.warnings);

      if (validation.data.length > 0) {
        result.imported.relics = this.applier.applyRelics(
          validation.data,
          contexts.relicApi,
        );
      }
    }

    // Import constellations
    if (options.constellations) {
      const constellations = adapter.parseConstellations(saveData);
      const validation = this.validator.validateConstellations(constellations);

      result.errors.push(...validation.errors);
      result.warnings.push(...validation.warnings);

      if (validation.data.length > 0) {
        result.imported.constellations = this.applier.applyConstellations(
          validation.data,
          contexts.constellationApi,
        );
      }
    }

    // Set success based on whether we had any critical errors
    result.success = result.errors.length === 0;

    return result;
  }
}

/**
 * Import module exports
 */

// Types
export type {
	ImportOptions,
	ImportResult,
	ImportError,
	ImportWarning,
	ValidationResult,
	ParsedSkill,
	ParsedRelic,
	ParsedConstellation,
	ParsedGear,
	ParsedAffix,
	ParsedImplicitAffix,
	RelicLoadoutSummary,
	GearLoadoutSummary,
	SaveFile,
} from "./types";

// Adapter interface
export type { ImportAdapter } from "./adapters/base";

// Implementations
export { V1Adapter } from "./adapters/v1.adapter";
export { ImportValidator } from "./validator";
export { ImportApplier } from "./applier";
export { ImportOrchestrator } from "./orchestrator";
export type { ImportPreview } from "./orchestrator";

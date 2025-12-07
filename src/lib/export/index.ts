/**
 * Hell Clock Build Export Module
 *
 * Provides functionality to serialize character builds to a compact
 * base64-encoded binary format for sharing and importing.
 *
 * Usage:
 * ```typescript
 * import { collectBuild, exportBuild } from '$lib/export';
 *
 * // Collect build data from context APIs
 * const build = collectBuild({
 *   blessedGearApi,
 *   trinketGearApi,
 *   skillApi,
 *   relicApi,
 *   bellApi,
 *   constellationApi,
 *   worldTierApi,
 *   gearsHelper,
 * });
 *
 * // Export to base64 string
 * const result = exportBuild(build);
 * if (result.success) {
 *   console.log(result.code); // Base64 export code
 * }
 * ```
 */

// Types
export type {
  SerializableBuild,
  SerializableGear,
  SerializableSkill,
  SerializableRelicInventory,
  SerializableRelic,
  SerializableAffix,
  SerializableBellState,
  SerializableBellNode,
  SerializableConstellationState,
  SerializableConstellationNode,
  ExportResult,
  ExportStats,
} from "./types";

export { ExportComponent } from "./types";

// Collectors
export { collectBuild, type CollectorContext } from "./collectors";

// Encoder
export { exportBuild, hasBuildData } from "./encoder";

// Decoder
export { decodeBuild, isExportCode, getComponentNames, type DecodeResult } from "./decoder";

// Format utilities (for advanced use)
export { FORMAT, toBase64, fromBase64 } from "./format";

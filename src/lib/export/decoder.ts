/**
 * Main build decoder - orchestrates decoding of all components from base64
 */

import type { SerializableBuild } from "./types";
import { ExportComponent } from "./types";
import { FORMAT, fromBase64, readUint8, readUint16LE } from "./format";
import { decodeGear } from "./components/gear";
import { decodeSkills } from "./components/skills";
import { decodeRelics } from "./components/relics";
import { decodeBells } from "./components/bells";
import { decodeConstellations } from "./components/constellations";
import { decodeWorldTier } from "./components/worldtier";

// ============================================================================
// Decode Result Types
// ============================================================================

export type DecodeResult = {
  success: boolean;
  build?: SerializableBuild;
  error?: string;
  version?: number;
  componentMask?: number;
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if a string looks like a valid export code
 */
export function isExportCode(data: string): boolean {
  // Must be a non-empty string
  if (typeof data !== "string" || data.length === 0) {
    return false;
  }

  // Try to decode base64
  try {
    const bytes = fromBase64(data.trim());
    // Must have at least header size
    if (bytes.length < FORMAT.HEADER_SIZE) {
      return false;
    }
    // Check magic byte
    return bytes[0] === FORMAT.MAGIC_BYTE;
  } catch {
    return false;
  }
}

// ============================================================================
// Main Decoder
// ============================================================================

/**
 * Decode a base64 export code to SerializableBuild
 */
export function decodeBuild(base64: string): DecodeResult {
  try {
    // Decode base64
    const bytes = fromBase64(base64.trim());
    const view = new DataView(bytes.buffer);

    // Validate minimum size
    if (bytes.length < FORMAT.HEADER_SIZE) {
      return {
        success: false,
        error: `Invalid export code: too short (${bytes.length} bytes)`,
      };
    }

    // Read and validate header
    let offset = 0;

    // Magic byte
    let magic: number;
    [magic, offset] = readUint8(view, offset);
    if (magic !== FORMAT.MAGIC_BYTE) {
      return {
        success: false,
        error: `Invalid export code: wrong magic byte (expected 0x${FORMAT.MAGIC_BYTE.toString(16)}, got 0x${magic.toString(16)})`,
      };
    }

    // Version
    let version: number;
    [version, offset] = readUint8(view, offset);
    if (version !== FORMAT.VERSION) {
      return {
        success: false,
        error: `Unsupported export version: ${version} (expected ${FORMAT.VERSION})`,
        version,
      };
    }

    // Component mask
    let componentMask: number;
    [componentMask, offset] = readUint8(view, offset);

    // Reserved byte
    offset += 1;

    // Decode components
    const build: SerializableBuild = {};

    // Helper to decode a component with length prefix
    const decodeComponent = <T>(
      decodeFn: (view: DataView, offset: number) => [T, number],
    ): T => {
      let length: number;
      [length, offset] = readUint16LE(view, offset);

      const [data] = decodeFn(view, offset);
      offset += length;
      return data;
    };

    // Bit 0: Blessed Gear
    if (componentMask & ExportComponent.BlessedGear) {
      build.blessedGear = decodeComponent(decodeGear);
    }

    // Bit 1: Trinket Gear
    if (componentMask & ExportComponent.TrinketGear) {
      build.trinketGear = decodeComponent(decodeGear);
    }

    // Bit 2: Skills
    if (componentMask & ExportComponent.Skills) {
      build.skills = decodeComponent(decodeSkills);
    }

    // Bit 3: Relics
    if (componentMask & ExportComponent.Relics) {
      build.relics = decodeComponent(decodeRelics);
    }

    // Bit 4: Bells
    if (componentMask & ExportComponent.Bells) {
      build.bells = decodeComponent(decodeBells);
    }

    // Bit 5: Constellations
    if (componentMask & ExportComponent.Constellations) {
      build.constellations = decodeComponent(decodeConstellations);
    }

    // Bit 6: World Tier
    if (componentMask & ExportComponent.WorldTier) {
      build.worldTier = decodeComponent(decodeWorldTier);
    }

    return {
      success: true,
      build,
      version,
      componentMask,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during decode",
    };
  }
}

/**
 * Get a human-readable list of components in a bitmask
 */
export function getComponentNames(mask: number): string[] {
  const names: string[] = [];

  if (mask & ExportComponent.BlessedGear) names.push("Blessed Gear");
  if (mask & ExportComponent.TrinketGear) names.push("Trinket Gear");
  if (mask & ExportComponent.Skills) names.push("Skills");
  if (mask & ExportComponent.Relics) names.push("Relics");
  if (mask & ExportComponent.Bells) names.push("Bells");
  if (mask & ExportComponent.Constellations) names.push("Constellations");
  if (mask & ExportComponent.WorldTier) names.push("World Tier");

  return names;
}

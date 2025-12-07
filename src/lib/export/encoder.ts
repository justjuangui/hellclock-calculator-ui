/**
 * Main build encoder - orchestrates encoding of all components
 */

import type { SerializableBuild, ExportResult, ExportStats } from "./types";
import { ExportComponent } from "./types";
import { FORMAT, writeUint8, writeUint16LE, toBase64 } from "./format";
import { encodeGear, estimateGearSize } from "./components/gear";
import { encodeSkills, estimateSkillsSize } from "./components/skills";
import { encodeRelics, estimateRelicsSize } from "./components/relics";
import { encodeBells, estimateBellsSize } from "./components/bells";
import { encodeConstellations, estimateConstellationsSize } from "./components/constellations";
import { encodeWorldTier, estimateWorldTierSize } from "./components/worldtier";

/**
 * Estimate total buffer size needed for a build
 */
function estimateTotalSize(build: SerializableBuild): number {
  let size = FORMAT.HEADER_SIZE;

  // Each component adds 2 bytes for length prefix + data size
  if (build.blessedGear && build.blessedGear.length > 0) {
    size += 2 + estimateGearSize(build.blessedGear);
  }
  if (build.trinketGear && build.trinketGear.length > 0) {
    size += 2 + estimateGearSize(build.trinketGear);
  }
  if (build.skills && build.skills.length > 0) {
    size += 2 + estimateSkillsSize(build.skills);
  }
  if (build.relics && build.relics.relics.length > 0) {
    size += 2 + estimateRelicsSize(build.relics);
  }
  if (build.bells && build.bells.nodes.length > 0) {
    size += 2 + estimateBellsSize(build.bells);
  }
  if (build.constellations && build.constellations.nodes.length > 0) {
    size += 2 + estimateConstellationsSize(build.constellations);
  }
  if (build.worldTier !== undefined) {
    size += 2 + estimateWorldTierSize();
  }

  return size;
}

/**
 * Build the component bitmask based on which components have data
 */
function buildComponentMask(build: SerializableBuild): number {
  let mask = 0;

  if (build.blessedGear && build.blessedGear.length > 0) {
    mask |= ExportComponent.BlessedGear;
  }
  if (build.trinketGear && build.trinketGear.length > 0) {
    mask |= ExportComponent.TrinketGear;
  }
  if (build.skills && build.skills.length > 0) {
    mask |= ExportComponent.Skills;
  }
  if (build.relics && build.relics.relics.length > 0) {
    mask |= ExportComponent.Relics;
  }
  if (build.bells && build.bells.nodes.length > 0) {
    mask |= ExportComponent.Bells;
  }
  if (build.constellations && build.constellations.nodes.length > 0) {
    mask |= ExportComponent.Constellations;
  }
  if (build.worldTier !== undefined) {
    mask |= ExportComponent.WorldTier;
  }

  return mask;
}

/**
 * Encode a component with length prefix
 * Returns the new offset after writing
 */
function encodeComponentWithLength(
  buffer: ArrayBuffer,
  offset: number,
  encodeFunc: (buffer: ArrayBuffer, offset: number) => number,
): [number, number] {
  const view = new DataView(buffer);

  // Reserve 2 bytes for length
  const lengthOffset = offset;
  offset += 2;

  // Encode the component data
  const dataStart = offset;
  const bytesWritten = encodeFunc(buffer, offset);
  offset = dataStart + bytesWritten;

  // Write the length
  writeUint16LE(view, lengthOffset, bytesWritten);

  return [offset, bytesWritten];
}

/**
 * Main export function - encodes a build to base64 string
 */
export function exportBuild(build: SerializableBuild): ExportResult {
  try {
    // Estimate buffer size with some padding
    const estimatedSize = estimateTotalSize(build) + 100;
    const buffer = new ArrayBuffer(estimatedSize);
    const view = new DataView(buffer);

    const componentBytes: Partial<Record<keyof typeof ExportComponent, number>> = {};
    let offset = 0;

    // Write header
    offset = writeUint8(view, offset, FORMAT.MAGIC_BYTE);
    offset = writeUint8(view, offset, FORMAT.VERSION);
    const componentMask = buildComponentMask(build);
    offset = writeUint8(view, offset, componentMask);
    offset = writeUint8(view, offset, 0); // Reserved byte

    // Encode components in order of their bit position

    // Bit 0: Blessed Gear
    if (build.blessedGear && build.blessedGear.length > 0) {
      const [newOffset, bytes] = encodeComponentWithLength(
        buffer,
        offset,
        (buf, off) => encodeGear(build.blessedGear!, buf, off),
      );
      offset = newOffset;
      componentBytes.BlessedGear = bytes;
    }

    // Bit 1: Trinket Gear
    if (build.trinketGear && build.trinketGear.length > 0) {
      const [newOffset, bytes] = encodeComponentWithLength(
        buffer,
        offset,
        (buf, off) => encodeGear(build.trinketGear!, buf, off),
      );
      offset = newOffset;
      componentBytes.TrinketGear = bytes;
    }

    // Bit 2: Skills
    if (build.skills && build.skills.length > 0) {
      const [newOffset, bytes] = encodeComponentWithLength(
        buffer,
        offset,
        (buf, off) => encodeSkills(build.skills!, buf, off),
      );
      offset = newOffset;
      componentBytes.Skills = bytes;
    }

    // Bit 3: Relics
    if (build.relics && build.relics.relics.length > 0) {
      const [newOffset, bytes] = encodeComponentWithLength(
        buffer,
        offset,
        (buf, off) => encodeRelics(build.relics!, buf, off),
      );
      offset = newOffset;
      componentBytes.Relics = bytes;
    }

    // Bit 4: Bells
    if (build.bells && build.bells.nodes.length > 0) {
      const [newOffset, bytes] = encodeComponentWithLength(
        buffer,
        offset,
        (buf, off) => encodeBells(build.bells!, buf, off),
      );
      offset = newOffset;
      componentBytes.Bells = bytes;
    }

    // Bit 5: Constellations
    if (build.constellations && build.constellations.nodes.length > 0) {
      const [newOffset, bytes] = encodeComponentWithLength(
        buffer,
        offset,
        (buf, off) => encodeConstellations(build.constellations!, buf, off),
      );
      offset = newOffset;
      componentBytes.Constellations = bytes;
    }

    // Bit 6: World Tier
    if (build.worldTier !== undefined) {
      const [newOffset, bytes] = encodeComponentWithLength(
        buffer,
        offset,
        (buf, off) => encodeWorldTier(build.worldTier!, buf, off),
      );
      offset = newOffset;
      componentBytes.WorldTier = bytes;
    }

    // Convert to base64
    const finalData = new Uint8Array(buffer, 0, offset);
    const base64 = toBase64(finalData);

    const stats: ExportStats = {
      totalBytes: offset,
      base64Length: base64.length,
      componentBytes,
    };

    return {
      success: true,
      code: base64,
      stats,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during export",
    };
  }
}

/**
 * Check if a build has any exportable data
 */
export function hasBuildData(build: SerializableBuild): boolean {
  return buildComponentMask(build) !== 0;
}

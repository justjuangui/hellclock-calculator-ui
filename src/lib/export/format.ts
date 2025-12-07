/**
 * Binary format constants and utilities for Hell Clock export
 */

// ============================================================================
// Format Constants
// ============================================================================

export const FORMAT = {
  /** Magic byte identifying Hell Clock exports */
  MAGIC_BYTE: 0x48, // 'H'
  /** Current format version */
  VERSION: 0x01,
  /** Header size in bytes */
  HEADER_SIZE: 4,
  /** Maximum component data size (uint16 max) */
  MAX_COMPONENT_SIZE: 65535,
  /** Multiplier for fixed-point encoding (4 decimal places) */
  FIXED_POINT_SCALE: 10000,
} as const;

// ============================================================================
// Slot Mappings
// ============================================================================

/**
 * Gear slot to numeric value mapping
 */
export const GEAR_SLOT_MAP: Record<string, number> = {
  WEAPON: 0,
  HELMET: 1,
  SHOULDERS: 2,
  ARMOR: 3,
  BRACERS: 4,
  PANTS: 5,
  BOOTS: 6,
  RING_LEFT: 7,
  RING_RIGHT: 8,
  CAPE: 9,
  TRINKET: 10,
  ACCESSORY: 11,
};

/**
 * Reverse mapping from numeric value to gear slot
 */
export const GEAR_SLOT_REVERSE: Record<number, string> = Object.fromEntries(
  Object.entries(GEAR_SLOT_MAP).map(([k, v]) => [v, k]),
);

/**
 * Skill slot to numeric value mapping
 */
export const SKILL_SLOT_MAP: Record<string, number> = {
  SKILL_SLOT_1: 0,
  SKILL_SLOT_2: 1,
  SKILL_SLOT_3: 2,
  SKILL_SLOT_4: 3,
  SKILL_SLOT_5: 4,
};

/**
 * Relic rarity to numeric value mapping
 */
export const RARITY_MAP: Record<string, number> = {
  Common: 0,
  Magic: 1,
  Rare: 2,
  Unique: 3,
};

/**
 * Reverse rarity mapping
 */
export const RARITY_REVERSE: Record<number, string> = {
  0: "Common",
  1: "Magic",
  2: "Rare",
  3: "Unique",
};

// ============================================================================
// GUID Utilities
// ============================================================================

/**
 * Convert a GUID string to 16 bytes
 * Input format: "abc12345-def6-7890-abcd-ef1234567890"
 * Output: Uint8Array of 16 bytes
 */
export function guidToBytes(guid: string): Uint8Array {
  // Remove all dashes
  const hex = guid.replace(/-/g, "");

  if (hex.length !== 32) {
    throw new Error(`Invalid GUID length: expected 32 hex chars, got ${hex.length}`);
  }

  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

/**
 * Convert 16 bytes back to a GUID string
 * Input: Uint8Array of 16 bytes
 * Output format: "abc12345-def6-7890-abcd-ef1234567890"
 */
export function bytesToGuid(bytes: Uint8Array): string {
  if (bytes.length !== 16) {
    throw new Error(`Invalid bytes length: expected 16, got ${bytes.length}`);
  }

  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Format as UUID: 8-4-4-4-12
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// ============================================================================
// Fixed-Point Encoding
// ============================================================================

/**
 * Convert a float to fixed-point uint16 (4 decimal places)
 * @param value Float value (typically 0.0 - 2.0)
 * @returns uint16 value (0-65535)
 */
export function floatToFixed(value: number): number {
  return Math.round(value * FORMAT.FIXED_POINT_SCALE);
}

/**
 * Convert a fixed-point uint16 back to float
 * @param value uint16 value
 * @returns Float value
 */
export function fixedToFloat(value: number): number {
  return value / FORMAT.FIXED_POINT_SCALE;
}

// ============================================================================
// Binary Buffer Helpers
// ============================================================================

/**
 * Write a uint8 to a DataView at the given offset
 */
export function writeUint8(view: DataView, offset: number, value: number): number {
  view.setUint8(offset, value);
  return offset + 1;
}

/**
 * Write a uint16 (little-endian) to a DataView at the given offset
 */
export function writeUint16LE(view: DataView, offset: number, value: number): number {
  view.setUint16(offset, value, true); // true = little-endian
  return offset + 2;
}

/**
 * Write a GUID (16 bytes) to a DataView at the given offset
 */
export function writeGuid(view: DataView, offset: number, guid: string): number {
  const bytes = guidToBytes(guid);
  for (let i = 0; i < 16; i++) {
    view.setUint8(offset + i, bytes[i]);
  }
  return offset + 16;
}

/**
 * Read a uint8 from a DataView at the given offset
 */
export function readUint8(view: DataView, offset: number): [number, number] {
  return [view.getUint8(offset), offset + 1];
}

/**
 * Read a uint16 (little-endian) from a DataView at the given offset
 */
export function readUint16LE(view: DataView, offset: number): [number, number] {
  return [view.getUint16(offset, true), offset + 2];
}

/**
 * Read a GUID (16 bytes) from a DataView at the given offset
 */
export function readGuid(view: DataView, offset: number): [string, number] {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = view.getUint8(offset + i);
  }
  return [bytesToGuid(bytes), offset + 16];
}

// ============================================================================
// Base64 Encoding
// ============================================================================

/**
 * Encode a Uint8Array to base64 string
 */
export function toBase64(data: Uint8Array): string {
  // Use browser's btoa for base64 encoding
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

/**
 * Decode a base64 string to Uint8Array
 */
export function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

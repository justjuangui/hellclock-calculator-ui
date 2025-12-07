/**
 * World Tier component encoder/decoder
 * Format: [1 byte tierIndex]
 */

import { writeUint8, readUint8 } from "../format";

/**
 * Calculate the encoded size for world tier data
 */
export function estimateWorldTierSize(): number {
  return 1; // Just 1 byte
}

/**
 * Encode world tier data to binary
 * @returns Number of bytes written
 */
export function encodeWorldTier(
  worldTier: number,
  buffer: ArrayBuffer,
  offset: number,
): number {
  const view = new DataView(buffer);
  writeUint8(view, offset, worldTier);
  return 1;
}

/**
 * Decode world tier data from binary
 * @returns World tier index and bytes read
 */
export function decodeWorldTier(
  view: DataView,
  offset: number,
): [number, number] {
  const [worldTier] = readUint8(view, offset);
  return [worldTier, 1];
}

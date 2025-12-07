/**
 * Gear component encoder/decoder
 * Format: [1 byte count][N * 7 bytes items]
 * Item: [1 slot][2 defId][1 variantIndex][2 multiplier*10000]
 */

import type { SerializableGear } from "../types";
import {
  writeUint8,
  writeUint16LE,
  floatToFixed,
  readUint8,
  readUint16LE,
  fixedToFloat,
} from "../format";

/**
 * Calculate the encoded size for gear data
 */
export function estimateGearSize(gear: SerializableGear[]): number {
  // 1 byte count + 7 bytes per item
  return 1 + gear.length * 7;
}

/**
 * Encode gear data to binary
 * @returns Number of bytes written
 */
export function encodeGear(
  gear: SerializableGear[],
  buffer: ArrayBuffer,
  offset: number,
): number {
  const view = new DataView(buffer);
  let pos = offset;

  // Write count
  pos = writeUint8(view, pos, gear.length);

  // Write each gear item
  for (const item of gear) {
    pos = writeUint8(view, pos, item.slot);
    pos = writeUint16LE(view, pos, item.defId);
    pos = writeUint8(view, pos, item.variantIndex);
    pos = writeUint16LE(view, pos, floatToFixed(item.multiplier));
  }

  return pos - offset;
}

/**
 * Decode gear data from binary
 * @returns Decoded gear array and bytes read
 */
export function decodeGear(
  view: DataView,
  offset: number,
): [SerializableGear[], number] {
  let pos = offset;
  const result: SerializableGear[] = [];

  // Read count
  let count: number;
  [count, pos] = readUint8(view, pos);

  // Read each gear item
  for (let i = 0; i < count; i++) {
    let slot: number, defId: number, variantIndex: number, multiplierFixed: number;

    [slot, pos] = readUint8(view, pos);
    [defId, pos] = readUint16LE(view, pos);
    [variantIndex, pos] = readUint8(view, pos);
    [multiplierFixed, pos] = readUint16LE(view, pos);

    result.push({
      slot,
      defId,
      variantIndex,
      multiplier: fixedToFloat(multiplierFixed),
    });
  }

  return [result, pos - offset];
}

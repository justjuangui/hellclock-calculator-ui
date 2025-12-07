/**
 * Relics component encoder
 * Format: [1 byte tier][1 byte count][N relics]
 * Relic: [2 baseId][1 x][1 y][1 tier][1 rank][1 rarity][1 flags]
 *        [1 specialCount][1 primaryCount][1 secondaryCount][1 hasDevotion][1 hasCorruption]
 *        [N * 4 bytes affixes]
 * Affix: [2 affixId][2 roll*10000]
 */

import type { SerializableRelicInventory, SerializableRelic, SerializableAffix } from "../types";
import {
  writeUint8,
  writeUint16LE,
  floatToFixed,
  readUint8,
  readUint16LE,
  fixedToFloat,
} from "../format";

/**
 * Calculate the encoded size for a single affix
 */
function estimateAffixSize(): number {
  return 4; // 2 bytes id + 2 bytes roll
}

/**
 * Calculate the encoded size for a single relic
 */
function estimateRelicSize(relic: SerializableRelic): number {
  const baseSize = 13; // Fixed header fields
  const affixCount =
    relic.specialAffixes.length +
    relic.primaryAffixes.length +
    relic.secondaryAffixes.length +
    (relic.devotionAffix ? 1 : 0) +
    (relic.corruptionAffix ? 1 : 0);
  return baseSize + affixCount * estimateAffixSize();
}

/**
 * Calculate the encoded size for relic inventory data
 */
export function estimateRelicsSize(inventory: SerializableRelicInventory): number {
  // 1 byte tier + 1 byte count + sum of relic sizes
  let size = 2;
  for (const relic of inventory.relics) {
    size += estimateRelicSize(relic);
  }
  return size;
}

/**
 * Encode a single affix
 */
function encodeAffix(
  affix: SerializableAffix,
  view: DataView,
  offset: number,
): number {
  let pos = offset;
  pos = writeUint16LE(view, pos, affix.id);
  pos = writeUint16LE(view, pos, floatToFixed(affix.roll));
  return pos;
}

/**
 * Encode relics data to binary
 * @returns Number of bytes written
 */
export function encodeRelics(
  inventory: SerializableRelicInventory,
  buffer: ArrayBuffer,
  offset: number,
): number {
  const view = new DataView(buffer);
  let pos = offset;

  // Write inventory tier and relic count
  pos = writeUint8(view, pos, inventory.tier);
  pos = writeUint8(view, pos, inventory.relics.length);

  // Write each relic
  for (const relic of inventory.relics) {
    // Base fields
    pos = writeUint16LE(view, pos, relic.baseId);
    pos = writeUint8(view, pos, relic.x);
    pos = writeUint8(view, pos, relic.y);
    pos = writeUint8(view, pos, relic.tier);
    pos = writeUint8(view, pos, relic.rank);
    pos = writeUint8(view, pos, relic.rarity);

    // Flags: bit 0 = corrupted
    const flags = relic.isCorrupted ? 0x01 : 0x00;
    pos = writeUint8(view, pos, flags);

    // Affix counts
    pos = writeUint8(view, pos, relic.specialAffixes.length);
    pos = writeUint8(view, pos, relic.primaryAffixes.length);
    pos = writeUint8(view, pos, relic.secondaryAffixes.length);
    pos = writeUint8(view, pos, relic.devotionAffix ? 1 : 0);
    pos = writeUint8(view, pos, relic.corruptionAffix ? 1 : 0);

    // Write affixes in order: special, primary, secondary, devotion, corruption
    for (const affix of relic.specialAffixes) {
      pos = encodeAffix(affix, view, pos);
    }
    for (const affix of relic.primaryAffixes) {
      pos = encodeAffix(affix, view, pos);
    }
    for (const affix of relic.secondaryAffixes) {
      pos = encodeAffix(affix, view, pos);
    }
    if (relic.devotionAffix) {
      pos = encodeAffix(relic.devotionAffix, view, pos);
    }
    if (relic.corruptionAffix) {
      pos = encodeAffix(relic.corruptionAffix, view, pos);
    }
  }

  return pos - offset;
}

/**
 * Decode a single affix
 */
function decodeAffix(view: DataView, offset: number): [SerializableAffix, number] {
  let pos = offset;
  let id: number, rollFixed: number;

  [id, pos] = readUint16LE(view, pos);
  [rollFixed, pos] = readUint16LE(view, pos);

  return [{ id, roll: fixedToFloat(rollFixed) }, pos];
}

/**
 * Decode relics data from binary
 * @returns Decoded relic inventory and bytes read
 */
export function decodeRelics(
  view: DataView,
  offset: number,
): [SerializableRelicInventory, number] {
  let pos = offset;

  // Read inventory tier and relic count
  let tier: number, relicCount: number;
  [tier, pos] = readUint8(view, pos);
  [relicCount, pos] = readUint8(view, pos);

  const relics: SerializableRelic[] = [];

  // Read each relic
  for (let i = 0; i < relicCount; i++) {
    let baseId: number, x: number, y: number, relicTier: number, rank: number, rarity: number;
    let flags: number;
    let specialCount: number, primaryCount: number, secondaryCount: number;
    let hasDevotion: number, hasCorruption: number;

    // Base fields
    [baseId, pos] = readUint16LE(view, pos);
    [x, pos] = readUint8(view, pos);
    [y, pos] = readUint8(view, pos);
    [relicTier, pos] = readUint8(view, pos);
    [rank, pos] = readUint8(view, pos);
    [rarity, pos] = readUint8(view, pos);
    [flags, pos] = readUint8(view, pos);

    // Affix counts
    [specialCount, pos] = readUint8(view, pos);
    [primaryCount, pos] = readUint8(view, pos);
    [secondaryCount, pos] = readUint8(view, pos);
    [hasDevotion, pos] = readUint8(view, pos);
    [hasCorruption, pos] = readUint8(view, pos);

    // Read affixes
    const specialAffixes: SerializableAffix[] = [];
    const primaryAffixes: SerializableAffix[] = [];
    const secondaryAffixes: SerializableAffix[] = [];
    let devotionAffix: SerializableAffix | undefined;
    let corruptionAffix: SerializableAffix | undefined;

    for (let j = 0; j < specialCount; j++) {
      let affix: SerializableAffix;
      [affix, pos] = decodeAffix(view, pos);
      specialAffixes.push(affix);
    }
    for (let j = 0; j < primaryCount; j++) {
      let affix: SerializableAffix;
      [affix, pos] = decodeAffix(view, pos);
      primaryAffixes.push(affix);
    }
    for (let j = 0; j < secondaryCount; j++) {
      let affix: SerializableAffix;
      [affix, pos] = decodeAffix(view, pos);
      secondaryAffixes.push(affix);
    }
    if (hasDevotion) {
      [devotionAffix, pos] = decodeAffix(view, pos);
    }
    if (hasCorruption) {
      [corruptionAffix, pos] = decodeAffix(view, pos);
    }

    relics.push({
      baseId,
      x,
      y,
      tier: relicTier,
      rank,
      rarity,
      isCorrupted: (flags & 0x01) !== 0,
      specialAffixes,
      primaryAffixes,
      secondaryAffixes,
      devotionAffix,
      corruptionAffix,
    });
  }

  return [{ tier, relics }, pos - offset];
}

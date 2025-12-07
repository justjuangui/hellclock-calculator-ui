/**
 * Skills component encoder/decoder
 * Format: [1 byte count][N * 4 bytes items]
 * Item: [1 slotIndex][2 skillId][1 level]
 */

import type { SerializableSkill } from "../types";
import { writeUint8, writeUint16LE, readUint8, readUint16LE } from "../format";

/**
 * Calculate the encoded size for skills data
 */
export function estimateSkillsSize(skills: SerializableSkill[]): number {
  // 1 byte count + 4 bytes per skill
  return 1 + skills.length * 4;
}

/**
 * Encode skills data to binary
 * @returns Number of bytes written
 */
export function encodeSkills(
  skills: SerializableSkill[],
  buffer: ArrayBuffer,
  offset: number,
): number {
  const view = new DataView(buffer);
  let pos = offset;

  // Write count
  pos = writeUint8(view, pos, skills.length);

  // Write each skill
  for (const skill of skills) {
    pos = writeUint8(view, pos, skill.slotIndex);
    pos = writeUint16LE(view, pos, skill.skillId);
    pos = writeUint8(view, pos, skill.level);
  }

  return pos - offset;
}

/**
 * Decode skills data from binary
 * @returns Decoded skills array and bytes read
 */
export function decodeSkills(
  view: DataView,
  offset: number,
): [SerializableSkill[], number] {
  let pos = offset;
  const result: SerializableSkill[] = [];

  // Read count
  let count: number;
  [count, pos] = readUint8(view, pos);

  // Read each skill
  for (let i = 0; i < count; i++) {
    let slotIndex: number, skillId: number, level: number;

    [slotIndex, pos] = readUint8(view, pos);
    [skillId, pos] = readUint16LE(view, pos);
    [level, pos] = readUint8(view, pos);

    result.push({ slotIndex, skillId, level });
  }

  return [result, pos - offset];
}

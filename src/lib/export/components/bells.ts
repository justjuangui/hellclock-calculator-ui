/**
 * Bells component encoder
 * Format: [2 bytes activeBellId][2 bytes nodeCount][N * 18 bytes nodes]
 * Node: [1 bellId][16 nodeGuid][1 level]
 */

import type { SerializableBellState, SerializableBellNode } from "../types";
import {
  writeUint8,
  writeUint16LE,
  writeGuid,
  readUint8,
  readUint16LE,
  readGuid,
} from "../format";

/**
 * Calculate the encoded size for bells data
 */
export function estimateBellsSize(bells: SerializableBellState): number {
  // 2 bytes activeBellId + 2 bytes count + 18 bytes per node
  return 4 + bells.nodes.length * 18;
}

/**
 * Encode bells data to binary
 * @returns Number of bytes written
 */
export function encodeBells(
  bells: SerializableBellState,
  buffer: ArrayBuffer,
  offset: number,
): number {
  const view = new DataView(buffer);
  let pos = offset;

  // Write active bell ID and node count
  pos = writeUint16LE(view, pos, bells.activeBellId);
  pos = writeUint16LE(view, pos, bells.nodes.length);

  // Write each node
  for (const node of bells.nodes) {
    pos = writeUint8(view, pos, node.bellId);
    pos = writeGuid(view, pos, node.nodeGuid);
    pos = writeUint8(view, pos, node.level);
  }

  return pos - offset;
}

/**
 * Decode bells data from binary
 * @returns Decoded bell state and bytes read
 */
export function decodeBells(
  view: DataView,
  offset: number,
): [SerializableBellState, number] {
  let pos = offset;

  // Read active bell ID and node count
  let activeBellId: number, nodeCount: number;
  [activeBellId, pos] = readUint16LE(view, pos);
  [nodeCount, pos] = readUint16LE(view, pos);

  const nodes: SerializableBellNode[] = [];

  // Read each node
  for (let i = 0; i < nodeCount; i++) {
    let bellId: number, nodeGuid: string, level: number;

    [bellId, pos] = readUint8(view, pos);
    [nodeGuid, pos] = readGuid(view, pos);
    [level, pos] = readUint8(view, pos);

    nodes.push({ bellId, nodeGuid, level });
  }

  return [{ activeBellId, nodes }, pos - offset];
}

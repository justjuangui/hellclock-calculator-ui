/**
 * Constellations component encoder
 * Format: [2 bytes nodeCount][N * 19 bytes nodes]
 * Node: [2 constellationId][16 nodeGuid][1 level]
 */

import type { SerializableConstellationState, SerializableConstellationNode } from "../types";
import {
  writeUint8,
  writeUint16LE,
  writeGuid,
  readUint8,
  readUint16LE,
  readGuid,
} from "../format";

/**
 * Calculate the encoded size for constellations data
 */
export function estimateConstellationsSize(constellations: SerializableConstellationState): number {
  // 2 bytes count + 19 bytes per node
  return 2 + constellations.nodes.length * 19;
}

/**
 * Encode constellations data to binary
 * @returns Number of bytes written
 */
export function encodeConstellations(
  constellations: SerializableConstellationState,
  buffer: ArrayBuffer,
  offset: number,
): number {
  const view = new DataView(buffer);
  let pos = offset;

  // Write node count
  pos = writeUint16LE(view, pos, constellations.nodes.length);

  // Write each node
  for (const node of constellations.nodes) {
    pos = writeUint16LE(view, pos, node.constellationId);
    pos = writeGuid(view, pos, node.nodeGuid);
    pos = writeUint8(view, pos, node.level);
  }

  return pos - offset;
}

/**
 * Decode constellations data from binary
 * @returns Decoded constellation state and bytes read
 */
export function decodeConstellations(
  view: DataView,
  offset: number,
): [SerializableConstellationState, number] {
  let pos = offset;

  // Read node count
  let nodeCount: number;
  [nodeCount, pos] = readUint16LE(view, pos);

  const nodes: SerializableConstellationNode[] = [];

  // Read each node
  for (let i = 0; i < nodeCount; i++) {
    let constellationId: number, nodeGuid: string, level: number;

    [constellationId, pos] = readUint16LE(view, pos);
    [nodeGuid, pos] = readGuid(view, pos);
    [level, pos] = readUint8(view, pos);

    nodes.push({ constellationId, nodeGuid, level });
  }

  return [{ nodes }, pos - offset];
}

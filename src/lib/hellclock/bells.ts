import { translate, type LangText } from "$lib/hellclock/lang";
import type { StatsHelper } from "$lib/hellclock/stats";
import { formatIndexed, type TooltipLine } from "$lib/hellclock/utils";
import { formatStatModNumber } from "./formats";
import type { SkillsHelper } from "./skills";
import type {
  NodeAffix,
  NodePosition,
  SkillTreeNodeDefinition,
  SkillTreeNodeEdgeData,
  AllocatedNodesMap,
  AllocatedNode,
  StatModifierNodeAffixDefinition,
  CharacterIncrementNodeAffixDefinition,
} from "./constellations";
import type { ModifierType } from "./relics";

// Re-export shared types for convenience
export type {
  NodeAffix,
  NodePosition,
  SkillTreeNodeDefinition,
  SkillTreeNodeEdgeData,
  AllocatedNodesMap,
  AllocatedNode,
};

// Bell type enum
export type BellType = "Campaign" | "Infernal" | "Oblivion";

// Bell ID mapping
export const BELL_IDS: Record<BellType, number> = {
  Campaign: 5,
  Infernal: 28,
  Oblivion: 72,
};

// Reverse mapping
export const BELL_TYPES_BY_ID: Record<number, BellType> = {
  5: "Campaign",
  28: "Infernal",
  72: "Oblivion",
};

// Bell skill tree definition
export interface GreatBellSkillTreeDefinition {
  name: string;
  id: number;
  type: "GreatBellSkillTreeDefinition";
  nodes: SkillTreeNodeDefinition[];
}

// Bell display info
export interface BellInfo {
  id: number;
  type: BellType;
  name: string;
  nodeCount: number;
}

// Helper class for bell data access
export class BellsHelper {
  private bells: Map<number, GreatBellSkillTreeDefinition> = new Map();
  private bellsByType: Map<BellType, GreatBellSkillTreeDefinition> = new Map();

  constructor(
    campaignBell: GreatBellSkillTreeDefinition,
    infernalBell: GreatBellSkillTreeDefinition,
    oblivionBell: GreatBellSkillTreeDefinition,
  ) {
    this.bells.set(campaignBell.id, campaignBell);
    this.bells.set(infernalBell.id, infernalBell);
    this.bells.set(oblivionBell.id, oblivionBell);

    this.bellsByType.set("Campaign", campaignBell);
    this.bellsByType.set("Infernal", infernalBell);
    this.bellsByType.set("Oblivion", oblivionBell);
  }

  // Get all bells
  getAllBells(): GreatBellSkillTreeDefinition[] {
    return Array.from(this.bells.values());
  }

  // Get bell info for UI display
  getAllBellInfo(): BellInfo[] {
    return this.getAllBells().map((bell) => ({
      id: bell.id,
      type: BELL_TYPES_BY_ID[bell.id],
      name: BELL_TYPES_BY_ID[bell.id],
      nodeCount: bell.nodes.length,
    }));
  }

  getStatValueAtLevel(
    value: number,
    level: number,
    modifierType: ModifierType,
  ): number {
    if (modifierType === "Additive") {
      return value * level;
    }

    return (value - 1.0) * level + 1.0;
  }

  // Get bell by ID
  getBellById(id: number): GreatBellSkillTreeDefinition | undefined {
    return this.bells.get(id);
  }

  // Get bell by type
  getBellByType(type: BellType): GreatBellSkillTreeDefinition | undefined {
    return this.bellsByType.get(type);
  }

  // Get node by UUID within a bell
  getNodeById(
    bellId: number,
    nodeId: string,
  ): SkillTreeNodeDefinition | undefined {
    const bell = this.getBellById(bellId);
    if (!bell) return undefined;
    return bell.nodes.find((node) => node.GUID === nodeId);
  }

  // Get all root nodes (starting points) for a bell
  getRootNodes(bellId: number): SkillTreeNodeDefinition[] {
    const bell = this.getBellById(bellId);
    if (!bell) return [];
    return bell.nodes.filter((node) => node.isRoot);
  }

  // Get nodes that depend on a given node
  getDependentNodes(bellId: number, nodeId: string): SkillTreeNodeDefinition[] {
    const bell = this.getBellById(bellId);
    if (!bell) return [];
    return bell.nodes.filter((node) =>
      node.edges.some((edge) => edge.requiredNode.name === nodeId),
    );
  }

  // Check if a node has a valid path to an allocated root node
  hasPathToAllocatedRoot(
    bellId: number,
    nodeId: string,
    allocatedNodes: AllocatedNodesMap,
    visited: Set<string> = new Set(),
  ): boolean {
    // Prevent infinite loops
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);

    const node = this.getNodeById(bellId, nodeId);
    if (!node) return false;

    // Base case: if this is a root node, path is valid
    if (node.isRoot) return true;

    // Case 1: Node has edges (explicit dependencies)
    if (node.edges.length > 0) {
      // Check if ANY edge is satisfied and leads to root
      for (const edge of node.edges) {
        const requiredNodeId = edge.requiredNode.name;
        const allocatedKey = `${bellId}:${requiredNodeId}`;
        const allocatedNode = allocatedNodes.get(allocatedKey);

        // Edge is satisfied if allocated with sufficient level
        if (allocatedNode && allocatedNode.level >= edge.pointsToUnlock) {
          // Recursively check if parent has path to root
          if (
            this.hasPathToAllocatedRoot(
              bellId,
              requiredNodeId,
              allocatedNodes,
              visited,
            )
          ) {
            return true;
          }
        }
      }
    }

    // Case 2: Node has NO edges - find parent nodes via reverse lookup
    const bell = this.getBellById(bellId);
    if (!bell) return false;

    // Find nodes that have this node as a required dependency
    for (const potentialParent of bell.nodes) {
      const hasThisAsRequirement = potentialParent.edges.some(
        (edge) => edge.requiredNode.name === nodeId,
      );

      if (hasThisAsRequirement) {
        const parentKey = `${bellId}:${potentialParent.name}`;
        const parentAllocated = allocatedNodes.get(parentKey);

        if (parentAllocated) {
          // Parent is allocated, recursively check if it has path to root
          if (
            this.hasPathToAllocatedRoot(
              bellId,
              potentialParent.name,
              allocatedNodes,
              visited,
            )
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  // Check if a node's dependencies are satisfied
  canAllocateNode(
    bellId: number,
    nodeId: string,
    allocatedNodes: AllocatedNodesMap,
  ): { canAllocate: boolean; reason?: string } {
    const node = this.getNodeById(bellId, nodeId);
    if (!node) {
      return { canAllocate: false, reason: "Node not found" };
    }

    // Root nodes can always be allocated
    if (node.isRoot) {
      return { canAllocate: true };
    }

    if (!this.hasPathToAllocatedRoot(bellId, nodeId, allocatedNodes)) {
      return { canAllocate: false, reason: "No path to allocated root node" };
    }
    return { canAllocate: true };
  }

  // Check if a node can be deallocated without orphaning other nodes
  canDeallocateNode(
    bellId: number,
    nodeId: string,
    allocatedNodes: AllocatedNodesMap,
  ): { canDeallocate: boolean; orphanedNodes?: string[] } {
    const node = this.getNodeById(bellId, nodeId);
    if (!node) {
      return { canDeallocate: false, orphanedNodes: [] };
    }

    // Create simulated allocatedNodes without this node
    const simulatedNodes = new Map(allocatedNodes);
    const key = `${bellId}:${nodeId}`;
    simulatedNodes.delete(key);

    // Find all nodes in this bell that would remain allocated
    const orphanedNodes: string[] = [];

    for (const [allocKey, allocated] of simulatedNodes.entries()) {
      // Only check nodes in the same bell
      if (allocated.constellationId !== bellId) continue;

      // Skip root nodes (always valid)
      const allocNode = this.getNodeById(
        allocated.constellationId,
        allocated.nodeId,
      );
      if (allocNode?.isRoot) continue;

      // Check if this node would still have path to root
      if (
        !this.hasPathToAllocatedRoot(
          allocated.constellationId,
          allocated.nodeId,
          simulatedNodes,
        )
      ) {
        orphanedNodes.push(allocated.nodeId);
      }
    }

    if (orphanedNodes.length > 0) {
      return { canDeallocate: false, orphanedNodes };
    }

    return { canDeallocate: true };
  }

  // Get total points spent in a bell
  getTotalPointsSpent(
    bellId: number,
    allocatedNodes: AllocatedNodesMap,
  ): number {
    let total = 0;
    for (const [_, allocated] of allocatedNodes.entries()) {
      if (allocated.constellationId === bellId) {
        total += allocated.level;
      }
    }
    return total;
  }

  // Get important nodes (keystones, notable passives, etc.)
  getImportantNodes(bellId: number): SkillTreeNodeDefinition[] {
    const bell = this.getBellById(bellId);
    if (!bell) return [];
    return bell.nodes.filter((node) => node.importantNode);
  }

  // Calculate node allocation key
  getAllocationKey(bellId: number, nodeId: string): string {
    return `${bellId}:${nodeId}`;
  }

  // Get tooltip lines for a bell node
  getTooltipLines(
    bell: GreatBellSkillTreeDefinition,
    node: SkillTreeNodeDefinition,
    lang: string,
    allocatedLevel: number = 0,
    statsHelper: StatsHelper,
    skillsHelper: SkillsHelper,
  ): TooltipLine[] {
    const lines: TooltipLine[] = [];
    const bellType = BELL_TYPES_BY_ID[bell.id];

    // Bell name as header
    lines.push({
      text: `${bellType} Bell`,
      type: "header",
      color: this.getBellColor(bellType),
    });

    // Node name
    const nodeName = translate(node.nameLocalizationKey, lang);

    lines.push({
      text: nodeName,
      type: node.importantNode ? "header" : "info",
      color: node.importantNode ? "#fbbf24" : undefined,
      icon: node.sprite,
    });

    // Level info if applicable
    if (node.maxLevel > 1) {
      lines.push({
        text: `Level: ${allocatedLevel} / ${node.maxLevel}`,
        type: "info",
      });
    } else if (allocatedLevel > 0) {
      lines.push({
        text: "Allocated",
        type: "info",
        color: "#4ade80",
      });
    }

    // Divider before affixes
    if (node.affixes.length > 0) {
      lines.push({ text: "", type: "divider" });

      // Add affixes
      for (const affix of node.affixes) {
        let affixText = "";

        if (affix.type === "StatModifierNodeAffixDefinition") {
          const statAffix = affix as StatModifierNodeAffixDefinition;
          const statDefinition = statsHelper.getStatByName(
            statAffix.eStatDefinition,
          );
          if (statDefinition) {
            // Multiply by level (use 1 if not allocated to show per-point value)
            const effectiveLevel = allocatedLevel === 0 ? 1 : allocatedLevel;
            const formattedValue = formatStatModNumber(
              this.getStatValueAtLevel(
                statAffix.value,
                effectiveLevel,
                statAffix.statModifierType,
              ),
              statDefinition.eStatFormat,
              statAffix.statModifierType || "Additive",
              1,
              0,
              1,
            );
            const statLabel = statsHelper.getLabelForStat(
              statAffix.eStatDefinition,
              lang,
            );
            affixText = `${formattedValue} ${statLabel}`;
          }
        } else if (affix.type === "SkillBehaviorNodeAffixDefinition") {
          affixText = translate(affix.description, lang);
        } else if (affix.type === "CharacterIncrementNodeAffixDefinition") {
          const charAffix = affix as CharacterIncrementNodeAffixDefinition;
          const effectiveLevel = allocatedLevel === 0 ? 1 : allocatedLevel;
          const effectiveValue = charAffix.valuePerLevel * effectiveLevel;
          affixText = formatIndexed(
            translate(charAffix.description, lang),
            effectiveValue.toString(),
          );
        } else {
          affixText = affix.name;
        }

        lines.push({
          text: affixText,
          type: "affix",
          icon: "UI_AffixBullet",
        });
      }
    }

    return lines;
  }

  // Get bell color for UI
  getBellColor(type: BellType): string {
    switch (type) {
      case "Campaign":
        return "#60a5fa"; // Blue
      case "Infernal":
        return "#f87171"; // Red
      case "Oblivion":
        return "#a78bfa"; // Purple
      default:
        return "#ffffff";
    }
  }
}

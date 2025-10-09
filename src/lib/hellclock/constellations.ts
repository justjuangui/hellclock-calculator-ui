import { translate, type LangText } from "$lib/hellclock/lang";
import type { StatModifierType, StatsHelper } from "$lib/hellclock/stats";
import { parseRGBA01ToCss, type TooltipLine } from "$lib/hellclock/utils";
import { formatStatModNumber } from "./formats";
import type { SkillsHelper } from "./skills";

// Position is [x, y] array
export type NodePosition = [number, number];

// Base node affix types
export type NodeAffixType =
  | "StatModifierNodeAffixDefinition"
  | "UnlockSkillNodeAffixDefinition"
  | "SkillModifierNodeAffixDefinition"
  | "AttributeNodeAffixDefinition"
  | "StatusNodeAffixDefinition";

export interface NodeAffixBase {
  name: string;
  type: NodeAffixType;
  hideDescription: boolean;
  hideFromAggregatedDescriptions: boolean;
  description: LangText[];
}

export interface StatModifierNodeAffixDefinition extends NodeAffixBase {
  type: "StatModifierNodeAffixDefinition";
  eStatDefinition: string; // Stat name like "PlagueDamage", "Health", etc.
  statModifierType: StatModifierType;
  value: number;
}

export interface UnlockSkillNodeAffixDefinition extends NodeAffixBase {
  type: "UnlockSkillNodeAffixDefinition";
  skillDefinition: {
    name: string;
    id: number;
    type: string;
  };
}

export interface SkillModifierNodeAffixDefinition extends NodeAffixBase {
  type: "SkillModifierNodeAffixDefinition";
  skillValueModifierKey: string;
  modifierType: StatModifierType;
  value: number;
}

export interface AttributeNodeAffixDefinition extends NodeAffixBase {
  type: "AttributeNodeAffixDefinition";
  attributeType: string;
  value: number;
}

export interface StatusNodeAffixDefinition extends NodeAffixBase {
  type: "StatusNodeAffixDefinition";
  statusDefinition: {
    name: string;
    id: number;
    type: string;
  };
  duration: number;
}

export type NodeAffix =
  | StatModifierNodeAffixDefinition
  | UnlockSkillNodeAffixDefinition
  | SkillModifierNodeAffixDefinition
  | AttributeNodeAffixDefinition
  | StatusNodeAffixDefinition;

// Edge definition for node dependencies
export interface SkillTreeNodeEdgeData {
  type: "SkillTreeNodeEdgeData";
  requiredNode: {
    name: string; // UUID of required node
    type: "SkillTreeNodeDefinition";
  };
  pointsToUnlock: number; // Number of points needed in the required node
}

// Skill tree node definition
export interface SkillTreeNodeDefinition {
  name: string; // UUID
  type: "SkillTreeNodeDefinition";
  edges: SkillTreeNodeEdgeData[]; // Dependencies
  sprite: string; // Icon sprite name
  nameLocalizationKey: LangText[];
  maxLevel: number;
  importantNode: boolean;
  isRoot: boolean;
  affixes: NodeAffix[];
  Position: NodePosition; // [x, y] coordinates
}

// Constellation definition
export interface ConstellationSkillTreeDefinition {
  name: string;
  id: number;
  type: "ConstellationSkillTreeDefinition";
  conditions: any[]; // Unlock conditions (can be expanded later)
  masteredDevotionGranted: Record<string, any>; // Mastery bonuses
  nameKey: LangText[];
  illustrationLine: string; // Background image for constellation
  illustrationBlurredLine: string; // Blurred background
  eDevotionCategory: string; // Category like "Red", "Green", etc.
  nodes: SkillTreeNodeDefinition[];
}

// Constellation details wrapper
export interface ConstellationDetails {
  type: "ConstellationDetails";
  definition: ConstellationSkillTreeDefinition;
  width: number;
  height: number;
  position: NodePosition; // Position in the overall constellation map
  nodeViewPosition: [number, number, number]; // Viewport position for UI
  nodeViewScale: [number, number, number];
}

// Devotion category types
export type DevotionCategory =
  | "Red" // Fury
  | "Green" // Discipline
  | "Blue" // Faith
  | "Neutral"
  | "RedBlue" // Hybrid
  | "GreenBlue" // Hybrid
  | "GreenRed"; // Hybrid

// Devotion configuration for visual theming and UI display
export interface DevotionConfig {
  type: "DevotionConfig";
  eDevotionCategory: DevotionCategory;
  illustrationBaseColor: string; // RGBA color string
  illustrationMasteredColor: string; // RGBA color string
  nodeColor: string; // RGBA color string
  investedConnectionColor: string; // RGBA color string with alpha
  appliedConnectionColor: string; // RGBA color string
  masteredConnectionColor: string; // RGBA color string
  hideFromUI: boolean;
  nameKey: LangText[]; // Localized name for the devotion path
  icon: string; // Icon sprite name (e.g., "UI_Constellation_IconFury")
  iconColor: string; // RGBA color string
}

// Root config structure
export interface ConstellationsConfig {
  name: "ConstellationsConfig";
  type: "ConstellationsConfig";
  constellationsDetails: ConstellationDetails[];
  devotionConfigs: DevotionConfig[];
}

// Helper types for node allocation state
export type NodeAllocationLevel = number; // 0 = not allocated, 1+ = level allocated

export interface AllocatedNode {
  constellationId: number;
  nodeId: string; // UUID
  level: NodeAllocationLevel;
}

export type AllocatedNodesMap = Map<string, AllocatedNode>; // key: "constellationId:nodeId"

// Helper class for constellation data access
export class ConstellationsHelper {
  private config: ConstellationsConfig;

  constructor(config: ConstellationsConfig) {
    this.config = config;
  }

  // Get all constellations
  getAllConstellations(): ConstellationDetails[] {
    return this.config.constellationsDetails;
  }

  // Get constellation by ID
  getConstellationById(
    id: number,
  ): ConstellationSkillTreeDefinition | undefined {
    return this.config.constellationsDetails
      .map((detail) => detail.definition)
      .find((constellation) => constellation.id === id);
  }

  // Get constellation by name
  getConstellationByName(
    name: string,
  ): ConstellationSkillTreeDefinition | undefined {
    return this.config.constellationsDetails
      .map((detail) => detail.definition)
      .find((constellation) => constellation.name === name);
  }

  // Get node by UUID within a constellation
  getNodeById(
    constellationId: number,
    nodeId: string,
  ): SkillTreeNodeDefinition | undefined {
    const constellation = this.getConstellationById(constellationId);
    if (!constellation) return undefined;
    return constellation.nodes.find((node) => node.name === nodeId);
  }

  // Get all root nodes (starting points) for a constellation
  getRootNodes(constellationId: number): SkillTreeNodeDefinition[] {
    const constellation = this.getConstellationById(constellationId);
    if (!constellation) return [];
    return constellation.nodes.filter((node) => node.isRoot);
  }

  // Get nodes that depend on a given node
  getDependentNodes(
    constellationId: number,
    nodeId: string,
  ): SkillTreeNodeDefinition[] {
    const constellation = this.getConstellationById(constellationId);
    if (!constellation) return [];
    return constellation.nodes.filter((node) =>
      node.edges.some((edge) => edge.requiredNode.name === nodeId),
    );
  }

  // Check if a node's dependencies are satisfied
  canAllocateNode(
    constellationId: number,
    nodeId: string,
    allocatedNodes: AllocatedNodesMap,
  ): { canAllocate: boolean; reason?: string } {
    const node = this.getNodeById(constellationId, nodeId);
    if (!node) {
      return { canAllocate: false, reason: "Node not found" };
    }

    // Root nodes can always be allocated
    if (node.isRoot) {
      return { canAllocate: true };
    }

    // Check all edge dependencies
    for (const edge of node.edges) {
      const requiredNodeId = edge.requiredNode.name;
      const allocatedKey = `${constellationId}:${requiredNodeId}`;
      const allocatedNode = allocatedNodes.get(allocatedKey);

      if (!allocatedNode) {
        return {
          canAllocate: false,
          reason: `Required node ${requiredNodeId} not allocated`,
        };
      }

      if (allocatedNode.level < edge.pointsToUnlock) {
        return {
          canAllocate: false,
          reason: `Required node needs ${edge.pointsToUnlock} points, has ${allocatedNode.level}`,
        };
      }
    }

    return { canAllocate: true };
  }

  // Get total devotion points spent in a constellation
  getTotalDevotionSpent(
    constellationId: number,
    allocatedNodes: AllocatedNodesMap,
  ): number {
    let total = 0;
    for (const [key, allocated] of allocatedNodes.entries()) {
      if (allocated.constellationId === constellationId) {
        total += allocated.level;
      }
    }
    return total;
  }

  // Get all stat modifiers from allocated nodes
  getStatModifiersFromAllocatedNodes(
    allocatedNodes: AllocatedNodesMap,
  ): StatModifierNodeAffixDefinition[] {
    const modifiers: StatModifierNodeAffixDefinition[] = [];

    for (const [key, allocated] of allocatedNodes.entries()) {
      if (allocated.level === 0) continue;

      const node = this.getNodeById(
        allocated.constellationId,
        allocated.nodeId,
      );
      if (!node) continue;

      // Collect stat modifier affixes
      for (const affix of node.affixes) {
        if (affix.type === "StatModifierNodeAffixDefinition") {
          // Apply level multiplier if needed (some nodes may scale with level)
          modifiers.push(affix);
        }
      }
    }

    return modifiers;
  }

  // Get important nodes (keystones, notable passives, etc.)
  getImportantNodes(constellationId: number): SkillTreeNodeDefinition[] {
    const constellation = this.getConstellationById(constellationId);
    if (!constellation) return [];
    return constellation.nodes.filter((node) => node.importantNode);
  }

  // Calculate node allocation key
  getAllocationKey(constellationId: number, nodeId: string): string {
    return `${constellationId}:${nodeId}`;
  }

  // Get all devotion configs
  getAllDevotionConfigs(): DevotionConfig[] {
    return this.config.devotionConfigs;
  }

  // Get devotion config by category
  getDevotionConfigByCategory(
    category: DevotionCategory,
  ): DevotionConfig | undefined {
    return this.config.devotionConfigs.find(
      (config) => config.eDevotionCategory === category,
    );
  }

  // Get tooltip lines for a constellation node
  getTooltipLines(
    constellation: ConstellationSkillTreeDefinition,
    node: SkillTreeNodeDefinition,
    lang: string,
    allocatedLevel: number = 0,
    statsHelper: StatsHelper,
    skillsHelper: SkillsHelper,
  ): TooltipLine[] {
    const lines: TooltipLine[] = [];
    const devotionConfig = this.getDevotionConfigByCategory(
      constellation.eDevotionCategory as any,
    );
    // First constellation Name
    const constellationName = translate(constellation.nameKey, lang);
    lines.push({
      text: constellationName,
      type: "header",
      color: devotionConfig
        ? parseRGBA01ToCss(devotionConfig.illustrationBaseColor)
        : "white",
    });

    // Node name as header
    const nodeName = translate(node.nameLocalizationKey);

    lines.push({
      text: nodeName,
      type: node.importantNode ? "header" : "info",
      color: node.importantNode ? "#fbbf24" : undefined, // Yellow for important nodes
      icon: node.sprite
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
          const statDefinition = statsHelper.getStatByName(
            affix.eStatDefinition,
          );
          if (statDefinition) {
            const formattedValue = formatStatModNumber(
              affix.value,
              statDefinition.eStatFormat,
              affix.statModifierType || "Additive",
              1, // selectedValue
              0, // minMultiplier
              1, // maxMultiplier
            );
            const statLabel = statsHelper.getLabelForStat(
              affix.eStatDefinition,
              lang,
            );
            affixText = `${formattedValue} ${statLabel}`;
          }
        } else {
          affixText = affix.name;
        }

        lines.push({
          text: affixText,
          type: "affix",
        });
      }
    }

    // Requirements section
    if (node.edges.length > 0 && !node.isRoot) {
      lines.push({ text: "", type: "divider" });
      lines.push({
        text: "Requirements:",
        type: "info",
      });

      for (const edge of node.edges) {
        const requiredNode = constellation.nodes.find(
          (n) => n.name === edge.requiredNode.name,
        );
        if (requiredNode) {
          const reqNodeName = translate(requiredNode.nameLocalizationKey);
          lines.push({
            text: `${reqNodeName}: ${edge.pointsToUnlock} ${edge.pointsToUnlock === 1 ? "point" : "points"}`,
            type: "info",
          });
        }
      }
    }

    return lines;
  }
}

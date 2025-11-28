import { translate, type LangText } from "$lib/hellclock/lang";
import type { StatModifierType, StatsHelper } from "$lib/hellclock/stats";
import {
  formatIndexed,
  parseRGBA01ToCss,
  type TooltipLine,
} from "$lib/hellclock/utils";
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
  | "StatusNodeAffixDefinition"
  | "DevotionIncrementNodeAffixDefinition"
  | "SkillBehaviorNodeAffixDefinition"
  | "SkillEquipNodeAffixDefinition"
  | "SkillUnlockNodeAffixDefinition"
  | "StatusIntensityNodeAffixDefinition";

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

export interface DevotionIncrementNodeAffixDefinition extends NodeAffixBase {
  type: "DevotionIncrementNodeAffixDefinition";
  valuePerLevel: number;
  eDevotionCategory: string; // e.g., "Red", "Green", "Blue"
}

// Skill behavior system enums and types
export type SkillEffectTrigger =
  | "TargetHit"
  | "BuildDamage"
  | "Always"
  | "DealDamage"
  | "OnFinishUse";

export type CharacterEffectTrigger =
  | "Kill"
  | "OnHurt"
  | "OnSpendMana"
  | "IgnoreDamage"
  | "DealDamage"
  | "OnDrainLife"
  | "OnDepleteMana"
  | "BeforeTakeDamage"
  | "OnCollectPrize"
  | "OnStatus"
  | "MoveDistance"
  | "OnDepleteBarrier"
  | "OnApplyStatus"
  | "OnManaChange"
  | "OnMinionAmountChange"
  | "Always";

export type EffectTarget = "Self" | "TargetHit";

export type SkillEffectVariableStackType =
  | "UseHighest"
  | "MultiplierSum"
  | "Sum";

export type SkillEffectVariableFormat =
  | "MultiplicativeAdditive"
  | "Percentage"
  | "NoFormat"
  | "Rounded"
  | "Multiplicative";

export type ComparisonOperator = "Equal" | "GreaterThanOrEqual";

export type ValueComparisonType =
  | "TargetIsElite"
  | "EnduredDamage"
  | "InputValue";

// Skill effect variable reference - used for dynamic values
export interface SkillEffectVariableReference {
  type: "SkillEffectVariableReference";
  valueOrName: string; // Variable name or numeric string
  eSkillEffectVariableModifier: string; // Comma-separated modifiers like "MultiplyByCurrentMana" or "0" for none
  statusToStack: Partial<StatusDefinition>; // Status to use for stack-based modifiers
  supportVariableValueOrName: string;
  supportESkillEffectVariableModifier: string;
  supportStatusToStack: Partial<StatusDefinition>;
}

// Skill effect variable definition
export interface SkillEffectVariable {
  type: "SkillEffectVariable";
  name: string;
  baseValue: number;
  eSkillEffectVariableStackType: SkillEffectVariableStackType;
  eSkillEffectVariableFormat: SkillEffectVariableFormat;
}

export interface SkillEffectVariables {
  type: "SkillEffectVariables";
  variables: SkillEffectVariable[];
}

// Status definition reference
export interface StatusDefinition {
  name: string;
  id: number;
  type: string; // e.g., "StatModifierStatusDefinition"
}

// Skill effect rule set
export interface SkillEffectRuleSet {
  type: "SkillEffectRuleSet";
  rules: SkillEffectRule[];
}

// Base skill effect data
export interface BaseSkillEffectData {
  name: string;
  useCharacterEffectTrigger: boolean;
  effectTrigger: SkillEffectTrigger;
  characterEffectTrigger: CharacterEffectTrigger;
  ruleSet: SkillEffectRuleSet;
  revertOnRuleFail: boolean;
  revertOnRemoval: boolean;
  triggerTargetValue: SkillEffectVariableReference;
  triggerTargetEnumValue: number;
  triggerTargetStringValue: string;
  subEffects: SkillEffectData[];
}

// Skill effect rules
export interface RandomChanceSkillEffectRule {
  name: string;
  type: "RandomChanceSkillEffectRule";
  chance: SkillEffectVariableReference;
  negate: boolean;
}

export interface ValueComparisonSkillEffectRule {
  name: string;
  type: "ValueComparisonSkillEffectRule";
  value1Type: ValueComparisonType;
  value1Input: SkillEffectVariableReference;
  comparisonOperator: ComparisonOperator;
  value2Type: ValueComparisonType;
  value2Input: SkillEffectVariableReference;
  negate: boolean;
}

export interface DamageTypeSkillEffectRule {
  name: string;
  type: "DamageTypeSkillEffectRule";
  eDamageTypeDefinition: string; // e.g., "PHYSICAL"
  negate: boolean;
}

export interface TargetHasStatusSkillEffectRule {
  name: string;
  type: "TargetHasStatusSkillEffectRule";
  effectTarget: EffectTarget;
  statusDefinition: StatusDefinition;
  checkForStacks: boolean;
  negate: boolean;
}

export interface UseIntervalSkillEffectRule {
  name: string;
  type: "UseIntervalSkillEffectRule";
  interval: SkillEffectVariableReference;
  negate: boolean;
}

export interface TargetStateConditionSkillEffectRule {
  name: string;
  type: "TargetStateConditionSkillEffectRule";
  condition: string;
  negate: boolean;
}

export type SkillEffectRule =
  | RandomChanceSkillEffectRule
  | ValueComparisonSkillEffectRule
  | DamageTypeSkillEffectRule
  | TargetHasStatusSkillEffectRule
  | UseIntervalSkillEffectRule
  | TargetStateConditionSkillEffectRule;

// Skill effect data types
export interface AddStatusToTargetSkillEffectData extends BaseSkillEffectData {
  type: "AddStatusToTargetSkillEffectData";
  removeOnEffectReversion: boolean;
  effectTarget: EffectTarget;
  statusDefinition: StatusDefinition;
  statusDuration: SkillEffectVariableReference;
  statusIntensity: SkillEffectVariableReference;
  stackAmount: SkillEffectVariableReference;
}

export interface RemoveStatusFromTargetSkillEffectData
  extends Partial<BaseSkillEffectData> {
  name?: string;
  type: "RemoveStatusFromTargetSkillEffectData";
  effectTarget: EffectTarget;
  statusDefinition: StatusDefinition;
  removeStacks: boolean;
  stacksToRemove?: SkillEffectVariableReference;
  useCharacterEffectTrigger: boolean;
  effectTrigger: SkillEffectTrigger;
  characterEffectTrigger: CharacterEffectTrigger;
  ruleSet: SkillEffectRuleSet;
  revertOnRuleFail: boolean;
  revertOnRemoval: boolean;
  triggerTargetValue: SkillEffectVariableReference;
  triggerTargetEnumValue: number;
  triggerTargetStringValue: string;
  subEffects: SkillEffectData[];
}

export interface SkillEffectStatModifierDefinition {
  type: "SkillEffectStatModifierDefinition";
  eStatDefinition: string;
  modifierType: StatModifierType;
  value: SkillEffectVariableReference;
  useStatConversion: boolean;
  conversionStatDefinition: string;
  listenToVariableModifiersUpdate: boolean;
}

export interface AddSkillStatModifierSkillEffectData
  extends BaseSkillEffectData {
  type: "AddSkillStatModifierSkillEffectData";
  statModifiers: SkillEffectStatModifierDefinition[];
}

export interface SkillEffectSkillModifierDefinition {
  type: "SkillEffectSkillModifierDefinition";
  skillValueModifierKey: string;
  modifierType: StatModifierType;
  value: SkillEffectVariableReference;
  useStatConversion: boolean;
  conversionStatDefinition: string;
  listenToVariableModifiersUpdate: boolean;
}

export interface AddSkillValueModifierSkillEffectData
  extends BaseSkillEffectData {
  type: "AddSkillValueModifierSkillEffectData";
  modifiers: SkillEffectSkillModifierDefinition[];
}

export interface AddCharacterStatModifierSkillEffectData
  extends BaseSkillEffectData {
  type: "AddCharacterStatModifierSkillEffectData";
  statModifiers: SkillEffectStatModifierDefinition[];
}

export interface PlayGameplayFxSkillEffectData extends BaseSkillEffectData {
  type: "PlayGameplayFxSkillEffectData";
}

export interface DamageTargetSkillEffectData extends BaseSkillEffectData {
  type: "DamageTargetSkillEffectData";
  effectTarget: EffectTarget;
  damage: SkillEffectVariableReference;
}

export interface RechargeSkillCooldownSkillEffectData
  extends BaseSkillEffectData {
  type: "RechargeSkillCooldownSkillEffectData";
  rechargeAmount: SkillEffectVariableReference;
}

export interface AddBarrierSkillEffectData extends BaseSkillEffectData {
  type: "AddBarrierSkillEffectData";
  barrierAmount: SkillEffectVariableReference;
}

export interface AddStatusMaxStackSkillEffectData extends BaseSkillEffectData {
  type: "AddStatusMaxStackSkillEffectData";
  statusDefinition: StatusDefinition;
  maxStackModifier: SkillEffectVariableReference;
}

export type SkillEffectData =
  | AddStatusToTargetSkillEffectData
  | RemoveStatusFromTargetSkillEffectData
  | AddSkillStatModifierSkillEffectData
  | AddSkillValueModifierSkillEffectData
  | AddCharacterStatModifierSkillEffectData
  | PlayGameplayFxSkillEffectData
  | DamageTargetSkillEffectData
  | RechargeSkillCooldownSkillEffectData
  | AddBarrierSkillEffectData
  | AddStatusMaxStackSkillEffectData;

// Skill behavior data
export interface SkillBehaviorData {
  type: "SkillBehaviorData";
  affectMultipleSkills: boolean;
  useListOfSkills: boolean;
  listOfSkills: any[]; // Array of skill references
  skillTagFilter: string; // e.g., "Everything"
  skillDefinition: Partial<any>; // Skill definition object
  variables: SkillEffectVariables;
  effects: SkillEffectData[];
}

// Localization variable for skill behavior
export interface SkillBehaviorLocalizationVariable {
  type: "SkillBehaviorLocalizationVariable";
  skillEffectVariableReference: SkillEffectVariableReference;
  overrideFormat: boolean;
  valueFormatOverride: string; // e.g., "Percentage"
}

// Main skill behavior node affix
export interface SkillBehaviorNodeAffixDefinition extends NodeAffixBase {
  type: "SkillBehaviorNodeAffixDefinition";
  additionalLocalizationVariables: SkillBehaviorLocalizationVariable[];
  eModifierType: StatModifierType;
  valuePerLevel: number;
  behaviorData: SkillBehaviorData;
}

// Additional affix types found in constellation data
export interface SkillEquipNodeAffixDefinition extends NodeAffixBase {
  type: "SkillEquipNodeAffixDefinition";
  skillDefinition: Partial<any>;
}

export interface SkillUnlockNodeAffixDefinition extends NodeAffixBase {
  type: "SkillUnlockNodeAffixDefinition";
  skillDefinition: Partial<any>;
}

export interface StatusIntensityNodeAffixDefinition extends NodeAffixBase {
  type: "StatusIntensityNodeAffixDefinition";
  statusDefinition: StatusDefinition;
  valuePerLevel: number;
  eModifierType: StatModifierType;
}

export type NodeAffix =
  | StatModifierNodeAffixDefinition
  | UnlockSkillNodeAffixDefinition
  | SkillModifierNodeAffixDefinition
  | AttributeNodeAffixDefinition
  | StatusNodeAffixDefinition
  | DevotionIncrementNodeAffixDefinition
  | SkillBehaviorNodeAffixDefinition
  | SkillEquipNodeAffixDefinition
  | SkillUnlockNodeAffixDefinition
  | StatusIntensityNodeAffixDefinition;

// Edge definition for node dependencies
export interface SkillTreeNodeEdgeData {
  type: "SkillTreeNodeEdgeData";
  requiredNode: {
    GUI: string;
    name: string; // UUID of required node
    type: "SkillTreeNodeDefinition";
  };
  pointsToUnlock: number; // Number of points needed in the required node
}

// Skill tree node definition
export interface SkillTreeNodeDefinition {
  GUID: string;
  name: string;
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

export interface ConditionConfig {
  type: "ConditionConfig";
  targetValue: string;
  negate: boolean;
  condition: string;
  required_devotion: string;
}

// Constellation definition
export interface ConstellationSkillTreeDefinition {
  name: string;
  id: number;
  type: "ConstellationSkillTreeDefinition";
  conditions: ConditionConfig[]; // Unlock conditions (can be expanded later)
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
    return constellation.nodes.find((node) => node.GUID === nodeId);
  }

  getNodeByName(
    constellationId: number,
    nodeName: string,
  ): SkillTreeNodeDefinition | undefined {
    const constellation = this.getConstellationById(constellationId);
    if (!constellation) return undefined;
    return constellation.nodes.find((node) => node.name === nodeName);
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
      node.edges.some((edge) => edge.requiredNode.GUI === nodeId),
    );
  }

  // Check if a node has a valid path to an allocated root node
  hasPathToAllocatedRoot(
    constellationId: number,
    nodeId: string,
    allocatedNodes: AllocatedNodesMap,
    visited: Set<string> = new Set(),
  ): boolean {
    // Prevent infinite loops
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);

    const node = this.getNodeById(constellationId, nodeId);
    if (!node) return false;

    // Base case: if this is a root node, path is valid
    if (node.isRoot) return true;

    // Case 1: Node has edges (explicit dependencies)
    if (node.edges.length > 0) {
      // Check if ANY edge is satisfied and leads to root
      for (const edge of node.edges) {
        let requiredNodeId = "";
        if (edge.requiredNode.GUI) {
          requiredNodeId = edge.requiredNode.GUI;
        } else {
          const reqNode = this.getNodeByName(
            constellationId,
            edge.requiredNode.name,
          );
          requiredNodeId = reqNode ? reqNode.GUID : "";
        }
        const allocatedKey = `${constellationId}:${requiredNodeId}`;
        const allocatedNode = allocatedNodes.get(allocatedKey);

        // Edge is satisfied if allocated with sufficient level
        if (allocatedNode && allocatedNode.level >= edge.pointsToUnlock) {
          // Recursively check if parent has path to root
          if (
            this.hasPathToAllocatedRoot(
              constellationId,
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
    const constellation = this.getConstellationById(constellationId);
    if (!constellation) return false;

    // Find nodes that have this node as a required dependency
    for (const potentialParent of constellation.nodes) {
      const hasThisAsRequirement = potentialParent.edges.some((edge) => {
        if (edge.requiredNode.GUI) {
          return edge.requiredNode.GUI === nodeId;
        }

        const reqNode = this.getNodeByName(
          constellationId,
          edge.requiredNode.name,
        );
        return reqNode && reqNode.GUID === nodeId;
      });

      if (hasThisAsRequirement) {
        let parentNodeId = "";
        if (potentialParent.GUID) {
          parentNodeId = potentialParent.GUID;
        } else {
          const reqNode = this.getNodeByName(
            constellationId,
            potentialParent.name,
          );
          parentNodeId = reqNode ? reqNode.GUID : "";
        }
        const parentKey = `${constellationId}:${parentNodeId}`;
        const parentAllocated = allocatedNodes.get(parentKey);

        if (parentAllocated) {
          // Parent is allocated, recursively check if it has path to root
          if (
            this.hasPathToAllocatedRoot(
              constellationId,
              parentNodeId,
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

    if (!this.hasPathToAllocatedRoot(constellationId, nodeId, allocatedNodes)) {
      return { canAllocate: false, reason: "No path to allocated root node" };
    }
    return { canAllocate: true };
  }

  // Get all nodes that should be cascade-deallocated
  // Note: Constellation unlock checks removed to allow leapfrogging
  getCascadeDeallocations(
    allocatedNodes: AllocatedNodesMap,
    devotionCategoryPoints: Map<string, number>,
  ): Set<string> {
    // Return empty set - no cascade deallocation based on constellation lock status
    return new Set<string>();
  }

  // Check if a node can be deallocated without orphaning other nodes
  canDeallocateNode(
    constellationId: number,
    nodeId: string,
    allocatedNodes: AllocatedNodesMap,
  ): { canDeallocate: boolean; orphanedNodes?: string[] } {
    const node = this.getNodeById(constellationId, nodeId);
    if (!node) {
      return { canDeallocate: false, orphanedNodes: [] };
    }

    // Create simulated allocatedNodes without this node
    const simulatedNodes = new Map(allocatedNodes);
    const key = `${constellationId}:${nodeId}`;
    simulatedNodes.delete(key);

    // Find all nodes in this constellation that would remain allocated
    const orphanedNodes: string[] = [];

    for (const [allocKey, allocated] of simulatedNodes.entries()) {
      // Only check nodes in the same constellation
      if (allocated.constellationId !== constellationId) continue;

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

  // Get total devotion points spent in a constellation
  getTotalDevotionSpent(
    constellationId: number,
    allocatedNodes: AllocatedNodesMap,
  ): number {
    let total = 0;
    for (const [_, allocated] of allocatedNodes.entries()) {
      if (allocated.constellationId === constellationId) {
        total += allocated.level;
      }
    }
    return total;
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
        } else if (affix.type === "DevotionIncrementNodeAffixDefinition") {
          const devotionAffix = affix as DevotionIncrementNodeAffixDefinition;
          const devotionConfig = this.getDevotionConfigByCategory(
            devotionAffix.eDevotionCategory as any,
          );
          const valueText = `+${devotionAffix.valuePerLevel * (allocatedLevel === 0 ? 1 : allocatedLevel)}`;
          affixText = formatIndexed(
            translate(devotionAffix.description, lang),
            devotionConfig
              ? `${translate(devotionConfig.nameKey, lang)} Devotion`
              : "",
            valueText,
          );
        } else if (affix.type === "SkillBehaviorNodeAffixDefinition") {
          // normally this kind of node have descriptions
          affixText = translate(affix.description, lang);
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
}

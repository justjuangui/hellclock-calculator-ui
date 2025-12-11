import type {
  EvaluationNode,
  PipelineDetails,
  DamageFlowDetails,
  DamageFlowPhaseDetails,
  AggregateDetails,
} from "$lib/engine/types";
import {
  visitTree,
  getTemplateAncestor,
} from "$lib/utils/tree-visitor";
import {
  extractPhaseType,
  formatContributionValue,
  formatNodeName,
  getPhaseColor,
  getPhaseDisplayName,
  type PhaseType,
} from "$lib/utils/phase-formatter";
import type {
  ParsedExplanation,
  PipelineInfo,
  DamageFlowInfo,
  DamageFlowPhaseInfo,
  PhaseInfo,
  ContributionInfo,
  TemplateGroup,
  ProcessedContribution,
  NestedGroupInfo,
} from "./types";
import {
  isOutputNode,
  isPipelineNode,
  isPhaseNode,
  isTemplateNode,
  isContributionNode,
  isAggregateNode,
  isDamageFlowNode,
  isDamageFlowCallNode,
  isDamageFlowPhaseNode,
  isGroupTotalNode,
  getContributionDetails,
  getAggregateDetails,
  getGroupTotalDetails,
  extractContributionMetadata,
} from "./type-guards";

// ============================================================================
// Main Parser Entry Point
// ============================================================================

/**
 * Parse the root explanation node and determine the visualization type.
 * Returns a structured ParsedExplanation with the appropriate sub-structure.
 */
export function parseExplanation(root: EvaluationNode): ParsedExplanation {
  // Handle output wrapper node
  let actualRoot = root;
  let rootType: "stat" | "formula" | "damage_flow" = "formula";
  let isExplicitFormula = false;

  if (isOutputNode(root)) {
    const outputDetails = root.details as { type?: string } | undefined;
    if (outputDetails?.type === "stat") {
      rootType = "stat";
    } else if (outputDetails?.type === "formula") {
      isExplicitFormula = true;
    }
    // Unwrap to first child
    actualRoot = root.children?.[0] ?? root;
  }

  // Check for damage_flow (direct or through damage_flow_call wrapper)
  if (isDamageFlowNode(actualRoot)) {
    return {
      rootType: "damage_flow",
      rootNode: actualRoot,
      name: actualRoot.name,
      value: actualRoot.value,
      damageFlow: parseDamageFlow(actualRoot),
    };
  }

  // Check for damage_flow_call wrapper (common for skill damage formulas)
  if (isDamageFlowCallNode(actualRoot)) {
    const damageFlowChild = findDamageFlowNode(actualRoot);
    if (damageFlowChild) {
      return {
        rootType: "damage_flow",
        rootNode: actualRoot,
        name: actualRoot.name || damageFlowChild.name,
        value: damageFlowChild.value,
        damageFlow: parseDamageFlow(damageFlowChild),
      };
    }
  }

  // Check for pipeline (stat with phases) - but only if not explicitly a formula
  if (!isExplicitFormula) {
    const pipelineNode = findPipelineNode(actualRoot);
    if (pipelineNode) {
      return {
        rootType: "stat",
        rootNode: actualRoot,
        name: actualRoot.name,
        value: actualRoot.value,
        pipeline: parsePipeline(pipelineNode),
      };
    }
  }

  // Default: formula/expression
  return {
    rootType: "formula",
    rootNode: actualRoot,
    name: actualRoot.name,
    value: actualRoot.value,
    formula: { expression: actualRoot },
  };
}

/**
 * Legacy entry point for backward compatibility.
 * Parses phases directly from a root node.
 */
export function parsePhases(root: EvaluationNode): PhaseInfo[] {
  const parsed = parseExplanation(root);
  if (parsed.pipeline) {
    return parsed.pipeline.phases;
  }
  return [];
}

// ============================================================================
// Pipeline Parsing
// ============================================================================

/**
 * Find the pipeline node within a tree.
 */
function findPipelineNode(root: EvaluationNode): EvaluationNode | null {
  if (isPipelineNode(root)) return root;

  const results = visitTree<EvaluationNode>(root, {
    visit: (ctx) => (isPipelineNode(ctx.node) ? ctx.node : null),
  });

  return results[0] ?? null;
}

/**
 * Find the damage_flow node within a tree (e.g., inside damage_flow_call).
 */
function findDamageFlowNode(root: EvaluationNode): EvaluationNode | null {
  if (isDamageFlowNode(root)) return root;

  const results = visitTree<EvaluationNode>(root, {
    visit: (ctx) => (isDamageFlowNode(ctx.node) ? ctx.node : null),
  });

  return results[0] ?? null;
}

/**
 * Parse a pipeline node into structured phase information.
 */
function parsePipeline(pipelineNode: EvaluationNode): PipelineInfo {
  const details = pipelineNode.details as PipelineDetails | undefined;
  const phases: PhaseInfo[] = [];

  // Find all phase children
  const phaseNodes = (pipelineNode.children ?? []).filter(isPhaseNode);

  for (let i = 0; i < phaseNodes.length; i++) {
    const phaseNode = phaseNodes[i];
    const phaseType =
      extractPhaseType(phaseNode.name) ??
      extractPhaseType(phaseNode.type) ??
      "phase_base";

    // Parse contributions and nested groups
    const { contributions, nestedGroups } = parsePhaseContributions(
      phaseNode,
      phaseType
    );

    phases.push({
      id: `phase-${i}`,
      type: phaseType,
      rawType: phaseNode.type,
      displayName: getPhaseDisplayName(phaseType),
      value: phaseNode.value,
      formattedValue: formatContributionValue(phaseNode.value, phaseType),
      node: phaseNode,
      contributions,
      nestedGroups,
      color: getPhaseColor(phaseType),
    });
  }

  return {
    phases,
    phaseValues: details?.phase_values ?? {},
    pipelineSteps: details?.pipeline_steps ?? [],
  };
}

// ============================================================================
// Phase Contribution Parsing
// ============================================================================

/**
 * Parse contributions within a phase, handling nested groups from group_total calls.
 */
function parsePhaseContributions(
  phaseNode: EvaluationNode,
  phaseType: PhaseType
): { contributions: ProcessedContribution[]; nestedGroups: NestedGroupInfo[] } {
  const directContributions: ContributionInfo[] = [];
  const templateGroups = new Map<string, TemplateGroup>();
  const nestedGroups: NestedGroupInfo[] = [];

  // Track current aggregate context for contributions
  let currentAggregateDetails: AggregateDetails | null = null;

  visitTree(phaseNode, {
    visit: (ctx) => {
      // Skip the phase node itself
      if (ctx.node === phaseNode) return null;

      // Handle group_total nodes - these contain nested pipelines with phases
      if (isGroupTotalNode(ctx.node)) {
        const groupDetails = getGroupTotalDetails(ctx.node);
        const groupName = groupDetails?.group || ctx.node.name || "Unknown Group";
        const groupPhases: PhaseInfo[] = [];

        // Find pipeline inside group_total and parse its phases
        const pipelineNode = findPipelineNode(ctx.node);
        if (pipelineNode) {
          const pipelinePhases = (pipelineNode.children ?? []).filter(isPhaseNode);
          for (let i = 0; i < pipelinePhases.length; i++) {
            const phaseChild = pipelinePhases[i];
            const nestedPhaseType =
              extractPhaseType(phaseChild.name) ??
              extractPhaseType(phaseChild.type) ??
              "phase_base";

            const nested = parsePhaseContributions(phaseChild, nestedPhaseType);

            groupPhases.push({
              id: `nested-phase-${i}`,
              type: nestedPhaseType,
              rawType: phaseChild.type,
              displayName: getPhaseDisplayName(nestedPhaseType),
              value: phaseChild.value,
              formattedValue: formatContributionValue(phaseChild.value, nestedPhaseType),
              node: phaseChild,
              contributions: nested.contributions,
              nestedGroups: nested.nestedGroups,
              color: getPhaseColor(nestedPhaseType),
            });
          }
        }

        // Add this group_total as a NestedGroupInfo
        nestedGroups.push({
          source: formatNodeName(groupName),
          total: ctx.node.value,
          phases: groupPhases,
        });

        return null; // Don't descend further, we handled children manually
      }

      // Handle template nodes - create group if not exists
      if (isTemplateNode(ctx.node)) {
        const templateId = ctx.node.name || `template-${ctx.index}`;
        if (!templateGroups.has(templateId)) {
          templateGroups.set(templateId, createTemplateGroup(ctx.node));
        }
        return null;
      }

      // Handle aggregate nodes - store context and process children
      if (isAggregateNode(ctx.node)) {
        currentAggregateDetails = getAggregateDetails(ctx.node);

        // Update template group if inside one
        const templateAncestor = getTemplateAncestor(ctx.ancestors);
        if (templateAncestor) {
          const templateId = templateAncestor.name || "unknown-template";
          const group = templateGroups.get(templateId);
          if (group && currentAggregateDetails) {
            group.aggregateFunction = currentAggregateDetails.function;
            group.filterLayer = currentAggregateDetails.filter_layer;
            group.filterGroup = currentAggregateDetails.filter_group;
          }
        }

        // Process contribution children
        for (const child of ctx.node.children ?? []) {
          if (isContributionNode(child)) {
            const contribInfo = createContributionInfo(
              child,
              ctx.node,
              [...ctx.ancestors, ctx.node],
              templateAncestor
            );

            if (templateAncestor) {
              const templateId = templateAncestor.name || "unknown-template";
              const group = templateGroups.get(templateId);
              if (group) {
                group.contributions.push(contribInfo);
                group.totalValue += contribInfo.originalValue;
              }
            } else {
              directContributions.push(contribInfo);
            }
          }
        }

        currentAggregateDetails = null;
        return null;
      }

      // Handle direct contribution nodes (not inside aggregate)
      if (isContributionNode(ctx.node)) {
        const templateAncestor = getTemplateAncestor(ctx.ancestors);
        const contribInfo = createContributionInfo(
          ctx.node,
          ctx.parent,
          ctx.ancestors,
          templateAncestor
        );

        if (templateAncestor) {
          const templateId = templateAncestor.name || "unknown-template";
          const group = templateGroups.get(templateId);
          if (group) {
            group.contributions.push(contribInfo);
            group.totalValue += contribInfo.originalValue;
          }
        } else {
          directContributions.push(contribInfo);
        }
      }

      return null;
    },
    // Don't descend into nested phases, aggregate nodes, or group_total (handled above)
    shouldDescend: (ctx) => {
      if (isPhaseNode(ctx.node) && ctx.node !== phaseNode) return false;
      if (isAggregateNode(ctx.node)) return false;
      if (isGroupTotalNode(ctx.node)) return false;
      return true;
    },
  });

  // Finalize template group totals
  for (const group of templateGroups.values()) {
    group.formattedTotal = formatContributionValue(group.totalValue, phaseType);
  }

  // Combine results
  const result: ProcessedContribution[] = [];

  // Add direct contributions
  for (const contrib of directContributions) {
    result.push({ isTemplateGroup: false, contribution: contrib });
  }

  // Add template groups with contributions
  for (const group of templateGroups.values()) {
    if (group.contributions.length > 0) {
      result.push({ isTemplateGroup: true, group });
    }
  }

  return { contributions: result, nestedGroups };
}

/**
 * Create a TemplateGroup from a template node.
 */
function createTemplateGroup(node: EvaluationNode): TemplateGroup {
  return {
    template: node,
    templateName: node.name,
    displayName: formatNodeName(node.name),
    contributions: [],
    totalValue: 0,
    formattedTotal: "",
  };
}

/**
 * Create a ContributionInfo from a contribution node using the new details structure.
 */
function createContributionInfo(
  node: EvaluationNode,
  parent: EvaluationNode | null,
  ancestors: EvaluationNode[],
  templateParent: EvaluationNode | null
): ContributionInfo {
  const details = getContributionDetails(node);

  // Extract meta_* fields from details
  const metadata = details ? extractContributionMetadata(details) : {};

  // Get values from details or fall back to node properties
  const source = details?.source ?? node.name ?? "Unknown";
  const layer = details?.layer ?? "base";
  const originalValue = details?.original_value ?? node.value;
  const transformedValue = details?.transformed_value;

  return {
    node,
    source,
    layer,
    originalValue,
    transformedValue,
    isStart: details?.is_start ?? false,
    hasCondition: details?.has_condition ?? false,
    hasCalculation: details?.has_calculation ?? false,
    condition: details?.condition,
    calculation: details?.calculation,
    displayName: formatNodeName(source),
    formattedValue: formatContributionValue(
      transformedValue ?? originalValue,
      layer
    ),
    metadata,
    parent,
    ancestors,
    templateParent,
  };
}

// ============================================================================
// Damage Flow Parsing
// ============================================================================

/**
 * Parse a damage flow node into structured information.
 */
function parseDamageFlow(node: EvaluationNode): DamageFlowInfo {
  const details = node.details as DamageFlowDetails | undefined;
  const phases: DamageFlowPhaseInfo[] = [];

  // Parse damage flow phase children
  for (const child of node.children ?? []) {
    if (isDamageFlowPhaseNode(child)) {
      const phaseDetails = child.details as DamageFlowPhaseDetails | undefined;

      phases.push({
        phase: phaseDetails?.phase ?? 0,
        name: phaseDetails?.name ?? child.name,
        node: child,
        value: phaseDetails?.value,
        distribution: phaseDetails?.distribution,
        additionalDamage: phaseDetails?.additional_damage,
        finalDamage: phaseDetails?.final_damage,
        characterAdditional: phaseDetails?.character_additional,
        totalDamage: phaseDetails?.total_damage,
        averageDamage: phaseDetails?.average_damage,
      });
    }
  }

  // Sort phases by phase number
  phases.sort((a, b) => a.phase - b.phase);

  return {
    baseDamage: details?.base_damage ?? 0,
    skillDamageModifier: details?.skill_damage_modifier ?? 1,
    totalDamage: details?.total_damage ?? node.value,
    averageDamage: details?.average_damage ?? node.value,
    distribution: details?.distribution ?? {},
    finalDamage: details?.damage ?? {}, // engine returns 'damage', not 'final_damage'
    phases,
  };
}

// ============================================================================
// Utility Functions (exported for components)
// ============================================================================

/**
 * Get total contribution count for a phase (including nested template children).
 */
export function getContributionCount(phase: PhaseInfo): number {
  let count = 0;
  for (const processed of phase.contributions) {
    if (processed.isTemplateGroup) {
      count += processed.group.contributions.length;
    } else {
      count++;
    }
  }
  return count;
}

/**
 * Calculate statistics for a phase.
 */
export function calculatePhaseStats(phase: PhaseInfo): {
  total: number;
  count: number;
  average: number;
  max: number;
  min: number;
} {
  let total = 0;
  let count = 0;
  let max = -Infinity;
  let min = Infinity;

  for (const processed of phase.contributions) {
    if (processed.isTemplateGroup) {
      for (const contrib of processed.group.contributions) {
        total += contrib.originalValue;
        count++;
        max = Math.max(max, contrib.originalValue);
        min = Math.min(min, contrib.originalValue);
      }
    } else {
      total += processed.contribution.originalValue;
      count++;
      max = Math.max(max, processed.contribution.originalValue);
      min = Math.min(min, processed.contribution.originalValue);
    }
  }

  return {
    total,
    count,
    average: count > 0 ? total / count : 0,
    max: count > 0 ? max : 0,
    min: count > 0 ? min : 0,
  };
}

/**
 * Calculate percentage contribution represents of phase total.
 */
export function calculateContributionPercentage(
  value: number,
  phaseTotal: number
): number {
  if (phaseTotal === 0) return 0;
  return Math.abs((value / phaseTotal) * 100);
}

/**
 * Get max absolute value among all contributions (for scaling bars).
 */
export function getMaxAbsoluteValue(phase: PhaseInfo): number {
  let max = 0;
  for (const processed of phase.contributions) {
    if (processed.isTemplateGroup) {
      for (const contrib of processed.group.contributions) {
        max = Math.max(max, Math.abs(contrib.originalValue));
      }
      max = Math.max(max, Math.abs(processed.group.totalValue));
    } else {
      max = Math.max(max, Math.abs(processed.contribution.originalValue));
    }
  }
  return max;
}

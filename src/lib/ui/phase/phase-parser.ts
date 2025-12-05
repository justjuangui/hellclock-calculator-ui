import type { EvaluationNode } from "$lib/engine/types";
import {
  visitTree,
  findPhaseNodes,
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
  PhaseInfo,
  ContributionInfo,
  TemplateGroup,
  ProcessedContribution,
} from "./types";

/**
 * Parse an evaluation tree and extract structured phase information.
 */
export function parsePhases(root: EvaluationNode): PhaseInfo[] {
  const phaseNodes = findPhaseNodes(root);
  let runningTotal = 0;

  return phaseNodes.map((phaseNode, index) => {
    const phaseType = extractPhaseType(phaseNode.type) ?? extractPhaseType(phaseNode.name) ?? "phase_base";
    const contributions = processPhaseContributions(phaseNode, phaseType);

    // Calculate running total for timeline view
    runningTotal = calculateRunningTotal(runningTotal, phaseNode.value, phaseType);

    return {
      id: `phase-${index}`,
      type: phaseType,
      rawType: phaseNode.type,
      displayName: getPhaseDisplayName(phaseType),
      value: phaseNode.value,
      formattedValue: formatContributionValue(phaseNode.value, phaseType),
      node: phaseNode,
      contributions,
      color: getPhaseColor(phaseType),
      runningTotal,
    };
  });
}

/**
 * Calculate running total based on phase type and value.
 */
function calculateRunningTotal(
  current: number,
  phaseValue: number,
  phaseType: PhaseType
): number {
  switch (phaseType) {
    case "phase_base":
      return phaseValue;
    case "phase_add":
      return current + phaseValue;
    case "phase_mult":
      return current * phaseValue;
    case "phase_multadd":
      return current * phaseValue;
    case "phase_override":
      return phaseValue;
    default:
      return current + phaseValue;
  }
}

/**
 * Process contributions within a phase, grouping by templates.
 */
function processPhaseContributions(
  phaseNode: EvaluationNode,
  phaseType: PhaseType
): ProcessedContribution[] {
  const directContributions: ContributionInfo[] = [];
  const templateGroups = new Map<string, TemplateGroup>();

  // Visit all nodes in the phase
  visitTree(phaseNode, {
    visit: (ctx) => {
      // Skip the phase node itself
      if (ctx.node === phaseNode) return null;

      // Handle template nodes - create or update group
      if (ctx.node.type === "template") {
        const templateId = ctx.node.name || `template-${ctx.index}`;
        if (!templateGroups.has(templateId)) {
          templateGroups.set(templateId, {
            template: ctx.node,
            templateName: ctx.node.name,
            displayName: formatNodeName(ctx.node.name),
            contributions: [],
            totalValue: 0,
            formattedTotal: "",
          });
        }
        return null;
      }

      // Handle contribution nodes
      if (ctx.node.type === "contribution") {
        const templateAncestor = getTemplateAncestor(ctx.ancestors);
        const contribInfo = createContributionInfo(
          ctx.node,
          ctx.parent,
          ctx.ancestors,
          templateAncestor
        );

        if (templateAncestor) {
          // Add to template group
          const templateId = templateAncestor.name || "unknown-template";
          const group = templateGroups.get(templateId);
          if (group) {
            group.contributions.push(contribInfo);
            group.totalValue += contribInfo.absoluteValue;
          }
        } else {
          // Direct contribution (not inside a template)
          directContributions.push(contribInfo);
        }
      }

      return null;
    },
    // Don't descend into get_matching_contributions nodes
    shouldDescend: (ctx) => {
      return ctx.node.name !== "get_matching_contributions" &&
             ctx.node.type !== "get_matching_contributions";
    },
  });

  // Finalize template groups (format totals)
  for (const group of templateGroups.values()) {
    group.formattedTotal = formatContributionValue(group.totalValue, phaseType);
  }

  // Combine direct contributions and template groups
  const result: ProcessedContribution[] = [];

  // Add direct contributions first
  for (const contrib of directContributions) {
    result.push({
      isTemplateGroup: false,
      contribution: contrib,
    });
  }

  // Add template groups
  for (const group of templateGroups.values()) {
    // Only add groups that have contributions
    if (group.contributions.length > 0) {
      result.push({
        isTemplateGroup: true,
        group,
      });
    }
  }

  return result;
}

/**
 * Create a ContributionInfo object from an EvaluationNode.
 */
function createContributionInfo(
  node: EvaluationNode,
  parent: EvaluationNode | null,
  ancestors: EvaluationNode[],
  templateParent: EvaluationNode | null
): ContributionInfo {
  return {
    node,
    parent,
    ancestors,
    templateParent,
    absoluteValue: node.value,
    formattedValue: formatContributionValue(node.value, (node.meta?.layer as string) ?? null),
    name: node.name,
    displayName: formatNodeName(node.name),
    meta: node.meta,
  };
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
        total += contrib.absoluteValue;
        count++;
        max = Math.max(max, contrib.absoluteValue);
        min = Math.min(min, contrib.absoluteValue);
      }
    } else {
      total += processed.contribution.absoluteValue;
      count++;
      max = Math.max(max, processed.contribution.absoluteValue);
      min = Math.min(min, processed.contribution.absoluteValue);
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
 * Get the total contribution count for a phase (including template children).
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
 * Calculate the percentage each contribution represents of the phase total.
 */
export function calculateContributionPercentage(
  value: number,
  phaseTotal: number
): number {
  if (phaseTotal === 0) return 0;
  return Math.abs((value / phaseTotal) * 100);
}

/**
 * Get the maximum absolute value among all contributions in a phase.
 * Useful for scaling progress bars.
 */
export function getMaxAbsoluteValue(phase: PhaseInfo): number {
  let max = 0;
  for (const processed of phase.contributions) {
    if (processed.isTemplateGroup) {
      for (const contrib of processed.group.contributions) {
        max = Math.max(max, Math.abs(contrib.absoluteValue));
      }
      max = Math.max(max, Math.abs(processed.group.totalValue));
    } else {
      max = Math.max(max, Math.abs(processed.contribution.absoluteValue));
    }
  }
  return max;
}

import type {
  EvaluationNode,
  ContributionDetails,
  AggregateDetails,
  PipelineDetails,
  DamageFlowDetails,
  DamageFlowPhaseDetails,
  OutputDetails,
  StatDetails,
  GroupTotalDetails,
} from "$lib/engine/types";

// ============================================================================
// Node Type Checks
// ============================================================================

/**
 * Check if node is an output wrapper
 */
export function isOutputNode(node: EvaluationNode): boolean {
  return node.type === "output";
}

/**
 * Check if node is a stat evaluation
 */
export function isStatNode(node: EvaluationNode): boolean {
  return node.type === "stat";
}

/**
 * Check if node is a formula evaluation
 */
export function isFormulaNode(node: EvaluationNode): boolean {
  return node.type === "formula";
}

/**
 * Check if node is a pipeline (multi-phase template)
 */
export function isPipelineNode(node: EvaluationNode): boolean {
  return node.type === "pipeline";
}

/**
 * Check if node is a phase within a pipeline
 */
export function isPhaseNode(node: EvaluationNode): boolean {
  return node.type === "phase";
}

/**
 * Check if node is a template wrapper
 */
export function isTemplateNode(node: EvaluationNode): boolean {
  return node.type === "template";
}

/**
 * Check if node is a contribution
 */
export function isContributionNode(node: EvaluationNode): boolean {
  return node.type === "contribution";
}

/**
 * Aggregate function types
 */
const AGGREGATE_TYPES = [
  "sum_by",
  "prod_by",
  "min_by",
  "max_by",
  "count_by",
  "avg_by",
  "first_by",
  "last_by",
] as const;

/**
 * Check if node is an aggregate function (sum_by, prod_by, etc.)
 */
export function isAggregateNode(node: EvaluationNode): boolean {
  return (AGGREGATE_TYPES as readonly string[]).includes(node.type);
}

/**
 * Check if node is a damage flow calculation
 */
export function isDamageFlowNode(node: EvaluationNode): boolean {
  return node.type === "damage_flow";
}

/**
 * Check if node is a damage flow phase
 */
export function isDamageFlowPhaseNode(node: EvaluationNode): boolean {
  return node.type === "damage_flow_phase";
}

/**
 * Check if node is a damage flow function call
 */
export function isDamageFlowCallNode(node: EvaluationNode): boolean {
  return node.type === "damage_flow_call";
}

/**
 * Check if node is a group_total function call
 */
export function isGroupTotalNode(node: EvaluationNode): boolean {
  return node.type === "group_total";
}

/**
 * Get group_total details from node
 */
export function getGroupTotalDetails(
  node: EvaluationNode
): GroupTotalDetails | null {
  if (isGroupTotalNode(node) && node.details) {
    return node.details as GroupTotalDetails;
  }
  return null;
}

// ============================================================================
// Expression Node Type Checks
// ============================================================================

/**
 * Check if node is a binary operation
 */
export function isBinaryOpNode(node: EvaluationNode): boolean {
  return node.type === "binary_op";
}

/**
 * Check if node is a unary operation
 */
export function isUnaryOpNode(node: EvaluationNode): boolean {
  return node.type === "unary_op";
}

/**
 * Check if node is a conditional (ternary) expression
 */
export function isConditionalNode(node: EvaluationNode): boolean {
  return node.type === "conditional";
}

/**
 * Check if node is a variable reference
 */
export function isVariableNode(node: EvaluationNode): boolean {
  return node.type === "variable";
}

/**
 * Check if node is a literal value
 */
export function isLiteralNode(node: EvaluationNode): boolean {
  return node.type === "literal";
}

/**
 * Check if node is a flag check
 */
export function isFlagNode(node: EvaluationNode): boolean {
  return node.type === "flag";
}

// ============================================================================
// Details Extractors with Type Narrowing
// ============================================================================

/**
 * Get output details from node (if it's an output node)
 */
export function getOutputDetails(
  node: EvaluationNode
): OutputDetails | null {
  if (isOutputNode(node) && node.details) {
    return node.details as OutputDetails;
  }
  return null;
}

/**
 * Get stat details from node (if it's a stat node)
 */
export function getStatDetails(node: EvaluationNode): StatDetails | null {
  if (isStatNode(node) && node.details) {
    return node.details as StatDetails;
  }
  return null;
}

/**
 * Get pipeline details from node (if it's a pipeline node)
 */
export function getPipelineDetails(
  node: EvaluationNode
): PipelineDetails | null {
  if (isPipelineNode(node) && node.details) {
    return node.details as PipelineDetails;
  }
  return null;
}

/**
 * Get contribution details from node (if it's a contribution node)
 */
export function getContributionDetails(
  node: EvaluationNode
): ContributionDetails | null {
  if (isContributionNode(node) && node.details) {
    return node.details as ContributionDetails;
  }
  return null;
}

/**
 * Get aggregate details from node (if it's an aggregate node)
 */
export function getAggregateDetails(
  node: EvaluationNode
): AggregateDetails | null {
  if (isAggregateNode(node) && node.details) {
    return node.details as AggregateDetails;
  }
  return null;
}

/**
 * Get damage flow details from node (if it's a damage flow node)
 */
export function getDamageFlowDetails(
  node: EvaluationNode
): DamageFlowDetails | null {
  if (isDamageFlowNode(node) && node.details) {
    return node.details as DamageFlowDetails;
  }
  return null;
}

/**
 * Get damage flow phase details from node (if it's a damage flow phase node)
 */
export function getDamageFlowPhaseDetails(
  node: EvaluationNode
): DamageFlowPhaseDetails | null {
  if (isDamageFlowPhaseNode(node) && node.details) {
    return node.details as DamageFlowPhaseDetails;
  }
  return null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract all fields from contribution details as metadata
 */
export function extractContributionMetadata(
  details: ContributionDetails
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    // Strip meta_ prefix if present for cleaner display
    const displayKey = key.startsWith("meta_") ? key.replace("meta_", "") : key;
    metadata[displayKey] = value;
  }
  return metadata;
}

/**
 * Check if a node has an error in its meta field
 */
export function hasError(node: EvaluationNode): boolean {
  return node.meta !== undefined && "error" in node.meta;
}

/**
 * Get error message from node meta (if present)
 */
export function getErrorMessage(node: EvaluationNode): string | null {
  if (hasError(node) && node.meta?.error) {
    return node.meta.error;
  }
  return null;
}

/**
 * Summary-level node types (UserInfo trace level)
 */
const SUMMARY_NODE_TYPES = [
  "formula",
  "stat",
  "damage_flow",
  "template",
  "pipeline",
  "phase",
  "output",
] as const;

/**
 * Check if node is a summary-level node (for UserInfo trace level filtering)
 */
export function isSummaryNode(node: EvaluationNode): boolean {
  return (SUMMARY_NODE_TYPES as readonly string[]).includes(node.type);
}

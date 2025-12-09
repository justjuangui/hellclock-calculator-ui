import type { EvaluationNode } from "$lib/engine/types";
import type { PhaseType } from "$lib/utils/phase-formatter";

// ============================================================================
// Parsed Explanation Types
// ============================================================================

/**
 * Root type of explanation (determines which view to render)
 */
export type ExplanationRootType = "stat" | "formula" | "damage_flow";

/**
 * Top-level parsed explanation structure
 */
export interface ParsedExplanation {
  rootType: ExplanationRootType;
  rootNode: EvaluationNode;
  name: string;
  value: number;
  // Only one of these will be populated based on rootType
  pipeline?: PipelineInfo;
  formula?: FormulaInfo;
  damageFlow?: DamageFlowInfo;
}

/**
 * Pipeline (stat with phases) information
 */
export interface PipelineInfo {
  phases: PhaseInfo[];
  phaseValues: Record<string, number>;
  pipelineSteps: string[];
}

/**
 * Formula (expression) information
 */
export interface FormulaInfo {
  expression: EvaluationNode;
}

/**
 * Damage flow calculation information
 */
export interface DamageFlowInfo {
  baseDamage: number;
  skillDamageModifier: number;
  totalDamage: number;
  averageDamage: number;
  distribution: Record<string, number>;
  finalDamage: Record<string, number>;
  phases: DamageFlowPhaseInfo[];
}

/**
 * Individual damage flow phase (1-8)
 */
export interface DamageFlowPhaseInfo {
  phase: number;
  name: string;
  node: EvaluationNode;
  value?: number;
  distribution?: Record<string, number>;
  additionalDamage?: Record<string, number>;
  finalDamage?: Record<string, number>;
  characterAdditional?: Record<string, number>;
  totalDamage?: number;
  averageDamage?: number;
}

// ============================================================================
// Phase Types
// ============================================================================

/**
 * Represents a nested group from a group_total call.
 * Each group_total in a phase creates one NestedGroupInfo.
 */
export interface NestedGroupInfo {
  source: string;       // Group name from group_total details
  total: number;        // Value of the group_total node
  phases: PhaseInfo[];  // Phases from the group's pipeline
}

/**
 * Represents a parsed phase with its contributions.
 * Supports nested groups via nestedGroups array (from group_total calls).
 */
export interface PhaseInfo {
  id: string;
  type: PhaseType;
  rawType: string;
  displayName: string;
  value: number;
  formattedValue: string;
  node: EvaluationNode;
  contributions: ProcessedContribution[];
  nestedGroups: NestedGroupInfo[]; // Array of group_total results
  color: string;
}

// ============================================================================
// Contribution Types
// ============================================================================

/**
 * Enhanced contribution info using new details structure.
 * Contains all information from the contribution node's details field.
 */
export interface ContributionInfo {
  node: EvaluationNode;
  // From details field
  source: string;
  layer: string;
  originalValue: number;
  transformedValue?: number;
  isStart: boolean;
  // Condition/calculation expressions
  hasCondition: boolean;
  hasCalculation: boolean;
  condition?: string;
  calculation?: string;
  // Display properties
  displayName: string;
  formattedValue: string;
  // Extracted meta_* fields from details
  metadata: Record<string, unknown>;
  // Tree context
  parent: EvaluationNode | null;
  ancestors: EvaluationNode[];
  templateParent: EvaluationNode | null;
}

/**
 * Template group containing multiple contributions.
 * May include aggregate function info from parent node.
 */
export interface TemplateGroup {
  template: EvaluationNode;
  templateName: string;
  displayName: string;
  contributions: ContributionInfo[];
  totalValue: number;
  formattedTotal: string;
  // From aggregate node details (if present)
  aggregateFunction?: string;
  filterLayer?: string;
  filterGroup?: string;
}

/**
 * A processed contribution can be either a direct contribution or a template group.
 */
export type ProcessedContribution =
  | {
      isTemplateGroup: false;
      contribution: ContributionInfo;
    }
  | {
      isTemplateGroup: true;
      group: TemplateGroup;
    };

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for phase view components.
 */
export interface PhaseViewProps {
  phases: PhaseInfo[];
}

/**
 * View mode for the phase display selector.
 */
export type PhaseViewMode = "waterfall" | "timeline" | "accordion";

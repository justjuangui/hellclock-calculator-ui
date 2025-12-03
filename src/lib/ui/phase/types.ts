import type { EvaluationNode } from "$lib/engine/types";
import type { PhaseType } from "$lib/utils/phase-formatter";

/**
 * Represents a parsed phase with its contributions.
 */
export interface PhaseInfo {
  id: string;
  type: PhaseType;
  rawType: string; // Original type string from node
  displayName: string;
  value: number;
  formattedValue: string;
  node: EvaluationNode;
  contributions: ProcessedContribution[];
  color: string; // DaisyUI badge color class
  runningTotal?: number; // Optional running total for timeline view
}

/**
 * Represents a contribution that may be direct or part of a template group.
 */
export interface ContributionInfo {
  node: EvaluationNode;
  parent: EvaluationNode | null;
  ancestors: EvaluationNode[];
  templateParent: EvaluationNode | null; // If inside a template
  absoluteValue: number;
  formattedValue: string;
  name: string;
  displayName: string;
  meta?: Record<string, string | number>;
}

/**
 * Represents a template group containing multiple contributions.
 */
export interface TemplateGroup {
  template: EvaluationNode;
  templateName: string;
  displayName: string;
  contributions: ContributionInfo[];
  totalValue: number;
  formattedTotal: string;
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

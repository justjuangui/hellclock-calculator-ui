export type EngineWorkerMessage =
  | { type: "ready" }
  | { type: "loaded"; payload: unknown }
  | { type: "built"; payload: unknown }
  | { type: "evaluated"; payload: unknown }
  | { type: "explained"; payload: unknown }
  | { type: "error"; payload: string };

export type EngineWorkerCommand =
  | { type: "loadPack"; payload: unknown }
  | { type: "build"; payload: { actor: unknown; target: unknown } }
  | { type: "eval"; payload: unknown }
  | { type: "explain"; payload: unknown };

export type GamePack = Record<string, unknown>;

// ============================================================================
// Evaluate Request Types (matching new WASM API)
// ============================================================================

/**
 * Entity operations for creating/cloning/removing entities
 */
export type EntityOps = {
  create?: Array<{
    id: string;
    type: "player" | "enemy" | "summon" | "boss";
    owner_id?: string;
  }>;
  clone?: Array<{
    source_id: string;
    new_id: string;
  }>;
  remove?: string[];
};

/**
 * Stat contribution with optional consumer_id for tracking
 */
export type StatContribution = {
  consumer_id?: string;
  source: string;
  amount: number;
  layer: string;
  meta?: Record<string, string | number | boolean | undefined>;
  condition?: string;
  calculation?: string;
};

/**
 * Flag contribution
 */
export type FlagContribution = {
  source: string;
  enabled: boolean;
  meta?: Record<string, string | number | boolean | undefined>;
};

/**
 * Entity modifications in Evaluate request
 */
export type EntityModification = {
  stats?: Record<string, StatContribution[]>;
  removeStats?: Record<string, string[]>; // statName -> consumer_ids to remove
  flags?: Record<string, FlagContribution[]>;
  removeFlags?: string[];
};

/**
 * Broadcast contribution with consumer_id for tracking
 */
export type BroadcastAdd = {
  consumer_id?: string;
  flag_suffix: string;
  stat_suffix: string;
  contribution: {
    source: string;
    amount: number;
    layer: string;
    meta?: Record<string, string>;
    condition?: string;
    calculation?: string;
  };
};

/**
 * Broadcast removal request
 */
export type BroadcastRemove = {
  flag_suffix: string;
  stat_suffix: string;
  consumer_ids: string[];
};

/**
 * Broadcast operations per entity
 */
export type BroadcastOps = {
  add?: BroadcastAdd[];
  remove?: BroadcastRemove[];
};

/**
 * Full Evaluate request structure matching new WASM API
 */
export type EvaluateRequest = {
  entityOps?: EntityOps;
  setEntity?: Record<string, EntityModification>;
  broadcast?: Record<string, BroadcastOps>;
  outputs?: Record<string, string[]>;
};

// Legacy XNode type (kept for backward compatibility)
export type XNode = {
  name?: string;
  op?: string;
  value: number;
  meta?: Record<string, string>;
  children?: XNode[];
};

// ============================================================================
// Explanation Node Types (matching new WASM Explain API)
// ============================================================================

/**
 * Base evaluation node structure returned by WASM Explain
 */
export type EvaluationNode = {
  type: string;
  name: string;
  value: number;
  children?: EvaluationNode[];
  meta?: Record<string, string>; // String-only, primarily for errors
  details?: NodeDetails;
};

/**
 * Union of all possible details structures by node type
 */
export type NodeDetails =
  | OutputDetails
  | StatDetails
  | PipelineDetails
  | ContributionDetails
  | AggregateDetails
  | DamageFlowDetails
  | DamageFlowPhaseDetails
  | BinaryOpDetails
  | UnaryOpDetails
  | ConditionalDetails
  | VariableDetails
  | FlagDetails
  | ClampDetails
  | FunctionDetails
  | FormulaCallDetails
  | GroupTotalDetails
  | Record<string, unknown>; // Fallback for unknown types

/**
 * Output node details (wrapper for formula/stat)
 */
export interface OutputDetails {
  type: "formula" | "stat";
  formula?: string;
  stat?: string;
}

/**
 * Stat node details
 */
export interface StatDetails {
  template: string;
}

/**
 * Pipeline node details
 */
export interface PipelineDetails {
  type: "pipeline";
  phase_count: number;
  final_phase_value: number;
  phase_values: Record<string, number>;
  pipeline_steps: string[];
}

/**
 * Contribution node details
 */
export interface ContributionDetails {
  source: string;
  layer: string;
  original_value: number;
  is_start: boolean;
  has_condition: boolean;
  has_calculation: boolean;
  condition?: string;
  calculation?: string;
  transformed_value?: number;
  // meta_* fields are dynamically added with this prefix
  [key: `meta_${string}`]: unknown;
}

/**
 * Aggregate function node details (sum_by, prod_by, etc.)
 */
export interface AggregateDetails {
  function: string;
  operation: string;
  filter_group: string;
  contribution_count: number;
  values: number[];
  has_transform: boolean;
  operation_result: string;
  filter_layer?: string;
  filter_unit?: string;
  filter_who?: string;
}

/**
 * Damage flow node details
 */
export interface DamageFlowDetails {
  damage_flow: string;
  base_damage: number;
  skill_damage_modifier: number;
  total_damage: number;
  average_damage: number;
  distribution: Record<string, number>;
  damage: Record<string, number>; // actual final damage per type
}

/**
 * Damage flow phase node details (phases 1-8)
 */
export interface DamageFlowPhaseDetails {
  phase: number;
  name: string;
  value?: number;
  distribution?: Record<string, number>;
  additional_damage?: Record<string, number>;
  final_damage?: Record<string, number>;
  character_additional?: Record<string, number>;
  total_damage?: number;
  average_damage?: number;
}

/**
 * Binary operation node details
 */
export interface BinaryOpDetails {
  operator: string;
  left_value: number;
  right_value: number;
  operation: string;
}

/**
 * Unary operation node details
 */
export interface UnaryOpDetails {
  operator: string;
  operand_value: number;
  operation: string;
}

/**
 * Conditional (ternary) node details
 */
export interface ConditionalDetails {
  type: "ternary";
  condition_value: number;
  chosen_branch: "then" | "else";
  operation: string;
}

/**
 * Variable reference node details
 */
export interface VariableDetails {
  variable: string;
  context: string;
}

/**
 * Flag function node details
 */
export interface FlagDetails {
  function: "flag";
  flag: string;
  context: string;
  flag_state: boolean;
  operation: string;
}

/**
 * Clamp function node details
 */
export interface ClampDetails {
  function: "clamp";
  original_value: number;
  min_value: number;
  max_value: number;
  operation: string;
}

/**
 * Math function node details (min, max, sum, prod)
 */
export interface FunctionDetails {
  function: string;
  values: number[];
  operation: string;
}

/**
 * Formula call node details
 */
export interface FormulaCallDetails {
  function: string;
  type: "formula_call";
  arg_count: number;
  named_args: number;
}

/**
 * Group total function node details
 */
export interface GroupTotalDetails {
  function: "group_total";
  group: string;
  template: string;
  operation: string;
  self_var?: string;
}

/**
 * Explain payload structure returned by WASM
 */
export type ExplainPayload = {
  debug: EvaluationNode;
  human: string[];
  summary: string;
  value: number;
};

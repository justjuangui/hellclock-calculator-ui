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

// New WASM evaluation node structure
export type EvaluationNode = {
  type: string;
  name: string;
  value: number;
  children?: EvaluationNode[];
  meta?: Record<string, string | number>;
  details?: Record<string, unknown>;
};

// New explain payload structure returned by WASM
export type ExplainPayload = {
  debug: EvaluationNode;
  human: string[];
  summary: string;
  value: number;
};

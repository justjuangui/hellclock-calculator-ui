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

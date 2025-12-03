import type { EvaluationNode } from "$lib/engine/types";

// Visitor context passed to callbacks
export interface VisitorContext<T> {
  node: EvaluationNode;
  parent: EvaluationNode | null;
  ancestors: EvaluationNode[]; // Full path from root (excluding current node)
  depth: number;
  index: number; // Index among siblings
  accumulator: T[]; // Results collected so far
}

// Visitor callbacks
export interface TreeVisitorCallbacks<T> {
  // Called for each node; return value to collect, null/undefined to skip
  visit: (ctx: VisitorContext<T>) => T | null | undefined;

  // Optional: decide whether to traverse into children
  shouldDescend?: (ctx: VisitorContext<T>) => boolean;

  // Optional: called when entering a node (before children)
  onEnter?: (ctx: VisitorContext<T>) => void;

  // Optional: called when exiting a node (after children)
  onExit?: (ctx: VisitorContext<T>) => void;
}

// Traversal options
export interface TraversalOptions {
  strategy: "depth-first" | "breadth-first";
  order: "pre-order" | "post-order"; // For depth-first
}

const defaultOptions: TraversalOptions = {
  strategy: "depth-first",
  order: "pre-order",
};

/**
 * Generic tree visitor with parent tracking and pluggable callbacks.
 * Supports depth-first (pre/post order) and breadth-first traversal.
 */
export function visitTree<T>(
  root: EvaluationNode,
  callbacks: TreeVisitorCallbacks<T>,
  options?: Partial<TraversalOptions>
): T[] {
  const opts = { ...defaultOptions, ...options };
  const results: T[] = [];

  if (opts.strategy === "breadth-first") {
    visitBreadthFirst(root, callbacks, results);
  } else {
    visitDepthFirst(root, null, [], 0, 0, callbacks, results, opts.order);
  }

  return results;
}

function visitDepthFirst<T>(
  node: EvaluationNode,
  parent: EvaluationNode | null,
  ancestors: EvaluationNode[],
  depth: number,
  index: number,
  callbacks: TreeVisitorCallbacks<T>,
  accumulator: T[],
  order: "pre-order" | "post-order"
): void {
  const ctx: VisitorContext<T> = {
    node,
    parent,
    ancestors,
    depth,
    index,
    accumulator,
  };

  callbacks.onEnter?.(ctx);

  // Pre-order: visit before children
  if (order === "pre-order") {
    const result = callbacks.visit(ctx);
    if (result !== null && result !== undefined) {
      accumulator.push(result);
    }
  }

  // Traverse children if allowed
  const shouldDescend = callbacks.shouldDescend?.(ctx) ?? true;
  if (shouldDescend && node.children?.length) {
    const newAncestors = [...ancestors, node];
    node.children.forEach((child, i) => {
      visitDepthFirst(
        child,
        node,
        newAncestors,
        depth + 1,
        i,
        callbacks,
        accumulator,
        order
      );
    });
  }

  // Post-order: visit after children
  if (order === "post-order") {
    const result = callbacks.visit(ctx);
    if (result !== null && result !== undefined) {
      accumulator.push(result);
    }
  }

  callbacks.onExit?.(ctx);
}

function visitBreadthFirst<T>(
  root: EvaluationNode,
  callbacks: TreeVisitorCallbacks<T>,
  accumulator: T[]
): void {
  type QueueItem = {
    node: EvaluationNode;
    parent: EvaluationNode | null;
    ancestors: EvaluationNode[];
    depth: number;
    index: number;
  };

  const queue: QueueItem[] = [
    { node: root, parent: null, ancestors: [], depth: 0, index: 0 },
  ];

  while (queue.length > 0) {
    const { node, parent, ancestors, depth, index } = queue.shift()!;

    const ctx: VisitorContext<T> = {
      node,
      parent,
      ancestors,
      depth,
      index,
      accumulator,
    };

    callbacks.onEnter?.(ctx);

    const result = callbacks.visit(ctx);
    if (result !== null && result !== undefined) {
      accumulator.push(result);
    }

    const shouldDescend = callbacks.shouldDescend?.(ctx) ?? true;
    if (shouldDescend && node.children?.length) {
      const newAncestors = [...ancestors, node];
      node.children.forEach((child, i) => {
        queue.push({
          node: child,
          parent: node,
          ancestors: newAncestors,
          depth: depth + 1,
          index: i,
        });
      });
    }

    callbacks.onExit?.(ctx);
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Find all nodes matching a predicate.
 */
export function findNodes(
  root: EvaluationNode,
  predicate: (node: EvaluationNode, parent: EvaluationNode | null) => boolean
): EvaluationNode[] {
  return visitTree<EvaluationNode>(root, {
    visit: (ctx) => (predicate(ctx.node, ctx.parent) ? ctx.node : null),
  });
}

/**
 * Find all phase nodes in the tree.
 */
export function findPhaseNodes(root: EvaluationNode): EvaluationNode[] {
  return visitTree<EvaluationNode>(root, {
    visit: (ctx) => {
      const isPhase =
        ctx.node.type?.includes("phase_") ||
        ctx.node.name?.includes("phase_");
      return isPhase ? ctx.node : null;
    },
    // Don't descend into phase nodes to avoid nested phases
    shouldDescend: (ctx) => {
      return !(
        ctx.node.type?.includes("phase_") || ctx.node.name?.includes("phase_")
      );
    },
  });
}

/**
 * Find all contribution nodes within a subtree.
 */
export function findContributions(root: EvaluationNode): EvaluationNode[] {
  return visitTree<EvaluationNode>(root, {
    visit: (ctx) => (ctx.node.type === "contribution" ? ctx.node : null),
  });
}

/**
 * Find all template nodes within a subtree.
 */
export function findTemplates(root: EvaluationNode): EvaluationNode[] {
  return visitTree<EvaluationNode>(root, {
    visit: (ctx) => (ctx.node.type === "template" ? ctx.node : null),
  });
}

/**
 * Check if an ancestor chain contains a template node.
 */
export function hasTemplateAncestor(ancestors: EvaluationNode[]): boolean {
  return ancestors.some((a) => a.type === "template");
}

/**
 * Get the nearest template ancestor, if any.
 */
export function getTemplateAncestor(
  ancestors: EvaluationNode[]
): EvaluationNode | null {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (ancestors[i].type === "template") {
      return ancestors[i];
    }
  }
  return null;
}

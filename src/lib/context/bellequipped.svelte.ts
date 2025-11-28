import { getContext, setContext } from "svelte";
import type {
  BellsHelper,
  BellType,
  AllocatedNodesMap,
  AllocatedNode,
} from "$lib/hellclock/bells";
import { BELL_IDS, BELL_TYPES_BY_ID } from "$lib/hellclock/bells";
import { SvelteMap } from "svelte/reactivity";

export type BellEquippedAPI = {
  // Current state
  activeBellId: number;
  allocatedNodes: AllocatedNodesMap; // All bells' allocations
  availableBellPoints: number;

  // Bell selection (only one active at a time)
  selectBell: (bellId: number) => void;
  getActiveBellId: () => number;
  getActiveBellType: () => BellType | undefined;

  // Node allocation (operates on active bell)
  allocateNode: (
    bellId: number,
    nodeId: string,
  ) => { success: boolean; error?: string };
  deallocateNode: (
    bellId: number,
    nodeId: string,
  ) => { success: boolean; error?: string };
  incrementNodeLevel: (
    bellId: number,
    nodeId: string,
  ) => { success: boolean; error?: string };
  decrementNodeLevel: (
    bellId: number,
    nodeId: string,
  ) => { success: boolean; error?: string };

  // Query methods
  getNodeLevel: (bellId: number, nodeId: string) => number;
  isNodeAllocated: (bellId: number, nodeId: string) => boolean;
  canAllocateNode: (
    bellId: number,
    nodeId: string,
  ) => { canAllocate: boolean; reason?: string };

  getTotalPointsSpent: (bellId: number) => number;
  getTotalPointsSpentAll: () => number;
  getPointsSpentOnActiveBell: () => number;

  // Utility
  clear: () => void;
  clearBell: (bellId: number) => void;

  // Import nodes
  importNodes: (
    bellId: number,
    nodes: Array<{ nodeId: string; level: number }>,
  ) => number;
};

const bellEquippedKey = Symbol("bell-equipped");

export function provideBellEquipped(
  bellsHelper?: BellsHelper,
  initialBellPoints: number = 100,
): BellEquippedAPI {
  // Track allocations for all bells
  const allocatedNodes = new SvelteMap<string, AllocatedNode>();

  // Active bell (default to Campaign Bell)
  let activeBellId = $state(BELL_IDS.Campaign);
  let availableBellPoints = $state(initialBellPoints);

  // Helper function to create allocation key
  const getAllocationKey = (bellId: number, nodeId: string): string => {
    return `${bellId}:${nodeId}`;
  };

  // Select active bell
  const selectBell = (bellId: number): void => {
    if (!bellsHelper) return;
    const bell = bellsHelper.getBellById(bellId);
    if (bell) {
      activeBellId = bellId;
    }
  };

  const getActiveBellId = (): number => {
    return activeBellId;
  };

  const getActiveBellType = (): BellType | undefined => {
    if (!bellsHelper) return undefined;
    const bell = bellsHelper.getBellById(activeBellId);
    if (!bell) return undefined;
    return BELL_TYPES_BY_ID[activeBellId];
  };

  // Get node allocation level
  const getNodeLevel = (bellId: number, nodeId: string): number => {
    const key = getAllocationKey(bellId, nodeId);
    return allocatedNodes.get(key)?.level ?? 0;
  };

  // Check if node is allocated
  const isNodeAllocated = (bellId: number, nodeId: string): boolean => {
    return getNodeLevel(bellId, nodeId) > 0;
  };

  // Calculate total points spent in a bell
  const getTotalPointsSpent = (bellId: number): number => {
    if (!bellsHelper) return 0;
    return bellsHelper.getTotalPointsSpent(bellId, allocatedNodes);
  };

  // Calculate total points spent across all bells
  const getTotalPointsSpentAll = (): number => {
    let total = 0;
    for (const allocated of allocatedNodes.values()) {
      total += allocated.level;
    }
    return total;
  };

  // Get points spent on active bell only
  const getPointsSpentOnActiveBell = (): number => {
    return getTotalPointsSpent(activeBellId);
  };

  // Check if a node can be allocated
  const canAllocateNode = (
    bellId: number,
    nodeId: string,
  ): { canAllocate: boolean; reason?: string } => {
    if (!bellsHelper) {
      return { canAllocate: false, reason: "Bells helper not available" };
    }

    const node = bellsHelper.getNodeById(bellId, nodeId);
    if (!node) {
      return { canAllocate: false, reason: "Node not found" };
    }

    const currentLevel = getNodeLevel(bellId, nodeId);
    if (currentLevel >= node.maxLevel) {
      return { canAllocate: false, reason: "Node already at max level" };
    }

    // Check if we have bell points available (only count active bell's spending)
    if (getPointsSpentOnActiveBell() >= availableBellPoints && bellId === activeBellId) {
      return { canAllocate: false, reason: "No bell points available" };
    }

    // Check dependencies using the helper
    return bellsHelper.canAllocateNode(bellId, nodeId, allocatedNodes);
  };

  // Allocate a node
  const allocateNode = (
    bellId: number,
    nodeId: string,
  ): { success: boolean; error?: string } => {
    if (!bellsHelper) {
      return { success: false, error: "Bells helper not available" };
    }

    const canAllocate = canAllocateNode(bellId, nodeId);
    if (!canAllocate.canAllocate) {
      return { success: false, error: canAllocate.reason };
    }

    const key = getAllocationKey(bellId, nodeId);
    const currentLevel = getNodeLevel(bellId, nodeId);

    if (currentLevel === 0) {
      // New allocation
      allocatedNodes.set(key, {
        constellationId: bellId, // Reusing the same field name for compatibility
        nodeId,
        level: 1,
      });
    } else {
      // Increment level
      const allocated = allocatedNodes.get(key)!;
      allocatedNodes.set(key, {
        ...allocated,
        level: allocated.level + 1,
      });
    }

    return { success: true };
  };

  // Deallocate a node (decrement level, or remove if level 1)
  const deallocateNode = (
    bellId: number,
    nodeId: string,
  ): { success: boolean; error?: string } => {
    if (!bellsHelper) {
      return { success: false, error: "Bells helper not available" };
    }

    const key = getAllocationKey(bellId, nodeId);
    const allocated = allocatedNodes.get(key);

    if (!allocated) {
      return { success: false, error: "Node not allocated" };
    }

    // If level > 1, just decrement
    if (allocated.level > 1) {
      allocatedNodes.set(key, {
        ...allocated,
        level: allocated.level - 1,
      });
      return { success: true };
    }

    // If level == 1, check orphans before removing
    const canDeallocate = bellsHelper.canDeallocateNode(
      bellId,
      nodeId,
      allocatedNodes,
    );

    if (!canDeallocate.canDeallocate) {
      const orphanCount = canDeallocate.orphanedNodes?.length || 0;
      return {
        success: false,
        error: `Cannot deallocate: ${orphanCount} node(s) would lose path to root`,
      };
    }

    // Remove the allocation
    allocatedNodes.delete(key);
    return { success: true };
  };

  // Increment node level by 1
  const incrementNodeLevel = (
    bellId: number,
    nodeId: string,
  ): { success: boolean; error?: string } => {
    return allocateNode(bellId, nodeId);
  };

  // Decrement node level by 1
  const decrementNodeLevel = (
    bellId: number,
    nodeId: string,
  ): { success: boolean; error?: string } => {
    if (!bellsHelper) {
      return { success: false, error: "Bells helper not available" };
    }

    const key = getAllocationKey(bellId, nodeId);
    const allocated = allocatedNodes.get(key);

    if (!allocated || allocated.level === 0) {
      return { success: false, error: "Node not allocated" };
    }

    if (allocated.level === 1) {
      // Remove allocation entirely
      return deallocateNode(bellId, nodeId);
    }

    // Decrement level
    allocatedNodes.set(key, {
      ...allocated,
      level: allocated.level - 1,
    });

    return { success: true };
  };

  // Clear all allocations
  const clear = (): void => {
    allocatedNodes.clear();
  };

  // Clear all allocations for a specific bell
  const clearBell = (bellId: number): void => {
    const keysToDelete: string[] = [];
    for (const [key, allocated] of allocatedNodes.entries()) {
      if (allocated.constellationId === bellId) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => allocatedNodes.delete(key));
  };

  // Import nodes for a specific bell
  const importNodes = (
    bellId: number,
    nodes: Array<{ nodeId: string; level: number }>,
  ): number => {
    // Clear existing allocations for this bell
    clearBell(bellId);

    if (nodes.length === 0) return 0;

    // Set this bell as active
    selectBell(bellId);

    // Create pending list with target levels
    const pending = new Map<
      string,
      { nodeId: string; targetLevel: number }
    >();
    for (const node of nodes) {
      const key = getAllocationKey(bellId, node.nodeId);
      pending.set(key, {
        nodeId: node.nodeId,
        targetLevel: node.level,
      });
    }

    // Iteratively allocate until no more progress
    let progressMade = true;
    while (progressMade && pending.size > 0) {
      progressMade = false;

      for (const [key, node] of pending.entries()) {
        const currentLevel = getNodeLevel(bellId, node.nodeId);

        if (currentLevel >= node.targetLevel) {
          pending.delete(key);
          continue;
        }

        const canAllocate = canAllocateNode(bellId, node.nodeId);
        if (canAllocate.canAllocate) {
          const result = allocateNode(bellId, node.nodeId);
          if (result.success) {
            progressMade = true;
          }
        }
      }
    }

    // Count how many nodes reached their target level
    let appliedCount = 0;
    for (const node of nodes) {
      if (getNodeLevel(bellId, node.nodeId) >= node.level) {
        appliedCount++;
      }
    }

    return appliedCount;
  };

  const api: BellEquippedAPI = {
    get activeBellId() {
      return activeBellId;
    },
    get allocatedNodes() {
      return allocatedNodes;
    },
    get availableBellPoints() {
      return availableBellPoints;
    },
    selectBell,
    getActiveBellId,
    getActiveBellType,
    allocateNode,
    deallocateNode,
    incrementNodeLevel,
    decrementNodeLevel,
    getNodeLevel,
    isNodeAllocated,
    canAllocateNode,
    getTotalPointsSpent,
    getTotalPointsSpentAll,
    getPointsSpentOnActiveBell,
    clear,
    clearBell,
    importNodes,
  };

  setContext(bellEquippedKey, api);
  return api;
}

export function useBellEquipped(): BellEquippedAPI {
  const ctx = getContext<BellEquippedAPI>(bellEquippedKey);
  if (!ctx) {
    throw new Error(
      "Bell Equipped context not found. Did you call provideBellEquipped() in +layout.svelte?",
    );
  }
  return ctx;
}

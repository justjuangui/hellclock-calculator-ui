import { getContext, setContext } from "svelte";
import type {
  ConstellationsHelper,
  AllocatedNodesMap,
  AllocatedNode,
  SkillTreeNodeDefinition,
} from "$lib/hellclock/constellations";
import { SvelteMap } from "svelte/reactivity";

export type ConstellationEquippedAPI = {
  // Current state
  allocatedNodes: AllocatedNodesMap;
  selectedConstellationId: number | null;
  availableDevotionPoints: number;

  // Constellation selection
  selectConstellation: (constellationId: number) => void;
  clearConstellationSelection: () => void;

  // Node allocation
  allocateNode: (
    constellationId: number,
    nodeId: string,
  ) => { success: boolean; error?: string };
  deallocateNode: (
    constellationId: number,
    nodeId: string,
  ) => { success: boolean; error?: string };
  incrementNodeLevel: (
    constellationId: number,
    nodeId: string,
  ) => { success: boolean; error?: string };
  decrementNodeLevel: (
    constellationId: number,
    nodeId: string,
  ) => { success: boolean; error?: string };

  // Query methods
  getNodeLevel: (constellationId: number, nodeId: string) => number;
  isNodeAllocated: (constellationId: number, nodeId: string) => boolean;
  canAllocateNode: (
    constellationId: number,
    nodeId: string,
  ) => { canAllocate: boolean; reason?: string };
  getTotalDevotionSpent: (constellationId: number) => number;
  getTotalDevotionSpentAll: () => number;

  // Utility
  clear: () => void;
  clearConstellation: (constellationId: number) => void;
};

const constellationEquippedKey = Symbol("constellation-equipped");

export function provideConstellationEquipped(
  constellationsHelper?: ConstellationsHelper,
  initialDevotionPoints: number = 100,
): ConstellationEquippedAPI {
  const allocatedNodes = new SvelteMap<string, AllocatedNode>();
  let selectedConstellationId = $state<number | null>(null);
  let availableDevotionPoints = $state(initialDevotionPoints);

  // Helper function to create allocation key
  const getAllocationKey = (constellationId: number, nodeId: string): string => {
    return `${constellationId}:${nodeId}`;
  };

  // Get node allocation level
  const getNodeLevel = (constellationId: number, nodeId: string): number => {
    const key = getAllocationKey(constellationId, nodeId);
    return allocatedNodes.get(key)?.level ?? 0;
  };

  // Check if node is allocated
  const isNodeAllocated = (constellationId: number, nodeId: string): boolean => {
    return getNodeLevel(constellationId, nodeId) > 0;
  };

  // Calculate total devotion spent in a constellation
  const getTotalDevotionSpent = (constellationId: number): number => {
    if (!constellationsHelper) return 0;
    return constellationsHelper.getTotalDevotionSpent(
      constellationId,
      allocatedNodes,
    );
  };

  // Calculate total devotion spent across all constellations
  const getTotalDevotionSpentAll = (): number => {
    let total = 0;
    for (const allocated of allocatedNodes.values()) {
      total += allocated.level;
    }
    return total;
  };

  // Check if a node can be allocated
  const canAllocateNode = (
    constellationId: number,
    nodeId: string,
  ): { canAllocate: boolean; reason?: string } => {
    if (!constellationsHelper) {
      return { canAllocate: false, reason: "Constellations helper not available" };
    }

    const node = constellationsHelper.getNodeById(constellationId, nodeId);
    if (!node) {
      return { canAllocate: false, reason: "Node not found" };
    }

    const currentLevel = getNodeLevel(constellationId, nodeId);
    if (currentLevel >= node.maxLevel) {
      return { canAllocate: false, reason: "Node already at max level" };
    }

    // Check if we have devotion points available
    if (getTotalDevotionSpentAll() >= availableDevotionPoints) {
      return { canAllocate: false, reason: "No devotion points available" };
    }

    // Check dependencies using the helper
    return constellationsHelper.canAllocateNode(
      constellationId,
      nodeId,
      allocatedNodes,
    );
  };

  // Allocate a node (set to level 1)
  const allocateNode = (
    constellationId: number,
    nodeId: string,
  ): { success: boolean; error?: string } => {
    if (!constellationsHelper) {
      return { success: false, error: "Constellations helper not available" };
    }

    const canAllocate = canAllocateNode(constellationId, nodeId);
    if (!canAllocate.canAllocate) {
      return { success: false, error: canAllocate.reason };
    }

    const key = getAllocationKey(constellationId, nodeId);
    const currentLevel = getNodeLevel(constellationId, nodeId);

    if (currentLevel === 0) {
      // New allocation
      allocatedNodes.set(key, {
        constellationId,
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

  // Deallocate a node completely
  const deallocateNode = (
    constellationId: number,
    nodeId: string,
  ): { success: boolean; error?: string } => {
    if (!constellationsHelper) {
      return { success: false, error: "Constellations helper not available" };
    }

    const key = getAllocationKey(constellationId, nodeId);
    if (!allocatedNodes.has(key)) {
      return { success: false, error: "Node not allocated" };
    }

    // Check if any other nodes depend on this one
    const dependentNodes = constellationsHelper.getDependentNodes(
      constellationId,
      nodeId,
    );
    for (const dependent of dependentNodes) {
      if (isNodeAllocated(constellationId, dependent.name)) {
        return {
          success: false,
          error: "Cannot deallocate: other nodes depend on this one",
        };
      }
    }

    allocatedNodes.delete(key);
    return { success: true };
  };

  // Increment node level by 1
  const incrementNodeLevel = (
    constellationId: number,
    nodeId: string,
  ): { success: boolean; error?: string } => {
    return allocateNode(constellationId, nodeId);
  };

  // Decrement node level by 1
  const decrementNodeLevel = (
    constellationId: number,
    nodeId: string,
  ): { success: boolean; error?: string } => {
    if (!constellationsHelper) {
      return { success: false, error: "Constellations helper not available" };
    }

    const key = getAllocationKey(constellationId, nodeId);
    const allocated = allocatedNodes.get(key);

    if (!allocated || allocated.level === 0) {
      return { success: false, error: "Node not allocated" };
    }

    if (allocated.level === 1) {
      // Remove allocation entirely
      return deallocateNode(constellationId, nodeId);
    }

    // Decrement level
    allocatedNodes.set(key, {
      ...allocated,
      level: allocated.level - 1,
    });

    return { success: true };
  };

  // Select a constellation to view
  const selectConstellation = (constellationId: number): void => {
    selectedConstellationId = constellationId;
  };

  // Clear constellation selection
  const clearConstellationSelection = (): void => {
    selectedConstellationId = null;
  };

  // Clear all allocations
  const clear = (): void => {
    allocatedNodes.clear();
  };

  // Clear all allocations for a specific constellation
  const clearConstellation = (constellationId: number): void => {
    const keysToDelete: string[] = [];
    for (const [key, allocated] of allocatedNodes.entries()) {
      if (allocated.constellationId === constellationId) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => allocatedNodes.delete(key));
  };

  const api: ConstellationEquippedAPI = {
    get allocatedNodes() {
      return allocatedNodes;
    },
    get selectedConstellationId() {
      return selectedConstellationId;
    },
    get availableDevotionPoints() {
      return availableDevotionPoints;
    },
    selectConstellation,
    clearConstellationSelection,
    allocateNode,
    deallocateNode,
    incrementNodeLevel,
    decrementNodeLevel,
    getNodeLevel,
    isNodeAllocated,
    canAllocateNode,
    getTotalDevotionSpent,
    getTotalDevotionSpentAll,
    clear,
    clearConstellation,
  };

  setContext(constellationEquippedKey, api);
  return api;
}

export function useConstellationEquipped(): ConstellationEquippedAPI {
  const ctx = getContext<ConstellationEquippedAPI>(constellationEquippedKey);
  if (!ctx) {
    throw new Error(
      "Constellation Equipped context not found. Did you call provideConstellationEquipped() in +layout.svelte?",
    );
  }
  return ctx;
}

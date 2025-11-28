import { getContext, setContext } from "svelte";
import type {
  ConstellationsHelper,
  AllocatedNodesMap,
  AllocatedNode,
} from "$lib/hellclock/constellations";
import { SvelteMap } from "svelte/reactivity";

export type ConstellationEquippedAPI = {
  // Current state
  allocatedNodes: AllocatedNodesMap;
  availableDevotionPoints: number;

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
  constellationUnlocked: (constellationId: number) => boolean;

  getCurrentDevotionCategoryPoints: (category: string) => number;

  // Utility
  clear: () => void;
  clearConstellation: (constellationId: number) => void;

  // Import nodes with iterative allocation (async to allow tick() between allocations)
  importNodes: (
    nodes: Array<{ constellationId: number; nodeId: string; level: number }>,
  ) => number;
};

const constellationEquippedKey = Symbol("constellation-equipped");

export function provideConstellationEquipped(
  constellationsHelper?: ConstellationsHelper,
  initialDevotionPoints: number = 100,
): ConstellationEquippedAPI {
  const allocatedNodes = new SvelteMap<string, AllocatedNode>();
  const devotionCategoryPoints = new SvelteMap<string, number>();
  let availableDevotionPoints = $state(initialDevotionPoints);

  // Reactive effect to recalculate devotion category points whenever nodes change
  $effect(() => {
    if (!constellationsHelper) return;

    // Calculate new category points
    const newCategoryPoints = new Map<string, number>();

    // Track which constellations we've seen (for mastery checking)
    const constellationTotalSpent = new Map<number, number>();
    const constellationMaxPossible = new Map<number, number>();

    // Iterate through all allocated nodes
    for (const allocated of allocatedNodes.values()) {
      const node = constellationsHelper.getNodeById(
        allocated.constellationId,
        allocated.nodeId,
      );
      if (!node) continue;

      // Track devotion spent for mastery calculation
      const currentSpent =
        constellationTotalSpent.get(allocated.constellationId) || 0;
      constellationTotalSpent.set(
        allocated.constellationId,
        currentSpent + allocated.level,
      );

      // Track max possible devotion for this constellation
      if (!constellationMaxPossible.has(allocated.constellationId)) {
        const constellation = constellationsHelper.getConstellationById(
          allocated.constellationId,
        );
        if (constellation) {
          const maxDevotion = constellation.nodes.reduce(
            (sum, n) => sum + n.maxLevel,
            0,
          );
          constellationMaxPossible.set(allocated.constellationId, maxDevotion);
        }
      }

      // Process node affixes to find DevotionIncrementNodeAffixDefinition
      for (const affix of node.affixes) {
        if (affix.type === "DevotionIncrementNodeAffixDefinition") {
          const category = affix.eDevotionCategory;
          const pointsToAdd = affix.valuePerLevel * allocated.level;
          const currentPoints = newCategoryPoints.get(category) || 0;
          newCategoryPoints.set(category, currentPoints + pointsToAdd);
        }
      }
    }

    // Check for mastered constellations and add their bonuses
    for (const [
      constellationId,
      spentPoints,
    ] of constellationTotalSpent.entries()) {
      const constellation =
        constellationsHelper.getConstellationById(constellationId);
      if (!constellation) continue;

      const maxPoints = constellationMaxPossible.get(constellationId);

      if (maxPoints && spentPoints >= maxPoints) {
        // Check if ALL nodes are allocated at max level
        const allNodesAllocated = constellation.nodes.every((node) => {
          const key = `${constellationId}:${node.GUID}`;
          const allocated = allocatedNodes.get(key);
          return allocated && allocated.level >= node.maxLevel;
        });

        // Only grant mastery bonus if unlocked AND fully allocated
        if (allNodesAllocated && constellation.masteredDevotionGranted) {
          for (const [category, bonus] of Object.entries(
            constellation.masteredDevotionGranted,
          )) {
            if (typeof bonus === "number") {
              const currentPoints = newCategoryPoints.get(category) || 0;
              newCategoryPoints.set(category, currentPoints + bonus);
            }
          }
        }
      }
    }

    // Update the SvelteMap with new values
    devotionCategoryPoints.clear();
    for (const [category, points] of newCategoryPoints.entries()) {
      devotionCategoryPoints.set(category, points);
    }
  });

  // Helper function to create allocation key
  const getAllocationKey = (
    constellationId: number,
    nodeId: string,
  ): string => {
    return `${constellationId}:${nodeId}`;
  };

  // Get node allocation level
  const getNodeLevel = (constellationId: number, nodeId: string): number => {
    const key = getAllocationKey(constellationId, nodeId);
    return allocatedNodes.get(key)?.level ?? 0;
  };

  // Check if node is allocated
  const isNodeAllocated = (
    constellationId: number,
    nodeId: string,
  ): boolean => {
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

  const constellationUnlocked = (constellationId: number): boolean => {
    if (!constellationsHelper) {
      return false;
    }

    // check if already have constellation's condition meet
    const constellation =
      constellationsHelper.getConstellationById(constellationId);
    if (!constellation) {
      return false;
    }
    if (!constellation.conditions?.length) {
      return true;
    }
    for (const condition of constellation.conditions) {
      const currentPoints =
        devotionCategoryPoints.get(condition.required_devotion) ?? 0;
      if (currentPoints < parseInt(condition.targetValue)) {
        return false;
      }
    }

    return true;
  };

  // Check if a node can be allocated
  const canAllocateNode = (
    constellationId: number,
    nodeId: string,
  ): { canAllocate: boolean; reason?: string } => {
    if (!constellationsHelper) {
      return {
        canAllocate: false,
        reason: "Constellations helper not available",
      };
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

  // Helper function to simulate devotion calculation after deallocation
  const simulateDevotionPoints = (
    tempAllocatedNodes: AllocatedNodesMap,
  ): Map<string, number> => {
    if (!constellationsHelper) return new Map();

    const simulatedDevotionPoints = new Map<string, number>();
    const constellationTotalSpent = new Map<number, number>();
    const constellationMaxPossible = new Map<number, number>();

    // Calculate devotion points from node affixes
    for (const allocated of tempAllocatedNodes.values()) {
      const node = constellationsHelper.getNodeById(
        allocated.constellationId,
        allocated.nodeId,
      );
      if (!node) continue;

      // Track for mastery
      const currentSpent =
        constellationTotalSpent.get(allocated.constellationId) || 0;
      constellationTotalSpent.set(
        allocated.constellationId,
        currentSpent + allocated.level,
      );

      if (!constellationMaxPossible.has(allocated.constellationId)) {
        const constellation = constellationsHelper.getConstellationById(
          allocated.constellationId,
        );
        if (constellation) {
          const maxDevotion = constellation.nodes.reduce(
            (sum, n) => sum + n.maxLevel,
            0,
          );
          constellationMaxPossible.set(allocated.constellationId, maxDevotion);
        }
      }

      // Add devotion from affixes
      for (const affix of node.affixes) {
        if (affix.type === "DevotionIncrementNodeAffixDefinition") {
          const category = affix.eDevotionCategory;
          const pointsToAdd = affix.valuePerLevel * allocated.level;
          const currentPoints = simulatedDevotionPoints.get(category) || 0;
          simulatedDevotionPoints.set(category, currentPoints + pointsToAdd);
        }
      }
    }

    // Add mastery bonuses
    for (const [constId, spentPoints] of constellationTotalSpent.entries()) {
      const maxPoints = constellationMaxPossible.get(constId);
      const constellation = constellationsHelper.getConstellationById(constId);

      if (maxPoints && spentPoints >= maxPoints && constellation) {
        const isUnlocked =
          !constellation.conditions?.length ||
          constellation.conditions.every((condition) => {
            const requiredPoints =
              simulatedDevotionPoints.get(condition.required_devotion) || 0;
            return requiredPoints >= parseInt(condition.targetValue);
          });

        const allNodesAllocated = constellation.nodes.every((n) => {
          const k = `${constId}:${n.GUID}`;
          const alloc = tempAllocatedNodes.get(k);
          return alloc && alloc.level >= n.maxLevel;
        });

        if (
          isUnlocked &&
          allNodesAllocated &&
          constellation.masteredDevotionGranted
        ) {
          for (const [category, bonus] of Object.entries(
            constellation.masteredDevotionGranted,
          )) {
            if (typeof bonus === "number") {
              const currentPoints = simulatedDevotionPoints.get(category) || 0;
              simulatedDevotionPoints.set(category, currentPoints + bonus);
            }
          }
        }
      }
    }

    return simulatedDevotionPoints;
  };

  // Deallocate a node completely
  const deallocateNode = (
    constellationId: number,
    nodeId: string,
  ): { success: boolean; error?: string; cascadedNodes?: number } => {
    if (!constellationsHelper) {
      return { success: false, error: "Constellations helper not available" };
    }

    const key = getAllocationKey(constellationId, nodeId);
    if (!allocatedNodes.has(key)) {
      return { success: false, error: "Node not allocated" };
    }

    // Check if deallocation would orphan other nodes (in same constellation)
    const canDeallocate = constellationsHelper.canDeallocateNode(
      constellationId,
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

    // Perform the deallocation
    allocatedNodes.delete(key);

    // Simulate devotion points after this deallocation
    const simulatedDevotionPoints = simulateDevotionPoints(allocatedNodes);

    // Check for cascade deallocations
    const cascadeKeys = constellationsHelper.getCascadeDeallocations(
      allocatedNodes,
      simulatedDevotionPoints,
    );

    // Perform cascade deallocations
    let cascadedCount = 0;
    for (const cascadeKey of cascadeKeys) {
      if (allocatedNodes.has(cascadeKey)) {
        allocatedNodes.delete(cascadeKey);
        cascadedCount++;
      }
    }

    return {
      success: true,
      cascadedNodes: cascadedCount > 0 ? cascadedCount : undefined,
    };
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

  // Clear all allocations
  const clear = (): void => {
    allocatedNodes.clear();
    devotionCategoryPoints.clear();
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

  const getCurrentDevotionCategoryPoints = (category: string): number => {
    return devotionCategoryPoints.get(category) ?? 0;
  };

  // Import nodes with iterative allocation
  // Uses tick() to flush reactive updates between allocations
  const importNodes = (
    nodes: Array<{ constellationId: number; nodeId: string; level: number }>,
  ): number => {
    // Clear existing allocations
    clear();

    if (nodes.length === 0) return 0;

    // Create pending list with target levels
    const pending = new Map<
      string,
      { constellationId: number; nodeId: string; targetLevel: number }
    >();
    for (const node of nodes) {
      const key = getAllocationKey(node.constellationId, node.nodeId);
      pending.set(key, {
        constellationId: node.constellationId,
        nodeId: node.nodeId,
        targetLevel: node.level,
      });
    }

    debugger;
    // Iteratively allocate until no more progress
    let progressMade = true;
    while (progressMade && pending.size > 0) {
      progressMade = false;

      for (const [key, node] of pending.entries()) {
        const currentLevel = getNodeLevel(node.constellationId, node.nodeId);

        if (currentLevel >= node.targetLevel) {
          pending.delete(key);
          continue;
        }

        const canAllocate = canAllocateNode(node.constellationId, node.nodeId);
        if (canAllocate.canAllocate) {
          const result = allocateNode(node.constellationId, node.nodeId);
          if (result.success) {
            // Flush reactive updates so devotion points are recalculated
            // await tick();
            progressMade = true;
          }
        }
      }
    }

    // Count how many nodes reached their target level
    let appliedCount = 0;
    for (const node of nodes) {
      if (getNodeLevel(node.constellationId, node.nodeId) >= node.level) {
        appliedCount++;
      }
    }

    return appliedCount;
  };

  const api: ConstellationEquippedAPI = {
    get allocatedNodes() {
      return allocatedNodes;
    },
    get availableDevotionPoints() {
      return availableDevotionPoints;
    },
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
    getCurrentDevotionCategoryPoints,
    constellationUnlocked,
    importNodes,
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

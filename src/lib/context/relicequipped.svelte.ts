import { getContext, setContext } from "svelte";
import type {
  RelicInventoryShape,
  RelicSize,
  RelicsHelper,
  RelicItem,
} from "$lib/hellclock/relics";
import { SvelteMap } from "svelte/reactivity";

export type RelicInventoryPosition = {
  x: number;
  y: number;
};

export type RelicItemWithPosition = RelicItem & {
  position: RelicInventoryPosition;
};

export type RelicInventoryMap = Map<string, RelicItemWithPosition>; // key: "x,y"

export type RelicInventoryAPI = {
  // Current state
  currentTier: number;
  relics: RelicInventoryMap;

  // Tier management
  setTier: (tier: number) => void;
  getCurrentShape: () => RelicInventoryShape | undefined;

  // Grid utilities
  isValidPosition: (x: number, y: number) => boolean;
  canPlaceRelic: (x: number, y: number, size: RelicSize) => boolean;
  getRelicAt: (x: number, y: number) => RelicItemWithPosition | undefined;
  calculateAvailableSpace: (x: number, y: number) => { width: number; height: number };

  // Relic management
  placeRelic: (
    relic: RelicItem,
    x: number,
    y: number,
  ) => boolean;
  removeRelic: (x: number, y: number) => RelicItemWithPosition | undefined;
  clear: () => void;

  // Helpers
  getAvailableSlots: () => RelicInventoryPosition[];
  getOccupiedPositions: () => string[];
  positionKey: (x: number, y: number) => string;
};

const relicInventoryKey = Symbol("relic-inventory");

export function provideRelicInventory(
  relicsHelper?: RelicsHelper,
  initialTier: number = 0,
): RelicInventoryAPI {
  let currentTier = $state(initialTier);
  const relics = new SvelteMap<string, RelicItemWithPosition>();

  // Helper functions
  const positionKey = (x: number, y: number): string => `${x},${y}`;

  const getCurrentShape = (): RelicInventoryShape | undefined => {
    if (!relicsHelper) return undefined;
    return relicsHelper.getPlayerInventoryShapeByTier(currentTier);
  };

  const isValidPosition = (x: number, y: number): boolean => {
    const shape = getCurrentShape();
    if (!shape) return false;
    return relicsHelper?.isValidInventoryPosition(shape, x, y) ?? false;
  };

  const getRelicSizeConfig = (size: RelicSize) => {
    if (!relicsHelper) return { width: 1, height: 1 };
    const config = relicsHelper.getRelicSizeConfig(size);
    if (!config) return { width: 1, height: 1 };
    return {
      width: config.relicInventoryShape.width,
      height: config.relicInventoryShape.height,
    };
  };

  const canPlaceRelic = (x: number, y: number, size: RelicSize): boolean => {
    const { width, height } = getRelicSizeConfig(size);

    // Check if all required positions are valid and available
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < height; dy++) {
        const checkX = x + dx;
        const checkY = y + dy;

        // Check if position is within bounds and valid
        if (!isValidPosition(checkX, checkY)) {
          return false;
        }

        // Check if position is already occupied
        if (relics.has(positionKey(checkX, checkY))) {
          return false;
        }
      }
    }

    return true;
  };

  const getRelicAt = (x: number, y: number): RelicItemWithPosition | undefined => {
    return relics.get(positionKey(x, y));
  };

  const placeRelic = (
    relic: RelicItem,
    x: number,
    y: number,
  ): boolean => {
    if (!canPlaceRelic(x, y, relic.size)) {
      return false;
    }

    const { width, height } = getRelicSizeConfig(relic.size);
    const relicWithPosition: RelicItemWithPosition = {
      ...relic,
      position: { x, y },
      width,
      height,
    };

    // Place the relic in all positions it occupies
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < height; dy++) {
        const key = positionKey(x + dx, y + dy);
        relics.set(key, relicWithPosition);
      }
    }

    return true;
  };

  const removeRelic = (x: number, y: number): RelicItemWithPosition | undefined => {
    const relic = getRelicAt(x, y);
    if (!relic) return undefined;

    // Remove the relic from all positions it occupies
    for (let dx = 0; dx < relic.width; dx++) {
      for (let dy = 0; dy < relic.height; dy++) {
        const key = positionKey(relic.position.x + dx, relic.position.y + dy);
        relics.delete(key);
      }
    }

    return relic;
  };

  const clear = (): void => {
    relics.clear();
  };

  const getAvailableSlots = (): RelicInventoryPosition[] => {
    const shape = getCurrentShape();
    if (!shape) return [];

    const available: RelicInventoryPosition[] = [];
    for (let y = 0; y < shape.height; y++) {
      for (let x = 0; x < shape.width; x++) {
        if (isValidPosition(x, y) && !relics.has(positionKey(x, y))) {
          available.push({ x, y });
        }
      }
    }
    return available;
  };

  const getOccupiedPositions = (): string[] => {
    return Array.from(relics.keys());
  };

  const calculateAvailableSpace = (x: number, y: number): { width: number; height: number } => {
    const shape = getCurrentShape();
    if (!shape || !isValidPosition(x, y) || relics.has(positionKey(x, y))) {
      return { width: 0, height: 0 };
    }

    let maxWidth = 0;
    let maxHeight = 0;

    // Calculate maximum width (rightward from starting position)
    for (let checkX = x; checkX < shape.width; checkX++) {
      if (isValidPosition(checkX, y) && !relics.has(positionKey(checkX, y))) {
        maxWidth++;
      } else {
        break;
      }
    }

    // Calculate maximum height (downward from starting position)
    for (let checkY = y; checkY < shape.height; checkY++) {
      if (isValidPosition(x, checkY) && !relics.has(positionKey(x, checkY))) {
        maxHeight++;
      } else {
        break;
      }
    }

    // Find the largest rectangle that can fit starting from this position
    let availableWidth = maxWidth;
    let availableHeight = maxHeight;

    // Check each row to find the actual available rectangular space
    for (let checkY = y; checkY < y + maxHeight; checkY++) {
      let rowWidth = 0;
      for (let checkX = x; checkX < x + maxWidth; checkX++) {
        if (isValidPosition(checkX, checkY) && !relics.has(positionKey(checkX, checkY))) {
          rowWidth++;
        } else {
          break;
        }
      }
      availableWidth = Math.min(availableWidth, rowWidth);
      if (rowWidth === 0) {
        availableHeight = checkY - y;
        break;
      }
    }

    return { width: availableWidth, height: availableHeight };
  };

  const setTier = (tier: number): void => {
    if (tier >= 0 && tier < 5) {
      // Clear relics that would be invalid in new tier
      const newShape = relicsHelper?.getPlayerInventoryShapeByTier(tier);
      if (newShape) {
        const toRemove: string[] = [];
        for (const [key, relic] of relics.entries()) {
          const [x, y] = key.split(",").map(Number);
          if (relic.position.x != x || relic.position.y != y) {
            continue; // Only check top-left positions
          }

          let removeThisRelic = false;
          for (let dx = 0; dx < relic.width; dx++) {
            for (let dy = 0; dy < relic.height; dy++) {
              if (
                !relicsHelper?.isValidInventoryPosition(
                  newShape,
                  x + dx,
                  y + dy,
                )
              ) {
                removeThisRelic = true;
                break;
              }
            }
            if (removeThisRelic) break;
          }

          if (removeThisRelic) {
            // Remove all positions occupied by this relic
            for (let dx = 0; dx < relic.width; dx++) {
              for (let dy = 0; dy < relic.height; dy++) {
                toRemove.push(
                  positionKey(relic.position.x + dx, relic.position.y + dy),
                );
              }
            }
          }
        }
        toRemove.forEach((key) => relics.delete(key));
      }

      currentTier = tier;
    }
  };

  const api: RelicInventoryAPI = {
    get currentTier() {
      return currentTier;
    },
    get relics() {
      return relics;
    },
    setTier,
    getCurrentShape,
    isValidPosition,
    canPlaceRelic,
    getRelicAt,
    calculateAvailableSpace,
    placeRelic,
    removeRelic,
    clear,
    getAvailableSlots,
    getOccupiedPositions,
    positionKey,
  };

  setContext(relicInventoryKey, api);
  return api;
}

export function useRelicInventory(): RelicInventoryAPI {
  const ctx = getContext<RelicInventoryAPI>(relicInventoryKey);
  if (!ctx) {
    throw new Error(
      "Relic Inventory context not found. Did you call provideRelicInventory() in +layout.svelte?",
    );
  }
  return ctx;
}


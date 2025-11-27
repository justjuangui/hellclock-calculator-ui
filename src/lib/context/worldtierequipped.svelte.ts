import type { WorldTier, WorldTiersHelper } from "$lib/hellclock/worldtiers";
import { getContext, setContext } from "svelte";

export type WorldTierEquippedAPI = {
  selectedWorldTier: WorldTier | null;
  setWorldTier: (tier: WorldTier) => void;
  clear: () => void;
  get worldTierHash(): string;
};

const worldTierEquippedKey = Symbol("world-tier-equipped");

export function provideWorldTierEquipped(
  worldTiersHelper?: WorldTiersHelper,
): WorldTierEquippedAPI {
  // Default to Normal tier on initialization
  let selectedWorldTier = $state<WorldTier | null>(
    worldTiersHelper?.getDefaultWorldTier() ?? null,
  );

  const api: WorldTierEquippedAPI = {
    get selectedWorldTier() {
      return selectedWorldTier;
    },
    set selectedWorldTier(tier: WorldTier | null) {
      selectedWorldTier = tier;
    },

    setWorldTier: (tier: WorldTier) => {
      selectedWorldTier = tier;
    },

    clear: () => {
      selectedWorldTier = worldTiersHelper?.getDefaultWorldTier() ?? null;
    },

    get worldTierHash(): string {
      if (!selectedWorldTier) return "";
      return selectedWorldTier.worldTierKey;
    },
  };

  setContext(worldTierEquippedKey, api);
  return api;
}

export function useWorldTierEquipped(): WorldTierEquippedAPI {
  const ctx = getContext<WorldTierEquippedAPI>(worldTierEquippedKey);
  if (!ctx) {
    throw new Error(
      "WorldTierEquipped context not found. Did you call provideWorldTierEquipped() in +layout.svelte?",
    );
  }
  return ctx;
}

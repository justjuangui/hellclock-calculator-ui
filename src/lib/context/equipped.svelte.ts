import { getContext, setContext } from "svelte";
import { type GearItem, type GearSlot } from "$lib/hellclock/gears";

export type EquippedMap = Partial<Record<GearSlot, GearItem>>;
export type EquippedAPI = {
  equipped: EquippedMap;
  set: (slot: GearSlot, item: GearItem) => void;
  unset: (slot: GearSlot) => void;
  clear: () => void;
};

const equippedKey = Symbol("equipped-gear");

export function providedEquipped(initial?: EquippedMap): EquippedAPI {
  const equipped = $state<EquippedMap>(structuredClone(initial ?? {}));
  const api: EquippedAPI = {
    equipped,
    set: (slot, item) => {
      equipped[slot] = item;
    },
    unset: (slot) => {
      delete equipped[slot];
    },
    clear: () => {
      for (const k of Object.keys(equipped)) {
        delete equipped[k as GearSlot];
      }
    },
  };
  setContext(equippedKey, api);
  return api;
}

export function useEquipped(): EquippedAPI {
  const ctx = getContext<EquippedAPI>(equippedKey);
  if (!ctx) {
    throw new Error(
      "Equipped context not found. Did you call provideEquipped() in +layout.svelte?",
    );
  }
  return ctx;
}

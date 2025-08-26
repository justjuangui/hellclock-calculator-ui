import { getContext, setContext } from "svelte";
import { type GearItem, type GearSlot } from "$lib/hellclock/gears";

export type EquippedMap = Partial<Record<GearSlot, GearItem>>;
export type EquippedAPI = {
  equipped: EquippedMap;
  set: (slot: GearSlot, item: GearItem) => void;
  unset: (slot: GearSlot) => void;
  clear: () => void;
};

export enum ESlotsType {
  BlessedGear,
  TrinkedGear,
}

const equippedBlessedKey = Symbol("equipped-blessed-gear");
const equippedTrinkedKey = Symbol("equipped-trinket-gear");

export function providedEquipped(
  slotsType: ESlotsType,
  initial?: EquippedMap,
): EquippedAPI {
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
  const contextKey =
    slotsType === ESlotsType.BlessedGear
      ? equippedBlessedKey
      : equippedTrinkedKey;
  setContext(contextKey, api);
  return api;
}

export function useEquipped(slotsType: ESlotsType): EquippedAPI {
  const contextKey =
    slotsType === ESlotsType.BlessedGear
      ? equippedBlessedKey
      : equippedTrinkedKey;
  const ctx = getContext<EquippedAPI>(contextKey);
  if (!ctx) {
    throw new Error(
      "Equipped context not found. Did you call provideEquipped() in +layout.svelte?",
    );
  }
  return ctx;
}

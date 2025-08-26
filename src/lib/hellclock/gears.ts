import { type LangText } from "$lib/hellclock/lang";
export type GearSlot =
  | "WEAPON"
  | "HELMET"
  | "SHOULDERS"
  | "ARMOR"
  | "BRACERS"
  | "PANTS"
  | "BOOTS"
  | "RING_LEFT"
  | "RING_RIGHT"
  | "CAPE"
  | "TRINKET"
  | "ACCESSORY";

export type GearSlotDefinition = {
  type: "GearSlotDefinition";
  slot: GearSlot;
  statDefinition: string;
  eStatModifierType: string;
  slotNameKey?: LangText[];
};

export type GearSlotDB = {
  name: "GearSlotDatabase";
  type: "GearSlotDatabase";
  regularGearSlotDefinitions?: GearSlotDefinition[];
  blessedGearSlotDefinitions?: GearSlotDefinition[];
};

export type StatModifierType =
  | "Additive"
  | "Multiplicative"
  | "MultiplicativeAdditive";
export enum EComplementType {
  None,
  Complement,
  Decrement,
}
export enum ESingType {
  Default,
  Always,
  Never,
}

export type StatMod = {
  type: "StatModifierDefinition";
  eStatDefinition: string;
  modifierType: StatModifierType;
  value: number;
  selectedValue?: number;
};

export type GearVariant = {
  weight: number;
  value: {
    type: "GearDefinitionVariantData";
    variantLocalizedName?: LangText[];
    sprite?: string; // e.g., "IconGear_BootsVisual2"
    statModifiersDefinitions?: StatMod[];
  };
};

export type GearDefinition = {
  name: string;
  id: number;
  type: "GearDefinition";
  slot: GearSlot;
  tier: number;
  visualTier?: number;
  power?: number;
  variants?: GearVariant[];
  nameKey?: LangText[];
  sellingValue?: number;
  gearShopCost?: number;
  blessingPrice?: number;
};

export type GearRoot = { Gear: GearDefinition[] };
export type GearItem = {
  defId: number;
  slot: GearSlot;
  tier: number;
  visualTier: number;
  localizedName?: LangText[];
  prefixLocalizedName?: LangText[];
  color?: string; // rarity color
  multiplierRange: [number, number]; // rarity multiplier range
  sprite?: string;
  mods: StatMod[];
  sellingValue?: number;
  gearShopCost?: number;
  blessingPrice?: number;
};

export type GearRarityDefinition = {
  name: string;
  type: "GearRarity";
  multiplierRange: [number, number];
  sellingValueMultiplier: number;
  color: string;
  localizedName?: LangText[];
};

export type GearDropRarityConfigDefinition = {
  value: GearRarityDefinition;
};
export type GearRarityRoot = {
  gearDropRarityConfigs: GearDropRarityConfigDefinition[];
  blessedGearRarity: GearRarityDefinition;
};

export class GearsHelper {
  private slotDatabase: GearSlotDB;
  private gearDefinitions: GearDefinition[];
  private gearRarity: GearRarityRoot;

  constructor(
    slotDatabase: GearSlotDB,
    gearRoot: GearRoot,
    gearRarity: GearRarityRoot,
  ) {
    this.slotDatabase = slotDatabase;
    this.gearDefinitions = gearRoot.Gear;
    this.gearRarity = gearRarity;
  }

  getGearDefinitionById(id: number): GearDefinition | undefined {
    return this.gearDefinitions.find((g) => g.id === id);
  }

  getAllGearDefinitions(): GearDefinition[] {
    return Array.from(this.gearDefinitions.values());
  }

  getGearSlotDefinition(
    slot: GearSlot,
    blessed: boolean,
  ): GearSlotDefinition | undefined {
    const defs = blessed
      ? this.slotDatabase.blessedGearSlotDefinitions
      : this.slotDatabase.regularGearSlotDefinitions;
    return defs?.find((d) => d.slot === slot);
  }

  getGearSlotsDefinitions(blessed: boolean): GearSlotDefinition[] {
    return blessed
      ? (this.slotDatabase.blessedGearSlotDefinitions ?? [])
      : (this.slotDatabase.regularGearSlotDefinitions ?? []);
  }

  getSpriteRegularGearBySlot(slot: GearSlot) {
    switch (slot) {
      case "WEAPON":
        return "IconTrinket_WeaponT1";
      case "HELMET":
        return "IconTrinket_Placeholder";
      case "SHOULDERS":
        return "IconTrinket_Placeholder";
      case "ARMOR":
        return "IconTrinket_ArmorT1";
      case "BRACERS":
        return "IconTrinket_BracersT1";
      case "PANTS":
        return "IconTrinket_PantsT1";
      case "BOOTS":
        return "IconTrinket_BootsT1";
      case "RING_LEFT":
        return "IconTrinket_RingT1";
      case "RING_RIGHT":
        return "IconTrinket_RingT1";
      case "CAPE":
        return "IconTrinket_CapeT1";
      case "TRINKET":
        return "IconTrinket_TrinketT1";
      case "ACCESSORY":
        return "IconTrinket_AccessoryT1";
      default:
        return undefined;
    }
  }

  getGearItems(blessed: boolean, slotFilter?: GearSlot): GearItem[] {
    let items: GearItem[] = [];
    this.gearDefinitions
      .filter(
        (gd) =>
          (blessed && gd.blessingPrice) || (!blessed && !gd.blessingPrice),
      )
      .filter((gd) => (slotFilter ? gd.slot === slotFilter : true))
      .forEach((gd) => {
        if (!gd.variants || gd.variants.length === 0) {
          const groupRarity = !blessed
            ? this.gearRarity.gearDropRarityConfigs
            : [];

          for (let rarityConfig of groupRarity) {
            let slot = this.slotDatabase.regularGearSlotDefinitions?.find(
              (sd) => sd.slot === gd.slot,
            );
            if (!slot) {
              console.warn(
                `No slot definition found for slot ${gd.slot} in gear definition ID ${gd.id}`,
              );
              continue;
            }
            // If the gear definition has no variants, we create a default item with no mods
            items.push({
              defId: gd.id,
              slot: gd.slot,
              tier: gd.tier,
              visualTier: gd.visualTier ?? gd.tier,
              localizedName: gd.nameKey,
              prefixLocalizedName: rarityConfig.value.localizedName,
              color: rarityConfig.value.color,
              multiplierRange: rarityConfig.value.multiplierRange,
              mods: [
                {
                  eStatDefinition: slot.statDefinition,
                  modifierType: slot.eStatModifierType as StatModifierType,
                  type: "StatModifierDefinition",
                  value: gd.power ?? 0,
                  selectedValue: rarityConfig.value.multiplierRange[1],
                },
              ],
              sprite: this.getSpriteRegularGearBySlot(gd.slot),
              sellingValue: Math.floor(
                (gd.sellingValue ?? 0) *
                  rarityConfig.value.sellingValueMultiplier,
              ),
              gearShopCost: gd.gearShopCost,
              blessingPrice: gd.blessingPrice,
            });
          }
          return;
        }
        gd.variants.forEach((variant) => {
          const rarity = blessed
            ? this.gearRarity.blessedGearRarity
            : undefined;

          let mods = [...(variant.value.statModifiersDefinitions?.map(s => ({...s})) ?? [])];
          mods.forEach((m) => {
            m.selectedValue = rarity?.multiplierRange[1] ?? 1;
          });
          items.push({
            defId: gd.id,
            slot: gd.slot,
            tier: gd.tier,
            visualTier: gd.visualTier ?? gd.tier,
            localizedName: variant.value.variantLocalizedName,
            prefixLocalizedName: rarity?.localizedName,
            color: rarity?.color,
            multiplierRange: rarity?.multiplierRange ?? [0, 1],
            sprite: variant.value.sprite,
            mods: mods,
            sellingValue:
              gd.sellingValue && rarity
                ? Math.floor(gd.sellingValue * rarity.sellingValueMultiplier)
                : gd.sellingValue,
            gearShopCost: gd.gearShopCost,
            blessingPrice: gd.blessingPrice,
          });
        });
      });

    return items;
  }
}

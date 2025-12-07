import { type LangText, translate } from "$lib/hellclock/lang";
import type { StatMod, StatModifierType, StatsHelper } from "$lib/hellclock/stats";
import { type TooltipLine, parseRGBA01ToCss, fmtValue } from "$lib/hellclock/utils";

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
  sprite?: string; // e.g., "IconTrinket_BootsT1"
  variants?: GearVariant[];
  nameKey?: LangText[];
  sellingValue?: number;
  gearShopCost?: number;
  blessingPrice?: number;
};

export type GearRoot = { Gear: GearDefinition[] };
export type GearItem = {
  defId: number;
  variantIndex: number;
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

  /**
   * Get a single gear item by definition ID and variant index
   * Used for importing gear from save files
   */
  getGearItem(
    defId: number,
    variantIndex: number,
    multiplier?: number,
  ): GearItem | undefined {
    const gd = this.getGearDefinitionById(defId);
    if (!gd || !gd.variants || (variantIndex > 0 && variantIndex >= gd.variants.length)) {
      return undefined;
    }

    let mods: StatMod[] = [];
    let localizedName: LangText[] | undefined = gd.nameKey;
    let sprite: string | undefined = undefined;
    if (gd.variants.length > 0) {
      const variant = gd.variants[variantIndex];
      localizedName = variant.value.variantLocalizedName;
      sprite = variant.value.sprite;
      mods = [
        ...(variant.value.statModifiersDefinitions?.map((s) => ({ ...s })) ??
          []),
      ];
    } else {
      const slot = this.slotDatabase.blessedGearSlotDefinitions?.find(
        (sd) => sd.slot === gd.slot,
      );
      if (!slot) {
        console.warn(
          `No slot definition found for slot ${gd.slot} in gear definition ID ${gd.id}`,
        );
        return undefined;
      }
      mods = [
        {
          eStatDefinition: slot.statDefinition,
          modifierType: slot.eStatModifierType as StatModifierType,
          type: "StatModifierDefinition",
          value: gd.power ?? 0,
        },
      ];
      sprite = gd.sprite;
    }
    const rarity = gd.blessingPrice
      ? this.gearRarity.blessedGearRarity
      : undefined;

    mods.forEach((m) => {
      m.selectedValue = multiplier ?? rarity?.multiplierRange[1] ?? 1;
    });

    return {
      defId: gd.id,
      variantIndex,
      slot: gd.slot,
      tier: gd.tier,
      visualTier: gd.visualTier ?? gd.tier,
      localizedName,
      prefixLocalizedName: rarity?.localizedName,
      color: rarity?.color,
      multiplierRange: rarity?.multiplierRange ?? [0, 1],
      sprite,
      mods,
      sellingValue:
        gd.sellingValue && rarity
          ? Math.floor(gd.sellingValue * rarity.sellingValueMultiplier)
          : gd.sellingValue,
      gearShopCost: gd.gearShopCost,
      blessingPrice: gd.blessingPrice,
    };
  }

  getGearItems(blessed: boolean, slotFilter?: GearSlot): GearItem[] {
    const items: GearItem[] = [];
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

          for (const rarityConfig of groupRarity) {
            const slot = this.slotDatabase.regularGearSlotDefinitions?.find(
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
              variantIndex: 0,
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
        gd.variants.forEach((variant, variantIdx) => {
          const rarity = blessed
            ? this.gearRarity.blessedGearRarity
            : undefined;

          const mods = [
            ...(variant.value.statModifiersDefinitions?.map((s) => ({
              ...s,
            })) ?? []),
          ];
          mods.forEach((m) => {
            m.selectedValue = rarity?.multiplierRange[1] ?? 1;
          });
          items.push({
            defId: gd.id,
            variantIndex: variantIdx,
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

  /**
   * Get tooltip lines for a gear item
   */
  getTooltipLines(
    gear: GearItem | undefined,
    lang: string,
    statsHelper: StatsHelper,
  ): TooltipLine[] {
    if (!gear) {
      return [{ text: "Empty", type: "info" }];
    }

    const lines: TooltipLine[] = [
      {
        text: `${translate(gear.localizedName, lang)} (T${gear.tier})`,
        color: gear.color ? parseRGBA01ToCss(gear.color) : undefined,
        icon: gear.sprite,
        type: "header",
      },
    ];

    lines.push({ text: "", type: "divider" });

    for (const mod of gear.mods) {
      lines.push({
        text: fmtValue(
          mod,
          lang,
          statsHelper,
          gear.multiplierRange[0],
          gear.multiplierRange[1],
        ),
        type: "affix",
      });
    }

    return lines;
  }
}

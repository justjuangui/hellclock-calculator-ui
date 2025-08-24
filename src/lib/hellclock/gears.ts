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

export type StatModifierType = "Additive" | "Multiplicative" | "MultiplicativeAdditive";
export enum EComplementType {
	None,
	Complement,
	Decrement
}
export enum ESingType {
	Default,
	Always,
	Never
}

export type StatMod = {
	type: "StatModifierDefinition";
	eStatDefinition: string;
	modifierType: StatModifierType;
	value: number;
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

}

export type GearRarityRoot = {
	blessedGearRarity: GearRarityDefinition;
}

export class GearsHelper {
	private slotDatabase: GearSlotDB
	private gearDefinitions: GearDefinition[];
	private gearRarity: GearRarityRoot

	constructor(slotDatabase: GearSlotDB, gearRoot: GearRoot, gearRarity: GearRarityRoot) {
		this.slotDatabase = slotDatabase;
		this.gearDefinitions = gearRoot.Gear;
		this.gearRarity = gearRarity
	}

	getGearDefinitionById(id: number): GearDefinition | undefined {
		return this.gearDefinitions.find(g => g.id === id);
	}

	getAllGearDefinitions(): GearDefinition[] {
		return Array.from(this.gearDefinitions.values());
	}

	getGearSlotDefinition(slot: GearSlot, blessed: boolean): GearSlotDefinition | undefined {
		const defs = blessed ? this.slotDatabase.blessedGearSlotDefinitions : this.slotDatabase.regularGearSlotDefinitions;
		return defs?.find(d => d.slot === slot);
	}

	getGearSlotsDefinitions(blessed: boolean): GearSlotDefinition[] {
		return blessed ? (this.slotDatabase.blessedGearSlotDefinitions ?? []) : (this.slotDatabase.regularGearSlotDefinitions ?? []);
	}

	getGearItems(blessed: boolean): GearItem[] {
		let items : GearItem[] = [];

		this.gearDefinitions.filter(gd => (blessed && gd.blessingPrice) || (!blessed && !gd.blessingPrice)).forEach(gd => {
			if (!gd.variants || gd.variants.length === 0) {
				items.push({
					defId: gd.id,
					slot: gd.slot,
					tier: gd.tier,
					visualTier: gd.visualTier ?? gd.tier,
					localizedName: gd.nameKey,
					multiplierRange: [0, 1],
					mods: [],
					sellingValue: gd.sellingValue,
					gearShopCost: gd.gearShopCost,
					blessingPrice: gd.blessingPrice
				});
				return;
			}
			gd.variants.forEach(variant => {
				const rarity = blessed ? this.gearRarity.blessedGearRarity : undefined;
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
					mods: variant.value.statModifiersDefinitions ?? [],
					sellingValue: gd.sellingValue && rarity ? Math.floor(gd.sellingValue * rarity.sellingValueMultiplier) : gd.sellingValue,
					gearShopCost: gd.gearShopCost,
					blessingPrice: gd.blessingPrice
				});
			});
		});

		return items;
	}
}

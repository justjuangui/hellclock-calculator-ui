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
	sellingValue?: number;
	gearShopCost?: number;
	blessingPrice?: number;
};

export type GearRoot = { Gear: GearDefinition[] };
export type GearItem = {
	defId: number;
	slot: GearSlot;
	tier: number;
	baseName: string; // definition name
	name: string; // localized variant name
	sprite?: string;
	mods: StatMod[];
	sellingValue?: number;
	gearShopCost?: number;
	blessingPrice?: number;
};

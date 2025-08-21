export type EngineWorkerMessage =
	| { type: 'ready' }
	| { type: 'loaded'; payload: unknown }
	| { type: 'built'; payload: unknown }
	| { type: 'evaluated'; payload: unknown }
	| { type: 'explained'; payload: unknown }
	| { type: 'error'; payload: string };

export type EngineWorkerCommand =
	| { type: 'loadPack'; payload: unknown }
	| { type: 'build'; payload: { actor: unknown; target: unknown } }
	| { type: 'eval'; payload: unknown }
	| { type: 'explain'; payload: unknown };

export type GamePack = Record<string, unknown>;

export type XNode = {
	name?: string;
	op?: string;
	value: number;
	meta?: Record<string, string>;
	children?: XNode[];
};

export type LangText = { langCode: string; langTranslation: string };
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

export type StatMod = {
	type: "StatModifierDefinition";
	eStatDefinition: string;
	modifierType:
	| "Additive"
	| "Multiplicative"
	| "MultiplicativeAdditive"
	| string;
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

export type EquippedMap = Partial<Record<GearSlot, GearItem>>;

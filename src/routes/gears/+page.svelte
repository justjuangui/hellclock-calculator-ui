<script lang="ts">
	import { useEquipped } from "$lib/context/equipped.svelte";
	import {
		type GamePack,
		type GearDefinition,
		type GearItem,
		type GearRoot,
		type GearSlot,
		type GearSlotDB,
		type GearSlotDefinition,
		type LangText,
		type StatMod,
	} from "$lib/engine/types";
	import { getContext, onMount } from "svelte";

	const {
		equipped,
		set: setEquipped,
		unset: unsetEquipped,
	} = useEquipped();
	const gamepack = getContext<GamePack>("gamepack");
	const lang = getContext<string>("lang") || "en";

	let slotDB = $state<GearSlotDB | null>(null);
	let allSlots = $state<GearSlot[]>([]);
	let slotLabel = $derived.by<Record<GearSlot, string>>(() => {
		const labels: Partial<Record<GearSlot, string>> = {};
		for (const s of allSlots) {
			let slotNameKey = findSlotDef(s)?.slotNameKey;
			let translatedName = tr(slotNameKey, lang);
			labels[s] = translatedName || prettySlot(s);
		}
		console.debug(labels);
		return labels as Record<GearSlot, string>;
	});

	let gearItems = $state<GearItem[]>([]);
	let itemsBySlot = $derived.by<Record<GearSlot, GearItem[]>>(() => {
		const map = {} as Record<GearSlot, GearItem[]>;
		for (const s of allSlots) map[s] = [];
		for (const g of gearItems) (map[g.slot] ??= []).push(g);
		// stable sort: tier desc, then name
		for (const s of allSlots)
			map[s].sort(
				(a, b) =>
					b.tier - a.tier ||
					a.name.localeCompare(b.name),
			);
		return map;
	});

	const defaultOrder: GearSlot[] = [
		"WEAPON",
		"RING_LEFT",
		"RING_RIGHT",
		"HELMET",
		"ARMOR",
		"SHOULDERS",
		"BRACERS",
		"PANTS",
		"BOOTS",
		"CAPE",
		"ACCESSORY",
		"TRINKET",
	];

	let selectedSlot = $state<GearSlot>("WEAPON");
	let search = $state("");

	function findSlotDB(gp: Record<string, unknown>): GearSlotDB | null {
		return (gp["Gear Slot"] as GearSlotDB) ?? null;
	}

	function findSlotDef(s: GearSlot): GearSlotDefinition | undefined {
		if (!slotDB) return;
		const list = [
			...(slotDB.blessedGearSlotDefinitions ?? []),
			...(slotDB.regularGearSlotDefinitions ?? []),
		];
		return list.find((d) => d.slot === s);
	}

	function tr(list?: LangText[], langCode?: string): string {
		if (!list?.length) return "";
		const lc = (langCode || "en").toLowerCase();
		const m = new Map(
			list.map((x) => [
				x.langCode.toLowerCase(),
				x.langTranslation,
			]),
		);
		// try exact, then base language, then common canonicalizations, then en, then first
		const candidates = [
			lc,
			lc.split("-")[0], // 'es-CO' -> 'es'
			lc.replace("_", "-"),
			lc === "pt-br" ? "pt-br" : lc, // keep pt-br
			"en",
		].filter(Boolean);

		for (const k of candidates) {
			if (m.has(k)) {
				return m.get(k) as string;
			}
		}

		return list[0].langTranslation;
	}

	function prettySlot(s: string): string {
		return s
			.replace(/_/g, " ")
			.toLowerCase()
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}

	function spriteUrl(sprite?: string): string | undefined {
		if (!sprite) return undefined;
		// put your sprite files at: static/assets/sprites/<sprite>.png → /assets/sprites/<sprite>.png
		return `/assets/sprites/${sprite}.png`;
	}

	function fmtValue(mod: StatMod): string {
		const { value, eStatDefinition, modifierType } = mod;
		// heuristic: values in [0,1] are likely percentages
		const asPct =
			value >= 0 &&
			value <= 1 &&
			!["Life", "Mana", "BaseDamage", "Damage"].includes(
				eStatDefinition,
			);
		const v = asPct
			? `${(value * 100).toFixed(1)}%`
			: Number.isInteger(value)
				? String(value)
				: value.toFixed(2);
		const symbol =
			modifierType === "Additive"
				? "+"
				: modifierType === "Multiplicative"
					? "×"
					: "";
		return `${symbol}${v} ${eStatDefinition}`;
	}

	function tooltipText(item?: GearItem): string {
		if (!item) return "Empty";
		const lines = [
			`${item.name} (T${item.tier})`,
			...item.mods.map(fmtValue),
		];
		return lines.join("\n");
	}

	function expandGear(
		defs: GearDefinition[],
		langCode: string,
	): GearItem[] {
		const out: GearItem[] = [];
		for (const g of defs) {
			const baseName = g.name;
			if (!g.variants?.length) {
				out.push({
					defId: g.id,
					slot: g.slot,
					tier: g.tier,
					baseName,
					name: baseName,
					sprite: undefined,
					mods: [],
					sellingValue: g.sellingValue,
					gearShopCost: g.gearShopCost,
					blessingPrice: g.blessingPrice,
				});
				continue;
			}
			for (const v of g.variants) {
				const data = v.value;
				out.push({
					defId: g.id,
					slot: g.slot,
					tier: g.tier,
					baseName,
					name:
						tr(
							data.variantLocalizedName,
							langCode,
						) || baseName,
					sprite: data.sprite,
					mods: [
						...(data.statModifiersDefinitions ??
							[]),
					],
					sellingValue: g.sellingValue,
					gearShopCost: g.gearShopCost,
					blessingPrice: g.blessingPrice,
				});
			}
		}
		return out;
	}

	function equip(item: GearItem) {
		setEquipped(item.slot, item);
	}

	function unequip(slot: GearSlot) {
		unsetEquipped(slot);
	}

	function matches(i: GearItem, q: string): boolean {
		if (!q) return true;
		q = q.toLowerCase();
		return (
			i.name.toLowerCase().includes(q) ||
			i.baseName.toLowerCase().includes(q) ||
			i.mods.some((m) =>
				m.eStatDefinition.toLowerCase().includes(q),
			)
		);
	}

	onMount(() => {
		slotDB = findSlotDB(gamepack);
		const sdefs = [
			...(slotDB?.blessedGearSlotDefinitions ?? []),
			...(slotDB?.regularGearSlotDefinitions ?? []),
		];

		const unique = Array.from(
			new Set(sdefs.map((s) => s.slot)),
		) as GearSlot[];

		allSlots = defaultOrder.filter(
			(s) => unique.includes(s) as boolean,
		);
		if (!allSlots.length) allSlots = unique;

		const gearRoot = gamepack["Gear"] as GearRoot;
		gearItems = expandGear(gearRoot?.Gear ?? [], lang);

		const firstWithItems = allSlots.find(
			(s) => (itemsBySlot[s]?.length ?? 0) > 0,
		);
		if (firstWithItems) selectedSlot = firstWithItems;
	});
</script>

<div class="grid gap-4 xl:grid-cols-3">
	<div class="xl:col-span-1">
		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<h3 class="card-title">Gear</h3>
				<p class="text-sm opacity-70">
					Click a slot to browse and equip items.
					Hover to see details.
				</p>
				<div class="mt-4 grid grid-cols-3 gap-3">
					{#each allSlots as s}
						<div
							role="button"
							tabindex="0"
							aria-label={slotLabel[
								s
							]}
							class={`relative  aspect-square rounded-box border flex items-center justify-center ${selectedSlot === s ? "ring ring-primary ring-offset-2" : "border-base-300"} bg-base-200 hover:bg-base-300 transition`}
							onkeydown={(e) => {
								if (
									e.key ===
										"Enter" ||
									e.key ===
										" "
								) {
									selectedSlot =
										s;
									e.preventDefault();
								}
							}}
							onclick={() =>
								(selectedSlot =
									s)}
						>
							{#if equipped[s]?.sprite}
								<img
									src={spriteUrl(
										equipped[
											s
										]
											?.sprite,
									)}
									alt={equipped[
										s
									]?.name}
									class="h-12 w-12 object-contain drop-shadow"
								/>
							{:else}
								<span
									class="text-xs opacity-60 text-center px-1"
									>{slotLabel[
										s
									]}</span
								>
							{/if}
							<div
								class="tooltip absolute inset-0"
								data-tip={tooltipText(
									equipped[
										s
									],
								)}
							></div>
							{#if equipped[s]}
								<span
									class="badge badge-primary badge-sm absolute -top-1 -right-1"
									>T{equipped[
										s
									]!
										.tier}</span
								>
								<button
									class="btn btn-ghost btn-xs absolute -bottom-1 right-1"
									onclick={() =>
										unequip(
											s,
										)}
									aria-label={`Unequip ${slotLabel[s]}`}
									title="Unequip"
									>✕</button
								>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
	<div class="xl:col-span-2">
		<div class="card bg-base-100 shadow">
			<div class="card-body">
				<div
					class="flex items-center justify-between gap-3"
				>
					<h3 class="card-title">
						{slotLabel[selectedSlot]} Items
					</h3>
					<input
						class="input input-bordered input-sm w-56"
						placeholder="Search…"
						bind:value={search}
					/>
				</div>
				{#if (itemsBySlot[selectedSlot]?.length ?? 0) === 0}
					<p class="mt-4 opacity-70">
						No items available for this
						slot.
					</p>
				{:else}
					<div
						class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
					>
						{#each (itemsBySlot[selectedSlot] ?? []).filter( (i) => matches(i, search), ) as item}
							<div
								class="card bg-base-200 hover:bg-base-300 transition cursor-pointer"
								tabindex="0"
								onkeydown={(
									e,
								) => {
									if (
										e.key ===
											"Enter" ||
										e.key ===
											" "
									) {
										equip(
											item,
										);
										e.preventDefault();
									}
								}}
								onclick={() =>
									equip(
										item,
									)}
								role="button"
								aria-label={`Equip ${item.name}`}
							>
								<div
									class="card-body p-3 gap-2"
								>
									<div
										class="flex items-center gap-2"
									>
										{#if item.sprite}
											<img
												src={spriteUrl(
													item.sprite,
												)}
												alt={item.name}
												class="h-10 w-10 object-contain drop-shadow"
											/>
										{:else}
											<div
												class="h-10 w-10 rounded bg-base-300 flex items-center justify-center text-xs"
											>
												N/A
											</div>
										{/if}
										<div
											class="min-w-0"
										>
											<div
												class="font-medium truncate"
											>
												{item.name}
											</div>
											<div
												class="text-xs opacity-70"
											>
												T{item.tier}
												·
												{prettySlot(
													item.slot,
												)}
											</div>
										</div>
									</div>

									<!-- stat lines -->
									<ul
										class="text-xs mt-1 space-y-1"
									>
										{#each item.mods as m}
											<li
												class="badge badge-ghost"
											>
												{fmtValue(
													m,
												)}
											</li>
										{/each}
										{#if item.mods.length === 0}
											<li
												class="opacity-60"
											>
												No
												modifiers
											</li>
										{/if}
									</ul>

									<!-- tooltip (rich) -->
									<div
										class="tooltip tooltip-bottom"
										data-tip={tooltipText(
											item,
										)}
									></div>

									<div
										class="mt-1 flex items-center gap-2 text-[11px] opacity-70"
									>
										{#if item.sellingValue}<span
												>Sell:
												{item.sellingValue}</span
											>{/if}
										{#if item.gearShopCost}<span
												>Shop:
												{item.gearShopCost}</span
											>{/if}
										{#if item.blessingPrice}<span
												>Bless:
												{item.blessingPrice}</span
											>{/if}
									</div>

									<div
										class="mt-1"
									>
										<button
											class="btn btn-primary btn-sm w-full"
											>Equip</button
										>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* keep tooltip body multiline */
	.tooltip[data-tip]::before {
		white-space: pre-line;
	}
</style>

<script lang="ts">
	import { useEquipped } from "$lib/context/equipped.svelte";
	import type { StatsHelper } from "$lib/hellclock/stats";
	import {
		GearsHelper,
		type GearItem,
		type GearSlot,
		type StatMod,
	} from "$lib/hellclock/gears";
	import { translate } from "$lib/hellclock/lang";
	import { getContext, onMount } from "svelte";
	import { formatStatModNumber } from "$lib/hellclock/formats";

	const {
		equipped,
		set: setEquipped,
		unset: unsetEquipped,
	} = useEquipped();

	const statsHelper = getContext<StatsHelper>("statsHelper");
	const gearsHelper = getContext<GearsHelper>("gearsHelper");
	const lang = getContext<string>("lang") || "en";

	let allSlots = $state<GearSlot[]>([]);
	let slotLabel = $derived.by<Record<GearSlot, string>>(() => {
		const labels: Partial<Record<GearSlot, string>> = {};
		for (const s of allSlots) {
			let slotNameKey = gearsHelper.getGearSlotDefinition(
				s,
				true,
			)?.slotNameKey;
			if (!slotNameKey) {
				console.warn(
					`Missing slot definition for ${s}`,
				);
				continue;
			}
			let translatedName = translate(slotNameKey, lang);
			labels[s] = translatedName || prettySlot(s);
		}
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
					translate(
						a.localizedName,
						lang,
					).localeCompare(
						translate(
							b.localizedName,
							lang,
						),
					),
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
		const statDefinition =
			statsHelper.getStatByName(eStatDefinition);
		if (!statDefinition) {
			return `${value} ${eStatDefinition}`;
		}
		return `${formatStatModNumber(value, statDefinition.eStatFormat, modifierType, 1, 0, 1)} ${statsHelper.getLabelForStat(eStatDefinition, lang)}`;
	}

	function tooltipText(item?: GearItem): string {
		if (!item) return "Empty";
		const lines = [
			`${translate(item.localizedName, lang)} (T${item.tier})`,
			...item.mods.map(fmtValue),
		];
		return lines.join("\n");
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
			translate(i.localizedName, lang)
				.toLowerCase()
				.includes(q) ||
			i.mods.some(
				(m) =>
					statsHelper
						.getLabelForStat(
							m.eStatDefinition,
							lang,
						)
						.toLowerCase()
						.includes(q) ||
					m.eStatDefinition
						.toLowerCase()
						.includes(q),
			)
		);
	}

	function parseRGBA01ToCss(rgbaStr: string | undefined): string {
		if (!rgbaStr) return "rgba(0,0,0,1)";
		const nums = rgbaStr
			.replace(/rgba?\s*\(|\)/gi, "")
			.split(",")
			.map((s) => parseFloat(s.trim()));

		let [r, g, b, a] = nums;
		r = Math.round((r ?? 0) * 255);
		g = Math.round((g ?? 0) * 255);
		b = Math.round((b ?? 0) * 255);
		return `rgba(${r},${g},${b},${a ?? 1})`;
	}

	onMount(() => {
		const sdefs = gearsHelper.getGearSlotsDefinitions(true);
		const unique = Array.from(
			new Set(sdefs.map((s) => s.slot)),
		) as GearSlot[];

		allSlots = defaultOrder.filter(
			(s) => unique.includes(s) as boolean,
		);
		if (!allSlots.length) allSlots = unique;

		gearItems = gearsHelper.getGearItems(true);

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
									alt={translate(
										equipped[
											s
										]
											?.localizedName,
										lang,
									)}
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
								class="card bg-base-200 hover:bg-base-300 transition border-2 border-[var(--color)]"
								style={`--color: ${parseRGBA01ToCss(item.color)}`}
								aria-label={`Equip ${translate(item.localizedName, lang)}`}
							>
								<div
									class="card-body p-3 gap-2 flex"
								>
									<div
										class="flex items-center gap-2"
									>
										{#if item.sprite}
											<img
												src={spriteUrl(
													item.sprite,
												)}
												alt={translate(
													item.localizedName,
													lang,
												)}
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
												class="font-medium truncate text-[var(--color)]"
												style={parseRGBA01ToCss(item.color)}
											>
												{translate(
													item.localizedName,
													lang,
												)}
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
										class="text-xs mt-1 space-y-1 flex flex-col grow"
									>
										{#each item.mods as m}
											<li
												class="badge badge-soft badge-accent truncate"
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
											onclick={() =>
												equip(
													item,
												)}
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

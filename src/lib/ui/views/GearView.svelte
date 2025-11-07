<script lang="ts">
	import { useEquipped, ESlotsType } from '$lib/context/equipped.svelte';
	import type { GearSlot } from '$lib/hellclock/gears';
	import GearSlots from '$lib/ui/GearSlots.svelte';

	let {
		onSlotClicked
	} = $props<{
		onSlotClicked: (slot: GearSlot, isBlessedGear: boolean, remove?: boolean) => void;
	}>();

	const blessedSlots = useEquipped(ESlotsType.BlessedGear);
	const trinketSlots = useEquipped(ESlotsType.TrinkedGear);

	function handleBlessedSlotClick(blessedGear: boolean, slot: GearSlot, remove: boolean) {
		onSlotClicked(slot, blessedGear, remove);
	}

	function handleTrinketSlotClick(blessedGear: boolean, slot: GearSlot, remove: boolean) {
		onSlotClicked(slot, blessedGear, remove);
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold">Gear Management</h1>
			<p class="text-sm opacity-70 mt-1">Equip and manage your blessed and trinket gear</p>
		</div>
		<div class="flex gap-2">
			<button class="btn btn-outline btn-sm">Clear All</button>
			<button class="btn btn-primary btn-sm">Auto-Equip Best</button>
		</div>
	</div>

	<!-- Gear Grid -->
	<div class="flex flex-wrap gap-6">
		<!-- Blessed Gear -->
		<div class="card bg-base-100 border border-base-300 shadow-lg w-[300px]">
			<div class="card-body">
				<h2 class="card-title text-lg mb-4">
					<span class="text-xl">✨</span>
					Blessed Gear
					<span class="badge badge-primary ml-auto">
						{Object.values(blessedSlots.equipped).filter((i) => i).length}/{Object.keys(
							blessedSlots.equipped
						).length}
					</span>
				</h2>
				<GearSlots
					blessedGear={true}
					equipped={blessedSlots.equipped}
					onSlotClicked={handleBlessedSlotClick}
				/>
			</div>
		</div>

		<!-- Trinket Gear -->
		<div class="card bg-base-100 border border-base-300 shadow-lg w-[300px]">
			<div class="card-body">
				<h2 class="card-title text-lg mb-4">
					<span class="text-xl">🎯</span>
					Trinket Gear
					<span class="badge badge-secondary ml-auto">
						{Object.values(trinketSlots.equipped).filter((i) => i).length}/{Object.keys(
							trinketSlots.equipped
						).length}
					</span>
				</h2>
				<GearSlots
					blessedGear={false}
					equipped={trinketSlots.equipped}
					onSlotClicked={handleTrinketSlotClick}
				/>
			</div>
		</div>
	</div>

	<!-- Info Card -->
	<div class="alert alert-info">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			class="stroke-current shrink-0 w-6 h-6"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
		<span>Click on a gear slot to open the gear selector and equip items.</span>
	</div>
</div>

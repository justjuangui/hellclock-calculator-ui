<script lang="ts">
	import { useRelicInventory } from '$lib/context/relicequipped.svelte';
	import RelicInventory from '$lib/ui/RelicInventory.svelte';

	let {
		onRelicSlotClicked
	} = $props<{
		onRelicSlotClicked: (x: number, y: number, availableSpace: { width: number; height: number }) => void;
	}>();

	const relicInventory = useRelicInventory();

	// Count equipped relics
	const equippedCount = $derived(relicInventory.relics.size);
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold">Relic Inventory</h1>
			<p class="text-sm opacity-70 mt-1">Manage your relic inventory grid (7x6 slots)</p>
		</div>
		<div class="flex gap-2">
			<button
				class="btn btn-outline btn-sm"
				onclick={() => relicInventory.clear()}
				disabled={equippedCount === 0}
			>
				Clear All Relics
			</button>
			<div class="badge badge-lg badge-primary gap-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					class="inline-block w-4 h-4 stroke-current"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				{equippedCount}/42 Slots Used
			</div>
		</div>
	</div>

	<!-- Relic Inventory -->
	<RelicInventory {onRelicSlotClicked} />

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
		<span
			>Click on an empty slot to place a relic. Relics occupy multiple slots based on their size.</span
		>
	</div>
</div>

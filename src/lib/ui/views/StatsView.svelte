<script lang="ts">
	import DisplayStats from '$lib/ui/DisplayStats.svelte';
	import DisplayActiveStatuses from '$lib/ui/DisplayActiveStatuses.svelte';

	// Props for stat explainer modal
	let {
		onOpenExplain = $bindable()
	} = $props<{
		onOpenExplain?: (stat: string) => void;
	}>();

	function handleOpenExplain(stat: string) {
		onOpenExplain?.(stat);
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold">Detailed Statistics</h1>
			<p class="text-sm opacity-70 mt-1">All character stats and active effects</p>
		</div>
	</div>

	<!-- Stats Content - Responsive Layout -->
	<div class="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
		<!-- Main Stats Panel -->
		<DisplayStats openExplain={handleOpenExplain} />

		<!-- Active Statuses Sidebar -->
		<div class="card bg-base-100 border border-base-300 shadow-lg">
			<div class="card-body">
				<h2 class="card-title text-lg mb-4">Active Effects</h2>
				<DisplayActiveStatuses />
			</div>
		</div>
	</div>
</div>

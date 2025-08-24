<script lang="ts">
	import "../app.css";
	import { onMount, setContext } from "svelte";
	import AppNavbar from "$lib/ui/AppNavbar.svelte";
	import { Engine } from "$lib/engine";
	import type { GamePack } from "$lib/engine/types";
	import { loadGamePack } from "$lib/engine/assets";
	import { providedEquipped } from "$lib/context/equipped.svelte";
	import { StatsHelper, type StatsRoot } from "$lib/hellclock/stats";

	providedEquipped();

	// runes state
	let ready = $state(false);
	let progress = $state(0);
	let label = $state("Starting…");
	let error = $state<string | null>(null);
	let pack = $state<GamePack | null>(null);
	let engine = $state<Engine | null>(null);
	let statsHelper = $state<StatsHelper | null>(null);

	$effect(() => {
		setContext("gamepack", pack);
		setContext("engine", engine);
		setContext("statsHelper", statsHelper);
		if (statsHelper && engine && pack) {
			ready = true;
		}
	});

	async function boot() {
		try {
			label = "Spinning up engine…";
			engine = new Engine();

			await engine.onceReady();

			label = "Downloading assets…";
			progress = 5;

			pack = await loadGamePack((pct, lbl) => {
				progress = pct;
				label = lbl;
			});

			// send to worker
			label = "Loading pack";
			let filePackDefinition = $state.snapshot(
				pack["hellclock-pack"],
			) as any;
			const res = await engine.loadPack(filePackDefinition);
			if (res) {
				error = `${(res as any).error}`;
				return;
			}

			label = "Loading StatsHelper";
			statsHelper = new StatsHelper(
				pack["Stats"] as StatsRoot,
			);

			label = "Ready";
			progress = 100;
		} catch (e: any) {
			error = `${String(e?.message ?? e)}`;
		}
	}

	onMount(boot);
	let { children } = $props();
</script>

<div data-theme="dark" class="min-h-screen bg-base-200">
	{#if !ready || error}
		<div class="min-h-screen flex items-center justify-center p-4">
			<div class="card w-full max-w-md bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title">
						Loading Hell Clock…
					</h2>
					<p class="opacity-70">
						{label}
					</p>
					{#if error}
						<div
							class="alert alert-error mt-2"
						>
							<span>{error}</span>
						</div>
						<button
							class="btn btn-primary mt-4"
							onclick={() =>
								location.reload()}
							>Retry</button
						>
					{:else}
						<progress
							class="progress progress-primary w-full"
							value={progress}
							max="100"
						></progress>
						<div
							class="text-right text-xs opacity-50"
						>
							{progress}%
						</div>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class="container mx-auto p-4">
			<AppNavbar />
			<div class="mt-4">
				{@render children?.()}
			</div>
		</div>
	{/if}
</div>

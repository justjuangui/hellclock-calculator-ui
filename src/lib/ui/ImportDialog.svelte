<script lang="ts">
	import { getContext } from "svelte";
	import type { SkillsHelper } from "$lib/hellclock/skills";
	import type { RelicsHelper } from "$lib/hellclock/relics";
	import type { ConstellationsHelper } from "$lib/hellclock/constellations";
	import type { GearsHelper } from "$lib/hellclock/gears";
	import { useSkillEquipped } from "$lib/context/skillequipped.svelte";
	import { useRelicInventory } from "$lib/context/relicequipped.svelte";
	import { useConstellationEquipped } from "$lib/context/constellationequipped.svelte";
	import { useEquipped, ESlotsType } from "$lib/context/equipped.svelte";
	import {
		ImportOrchestrator,
		type ImportPreview,
		type RelicLoadoutSummary,
		type GearLoadoutSummary,
		type ImportResult,
	} from "$lib/import";

	// Get helpers from context
	const skillsHelper = getContext<SkillsHelper>("skillsHelper");
	const relicsHelper = getContext<RelicsHelper>("relicsHelper");
	const constellationsHelper = getContext<ConstellationsHelper>("constellationsHelper");
	const gearsHelper = getContext<GearsHelper>("gearsHelper");

	// Get context APIs
	const skillApi = useSkillEquipped();
	const relicApi = useRelicInventory();
	const constellationApi = useConstellationEquipped();
	const gearApi = useEquipped(ESlotsType.BlessedGear);

	// Dialog ref
	let dialog: HTMLDialogElement;

	// State
	let saveData: unknown = $state(null);
	let fileName = $state("");
	let preview: ImportPreview | null = $state(null);
	let loadouts: RelicLoadoutSummary[] = $state([]);
	let gearLoadouts: GearLoadoutSummary[] = $state([]);

	// Import options
	let importSkills = $state(true);
	let importRelics = $state(true);
	let selectedLoadoutIndex = $state(0);
	let importConstellations = $state(true);
	let importGear = $state(true);
	let selectedGearLoadoutIndex = $state(0);

	// Result state
	let importing = $state(false);
	let importResult: ImportResult | null = $state(null);

	// Create orchestrator
	let orchestrator: ImportOrchestrator | null = $state(null);

	$effect(() => {
		if (skillsHelper && relicsHelper && constellationsHelper && gearsHelper) {
			orchestrator = new ImportOrchestrator(skillsHelper, relicsHelper, constellationsHelper, gearsHelper);
		}
	});

	// Public methods
	export function open() {
		reset();
		dialog?.showModal();
	}

	export function close() {
		dialog?.close();
		reset();
	}

	function reset() {
		saveData = null;
		fileName = "";
		preview = null;
		loadouts = [];
		gearLoadouts = [];
		importSkills = true;
		importRelics = true;
		selectedLoadoutIndex = 0;
		importConstellations = true;
		importGear = true;
		selectedGearLoadoutIndex = 0;
		importing = false;
		importResult = null;
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file || !orchestrator) return;

		fileName = file.name;
		importResult = null;

		try {
			const text = await file.text();
			saveData = JSON.parse(text);

			// Get preview
			preview = orchestrator.preview(saveData);
			loadouts = preview.relicLoadouts;
			gearLoadouts = preview.gearLoadouts;

			// Default to current in-game loadout for relics
			const currentLoadout = loadouts.find((l) => l.isCurrentInGame);
			selectedLoadoutIndex = currentLoadout?.index ?? 0;

			// Default to current in-game loadout for gear
			const currentGearLoadout = gearLoadouts.find((l) => l.isCurrentInGame);
			selectedGearLoadoutIndex = currentGearLoadout?.index ?? 0;
		} catch (err) {
			preview = {
				skills: [],
				relicLoadouts: [],
				gearLoadouts: [],
				constellations: [],
				errors: [
					{
						system: "skills",
						message: `Failed to parse file: ${err instanceof Error ? err.message : "Unknown error"}`,
					},
				],
				warnings: [],
			};
		}
	}

	async function handleImport() {
		if (!orchestrator || !saveData) return;

		importing = true;
		importResult = null;

		try {
			importResult = await orchestrator.import(
				saveData,
				{
					skills: importSkills,
					relics: importRelics,
					relicLoadoutIndex: selectedLoadoutIndex,
					constellations: importConstellations,
					gear: importGear,
					gearLoadoutIndex: selectedGearLoadoutIndex,
				},
				{
					skillApi,
					relicApi,
					constellationApi,
					gearApi,
				},
			);

			// If successful with no errors, close after a short delay
			if (importResult.success && importResult.errors.length === 0) {
				setTimeout(() => {
					close();
				}, 1500);
			}
		} catch (err) {
			importResult = {
				success: false,
				imported: { skills: 0, relics: 0, constellations: 0, gear: 0 },
				errors: [
					{
						system: "skills",
						message: `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
					},
				],
				warnings: [],
			};
		} finally {
			importing = false;
		}
	}

	// Computed values for display
	const selectedLoadout = $derived(loadouts[selectedLoadoutIndex]);
	const selectedGearLoadout = $derived(gearLoadouts[selectedGearLoadoutIndex]);
	const hasErrors = $derived((preview?.errors.length ?? 0) > 0 || (importResult?.errors.length ?? 0) > 0);
	const canImport = $derived(
		saveData !== null &&
			!importing &&
			(importSkills || importRelics || importConstellations || importGear) &&
			!hasErrors,
	);
</script>

<dialog bind:this={dialog} class="modal">
	<div class="modal-box max-w-lg">
		<h3 class="font-bold text-lg mb-4">Import Build from Save File</h3>

		<!-- File Input -->
		<div class="form-control mb-4">
			<label class="label">
				<span class="label-text">Select PlayerSave0.json</span>
			</label>
			<input
				type="file"
				accept=".json"
				class="file-input file-input-bordered w-full"
				onchange={handleFileSelect}
			/>
			{#if fileName}
				<label class="label">
					<span class="label-text-alt text-success">{fileName}</span>
				</label>
			{/if}
		</div>

		{#if preview}
			<!-- Import Options -->
			<div class="divider">Import Options</div>

			<div class="form-control flex flex-col gap-2">
				<!-- Gear -->
				<label class="label cursor-pointer justify-start gap-3">
					<input
						type="checkbox"
						class="checkbox checkbox-primary"
						bind:checked={importGear}
						disabled={gearLoadouts.every((l) => l.gearCount === 0)}
					/>
					<span class="label-text">Import Blessed Gear</span>
				</label>

				{#if importGear && gearLoadouts.length > 0}
					<div class="ml-8 mt-2 mb-2">
						<span class="label-text text-sm opacity-70">Select Loadout:</span>
						<div class="flex flex-wrap gap-2 mt-1">
							{#each gearLoadouts as loadout}
								<button
									class="btn btn-sm"
									class:btn-primary={selectedGearLoadoutIndex === loadout.index}
									class:btn-outline={selectedGearLoadoutIndex !== loadout.index}
									onclick={() => (selectedGearLoadoutIndex = loadout.index)}
								>
									Loadout {loadout.index + 1}
									<span class="badge badge-xs ml-1">{loadout.gearCount}</span>
									{#if loadout.isCurrentInGame}
										<span class="badge badge-xs badge-success ml-1">current</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Skills -->
				<label class="label cursor-pointer justify-start gap-3">
					<input
						type="checkbox"
						class="checkbox checkbox-primary"
						bind:checked={importSkills}
						disabled={preview.skills.length === 0}
					/>
					<span class="label-text">
						Import Skills
						<span class="badge badge-sm ml-2">{preview.skills.length} equipped</span>
					</span>
				</label>

				<!-- Relics -->
				<label class="label cursor-pointer justify-start gap-3">
					<input
						type="checkbox"
						class="checkbox checkbox-primary"
						bind:checked={importRelics}
						disabled={loadouts.every((l) => l.relicCount === 0)}
					/>
					<span class="label-text">Import Relics</span>
				</label>

				{#if importRelics && loadouts.length > 0}
					<div class="ml-8 mt-2 mb-2">
						<span class="label-text text-sm opacity-70">Select Loadout:</span>
						<div class="flex flex-wrap gap-2 mt-1">
							{#each loadouts as loadout}
								<button
									class="btn btn-sm"
									class:btn-primary={selectedLoadoutIndex === loadout.index}
									class:btn-outline={selectedLoadoutIndex !== loadout.index}
									onclick={() => (selectedLoadoutIndex = loadout.index)}
								>
									Loadout {loadout.index + 1}
									<span class="badge badge-xs ml-1">{loadout.relicCount}</span>
									{#if loadout.isCurrentInGame}
										<span class="badge badge-xs badge-success ml-1">current</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Constellations -->
				<label class="label cursor-pointer justify-start gap-3">
					<input
						type="checkbox"
						class="checkbox checkbox-primary"
						bind:checked={importConstellations}
						disabled={preview.constellations.length === 0}
					/>
					<span class="label-text">
						Import Constellations
						<span class="badge badge-sm ml-2">{preview.constellations.length} nodes</span>
					</span>
				</label>
			</div>

			<!-- Preview Summary -->
			<div class="divider">Summary</div>

			<div class="text-sm space-y-1">
				{#if importGear && selectedGearLoadout}
					<p>
						<span class="font-semibold">Gear:</span>
						{selectedGearLoadout.gearCount} items from Loadout {selectedGearLoadout.index + 1}
					</p>
				{/if}
				{#if importSkills}
					<p>
						<span class="font-semibold">Skills:</span>
						{preview.skills.length} equipped
					</p>
				{/if}
				{#if importRelics && selectedLoadout}
					<p>
						<span class="font-semibold">Relics:</span>
						{selectedLoadout.relicCount} items from Loadout {selectedLoadout.index + 1}
					</p>
				{/if}
				{#if importConstellations}
					<p>
						<span class="font-semibold">Constellations:</span>
						{preview.constellations.length} allocated nodes
					</p>
				{/if}
			</div>

			<!-- Errors & Warnings -->
			{#if preview.errors.length > 0}
				<div class="alert alert-error mt-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="stroke-current shrink-0 h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<div>
						<h4 class="font-bold">Validation Errors</h4>
						{#each preview.errors as error}
							<p class="text-sm">{error.message}</p>
						{/each}
					</div>
				</div>
			{/if}

			{#if preview.warnings.length > 0}
				<div class="alert alert-warning mt-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="stroke-current shrink-0 h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
					<div>
						<h4 class="font-bold">Warnings</h4>
						{#each preview.warnings as warning}
							<p class="text-sm">{warning.message}</p>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

		<!-- Import Result -->
		{#if importResult}
			{#if importResult.success}
				<div class="alert alert-success mt-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="stroke-current shrink-0 h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<div>
						<h4 class="font-bold">Import Successful!</h4>
						<p class="text-sm">
							Imported {importResult.imported.skills} skills,
							{importResult.imported.relics} relics,
							{importResult.imported.constellations} constellation nodes,
							{importResult.imported.gear} gear items
						</p>
					</div>
				</div>
			{:else}
				<div class="alert alert-error mt-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="stroke-current shrink-0 h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<div>
						<h4 class="font-bold">Import Failed</h4>
						{#each importResult.errors as error}
							<p class="text-sm">{error.message}</p>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

		<!-- Actions -->
		<div class="modal-action">
			<button class="btn btn-primary" onclick={handleImport} disabled={!canImport}>
				{#if importing}
					<span class="loading loading-spinner loading-sm"></span>
					Importing...
				{:else}
					Import Selected
				{/if}
			</button>
			<button class="btn" onclick={close}>Cancel</button>
		</div>
	</div>

	<!-- Backdrop click to close -->
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>

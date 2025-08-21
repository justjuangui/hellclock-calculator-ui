<script lang="ts">
	import { getContext, onMount } from "svelte";
	import type { Engine } from "$lib/engine";
	import type { GamePack, XNode } from "$lib/engine/types";
	import XNodeTree from "$lib/ui/XNodeTree.svelte";
	const engine = getContext<Engine>("engine");
	const gamepack = getContext<GamePack>("gamepack");

	type PlayerSheet = {
		displayedStats: Partial<
			Record<
				| "DamageLabel"
				| "DefenseLabel"
				| "VitalityLabel"
				| "OtherLabel",
				string[]
			>
		>;
	} & Record<string, unknown>;

	let selectedGroup = $state<
		"DamageLabel" | "DefenseLabel" | "VitalityLabel" | "OtherLabel"
	>("DamageLabel");

	const groupMeta: Array<{
		key:
			| "DamageLabel"
			| "DefenseLabel"
			| "VitalityLabel"
			| "OtherLabel";
		label: string;
	}> = [
		{ key: "DamageLabel", label: "Damage" },
		{ key: "DefenseLabel", label: "Defense" },
		{ key: "VitalityLabel", label: "Vitality" },
		{ key: "OtherLabel", label: "Other" },
	];

	let actor = $state<Record<string, unknown> | null>(null);
	let sheet = $state<PlayerSheet | null>(null);
	let evalResult = $state<any>(null);
	let error = $state<string | null>(null);
	let loading = $state(true);

	let showExplain = $state(false);
	let explainLoading = $state(false);
	let explainError = $state<string | null>(null);
	let explainTitle = $state<string>("");
	let explainNode = $state<XNode | null>(null);

	function hasGroup(key: typeof selectedGroup): boolean {
		return !!sheet?.displayedStats?.[key]?.length;
	}

	function getStatFromEval(res: any, name: string): number | null {
		if (!res) return null;
		const candidates = [
			["values", `${name}.final`],
			["values", name],
			[null, `${name}.final`],
			[null, name],
			["stats", name, "final"],
			["stats", name, "value"],
		];
		for (const path of candidates) {
			let cur = res;
			for (const seg of path) {
				if (seg === null) continue;
				if (
					cur &&
					typeof cur === "object" &&
					seg in cur
				)
					cur = cur[seg];
				else {
					cur = undefined;
					break;
				}
			}
			if (typeof cur === "number") return cur;
		}
		return null;
	}

	function fmt(v: number | null, stat?: string): string {
		if (v === null) return "—";
		if (/^ChanceTo/.test(stat ?? "") && v >= 0 && v <= 1)
			return (v * 100).toFixed(1) + "%";
		return Number.isInteger(v)
			? String(v)
			: v.toFixed(3).replace(/\.?0+$/, "");
	}

	async function doEvaluate() {
		error = null;
		evalResult = null;
		loading = true;
		try {
			if (!engine) throw new Error("Engine not initialized");
			if (!actor || !sheet) {
				throw new Error(
					"Actor or PlayerSheet not loaded",
				);
			}

			let payload: any = {
				set: {},
				outputs: Object.values(
					sheet?.displayedStats ?? {},
				).flatMap((v): string[] =>
					Array.isArray(v)
						? v
						: typeof v === "string"
							? [v]
							: [],
				),
			};

			evalResult = await engine.eval(payload, {
				timeoutMs: 5000,
			});

			if (evalResult?.error) {
				error = String(evalResult.error);
				return;
			}
		} catch (e: any) {
			error = String(e?.message ?? e);
		} finally {
			loading = false;
		}
	}

	async function openExplain(stat: string) {
		explainTitle = stat;
		explainLoading = true;
		explainError = null;
		explainNode = null;
		showExplain = true;

		try {
			if (!engine) throw new Error("Engine not initialized");
			const res = (await engine.explain(stat, {
				timeoutMs: 5000,
			})) as any;

			console.debug("Explain result:", res);

			if (res?.error) {
				explainError = String(res.error);
				return;
			}

			explainNode = res as XNode;
		} catch (e: any) {
			explainError = String(e?.message ?? e);
		} finally {
			explainLoading = false;
		}
	}

	onMount(async () => {
		actor = gamepack["hellclock-actor"] as Record<
			string,
			unknown
		> | null;
		sheet = gamepack["Player Sheet"] as PlayerSheet | null;

		const firstWithItems = groupMeta.find(
			(g) => sheet?.displayedStats?.[g.key]?.length,
		);
		if (firstWithItems) selectedGroup = firstWithItems.key;
		await doEvaluate();
	});
</script>

<div class="grid gap-4 lg:grid-cols-2">
	<!-- Displayed Stats -->
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<div class="flex items-center justify-between gap-3">
				<h3 class="card-title">Displayed Stats</h3>
				<div
					role="tablist"
					class="tabs tabs-boxed tabs-sm"
				>
					{#each groupMeta as g}
						<button
							role="tab"
							class={`tab ${selectedGroup === g.key ? "tab-active" : ""} ${hasGroup(g.key) ? "" : "tab-disabled"}`}
							onclick={() => {
								if (
									hasGroup(
										g.key,
									)
								)
									selectedGroup =
										g.key;
							}}
							aria-selected={selectedGroup ===
								g.key}
							aria-disabled={!hasGroup(
								g.key,
							)}
							title={g.label}
						>
							{g.label}
						</button>
					{/each}
				</div>
			</div>
			{#if error}
				<div class="alert alert-error mt-3">
					<span>{error}</span>
				</div>
			{:else if loading}
				<div class="skeleton h-6 w-1/2 mb-2"></div>
				<div class="skeleton h-6 w-2/3 mb-2"></div>
				<div class="skeleton h-6 w-1/3 mb-2"></div>
			{:else if sheet?.displayedStats?.[selectedGroup]?.length}
				<div class="overflow-x-auto mt-2">
					<table class="table table-zebra">
						<thead>
							<tr>
								<th
									class="w-1/2"
									>Stat</th
								>
								<th>Value</th>
								<th
									class="w-10 text-right"
									>Explain</th
								>
							</tr>
						</thead>
						<tbody>
							{#each sheet.displayedStats[selectedGroup] ?? [] as stat}
								<tr>
									<td
										class="font-medium"
										>{stat}</td
									>
									<td
										>{fmt(
											getStatFromEval(
												evalResult,
												stat,
											),
											stat,
										)}</td
									>
									<td
										class="text-right"
									>
										<button
											aria-label="Explain {stat}"
											class="btn btn-ghost btn-xs"
											onclick={() =>
												openExplain(
													stat,
												)}
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												class="h-4 w-4"
												fill="none"
												stroke="currentColor"
												stroke-width="1.5"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z"
												/>
												<circle
													cx="12"
													cy="12"
													r="3.25"
												/>
											</svg>
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="opacity-70">
					No stats listed for this group.
				</p>
			{/if}
		</div>
	</div>

	<!-- Raw Engine Output (useful while integrating) -->
	<div class="card bg-base-100 shadow">
		<div class="card-body">
			<h3 class="card-title">Engine Output</h3>
			{#if loading}
				<div class="skeleton h-6 w-1/3 mb-2"></div>
				<div class="skeleton h-40 w-full"></div>
			{:else if evalResult}
				<pre
					class="bg-base-200 p-3 rounded-box text-xs overflow-x-auto">{JSON.stringify(
						evalResult,
						null,
						2,
					)}</pre>
			{:else if error}
				<p class="opacity-70">
					No output due to error.
				</p>
			{:else}
				<p class="opacity-70">No engine output yet.</p>
			{/if}
		</div>
	</div>
</div>

<dialog class="modal" open={showExplain}>
	<div class="modal-box max-w-4xl">
		<h3 class="font-bold text-lg flex items-center gap-2">
			Explain: {explainTitle}
		</h3>

		{#if explainLoading}
			<div class="mt-4 space-y-2">
				<div class="skeleton h-5 w-1/2"></div>
				<div class="skeleton h-5 w-2/3"></div>
				<div class="skeleton h-5 w-1/3"></div>
			</div>
		{:else if explainError}
			<div class="alert alert-error mt-4">
				<span>{explainError}</span>
			</div>
		{:else if explainNode}
			<div class="mt-4 overflow-y-auto max-h-96">
				<XNodeTree node={explainNode} />
			</div>
		{:else}
			<p class="mt-4 opacity-70">No explanation returned.</p>
		{/if}

		<div class="modal-action">
			<form method="dialog">
				<button
					class="btn"
					onclick={() => (showExplain = false)}
					>Close</button
				>
			</form>
		</div>
	</div>

	<form method="dialog" class="modal-backdrop">
		<button aria-label="Close" onclick={() => (showExplain = false)}
			>close</button
		>
	</form>
</dialog>

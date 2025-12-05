<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { ESingType, formatStatNumber } from "$lib/hellclock/formats";
  import type { StatsHelper } from "$lib/hellclock/stats";
  import { useEvaluationManager } from "$lib/context/evaluation.svelte";
  import type { GamePack } from "$lib/engine/types";

  interface Props {
    openExplain: (stat: string) => void;
  }
  const { openExplain }: Props = $props();

  const statsHelper = getContext<StatsHelper>("statsHelper");
  const gamepack = getContext<GamePack>("gamepack");
  const evaluationManager = useEvaluationManager();
  let selectedGroup = $state<
    "DamageLabel" | "DefenseLabel" | "VitalityLabel" | "OtherLabel"
  >("DamageLabel");

  const groupMeta: Array<{
    key: "DamageLabel" | "DefenseLabel" | "VitalityLabel" | "OtherLabel";
    label: string;
  }> = [
    { key: "DamageLabel", label: "Damage" },
    { key: "DefenseLabel", label: "Defense" },
    { key: "VitalityLabel", label: "Vitality" },
    { key: "OtherLabel", label: "Other" },
  ];

  // Get sheet from gamepack with proper typing
  const sheet = $derived(gamepack?.["Player Sheet"] as any);

  // Get current evaluation state
  const statEvaluation = $derived(evaluationManager.statEvaluation);
  const evalResult = $derived(statEvaluation.result);
  const loading = $derived(statEvaluation.loading);
  const error = $derived(statEvaluation.error);

  function hasGroup(key: typeof selectedGroup): boolean {
    return !!sheet?.displayedStats?.[key]?.length;
  }

  function getStatFromEval(res: any, name: string): number | null {
    if (!res) return null;
    return res[name];
  }

  function fmt(v: number | null, stat: string): string {
    if (v === null) return "-";

    const statDef = statsHelper.getStatByName(stat);
    if (!statDef) return String(v);
    const clampvalue = statsHelper.getValueForStat(stat, v);

    return formatStatNumber(clampvalue, statDef.eStatFormat, ESingType.Default);
  }
  onMount(() => {
    const firstWithItems = groupMeta.find(
      (g) => sheet?.displayedStats?.[g.key]?.length,
    );
    if (firstWithItems) selectedGroup = firstWithItems.key;
  });
</script>

<!-- Displayed Stats -->
<div class="card bg-base-100 border border-base-300 shadow-lg">
  <div class="card-body">
    <div class="flex items-center justify-between gap-2 mb-2">
      <h3 class="text-base font-semibold">Stats</h3>
      <div role="tablist" class="tabs tabs-border tabs-sm">
        {#each groupMeta as g, i (i)}
          <button
            role="tab"
            class={`tab ${selectedGroup === g.key ? "tab-active" : ""} ${hasGroup(g.key) ? "" : "tab-disabled"}`}
            onclick={() => {
              if (hasGroup(g.key)) selectedGroup = g.key;
            }}
            aria-selected={selectedGroup === g.key}
            aria-disabled={!hasGroup(g.key)}
            title={g.label}
          >
            {g.label}
          </button>
        {/each}
      </div>
    </div>
    {#if error}
      <div class="alert alert-error alert-sm">
        <span class="text-sm">{error}</span>
      </div>
    {:else if loading}
      <div class="space-y-1">
        <div class="skeleton h-4 w-1/2"></div>
        <div class="skeleton h-4 w-2/3"></div>
        <div class="skeleton h-4 w-1/3"></div>
      </div>
    {:else if sheet?.displayedStats?.[selectedGroup]?.length}
      <div class="space-y-1 mt-2">
        {#each sheet.displayedStats[selectedGroup] ?? [] as stat, i (i)}
          <div class="flex items-center justify-between py-1 px-2 rounded hover:bg-base-200 transition-colors group">
            <span class="text-sm font-medium">{statsHelper.getLabelForStat(stat)}</span>
            <div class="flex items-center gap-2">
              <span class="text-sm font-mono">{fmt(getStatFromEval(evalResult, stat), stat)}</span>
              <button
                aria-label="Explain {stat}"
                class="opacity-0 group-hover:opacity-100 p-1 hover:bg-base-100 rounded transition-all"
                onclick={() => openExplain(stat)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z"
                  />
                  <circle cx="12" cy="12" r="3.25" />
                </svg>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-sm opacity-70">No stats listed for this group.</p>
    {/if}
  </div>
</div>

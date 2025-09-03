<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { ESingType, formatStatNumber } from "$lib/hellclock/formats";
  import type { StatsHelper } from "$lib/hellclock/stats";

  const statsHelper = getContext<StatsHelper>("statsHelper");
  let { evalResult, loading, error, sheet, openExplain } = $props();
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
  function hasGroup(key: typeof selectedGroup): boolean {
    return !!sheet?.displayedStats?.[key]?.length;
  }

  function getStatFromEval(res: any, name: string): number | null {
    if (!res) return null;
    return res.values[name];
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
<div class="card bg-base-100 shadow">
  <div class="card-body">
    <div class="flex items-center justify-between gap-3">
      <h3 class="card-title">Displayed Stats</h3>
      <div role="tablist" class="tabs tabs-box tabs-sm">
        {#each groupMeta as g}
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
      <div class="alert alert-error mt-3">
        <span>{error}</span>
      </div>
    {:else if loading}
      <div class="skeleton h-6 w-1/2 mb-2"></div>
      <div class="skeleton h-6 w-2/3 mb-2"></div>
      <div class="skeleton h-6 w-1/3 mb-2"></div>
    {:else if sheet?.displayedStats?.[selectedGroup]?.length}
      <div class="overflow-x-auto mt-2">
        <table class="table table-zebra table-md">
          <thead>
            <tr>
              <th class="w-1/2">Stat</th>
              <th class="text-right">Value</th>
              <th class="w-10">Explain</th>
            </tr>
          </thead>
          <tbody>
            {#each sheet.displayedStats[selectedGroup] ?? [] as stat}
              <tr>
                <td class="font-medium">{statsHelper.getLabelForStat(stat)}</td>
                <td class="text-right"
                  >{fmt(getStatFromEval(evalResult, stat), stat)}</td
                >
                <td class="text-right">
                  <button
                    aria-label="Explain {stat}"
                    class="btn btn-ghost btn-xs"
                    onclick={() => openExplain(stat)}
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
                      <circle cx="12" cy="12" r="3.25" />
                    </svg>
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class="opacity-70">No stats listed for this group.</p>
    {/if}
  </div>
</div>

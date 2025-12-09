<script lang="ts">
  import type { PhaseInfo } from "./types";
  import ContributionTable from "./ContributionTable.svelte";
  import PhaseView from "./PhaseView.svelte";
  import { formatNumber } from "$lib/utils/phase-formatter";
  import { getContributionCount } from "./phase-parser";

  interface Props {
    phase: PhaseInfo;
    depth?: number;
    defaultExpanded?: boolean;
  }

  const { phase, depth = 0, defaultExpanded = true }: Props = $props();

  // Initial expanded state based on depth
  let expanded = $state(depth === 0 && defaultExpanded);
  const contribCount = $derived(getContributionCount(phase));
  const hasContent = $derived(
    phase.contributions.length > 0 || phase.nestedGroups.length > 0
  );
  // Count total nested phases across all groups
  const nestedGroupCount = $derived(phase.nestedGroups.length);
</script>

<div
  class="card bg-base-100 border border-base-300"
  style:margin-left="{depth * 0.75}rem"
>
  <!-- Phase Header -->
  <button
    class="w-full text-left hover:bg-base-200/50 transition-colors disabled:cursor-default"
    onclick={() => (expanded = !expanded)}
    disabled={!hasContent}
  >
    <div class="flex items-center justify-between p-3">
      <div class="flex items-center gap-2">
        {#if hasContent}
          <span
            class="transition-transform duration-200 {expanded ? 'rotate-90' : ''}"
          >
            <svg
              class="w-4 h-4 text-base-content/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        {:else}
          <span class="w-4"></span>
        {/if}
        <h4 class="text-sm font-semibold">{phase.displayName} Phase</h4>
        <span class="badge {phase.color} badge-sm font-mono">
          = {formatNumber(phase.value)}
        </span>
      </div>
      <div class="flex items-center gap-2">
        {#if nestedGroupCount > 0}
          <span class="badge badge-ghost badge-xs">
            {nestedGroupCount} {nestedGroupCount === 1 ? "group" : "groups"}
          </span>
        {/if}
        <span class="text-xs text-base-content/60">
          {contribCount}
          {contribCount === 1 ? "contribution" : "contributions"}
        </span>
      </div>
    </div>
  </button>

  <!-- Phase Content -->
  {#if expanded && hasContent}
    <div class="px-3 pb-3 space-y-3">
      <!-- Contributions Table -->
      {#if phase.contributions.length > 0}
        <ContributionTable
          contributions={phase.contributions}
          phaseType={phase.type}
        />
      {/if}

      <!-- Nested Groups (from group_total calls) -->
      {#if phase.nestedGroups.length > 0}
        {#each phase.nestedGroups as group, groupIndex (groupIndex)}
          <div class="space-y-2">
            <div class="text-xs font-semibold text-base-content/70 flex items-center gap-2">
              <svg
                class="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
              {group.source}
              <span class="font-mono font-normal">
                = {formatNumber(group.total)}
              </span>
            </div>
            {#each group.phases as nestedPhase (nestedPhase.id)}
              <PhaseView
                phase={nestedPhase}
                depth={depth + 1}
                defaultExpanded={false}
              />
            {/each}
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

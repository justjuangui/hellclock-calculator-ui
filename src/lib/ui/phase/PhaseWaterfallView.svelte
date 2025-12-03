<script lang="ts">
  import type { PhaseInfo } from "./types";
  import { getValueColorClass, formatNumber } from "$lib/utils/phase-formatter";
  import { getContributionCount } from "./phase-parser";

  interface Props {
    phases: PhaseInfo[];
  }

  const { phases }: Props = $props();

  let expandedPhases = $state<Record<string, boolean>>({});
  let expandedTemplates = $state<Record<string, boolean>>({});

  function togglePhase(phaseId: string) {
    expandedPhases[phaseId] = !expandedPhases[phaseId];
  }

  function toggleTemplate(templateKey: string) {
    expandedTemplates[templateKey] = !expandedTemplates[templateKey];
  }

  function formatMeta(
    meta: Record<string, string | number> | undefined
  ): Array<[string, string]> {
    if (!meta) return [];
    return Object.entries(meta)
      .filter(
        ([key]) =>
          !["contribution_count", "filter_group", "filter_layer", "filter_who"].includes(key)
      )
      .map(([key, value]) => [
        key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
        String(value),
      ]);
  }
</script>

<div class="space-y-3">
  {#if phases.length === 0}
    <div class="text-center py-8 text-base-content/60">
      <p class="text-sm">No phases found in this calculation.</p>
    </div>
  {:else}
    {#each phases as phase (phase.id)}
      {@const contribCount = getContributionCount(phase)}

      <div class="card bg-base-100 border border-base-300">
        <!-- Phase Header -->
        <button
          class="w-full text-left hover:bg-base-200/50 transition-colors"
          onclick={() => togglePhase(phase.id)}
        >
          <div class="flex items-center justify-between p-3">
            <div class="flex items-center gap-2">
              <span
                class="transition-transform duration-200 {expandedPhases[phase.id]
                  ? 'rotate-90'
                  : ''}"
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
              <h4 class="text-sm font-semibold">{phase.displayName} Phase</h4>
              <span class="badge {phase.color} badge-sm font-mono">
                = {formatNumber(phase.value)}
              </span>
            </div>
            <span class="text-xs text-base-content/60">
              {contribCount}
              {contribCount === 1 ? "contribution" : "contributions"}
            </span>
          </div>
        </button>

        <!-- Phase Contributions Table -->
        {#if expandedPhases[phase.id]}
          <div class="px-3 pb-3">
            {#if phase.contributions.length === 0}
              <div class="text-center py-4 text-base-content/50 text-xs">
                No contributions in this phase
              </div>
            {:else}
              <div class="overflow-x-auto">
                <table class="table table-xs">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th class="text-right">Value</th>
                      <th>Metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each phase.contributions as processed, i (i)}
                      {#if processed.isTemplateGroup}
                        <!-- Template Group Row -->
                        {@const templateKey = `${phase.id}-${processed.group.templateName}`}
                        <tr class="bg-base-200/50">
                          <td colspan="3" class="p-0">
                            <details
                              class="cursor-pointer"
                              open={expandedTemplates[templateKey]}
                            >
                              <summary
                                class="flex items-center justify-between p-2 hover:bg-base-200"
                                onclick={() => toggleTemplate(templateKey)}
                              >
                                <span class="flex items-center gap-2">
                                  <span class="badge badge-ghost badge-xs">Template</span>
                                  <span class="font-medium">
                                    {processed.group.displayName}
                                  </span>
                                  <span class="text-xs text-base-content/50">
                                    ({processed.group.contributions.length} items)
                                  </span>
                                </span>
                                <span
                                  class="badge badge-outline badge-sm font-mono {getValueColorClass(processed.group.totalValue)}"
                                >
                                  {processed.group.formattedTotal}
                                </span>
                              </summary>

                              <!-- Nested Table for Template Children -->
                              <table class="table table-xs ml-6 mt-1 mb-2">
                                <tbody>
                                  {#each processed.group.contributions as contrib, j (j)}
                                    <tr class="hover">
                                      <td class="pl-4">
                                        {contrib.displayName}
                                      </td>
                                      <td
                                        class="text-right font-mono {getValueColorClass(contrib.absoluteValue)}"
                                      >
                                        {contrib.formattedValue}
                                      </td>
                                      <td>
                                        <div class="flex flex-wrap gap-1">
                                          {#each formatMeta(contrib.meta) as [key, value] (key)}
                                            <span class="badge badge-ghost badge-xs">
                                              {key}: {value}
                                            </span>
                                          {/each}
                                        </div>
                                      </td>
                                    </tr>
                                  {/each}
                                </tbody>
                              </table>
                            </details>
                          </td>
                        </tr>
                      {:else}
                        <!-- Direct Contribution Row -->
                        <tr class="hover">
                          <td>{processed.contribution.displayName}</td>
                          <td
                            class="text-right font-mono {getValueColorClass(processed.contribution.absoluteValue)}"
                          >
                            {processed.contribution.formattedValue}
                          </td>
                          <td>
                            <div class="flex flex-wrap gap-1">
                              {#each formatMeta(processed.contribution.meta) as [key, value] (key)}
                                <span class="badge badge-ghost badge-xs">
                                  {key}: {value}
                                </span>
                              {/each}
                            </div>
                          </td>
                        </tr>
                      {/if}
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>

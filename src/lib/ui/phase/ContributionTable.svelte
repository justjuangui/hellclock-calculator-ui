<script lang="ts">
  import type { ProcessedContribution, ContributionInfo, TemplateGroup } from "./types";
  import { getValueColorClass } from "$lib/utils/phase-formatter";

  interface Props {
    contributions: ProcessedContribution[];
    phaseType: string;
    compact?: boolean;
  }

  const { contributions, phaseType, compact = false }: Props = $props();

  let expandedTemplates = $state<Record<string, boolean>>({});

  function toggleTemplate(key: string) {
    expandedTemplates[key] = !expandedTemplates[key];
  }

  function formatMetadataValue(value: unknown): string {
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return String(value);
    return String(value);
  }
</script>

<div class="overflow-x-auto">
  <table class="table table-xs">
    <thead>
      <tr>
        <th class="min-w-[120px]">Source</th>
        <th class="text-right w-24">Value</th>
        <th>Metadata</th>
      </tr>
    </thead>
    <tbody>
      {#each contributions as processed, i (i)}
        {#if processed.isTemplateGroup}
          <!-- Template Group Row -->
          {@const group = processed.group}
          {@const templateKey = `template-${i}-${group.templateName}`}
          <tr class="bg-base-200/50">
            <td colspan="3" class="p-0">
              <details
                class="cursor-pointer"
                bind:open={expandedTemplates[templateKey]}
              >
                <summary
                  class="flex items-center justify-between p-2 hover:bg-base-200"
                  onclick={() => toggleTemplate(templateKey)}
                >
                  <span class="flex items-center gap-2">
                    <span class="badge badge-ghost badge-xs">Template</span>
                    <span class="font-medium">{group.displayName}</span>
                    <span class="text-xs text-base-content/50">
                      ({group.contributions.length} items)
                    </span>
                    {#if group.aggregateFunction}
                      <span class="badge badge-outline badge-xs">
                        {group.aggregateFunction}
                      </span>
                    {/if}
                    {#if group.filterLayer}
                      <span class="badge badge-outline badge-xs">
                        layer:{group.filterLayer}
                      </span>
                    {/if}
                  </span>
                  <span
                    class="badge badge-outline badge-sm font-mono {getValueColorClass(group.totalValue)}"
                  >
                    {group.formattedTotal}
                  </span>
                </summary>

                <!-- Nested Table for Template Children -->
                <div class="ml-4 mr-2 mt-1 mb-2 border-l-2 border-base-300 pl-2">
                  <table class="table table-xs">
                    <tbody>
                      {#each group.contributions as contrib, j (j)}
                        {@render contributionRow(contrib, j, true)}
                      {/each}
                    </tbody>
                  </table>
                </div>
              </details>
            </td>
          </tr>
        {:else}
          <!-- Direct Contribution Row -->
          {@render contributionRow(processed.contribution, i, false)}
        {/if}
      {/each}
    </tbody>
  </table>
</div>

{#snippet contributionRow(contrib: ContributionInfo, index: number, nested: boolean)}
  <tr class="hover {nested ? 'bg-base-100' : ''}">
    <td class="{nested ? 'pl-2' : ''} font-medium">
      <div class="flex items-center gap-1">
        {#if contrib.isStart}
          <span class="badge badge-xs badge-ghost" title="Protected base value">
            ★
          </span>
        {/if}
        {contrib.displayName}
      </div>
    </td>
    <td class="text-right font-mono {getValueColorClass(contrib.originalValue)}">
      {contrib.formattedValue}
      {#if contrib.transformedValue !== undefined && contrib.transformedValue !== contrib.originalValue}
        <span class="text-xs text-base-content/50 block">
          (raw: {contrib.originalValue})
        </span>
      {/if}
    </td>
    <td>
      <div class="flex flex-wrap gap-1">
        {#each Object.entries(contrib.metadata) as [key, value] (key)}
          <span class="badge badge-ghost badge-xs" title="{key}: {formatMetadataValue(value)}">
            {key}: {formatMetadataValue(value)}
          </span>
        {/each}
      </div>
    </td>
  </tr>
{/snippet}

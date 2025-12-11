<script lang="ts">
  import type { SummarySection, SkillSelected, DefaultsConfig, RowConfig } from '$lib/hellclock/skillcard-types';
  import { resolveRowConfig } from '$lib/hellclock/skillcard-defaults';
  import { resolveValue } from '$lib/hellclock/skillcard-resolver';
  import { shouldShowRow } from '$lib/hellclock/skillcard-conditions';
  import { getValueClasses, getLabelClasses, getLabelStyle } from '$lib/hellclock/skillcard-styles';
  import { formatValue, applyPrefixSuffix } from '$lib/hellclock/skillcard-formats';

  interface Props {
    section: SummarySection;
    skill: SkillSelected;
    evaluationResult: Record<string, unknown>;
    globalDefaults?: DefaultsConfig;
    loading?: boolean;
    onOpenExplain?: (statId: string) => void;
  }

  const { section, skill, evaluationResult, globalDefaults, loading = false, onOpenExplain }: Props = $props();

  // Build full evaluation key for explain functionality
  function getFullStatId(row: RowConfig): string {
    if (row.valueType === 'evaluate') {
      return `skill_${skillId}_${row.value}`.replaceAll(' ', '');
    }
    return row.id;
  }

  const skillId = $derived(skill.skill.name);
  const columns = $derived(section.layout?.columns || 4);
  const gap = $derived(section.layout?.gap || 2);

  // Resolve all rows with merged defaults
  const resolvedRows = $derived(
    section.rows.map(row => ({
      original: row,
      resolved: resolveRowConfig(row, globalDefaults, section.defaults),
      value: resolveValue(row, skill, evaluationResult, skillId)
    }))
  );

  // Filter visible rows
  const visibleRows = $derived(
    resolvedRows.filter(({ resolved, value }) =>
      shouldShowRow(value, resolved.conditions)
    )
  );
</script>

<div
  class="grid bg-base-200/50 p-3"
  style="grid-template-columns: repeat({columns}, minmax(0, 1fr)); gap: {gap * 0.25}rem;"
>
  {#if loading}
    {#each Array(columns) as _, i (i)}
      <div class="text-center">
        <div class="skeleton h-3 w-12 mx-auto mb-1"></div>
        <div class="skeleton h-4 w-16 mx-auto"></div>
      </div>
    {/each}
  {:else}
    {#each visibleRows as { original, resolved, value } (resolved.id)}
      {@const formattedValue = applyPrefixSuffix(
        formatValue(value, resolved.format),
        resolved.prefix,
        resolved.suffix
      )}
      {@const valueClasses = getValueClasses(resolved.style)}
      {@const labelClasses = getLabelClasses(resolved.style)}
      {@const labelStyle = getLabelStyle(resolved.style)}
      {@const canExplain = onOpenExplain && original.valueType === 'evaluate'}

      <div class="text-center group">
        <div class={labelClasses} style={labelStyle}>
          {resolved.displayName || resolved.id}
        </div>
        <div class="flex items-center justify-center gap-1">
          <div class={valueClasses}>
            {formattedValue}
          </div>
          {#if canExplain}
            <button
              aria-label="Explain {resolved.displayName || resolved.id}"
              class="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-base-300 rounded transition-all"
              onclick={() => onOpenExplain(getFullStatId(original))}
              type="button"
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
          {/if}
        </div>
      </div>
    {/each}
  {/if}
</div>

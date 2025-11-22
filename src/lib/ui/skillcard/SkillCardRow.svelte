<script lang="ts">
  import type { ResolvedRowConfig } from '$lib/hellclock/skillcard-types';
  import { shouldShowRow } from '$lib/hellclock/skillcard-conditions';
  import { getValueClasses, getLabelClasses, getLabelStyle, getRowClasses } from '$lib/hellclock/skillcard-styles';
  import { formatValue, applyPrefixSuffix } from '$lib/hellclock/skillcard-formats';

  interface Props {
    row: ResolvedRowConfig;
    value: unknown;
    skillId: string;
    onOpenExplain?: (statId: string) => void;
  }

  const { row, value, skillId, onOpenExplain }: Props = $props();

  // Build full evaluation key for explain functionality
  function getFullStatId(): string {
    if (row.valueType === 'evaluate') {
      return `skill_${skillId}_${row.value}`.replaceAll(' ', '');
    }
    return row.id;
  }

  const isVisible = $derived(shouldShowRow(value, row.conditions));
  const formattedValue = $derived(
    applyPrefixSuffix(
      formatValue(value, row.format),
      row.prefix,
      row.suffix
    )
  );
  const valueClasses = $derived(getValueClasses(row.style));
  const labelClasses = $derived(getLabelClasses(row.style));
  const labelStyle = $derived(getLabelStyle(row.style));
  const rowClasses = $derived(getRowClasses(row.style));
</script>

{#if isVisible}
  <div class="flex items-center justify-between text-sm hover:bg-base-200 px-2 py-1 rounded transition-colors group {rowClasses}">
    <span class={labelClasses} style={labelStyle}>
      {row.displayName || row.id}
    </span>
    <div class="flex items-center gap-2">
      <span class={valueClasses}>
        {formattedValue}
      </span>
      {#if onOpenExplain && row.valueType === 'evaluate'}
        <button
          aria-label="Explain {row.displayName || row.id}"
          class="opacity-0 group-hover:opacity-100 p-1 hover:bg-base-300 rounded transition-all"
          onclick={() => onOpenExplain(getFullStatId())}
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
{/if}

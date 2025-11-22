<script lang="ts">
  import type { SummarySection, SkillSelected, DefaultsConfig, ResolvedRowConfig } from '$lib/hellclock/skillcard-types';
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
  }

  const { section, skill, evaluationResult, globalDefaults, loading = false }: Props = $props();

  const skillId = $derived(skill.skill.name);
  const columns = $derived(section.layout?.columns || 4);
  const gap = $derived(section.layout?.gap || 2);

  // Resolve all rows with merged defaults
  const resolvedRows = $derived(
    section.rows.map(row => ({
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
    {#each Array(columns) as _}
      <div class="text-center">
        <div class="skeleton h-3 w-12 mx-auto mb-1"></div>
        <div class="skeleton h-4 w-16 mx-auto"></div>
      </div>
    {/each}
  {:else}
    {#each visibleRows as { resolved, value } (resolved.id)}
      {@const formattedValue = applyPrefixSuffix(
        formatValue(value, resolved.format),
        resolved.prefix,
        resolved.suffix
      )}
      {@const valueClasses = getValueClasses(resolved.style)}
      {@const labelClasses = getLabelClasses(resolved.style)}
      {@const labelStyle = getLabelStyle(resolved.style)}

      <div class="text-center">
        <div class={labelClasses} style={labelStyle}>
          {resolved.displayName || resolved.id}
        </div>
        <div class={valueClasses}>
          {formattedValue}
        </div>
      </div>
    {/each}
  {/if}
</div>

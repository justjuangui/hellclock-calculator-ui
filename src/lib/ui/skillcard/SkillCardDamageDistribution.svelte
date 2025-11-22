<script lang="ts">
  import type {
    DamageDistributionSection,
    SkillSelected,
    DefaultsConfig,
  } from "$lib/hellclock/skillcard-types";
  import { resolveRowConfig } from "$lib/hellclock/skillcard-defaults";
  import { resolveValue } from "$lib/hellclock/skillcard-resolver";
  import { shouldShowRow } from "$lib/hellclock/skillcard-conditions";
  import {
    getProgressColorClass,
    getBadgeColorClass,
  } from "$lib/hellclock/skillcard-styles";

  interface Props {
    section: DamageDistributionSection;
    skill: SkillSelected;
    evaluationResult: Record<string, unknown>;
    globalDefaults?: DefaultsConfig;
  }

  const { section, skill, evaluationResult, globalDefaults }: Props = $props();

  const skillId = $derived(skill.skill.name);

  // Resolve all rows and calculate values
  const damageData = $derived(() => {
    const data = section.rows
      .map((row) => {
        const resolved = resolveRowConfig(
          row,
          globalDefaults,
          section.defaults,
        );
        const value = resolveValue(row, skill, evaluationResult, skillId);
        const numValue = typeof value === "number" ? value : 0;
        return {
          resolved,
          value: numValue,
          isVisible: shouldShowRow(value, resolved.conditions),
        };
      })
      .filter((d) => d.isVisible && d.value > 0);

    const total = data.reduce((sum, d) => sum + d.value, 0);

    return data.map((d) => ({
      ...d,
      percentage: total > 0 ? (d.value / total) * 100 : 0,
    }));
  });

  const totalDamage = $derived(
    damageData().reduce((sum, d) => sum + d.value, 0),
  );
</script>

{#if totalDamage > 0}
  <div class="space-y-2">
    <!-- Stacked Bar -->
    <div class="flex h-2 rounded-full overflow-hidden bg-base-300">
      {#each damageData() as damage (damage.resolved.id)}
        {@const colorClass = getProgressColorClass(damage.resolved.style)}
        <div
          class="h-full {colorClass}"
          style="width: {damage.percentage}%"
          title="{damage.resolved.displayName}: {Math.round(
            damage.value,
          )} ({damage.percentage.toFixed(1)}%)"
        ></div>
      {/each}
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap gap-2 text-xs">
      {#each damageData() as damage (damage.resolved.id)}
        {@const badgeClass = getBadgeColorClass(damage.resolved.style.color)}
        <div class="flex items-center gap-1">
          <span class="badge badge-xs {badgeClass}"></span>
          <span class="opacity-70">{damage.resolved.displayName}:</span>
          <span class="font-mono">{Math.round(damage.value)}</span>
        </div>
      {/each}
    </div>
  </div>
{/if}

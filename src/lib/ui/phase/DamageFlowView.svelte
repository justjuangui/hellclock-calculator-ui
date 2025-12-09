<script lang="ts">
  import type { DamageFlowInfo } from "./types";
  import { formatNumber, getDamageTypeColor } from "$lib/utils/phase-formatter";

  interface Props {
    damageFlow: DamageFlowInfo;
    name: string;
  }

  const { damageFlow, name }: Props = $props();

  // Calculate distribution from finalDamage values (not from raw distribution)
  // The raw distribution field shows initial skill distribution, but doesn't account
  // for additional damage added later (e.g., Lightning from Lightning_additional)
  const distributionEntries = $derived.by(() => {
    const total = Object.values(damageFlow.finalDamage).reduce(
      (sum, v) => sum + v,
      0
    );
    if (total === 0) return [];

    return Object.entries(damageFlow.finalDamage)
      .filter(([_, v]) => v > 0)
      .map(([type, value]) => [type, value / total] as [string, number])
      .sort(([_, a], [__, b]) => b - a);
  });

  // Final damage entries
  const finalDamageEntries = $derived(
    Object.entries(damageFlow.finalDamage)
      .filter(([_, v]) => v > 0)
      .sort(([_, a], [__, b]) => b - a)
  );

  // Total damage sum for percentage calculations
  const totalDamageSum = $derived(
    Object.values(damageFlow.finalDamage).reduce((sum, v) => sum + v, 0)
  );

  let expandedPhases = $state<Record<number, boolean>>({});

  function togglePhase(phase: number) {
    expandedPhases[phase] = !expandedPhases[phase];
  }

  // Phase names for display
  const phaseNames: Record<number, string> = {
    1: "Base Damage",
    2: "Initial Distribution",
    3: "Skill Conversions",
    4: "Character Conversions",
    5: "Normalize Distribution",
    6: "Skill Damage Modifier",
    7: "Final Damage Per Type",
    8: "Critical Average",
  };
</script>

<div class="space-y-4">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold">{name}</h3>
    <div class="flex gap-2">
      <span class="badge badge-lg badge-primary font-mono">
        Total: {formatNumber(damageFlow.totalDamage)}
      </span>
      <span class="badge badge-lg badge-secondary font-mono">
        Avg: {formatNumber(damageFlow.averageDamage)}
      </span>
    </div>
  </div>

  <!-- Key Stats -->
  <div class="stats stats-horizontal shadow w-full bg-base-100">
    <div class="stat py-3">
      <div class="stat-title text-xs">Base Damage</div>
      <div class="stat-value text-lg font-mono">
        {formatNumber(damageFlow.baseDamage)}
      </div>
    </div>
    <div class="stat py-3">
      <div class="stat-title text-xs">Skill Modifier</div>
      <div class="stat-value text-lg font-mono">
        {formatNumber(damageFlow.skillDamageModifier)}
      </div>
    </div>
    <div class="stat py-3">
      <div class="stat-title text-xs">Total Damage</div>
      <div class="stat-value text-lg font-mono text-primary">
        {formatNumber(damageFlow.totalDamage)}
      </div>
    </div>
    <div class="stat py-3">
      <div class="stat-title text-xs">Crit Average</div>
      <div class="stat-value text-lg font-mono text-secondary">
        {formatNumber(damageFlow.averageDamage)}
      </div>
    </div>
  </div>

  <!-- Distribution Visualization -->
  {#if distributionEntries.length > 0}
    <div class="card bg-base-100 border border-base-300 p-4">
      <h4 class="text-sm font-semibold mb-3">Damage Distribution</h4>

      <!-- Stacked Bar -->
      <div class="flex h-8 rounded-lg overflow-hidden bg-base-300">
        {#each distributionEntries as [type, percentage] (type)}
          <div
            class="h-full {getDamageTypeColor(type)} flex items-center justify-center text-xs font-bold transition-all hover:opacity-90"
            style="width: {percentage * 100}%"
            title="{type}: {(percentage * 100).toFixed(1)}%"
          >
            {#if percentage > 0.12}
              {type} {(percentage * 100).toFixed(0)}%
            {:else if percentage > 0.06}
              {(percentage * 100).toFixed(0)}%
            {/if}
          </div>
        {/each}
      </div>

      <!-- Legend with Final Damage Values -->
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
        {#each finalDamageEntries as [type, value] (type)}
          {@const percentage = totalDamageSum > 0 ? value / totalDamageSum : 0}
          <div class="flex items-center gap-2 p-2 rounded bg-base-200/50">
            <span class="w-4 h-4 rounded {getDamageTypeColor(type)}"></span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{type}</div>
              <div class="flex items-baseline gap-1">
                <span class="font-mono text-sm">{formatNumber(value)}</span>
                <span class="text-xs text-base-content/60">
                  ({(percentage * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Phase Breakdown -->
  {#if damageFlow.phases.length > 0}
    <div class="card bg-base-100 border border-base-300 p-4">
      <h4 class="text-sm font-semibold mb-3">Phase Breakdown</h4>
      <div class="space-y-1">
        {#each damageFlow.phases as phase (phase.phase)}
          <div class="collapse collapse-arrow bg-base-200/50 rounded-lg">
            <input
              type="checkbox"
              bind:checked={expandedPhases[phase.phase]}
            />
            <div class="collapse-title text-sm font-medium py-2 min-h-0">
              <span class="badge badge-xs badge-ghost mr-2">{phase.phase}</span>
              {phaseNames[phase.phase] ?? phase.name}
              {#if phase.value !== undefined}
                <span class="badge badge-sm badge-outline ml-2 font-mono">
                  {formatNumber(phase.value)}
                </span>
              {/if}
            </div>
            <div class="collapse-content text-sm">
              <div class="pt-2 space-y-2">
                {#if phase.distribution}
                  <div class="text-xs">
                    <span class="font-semibold">Distribution:</span>
                    <div class="flex flex-wrap gap-2 mt-1">
                      {#each Object.entries(phase.distribution).filter(([_, v]) => v > 0) as [type, val] (type)}
                        <span class="badge badge-sm {getDamageTypeColor(type).replace('bg-', 'badge-').replace(' text-', ' badge-')}">
                          {type}: {(val * 100).toFixed(1)}%
                        </span>
                      {/each}
                    </div>
                  </div>
                {/if}

                {#if phase.additionalDamage && Object.keys(phase.additionalDamage).length > 0}
                  <div class="text-xs">
                    <span class="font-semibold">Additional Damage:</span>
                    <div class="flex flex-wrap gap-2 mt-1">
                      {#each Object.entries(phase.additionalDamage).filter(([_, v]) => v > 0) as [type, val] (type)}
                        <span class="badge badge-sm badge-outline">
                          {type}: +{formatNumber(val)}
                        </span>
                      {/each}
                    </div>
                  </div>
                {/if}

                {#if phase.finalDamage && Object.keys(phase.finalDamage).length > 0}
                  <div class="text-xs">
                    <span class="font-semibold">Final Damage:</span>
                    <div class="flex flex-wrap gap-2 mt-1">
                      {#each Object.entries(phase.finalDamage).filter(([_, v]) => v > 0) as [type, val] (type)}
                        <span class="badge badge-sm badge-outline font-mono">
                          {type}: {formatNumber(val)}
                        </span>
                      {/each}
                    </div>
                  </div>
                {/if}

                {#if phase.totalDamage !== undefined}
                  <div class="text-xs">
                    <span class="font-semibold">Total:</span>
                    <span class="font-mono ml-1">{formatNumber(phase.totalDamage)}</span>
                  </div>
                {/if}

                {#if phase.averageDamage !== undefined}
                  <div class="text-xs">
                    <span class="font-semibold">Critical Average:</span>
                    <span class="font-mono ml-1">{formatNumber(phase.averageDamage)}</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

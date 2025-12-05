<script lang="ts">
  import { getContext } from "svelte";
  import type { StatusHelper } from "$lib/hellclock/status";
  import { useStatusEvaluation } from "$lib/context/statusevaluation.svelte";
  import type { StatsHelper } from "$lib/hellclock/stats";

  const statusHelper = getContext<StatusHelper>("statusHelper");
  const statsHelper = getContext<StatsHelper>("statsHelper");
  const lang = getContext<string>("lang") || "en";

  const statusEvaluationApi = useStatusEvaluation();

  // Get active statuses
  const activeStatuses = $derived(statusEvaluationApi.getActiveStatuses());

  // Group statuses by type (buff vs debuff)
  const groupedStatuses = $derived(() => {
    const buffs: typeof activeStatuses = [];
    const debuffs: typeof activeStatuses = [];

    for (const status of activeStatuses) {
      const statusDef = statusHelper?.getStatusById(status.statusId);
      if (!statusDef) continue;

      if (statusHelper.isStatusBuff(statusDef)) {
        buffs.push(status);
      } else {
        debuffs.push(status);
      }
    }

    return { buffs, debuffs };
  });

  function getStatusName(statusId: number): string {
    if (!statusHelper) return "Unknown Status";
    const statusDef = statusHelper.getStatusById(statusId);
    if (!statusDef) return `Status #${statusId}`;
    return statusHelper.getStatusName(statusDef, lang);
  }

  function getStatusIcon(statusId: number): string | undefined {
    if (!statusHelper) return undefined;
    const statusDef = statusHelper.getStatusById(statusId);
    if (!statusDef) return undefined;
    return statusHelper.getStatusIcon(statusDef);
  }

  function getStatusDescription(statusId: number): string {
    if (!statusHelper) return "";
    const statusDef = statusHelper.getStatusById(statusId);
    if (!statusDef) return "";
    return statusHelper.getStatusDescription(statusDef, lang);
  }

  function getStatusStatMods(statusId: number, intensity = 1, stacks = 1) {
    if (!statusHelper) return [];
    const statusDef = statusHelper.getStatusById(statusId);
    if (!statusDef || !statusHelper.isStatModifierStatus(statusDef)) return [];

    return statusHelper.extractStatMods(statusDef, intensity, stacks);
  }

  function formatStatValue(value: number, statName: string): string {
    if (!statsHelper) return String(value);

    const statDef = statsHelper.getStatByName(statName);
    if (!statDef) return String(value);

    return statsHelper.formatStatValue(value, statDef);
  }
</script>

{#if activeStatuses.length > 0}
  <div class="space-y-4">
    <h3 class="text-lg font-semibold">Active Status Effects</h3>

    <!-- Buffs Section -->
    {#if groupedStatuses().buffs.length > 0}
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-success">
          Buffs ({groupedStatuses().buffs.length})
        </h4>
        <div class="grid grid-cols-1 gap-2">
          {#each groupedStatuses().buffs as status, i (i)}
            {@const statusName = getStatusName(status.statusId)}
            {@const statusIcon = getStatusIcon(status.statusId)}
            {@const statusMods = getStatusStatMods(
              status.statusId,
              status.intensity,
              status.stacks
            )}
            <div class="card bg-success/10 border border-success/30 p-3">
              <div class="flex items-start gap-2">
                {#if statusIcon}
                  <div class="w-8 h-8 flex-shrink-0">
                    <img
                      src={`/assets/icons/${statusIcon}.png`}
                      alt={statusName}
                      class="w-full h-full object-contain"
                    />
                  </div>
                {/if}
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-semibold text-success">{statusName}</span>
                    <div class="flex gap-2 text-xs opacity-70">
                      {#if status.intensity && status.intensity !== 1}
                        <span class="badge badge-sm">
                          Intensity: {status.intensity}
                        </span>
                      {/if}
                      {#if status.stacks && status.stacks > 1}
                        <span class="badge badge-sm">
                          Stacks: {status.stacks}
                        </span>
                      {/if}
                    </div>
                  </div>

                  <div class="text-xs opacity-70 mt-1">
                    From: {status.source.replace(/^(relic|constellation):/, "")}
                  </div>

                  {#if statusMods.length > 0}
                    <div class="mt-2 space-y-1">
                      {#each statusMods as mod, i (i)}
                        <div class="text-sm flex items-center gap-2">
                          <span class="opacity-70">
                            {statsHelper?.getStatDisplayName(
                              mod.eStatDefinition,
                              lang
                            ) || mod.eStatDefinition}:
                          </span>
                          <span class="font-mono text-success">
                            +{formatStatValue(mod.value, mod.eStatDefinition)}
                          </span>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Debuffs Section -->
    {#if groupedStatuses().debuffs.length > 0}
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-error">
          Debuffs ({groupedStatuses().debuffs.length})
        </h4>
        <div class="grid grid-cols-1 gap-2">
          {#each groupedStatuses().debuffs as status, i (i)}
            {@const statusName = getStatusName(status.statusId)}
            {@const statusIcon = getStatusIcon(status.statusId)}
            {@const statusMods = getStatusStatMods(
              status.statusId,
              status.intensity,
              status.stacks
            )}
            <div class="card bg-error/10 border border-error/30 p-3">
              <div class="flex items-start gap-2">
                {#if statusIcon}
                  <div class="w-8 h-8 flex-shrink-0">
                    <img
                      src={`/assets/icons/${statusIcon}.png`}
                      alt={statusName}
                      class="w-full h-full object-contain"
                    />
                  </div>
                {/if}
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-semibold text-error">{statusName}</span>
                    <div class="flex gap-2 text-xs opacity-70">
                      {#if status.intensity && status.intensity !== 1}
                        <span class="badge badge-sm">
                          Intensity: {status.intensity}
                        </span>
                      {/if}
                      {#if status.stacks && status.stacks > 1}
                        <span class="badge badge-sm">
                          Stacks: {status.stacks}
                        </span>
                      {/if}
                    </div>
                  </div>

                  <div class="text-xs opacity-70 mt-1">
                    From: {status.source.replace(/^(relic|constellation):/, "")}
                  </div>

                  {#if statusMods.length > 0}
                    <div class="mt-2 space-y-1">
                      {#each statusMods as mod, i (i)}
                        <div class="text-sm flex items-center gap-2">
                          <span class="opacity-70">
                            {statsHelper?.getStatDisplayName(
                              mod.eStatDefinition,
                              lang
                            ) || mod.eStatDefinition}:
                          </span>
                          <span
                            class="font-mono"
                            class:text-error={mod.value < 0}
                            class:text-success={mod.value > 0}
                          >
                            {mod.value >= 0 ? "+" : ""}{formatStatValue(
                              mod.value,
                              mod.eStatDefinition
                            )}
                          </span>
                        </div>
                      {/each}
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
{:else}
  <div class="text-center opacity-50 py-4">No active status effects</div>
{/if}

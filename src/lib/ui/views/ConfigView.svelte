<script lang="ts">
  import { getContext } from "svelte";
  import { useWorldTierEquipped } from "$lib/context/worldtierequipped.svelte";
  import type { WorldTiersHelper, WorldTier } from "$lib/hellclock/worldtiers";
  import type { StatsHelper } from "$lib/hellclock/stats";
  import { formatStatModNumber } from "$lib/hellclock/formats";

  const worldTiersHelper = getContext<WorldTiersHelper>("worldTiersHelper");
  const statsHelper = getContext<StatsHelper>("statsHelper");
  const worldTierEquipped = useWorldTierEquipped();

  const allWorldTiers = $derived(worldTiersHelper.getAllWorldTiers());
  const selectedTier = $derived(worldTierEquipped.selectedWorldTier);

  function selectWorldTier(tier: WorldTier) {
    worldTierEquipped.setWorldTier(tier);
  }

  function formatModValue(
    value: number,
    statName: string,
    modifierType: "Additive" | "Multiplicative",
  ): string {
    const statDef = statsHelper.getStatByName(statName);
    const format = statDef?.eStatFormat ?? "DEFAULT";
    // World tier values are direct (no rarity multiplier), so use 1 for all multiplier params
    return formatStatModNumber(value, format, modifierType, 1, 1, 1);
  }

  function getModifierClass(value: number, modifierType: string): string {
    if (modifierType === "Multiplicative") {
      if (value > 1) return "text-success";
      if (value < 1) return "text-error";
    } else {
      if (value > 0) return "text-success";
      if (value < 0) return "text-error";
    }
    return "";
  }
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex justify-between items-center">
    <h1 class="text-3xl font-bold">Configuration</h1>
  </div>

  <!-- World Tier Selection -->
  <div class="card bg-base-100 border border-base-300 shadow">
    <div class="card-body">
      <h2 class="card-title text-xl mb-4">World Tier</h2>
      <p class="text-sm opacity-70 mb-4">
        Select the World Tier you're playing on. Higher tiers apply stat
        penalties but increase rewards.
      </p>

      <!-- World Tier Radio Buttons -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {#each allWorldTiers as tier}
          <button
            class="card border-2 cursor-pointer transition-all {selectedTier?.worldTierKey ===
            tier.worldTierKey
              ? 'border-primary bg-primary/10'
              : 'border-base-300 hover:border-primary/50'}"
            onclick={() => selectWorldTier(tier)}
          >
            <div class="card-body p-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold {selectedTier?.worldTierKey ===
                  tier.worldTierKey
                    ? 'bg-primary text-primary-content'
                    : 'bg-base-300'}"
                >
                  {tier.worldTierRomanNumber}
                </div>
                <div>
                  <div class="font-semibold">{tier.worldTierKey}</div>
                  <div class="text-xs opacity-60">
                    Tier {tier.worldTierRomanNumber}
                  </div>
                </div>
              </div>
              {#if tier.playerStatModifiers.length === 0}
                <div class="text-xs opacity-50 mt-2">
                  No modifiers (baseline)
                </div>
              {:else}
                <div class="text-xs opacity-70 mt-2">
                  {tier.playerStatModifiers.length} stat modifier{tier
                    .playerStatModifiers.length > 1
                    ? "s"
                    : ""}
                </div>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Selected Tier Modifiers -->
  {#if selectedTier && selectedTier.playerStatModifiers.length > 0}
    <div class="card bg-base-100 border border-base-300 shadow">
      <div class="card-body">
        <h2 class="card-title text-xl mb-4">
          World Tier {selectedTier.worldTierRomanNumber} ({selectedTier.worldTierKey})
          Modifiers
        </h2>

        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Stat</th>
                <th>Type</th>
                <th class="text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {#each selectedTier.playerStatModifiers as mod}
                <tr>
                  <td>
                    {statsHelper.getLabelForStat(mod.statDefinition) ||
                      mod.statDefinition}
                  </td>
                  <td>
                    <span
                      class="badge badge-sm {mod.modifierType === 'Additive'
                        ? 'badge-info'
                        : 'badge-warning'}"
                    >
                      {mod.modifierType}
                    </span>
                  </td>
                  <td
                    class="text-right font-mono {getModifierClass(
                      mod.value,
                      mod.modifierType,
                    )}"
                  >
                    {formatModValue(
                      mod.value,
                      mod.statDefinition,
                      mod.modifierType,
                    )}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  {/if}

  <!-- Help Text -->
  <div class="card bg-base-200 border border-base-300">
    <div class="card-body">
      <h3 class="font-semibold">About World Tiers</h3>
      <ul class="list-disc list-inside text-sm opacity-70 space-y-1">
        <li>
          <strong>Normal (I)</strong> - Baseline difficulty with no modifiers
        </li>
        <li>
          <strong>Abyss (II)</strong> - Reduced defenses, lower XP/Gold, but better
          drops
        </li>
        <li>
          <strong>Oblivion (III)</strong> - Significantly harder with greater reward
          bonuses
        </li>
        <li>
          <strong>Void (IV)</strong> - Maximum difficulty with the best reward multipliers
        </li>
      </ul>
    </div>
  </div>
</div>

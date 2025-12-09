<script lang="ts">
  import { getContext } from "svelte";
  import { useEvaluationManager } from "$lib/context/evaluation.svelte";
  import { useEquipped, ESlotsType } from "$lib/context/equipped.svelte";
  import { useSkillEquipped } from "$lib/context/skillequipped.svelte";
  import { useRelicInventory } from "$lib/context/relicequipped.svelte";
  import { useWorldTierEquipped } from "$lib/context/worldtierequipped.svelte";
  import type { StatsHelper } from "$lib/hellclock/stats";
  import type { GamePack } from "$lib/engine/types";
  import { spriteUrl, parseRGBA01ToCss, parseRGBA01ToCssLightened } from "$lib/hellclock/utils";
  import { translate } from "$lib/hellclock/lang";
  import { ESingType, formatStatNumber } from "$lib/hellclock/formats";
  import type { WorldTiersHelper } from "$lib/hellclock/worldtiers";
  import ImportDialog from "$lib/ui/ImportDialog.svelte";
  import ExportDialog from "$lib/ui/ExportDialog.svelte";

  let { activeSection = $bindable("home") } = $props<{
    activeSection: string;
  }>();

  const statsHelper = getContext<StatsHelper>("statsHelper");
  const _gamepack = getContext<GamePack>("gamepack");
  const lang = getContext<string>("lang");
  const _worldTiersHelper = getContext<WorldTiersHelper>("worldTiersHelper");
  const evaluationManager = useEvaluationManager();
  const blessedSlots = useEquipped(ESlotsType.BlessedGear);
  const trinketSlots = useEquipped(ESlotsType.TrinkedGear);
  const skillEquipped = useSkillEquipped();
  const relicInventory = useRelicInventory();
  const worldTierApi = useWorldTierEquipped();

  const evalResult = $derived(evaluationManager.statEvaluation.result);
  const loading = $derived(evaluationManager.statEvaluation.loading);

  // Key stats for dashboard
  const keyStats = $derived.by(() => {
    if (!evalResult) return null;

    return {
      health: (evalResult as any)["Life"] || 0,
      mana: (evalResult as any)["Mana"] || 0,
      dps: (evalResult as any)["BaseDamage"] || 0,
      defense: (evalResult as any)["AttackSpeed"] || 0,
    };
  });

  // Count equipped items
  const equippedCounts = $derived.by(() => {
    const blessedCount = Object.values(blessedSlots.equipped).filter(
      (item) => item !== null,
    ).length;
    const trinketCount = Object.values(trinketSlots.equipped).filter(
      (item) => item !== null,
    ).length;
    const skillCount = Object.values(skillEquipped.skillsEquipped).filter(
      (s) => s !== null,
    ).length;
    const relicCount = relicInventory.getUniqueRelicCount();

    return {
      gear: blessedCount + trinketCount,
      gearTotal:
        Object.keys(blessedSlots.equipped).length +
        Object.keys(trinketSlots.equipped).length,
      skills: skillCount,
      skillsTotal: Object.keys(skillEquipped.skillsEquipped).length,
      relics: relicCount,
      relicsTotal: 42, // 7x6 grid
    };
  });

  // Get equipped skills as array
  const equippedSkills = $derived(
    Object.values(skillEquipped.skillsEquipped).filter((s) => s !== null),
  );

  // Dialog refs
  let importDialog: ReturnType<typeof ImportDialog>;
  let exportDialog: ReturnType<typeof ExportDialog>;

  function navigateTo(section: string) {
    activeSection = section;
  }

  function openImportDialog() {
    importDialog?.open();
  }

  function openExportDialog() {
    exportDialog?.open();
  }

  function formatStat(value: number | null, statName: string): string {
    if (value === null) return "-";

    const statDef = statsHelper.getStatByName(statName);
    if (!statDef) return String(value);
    const clampedValue = statsHelper.getValueForStat(statName, value);

    return formatStatNumber(
      clampedValue,
      statDef.eStatFormat,
      ESingType.Default,
    );
  }
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex justify-between items-center">
    <h1 class="text-3xl font-bold">
      Build Overview
      {#if worldTierApi.selectedWorldTier}
        <span
          style="color: {parseRGBA01ToCssLightened(worldTierApi.selectedWorldTier.worldTierColor)}"
          >(World Tier {worldTierApi.selectedWorldTier.worldTierRomanNumber} - {translate(worldTierApi.selectedWorldTier.worldTierLocalizationKey, lang)})</span
        >
      {/if}
    </h1>
    <div class="flex gap-2">
      <button class="btn btn-outline btn-sm" onclick={openImportDialog}
        >Import Build</button
      >
      <button class="btn btn-primary btn-sm" onclick={openExportDialog}>Export Build</button>
    </div>
  </div>

  <!-- Key Stats Summary -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="stats shadow border border-base-300">
      <div class="stat">
        <div class="stat-figure text-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="inline-block w-8 h-8 stroke-current"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </div>
        <div class="stat-title">{statsHelper.getLabelForStat("Life")}</div>
        <div class="stat-value text-error">
          {#if loading}
            <span class="loading loading-spinner loading-sm"></span>
          {:else if keyStats}
            {formatStat(keyStats.health, "Life")}
          {:else}
            -
          {/if}
        </div>
      </div>
    </div>

    <div class="stats shadow border border-base-300">
      <div class="stat">
        <div class="stat-figure text-info">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="inline-block w-8 h-8 stroke-current"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <div class="stat-title">{statsHelper.getLabelForStat("Mana")}</div>
        <div class="stat-value text-info">
          {#if loading}
            <span class="loading loading-spinner loading-sm"></span>
          {:else if keyStats}
            {formatStat(keyStats.mana, "Mana")}
          {:else}
            -
          {/if}
        </div>
      </div>
    </div>

    <div class="stats shadow border border-base-300">
      <div class="stat">
        <div class="stat-figure text-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="inline-block w-8 h-8 stroke-current"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
            />
          </svg>
        </div>
        <div class="stat-title">
          {statsHelper.getLabelForStat("BaseDamage")}
        </div>
        <div class="stat-value text-warning">
          {#if loading}
            <span class="loading loading-spinner loading-sm"></span>
          {:else if keyStats}
            {formatStat(keyStats.dps, "BaseDamage")}
          {:else}
            -
          {/if}
        </div>
      </div>
    </div>

    <div class="stats shadow border border-base-300">
      <div class="stat">
        <div class="stat-figure text-success">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="inline-block w-8 h-8 stroke-current"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12h3m3-6l3 3-3 3m12-3h-3m-3 6l-3-3 3-3M12 3v3m0 12v3"
            />
          </svg>
        </div>
        <div class="stat-title">
          {statsHelper.getLabelForStat("AttackSpeed")}
        </div>
        <div class="stat-value text-success">
          {#if loading}
            <span class="loading loading-spinner loading-sm"></span>
          {:else if keyStats}
            {formatStat(keyStats.defense, "AttackSpeed")}
          {:else}
            -
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Overview Cards -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Gear Overview -->
    <button
      class="card bg-base-100 border-2 border-base-300 hover:border-primary cursor-pointer transition-all shadow-lg hover:shadow-xl text-left"
      onclick={() => navigateTo("gear")}
    >
      <div class="card-body">
        <h2 class="card-title flex items-center gap-2">
          <span class="text-2xl">⚔️</span>
          Gear
          <span class="badge badge-primary ml-auto"
            >{equippedCounts.gear}/{equippedCounts.gearTotal}</span
          >
        </h2>
        <p class="text-sm opacity-70">Blessed and Trinket equipment</p>
        <div class="mt-4 space-y-2">
          {#if equippedCounts.gear > 0}
            <!-- Blessed Gear Row -->
            {@const blessedGear = Object.values(blessedSlots.equipped).filter(
              (i) => i,
            )}
            {#if blessedGear.length > 0}
              <div class="flex gap-2 items-center flex-wrap">
                {#each blessedGear as gearItem, i (i)}
                  <img
                    src={spriteUrl(gearItem.sprite)}
                    alt={translate(gearItem.localizedName, lang)}
                    class="h-7 w-7 object-contain border border-opacity-40 rounded"
                    style="border-color: {parseRGBA01ToCss(gearItem.color)}"
                  />
                {/each}
              </div>
            {/if}
            <!-- Trinket Gear Row -->
            {@const trinketGear = Object.values(trinketSlots.equipped).filter(
              (i) => i,
            )}
            {#if trinketGear.length > 0}
              <div class="flex gap-2 items-center flex-wrap">
                {#each trinketGear as gearItem, i (i)}
                  <img
                    src={spriteUrl(gearItem.sprite)}
                    alt={translate(gearItem.localizedName, lang)}
                    class="h-7 w-7 object-contain border border-opacity-40 rounded"
                    style="border-color: {parseRGBA01ToCss(gearItem.color)}"
                  />
                {/each}
              </div>
            {/if}
          {:else}
            <div class="text-sm opacity-50">No gear equipped</div>
          {/if}
        </div>
        <div class="mt-2 text-xs opacity-60 flex items-center gap-1">
          <span>→</span>
          Click to manage gear
        </div>
      </div>
    </button>

    <!-- Skills Overview -->
    <button
      class="card bg-base-100 border-2 border-base-300 hover:border-primary cursor-pointer transition-all shadow-lg hover:shadow-xl text-left"
      onclick={() => navigateTo("skills")}
    >
      <div class="card-body">
        <h2 class="card-title flex items-center gap-2">
          <span class="text-2xl">✨</span>
          Skills
          <span class="badge badge-primary ml-auto"
            >{equippedCounts.skills}/{equippedCounts.skillsTotal}</span
          >
        </h2>
        <p class="text-sm opacity-70">Active skill configuration</p>
        <div class="mt-4">
          {#if equippedSkills.length > 0}
            <div class="flex gap-2 items-center">
              {#each equippedSkills as skillData, i (i)}
                <img
                  src={spriteUrl(skillData.skill.icon)}
                  alt={translate(skillData.skill.localizedName, lang)}
                  class="h-7 w-7 object-contain border border-base-300 rounded"
                />
              {/each}
            </div>
          {:else}
            <div class="text-sm opacity-50">No skills equipped</div>
          {/if}
        </div>
        <div class="mt-2 text-xs opacity-60 flex items-center gap-1">
          <span>→</span>
          Click to manage skills
        </div>
      </div>
    </button>

    <!-- Relics Overview -->
    <button
      class="card bg-base-100 border-2 border-base-300 hover:border-primary cursor-pointer transition-all shadow-lg hover:shadow-xl text-left"
      onclick={() => navigateTo("relics")}
    >
      <div class="card-body">
        <h2 class="card-title flex items-center gap-2">
          <span class="text-2xl">💎</span>
          Relics
          <span class="badge badge-primary ml-auto"
            >{equippedCounts.relics}/{equippedCounts.relicsTotal}</span
          >
        </h2>
        <p class="text-sm opacity-70">Relic inventory management</p>
        <div class="mt-4">
          {#if equippedCounts.relics > 0}
            <div class="text-sm">{equippedCounts.relics} relics placed</div>
          {:else}
            <div class="text-sm opacity-50">No relics equipped</div>
          {/if}
        </div>
        <div class="mt-2 text-xs opacity-60 flex items-center gap-1">
          <span>→</span>
          Click to manage relics
        </div>
      </div>
    </button>
  </div>

  <!-- Quick Actions -->
  <div class="card bg-base-100 border border-base-300 shadow">
    <div class="card-body">
      <h3 class="card-title text-lg">Quick Actions</h3>
      <div class="flex flex-wrap gap-2 mt-2">
        <button
          class="btn btn-sm btn-outline"
          onclick={() => navigateTo("stats")}
        >
          📊 View Detailed Stats
        </button>
        <button
          class="btn btn-sm btn-outline"
          onclick={() => navigateTo("constellation")}
        >
          🌟 Open Constellation
        </button>
        <button class="btn btn-sm btn-outline" disabled
          >🔔 Configure Bell (Soon)</button
        >
        <button class="btn btn-sm btn-outline" disabled
          >🙏 Manage Blessings (Soon)</button
        >
      </div>
    </div>
  </div>
</div>

<!-- Import Dialog -->
<ImportDialog
  bind:this={importDialog}
  onBeforeImport={() => evaluationManager.invalidateCache()}
/>

<!-- Export Dialog -->
<ExportDialog bind:this={exportDialog} />

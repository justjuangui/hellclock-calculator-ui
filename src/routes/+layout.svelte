<script lang="ts">
  import "../app.css";
  import { onMount, setContext } from "svelte";
  import AppNavbar from "$lib/ui/AppNavbar.svelte";
  import { Engine } from "$lib/engine";
  import type { GamePack } from "$lib/engine/types";
  import { loadGamePack } from "$lib/engine/assets";
  import { ESlotsType, providedEquipped } from "$lib/context/equipped.svelte";
  import { StatsHelper, type StatsRoot } from "$lib/hellclock/stats";
  import {
    GearsHelper,
    type GearRarityRoot,
    type GearRoot,
    type GearSlotDB,
  } from "$lib/hellclock/gears";
  import {
    SkillsHelper,
    type SkillsCalculatorRoot,
    type SkillsRoot,
    type SkillsConfig,
  } from "$lib/hellclock/skills";
  import {
    RelicsHelper,
    type RelicsDB,
    type RelicInventoryConfig,
    type RelicAffixesDB,
  } from "$lib/hellclock/relics";
  import {
    ConstellationsHelper,
    type ConstellationsConfig,
  } from "$lib/hellclock/constellations";
  import { StatusHelper, type StatusDB } from "$lib/hellclock/status";
  import { provideSkillEquipped } from "$lib/context/skillequipped.svelte";
  import { provideEvaluationManager } from "$lib/context/evaluation.svelte";
  import { provideGearEvaluation } from "$lib/context/gearevaluation.svelte";
  import { provideSkillEvaluation } from "$lib/context/skillevaluation.svelte";
  import { provideRelicEvaluation } from "$lib/context/relicevaluation.svelte";
  import { provideRelicInventory } from "$lib/context/relicequipped.svelte";
  import { provideConstellationEquipped } from "$lib/context/constellationequipped.svelte";
  import { provideConstellationEvaluation } from "$lib/context/constellationevaluation.svelte";
  import { provideStatusEvaluation } from "$lib/context/statusevaluation.svelte";
  import { AssetPreloader } from "$lib/pixi/AssetPreloader";

  providedEquipped(ESlotsType.BlessedGear);
  providedEquipped(ESlotsType.TrinkedGear);

  // Initialize contexts with dependencies once they're available
  let skillContext: ReturnType<typeof provideSkillEquipped> | null = null;
  let gearEvaluationContext: ReturnType<typeof provideGearEvaluation> | null =
    null;
  let skillEvaluationContext: ReturnType<typeof provideSkillEvaluation> | null =
    null;
  let relicEvaluationContext: ReturnType<typeof provideRelicEvaluation> | null =
    null;
  let evaluationManagerContext: ReturnType<
    typeof provideEvaluationManager
  > | null = null;
  let relicInventoryContext: ReturnType<typeof provideRelicInventory> | null =
    null;
  let constellationEquippedContext: ReturnType<
    typeof provideConstellationEquipped
  > | null = null;
  let constellationEvaluationContext: ReturnType<
    typeof provideConstellationEvaluation
  > | null = null;
  let statusEvaluationContext: ReturnType<typeof provideStatusEvaluation> | null =
    null;

  $effect(() => {
    if (skillsHelper && !skillContext) {
      skillContext = provideSkillEquipped(undefined, skillsHelper);
    }

    if (statusHelper && !statusEvaluationContext) {
      statusEvaluationContext = provideStatusEvaluation(statusHelper);
    }

    if (gearsHelper && statsHelper && !gearEvaluationContext) {
      gearEvaluationContext = provideGearEvaluation(
        gearsHelper,
        statsHelper,
        "en",
      );
    }

    if (skillsHelper && !skillEvaluationContext) {
      skillEvaluationContext = provideSkillEvaluation(skillsHelper, "en");
    }

    if (relicsHelper && !relicInventoryContext) {
      relicInventoryContext = provideRelicInventory(relicsHelper, 0);
    }

    if (relicsHelper && statsHelper && statusHelper && !relicEvaluationContext) {
      relicEvaluationContext = provideRelicEvaluation(
        relicsHelper,
        statsHelper,
        statusHelper,
        "en",
      );
    }

    if (constellationsHelper && !constellationEquippedContext) {
      constellationEquippedContext = provideConstellationEquipped(
        constellationsHelper,
        100, // Initial devotion points
      );
    }

    if (constellationsHelper && statusHelper && !constellationEvaluationContext) {
      constellationEvaluationContext = provideConstellationEvaluation(
        constellationsHelper,
        statusHelper,
        "en",
      );
    }

    if (
      engine &&
      pack &&
      statsHelper &&
      gearsHelper &&
      skillsHelper &&
      !evaluationManagerContext
    ) {
      evaluationManagerContext = provideEvaluationManager(
        engine,
        pack,
        statsHelper,
        gearsHelper,
        skillsHelper,
      );
    }
  });

  // runes state
  let ready = $state(false);
  let progress = $state(0);
  let label = $state("Starting…");
  let error = $state<string | null>(null);
  let pack = $state<GamePack | null>(null);
  let engine = $state<Engine | null>(null);
  let statsHelper = $state<StatsHelper | null>(null);
  let gearsHelper = $state<GearsHelper | null>(null);
  let skillsHelper = $state<SkillsHelper | null>(null);
  let relicsHelper = $state<RelicsHelper | null>(null);
  let constellationsHelper = $state<ConstellationsHelper | null>(null);
  let statusHelper = $state<StatusHelper | null>(null);
  let assetPreloader = $state<AssetPreloader | null>(null);

  $effect(() => {
    setContext("gamepack", pack);
    setContext("engine", engine);
    setContext("statsHelper", statsHelper);
    setContext("gearsHelper", gearsHelper);
    setContext("skillsHelper", skillsHelper);
    setContext("relicsHelper", relicsHelper);
    setContext("constellationsHelper", constellationsHelper);
    setContext("statusHelper", statusHelper);
    setContext("assetPreloader", assetPreloader);
    setContext("lang", "en");
    if (
      statsHelper &&
      engine &&
      pack &&
      gearsHelper &&
      skillsHelper &&
      relicsHelper &&
      constellationsHelper &&
      statusHelper &&
      assetPreloader
    ) {
      ready = true;
    }
  });

  async function boot() {
    try {
      label = "Spinning up engine…";
      engine = new Engine();

      await engine.onceReady();

      label = "Downloading assets…";
      progress = 5;

      pack = await loadGamePack((pct, lbl) => {
        progress = pct;
        label = lbl;
      });

      // send to worker
      label = "Loading pack";
      let filePackDefinition = $state.snapshot(pack["hellclock"]) as any;
      const res = await engine.loadPack(filePackDefinition);
      if (res) {
        error = `${(res as any).error}`;
        return;
      }

      label = "Loading StatsHelper";
      statsHelper = new StatsHelper(pack["Stats"] as StatsRoot);

      label = "Loading GearsHelper";
      gearsHelper = new GearsHelper(
        pack["Gear Slot"] as GearSlotDB,
        pack["Gear"] as GearRoot,
        pack["Gear Rarity"] as GearRarityRoot,
      );

      label = "Loading SkillsHelper";
      skillsHelper = new SkillsHelper(
        pack["Skills"] as SkillsRoot,
        pack["skill-calculations"] as SkillsCalculatorRoot,
        pack["Skills Config"] as SkillsConfig,
      );

      label = "Loading RelicsHelper";
      relicsHelper = new RelicsHelper(
        pack["Relics"] as RelicsDB,
        pack["Relic Inventory Config"] as RelicInventoryConfig,
        pack["Relic Affixes"] as RelicAffixesDB,
      );

      label = "Loading ConstellationsHelper";
      constellationsHelper = new ConstellationsHelper(
        pack["Constellations"] as ConstellationsConfig,
      );

      label = "Loading StatusHelper";
      statusHelper = new StatusHelper(pack["Status"] as StatusDB);

      label = "Preloading PixiJS assets";
      let tmpAsset = new AssetPreloader();
      await tmpAsset.init(constellationsHelper, (pct, lbl) => {
        progress = 90 + pct * 0.1; // 90-100%
        label = lbl;
      });
      assetPreloader = tmpAsset;

      label = "Ready";
      progress = 100;
    } catch (e: any) {
      error = `${String(e?.message ?? e)}`;
    }
  }

  onMount(boot);
  let { children } = $props();
</script>

<div data-theme="dark" class="min-h-screen bg-base-200">
  {#if !ready || error}
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="card w-full max-w-md bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Loading Hell Clock…</h2>
          <p class="opacity-70">
            {label}
          </p>
          {#if error}
            <div class="alert alert-error mt-2">
              <span>{error}</span>
            </div>
            <button
              class="btn btn-primary mt-4"
              onclick={() => location.reload()}>Retry</button
            >
          {:else}
            <progress
              class="progress progress-primary w-full"
              value={progress}
              max="100"
            ></progress>
            <div class="text-right text-xs opacity-50">
              {progress}%
            </div>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="w-5xl mx-auto p-4">
      <AppNavbar />
      <div class="mt-2">
        {@render children?.()}
      </div>
    </div>
  {/if}
</div>

<script lang="ts">
  import { getContext, onMount } from "svelte";
  import type { Engine } from "$lib/engine";
  import type { GamePack, XNode } from "$lib/engine/types";
  import XNodeTree from "$lib/ui/XNodeTree.svelte";
  import { ESlotsType, useEquipped } from "$lib/context/equipped.svelte";
  import type { StatsHelper } from "$lib/hellclock/stats";
  import { translate } from "$lib/hellclock/lang";
  import DisplayStats from "$lib/ui/DisplayStats.svelte";
  import GearSlots from "$lib/ui/GearSlots.svelte";
  import FilterGearSelector from "$lib/ui/FilterGearSelector.svelte";
  import type {
    GearItem,
    GearsHelper,
    GearSlot,
    StatMod,
  } from "$lib/hellclock/gears";
  import { getValueFromMultiplier } from "$lib/hellclock/formats";
  import { fmtValue } from "$lib/hellclock/utils";

  const engine = getContext<Engine>("engine");
  const gamepack = getContext<GamePack>("gamepack");
  const statsHelper = getContext<StatsHelper>("statsHelper");
  const gearsHelper = getContext<GearsHelper>("gearsHelper");
  const blessedSlotsApi = useEquipped(ESlotsType.BlessedGear);
  const trinketSlotsApi = useEquipped(ESlotsType.TrinkedGear);
  const lang = getContext<string>("lang") || "en";

  type PlayerSheet = {
    displayedStats: Partial<
      Record<
        "DamageLabel" | "DefenseLabel" | "VitalityLabel" | "OtherLabel",
        string[]
      >
    >;
  } & Record<string, unknown>;

  let actor = $state<Record<string, unknown> | null>(null);
  let sheet = $state<PlayerSheet | null>(null);
  let evalResult = $state<any>(null);
  let error = $state<string | null>(null);
  let loading = $state(true);

  let showExplain = $state(false);
  let explainLoading = $state(false);
  let explainError = $state<string | null>(null);
  let explainTitle = $state<string>("");
  let explainNode = $state<XNode | null>(null);

  let showGearSelector = $state(false);
  let gearSelectorIsBlessed = $state(true);
  let gearSelectorSlot = $state<GearSlot>("WEAPON");
  let gearSelectorItems = $state<GearItem[]>([]);
  let gearSelectorTitle = $state<string>("Select Gear");

  async function doEvaluate() {
    error = null;
    evalResult = null;
    loading = true;
    try {
      if (!engine) throw new Error("Engine not initialized");
      if (!actor || !sheet) {
        throw new Error("Actor or PlayerSheet not loaded");
      }
      if (!statsHelper) {
        throw new Error("StatsHelper not initialized");
      }

      // TODO: Dont load always the build, that disabled the cache from Engine, do this in the EquippedAPI
      const resActor = await engine.build(
        gamepack["hellclock-actor"] as string,
        { timeoutMs: 5000 },
      );

      if (resActor) {
        error = String((resActor as any)?.error);
        return;
      }

      let set: Record<string, any> = {};

      function mapModForEval(mod: StatMod): string {
        let statName = mod.eStatDefinition;
        let modifierType = mod.modifierType.toLowerCase();
        if (modifierType === "additive") {
          statName = `${statName}.add`;
        } else if (modifierType === "multiplicative") {
          statName = `${statName}.mult`;
        } else if (modifierType === "multiplicativeadditive") {
          statName = `${statName}.multadd`;
        }
        return statName;
      }

      function mapModSource(
        item: GearItem,
        sourceType: string,
        slot: GearSlot,
      ) {
        for (const mod of item.mods) {
          let statName = mapModForEval(mod);
          if (!(statName in set)) {
            set[statName] = [];
          }
          set[statName].push({
            source: `Equipped ${translate(item.prefixLocalizedName, lang)} ${translate(item.localizedName, lang)}`,
            amount: getValueFromMultiplier(
              mod.value,
              mod.modifierType,
              mod.selectedValue!,
              item.multiplierRange[0],
              item.multiplierRange[1],
            ),
            meta: {
              type: sourceType,
              id: String(item.defId),
              slot: slot,
              value: fmtValue(
                mod,
                lang,
                statsHelper,
                item.multiplierRange[0],
                item.multiplierRange[1],
              ),
            },
          });
        }
      }

      let blessedGearEquipped = Object.entries(blessedSlotsApi.equipped);
      let trinketGearEquipped = Object.entries(trinketSlotsApi.equipped);

      blessedGearEquipped.forEach(([key, item]) =>
        mapModSource(item, "Blessed Gear", key as GearSlot),
      );
      trinketGearEquipped.forEach(([key, item]) =>
        mapModSource(item, "Trinket Gear", key as GearSlot),
      );

      let payload: any = {
        set: set,
        outputs: Object.values(sheet?.displayedStats ?? {}).flatMap(
          (v): string[] =>
            Array.isArray(v) ? v : typeof v === "string" ? [v] : [],
        ),
      };

      console.debug("Evaluating with payload:", payload);

      evalResult = await engine.eval(payload, {
        timeoutMs: 5000,
      });

      if (evalResult?.error) {
        error = String(evalResult.error);
        return;
      }
    } catch (e: any) {
      error = String(e?.message ?? e);
    } finally {
      loading = false;
    }
  }

  async function openExplain(stat: string) {
    explainTitle = stat;
    explainLoading = true;
    explainError = null;
    explainNode = null;
    showExplain = true;

    try {
      if (!engine) throw new Error("Engine not initialized");
      const res = (await engine.explain(stat, {
        timeoutMs: 5000,
      })) as any;

      console.debug("Explain result:", res);

      if (res?.error) {
        explainError = String(res.error);
        return;
      }

      explainNode = res as XNode;
    } catch (e: any) {
      explainError = String(e?.message ?? e);
    } finally {
      explainLoading = false;
    }
  }

  function onSlotClicked(blessedGear: boolean, s: GearSlot, remove = false) {
    if (remove) {
      if (blessedGear) {
        blessedSlotsApi.unset(s);
      } else {
        trinketSlotsApi.unset(s);
      }
      doEvaluate();
      return;
    }

    let titleSlot = translate(
      gearsHelper.getGearSlotDefinition(s, blessedGear)?.slotNameKey,
      lang,
    );

    gearSelectorItems = gearsHelper
      .getGearItems(blessedGear, s)
      ?.sort(
        (a, b) =>
          b.tier - a.tier ||
          translate(a.localizedName, lang).localeCompare(
            translate(b.localizedName, lang),
          ),
      );
    gearSelectorIsBlessed = blessedGear;
    gearSelectorSlot = s;
    gearSelectorTitle = `Select ${titleSlot}(${s})`;
    showGearSelector = true;
  }

  onMount(async () => {
    actor = gamepack["hellclock-actor"] as Record<string, unknown> | null;
    sheet = gamepack["Player Sheet"] as PlayerSheet | null;

    await doEvaluate();
  });
</script>

<div class="grid gap-4 lg:grid-cols-6">
  <div class="flex flex-col gap-4 col-span-2">
    <div class="card card-xs shadow-sm bg-base-100">
      <div class="card-body">
        <div role="tablist" class="tabs tabs-box tabs-sm">
          <button role="tab" class="tab tab-active" aria-selected="true">
            Stats
          </button>
          <button
            role="tab"
            class="indicator tab tab-disabled"
            aria-disabled="true"
            >Calculations
            <span class="indicator-item badge badge-secondary">Soon</span>
          </button>
        </div>
      </div>
    </div>
    <DisplayStats {evalResult} {loading} {error} {sheet} {openExplain} />
  </div>
  <div class="col-span-2">
    <GearSlots
      blessedGear={true}
      title="Gear"
      equipped={blessedSlotsApi.equipped}
      {onSlotClicked}
    />
  </div>
  <div class="col-span-2">
    <GearSlots
      blessedGear={false}
      title="Trinket"
      equipped={trinketSlotsApi.equipped}
      {onSlotClicked}
    />
  </div>
</div>

<dialog class="modal" open={showExplain}>
  <div class="modal-box max-w-4xl">
    <h3 class="font-bold text-lg flex items-center gap-2">
      Explain: {explainTitle}
    </h3>

    {#if explainLoading}
      <div class="mt-4 space-y-2">
        <div class="skeleton h-5 w-1/2"></div>
        <div class="skeleton h-5 w-2/3"></div>
        <div class="skeleton h-5 w-1/3"></div>
      </div>
    {:else if explainError}
      <div class="alert alert-error mt-4">
        <span>{explainError}</span>
      </div>
    {:else if explainNode}
      <div class="mt-4 overflow-y-auto max-h-96">
        <XNodeTree node={explainNode} />
      </div>
    {:else}
      <p class="mt-4 opacity-70">No explanation returned.</p>
    {/if}

    <div class="modal-action">
      <form method="dialog">
        <button class="btn" onclick={() => (showExplain = false)}>Close</button>
      </form>
    </div>
  </div>

  <form method="dialog" class="modal-backdrop">
    <button aria-label="Close" onclick={() => (showExplain = false)}
      >close</button
    >
  </form>
</dialog>
<dialog class="modal" open={showGearSelector}>
  <div class="modal-box max-w-4xl p-0 h-3/4 flex flex-col">
    <div class="grow overflow-y-hidden">
      {#if showGearSelector}
        <FilterGearSelector
          items={gearSelectorItems}
          onEquip={(item) => {
            if (gearSelectorIsBlessed) {
              blessedSlotsApi.set(gearSelectorSlot, item);
            } else {
              trinketSlotsApi.set(gearSelectorSlot, item);
            }
            showGearSelector = false;
            doEvaluate();
          }}
          title={gearSelectorTitle}
        />
      {/if}
    </div>
    <div class="divider my-0 px-6 pt-2"></div>
    <div class="modal-action px-6 my-6 shrink">
      <form method="dialog">
        <button class="btn" onclick={() => (showGearSelector = false)}
          >Close</button
        >
      </form>
    </div>
  </div>

  <form method="dialog" class="modal-backdrop">
    <button aria-label="Close" onclick={() => (showGearSelector = false)}
      >close</button
    >
  </form>
</dialog>

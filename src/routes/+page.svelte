<script lang="ts">
  import { getContext, onMount } from "svelte";
  import type { ExplainPayload } from "$lib/engine/types";
  import XNodeTree from "$lib/ui/XNodeTree.svelte";
  import PhaseDebugView from "$lib/ui/PhaseDebugView.svelte";
  import { ESlotsType, useEquipped } from "$lib/context/equipped.svelte";
  import { translate } from "$lib/hellclock/lang";
  import FilterGearSelector from "$lib/ui/FilterGearSelector.svelte";
  import type { GearItem, GearsHelper, GearSlot } from "$lib/hellclock/gears";
  import { useSkillEquipped } from "$lib/context/skillequipped.svelte";
  import type {
    SkillSelected,
    SkillsHelper,
    SkillSlotDefinition,
  } from "$lib/hellclock/skills";
  import FilterSkillSelector from "$lib/ui/FilterSkillSelector.svelte";
  import { useEvaluationManager } from "$lib/context/evaluation.svelte";
  import FilterRelicSelector from "$lib/ui/FilterRelicSelector.svelte";
  import type { RelicItem } from "$lib/hellclock/relics";
  import { useRelicInventory } from "$lib/context/relicequipped.svelte";

  // Import new components
  import AppSidebar from "$lib/ui/AppSidebar.svelte";
  import HomeView from "$lib/ui/views/HomeView.svelte";
  import StatsView from "$lib/ui/views/StatsView.svelte";
  import GearView from "$lib/ui/views/GearView.svelte";
  import SkillsView from "$lib/ui/views/SkillsView.svelte";
  import RelicsView from "$lib/ui/views/RelicsView.svelte";
  import ConstellationsView from "$lib/ui/views/ConstellationsView.svelte";
  import BellView from "$lib/ui/views/BellView.svelte";
  import BlessingView from "$lib/ui/views/BlessingView.svelte";
  import ConfigView from "$lib/ui/views/ConfigView.svelte";

  const gearsHelper = getContext<GearsHelper>("gearsHelper");
  const skillsHelper = getContext<SkillsHelper>("skillsHelper");

  const blessedSlotsApi = useEquipped(ESlotsType.BlessedGear);
  const trinketSlotsApi = useEquipped(ESlotsType.TrinkedGear);
  const skillSlotsApi = useSkillEquipped();
  const relicInventoryApi = useRelicInventory();
  const evaluationManager = useEvaluationManager();
  const lang = getContext<string>("lang") || "en";

  // New navigation state
  let activeSection = $state<string>("home");
  let sidebarCollapsed = $state(false);

  // Load sidebar collapsed state from localStorage
  onMount(() => {
    const savedCollapsed = localStorage.getItem("sidebarCollapsed");
    if (savedCollapsed !== null) {
      sidebarCollapsed = savedCollapsed === "true";
    }
  });

  // Save sidebar collapsed state to localStorage
  $effect(() => {
    localStorage.setItem("sidebarCollapsed", String(sidebarCollapsed));
  });

  let showExplain = $state(false);
  let explainLoading = $state(false);
  let explainError = $state<string | null>(null);
  let explainTitle = $state<string>("");
  let explainData = $state<ExplainPayload | null>(null);
  let activeExplainTab = $state<"phases" | "debug">("phases");
  let expandAll = $state<boolean | null>(null);

  let showGearSelector = $state(false);
  let gearSelectorIsBlessed = $state(true);
  let gearSelectorSlot = $state<GearSlot>("WEAPON");
  let gearSelectorItems = $state<GearItem[]>([]);
  let gearSelectorTitle = $state<string>("Select Gear");

  let showSkillSelector = $state(false);
  let skillSelectorSlot = $state<SkillSlotDefinition>("SKILL_SLOT_1");
  let skillSelectorItems = $state<SkillSelected[]>([]);

  let showRelicSelector = $state(false);
  let relicSelectorPosition = $state<{ x: number; y: number }>({ x: 0, y: 0 });
  let relicSelectorAvailableSpace = $state<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  let relicSelectorTitle = $state<string>("Select Relic");

  // The doEvaluate function has been replaced by the EvaluationManager context
  // All evaluation is now handled automatically when equipment changes

  // Helper function to format stat names for display
  function formatStatName(stat: string): string {
    return stat
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
      .replace(/([a-z])([A-Z])/g, "$1 $2"); // Add space before capital letters
  }

  async function openExplain(stat: string) {
    explainTitle = stat;
    explainLoading = true;
    explainError = null;
    explainData = null;
    activeExplainTab = "phases";
    showExplain = true;

    try {
      explainData = await evaluationManager.explain(stat);
    } catch (e: unknown) {
      explainError = String((e as Error)?.message ?? e);
    } finally {
      explainLoading = false;
    }
  }

  function onSlotClicked(s: GearSlot, blessedGear: boolean, remove = false) {
    if (remove) {
      if (blessedGear) {
        blessedSlotsApi.unset(s);
      } else {
        trinketSlotsApi.unset(s);
      }
      // Evaluation will happen automatically via EvaluationManager context
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

  function onSkillSlotClicked(s: SkillSlotDefinition, remove = false) {
    if (remove) {
      skillSlotsApi.unset(s);
      // Evaluation will happen automatically via EvaluationManager context
      return;
    }

    let skillsSetted = Object.values(skillSlotsApi.skillsEquipped)
      .filter((sk) => sk)
      .map((sk) => sk!.skill.id);
    skillSelectorSlot = s;
    skillSelectorItems = skillsHelper
      .getAllSkillDefinitions()
      .filter((sk) => !skillsSetted.includes(sk.id))
      .map((sk) => {
        return { skill: { ...sk }, selectedLevel: 0 } as SkillSelected;
      });
    showSkillSelector = true;
  }

  function onSkillSelected(skill: SkillSelected) {
    skillSlotsApi.set(skillSelectorSlot, skill);
    showSkillSelector = false;
    // Evaluation will happen automatically via EvaluationManager context
  }

  function onRelicSlotClicked(
    x: number,
    y: number,
    availableSpace: { width: number; height: number },
  ) {
    relicSelectorPosition = { x, y };
    relicSelectorAvailableSpace = availableSpace;
    relicSelectorTitle = `Select Relic (${availableSpace.width}×${availableSpace.height} space)`;
    showRelicSelector = true;
  }

  function onRelicSelected(relic: RelicItem) {
    relicInventoryApi.placeRelic(
      relic,
      relicSelectorPosition.x,
      relicSelectorPosition.y,
    );
    showRelicSelector = false;
    // Evaluation will happen automatically via EvaluationManager context
  }

  // Keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    // Only handle shortcuts when no modal is open and no input is focused
    if (
      showExplain ||
      showGearSelector ||
      showSkillSelector ||
      showRelicSelector
    )
      return;
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    )
      return;

    const isMod = event.ctrlKey || event.metaKey;
    if (!isMod) return;

    switch (event.key.toLowerCase()) {
      case "h":
        event.preventDefault();
        activeSection = "home";
        break;
      case "s":
        event.preventDefault();
        activeSection = "stats";
        break;
      case "g":
        event.preventDefault();
        activeSection = "gear";
        break;
      case "k":
        event.preventDefault();
        activeSection = "skills";
        break;
      case "r":
        event.preventDefault();
        activeSection = "relics";
        break;
      case "c":
        event.preventDefault();
        activeSection = "constellation";
        break;
      case "[":
        event.preventDefault();
        sidebarCollapsed = !sidebarCollapsed;
        break;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="flex h-screen bg-base-200">
  <!-- Sidebar -->
  <AppSidebar bind:activeSection bind:collapsed={sidebarCollapsed} />

  <!-- Main Content Area -->
  <main
    class="flex-1 overflow-y-auto transition-all duration-300 p-6"
    style="margin-left: {sidebarCollapsed ? '65px' : '200px'}"
  >
    {#if activeSection === "home"}
      <HomeView bind:activeSection />
    {:else if activeSection === "stats"}
      <StatsView onOpenExplain={openExplain} />
    {:else if activeSection === "gear"}
      <GearView {onSlotClicked} />
    {:else if activeSection === "skills"}
      <SkillsView {onSkillSlotClicked} onOpenExplain={openExplain} />
    {:else if activeSection === "relics"}
      <RelicsView {onRelicSlotClicked} />
    {:else if activeSection === "constellation"}
      <ConstellationsView onClose={() => (activeSection = "home")} />
    {:else if activeSection === "config"}
      <ConfigView />
    {:else if activeSection === "bell"}
      <BellView onClose={() => (activeSection = "home")} />
    {:else if activeSection === "blessing"}
      <BlessingView />
    {/if}
  </main>
</div>

<dialog class="modal" open={showExplain}>
  <div class="modal-box max-w-5xl h-[90vh] flex flex-col">
    <h3 class="font-bold text-lg flex items-center gap-2">
      Explain: {formatStatName(explainTitle)}
    </h3>

    {#if explainLoading}
      <div class="mt-4 space-y-2">
        <div class="skeleton h-5 w-1/2"></div>
        <div class="skeleton h-5 w-2/3"></div>
        <div class="skeleton h-5 w-1/3"></div>
      </div>
    {:else if explainError}
      <div class="alert alert-soft alert-error mt-4">
        <span>{explainError}</span>
      </div>
    {:else if explainData}
      <div class="mt-4 flex-1 flex flex-col min-h-0">
        <!-- Summary -->
        <div class="mb-4 p-3 bg-base-200 rounded-lg">
          <h4 class="font-semibold text-sm mb-2">Summary</h4>
          <p class="text-lg font-mono">Final Value: {explainData.value}</p>
          <p class="text-sm text-base-content/70 mt-1">
            Calculation: {formatStatName(explainTitle)} stat evaluation
          </p>
        </div>

        <!-- Tabs for Human vs Debug view -->
        <div role="tablist" class="tabs tabs-boxed mb-4">
          <button
            role="tab"
            class="tab {activeExplainTab === 'phases' ? 'tab-active' : ''}"
            onclick={() => (activeExplainTab = "phases")}
          >
            Phase View
          </button>
          <button
            role="tab"
            class="tab {activeExplainTab === 'debug' ? 'tab-active' : ''}"
            onclick={() => (activeExplainTab = "debug")}
          >
            Debug Details
          </button>
        </div>

        <!-- Phase View -->
        {#if activeExplainTab === "phases"}
          <div class="overflow-y-auto flex-1 min-h-0">
            <PhaseDebugView node={explainData.debug} />
          </div>
        {/if}

        <!-- Debug View -->
        {#if activeExplainTab === "debug"}
          <div class="flex-1 flex flex-col min-h-0 space-y-2">
            <div class="flex gap-2">
              <button
                class="btn btn-sm btn-outline"
                onclick={() => (expandAll = true)}
              >
                Expand All
              </button>
              <button
                class="btn btn-sm btn-outline"
                onclick={() => (expandAll = false)}
              >
                Collapse All
              </button>
            </div>
            <div class="overflow-y-auto flex-1 min-h-0">
              <XNodeTree node={explainData.debug} {expandAll} />
            </div>
          </div>
        {/if}
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
  <div class="modal-box max-w-5xl p-0 h-full flex flex-col">
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
            // Evaluation will happen automatically via EvaluationManager context
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
<dialog class="modal" open={showSkillSelector}>
  <div class="modal-box max-w-5xl p-0 h-full flex flex-col">
    <div class="grow overflow-y-hidden">
      {#if showSkillSelector}
        <FilterSkillSelector skills={skillSelectorItems} {onSkillSelected} />
      {/if}
    </div>
    <div class="divider my-0 px-6 pt-2"></div>
    <div class="modal-action px-6 my-6 shrink">
      <form method="dialog">
        <button class="btn" onclick={() => (showSkillSelector = false)}
          >Close</button
        >
      </form>
    </div>
  </div>

  <form method="dialog" class="modal-backdrop">
    <button aria-label="Close" onclick={() => (showSkillSelector = false)}
      >close</button
    >
  </form>
</dialog>
<dialog class="modal" open={showRelicSelector}>
  <div class="modal-box max-w-5xl p-0 h-full flex flex-col">
    <div class="flex flex-col grow overflow-y-hidden">
      {#if showRelicSelector}
        <FilterRelicSelector
          title={relicSelectorTitle}
          availableSpace={relicSelectorAvailableSpace}
          {onRelicSelected}
        />
      {/if}
    </div>
    <div class="divider my-0 px-6 pt-2"></div>
    <div class="modal-action px-6 my-6 shrink">
      <form method="dialog">
        <button class="btn" onclick={() => (showRelicSelector = false)}
          >Close</button
        >
      </form>
    </div>
  </div>

  <form method="dialog" class="modal-backdrop">
    <button aria-label="Close" onclick={() => (showRelicSelector = false)}
      >close</button
    >
  </form>
</dialog>

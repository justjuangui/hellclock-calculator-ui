<script lang="ts">
  import { getContext, onMount } from "svelte";
  import type { ExplainPayload } from "$lib/engine/types";
  import XNodeTree from "$lib/ui/XNodeTree.svelte";
  import { ESlotsType, useEquipped } from "$lib/context/equipped.svelte";
  import { translate } from "$lib/hellclock/lang";
  import DisplayStats from "$lib/ui/DisplayStats.svelte";
  import GearSlots from "$lib/ui/GearSlots.svelte";
  import FilterGearSelector from "$lib/ui/FilterGearSelector.svelte";
  import type { GearItem, GearsHelper, GearSlot } from "$lib/hellclock/gears";
  import SkillSlots from "$lib/ui/SkillSlots.svelte";
  import { useSkillEquipped } from "$lib/context/skillequipped.svelte";
  import type {
    SkillSelected,
    SkillsHelper,
    SkillSlotDefinition,
  } from "$lib/hellclock/skills";
  import FilterSkillSelector from "$lib/ui/FilterSkillSelector.svelte";
  import DisplaySkills from "$lib/ui/DisplaySkills.svelte";
  import { useEvaluationManager } from "$lib/context/evaluation.svelte";

  const gearsHelper = getContext<GearsHelper>("gearsHelper");
  const skillsHelper = getContext<SkillsHelper>("skillsHelper");

  const blessedSlotsApi = useEquipped(ESlotsType.BlessedGear);
  const trinketSlotsApi = useEquipped(ESlotsType.TrinkedGear);
  const skillSlotsApi = useSkillEquipped();
  const evaluationManager = useEvaluationManager();
  const lang = getContext<string>("lang") || "en";

  const leftOptions = [
    { name: "Stats", soon: false },
    { name: "Calculations", soon: true },
  ];
  const rightOptions = [
    { name: "Gear", soon: false },
    { name: "Skills", soon: false },
    { name: "Relics", soon: true },
    { name: "Constellation", soon: true },
    { name: "Bell", soon: true },
  ];

  let selectedLeft = $state(leftOptions[0]);
  let selectedRight = $state(rightOptions[0]);

  // Check if any skills are equipped to control Skills tab availability
  const hasSkills = $derived(skillSlotsApi.activeSkills.length > 0);

  // Auto-switch from Skills tab to Gear tab when all skills are removed
  $effect(() => {
    if (selectedRight.name === "Skills" && !hasSkills) {
      // Find Gear tab and switch to it
      const gearTab = rightOptions.find(opt => opt.name === "Gear");
      if (gearTab) {
        selectedRight = gearTab;
      }
    }
  });

  let showExplain = $state(false);
  let explainLoading = $state(false);
  let explainError = $state<string | null>(null);
  let explainTitle = $state<string>("");
  let explainData = $state<ExplainPayload | null>(null);
  let activeExplainTab = $state<'human' | 'debug'>('human');

  // Function to parse indentation from human-readable lines
  const parseHumanLine = (line: string) => {
    const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
    const indentLevel = Math.floor(leadingSpaces / 2); // Every 2 spaces = 1 indent level
    const content = line.trim();
    return { indentLevel, content };
  };

  let showGearSelector = $state(false);
  let gearSelectorIsBlessed = $state(true);
  let gearSelectorSlot = $state<GearSlot>("WEAPON");
  let gearSelectorItems = $state<GearItem[]>([]);
  let gearSelectorTitle = $state<string>("Select Gear");

  let showSkillSelector = $state(false);
  let skillSelectorSlot = $state<SkillSlotDefinition>("SKILL_SLOT_1");
  let skillSelectorItems = $state<SkillSelected[]>([]);

  // The doEvaluate function has been replaced by the EvaluationManager context
  // All evaluation is now handled automatically when equipment changes

  async function openExplain(stat: string) {
    explainTitle = stat;
    explainLoading = true;
    explainError = null;
    explainData = null;
    activeExplainTab = 'human';
    showExplain = true;

    try {
      explainData = await evaluationManager.explain(stat);
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
        return { skill: { ...sk }, selectedLevel: 7 } as SkillSelected;
      });
    showSkillSelector = true;
  }

  function onSkillSelected(skill: SkillSelected) {
    skillSlotsApi.set(skillSelectorSlot, skill);
    showSkillSelector = false;
    // Evaluation will happen automatically via EvaluationManager context
  }

  onMount(async () => {
    // Initialization is now handled by the EvaluationManager context
    // No manual evaluation needed as it's automatic when equipment is loaded
  });
</script>

<div class="grid gap-2 lg:grid-cols-6">
  <div class="card card-xs shadow-sm bg-base-100 col-span-2">
    <div class="card-body">
      <div role="tablist" class="tabs tabs-box tabs-sm">
        {#each leftOptions as opt}
          <button
            role="tab"
            class={` indicator tab ${selectedLeft.name === opt.name ? "tab-active" : ""} ${opt.soon ? "tab-disabled" : ""}`}
            onclick={() => {
              if (!opt.soon) selectedLeft = opt;
            }}
            aria-selected={selectedLeft.name === opt.name}
            aria-disabled={opt.soon}
            title={opt.soon ? "Coming soon" : opt.name}
          >
            {opt.name}
            {#if opt.soon}
              <span class="indicator-item status status-error"></span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  </div>
  <div class="card card-xs shadow-sm bg-base-100 col-span-4">
    <div class="card-body">
      <div role="tablist" class="tabs tabs-box tabs-sm">
        {#each rightOptions as opt}
          <button
            role="tab"
            class={`indicator tab ${selectedRight.name === opt.name ? "tab-active" : ""} ${opt.soon || (opt.name === "Skills" && !hasSkills) ? "tab-disabled" : ""}`}
            onclick={() => {
              if (!opt.soon && !(opt.name === "Skills" && !hasSkills)) {
                selectedRight = opt;
              }
            }}
            aria-selected={selectedRight.name === opt.name}
            aria-disabled={opt.soon || (opt.name === "Skills" && !hasSkills)}
            title={opt.soon ? "Coming soon" : (opt.name === "Skills" && !hasSkills) ? "No skills equipped" : opt.name}
          >
            {opt.name}
            {#if opt.soon}
              <span class="indicator-item status status-error"></span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  </div>
  <div class="flex flex-col gap-2 col-span-2">
    <DisplayStats {openExplain} />
  </div>
  <div class="col-span-4">
    <div class="grid gap-2 lg:grid-cols-6">
      {#if ["Gear", "Skills"].includes(selectedRight.name)}
        <div class="col-span-6">
          <SkillSlots
            equipped={skillSlotsApi.skillsEquipped}
            {onSkillSlotClicked}
          />
        </div>
      {/if}
      {#if selectedRight.name == "Skills"}
        <div class="col-span-6">
          <DisplaySkills {openExplain} />
        </div>
      {/if}
      {#if selectedRight.name == "Gear"}
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
      {/if}
    </div>
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
      <div class="alert alert-soft alert-error mt-4">
        <span>{explainError}</span>
      </div>
    {:else if explainData}
      <div class="mt-4">
        <!-- Summary -->
        <div class="mb-4 p-3 bg-base-200 rounded-lg">
          <h4 class="font-semibold text-sm mb-2">Summary</h4>
          <p class="text-sm">{explainData.summary}</p>
          <p class="text-lg font-mono mt-2">Final Value: {explainData.value}</p>
        </div>

        <!-- Tabs for Human vs Debug view -->
        <div role="tablist" class="tabs tabs-boxed mb-4">
          <button
            role="tab"
            class="tab {activeExplainTab === 'human' ? 'tab-active' : ''}"
            onclick={() => activeExplainTab = 'human'}
          >
            Human Readable
          </button>
          <button
            role="tab"
            class="tab {activeExplainTab === 'debug' ? 'tab-active' : ''}"
            onclick={() => activeExplainTab = 'debug'}
          >
            Debug Details
          </button>
        </div>

        <!-- Human Readable View -->
        {#if activeExplainTab === 'human'}
          <div class="overflow-y-auto max-h-96">
            <div class="font-mono text-sm space-y-2">
              {#each explainData.human as line}
                {@const parsed = parseHumanLine(line)}
                <div
                  class="py-2 leading-relaxed border-l-2 {parsed.indentLevel > 0 ? 'border-gray-300' : 'border-transparent'} {parsed.indentLevel > 0 ? 'bg-base-50' : ''} rounded-r-md relative group"
                  style="padding-left: {0.75 + (parsed.indentLevel * 1.2)}rem; margin-left: {parsed.indentLevel * 0.3}rem"
                >
                  <span
                    class="block truncate whitespace-nowrap {parsed.indentLevel === 0 ? 'font-semibold text-base-content' :
                           parsed.indentLevel === 1 ? 'font-medium text-base-content opacity-90' :
                           parsed.indentLevel === 2 ? 'text-base-content opacity-80' :
                           'text-base-content opacity-70'}"
                    title={parsed.content}
                  >{parsed.content}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Debug View -->
        {#if activeExplainTab === 'debug'}
          <div class="overflow-y-auto max-h-96">
            <XNodeTree node={explainData.debug} />
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
  <div class="modal-box max-w-4xl p-0 h-3/4 flex flex-col">
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

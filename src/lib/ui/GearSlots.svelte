<script lang="ts">
  import { getContext, onMount } from "svelte";
  import type { GearsHelper, GearSlot, GearItem } from "$lib/hellclock/gears";
  import { translate } from "$lib/hellclock/lang";
  import type { StatsHelper } from "$lib/hellclock/stats";
  import {
    parseRGBA01ToCss,
    prettySlot,
    spriteUrl,
  } from "$lib/hellclock/utils";
  import MouseTooltip from "./MouseTooltip.svelte";
  import GameTooltip from "./GameTooltip.svelte";
  import { mouseTooltip, type MouseTooltipState } from "$lib/actions/mouseTooltip";

  let { blessedGear, equipped, onSlotClicked } = $props();
  const lang = getContext<string>("lang") || "en";

  const statsHelper = getContext<StatsHelper>("statsHelper");
  const gearsHelper = getContext<GearsHelper>("gearsHelper");
  let allSlots = $state<GearSlot[]>([]);
  let slotLabel = $derived.by<Record<GearSlot, string>>(() => {
    const labels: Partial<Record<GearSlot, string>> = {};
    for (const s of allSlots) {
      let slotNameKey = gearsHelper.getGearSlotDefinition(
        s,
        blessedGear,
      )?.slotNameKey;
      if (!slotNameKey) {
        console.warn(`Missing slot definition for ${s}`);
        continue;
      }
      let translatedName = translate(slotNameKey, lang);
      labels[s] = translatedName || prettySlot(s);
    }
    return labels as Record<GearSlot, string>;
  });

  const defaultOrder: GearSlot[] = [
    "WEAPON",
    "RING_LEFT",
    "RING_RIGHT",
    "HELMET",
    "ARMOR",
    "SHOULDERS",
    "BRACERS",
    "PANTS",
    "BOOTS",
    "CAPE",
    "ACCESSORY",
    "TRINKET",
  ];

  onMount(() => {
    const sdefs = gearsHelper.getGearSlotsDefinitions(blessedGear);
    const unique = Array.from(new Set(sdefs.map((s) => s.slot))) as GearSlot[];

    allSlots = defaultOrder.filter((s) => unique.includes(s) as boolean);
    if (!allSlots.length) allSlots = unique;
  });

  // Tooltip state tracking
  let activeTooltip = $state<{
    slot: GearSlot;
    item: GearItem;
    state: MouseTooltipState;
  } | null>(null);

  function handleTooltipState(slot: GearSlot, item: GearItem) {
    return (state: MouseTooltipState) => {
      if (state.visible) {
        activeTooltip = { slot, item, state };
      } else if (activeTooltip?.slot === slot) {
        activeTooltip = null;
      }
    };
  }
</script>

<div>
  <p class="text-xs opacity-70 mb-3">
    Click a slot to browse and equip items, to remove just click once again. Hover to see details.
  </p>
  <div class="grid grid-cols-3 gap-1">
      {#each allSlots as s, i (i)}
        <div
          role="button"
          tabindex="0"
          aria-label={slotLabel[s]}
          class={`relative cursor-pointer aspect-square rounded border-2 flex items-center justify-center transition-colors ${equipped[s]?.color ? "border-[var(--color)] bg-[var(--color)]/10" : "border-base-300 bg-base-200 hover:bg-base-100"}`}
          style={`--color: ${equipped[s]?.color ? parseRGBA01ToCss(equipped[s]!.color) : "transparent"}`}
          use:mouseTooltip={{
            onStateChange: handleTooltipState(s, equipped[s]),
            enabled: !!equipped[s]
          }}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onSlotClicked(blessedGear, s, equipped[s] ? true : false);
              e.preventDefault();
            }
          }}
          onclick={() =>
            onSlotClicked(blessedGear, s, equipped[s] ? true : false)}
        >
          {#if equipped[s]?.sprite}
            <img
              src={spriteUrl(equipped[s]?.sprite)}
              alt={translate(equipped[s]?.localizedName, lang)}
              class="h-10 w-10 object-contain"
            />
          {:else}
            <span class="text-xs opacity-60 text-center px-1"
              >{slotLabel[s]}</span
            >
          {/if}
          {#if equipped[s]}
            <span
              class="badge border-[var(--color)] badge-xs absolute -top-1 -right-1"
              >T{equipped[s]!.tier}</span
            >
          {/if}
        </div>
      {/each}
  </div>

  <!-- Mouse-following tooltip portal -->
  <MouseTooltip
    visible={!!activeTooltip}
    mouseX={activeTooltip?.state.mouseX ?? 0}
    mouseY={activeTooltip?.state.mouseY ?? 0}
    placement="right"
  >
    {#if activeTooltip}
      <GameTooltip
        lines={gearsHelper.getTooltipLines(activeTooltip.item, lang, statsHelper)}
      />
    {/if}
  </MouseTooltip>
</div>

<script lang="ts">
  import { getContext, onMount } from "svelte";
  import type { GearsHelper, GearSlot } from "$lib/hellclock/gears";
  import { translate } from "$lib/hellclock/lang";
  import type { StatsHelper } from "$lib/hellclock/stats";
  import {
    parseRGBA01ToCss,
    prettySlot,
    spriteUrl,
    tooltipText,
  } from "$lib/hellclock/utils";

  let { blessedGear, title, equipped, onSlotClicked } = $props();
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
</script>

<div class="card bg-base-100 shadow">
  <div class="card-body">
    <h3 class="card-title">{title}</h3>
    <p class="text-sm opacity-70">
      Click a slot to browse and equip items. Hover to see details.
    </p>
    <div class="mt-4 grid grid-cols-3 gap-3">
      {#each allSlots as s}
        <div
          role="button"
          tabindex="0"
          aria-label={slotLabel[s]}
          class={`relative cursor-pointer aspect-square rounded-box border flex items-center justify-center ${equipped[s]?.color ? "border-[var(--color)]" : "border-base-300"} bg-base-200 hover:bg-base-300 transition`}
          style={`--color: ${equipped[s]?.color ? parseRGBA01ToCss(equipped[s]!.color) : "transparent"}`}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onSlotClicked(blessedGear, s);
              e.preventDefault();
            }
          }}
          onclick={() => onSlotClicked(blessedGear, s)}
        >
          {#if equipped[s]?.sprite}
            <img
              src={spriteUrl(equipped[s]?.sprite)}
              alt={translate(equipped[s]?.localizedName, lang)}
              class="h-12 w-12 object-contain drop-shadow"
            />
          {:else}
            <span class="text-xs opacity-60 text-center px-1"
              >{slotLabel[s]}</span
            >
          {/if}
          <div class="tooltip absolute inset-0">
            <div class="tooltip-content">
              {#each tooltipText(equipped[s], lang, statsHelper) as line}
                <p class="text-xs">{line}</p>
              {/each}
            </div>
          </div>
          {#if equipped[s]}
            <span
              class="badge border-[var(--color)] badge-sm absolute -top-1 -right-1"
              >T{equipped[s]!.tier}</span
            >
            <button
              class="btn btn-circle absolute text-[var(--color)] bottom-1 right-1"
              onclick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSlotClicked(blessedGear, s, true);
              }}
            >
              <!-- Trash icon (inline SVG) -->
              <svg
                class="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

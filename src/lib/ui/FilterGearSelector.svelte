<script lang="ts">
  import type { GearItem } from "$lib/hellclock/gears";
  import { translate } from "$lib/hellclock/lang";
  import type { StatsHelper } from "$lib/hellclock/stats";
  import {
    fmtValue,
    parseRGBA01ToCss,
    prettySlot,
    spriteUrl,
  } from "$lib/hellclock/utils";
  import { getContext } from "svelte";

  interface Props {
    title: string;
    items: GearItem[];
    onEquip: (item: GearItem) => void;
  }

  const statsHelper = getContext<StatsHelper>("statsHelper");
  const lang = getContext<string>("lang") || "en";
  const { title, items, onEquip }: Props = $props();

  let search = $state("");
  let scroller: HTMLDivElement | null = null;

  function matches(i: GearItem, q: string): boolean {
    scroller?.scrollTo({ top: 0 });
    if (!q) return true;
    q = q.toLowerCase();
    return (
      translate(i.localizedName, lang).toLowerCase().includes(q) ||
      i.mods.some(
        (m) =>
          statsHelper
            .getLabelForStat(m.eStatDefinition, lang)
            .toLowerCase()
            .includes(q) || m.eStatDefinition.toLowerCase().includes(q),
      )
    );
  }

  $effect(() => {
    if (scroller) {
      scroller.scrollTo({ top: 0 });
    }
  });
</script>

<div class="flex flex-col h-full px-6 pt-6">
  <div class="flex items-center justify-between gap-3">
    <h3 class="card-title">
      {title} Items
    </h3>
    <input
      class="input input-bordered input-sm w-56"
      placeholder="Search…"
      bind:value={search}
    />
  </div>
  <div class="divider my-2"></div>
  <div class="overflow-y-auto overflow-x-hidden grow" bind:this={scroller}>
    {#if (items.length ?? 0) === 0}
      <p class="mt-4 opacity-70">No items available for this slot.</p>
    {:else}
      <div class="mt-4 grid gap-3 grid-cols-2 pr-4">
        {#each (items ?? []).filter((i) => matches(i, search)) as item}
          <div
            class="card bg-base-200 hover:bg-base-300 transition border-2 border-[var(--color)]"
            style={`--color: ${parseRGBA01ToCss(item.color)}`}
            aria-label={`Equip ${translate(item.localizedName, lang)}`}
          >
            <div class="card-body p-3 gap-2 flex">
              <div class="flex items-center gap-2 flex-none">
                {#if item.sprite}
                  <img
                    src={spriteUrl(item.sprite)}
                    alt={translate(item.localizedName, lang)}
                    class="h-10 w-10 object-contain drop-shadow"
                  />
                {:else}
                  <div
                    class="h-10 w-10 rounded bg-base-300 flex items-center justify-center text-xs"
                  >
                    N/A
                  </div>
                {/if}
                <div class="min-w-0">
                  <div
                    class="font-medium truncate text-[var(--color)]"
                    style={parseRGBA01ToCss(item.color)}
                  >
                    {translate(item.localizedName, lang)}
                  </div>
                  <div class="text-xs opacity-70">
                    T{item.tier}
                    ·
                    {prettySlot(item.slot)}
                  </div>
                </div>
              </div>

              <!-- stat lines -->
              <div class="text-xs mt-1 space-y-1 flex flex-col flex-1 justify-stretch">
                {#each item.mods as m}
                  <div class="badge badge-soft badge-accent truncate w-full flex">
                    <div class="grow">{fmtValue(m, lang, statsHelper, item.multiplierRange[0], item.multiplierRange[1])}</div>
                    <input type="range" min={item.multiplierRange[0]} max={item.multiplierRange[1]} bind:value={m.selectedValue} step="any" class="range range-xs w-[100px]" />
                  </div>
                {/each}
                {#if item.mods.length === 0}
                  <div class="opacity-60">No modifiers</div>
                {/if}
              </div>

              <div class="mt-1 flex items-center gap-2 text-[11px] opacity-70">
                {#if item.sellingValue}<span
                    >Sell:
                    {item.sellingValue}</span
                  >{/if}
                {#if item.gearShopCost}<span
                    >Shop:
                    {item.gearShopCost}</span
                  >{/if}
                {#if item.blessingPrice}<span
                    >Bless:
                    {item.blessingPrice}</span
                  >{/if}
              </div>

              <div class="mt-1">
                <button
                  onclick={() => onEquip(item)}
                  class="btn btn-outline btn-sm w-full border-[var(--color)]">Equip</button
                >
              </div>
            </div>
          </div>
        {:else}
          <p class="mt-4 opacity-70">No items match your search.</p>
        {/each}
      </div>
    {/if}
  </div>
</div>

<script lang="ts">
  import { getContext } from "svelte";
  import type { RelicRarity, RelicsHelper } from "$lib/hellclock/relics";
  import { useRelicInventory, type RelicItemWithPosition } from "$lib/context/relicequipped.svelte";
  import {
    parseRGBA01ToCss,
  } from "$lib/hellclock/utils";
  import type { StatsHelper } from "$lib/hellclock/stats";
  import GameTooltip from "./GameTooltip.svelte";
  import MouseTooltip from "./MouseTooltip.svelte";
  import { mouseTooltip, type MouseTooltipState } from "$lib/actions/mouseTooltip";
  import type { SkillsHelper } from "$lib/hellclock/skills";

  interface Props {
    onRelicSlotClicked?: (
      x: number,
      y: number,
      availableSpace: { width: number; height: number },
    ) => void;
  }

  const relicsHelper = getContext<RelicsHelper>("relicsHelper");
  const statsHelper = getContext<StatsHelper>("statsHelper");
  const skillsHelper = getContext<SkillsHelper>("skillsHelper");
  const lang = getContext<string>("lang") || "en";
  const relicInventory = useRelicInventory();

  // Grid dimensions from relic config (7x6)
  const GRID_WIDTH = 7;
  const GRID_HEIGHT = 6;
  const CELL_SIZE = 48; // Larger 32px cells for better visibility

  // Get current inventory shape
  const currentShape = $derived(relicInventory.getCurrentShape());

  // Create reactive trigger for relics Map changes
  const _occupiedPositions = $derived(relicInventory.getOccupiedPositions());

  // Create grid state for rendering with explicit reactivity
  const gridCells = $derived.by(() => {
    if (!currentShape) return [];

    // Access relicsMapSize to ensure reactivity when Map changes

    const cells = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const index = y * GRID_WIDTH + x;
        const isValid = currentShape.shape[index] === true;
        const relic = relicInventory.getRelicAt(x, y);

        if (relic) {
          if (relic.position.x !== x || relic.position.y !== y) {
            // This cell is part of a multi-cell relic but not the top-left corner
            continue;
          }
        }

        cells.push({
          x,
          y,
          isValid,
          relic,
          key: `${x},${y}`,
        });
      }
    }
    return cells;
  });

  // Props for relic selection
  const { onRelicSlotClicked }: Props = $props();

  // Tooltip state tracking
  let activeTooltip = $state<{
    relic: RelicItemWithPosition;
    state: MouseTooltipState;
  } | null>(null);

  function handleTooltipState(relic: RelicItemWithPosition) {
    return (state: MouseTooltipState) => {
      if (state.visible) {
        activeTooltip = { relic, state };
      } else if (
        activeTooltip?.relic.position.x === relic.position.x &&
        activeTooltip?.relic.position.y === relic.position.y
      ) {
        activeTooltip = null;
      }
    };
  }

  // Handle cell click (place/remove relics or open selector)
  function onCellClick(x: number, y: number) {
    const existingRelic = relicInventory.getRelicAt(x, y);

    if (existingRelic) {
      // Remove relic if clicking on an occupied slot
      relicInventory.removeRelic(x, y);
    } else if (relicInventory.isValidPosition(x, y)) {
      // Calculate available space and open relic selector
      const availableSpace = relicInventory.calculateAvailableSpace(x, y);
      if (availableSpace.width > 0 && availableSpace.height > 0) {
        onRelicSlotClicked?.(x, y, availableSpace);
      }
    }
  }

  // Tier management functions
  function nextTier() {
    if (relicInventory.currentTier < 4) {
      relicInventory.setTier(relicInventory.currentTier + 1);
    }
  }

  function prevTier() {
    if (relicInventory.currentTier > 0) {
      relicInventory.setTier(relicInventory.currentTier - 1);
    }
  }
</script>

<div class="card bg-base-100 border border-base-300 shadow-lg h-full">
  <div class="card-body p-4 h-full flex flex-col">
    <!-- Compact Header -->
    <div class="flex items-center justify-end mb-3">
      <div class="flex items-center gap-2">
        <div class="badge badge-sm badge-outline">
          Tier {relicInventory.currentTier}
        </div>
        <div class="join">
          <button
            class="btn btn-xs join-item"
            onclick={prevTier}
            disabled={relicInventory.currentTier <= 0}
          >
            ←
          </button>
          <button
            class="btn btn-xs join-item"
            onclick={nextTier}
            disabled={relicInventory.currentTier >= 4}
          >
            →
          </button>
        </div>
      </div>
    </div>

    <!-- Relic Grid with proper spacing - centered in available space -->
    <div class="flex justify-center flex-1">
      <div
        class="grid grid-cols-(--this-cols) grid-rows-(--this-rows) gap-1 border border-base-300/50 p-2 rounded bg-base-200/30"
        style={`
        --this-cols: repeat(${GRID_WIDTH}, ${CELL_SIZE}px);
        --this-rows: repeat(${GRID_HEIGHT}, ${CELL_SIZE}px);
      `}
      >
        {#each gridCells as cell (cell.key)}
          {#if cell.isValid && cell.relic}
            <!-- Relic cell with tooltip -->
            <div
              role="button"
              tabindex="0"
              class={`
                relative cursor-pointer transition-colors rounded-sm border col-span-(--this-col) row-span-(--this-row)
                bg-base-200 border-[color:var(--rarity-color)] hover:shadow-[0_0_8px_var(--rarity-color)]
              `}
              style={`--this-col: ${cell.relic.width};--this-row: ${cell.relic.height};--rarity-color: ${parseRGBA01ToCss(relicsHelper.getRelicRarityColor(cell.relic.rarity as RelicRarity))};`}
              use:mouseTooltip={{ onStateChange: handleTooltipState(cell.relic), enabled: true }}
              onclick={() => onCellClick(cell.x, cell.y)}
              onkeydown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onCellClick(cell.x, cell.y);
                  e.preventDefault();
                }
              }}
              aria-label="Occupied slot"
            >
              <!-- Relic sprite -->
              <img
                src={cell.relic.sprite}
                alt={cell.relic.name}
                class="w-full h-full object-contain p-0.5"
              />
              <!-- Multi-cell relic visual connection -->
              {#if cell.relic.width > 1 || cell.relic.height > 1}
                <div
                  class="absolute inset-0 border border-primary/20 rounded-sm pointer-events-none"
                ></div>
              {/if}
              <!-- Rank indicator circles -->
              {#if cell.relic.rank > 0}
                <div class="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {#each Array(cell.relic.rank) as _, i (i)}
                    <div class="w-1 h-1 rounded-full bg-green-500"></div>
                  {/each}
                </div>
              {/if}
            </div>
          {:else}
            <!-- Empty or invalid cell without tooltip -->
            <div
              role="button"
              tabindex="0"
              class={`
              relative cursor-pointer transition-colors rounded-sm border col-span-(--this-col) row-span-(--this-row)
              ${
                cell.isValid
                  ? "bg-base-100 border-base-300 hover:bg-base-200 hover:border-base-400"
                  : "bg-base-100/30 border-base-300/30 opacity-40 cursor-not-allowed"
              }
            `}
              style="--this-col: 1;--this-row: 1;"
              onclick={() => cell.isValid && onCellClick(cell.x, cell.y)}
              onkeydown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && cell.isValid) {
                  onCellClick(cell.x, cell.y);
                  e.preventDefault();
                }
              }}
              aria-label={cell.isValid ? "Empty slot" : "Disabled slot"}
            >
              {#if cell.isValid}
                <!-- Empty valid slot indicator -->
                <div
                  class="w-1 h-1 bg-base-400/30 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                ></div>
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    </div>
  </div>

  <!-- Mouse-following tooltip portal -->
  {#if activeTooltip}
    {@const lines = relicsHelper.getTooltipLines(activeTooltip.relic, lang, statsHelper, skillsHelper)}
    {@const borderColor = lines.find(l => l.type === "tooltipBorder")?.color}
    <MouseTooltip
      visible={true}
      mouseX={activeTooltip.state.mouseX}
      mouseY={activeTooltip.state.mouseY}
      placement="right"
      {borderColor}
    >
      <GameTooltip {lines} />
    </MouseTooltip>
  {/if}
</div>

<style>
  /* Ensure crisp pixel rendering for small grid */
  .grid {
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
  }

  /* Subtle focus states for accessibility */
  [role="button"]:focus-visible {
    outline: 2px solid var(--fallback-p, oklch(var(--p)));
    outline-offset: 1px;
  }
</style>

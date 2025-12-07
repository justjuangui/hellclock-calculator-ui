<script lang="ts">
  import { calculateTooltipPosition, type TooltipPosition } from "$lib/utils/tooltipPosition";
  import type { Snippet } from "svelte";

  interface Props {
    /** Whether the tooltip is visible */
    visible: boolean;
    /** Mouse X position (screen coordinates) */
    mouseX: number;
    /** Mouse Y position (screen coordinates) */
    mouseY: number;
    /** Preferred placement direction */
    placement?: "top" | "bottom" | "left" | "right";
    /** Distance from mouse cursor */
    offset?: number;
    /** Minimum distance from viewport edges */
    edgeMargin?: number;
    /** Custom width class (default: w-64) */
    widthClass?: string;
    /** Custom border color CSS value (e.g., "#ff0000", "rgb(255,0,0)") */
    borderColor?: string;
    /** Tooltip content */
    children: Snippet;
  }

  const {
    visible,
    mouseX,
    mouseY,
    placement: preferredPlacement = "right",
    offset = 12,
    edgeMargin = 8,
    widthClass = "w-64",
    borderColor,
    children,
  }: Props = $props();

  let tooltipEl: HTMLDivElement | null = $state(null);
  let position = $state<TooltipPosition>({ x: 0, y: 0, placement: "right" });

  // Calculate position whenever mouse moves
  $effect(() => {
    if (visible && tooltipEl) {
      const rect = tooltipEl.getBoundingClientRect();
      position = calculateTooltipPosition({
        mouseX,
        mouseY,
        tooltipWidth: rect.width,
        tooltipHeight: rect.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        offset,
        edgeMargin,
        preferredPlacement,
      });
    }
  });
</script>

{#if visible}
  <div
    bind:this={tooltipEl}
    class="fixed z-50 pointer-events-none {widthClass}"
    style="left: {position.x}px; top: {position.y}px;"
    role="tooltip"
  >
    <div class="bg-black border rounded-lg shadow-xl p-3" style={borderColor ? `border-color: ${borderColor}` : ""}>
      {@render children()}
    </div>
  </div>
{/if}

import type { Action } from "svelte/action";

export interface MouseTooltipState {
  visible: boolean;
  mouseX: number;
  mouseY: number;
}

export interface MouseTooltipOptions {
  /** Callback when tooltip state changes */
  onStateChange: (state: MouseTooltipState) => void;
  /** Whether tooltip tracking is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Svelte action that tracks mouse position for tooltip display.
 * Attaches mouseenter, mousemove, and mouseleave listeners.
 *
 * @example
 * ```svelte
 * <div use:mouseTooltip={{ onStateChange: handleState, enabled: true }}>
 *   Hover me
 * </div>
 * ```
 */
export const mouseTooltip: Action<HTMLElement, MouseTooltipOptions> = (
  node,
  options
) => {
  let currentOptions = options;

  function handleMouseEnter(e: MouseEvent) {
    if (currentOptions?.enabled === false) return;
    currentOptions?.onStateChange({
      visible: true,
      mouseX: e.clientX,
      mouseY: e.clientY,
    });
  }

  function handleMouseMove(e: MouseEvent) {
    if (currentOptions?.enabled === false) return;
    currentOptions?.onStateChange({
      visible: true,
      mouseX: e.clientX,
      mouseY: e.clientY,
    });
  }

  function handleMouseLeave() {
    currentOptions?.onStateChange({
      visible: false,
      mouseX: 0,
      mouseY: 0,
    });
  }

  node.addEventListener("mouseenter", handleMouseEnter);
  node.addEventListener("mousemove", handleMouseMove);
  node.addEventListener("mouseleave", handleMouseLeave);

  return {
    update(newOptions: MouseTooltipOptions) {
      currentOptions = newOptions;
    },
    destroy() {
      node.removeEventListener("mouseenter", handleMouseEnter);
      node.removeEventListener("mousemove", handleMouseMove);
      node.removeEventListener("mouseleave", handleMouseLeave);
    },
  };
};

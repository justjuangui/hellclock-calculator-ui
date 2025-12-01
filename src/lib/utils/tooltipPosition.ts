export interface TooltipPosition {
  x: number;
  y: number;
  placement: "top" | "bottom" | "left" | "right";
}

export interface PositionOptions {
  mouseX: number;
  mouseY: number;
  tooltipWidth: number;
  tooltipHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  /** Distance from mouse cursor (default: 12) */
  offset?: number;
  /** Minimum distance from viewport edges (default: 8) */
  edgeMargin?: number;
  /** Preferred placement direction (default: 'right') */
  preferredPlacement?: "top" | "bottom" | "left" | "right";
}

/**
 * Calculates optimal tooltip position with edge detection.
 * Flips to opposite side when near viewport edges.
 */
export function calculateTooltipPosition(
  options: PositionOptions
): TooltipPosition {
  const {
    mouseX,
    mouseY,
    tooltipWidth,
    tooltipHeight,
    viewportWidth,
    viewportHeight,
    offset = 12,
    edgeMargin = 8,
    preferredPlacement = "right",
  } = options;

  // Calculate available space in each direction
  const spaceRight = viewportWidth - mouseX - offset;
  const spaceLeft = mouseX - offset;
  const spaceBottom = viewportHeight - mouseY - offset;
  const spaceTop = mouseY - offset;

  let placement: TooltipPosition["placement"] = preferredPlacement;
  let x: number;
  let y: number;

  if (preferredPlacement === "right" || preferredPlacement === "left") {
    // Horizontal placement logic
    if (
      preferredPlacement === "right" &&
      spaceRight >= tooltipWidth + edgeMargin
    ) {
      x = mouseX + offset;
      placement = "right";
    } else if (spaceLeft >= tooltipWidth + edgeMargin) {
      x = mouseX - offset - tooltipWidth;
      placement = "left";
    } else if (spaceRight >= tooltipWidth + edgeMargin) {
      x = mouseX + offset;
      placement = "right";
    } else {
      // Fallback: clamp horizontally
      x = Math.max(
        edgeMargin,
        Math.min(mouseX - tooltipWidth / 2, viewportWidth - tooltipWidth - edgeMargin)
      );
    }

    // Vertical centering with edge clamping
    y = mouseY - tooltipHeight / 2;
    y = Math.max(
      edgeMargin,
      Math.min(y, viewportHeight - tooltipHeight - edgeMargin)
    );
  } else {
    // Vertical placement logic (top/bottom)
    if (
      preferredPlacement === "bottom" &&
      spaceBottom >= tooltipHeight + edgeMargin
    ) {
      y = mouseY + offset;
      placement = "bottom";
    } else if (spaceTop >= tooltipHeight + edgeMargin) {
      y = mouseY - offset - tooltipHeight;
      placement = "top";
    } else if (spaceBottom >= tooltipHeight + edgeMargin) {
      y = mouseY + offset;
      placement = "bottom";
    } else {
      // Fallback: clamp vertically
      y = Math.max(
        edgeMargin,
        Math.min(mouseY + offset, viewportHeight - tooltipHeight - edgeMargin)
      );
    }

    // Horizontal centering with edge clamping
    x = mouseX - tooltipWidth / 2;
    x = Math.max(
      edgeMargin,
      Math.min(x, viewportWidth - tooltipWidth - edgeMargin)
    );
  }

  return { x, y, placement };
}

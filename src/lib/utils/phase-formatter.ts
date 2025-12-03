export type PhaseType =
  | "phase_base"
  | "phase_add"
  | "phase_mult"
  | "phase_multadd"
  | "phase_override";

/**
 * Extract the phase type from a node type string.
 * e.g., "phase_add" -> "phase_add", "phase_mult_something" -> "phase_mult"
 */
export function extractPhaseType(nodeType: string): PhaseType | null {
  if (nodeType.startsWith("phase_base")) return "phase_base";
  if (nodeType.startsWith("phase_add")) return "phase_add";
  if (nodeType.startsWith("phase_multadd")) return "phase_multadd";
  if (nodeType.startsWith("phase_mult")) return "phase_mult";
  if (nodeType.startsWith("phase_override")) return "phase_override";
  return null;
}

/**
 * Format a number with appropriate precision.
 * Integers show no decimals, floats show up to 4 decimals (trimmed).
 */
export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(4).replace(/\.?0+$/, "");
}

/**
 * Format a contribution value based on its phase type.
 * - base: raw value (e.g., "100")
 * - add: signed value (e.g., "+50" or "-10")
 * - mult: multiplier (e.g., "x1.5")
 * - multadd: percentage (e.g., "+25%" or "-10%")
 * - override: assignment (e.g., "=200")
 */
export function formatContributionValue(
  value: number,
  layer: string | null
): string {
  const formatted = formatNumber(value);

  // Normalize layer name (remove "phase_" prefix if present)
  const normalizedLayer = layer?.replace(/^phase_/, "") ?? null;

  switch (normalizedLayer) {
    case "base":
      return formatted;

    case "add":
      return value >= 0 ? `+${formatted}` : formatted;

    case "mult":
      return `${formatted}[x]`;

    case "multadd":
      return `${formatted}[+]`;

    case "override":
      return `=${formatted}`;

    default:
      return formatted;
  }
}

/**
 * Get a DaisyUI badge color class for a phase type.
 */
export function getPhaseColor(phaseType: PhaseType | string | null): string {
  const colors: Record<string, string> = {
    phase_base: "badge-primary",
    base: "badge-primary",
    phase_add: "badge-secondary",
    add: "badge-secondary",
    phase_mult: "badge-accent",
    mult: "badge-accent",
    phase_multadd: "badge-info",
    multadd: "badge-info",
    phase_override: "badge-warning",
    override: "badge-warning",
  };
  return colors[phaseType ?? ""] ?? "badge-neutral";
}

/**
 * Get a DaisyUI progress bar color class for a phase type.
 */
export function getProgressColor(phaseType: PhaseType | string | null): string {
  const colors: Record<string, string> = {
    phase_base: "progress-primary",
    base: "progress-primary",
    phase_add: "progress-secondary",
    add: "progress-secondary",
    phase_mult: "progress-accent",
    mult: "progress-accent",
    phase_multadd: "progress-info",
    multadd: "progress-info",
    phase_override: "progress-warning",
    override: "progress-warning",
  };
  return colors[phaseType ?? ""] ?? "progress-neutral";
}

/**
 * Get a text color class based on value sign.
 */
export function getValueColorClass(value: number): string {
  if (value > 0) return "text-success";
  if (value < 0) return "text-error";
  return "text-base-content";
}

/**
 * Get a human-readable display name for a phase type.
 */
export function getPhaseDisplayName(phaseType: PhaseType | string): string {
  const names: Record<string, string> = {
    phase_base: "Base",
    base: "Base",
    phase_add: "Add",
    add: "Add",
    phase_mult: "Multiply",
    mult: "Multiply",
    phase_multadd: "Mult Add",
    multadd: "Mult Add",
    phase_override: "Override",
    override: "Override",
  };
  return names[phaseType] ?? phaseType;
}

/**
 * Get the operator symbol for a phase type.
 */
export function getPhaseOperator(phaseType: PhaseType | string): string {
  const operators: Record<string, string> = {
    phase_base: "=",
    base: "=",
    phase_add: "+",
    add: "+",
    phase_mult: "×",
    mult: "×",
    phase_multadd: "%",
    multadd: "%",
    phase_override: ":=",
    override: ":=",
  };
  return operators[phaseType] ?? "?";
}

/**
 * Format a node name for display.
 * Converts snake_case to Title Case and handles special prefixes.
 */
export function formatNodeName(name: string | undefined): string {
  if (!name || name === "(unnamed)") return "Unnamed";

  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

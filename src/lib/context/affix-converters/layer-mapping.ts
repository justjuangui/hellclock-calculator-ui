/**
 * Shared layer mapping utilities for affix conversion
 * Used by both relic and constellation evaluation systems
 */

/**
 * Valid layer values for stat modifiers
 */
export type StatLayer = "add" | "mult" | "multadd" | "base";

/**
 * Get layer from modifier type string
 * Handles various naming conventions from different systems
 *
 * @param modifierType - The modifier type string (e.g., "Additive", "Multiplicative", "MultiplicativeAdditive")
 * @returns The layer string ("add", "mult", "multadd", or "add" as default)
 */
export function getLayerFromModifierType(modifierType: string): StatLayer {
  const lower = modifierType.toLowerCase();

  if (lower === "multiplicative") {
    return "mult";
  }

  if (lower === "multiplicativeadditive") {
    return "multadd";
  }

  // Default to "add" for "additive" or any other value
  return "add";
}

/**
 * Normalize a stat name by removing spaces
 *
 * @param statName - The stat name to normalize
 * @returns The normalized stat name without spaces
 */
export function normalizeStatName(statName: string): string {
  return statName.replaceAll(" ", "");
}

/**
 * Build a stat key for evaluation by combining normalized stat name with layer suffix
 *
 * @param statName - The stat name (may contain spaces)
 * @param modifierType - The modifier type string
 * @returns The stat key like "CriticalDamage.mult" or "Life.add"
 */
export function buildStatKey(statName: string, modifierType: string): string {
  const normalizedName = normalizeStatName(statName);
  const layer = getLayerFromModifierType(modifierType);
  return `${normalizedName}.${layer}`;
}

/**
 * Create proxy flag name from source/target stats
 * Removes "Damage" word from stat names
 *
 * @param sourceStat - The source stat name (e.g., "PhysicalDamage")
 * @param targetStat - The target stat name (e.g., "PlagueDamage")
 * @returns The proxy flag name like "ProxyPhysicalToPlague"
 */
export function createProxyFlagName(
  sourceStat: string,
  targetStat: string,
): string {
  const cleanSource = sourceStat.replace("Damage", "");
  const cleanTarget = targetStat.replace("Damage", "");
  return `Proxy${cleanSource}To${cleanTarget}`;
}

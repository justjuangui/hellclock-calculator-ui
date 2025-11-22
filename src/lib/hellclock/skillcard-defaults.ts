// SkillCard Defaults Cascade Merge Logic
// Merges global → section → row defaults

import type {
  DefaultsConfig,
  FormatConfig,
  ConditionsConfig,
  StyleConfig,
  RowConfig,
  ResolvedRowConfig
} from './skillcard-types';

/**
 * Merge format configurations with priority: row > section > global
 */
export function mergeFormat(
  global?: FormatConfig,
  section?: FormatConfig,
  row?: FormatConfig
): FormatConfig {
  return {
    type: row?.type ?? section?.type ?? global?.type ?? 'integer',
    decimals: row?.decimals ?? section?.decimals ?? global?.decimals,
    unit: row?.unit ?? section?.unit ?? global?.unit,
  };
}

/**
 * Merge conditions configurations with priority: row > section > global
 */
export function mergeConditions(
  global?: ConditionsConfig,
  section?: ConditionsConfig,
  row?: ConditionsConfig
): ConditionsConfig {
  return {
    hideIfZero: row?.hideIfZero ?? section?.hideIfZero ?? global?.hideIfZero,
    hideIfNull: row?.hideIfNull ?? section?.hideIfNull ?? global?.hideIfNull,
    hideIfNegative: row?.hideIfNegative ?? section?.hideIfNegative ?? global?.hideIfNegative,
    showOnlyIfPositive: row?.showOnlyIfPositive ?? section?.showOnlyIfPositive ?? global?.showOnlyIfPositive,
    hideIfEqual: row?.hideIfEqual ?? section?.hideIfEqual ?? global?.hideIfEqual,
  };
}

/**
 * Merge style configurations with priority: row > section > global
 */
export function mergeStyles(
  global?: StyleConfig,
  section?: StyleConfig,
  row?: StyleConfig
): StyleConfig {
  return {
    // Value styling
    valueColor: row?.valueColor ?? section?.valueColor ?? global?.valueColor,
    valueWeight: row?.valueWeight ?? section?.valueWeight ?? global?.valueWeight,
    valueSize: row?.valueSize ?? section?.valueSize ?? global?.valueSize,

    // Label styling
    labelColor: row?.labelColor ?? section?.labelColor ?? global?.labelColor,
    labelOpacity: row?.labelOpacity ?? section?.labelOpacity ?? global?.labelOpacity,
    labelSize: row?.labelSize ?? section?.labelSize ?? global?.labelSize,

    // Row styling
    highlight: row?.highlight ?? section?.highlight ?? global?.highlight,
    borderColor: row?.borderColor ?? section?.borderColor ?? global?.borderColor,

    // Special (damage distribution)
    color: row?.color ?? section?.color ?? global?.color,
  };
}

/**
 * Merge all defaults for a row
 */
export function mergeDefaults(
  globalDefaults?: DefaultsConfig,
  sectionDefaults?: DefaultsConfig,
  row?: RowConfig
): { format: FormatConfig; conditions: ConditionsConfig; style: StyleConfig } {
  return {
    format: mergeFormat(globalDefaults?.format, sectionDefaults?.format, row?.format),
    conditions: mergeConditions(globalDefaults?.conditions, sectionDefaults?.conditions, row?.conditions),
    style: mergeStyles(globalDefaults?.style, sectionDefaults?.style, row?.style),
  };
}

/**
 * Resolve a row config by merging with defaults
 */
export function resolveRowConfig(
  row: RowConfig,
  globalDefaults?: DefaultsConfig,
  sectionDefaults?: DefaultsConfig
): ResolvedRowConfig {
  const merged = mergeDefaults(globalDefaults, sectionDefaults, row);

  return {
    id: row.id,
    displayName: row.displayName,
    valueType: row.valueType,
    value: row.value,
    format: merged.format,
    conditions: merged.conditions,
    style: merged.style,
    prefix: row.prefix,
    suffix: row.suffix,
  };
}

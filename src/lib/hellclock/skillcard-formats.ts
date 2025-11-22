// SkillCard Value Formatting
// Formats values based on format configuration

import type { FormatConfig } from './skillcard-types';

/**
 * Format a value based on format configuration
 */
export function formatValue(value: unknown, format: FormatConfig): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  switch (format.type) {
    case 'integer':
      return formatInteger(value);

    case 'decimal':
      return formatDecimal(value, format.decimals ?? 1);

    case 'percentage':
      return formatPercentage(value, format.decimals ?? 0);

    case 'time':
      return formatTime(value);

    case 'multiplier':
      return formatMultiplier(value, format.decimals ?? 1);

    case 'tagList':
      return formatTagList(value);

    case 'boolean':
      return value ? 'Yes' : 'No';
    default:
      return String(value);
  }
}

/**
 * Format as integer
 */
function formatInteger(value: unknown): string {
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return Math.round(num).toString();
}

/**
 * Format as decimal with specified precision
 */
function formatDecimal(value: unknown, decimals: number): string {
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toFixed(decimals);
}

/**
 * Format as percentage
 */
function formatPercentage(value: unknown, decimals: number): string {
  const num = Number(value);
  if (isNaN(num)) return String(value);

  // Assume value is already in decimal form (0.5 = 50%)
  const percentage = num * 100;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format as time (seconds)
 */
function formatTime(value: unknown): string {
  if (typeof value === 'string') {
    // Already formatted (e.g., "1.0s")
    return value;
  }

  const num = Number(value);
  if (isNaN(num)) return String(value);

  return `${num.toFixed(1)}s`;
}

/**
 * Format as multiplier (e.g., "1.5x")
 */
function formatMultiplier(value: unknown, decimals: number): string {
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return `${num.toFixed(decimals)}x`;
}

/**
 * Format tag list as comma-separated string
 */
function formatTagList(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value);
}

/**
 * Apply prefix and suffix to formatted value
 */
export function applyPrefixSuffix(
  formattedValue: string,
  prefix?: string,
  suffix?: string
): string {
  let result = formattedValue;

  if (prefix) {
    result = prefix + result;
  }

  if (suffix) {
    result = result + suffix;
  }

  return result;
}

// SkillCard Conditional Display Evaluation
// Determines whether rows should be shown based on their values

import type { ConditionsConfig } from './skillcard-types';

/**
 * Check if a row should be shown based on its value and conditions
 */
export function shouldShowRow(value: unknown, conditions: ConditionsConfig): boolean {
  // Check hideIfNull first
  if (conditions.hideIfNull && (value === null || value === undefined)) {
    return false;
  }

  // Check hideIfZero
  if (conditions.hideIfZero && value === 0) {
    return false;
  }

  // Check hideIfNegative
  if (conditions.hideIfNegative && typeof value === 'number' && value < 0) {
    return false;
  }

  // Check showOnlyIfPositive
  if (conditions.showOnlyIfPositive) {
    if (typeof value !== 'number' || value <= 0) {
      return false;
    }
  }

  // Check hideIfEqual
  if (conditions.hideIfEqual !== undefined && value === conditions.hideIfEqual) {
    return false;
  }

  // All conditions passed
  return true;
}

/**
 * Filter rows that should be visible based on their values and conditions
 */
export function filterVisibleRows<T extends { id: string }>(
  rows: T[],
  values: Map<string, unknown>,
  conditionsMap: Map<string, ConditionsConfig>
): T[] {
  return rows.filter(row => {
    const value = values.get(row.id);
    const conditions = conditionsMap.get(row.id) || {};
    return shouldShowRow(value, conditions);
  });
}

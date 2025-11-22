// SkillCard Style Utilities
// Generates CSS classes from style configuration

import type { StyleConfig } from './skillcard-types';

/**
 * Get CSS classes for value text
 */
export function getValueClasses(style: StyleConfig): string {
  const classes: string[] = ['font-mono'];

  // Color
  if (style.valueColor) {
    classes.push(`text-${style.valueColor}`);
  }

  // Weight
  if (style.valueWeight) {
    classes.push(`font-${style.valueWeight}`);
  }

  // Size
  if (style.valueSize) {
    const sizeMap: Record<string, string> = {
      'xs': 'text-xs',
      'sm': 'text-sm',
      'md': 'text-base',
      'lg': 'text-lg',
      'xl': 'text-xl',
    };
    classes.push(sizeMap[style.valueSize] || 'text-sm');
  }

  return classes.join(' ');
}

/**
 * Get CSS classes for label text
 */
export function getLabelClasses(style: StyleConfig): string {
  const classes: string[] = [];

  // Color
  if (style.labelColor) {
    classes.push(`text-${style.labelColor}`);
  }

  // Size
  if (style.labelSize) {
    const sizeMap: Record<string, string> = {
      'xs': 'text-xs',
      'sm': 'text-sm',
      'md': 'text-base',
      'lg': 'text-lg',
    };
    classes.push(sizeMap[style.labelSize] || 'text-sm');
  }

  return classes.join(' ');
}

/**
 * Get inline style for label (opacity)
 */
export function getLabelStyle(style: StyleConfig): string {
  if (style.labelOpacity !== undefined) {
    return `opacity: ${style.labelOpacity}`;
  }
  return '';
}

/**
 * Get CSS classes for row container
 */
export function getRowClasses(style: StyleConfig): string {
  const classes: string[] = [];

  if (style.highlight) {
    classes.push('bg-base-200');
  }

  if (style.borderColor) {
    classes.push(`border-l-2 border-${style.borderColor} pl-2`);
  }

  return classes.join(' ');
}

/**
 * Get background color class for damage distribution bar segments
 */
export function getProgressColorClass(style: StyleConfig): string {
  if (style.color) {
    // Map damage type colors to appropriate background classes
    const colorMap: Record<string, string> = {
      'neutral': 'bg-base-content/60',    // Physical - gray
      'warning': 'bg-orange-500',          // Fire - orange
      'success': 'bg-success',             // Plague - green
      'info': 'bg-info',                   // Lightning - blue
      'error': 'bg-error',
      'primary': 'bg-primary',
      'secondary': 'bg-secondary',
    };
    return colorMap[style.color] || `bg-${style.color}`;
  }
  return 'bg-primary';
}

/**
 * Get badge color class for damage type
 */
export function getBadgeColorClass(color?: string): string {
  if (!color) return 'badge-ghost';

  // Map to background colors to match progress bar colors
  const colorMap: Record<string, string> = {
    'neutral': 'bg-base-content/60',      // Physical - gray
    'warning': 'bg-orange-500',            // Fire - orange
    'success': 'bg-success',               // Plague - green
    'info': 'bg-info',                     // Lightning - blue
    'error': 'bg-error',
    'primary': 'bg-primary',
    'secondary': 'bg-secondary',
  };

  return colorMap[color] || 'badge-ghost';
}

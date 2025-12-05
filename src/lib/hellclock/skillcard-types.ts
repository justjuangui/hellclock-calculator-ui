// SkillCard JSON Schema Types - Option 5 (Shared Defaults)

import type { SkillSelected } from "./skills";

// Format configuration
export interface FormatConfig {
  type:
    | "integer"
    | "decimal"
    | "percentage"
    | "time"
    | "multiplier"
    | "tagList"
    | "boolean";
  decimals?: number;
  unit?: string;
}

// Conditional display
export interface ConditionsConfig {
  hideIfZero?: boolean;
  hideIfNull?: boolean;
  hideIfNegative?: boolean;
  showOnlyIfPositive?: boolean;
  hideIfEqual?: number | string;
}

// Style configuration
export interface StyleConfig {
  // Value styling
  valueColor?:
    | "error"
    | "success"
    | "warning"
    | "info"
    | "base"
    | "neutral"
    | "primary"
    | "secondary";
  valueWeight?: "normal" | "medium" | "semibold" | "bold";
  valueSize?: "xs" | "sm" | "md" | "lg" | "xl";

  // Label styling
  labelColor?: string;
  labelOpacity?: number;
  labelSize?: "xs" | "sm" | "md" | "lg";

  // Row styling
  highlight?: boolean;
  borderColor?: string;

  // For damage distribution
  color?: string;
}

// Default configuration (can appear at global or section level)
export interface DefaultsConfig {
  format?: FormatConfig;
  conditions?: ConditionsConfig;
  style?: StyleConfig;
}

// Single row definition
export interface RowConfig {
  id: string;
  displayName?: string;
  valueType:
    | "const"
    | "evaluate"
    | "fromSkill"
    | "fromSkillSelected"
    | "fromSkillTagApi"
    | "computed";
  value: string | number;

  // Optional overrides
  format?: FormatConfig;
  conditions?: ConditionsConfig;
  style?: StyleConfig;

  // Display modifiers
  prefix?: string;
  suffix?: string;
}

// Layout configuration for sections
export interface LayoutConfig {
  columns?: number;
  gap?: number;
}

// Tab definition for detail section
export interface TabConfig {
  id: string;
  displayName: string;
  icon?: string;
  rows: RowConfig[];
}

// Section configurations
export interface HeaderSection {
  rows: RowConfig[];
}

export interface SummarySection {
  defaults?: DefaultsConfig;
  layout?: LayoutConfig;
  rows: RowConfig[];
}

export interface DamageDistributionSection {
  defaults?: DefaultsConfig;
  rows: RowConfig[];
}

export interface DetailSection {
  defaults?: DefaultsConfig;
  tabs: TabConfig[];
}

// Complete sections object
export interface SectionsConfig {
  header?: HeaderSection;
  summary?: SummarySection;
  damageDistribution?: DamageDistributionSection;
  detail?: DetailSection;
}

// Root skill display configuration
export interface SkillDisplayConfig {
  skillId: string;
  defaults?: DefaultsConfig;
  sections: SectionsConfig;
}

// Complete file structure
export interface SkillDisplayDefinitions {
  skills: SkillDisplayConfig[];
}

// Resolved row configuration after merging defaults
export interface ResolvedRowConfig {
  id: string;
  displayName?: string;
  valueType: "const" | "evaluate" | "fromSkill" | "fromSkillSelected" | "fromSkillTagApi" | "computed";
  value: string | number;
  format: FormatConfig;
  conditions: ConditionsConfig;
  style: StyleConfig;
  prefix?: string;
  suffix?: string;
}

// Type for value type discriminator
export type ValueType = "const" | "evaluate" | "fromSkill" | "fromSkillSelected" | "fromSkillTagApi" | "computed";

// Re-export SkillSelected for convenience
export type { SkillSelected };

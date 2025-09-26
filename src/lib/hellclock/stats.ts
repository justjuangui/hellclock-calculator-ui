import { translate, type LangText } from "$lib/hellclock/lang";

export type StatModifierType =
  | "Additive"
  | "Multiplicative"
  | "MultiplicativeAdditive";

export type StatMod = {
  type: "StatModifierDefinition";
  eStatDefinition: string;
  modifierType: StatModifierType;
  value: number;
  selectedValue?: number;
};

export type StatFormat = "DEFAULT" | "PERCENTAGE";

export type StatDefinition = {
  name: string;
  id: number;
  type: "StatDefinition";
  localizedName: LangText[];
  localizedDescription: LangText[];
  icon: string;
  eStatFormat: StatFormat;
  baseValue: number;
  isPlayerStat: boolean;
  willClamp: boolean;
  minimumValue: number;
  maximumValue: number;
  useStatForMaximumValue: boolean;
  maximumValueStat: string;
  useStatForMinimumValue: boolean;
  minimumValueStat: string;
};

export type StatsRoot = { Stats: StatDefinition[] };

export class StatsHelper {
  private statsRoot: StatsRoot;
  constructor(statsRoot: StatsRoot) {
    this.statsRoot = statsRoot;
  }

  getStatById(id: number): StatDefinition | undefined {
    return this.statsRoot.Stats.find((stat) => stat.id === id);
  }

  getStatByName(name: string): StatDefinition | undefined {
    return this.statsRoot.Stats.find((stat) => stat.name === name);
  }

  getValueForStat(statName: string, value: number): number {
    const stat = this.getStatByName(statName);
    if (!stat || !stat.willClamp) return value;
    let maximumValue = stat.maximumValue || 0;
    let minimumValue = stat.minimumValue || 0;
    if (stat.useStatForMaximumValue && stat.maximumValueStat) {
      let otherStat = this.getStatByName(stat.maximumValueStat);
      maximumValue = otherStat ? otherStat.baseValue : maximumValue;
    }
    if (stat.useStatForMinimumValue && stat.minimumValueStat) {
      let otherStat = this.getStatByName(stat.minimumValueStat);
      minimumValue = otherStat ? otherStat.baseValue : minimumValue;
    }
    return Math.min(Math.max(value, minimumValue), maximumValue);
  }

  getLabelForStat(statName: string, langCode?: string): string {
    const stat = this.getStatByName(statName);
    if (!stat) return statName;
    return translate(stat.localizedName, langCode);
  }
}

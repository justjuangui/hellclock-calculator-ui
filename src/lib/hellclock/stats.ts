import { translate, type LangText } from "$lib/hellclock/lang";

export type StatFormat = "DEFAULT" | "PERCENTAGE";

export type StatDefinition = {
	name: string;
	id: number;
	type: "StatDefinition";
	localizedName: LangText[];
	localizedDescription: LangText[];
	icon: string,
	eStatFormat: StatFormat;
	baseValue: number;
	isPlayerStat: boolean;
	willClamp: boolean;
	minimumValue: number;
	maximumValue: number;
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
		return Math.min(Math.max(value, stat.minimumValue), stat.maximumValue);
	}

	getLabelForStat(statName: string, langCode?: string): string {
		const stat = this.getStatByName(statName);
		if (!stat) return statName;
		return translate(stat.localizedName, langCode);
	}
}

import type { StatFormat } from "$lib/hellclock/stats";
import { EComplementType, ESingType, type StatModifierType } from "$lib/hellclock/gears";

export function formatStatNumber(value: number, statFormat: StatFormat, singType: ESingType = ESingType.Always, complement: EComplementType = EComplementType.None) {
	if (complement == EComplementType.Complement) {
		value = 1.0 - value;
	} else if (complement == EComplementType.Decrement) {
		value -= 1.0;
	}

	if (singType == ESingType.Never) {
		value = Math.abs(value);
	}
	let symbol = singType == ESingType.Always ? (value >= 0 ? "+" : "") : "";
	if (statFormat === "PERCENTAGE") {
		return `${symbol}${(value * 100).toFixed(0)}%`;
	}
	return `${symbol}${value}`;
}

export function normalizedValue(value: number, min: number, max: number) {
	if (max === min) return 0;
	return (value - min) / (max - min);
}

export function formatStatModNumber(value: number, statFormat: StatFormat, modifier: StatModifierType, multiplier: number, minMultiplier: number, maxMultiplier: number) {
	let val = value;
	let normalize = normalizedValue(multiplier, minMultiplier, maxMultiplier);
	if (modifier === "Additive") {
		val *= normalize;
	}
	else 
	{
		val = (val - 1) * normalize + 1;
	}

	if (modifier == "Additive") {
		return formatStatNumber(val, statFormat, ESingType.Always, EComplementType.None);
	} else {
		return formatStatNumber(val, "PERCENTAGE", ESingType.Always, EComplementType.Decrement) + (modifier == "Multiplicative" ? "[x]" : "[+]");
	}

}

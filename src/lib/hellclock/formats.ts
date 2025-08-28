import type { StatFormat } from "$lib/hellclock/stats";
import { type StatModifierType } from "$lib/hellclock/stats";

export enum EComplementType {
  None,
  Complement,
  Decrement,
}

export enum ESingType {
  Default,
  Always,
  Never,
}

const instanceFormat: Record<string, Intl.NumberFormat> = {};

export function formatStatNumber(
  value: number,
  statFormat: StatFormat,
  singType: ESingType = ESingType.Always,
  complement: EComplementType = EComplementType.None,
  lang = "en",
) {
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
    if (instanceFormat[lang] === undefined) {
      instanceFormat[lang] = new Intl.NumberFormat(lang, {
        style: "percent",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
    if (Math.abs(value) < 0.08) {
      return `${symbol}${instanceFormat[lang].format(csQuantize(value))}`;
    }
    return `${symbol}${instanceFormat[lang].format(Math.floor(value * 100) / 100)}`;
  }
  return `${symbol}${Math.round(value).toFixed(0)}`;
}

export function normalizedValue(from: number, fromMin = 0.0, fromMax = 1.0) {
  return Math.min(Math.max(from, fromMin), fromMax);
}

export function roundHalfToEven(x: number, digits = 0): number {
  const f = 10 ** digits;
  const y = x * f;
  const i = Math.floor(y);
  const frac = y - i;

  let n: number;
  if (frac > 0.5) {
    n = i + 1;
  } else if (frac < 0.5) {
    n = i;
  } else {
    n = i % 2 === 0 ? i : i + 1;
  }
  return n / f;
}

export function csQuantize(num: number): number {
  const r = roundHalfToEven(num, 4);
  const scaled = r * 400;
  const adjusted = scaled + (scaled >= 0 ? Number.EPSILON : -Number.EPSILON);
  return Math.floor(adjusted) / 400;
}

export function getValueFromMultiplier(
  baseValue: number,
  modifier: StatModifierType,
  multiplier: number,
  minMultiplier: number,
  maxMultiplier: number,
) {
  let val = baseValue;
  let normalize = normalizedValue(multiplier, minMultiplier, maxMultiplier);
  if (modifier === "Additive") {
    val *= normalize;
  } else {
    val = (val - 1) * normalize + 1;
  }
  return val;
}

export function formatStatModNumber(
  value: number,
  statFormat: StatFormat,
  modifier: StatModifierType,
  multiplier: number,
  minMultiplier: number,
  maxMultiplier: number,
) {
  let val = getValueFromMultiplier(
    value,
    modifier,
    multiplier,
    minMultiplier,
    maxMultiplier,
  );

  if (modifier == "Additive") {
    return formatStatNumber(
      val,
      statFormat,
      ESingType.Always,
      EComplementType.None,
    );
  } else {
    return (
      formatStatNumber(
        val,
        "PERCENTAGE",
        ESingType.Always,
        EComplementType.Decrement,
      ) + (modifier == "Multiplicative" ? "[x]" : "[+]")
    );
  }
}

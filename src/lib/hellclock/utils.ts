import type { GearItem } from "$lib/hellclock/gears";
import { translate } from "$lib/hellclock/lang";
import { formatStatModNumber } from "$lib/hellclock/formats";
import type { StatMod, StatsHelper } from "$lib/hellclock/stats";

export function parseRGBA01ToCss(rgbaStr: string | undefined): string {
  if (!rgbaStr) return "rgba(0,0,0,1)";
  const nums = rgbaStr
    .replace(/rgba?\s*\(|\)/gi, "")
    .split(",")
    .map((s) => parseFloat(s.trim()));

  let [r, g, b, a] = nums;
  r = Math.round((r ?? 0) * 255);
  g = Math.round((g ?? 0) * 255);
  b = Math.round((b ?? 0) * 255);
  return `rgba(${r},${g},${b},${a ?? 1})`;
}

export function prettySlot(s: string): string {
  return s
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function fmtValue(
  mod: StatMod,
  lang: string,
  statsHelper: StatsHelper,
  minMultiplier = 0,
  maxMultiplier = 1,
): string {
  const { value, selectedValue, eStatDefinition, modifierType } = mod;
  let fValue = value;
  const statDefinition = statsHelper.getStatByName(eStatDefinition);
  if (!statDefinition) {
    return `${fValue} ${eStatDefinition}`;
  }
  return `${formatStatModNumber(fValue, statDefinition.eStatFormat, modifierType, selectedValue ?? 1, minMultiplier, maxMultiplier)} ${statsHelper.getLabelForStat(eStatDefinition, lang)}`;
}

export function tooltipText(
  item: GearItem,
  lang: string,
  statsHelper: StatsHelper,
): string[] {
  if (!item) return ["Empty"];
  const lines = [
    `${translate(item.localizedName, lang)} (T${item.tier})`,
    ...item.mods.map((mod) =>
      fmtValue(
        mod,
        lang,
        statsHelper,
        item.multiplierRange[0],
        item.multiplierRange[1],
      ),
    ),
  ];
  return lines;
}

export function formatIndexed(fmt: string, ...args: unknown[]): string {
  return fmt.replace(/{(\d+)}/g, (_, i: string) => {
    const idx = Number(i);
    return idx in args ? String(args[idx]) : `{${i}}`;
  });
}

export function formatHCStyle(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function spriteUrl(sprite?: string): string | undefined {
  if (!sprite) return undefined;
  // put your sprite files at: static/assets/sprites/<sprite>.png → /assets/sprites/<sprite>.png
  return `/assets/sprites/${sprite}.png`;
}

export interface TooltipLine {
  text: string;
  color?: string;
  borderColor?: string;
  bgColor?: string;
  icon?: string;
  type: "header" | "info" | "divider" | "affix";
}

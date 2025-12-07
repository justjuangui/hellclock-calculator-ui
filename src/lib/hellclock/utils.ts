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

/**
 * Parse RGBA (0-1 range) to CSS with minimum lightness for dark theme contrast.
 * Uses HSL-based lightening to preserve the original color's hue.
 */
export function parseRGBA01ToCssLightened(
  rgbaStr: string | undefined,
  minLightness = 0.5,
): string {
  if (!rgbaStr) return "rgba(200,200,200,1)";
  const nums = rgbaStr
    .replace(/rgba?\s*\(|\)/gi, "")
    .split(",")
    .map((s) => parseFloat(s.trim()));

  let [r, g, b, a] = nums;
  r = r ?? 0;
  g = g ?? 0;
  b = b ?? 0;

  // Convert RGB to HSL
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Boost lightness if too dark
  if (l < minLightness) {
    l = minLightness;
  }

  // Convert HSL back to RGB
  let r2: number, g2: number, b2: number;
  if (s === 0) {
    r2 = g2 = b2 = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r2 = hue2rgb(p, q, h + 1 / 3);
    g2 = hue2rgb(p, q, h);
    b2 = hue2rgb(p, q, h - 1 / 3);
  }

  return `rgba(${Math.round(r2 * 255)},${Math.round(g2 * 255)},${Math.round(b2 * 255)},${a ?? 1})`;
}

export function parseRGBA01ToPixiHex(rgbaStr: string | undefined): {
  color: number;
  alpha: number;
} {
  if (!rgbaStr) return { color: 0x000000, alpha: 1 };
  const nums = rgbaStr
    .replace(/rgba?\s*\(|\)/gi, "")
    .split(",")
    .map((s) => parseFloat(s.trim()));

  let [r, g, b, a] = nums;
  r = Math.round((r ?? 0) * 255);
  g = Math.round((g ?? 0) * 255);
  b = Math.round((b ?? 0) * 255);
  const color = (r << 16) | (g << 8) | b;
  const alpha = a ?? 1;
  return { color, alpha };
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
  const fValue = value;
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
    .replace(/<[^>]*>/g, "") // remove HTML tags
    .replace(/[ \t]+\n/g, "\n") // trim spaces/tabs before newlines
    .replace(/\n[ \t]+/g, "\n") // trim spaces/tabs after newlines
    .replace(/[ \t]{2,}/g, " ") // collapse multiple spaces/tab
    .trim();
}

export function spriteUrl(sprite?: string): string | undefined {
  if (!sprite) return undefined;
  // put your sprite files at: static/assets/sprites/<sprite>.png → /assets/sprites/<sprite>.png
  return `/assets/sprites/${sprite}.png`;
}

export interface TooltipLine {
  text: string;
  color?: string;           // for future per-line text color
  borderColor?: string;     // for future per-line border
  bgColor?: string;         // for future per-line background
  icon?: string;
  type: "header" | "info" | "divider" | "affix" | "affixCol" | "tooltipBorder";
}

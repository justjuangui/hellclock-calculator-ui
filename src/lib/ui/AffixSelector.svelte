<script lang="ts">
  import type { RelicAffix, RelicsHelper } from "$lib/hellclock/relics";
  import { translate } from "$lib/hellclock/lang";
  import { getContext } from "svelte";
  import { StatsHelper } from "$lib/hellclock/stats";
  import { formatStatModNumber } from "$lib/hellclock/formats";

  interface Props {
    affixes: RelicAffix[];
    selectedAffixes: RelicAffix[];
    affixValues: Record<number, number>;
    maxAffixes: number;
    tier: number;
    onToggleAffix: (affix: RelicAffix) => void;
    onUpdateValue: (affixId: number, value: number) => void;
  }

  const relicsHelper = getContext<RelicsHelper>("relicsHelper");
  const statsHelper = getContext<StatsHelper>("statsHelper");
  const lang = getContext<string>("lang") || "en";

  const {
    affixes,
    selectedAffixes,
    affixValues,
    maxAffixes,
    tier,
    onToggleAffix,
    onUpdateValue,
  }: Props = $props();

  function getAffixDisplayValue(affix: RelicAffix, value: number): string {
    if (affix.type === "StatModifierAffixDefinition") {
      const statDef = statsHelper.getStatByName(affix.eStatDefinition!);
      if (!statDef) return String(value);
      const clampvalue = statsHelper.getValueForStat(
        affix.eStatDefinition!,
        value,
      );

      return formatStatModNumber(
        clampvalue,
        statDef.eStatFormat,
        affix.statModifierType!,
        1,
        1,
        1,
      );
    }
    return value.toFixed(3);
  }

  function formatHCStyle(input: string): string {
    return input
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getAffixDisplayName(affix: RelicAffix): string {
    if (affix.type === "StatModifierAffixDefinition") {
      return statsHelper.getLabelForStat(affix.eStatDefinition!, lang);
    } else if (affix.type === "SkillLevelAffixDefinition") {
      return formatHCStyle(translate(affix.description, lang) || affix.name);
    }
    return affix.name;
  }
</script>

{#if affixes.length > 0 && maxAffixes > 0}
  <div class="space-y-2">
    {#each affixes as affix}
      {@const isSelected = selectedAffixes.some((a) => a.id === affix.id)}
      {@const [min, max] = relicsHelper?.getAffixValueRange(affix.id, tier) || [
        0, 0,
      ]}
      {@const currentValue = affixValues[affix.id] || 0}

      <div
        class="card card-compact bg-base-100 border {isSelected
          ? 'border-primary'
          : 'border-base-300'}"
      >
        <div class="card-body">
          <div class="flex items-center justify-between">
            <h6 class="card-title text-sm">
              {getAffixDisplayName(affix)}
            </h6>
            <button
              class="btn btn-xs {isSelected ? 'btn-error' : 'btn-primary'}"
              onclick={() => onToggleAffix(affix)}
            >
              {isSelected ? "Remove" : "Add"}
            </button>
          </div>

          {#if isSelected && affix.type === "StatModifierAffixDefinition"}
            <div class="mt-2">
              <div class="flex items-center justify-between text-xs mb-1">
                <div>
                  Value: <span class="font-mono"
                    >{getAffixDisplayValue(affix, currentValue)}</span
                  >
                </div>
                <div class="opacity-70">
                  Range: <span class="font-mono"
                    >{getAffixDisplayValue(affix, min)}</span
                  >
                  -
                  <span class="font-mono"
                    >{getAffixDisplayValue(affix, max)}</span
                  >
                </div>
              </div>
              <input
                type="range"
                {min}
                {max}
                step="0.001"
                value={currentValue}
                onchange={(e) =>
                  onUpdateValue(
                    affix.id,
                    parseFloat((e.target as HTMLInputElement)?.value || "0"),
                  )}
                class="range range-primary range-xs w-full"
              />
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{:else}
  <div class="text-center py-4 opacity-70">
    <p class="text-sm">No affixes available</p>
  </div>
{/if}


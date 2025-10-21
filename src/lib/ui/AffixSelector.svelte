<script lang="ts">
  import type {
    RelicAffix,
    RelicsHelper,
    RelicSize,
  } from "$lib/hellclock/relics";
  import { translate } from "$lib/hellclock/lang";
  import { getContext } from "svelte";
  import { StatsHelper } from "$lib/hellclock/stats";
  import { SkillsHelper } from "$lib/hellclock/skills";
  import {
    formatSkillEffectVariableModNumber,
    formatStatModNumber,
    normalizedValueFromRange,
  } from "$lib/hellclock/formats";
  import { formatHCStyle, formatIndexed } from "$lib/hellclock/utils";

  interface Props {
    affixes: RelicAffix[];
    selectedAffixes: RelicAffix[];
    affixValues: Record<number, number>;
    maxAffixes: number;
    tier: number;
    rank: number;
    relicSize: RelicSize;
    canRemove?: boolean;
    onToggleAffix: (affix: RelicAffix) => void;
    onUpdateValue: (affixId: number, value: number) => void;
  }

  const relicsHelper = getContext<RelicsHelper>("relicsHelper");
  const statsHelper = getContext<StatsHelper>("statsHelper");
  const skillsHelper = getContext<SkillsHelper>("skillsHelper");
  const lang = getContext<string>("lang") || "en";

  const {
    affixes,
    selectedAffixes,
    affixValues,
    maxAffixes,
    tier,
    rank,
    relicSize,
    canRemove = true,
    onToggleAffix,
    onUpdateValue,
  }: Props = $props();

  function getAffixDisplayValue(affix: RelicAffix, value: number): string {
    let range = relicsHelper.getAffixValueRange(affix.id, tier, rank);
    let fromNormalized = normalizedValueFromRange(
      value,
      0,
      1,
      range[0],
      range[1],
    );

    if (affix.type === "StatModifierAffixDefinition") {
      const statDef = statsHelper.getStatByName(affix.eStatDefinition!);
      if (!statDef) return String(fromNormalized);
      const clampvalue = statsHelper.getValueForStat(
        affix.eStatDefinition!,
        fromNormalized,
      );

      return formatStatModNumber(
        clampvalue,
        statDef.eStatFormat,
        affix.statModifierType!,
        1,
        1,
        1,
      );
    } else if (affix.type === "SkillBehaviorAffixDefinition") {
      return formatSkillEffectVariableModNumber(
        fromNormalized,
        affix.behaviorData!.variables.variables[0].eSkillEffectVariableFormat,
      );
    } else if (
      affix.type === "SkillLevelAffixDefinition" ||
      affix.type === "StatusMaxStacksAffixDefinition"
    ) {
      return `+${fromNormalized}`;
    } else if (affix.type === "RegenOnKillAffixDefinition") {
      const statDef = statsHelper.getStatByName(affix.eStatRegen!);
      if (!statDef) return String(fromNormalized);
      const clampvalue = statsHelper.getValueForStat(affix.eStatRegen!, fromNormalized);

      return formatStatModNumber(
        clampvalue,
        affix.flatRegen ? "DEFAULT" : "PERCENTAGE",
        "Additive",
        1,
        1,
        1,
      );
    }
    return value.toFixed(3);
  }

  function getAffixDisplayName(affix: RelicAffix, value?: number): string {
    if (affix.type === "StatModifierAffixDefinition") {
      return statsHelper.getLabelForStat(affix.eStatDefinition!, lang);
    } else if (affix.type === "SkillLevelAffixDefinition") {
      let skill = skillsHelper.getSkillById(affix.skillDefinition!.id);
      let skillname = translate(skill!.localizedName, lang);
      let maxLevel = skillsHelper?.getMaxSkillUpgradeLevelBonus() || "3";

      return formatIndexed(
        formatHCStyle(translate(affix.description, lang) || affix.name),
        skillname,
        getAffixDisplayValue(affix, value || 1),
        maxLevel,
      );
    } else if (affix.type === "SkillBehaviorAffixDefinition") {
      const desc = translate(affix.description, lang);
      // check if have additional params
      const extraParams: any[] = [];
      if (affix.additionalLocalizationVariables?.length) {
        for (let varName of affix.additionalLocalizationVariables) {
          const variable = affix.behaviorData!.variables.variables.find(
            (v) => v.name === varName.skillEffectVariableReference.valueOrName,
          );
          if (variable) {
            extraParams.push(
              formatSkillEffectVariableModNumber(
                variable.baseValue,
                variable.eSkillEffectVariableFormat,
              ),
            );
          } else {
            extraParams.push(
              varName.skillEffectVariableReference.valueOrName || "",
            );
          }
        }
      }

      return formatIndexed(
        formatHCStyle(desc),
        getAffixDisplayValue(affix, value || 0),
        ...extraParams,
      );
    } else if (affix.type === "RegenOnKillAffixDefinition") {
      return `${statsHelper.getLabelForStat(affix.eStatRegen!, lang)} on Kill`;
    } else if (affix.type === "StatusMaxStacksAffixDefinition") {
      if (affix.description) {
        return formatIndexed(
          formatHCStyle(translate(affix.description, lang)),
          getAffixDisplayValue(affix, value || 0),
        );
      }
    }
    return affix.name;
  }

  function getTagsAffix(affix: RelicAffix): string[] {
    const tags: string[] = [];
    if (
      !affix.blockCraftOnRelicSizes ||
      !affix.blockCraftOnRelicSizes.length ||
      !affix.blockCraftOnRelicSizes.includes(relicSize)
    ) {
      tags.push("Craft");
    }
    tags.push("Drop");
    return tags;
  }
</script>

{#if affixes.length > 0 && maxAffixes > 0}
  <div class="space-y-2">
    {#each affixes as affix}
      {@const isSelected = selectedAffixes.some((a) => a.id === affix.id)}
      {@const tags = getTagsAffix(affix)}
      {@const [min, max] = [0, 1.2]}
      {@const currentValue = affixValues[affix.id] || 0}

      <div
        class="card card-compact bg-base-100 border {isSelected
          ? 'border-primary'
          : 'border-base-300'}"
      >
        <div class="card-body">
          <div class="flex items-center justify-between">
            <h6 class="card-title text-sm">
              {getAffixDisplayName(affix, currentValue)}
            </h6>
            {#if canRemove}
              <button
                class="btn btn-xs {isSelected ? 'btn-error' : 'btn-primary'}"
                onclick={() => onToggleAffix(affix)}
              >
                {isSelected ? "Remove" : "Add"}
              </button>
            {/if}
          </div>

          {#if isSelected}
            <div class="mt-2">
              <div class="flex items-center justify-between text-xs mb-1">
                <div>
                  Value: <span class="font-mono"
                    >{getAffixDisplayValue(affix, currentValue)}</span
                  >
                </div>
                {#if min !== max}
                  <div class="opacity-70">
                    Range: <span class="font-mono"
                      >{getAffixDisplayValue(affix, min)}</span
                    >
                    -
                    <span class="font-mono"
                      >{getAffixDisplayValue(affix, max)}</span
                    >
                  </div>
                {/if}
              </div>
              {#if min !== max}
                <input
                  type="range"
                  {min}
                  {max}
                  step="any"
                  value={currentValue}
                  onchange={(e) =>
                    onUpdateValue(
                      affix.id,
                      parseFloat((e.target as HTMLInputElement)?.value || "0"),
                    )}
                  class="range range-primary range-xs w-full"
                />
              {/if}
            </div>
          {/if}
          {#if tags.length > 0}
            <div class="card-actions">
              {#each tags as tag}
                <div class="badge badge-soft badge-xs">{tag}</div>
              {/each}
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

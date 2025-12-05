<script lang="ts">
  import type {
    SkillSelected,
    HeaderSection,
    DefaultsConfig,
  } from "$lib/hellclock/skillcard-types";
  import { resolveRowConfig } from "$lib/hellclock/skillcard-defaults";
  import { resolveValue } from "$lib/hellclock/skillcard-resolver";
  import {
    formatValue,
    applyPrefixSuffix,
  } from "$lib/hellclock/skillcard-formats";
  import { translate } from "$lib/hellclock/lang";
  import { spriteUrl } from "$lib/hellclock/utils";
  import { useMaxSkillLevel } from "$lib/context/maxskilllevel.svelte";
  import { useSkillTagEvaluation } from "$lib/context/skilltagevaluation.svelte";

  import { getValueClasses } from "$lib/hellclock/skillcard-styles";

  interface Props {
    section: HeaderSection;
    skill: SkillSelected;
    evaluationResult: Record<string, unknown>;
    globalDefaults?: DefaultsConfig;
    lang?: string;
    expanded?: boolean;
    loading?: boolean;
    onToggle?: () => void;
    onLevelChange?: (newLevel: number) => void;
  }

  const {
    section,
    skill,
    evaluationResult,
    globalDefaults,
    lang = "en",
    expanded = false,
    loading = false,
    onToggle,
    onLevelChange,
  }: Props = $props();

  // Max skill level context
  const maxSkillLevelApi = useMaxSkillLevel();
  const maxLevel = $derived.by(() => maxSkillLevelApi.maxSkillLevel);
  const minLevel = 0;  // 0-indexed internally

  // Skill tag evaluation context
  const skillTagApi = useSkillTagEvaluation();

  function handleIncrement(e: MouseEvent) {
    e.stopPropagation();
    // maxLevel - 1 because selectedLevel is 0-indexed
    if (skill.selectedLevel < maxLevel - 1 && onLevelChange) {
      onLevelChange(skill.selectedLevel + 1);
    }
  }

  function handleDecrement(e: MouseEvent) {
    e.stopPropagation();
    if (skill.selectedLevel > minLevel && onLevelChange) {
      onLevelChange(skill.selectedLevel - 1);
    }
  }

  const skillId = $derived(skill.skill.name);

  // Resolve header rows
  const nameRow = $derived(section.rows.find((r) => r.id === "name"));
  const levelRow = $derived(section.rows.find((r) => r.id === "level"));
  const tagsRow = $derived(section.rows.find((r) => r.id === "tags"));
  const quickstat1Row = $derived(section.rows.find((r) => r.id === "quickstat1"));
  const quickstat2Row = $derived(section.rows.find((r) => r.id === "quickstat2"));

  // Resolve values
  const nameValue = $derived(() => {
    if (!nameRow) return skill.skill.name;
    const _resolved = resolveRowConfig(nameRow, globalDefaults);
    const value = resolveValue(nameRow, skill, evaluationResult, skillId);
    // localizedName is a LangText that needs translation
    if (value && typeof value === "object") {
      return translate(value as any, lang);
    }
    return String(value || skill.skill.name);
  });

  const levelValue = $derived(() => {
    // Display selectedLevel + 1 (0-indexed internally, 1-indexed visually)
    if (!levelRow) return `Lv. ${skill.selectedLevel + 1}`;
    const resolved = resolveRowConfig(levelRow, globalDefaults);
    let value = resolveValue(levelRow, skill, evaluationResult, skillId);
    // Add +1 for visual display since selectedLevel is 0-indexed
    if (typeof value === 'number') {
      value = value + 1;
    }
    const formatted = formatValue(value, resolved.format);
    return applyPrefixSuffix(formatted, resolved.prefix, resolved.suffix);
  });

  const tagsValue = $derived(() => {
    if (!tagsRow) return skill.skill.skillTags || [];
    const value = resolveValue(tagsRow, skill, evaluationResult, skillId, skillTagApi);
    if (Array.isArray(value)) return value;
    return [];
  });

  // Resolve quickstat values
  const quickstat1Value = $derived(() => {
    if (!quickstat1Row) return null;
    const resolved = resolveRowConfig(quickstat1Row, globalDefaults);
    const value = resolveValue(quickstat1Row, skill, evaluationResult, skillId);
    const formatted = formatValue(value, resolved.format);
    return {
      value: applyPrefixSuffix(formatted, resolved.prefix, resolved.suffix),
      classes: getValueClasses(resolved.style),
      displayName: resolved.displayName
    };
  });

  const quickstat2Value = $derived(() => {
    if (!quickstat2Row) return null;
    const resolved = resolveRowConfig(quickstat2Row, globalDefaults);
    const value = resolveValue(quickstat2Row, skill, evaluationResult, skillId);
    const formatted = formatValue(value, resolved.format);
    return {
      value: applyPrefixSuffix(formatted, resolved.prefix, resolved.suffix),
      classes: getValueClasses(resolved.style),
      displayName: resolved.displayName
    };
  });
</script>

<button
  class="flex items-center gap-3 p-4 cursor-pointer transition-colors {expanded
    ? 'bg-primary/10 border-b border-primary/30 hover:bg-primary/15'
    : 'hover:bg-base-200'}"
  onclick={onToggle}
  type="button"
>
  <!-- Skill Icon -->
  <div class="avatar">
    <div
      class="w-12 h-12 rounded flex items-center justify-center {expanded
        ? 'bg-primary/30 border border-primary'
        : 'bg-base-300 border border-base-400'}"
    >
      <img
        src={spriteUrl(skill.skill.icon)}
        alt={nameValue()}
        class="h-8 w-8 object-contain"
      />
    </div>
  </div>

  <!-- Skill Info -->
  <div class="flex-1 text-left">
    <div class="flex items-center gap-2 mb-1">
      <h3 class="font-bold">{nameValue()}</h3>
      <div class="flex items-center gap-1">
        {#if onLevelChange && maxLevel > 0}
          <button
            class="btn btn-xs btn-circle btn-ghost"
            onclick={handleDecrement}
            disabled={skill.selectedLevel <= minLevel}
            title="Decrease level"
            type="button"
          >
            -
          </button>
        {/if}
        <div
          class="badge badge-sm {expanded ? 'badge-primary' : 'badge-outline'}"
        >
          {levelValue()}
        </div>
        {#if onLevelChange && maxLevel > 0}
          <button
            class="btn btn-xs btn-circle btn-ghost"
            onclick={handleIncrement}
            disabled={skill.selectedLevel >= maxLevel - 1}
            title="Increase level (max: {maxLevel})"
            type="button"
          >
            +
          </button>
        {/if}
      </div>
    </div>
    <div class="flex gap-1 flex-wrap">
      {#each tagsValue() as tag, i (i)}
        <div class="badge badge-outline badge-xs">{tag}</div>
      {/each}
    </div>
  </div>

  <!-- Primary Stats Display -->
  <div class="text-right flex flex-col gap-1">
    {#if loading}
      <div class="skeleton h-4 w-16"></div>
      <div class="skeleton h-3 w-12"></div>
    {:else}
      {#if quickstat1Value()}
        <div class="stat-value text-sm {quickstat1Value()?.classes}">
          {quickstat1Value()?.value}
        </div>
      {/if}
      {#if quickstat2Value()}
        <div class="stat-desc text-xs">
          {quickstat2Value()?.displayName ? `${quickstat2Value()?.displayName}: ` : ''}{quickstat2Value()?.value}
        </div>
      {/if}
    {/if}
  </div>

  <!-- Expand/Collapse Button -->
  <div class="btn btn-sm btn-ghost btn-circle">
    {expanded ? "▼" : "▶"}
  </div>
</button>

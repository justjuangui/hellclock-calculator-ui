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
  }: Props = $props();

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
    const resolved = resolveRowConfig(nameRow, globalDefaults);
    const value = resolveValue(nameRow, skill, evaluationResult, skillId);
    // localizedName is a LangText that needs translation
    if (value && typeof value === "object") {
      return translate(value as any, lang);
    }
    return String(value || skill.skill.name);
  });

  const levelValue = $derived(() => {
    if (!levelRow) return `Lv. ${skill.selectedLevel}`;
    const resolved = resolveRowConfig(levelRow, globalDefaults);
    const value = resolveValue(levelRow, skill, evaluationResult, skillId);
    const formatted = formatValue(value, resolved.format);
    return applyPrefixSuffix(formatted, resolved.prefix, resolved.suffix);
  });

  const tagsValue = $derived(() => {
    if (!tagsRow) return skill.skill.skillTags || [];
    const value = resolveValue(tagsRow, skill, evaluationResult, skillId);
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
      <div
        class="badge badge-sm {expanded ? 'badge-primary' : 'badge-outline'}"
      >
        {levelValue()}
      </div>
    </div>
    <div class="flex gap-1 flex-wrap">
      {#each tagsValue() as tag}
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

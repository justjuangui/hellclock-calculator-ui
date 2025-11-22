<script lang="ts">
  import type { DetailSection, SkillSelected, DefaultsConfig } from '$lib/hellclock/skillcard-types';
  import { resolveRowConfig } from '$lib/hellclock/skillcard-defaults';
  import { resolveValue } from '$lib/hellclock/skillcard-resolver';
  import SkillCardRow from './SkillCardRow.svelte';

  interface Props {
    section: DetailSection;
    skill: SkillSelected;
    evaluationResult: Record<string, unknown>;
    globalDefaults?: DefaultsConfig;
    onOpenExplain?: (statId: string) => void;
  }

  const { section, skill, evaluationResult, globalDefaults, onOpenExplain }: Props = $props();

  const skillId = $derived(skill.skill.name);

  // Track selected tab
  let selectedTab = $state<string | null>(null);

  // Set default tab if none selected
  $effect(() => {
    if (!selectedTab && section.tabs.length > 0) {
      selectedTab = section.tabs[0].id;
    }
  });

  // Get current tab
  const currentTab = $derived(
    section.tabs.find(tab => tab.id === selectedTab)
  );

  // Resolve rows for current tab
  const resolvedRows = $derived(() => {
    if (!currentTab) return [];

    return currentTab.rows.map(row => ({
      resolved: resolveRowConfig(row, globalDefaults, section.defaults),
      value: resolveValue(row, skill, evaluationResult, skillId)
    }));
  });
</script>

<div class="space-y-2">
  <!-- Tabs -->
  <div role="tablist" class="tabs tabs-boxed tabs-xs bg-base-200">
    {#each section.tabs as tab (tab.id)}
      <button
        role="tab"
        class="tab {selectedTab === tab.id ? 'tab-active' : ''}"
        onclick={() => (selectedTab = tab.id)}
        type="button"
      >
        {tab.displayName}
      </button>
    {/each}
  </div>

  <!-- Tab Content -->
  <div class="space-y-1">
    {#each resolvedRows() as { resolved, value } (resolved.id)}
      <SkillCardRow
        row={resolved}
        {value}
        {skillId}
        {onOpenExplain}
      />
    {/each}
  </div>
</div>

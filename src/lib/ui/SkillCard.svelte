<script lang="ts">
  import { translate } from "$lib/hellclock/lang";
  import type { SkillSelected } from "$lib/hellclock/skills";
  import { getContext } from "svelte";
  import { useEvaluationManager } from "$lib/context/evaluation.svelte";
  import type { SkillDisplayHelper } from "$lib/hellclock/skillcard-helper";
  import SkillCardHeader from "./skillcard/SkillCardHeader.svelte";
  import SkillCardSummary from "./skillcard/SkillCardSummary.svelte";
  import SkillCardDamageDistribution from "./skillcard/SkillCardDamageDistribution.svelte";
  import SkillCardDetail from "./skillcard/SkillCardDetail.svelte";

  interface Props {
    skill: SkillSelected;
    slotId: string;
    onRemove: () => void;
    onOpenExplain?: (stat: string) => void;
  }

  const { skill, slotId, onRemove, onOpenExplain }: Props = $props();

  const skillsHelper = getContext("skillsHelper");
  const skillDisplayHelper = getContext<SkillDisplayHelper>("skillDisplayHelper");
  const lang = getContext<string>("lang") || "en";
  const evaluationManager = useEvaluationManager();

  // Component state
  let expanded = $state(false);
  let evaluation = $state<any>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Get display config for this skill
  const displayConfig = $derived(
    skillDisplayHelper?.getConfigOrDefault(skill.skill.name)
  );

  $effect(() => {
    evaluateSkillSafely();
  });

  async function evaluateSkillSafely() {
    try {
      loading = true;
      error = null;

      // Wait for overall stats evaluation to complete first
      const statEval = evaluationManager.statEvaluation;
      if (statEval.loading) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const result = await evaluationManager.evaluateSkill(skill, skillsHelper);
      evaluation = result;
      loading = false;
    } catch (e: any) {
      error = String(e?.message || e);
      loading = false;
    }
  }

  function toggleExpanded() {
    expanded = !expanded;
  }
</script>

<div
  class={`card bg-base-100 shadow-lg transition-all ${
    expanded
      ? "border-2 border-primary shadow-xl"
      : "border border-base-300 hover:border-base-400"
  }`}
>
  <div class="card-body p-0">
    <!-- Card Header -->
    {#if displayConfig?.sections?.header}
      <SkillCardHeader
        section={displayConfig.sections.header}
        {skill}
        evaluationResult={evaluation?.result || {}}
        globalDefaults={displayConfig.defaults}
        {lang}
        {expanded}
        {loading}
        onToggle={toggleExpanded}
      />
    {/if}

    <!-- Summary Section (Quick Stats) -->
    {#if displayConfig?.sections?.summary}
      <SkillCardSummary
        section={displayConfig.sections.summary}
        {skill}
        evaluationResult={evaluation?.result || {}}
        globalDefaults={displayConfig.defaults}
        {loading}
      />
    {/if}

    <!-- Expanded Content -->
    {#if expanded}
      <div class="p-4 space-y-3">
        <!-- Description -->
        <p class="text-sm opacity-80 leading-relaxed">
          {translate(skill.skill.descriptionKey, lang)}
        </p>

        <!-- Damage Distribution -->
        {#if displayConfig?.sections?.damageDistribution}
          <SkillCardDamageDistribution
            section={displayConfig.sections.damageDistribution}
            {skill}
            evaluationResult={evaluation?.result || {}}
            globalDefaults={displayConfig.defaults}
          />
        {/if}

        {#if error}
          <div class="alert alert-error alert-sm">
            <span class="text-sm">{error}</span>
          </div>
        {:else if loading}
          <div class="space-y-2">
            <div class="skeleton h-4 w-full"></div>
            <div class="skeleton h-4 w-3/4"></div>
          </div>
        {:else if displayConfig?.sections?.detail}
          <!-- Detail Section with Tabs -->
          <SkillCardDetail
            section={displayConfig.sections.detail}
            {skill}
            evaluationResult={evaluation?.result || {}}
            globalDefaults={displayConfig.defaults}
            {onOpenExplain}
          />
        {:else if evaluation?.valueGroups}
          <!-- Fallback to legacy tab rendering -->
          <div role="tablist" class="tabs tabs-boxed tabs-xs bg-base-200">
            {#each evaluation.valueGroups as group (group.id)}
              <button
                role="tab"
                class="tab"
                type="button"
              >
                {group.displayName}
              </button>
            {/each}
          </div>
        {/if}

        <!-- Action Buttons -->
        <div class="flex gap-2 pt-2">
          <button
            class="btn btn-xs btn-outline flex-1"
            onclick={onRemove}
            type="button"
          >
            Remove Skill
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

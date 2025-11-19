<script lang="ts">
  import { translate } from "$lib/hellclock/lang";
  import type { SkillSelected } from "$lib/hellclock/skills";
  import { spriteUrl } from "$lib/hellclock/utils";
  import { getContext } from "svelte";
  import { useEvaluationManager } from "$lib/context/evaluation.svelte";
  import DamageDistributionBar from "./DamageDistributionBar.svelte";

  interface Props {
    skill: SkillSelected;
    slotId: string;
    onRemove: () => void;
    onOpenExplain?: (stat: string) => void;
  }

  const { skill, slotId, onRemove, onOpenExplain }: Props = $props();

  const skillsHelper = getContext("skillsHelper");
  const lang = getContext<string>("lang") || "en";
  const evaluationManager = useEvaluationManager();

  // Component state
  let expanded = $state(false);
  let evaluation = $state<any>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let selectedTab = $state<string | null>(null);

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
        // Wait a bit for the overall evaluation to complete
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const result = await evaluationManager.evaluateSkill(skill, skillsHelper);
      evaluation = result;

      // Set default tab if none selected
      if (!selectedTab && result.valueGroups?.length > 0) {
        selectedTab = result.valueGroups[0].id;
      }

      loading = false;
    } catch (e: any) {
      error = String(e?.message || e);
      loading = false;
    }
  }

  function toggleExpanded() {
    expanded = !expanded;
  }

  // Helper to get skill display name
  const skillName = $derived(translate(skill.skill.localizedName, lang));

  // Helper to extract quick stats from evaluation result
  function getQuickStats() {
    if (!evaluation?.result) return null;

    // Extract key stats based on skill type
    const result = evaluation.result;

    return {
      damage:
        result["BaseDamage"] ||
        result["Damage"] ||
        skill.skill.baseDamageMod ||
        0,
      dps: result["DPS"] || 0,
      manaCost: skill.skill.manaCost || 0,
      speed: skill.skill.useAttackSpeed
        ? result["AttackSpeed"] || "1.0s"
        : skill.skill.cooldown
          ? `${skill.skill.cooldown}s`
          : "N/A",
    };
  }

  const quickStats = $derived(getQuickStats());
</script>

<div
  class={`card bg-base-100 shadow-lg transition-all ${
    expanded
      ? "border-2 border-primary shadow-xl"
      : "border border-base-300 hover:border-base-400"
  }`}
>
  <div class="card-body p-0">
    <!-- Card Header (always visible) -->
    <button
      class={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
        expanded
          ? "bg-primary/10 border-b border-primary/30 hover:bg-primary/15"
          : "hover:bg-base-200"
      }`}
      onclick={toggleExpanded}
      type="button"
    >
      <!-- Skill Icon -->
      <div class="avatar">
        <div
          class={`w-12 h-12 rounded flex items-center justify-center ${
            expanded
              ? "bg-primary/30 border border-primary"
              : "bg-base-300 border border-base-400"
          }`}
        >
          <img
            src={spriteUrl(skill.skill.icon)}
            alt={skillName}
            class="h-8 w-8 object-contain"
          />
        </div>
      </div>

      <!-- Skill Info -->
      <div class="flex-1 text-left">
        <div class="flex items-center gap-2 mb-1">
          <h3 class="font-bold">{skillName}</h3>
          <div
            class={`badge badge-sm ${expanded ? "badge-primary" : "badge-outline"}`}
          >
            Lv. {skill.selectedLevel}
          </div>
        </div>
        <div class="flex gap-1 flex-wrap">
          {#each skill.skill.skillTags || [] as tag}
            <div class="badge badge-outline badge-xs">{tag}</div>
          {/each}
        </div>
      </div>

      <!-- Primary Stats Display -->
      <div class="text-right flex flex-col gap-1">
        {#if loading}
          <div class="skeleton h-4 w-16"></div>
          <div class="skeleton h-3 w-12"></div>
        {:else if quickStats}
          <div class="stat-value text-error text-sm">
            {quickStats.damage}
          </div>
          <div class="stat-desc text-xs">
            DPS: {quickStats.dps}
          </div>
        {/if}
      </div>

      <!-- Expand/Collapse Button -->
      <div class="btn btn-sm btn-ghost btn-circle">
        {expanded ? "▼" : "▶"}
      </div>
    </button>

    <!-- Quick Stats Preview (always visible) -->
    <div class="grid grid-cols-4 gap-2 p-3 bg-base-200/50">
      {#if loading}
        <div class="text-center">
          <div class="skeleton h-3 w-12 mx-auto mb-1"></div>
          <div class="skeleton h-4 w-16 mx-auto"></div>
        </div>
        <div class="text-center">
          <div class="skeleton h-3 w-12 mx-auto mb-1"></div>
          <div class="skeleton h-4 w-16 mx-auto"></div>
        </div>
        <div class="text-center">
          <div class="skeleton h-3 w-12 mx-auto mb-1"></div>
          <div class="skeleton h-4 w-16 mx-auto"></div>
        </div>
        <div class="text-center">
          <div class="skeleton h-3 w-12 mx-auto mb-1"></div>
          <div class="skeleton h-4 w-16 mx-auto"></div>
        </div>
      {:else if quickStats}
        <div class="text-center">
          <div class="text-xs opacity-60">Damage</div>
          <div class="font-bold text-error">{quickStats.damage}</div>
        </div>
        <div class="text-center">
          <div class="text-xs opacity-60">DPS</div>
          <div class="font-bold text-success">{quickStats.dps}</div>
        </div>
        <div class="text-center">
          <div class="text-xs opacity-60">Mana</div>
          <div class="font-bold text-warning">{quickStats.manaCost}</div>
        </div>
        <div class="text-center">
          <div class="text-xs opacity-60">Speed</div>
          <div class="font-bold text-info">{quickStats.speed}</div>
        </div>
      {/if}
    </div>

    <!-- Expanded Content (conditional) -->
    {#if expanded}
      <div class="p-4 space-y-3">
        <!-- Description -->
        <p class="text-sm opacity-80 leading-relaxed">
          {translate(skill.skill.descriptionKey, lang)}
        </p>

        <!-- Damage Distribution -->
        <DamageDistributionBar evaluationResult={evaluation?.result} />

        {#if error}
          <div class="alert alert-error alert-sm">
            <span class="text-sm">{error}</span>
          </div>
        {:else if loading}
          <div class="space-y-2">
            <div class="skeleton h-4 w-full"></div>
            <div class="skeleton h-4 w-3/4"></div>
          </div>
        {:else if evaluation?.valueGroups}
          <!-- Tabs for detailed stats -->
          <div role="tablist" class="tabs tabs-boxed tabs-xs bg-base-200">
            {#each evaluation.valueGroups as group (group.id)}
              <button
                role="tab"
                class={`tab ${selectedTab === group.id ? "tab-active" : ""}`}
                onclick={() => (selectedTab = group.id)}
                type="button"
              >
                {group.displayName}
              </button>
            {/each}
          </div>

          <!-- Tab Content: Stats -->
          <div class="space-y-1">
            {#each evaluation?.valueGroups?.find((g) => g.id === selectedTab)?.displayValueMods ?? [] as valStat (valStat.id)}
              <div
                class="flex items-center justify-between text-sm hover:bg-base-200 px-2 py-1 rounded transition-colors group"
              >
                <span class="opacity-70">{valStat.displayName}</span>
                <div class="flex items-center gap-2">
                  <span class="font-mono">{evaluation.result?.[valStat.id] ?? "N/A"}</span>
                  {#if onOpenExplain}
                    <button
                      aria-label="Explain {valStat.displayName}"
                      class="opacity-0 group-hover:opacity-100 p-1 hover:bg-base-300 rounded transition-all"
                      onclick={() => onOpenExplain(valStat.id)}
                      type="button"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        class="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z"
                        />
                        <circle cx="12" cy="12" r="3.25" />
                      </svg>
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>

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
        {/if}
      </div>
    {/if}
  </div>
</div>

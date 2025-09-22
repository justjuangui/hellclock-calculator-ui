<script lang="ts">
  import { translate } from "$lib/hellclock/lang";
  import type { SkillSelected } from "$lib/hellclock/skills";
  import { spriteUrl } from "$lib/hellclock/utils";
  import { getContext } from "svelte";
  import { useSkillEquipped } from "$lib/context/skillequipped.svelte";
  import { useEvaluationManager } from "$lib/context/evaluation.svelte";

  interface Props {
    openExplain: (stat: string) => void;
  }
  const { openExplain }: Props = $props();

  const skillsAPI = useSkillEquipped();
  const evaluationManager = useEvaluationManager();
  const skillsHelper = getContext("skillsHelper");
  const lang = getContext<string>("lang") || "en";

  let selectedSkillValueModGroup = $state<string | null>(null);

  // Combined effect for skill selection and evaluation
  $effect(() => {
    console.log("Full re-evaluation triggered");
    const currentlySelected = skillsAPI.selectedSkill;
    const activeSkills = skillsAPI.activeSkills;

    // Auto-select first available skill if none selected or current is invalid
    const stillValid =
      currentlySelected &&
      activeSkills.some(
        (skill) => skill.skill.name === currentlySelected.skill.name,
      );

    if (!stillValid) {
      if (activeSkills.length > 0) {
        skillsAPI.setSelectedSkill(activeSkills[0]);
      } else {
        skillsAPI.setSelectedSkill(null);
        selectedSkillValueModGroup = null;
      }
    }
  });

  // Evaluate skill when selection changes
  $effect(() => {
    console.log("Skill selection changed");
    const selectedSkill = skillsAPI.selectedSkill;

    if (!selectedSkill) {
      selectedSkillValueModGroup = null;
      skillsAPI.clearEvaluations();
      return;
    }

    // Trigger evaluation via EvaluationManager (after actor is built)
    evaluateSkillSafely(selectedSkill);
  });

  async function evaluateSkillSafely(skill: SkillSelected) {
    try {
      // Set loading state immediately
      skillsAPI.setCurrentEvaluation({
        skill,
        result: null,
        valueGroups: [],
        error: null,
        loading: true,
      });

      // Use EvaluationManager to evaluate skill (ensures actor is built first)
      const evaluation = await evaluationManager.evaluateSkill(
        skill,
        skillsHelper,
      );

      // Only update if the skill is still the same (prevent race conditions)
      if (skillsAPI.selectedSkill?.skill.name === skill.skill.name) {
        skillsAPI.setCurrentEvaluation(evaluation);
      }
    } catch (e: any) {
      // Only update if the skill is still the same
      if (skillsAPI.selectedSkill?.skill.name === skill.skill.name) {
        skillsAPI.setCurrentEvaluation({
          skill,
          result: null,
          valueGroups: [],
          error: String(e?.message || e),
          loading: false,
        });
      }
    }
  }

  // Update UI when evaluation completes
  $effect(() => {
    console.log("Evaluation result changed");
    const currentEval = skillsAPI.currentEvaluation;

    if (!currentEval) {
      selectedSkillValueModGroup = null;
      return;
    }

    // Set default tab if none selected and evaluation has groups
    if (!selectedSkillValueModGroup && currentEval.valueGroups?.length > 0) {
      selectedSkillValueModGroup = currentEval.valueGroups[0].id;
    }

    // Reset tab if current tab is not in available groups
    if (
      selectedSkillValueModGroup &&
      !currentEval.valueGroups?.some((g) => g.id === selectedSkillValueModGroup)
    ) {
      selectedSkillValueModGroup = currentEval.valueGroups?.[0]?.id || null;
    }
  });

  function selectFromUI(skill: SkillSelected | null) {
    skillsAPI.setSelectedSkill(skill);
  }
</script>

<div class="bg-base-100 border border-base-300 rounded-lg">
  <div class="p-3">
    <h3 class="text-base font-semibold mb-3">Skill Details</h3>
    <div class="flex flex-row gap-3">
      <div class="flex flex-col gap-1">
        {#each skillsAPI.activeSkills as skill (skill.skill.id)}
          <div class="tooltip tooltip-bottom">
            <div class="tooltip-content">
              <p class="opacity-70 text-xs">
                {translate(skill.skill.localizedName, lang)} Lvl.{skill.selectedLevel}
              </p>
            </div>
            <button
              class={`w-10 h-10 rounded border-2 flex items-center justify-center transition-colors ${skill === skillsAPI.selectedSkill ? "border-success bg-success/10" : "border-base-300 bg-base-200 hover:bg-base-300"}`}
              onkeydown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  selectFromUI(skill);
                  e.preventDefault();
                }
              }}
              onclick={() => {
                selectFromUI(skill);
              }}
            >
              <img
                src={spriteUrl(skill.skill.icon)}
                alt={translate(skill.skill.localizedName, lang)}
                class="h-7 w-7 object-contain"
              />
            </button>
          </div>
        {/each}
      </div>
      <div class="w-px bg-base-300 mx-1"></div>
      {#if skillsAPI.currentEvaluation?.error}
        <div class="grow">
          <div class="alert alert-error alert-sm">
            <span class="text-sm">{skillsAPI.currentEvaluation.error}</span>
          </div>
        </div>
      {:else if skillsAPI.currentEvaluation?.loading}
        <div class="flex flex-col gap-1 grow">
          <div class="skeleton h-4 w-1/2"></div>
          <div class="skeleton h-4 w-2/3"></div>
          <div class="skeleton h-4 w-1/3"></div>
        </div>
      {:else if skillsAPI.currentEvaluation?.result}
        {@const currentEval = skillsAPI.currentEvaluation}
        <div class="flex flex-col gap-2 grow">
          <div role="tablist" class="tabs tabs-border tabs-sm">
            {#each currentEval?.valueGroups ?? [] as group (group.id)}
              <button
                role="tab"
                class={`tab ${selectedSkillValueModGroup == group.id ? "tab-active" : ""}`}
                onkeydown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    selectedSkillValueModGroup = group.id;
                    e.preventDefault();
                  }
                }}
                onclick={() => (selectedSkillValueModGroup = group.id)}
              >
                {group.displayName}
              </button>
            {/each}
          </div>
          <div class="space-y-1 grow">
            {#each currentEval?.valueGroups?.find((g) => g.id === selectedSkillValueModGroup!)?.displayValueMods ?? [] as valStat (valStat.id)}
              <div class="flex items-center justify-between py-1 px-2 rounded hover:bg-base-200 transition-colors group">
                <span class="text-sm font-medium">{valStat.displayName}</span>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-mono">{currentEval?.result?.[valStat.id]}</span>
                  <button
                    aria-label="Explain {valStat.displayName}"
                    class="opacity-0 group-hover:opacity-100 p-1 hover:bg-base-300 rounded transition-all"
                    onclick={() => openExplain(valStat.id)}
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
                </div>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="grow">
          <p class="text-sm opacity-70">No stats listed for this group.</p>
        </div>
      {/if}
    </div>
  </div>
</div>

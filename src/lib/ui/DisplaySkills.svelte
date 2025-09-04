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
      const evaluation = await evaluationManager.evaluateSkill(skill, skillsHelper);
      
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

<div class="card bg-base-100 shadow">
  <div class="card-body">
    <h3 class="card-title">Skill Details</h3>
    <div class="flex flex-row gap-2">
      <div class="gap-2 flex flex-col">
        {#each skillsAPI.activeSkills as skill (skill.skill.id)}
          <div class="tooltip tooltip-bottom">
            <div class="tooltip-content">
              <p class="opacity-70 text-sm">
                {translate(skill.skill.localizedName, lang)} Lvl.{skill.selectedLevel}
              </p>
            </div>
            <div
              role="button"
              tabindex="0"
              class={`relative cursor-pointer aspect-square rounded-box border ${skill === skillsAPI.selectedSkill ? "border-success" : "border-base-300"} flex items-center justify-center w-12 h-12 bg-base-200 hover:bg-base-300 transition`}
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
                class="h-9 w-9 object-contain drop-shadow"
              />
            </div>
          </div>
        {/each}
      </div>
      <div class="divider divider-horizontal"></div>
      {#if skillsAPI.currentEvaluation?.error}
        <div class="grow">
          <div class="alert alert-soft alert-error">
            <span>{skillsAPI.currentEvaluation.error}</span>
          </div>
        </div>
      {:else if skillsAPI.currentEvaluation?.loading}
        <div class="flex gap-2 grow">
          <div class="skeleton h-6 w-1/2"></div>
          <div class="skeleton h-6 w-2/3"></div>
          <div class="skeleton h-6 w-1/3"></div>
        </div>
      {:else if skillsAPI.currentEvaluation?.result?.values}
        {@const currentEval = skillsAPI.currentEvaluation}
        <div class="flex flex-col gap-2 grow">
          <div role="tablist" class="tabs tabs-box tabs-sm">
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
          <div class="overflow-x-auto grow">
            <table class="table table-zebra table-md">
              <thead>
                <tr>
                  <th class="w-1/2">Stat</th>
                  <th class="text-right">Value</th>
                  <th class="w-10">Explain</th>
                </tr>
              </thead>
              <tbody>
                {#each currentEval?.valueGroups?.find((g) => g.id === selectedSkillValueModGroup!)?.displayValueMods ?? [] as valStat (valStat.id)}
                  <tr>
                    <td>{valStat.displayName}</td>
                    <td class="text-right"
                      >{currentEval?.result?.values?.[valStat.id]}</td
                    >
                    <td class="text-right">
                      <button
                        aria-label="Explain {valStat.displayName}"
                        class="btn btn-ghost btn-xs"
                        onclick={() => openExplain(valStat.id)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          class="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.5"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z"
                          />
                          <circle cx="12" cy="12" r="3.25" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {:else}
        <div class="grow">
          <div class="alert alert-soft alert-warning">
            <p class="opacity-70">No stats listed for this group.</p>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

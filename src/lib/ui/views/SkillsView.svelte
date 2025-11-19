<script lang="ts">
  import { useSkillEquipped } from "$lib/context/skillequipped.svelte";
  import SkillCard from "$lib/ui/SkillCard.svelte";
  import type { SkillsHelper, SkillSlotDefinition } from "$lib/hellclock/skills";
  import { getContext } from "svelte";

  let { onSkillSlotClicked, onOpenExplain } = $props<{
    onSkillSlotClicked: (s: SkillSlotDefinition, remove?: Boolean) => void;
    onOpenExplain?: (stat: string) => void;
  }>();

  const skillEquipped = useSkillEquipped();
  const skillsHelper = getContext<SkillsHelper>("skillsHelper");

  // Get all skill slots
  const skillSlots = $derived(skillsHelper.getSkillSlotsDefinitions());

  function handleOpenExplain(stat: string) {
    onOpenExplain?.(stat);
  }
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex justify-between items-center">
    <div>
      <h1 class="text-3xl font-bold">Skills Management</h1>
      <p class="text-sm opacity-70 mt-1">
        Configure your active skills and view their effects
      </p>
    </div>
    <div class="flex gap-2">
      <button
        class="btn btn-outline btn-sm"
        onclick={() => skillEquipped.clear()}
        disabled={skillEquipped.activeSkills.length === 0}
      >
        Clear All Skills
      </button>
    </div>
  </div>

  <!-- Skill Cards Grid -->
  <div class="grid grid-cols-2 gap-4">
    {#each skillSlots as slot (slot)}
      {@const skillData = skillEquipped.skillsEquipped[slot]}
      {#if skillData}
        <SkillCard
          skill={skillData}
          slotId={slot}
          onRemove={() => onSkillSlotClicked(slot, true)}
          onOpenExplain={handleOpenExplain}
        />
      {:else}
        <!-- Empty Slot Placeholder -->
        <button
          class="card bg-base-100 border border-dashed border-base-300 shadow-sm opacity-50 hover:opacity-70 hover:border-base-400 transition-all cursor-pointer"
          onclick={() => onSkillSlotClicked(slot)}
          type="button"
        >
          <div class="card-body p-0">
            <div class="flex items-center justify-center h-full min-h-[140px]">
              <div class="text-center">
                <div class="text-4xl mb-2 opacity-30">+</div>
                <div class="text-sm opacity-60">Empty Skill Slot</div>
              </div>
            </div>
          </div>
        </button>
      {/if}
    {/each}
  </div>

</div>

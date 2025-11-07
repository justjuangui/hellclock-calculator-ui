<script lang="ts">
  import { useSkillEquipped } from "$lib/context/skillequipped.svelte";
  import SkillSlots from "$lib/ui/SkillSlots.svelte";
  import DisplaySkills from "$lib/ui/DisplaySkills.svelte";
  import type { SkillSlotDefinition } from "$lib/hellclock/skills";

  let { onSkillSlotClicked, onOpenExplain } = $props<{
    onSkillSlotClicked: (s: SkillSlotDefinition, remove?: Boolean) => void;
    onOpenExplain?: (stat: string) => void;
  }>();

  const skillEquipped = useSkillEquipped();

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
      <button class="btn btn-outline btn-sm">Clear All Skills</button>
    </div>
  </div>

  <!-- Skills Slots Card -->
  <div class="card bg-base-100 border border-base-300 shadow-lg">
    <div class="card-body">
      <h2 class="card-title text-lg mb-4">
        <span class="text-xl">✨</span>
        Active Skills
        <span class="badge badge-primary ml-auto">
          {Object.values(skillEquipped.skillsEquipped).filter((s) => s)
            .length}/{Object.keys(skillEquipped.skillsEquipped).length}
        </span>
      </h2>
      <SkillSlots
        equipped={skillEquipped.skillsEquipped}
        {onSkillSlotClicked}
      />
    </div>
  </div>

  <!-- Info Card -->
  <div class="alert alert-info">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      class="stroke-current shrink-0 w-6 h-6"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <span
      >Click on a skill slot to open the skill selector and equip skills.</span
    >
  </div>

  <!-- Skills Details -->
  <div class="card bg-base-100 border border-base-300 shadow-lg">
    <div class="card-body">
      <h2 class="card-title text-lg mb-4">
        <span class="text-xl">📋</span>
        Skill Details
      </h2>
      <DisplaySkills openExplain={handleOpenExplain} />
    </div>
  </div>
</div>

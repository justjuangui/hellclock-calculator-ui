<script lang="ts">
  import { translate } from "$lib/hellclock/lang";
  interface Props {
    equipped: Partial<Record<SkillSlotDefinition, SkillSelected | null>>;
    onSkillSlotClicked: (slot: SkillSlotDefinition, remove?: boolean) => void;
  }
  import type {
    SkillSelected,
    SkillsHelper,
    SkillSlotDefinition,
  } from "$lib/hellclock/skills";
  import { spriteUrl } from "$lib/hellclock/utils";
  import { getContext } from "svelte";

  const { equipped, onSkillSlotClicked }: Props = $props();
  const skillsHelper = getContext<SkillsHelper>("skillsHelper");
  const lang = getContext<string>("lang") || "en";

  let skillSlots = $state(skillsHelper.getSkillSlotsDefinitions());
</script>

<div class="card bg-base-100 shadow">
  <div class="card-body">
    <h3 class="card-title">Skills</h3>
    <p class="text-sm opacity-70">
      Click a slot to browse and equip skills, to remove just click once again.
      Hover to see details.
    </p>
    <div class="flex flex-row gap-2">
      {#each skillSlots as s}
        <div class="tooltip tooltip-bottom">
          <div class="tooltip-content">
            {#if equipped[s]?.skill}
              <p class="opacity-70 text-sm">
                {translate(equipped[s]?.skill.localizedName, lang)} Lvl.{equipped[
                  s
                ]?.selectedLevel}
              </p>
            {:else}
              <p class="opacity-70">Empty</p>
            {/if}
          </div>
          <div
            role="button"
            tabindex="0"
            class={`relative cursor-pointer aspect-square rounded-box border ${equipped[s] ? "border-success" : "border-base-300"} flex items-center justify-center w-12 h-12 bg-base-200 hover:bg-base-300 transition`}
            onkeydown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSkillSlotClicked(s, equipped[s] ? true : false);
              }
            }}
            onclick={() => onSkillSlotClicked(s, equipped[s] ? true : false)}
          >
            {#if equipped[s]?.skill}
              <img
                src={spriteUrl(equipped[s]?.skill.icon)}
                alt={translate(equipped[s]?.skill.localizedName, lang)}
                class="h-9 w-9 object-contain drop-shadow"
              />
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

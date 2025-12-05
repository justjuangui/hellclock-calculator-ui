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

<div>
  <p class="text-xs opacity-70 mb-3">
    Click a slot to browse and equip skills, to remove just click once again.
    Hover to see details.
  </p>
  <div class="flex flex-row gap-1">
      {#each skillSlots as s, i (i)}
        <div class="tooltip tooltip-bottom">
          <div class="tooltip-content">
            {#if equipped[s]?.skill}
              <p class="opacity-70 text-xs">
                {translate(equipped[s]?.skill.localizedName, lang)} Lvl.{equipped[
                  s
                ]?.selectedLevel}
              </p>
            {:else}
              <p class="opacity-70 text-xs">Empty slot</p>
            {/if}
          </div>
          <button
            class={`w-10 h-10 rounded border-2 flex items-center justify-center transition-colors ${equipped[s] ? "border-success bg-success/10" : "border-base-300 bg-base-200 hover:bg-base-300"}`}
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
                class="h-7 w-7 object-contain"
              />
            {:else}
              <span class="text-xs opacity-60">+</span>
            {/if}
          </button>
        </div>
      {/each}
  </div>
</div>

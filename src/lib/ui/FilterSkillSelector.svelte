<script lang="ts">
  import { translate } from "$lib/hellclock/lang";
  import type { Skill, SkillSelected } from "$lib/hellclock/skills";
  import type { StatsHelper } from "$lib/hellclock/stats";
  import { fmtValue, spriteUrl } from "$lib/hellclock/utils";
  import { getContext } from "svelte";
  import { useMaxSkillLevel } from "$lib/context/maxskilllevel.svelte";

  interface Props {
    skills: SkillSelected[];
    onSkillSelected: (skill: SkillSelected) => void;
  }

  const statsHelper = getContext<StatsHelper>("statsHelper");
  const lang = getContext<string>("lang") || "en";
  const { skills, onSkillSelected }: Props = $props();

  const maxSkillLevelApi = useMaxSkillLevel();
  const maxLevel = $derived.by(() => maxSkillLevelApi.maxSkillLevel);

  let search = $state("");
  let scroller: HTMLDivElement | null = null;

  function matches(i: Skill, q: string): boolean {
    scroller?.scrollTo({ top: 0 });
    if (!q) return true;
    q = q.toLowerCase();
    return (
      translate(i.localizedName, lang).toLowerCase().includes(q) ||
      i.skillTags.some((st) => st.toLowerCase().includes(q))
    );
  }

  function containsTag(i: Skill, tag: string): boolean {
    if (!tag) return true;
    tag = tag.toLowerCase();
    return tag.includes(i.eDamageType.toLowerCase());
  }

  $effect(() => {
    if (scroller) {
      scroller.scrollTo({ top: 0 });
    }
  });
</script>

<div class="flex flex-col h-full px-6 pt-6">
  <div class="flex items-center justify-between gap-3">
    <h3 class="card-title">Select Skill</h3>
    <input
      class="input input-bordered input-sm w-56"
      placeholder="Search…"
      bind:value={search}
    />
  </div>
  <div class="divider my-2"></div>
  <div class="overflow-y-auto overflow-x-hidden grow" bind:this={scroller}>
    {#if (skills.length ?? 0) === 0}
      <p class="mt-4 opacity-70">No items available for this slot.</p>
    {:else}
      <div class="mt-4 grid gap-3 lg:grid-cols-2 pr-4">
        {#each (skills ?? []).filter((i) => matches(i.skill, search)) as sk, i (i)}
          <div>
            <div
              class="card bg-base-200 hover:bg-base-300 transition border-2 border-base-200"
              aria-label={`Skill ${translate(sk.skill.localizedName, lang)}`}
            >
              <div class="card-body p-3 gap-2 flex">
                <div class="flex items-center gap-2">
                  {#if sk.skill.icon}
                    <img
                      src={spriteUrl(sk.skill.icon)}
                      alt={translate(sk.skill.localizedName, lang)}
                      class="h-10 w-10 object-contain drop-shadow"
                    />
                  {:else}
                    <div
                      class="h-10 w-10 rounded bg-base-300 flex items-center justify-center text-xs"
                    >
                      N/A
                    </div>
                  {/if}
                  <div class="min-w-0 grow">
                    <div class="font-medium truncate">
                      {translate(sk.skill.localizedName, lang)}
                    </div>
                    <div class="flex w-full">
                      {#if maxLevel > 0}
                        <div class="grow text-xs opacity-70">
                          Lv. {Math.min(sk.selectedLevel, maxLevel - 1) + 1}
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={maxLevel - 1}
                          value={Math.min(sk.selectedLevel, maxLevel - 1)}
                          oninput={(e) => sk.selectedLevel = Number(e.currentTarget.value)}
                          class="range range-primary range-xs w-[100px]"
                        />
                      {:else}
                        <div class="grow text-xs opacity-50">
                          Allocate bell nodes to unlock skill levels
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>

                <div class="divider my-1"></div>
                <!-- tags lines -->
                <div
                  class="text-xs mt-1 space-y-1 flex flex-row flex-wrap gap-2"
                >
                  {#each sk.skill.skillTags as m, i (i)}
                    <div
                      class={`badge badge-outline badge-sm ${containsTag(sk.skill, m) ? "badge-accent" : ""} truncate`}
                    >
                      {m}
                    </div>
                  {/each}
                  {#if sk.skill.skillTags.length === 0}
                    <div class="opacity-60">No tags</div>
                  {/if}
                </div>
                <div
                  class="bg-base-300 p-2 rounded text-md flex-1 overflow-y-auto max-h-32"
                >
                  {translate(sk.skill.descriptionKey, lang)}
                </div>
                <!-- stat lines -->
                <div
                  class="text-xs mt-1 space-y-1 flex flex-col flex-1 justify-stretch"
                >
                  {#each sk.skill.statModifiersPerRankUpgrade as m, i (i)}
                    <div
                      class="badge badge-soft badge-accent truncate w-full flex"
                    >
                      <div class="grow">
                        {fmtValue(m, lang, statsHelper)} per Rank
                      </div>
                    </div>
                  {/each}
                  {#if sk.skill.statModifiersPerRankUpgrade.length === 0}
                    <div class="opacity-60">No modifiers</div>
                  {/if}
                </div>
                <div class="divider my-1"></div>
                <div class="mt-1">
                  <button
                    onclick={() => onSkillSelected(sk)}
                    class="btn btn-soft btn-primary btn-sm w-full"
                    >Use this skill</button
                  >
                </div>
              </div>
            </div>
          </div>
        {:else}
          <p class="mt-4 opacity-70">No items match your search.</p>
        {/each}
      </div>
    {/if}
  </div>
</div>

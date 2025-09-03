<script lang="ts">
  import type { Engine } from "$lib/engine";
  import { translate } from "$lib/hellclock/lang";
  import type {
    SkillSlotDefinition,
    SkillSelected,
    SkillsHelper,
    SkillValueGroup,
  } from "$lib/hellclock/skills";
  import { spriteUrl } from "$lib/hellclock/utils";
  import { getContext, onMount } from "svelte";

  interface Props {
    equipped: Partial<Record<SkillSlotDefinition, SkillSelected | null>>;
    openExplain: (stat: string) => void;
  }
  const { equipped, openExplain }: Props = $props();
  const skillsHelper = getContext<SkillsHelper>("skillsHelper");
  const lang = getContext<string>("lang") || "en";
  const engine = getContext<Engine>("engine");

  let selectedSkillSlot = $state<SkillSelected | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(false);

  let skillSlots = skillsHelper.getSkillSlotsDefinitions();
  let evalResult = $state<any>(null);
  let selectedSkillValueMods = $state<SkillValueGroup[]>([]);
  let selectedSkillValueModGroup = $state<string | null>(null);

  $effect.pre(() => {
    const stillValid =
      selectedSkillSlot &&
      skillSlots.some(
        (s) => equipped[s]?.skill.name === selectedSkillSlot?.skill.name,
      );

    if (stillValid) return;

    let next: SkillSelected | null = null;
    for (const s of skillSlots) {
      if (equipped[s]?.skill) {
        next = equipped[s] as SkillSelected;
        break;
      }
    }

    selectedSkillSlot = next;
  });

  async function examine(
    sel: SkillSelected,
  ): Promise<{ res: any; groups: SkillValueGroup[] }> {
    const groups = skillsHelper.getSkillDisplayValueModsById(sel.skill.name);
    const outputs = groups.flatMap((v) => v.displayValueMods.map((v) => v?.id));
    const payload = { set: {}, outputs };

    const res = await engine.eval(payload, { timeoutMs: 5000 });
    return { res, groups };
  }

  let run = 0;
  $effect(() => {
    const sel = selectedSkillSlot;
    const myRun = ++run;

    if (!sel) {
      error = null;
      evalResult = null;
      selectedSkillValueMods = [];
      selectedSkillValueModGroup = null;
      return;
    }

    loading = true;
    error = null;
    (async () => {
      try {
        const { res, groups } = await examine(sel);
        if (myRun !== run) return;

        if (res?.error) {
          error = res.error;
          evalResult = null;
          selectedSkillValueMods = groups ?? [];
          selectedSkillValueModGroup = groups?.[0]?.id ?? null;
          return;
        }

        evalResult = res;
        selectedSkillValueMods = groups ?? [];
        if (
          !selectedSkillValueModGroup &&
          !groups.some((g) => g.id === selectedSkillValueModGroup)
        ) {
          selectedSkillValueModGroup = groups[0]?.id || null;
        }
      } catch (e: any) {
        if (myRun !== run) return;
        error = String(e?.message || e);
        evalResult = null;
        selectedSkillValueMods = [];
        selectedSkillValueModGroup = null;
      } finally {
        if (myRun === run) loading = false;
      }
    })();
  });

  function selectFromUI(slot: SkillSelected | null) {
    selectedSkillSlot = slot;
  }
</script>

<div class="card bg-base-100 shadow">
  <div class="card-body">
    <h3 class="card-title">Skill Details</h3>
    <div class="flex flex-row gap-2">
      <div class="gap-2 flex flex-col">
        {#each skillSlots as s}
          {#if equipped[s]?.skill}
            <div class="tooltip tooltip-bottom">
              <div class="tooltip-content">
                <p class="opacity-70 text-sm">
                  {translate(equipped[s]?.skill.localizedName, lang)} Lvl.{equipped[
                    s
                  ]?.selectedLevel}
                </p>
              </div>
              <div
                role="button"
                tabindex="0"
                class={`relative cursor-pointer aspect-square rounded-box border ${equipped[s] == selectedSkillSlot ? "border-success" : "border-base-300"} flex items-center justify-center w-12 h-12 bg-base-200 hover:bg-base-300 transition`}
                onkeydown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    selectFromUI(equipped[s] as SkillSelected);
                    e.preventDefault();
                  }
                }}
                onclick={() => {
                  selectFromUI(equipped[s] as SkillSelected);
                }}
              >
                <img
                  src={spriteUrl(equipped[s]?.skill.icon)}
                  alt={translate(equipped[s]?.skill.localizedName, lang)}
                  class="h-9 w-9 object-contain drop-shadow"
                />
              </div>
            </div>
          {/if}
        {/each}
      </div>
      <div class="divider divider-horizontal"></div>
      {#if error}
        <div class="grow">
          <div class="alert alert-soft alert-error">
            <span>{error}</span>
          </div>
        </div>
      {:else if loading}
        <div class="flex gap-2 grow">
          <div class="skeleton h-6 w-1/2"></div>
          <div class="skeleton h-6 w-2/3"></div>
          <div class="skeleton h-6 w-1/3"></div>
        </div>
      {:else if evalResult?.values}
        <div class="flex flex-col gap-2 grow">
          <div role="tablist" class="tabs tabs-box tabs-sm">
            {#each selectedSkillValueMods as group}
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
                {#each selectedSkillValueMods.find((g) => g.id === selectedSkillValueModGroup!)!.displayValueMods as valStat}
                  <tr>
                    <td>{valStat.displayName}</td>
                    <td class="text-right">{evalResult.values[valStat.id]}</td>
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

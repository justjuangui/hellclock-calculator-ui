<script lang="ts">
  import { getContext } from "svelte";
  import { useConstellationEquipped } from "$lib/context/constellationequipped.svelte";
  import type { ConstellationsHelper } from "$lib/hellclock/constellations";
  import { translate } from "$lib/hellclock/lang";
  import { parseRGBA01ToCss, spriteUrl } from "$lib/hellclock/utils";

  const constellationEquippedApi = useConstellationEquipped();
  const constellationsHelper = getContext<ConstellationsHelper>("constellationsHelper");
  const lang = getContext<string>("lang") || "en";

  let isExpanded = $state(false);

  const devotionPaths = $derived.by(() => {
    if (!constellationsHelper) return [];

    return constellationsHelper
      .getAllDevotionConfigs()
      .filter((config) => {
        // Filter out configs hidden from UI
        if (config.hideFromUI) return false;

        // Filter out configs with empty nameKey (no translations)
        const translatedName = translate(config.nameKey, lang);
        return translatedName.trim().length > 0;
      })
      .map((config) => ({
        name: translate(config.nameKey, lang),
        category: config.eDevotionCategory,
        iconSprite: config.icon,
        iconUrl: spriteUrl(config.icon),
        color: parseRGBA01ToCss(config.nodeColor),
        iconColor: parseRGBA01ToCss(config.iconColor),
        points: 0, // TODO: Calculate actual points from allocated nodes
      }));
  });

  const totalPoints = $derived(
    constellationEquippedApi.getTotalDevotionSpentAll(),
  );
</script>

<div class="floating-devotion-paths fixed top-4 left-4 z-40">
  <div
    class="bg-base-100/90 backdrop-blur-md rounded-lg border border-base-content/20 shadow-xl transition-all duration-300"
    class:w-16={!isExpanded}
    class:w-52={isExpanded}
  >
    <!-- Toggle Button -->
    <button
      class="w-full p-3 flex items-center justify-center hover:bg-base-200/50 transition-colors rounded-t-lg"
      onclick={() => (isExpanded = !isExpanded)}
    >
      {#if isExpanded}
        <span class="text-xs font-semibold">Devotion Paths</span>
        <span class="ml-auto">◀</span>
      {:else}
        <span class="text-lg">☰</span>
      {/if}
    </button>

    <!-- Paths -->
    <div class="p-2 space-y-2">
      {#each devotionPaths as path}
        <div
          class="flex items-center gap-2 p-2 rounded transition-colors hover:bg-base-200/30"
          class:justify-center={!isExpanded}
        >
          {#if path.iconUrl}
            <img
              src={path.iconUrl}
              alt={path.name}
              class="w-8 h-8"
              style="filter: drop-shadow(0 0 4px {path.iconColor});"
            />
          {:else}
            <div
              class="w-8 h-8 rounded-full"
              style="background-color: {path.color};"
            ></div>
          {/if}
          {#if isExpanded}
            <div class="flex-1">
              <div class="text-xs font-semibold" style="color: {path.color};">
                {path.name}
              </div>
              <div class="text-lg font-bold">{path.points}</div>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    {#if isExpanded}
      <div class="border-t border-base-content/10 p-3 text-center">
        <div class="text-xs text-base-content/60">Total</div>
        <div class="text-xl font-bold">{totalPoints}</div>
      </div>
    {/if}
  </div>
</div>

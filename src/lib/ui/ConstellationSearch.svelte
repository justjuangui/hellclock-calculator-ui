<script lang="ts">
  import { getContext } from "svelte";
  import type {
    ConstellationsHelper,
    ConstellationSkillTreeDefinition,
    SkillTreeNodeDefinition,
  } from "$lib/hellclock/constellations";
  import { translate } from "$lib/hellclock/lang";

  let {
    onResultSelect,
  }: {
    onResultSelect?: (
      constellation: ConstellationSkillTreeDefinition,
      node?: SkillTreeNodeDefinition,
    ) => void;
  } = $props();

  const lang = getContext<string>("lang") || "en";
  const constellationsHelper = getContext<ConstellationsHelper>(
    "constellationsHelper",
  );

  let searchQuery = $state("");
  let showResults = $state(false);
  let selectedIndex = $state(0);

  type SearchResult = {
    type: "constellation" | "node";
    constellation: ConstellationSkillTreeDefinition;
    node?: SkillTreeNodeDefinition;
    label: string;
    sublabel?: string;
  };

  const searchResults = $derived.by(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];
    const constellations = constellationsHelper
      .getAllConstellations();

    for (const constellationDetails of constellations) {
      const constellation = constellationDetails.definition;
      const constellationName = translate(
        constellation.nameKey,
        lang,
      ).toLowerCase();

      // Check constellation name
      if (constellationName.includes(query)) {
        results.push({
          type: "constellation",
          constellation,
          label: translate(constellation.nameKey, lang),
        });
      }

      // Check node names
      for (const node of constellation.nodes) {
        const nodeName = translate(
          node.nameLocalizationKey,
          lang,
        ).toLowerCase();
        if (nodeName.includes(query)) {
          results.push({
            type: "node",
            constellation,
            node,
            label: translate(node.nameLocalizationKey, lang),
            sublabel: translate(constellation.nameKey, lang),
          });
        }
      }
    }

    return results.slice(0, 10); // Limit to 10 results
  });

  function handleInput() {
    showResults = searchQuery.trim().length > 0;
    selectedIndex = 0;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!showResults) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, searchResults.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        selectResult(searchResults[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      showResults = false;
      searchQuery = "";
    }
  }

  function selectResult(result: SearchResult) {
    if (onResultSelect) {
      onResultSelect(result.constellation, result.node);
    }
    showResults = false;
    searchQuery = "";
  }
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === "/" || (e.ctrlKey && e.key === "f")) {
      e.preventDefault();
      document.getElementById("constellation-search")?.focus();
    }
  }}
/>

<div
  class="floating-search fixed top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4"
>
  <div class="relative">
    <input
      id="constellation-search"
      type="text"
      placeholder="Search constellations & nodes... (Press / to focus)"
      class="input input-bordered w-full bg-base-100/90 backdrop-blur-md shadow-xl border-base-content/20 pr-10"
      bind:value={searchQuery}
      oninput={handleInput}
      onkeydown={handleKeydown}
      onfocus={() => (showResults = searchQuery.trim().length > 0)}
    />
    <div class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50">
      🔍
    </div>

    <!-- Search Results Dropdown -->
    {#if showResults && searchResults.length > 0}
      <div
        class="absolute top-full mt-2 w-full bg-base-100/95 backdrop-blur-md rounded-lg shadow-2xl border border-base-content/20 max-h-80 overflow-y-auto"
      >
        {#each searchResults as result, index (index)}
          <button
            class="w-full text-left px-4 py-3 hover:bg-base-200/50 transition-colors border-b border-base-content/10 last:border-0 {index ===
            selectedIndex
              ? 'bg-base-200/30'
              : ''}"
            onclick={() => selectResult(result)}
            onmouseenter={() => (selectedIndex = index)}
          >
            <div class="flex items-center gap-2">
              <span class="text-lg">
                {result.type === "constellation" ? "🌟" : "⭐"}
              </span>
              <div class="flex-1">
                <div class="font-semibold text-sm">{result.label}</div>
                {#if result.sublabel}
                  <div class="text-xs text-base-content/60">
                    {result.sublabel}
                  </div>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      </div>
    {:else if showResults && searchResults.length === 0}
      <div
        class="absolute top-full mt-2 w-full bg-base-100/95 backdrop-blur-md rounded-lg shadow-2xl border border-base-content/20 px-4 py-3 text-center text-base-content/60 text-sm"
      >
        No results found
      </div>
    {/if}
  </div>
</div>

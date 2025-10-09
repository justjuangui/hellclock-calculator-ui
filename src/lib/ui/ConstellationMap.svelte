<script lang="ts">
  import { getContext } from "svelte";
  import type {
    ConstellationSkillTreeDefinition,
    SkillTreeNodeDefinition,
  } from "$lib/hellclock/constellations";
  import { useConstellationEquipped } from "$lib/context/constellationequipped.svelte";
  import FloatingDevotionPaths from "./FloatingDevotionPaths.svelte";
  import ConstellationSearch from "./ConstellationSearch.svelte";
  import FloatingControls from "./FloatingControls.svelte";
  import ConstellationMapCanvas from "./ConstellationMapCanvas.svelte";

  let {
    onClose,
  }: {
    onClose?: () => void;
  } = $props();

  const lang = getContext<string>("lang") || "en";
  const constellationEquippedApi = useConstellationEquipped();
  let searchTarget = $state<{
    constellation: ConstellationSkillTreeDefinition;
    node?: SkillTreeNodeDefinition;
  } | null>(null);

  const totalDevotionSpent = $derived(
    constellationEquippedApi.getTotalDevotionSpentAll(),
  );

  const availablePoints = $derived(
    constellationEquippedApi.availableDevotionPoints - totalDevotionSpent,
  );

  function handleNodeClick(
    constellation: ConstellationSkillTreeDefinition,
    node: SkillTreeNodeDefinition,
  ) {
    const nodeLevel = constellationEquippedApi.getNodeLevel(
      constellation.id,
      node.name,
    );

    // If node is allocated, deallocate it
    if (nodeLevel > 0) {
      const result = constellationEquippedApi.deallocateNode(
        constellation.id,
        node.name,
      );

      if (!result.success) {
        alert(result.error);
      }
      return;
    }

    // If node is not allocated, try to allocate it
    const canAllocate = constellationEquippedApi.canAllocateNode(
      constellation.id,
      node.name,
    );

    if (!canAllocate.canAllocate) {
      alert(canAllocate.reason || "Cannot allocate this node");
      return;
    }

    if (availablePoints <= 0) {
      alert("No available devotion points");
      return;
    }

    const result = constellationEquippedApi.allocateNode(
      constellation.id,
      node.name,
    );

    if (!result.success) {
      alert(result.error);
    }
  }

  function handleRespec() {
    if (
      confirm("Reset all constellation points? This will cost 400 currency.")
    ) {
      constellationEquippedApi.clear();
    }
  }

  function handleSearchResult(
    constellation: ConstellationSkillTreeDefinition,
    node?: SkillTreeNodeDefinition,
  ) {
    searchTarget = { constellation, node };
  }
</script>

<div
  class="constellation-map-container fixed inset-0 bg-gradient-to-b from-base-300 to-base-200 z-50"
>
  <!-- Full-screen Canvas -->
  <div class="w-full h-full">
    <ConstellationMapCanvas
      onNodeClick={handleNodeClick}
      {searchTarget}
      {lang}
    />
  </div>

  <!-- Floating UI Overlays -->
  <FloatingDevotionPaths />

  <ConstellationSearch onResultSelect={handleSearchResult} />

  <FloatingControls onRespec={handleRespec} {onClose} />

  <!-- Controls Hint (Bottom-Right) -->
  <div
    class="fixed bottom-4 right-4 z-30 bg-base-100/80 backdrop-blur-sm rounded-lg p-2 text-xs text-base-content/60 shadow-lg"
  >
    <div>🖱️ Drag • 🔍 Zoom • 👆 Click</div>
  </div>
</div>


<style>
  .constellation-map-container {
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }
</style>

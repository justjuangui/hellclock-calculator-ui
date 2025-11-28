<script lang="ts">
  import { getContext } from "svelte";
  import type {
    BellsHelper,
    GreatBellSkillTreeDefinition,
    SkillTreeNodeDefinition,
    BellType,
  } from "$lib/hellclock/bells";
  import { BELL_IDS, BELL_TYPES_BY_ID } from "$lib/hellclock/bells";
  import { useBellEquipped } from "$lib/context/bellequipped.svelte";
  import BellMapCanvas from "./BellMapCanvas.svelte";

  let {
    onClose,
  }: {
    onClose?: () => void;
  } = $props();

  const lang = getContext<string>("lang") || "en";
  const bellsHelper = getContext<BellsHelper>("bellsHelper");
  const bellEquippedApi = useBellEquipped();

  // Derived values
  const activeBellId = $derived(bellEquippedApi.activeBellId);
  const pointsSpent = $derived(bellEquippedApi.getPointsSpentOnActiveBell());
  const availablePoints = $derived(
    bellEquippedApi.availableBellPoints - pointsSpent,
  );

  // Get bell display name
  function getBellName(id: number): string {
    const type = BELL_TYPES_BY_ID[id];
    return type ? `${type} Bell` : "Unknown Bell";
  }

  // Get bell color
  function getBellColorClass(type: BellType): string {
    switch (type) {
      case "Campaign":
        return "text-blue-400";
      case "Infernal":
        return "text-red-400";
      case "Oblivion":
        return "text-purple-400";
      default:
        return "text-white";
    }
  }

  function handleBellChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const newBellId = parseInt(select.value, 10);
    bellEquippedApi.selectBell(newBellId);
  }

  function handleNodeLeftClick(
    bell: GreatBellSkillTreeDefinition,
    node: SkillTreeNodeDefinition,
  ) {
    const nodeLevel = bellEquippedApi.getNodeLevel(bell.id, node.GUID);
    const maxLevel = node.maxLevel;

    // Check if at max level
    if (nodeLevel >= maxLevel) {
      alert(`Node already at max level (${maxLevel})`);
      return;
    }

    // Check if can allocate
    const canAllocate = bellEquippedApi.canAllocateNode(bell.id, node.GUID);
    if (!canAllocate.canAllocate) {
      alert(canAllocate.reason || "Cannot allocate this node");
      return;
    }

    // Check points
    if (availablePoints <= 0) {
      alert("No available bell points");
      return;
    }

    // Allocate (handles both new allocation and level increment)
    const result = bellEquippedApi.allocateNode(bell.id, node.GUID);
    if (!result.success) {
      alert(result.error);
    }
  }

  function handleNodeRightClick(
    bell: GreatBellSkillTreeDefinition,
    node: SkillTreeNodeDefinition,
  ) {
    const nodeLevel = bellEquippedApi.getNodeLevel(bell.id, node.GUID);

    if (nodeLevel <= 0) {
      return; // Nothing to deallocate
    }

    // Deallocate (handles level decrement or full removal internally)
    const result = bellEquippedApi.deallocateNode(bell.id, node.GUID);
    if (!result.success) {
      alert(result.error);
    }
  }

  function handleRespec() {
    if (confirm("Reset all bell points for the current bell?")) {
      bellEquippedApi.clearBell(activeBellId);
    }
  }
</script>

<div
  class="bell-map-container fixed inset-0 bg-gradient-to-b from-base-300 to-base-200 z-50"
>
  <!-- Full-screen Canvas -->
  <div class="w-full h-full">
    <BellMapCanvas
      bellId={activeBellId}
      onNodeClick={handleNodeLeftClick}
      onNodeRightClick={handleNodeRightClick}
      {lang}
    />
  </div>

  <!-- Bell Selector (Top-Left) -->
  <div
    class="fixed top-4 left-4 z-30 bg-base-100/90 backdrop-blur-sm rounded-lg p-4 shadow-lg"
  >
    <label class="label pb-1">
      <span class="label-text font-semibold">Select Bell</span>
    </label>
    <select
      class="select select-bordered select-sm w-full max-w-xs"
      value={activeBellId}
      onchange={handleBellChange}
    >
      {#each Object.entries(BELL_IDS) as [type, id]}
        <option value={id}>
          {type} Bell
        </option>
      {/each}
    </select>

    <!-- Points Display -->
    <div class="mt-3 text-sm">
      <div class="flex justify-between">
        <span class="opacity-70">Points Spent:</span>
        <span class="font-bold">{pointsSpent}</span>
      </div>
      <div class="flex justify-between">
        <span class="opacity-70">Available:</span>
        <span class="font-bold text-success">{availablePoints}</span>
      </div>
    </div>
  </div>

  <!-- Controls (Top-Right) -->
  <div
    class="fixed top-4 right-4 z-30 flex gap-2"
  >
    <button
      class="btn btn-sm btn-warning"
      onclick={handleRespec}
      disabled={pointsSpent === 0}
    >
      Reset Points
    </button>
    {#if onClose}
      <button class="btn btn-sm btn-ghost" onclick={onClose}>
        Close
      </button>
    {/if}
  </div>

  <!-- Controls Hint (Bottom-Right) -->
  <div
    class="fixed bottom-4 right-4 z-30 bg-base-100/80 backdrop-blur-sm rounded-lg p-2 text-xs text-base-content/60 shadow-lg"
  >
    <div>🖱️ Drag • 🔍 Zoom</div>
    <div>👆 Left: +Level • Right: -Level</div>
  </div>
</div>

<style>
  .bell-map-container {
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }
</style>

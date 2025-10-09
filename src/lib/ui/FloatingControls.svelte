<script lang="ts">
  import { useConstellationEquipped } from "$lib/context/constellationequipped.svelte";

  let {
    onRespec,
    onClose,
  }: {
    onRespec?: () => void;
    onClose?: () => void;
  } = $props();

  const constellationEquippedApi = useConstellationEquipped();

  const totalDevotionSpent = $derived(
    constellationEquippedApi.getTotalDevotionSpentAll(),
  );

  const availablePoints = $derived(
    constellationEquippedApi.availableDevotionPoints - totalDevotionSpent,
  );
</script>

<div class="floating-controls fixed top-4 right-4 z-40">
  <div
    class="flex items-center gap-2 bg-base-100/90 backdrop-blur-md rounded-lg border border-base-content/20 shadow-xl p-2"
  >
    <!-- Points Display -->
    <div class="flex items-center gap-2 px-3 py-1 bg-base-200/50 rounded">
      <span class="text-sm font-semibold">Points:</span>
      <span class="text-lg font-bold">{availablePoints}</span>
      <span class="text-yellow-500">★</span>
    </div>

    <!-- RESPEC Button -->
    {#if onRespec}
      <button
        class="btn btn-sm btn-warning gap-1"
        onclick={onRespec}
        disabled={totalDevotionSpent === 0}
      >
        <span>⚡</span>
        <span>RESPEC</span>
        <span class="text-xs opacity-70">400</span>
      </button>
    {/if}

    <!-- Close Button -->
    {#if onClose}
      <button class="btn btn-sm btn-circle btn-ghost" onclick={onClose}>
        ✕
      </button>
    {/if}
  </div>
</div>

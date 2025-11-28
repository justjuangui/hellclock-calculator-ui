<script lang="ts">
  import BellMap from "$lib/ui/BellMap.svelte";

  let {
    onClose,
  }: {
    onClose?: () => void;
  } = $props();

  function handleClose() {
    onClose?.();
  }
</script>

<!-- Full-screen bell map -->
<div class="fixed inset-0 z-50 bg-base-100">
  <BellMap onClose={handleClose} />
</div>

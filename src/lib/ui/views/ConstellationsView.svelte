<script lang="ts">
	import ConstellationMap from '$lib/ui/ConstellationMap.svelte';

	let {
		onClose
	} = $props<{
		onClose?: () => void;
	}>();

	function handleClose() {
		onClose?.();
	}
</script>

<!-- Full-screen constellation map -->
<div class="fixed inset-0 z-50 bg-base-100">
	<ConstellationMap onClose={handleClose} />
</div>

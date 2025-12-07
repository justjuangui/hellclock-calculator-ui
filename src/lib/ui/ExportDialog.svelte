<script lang="ts">
  import { getContext } from "svelte";
  import { useEquipped, ESlotsType } from "$lib/context/equipped.svelte";
  import { useSkillEquipped } from "$lib/context/skillequipped.svelte";
  import { useRelicInventory } from "$lib/context/relicequipped.svelte";
  import { useBellEquipped } from "$lib/context/bellequipped.svelte";
  import { useConstellationEquipped } from "$lib/context/constellationequipped.svelte";
  import { useWorldTierEquipped } from "$lib/context/worldtierequipped.svelte";
  import type { GearsHelper } from "$lib/hellclock/gears";
  import { collectBuild, exportBuild, hasBuildData } from "$lib/export";

  // Get context APIs
  const blessedGearApi = useEquipped(ESlotsType.BlessedGear);
  const trinketGearApi = useEquipped(ESlotsType.TrinkedGear);
  const skillApi = useSkillEquipped();
  const relicApi = useRelicInventory();
  const bellApi = useBellEquipped();
  const constellationApi = useConstellationEquipped();
  const worldTierApi = useWorldTierEquipped();
  const gearsHelper = getContext<GearsHelper>("gearsHelper");

  // Dialog state
  let dialog: HTMLDialogElement;
  let exportCode = $state("");
  let exportError = $state("");
  let copySuccess = $state(false);
  let exportStats = $state<{ totalBytes: number; base64Length: number } | null>(null);

  // Public methods
  export function open() {
    exportCode = "";
    exportError = "";
    copySuccess = false;
    exportStats = null;
    dialog?.showModal();
    generateExportCode();
  }

  export function close() {
    dialog?.close();
  }

  function generateExportCode() {
    try {
      // Collect build data from all context APIs
      const build = collectBuild({
        blessedGearApi,
        trinketGearApi,
        skillApi,
        relicApi,
        bellApi,
        constellationApi,
        worldTierApi,
        gearsHelper,
      });

      // Check if there's anything to export
      if (!hasBuildData(build)) {
        exportError = "No build data to export. Equip some gear, skills, or relics first.";
        return;
      }

      // Export to base64
      const result = exportBuild(build);

      if (result.success && result.code) {
        exportCode = result.code;
        exportStats = result.stats
          ? { totalBytes: result.stats.totalBytes, base64Length: result.stats.base64Length }
          : null;
        exportError = "";
      } else {
        exportError = result.error || "Failed to export build";
        exportCode = "";
      }
    } catch (error) {
      exportError = error instanceof Error ? error.message : "Unknown error";
      exportCode = "";
    }
  }

  async function copyToClipboard() {
    if (!exportCode) return;

    try {
      await navigator.clipboard.writeText(exportCode);
      copySuccess = true;
      // Reset after 2 seconds
      setTimeout(() => {
        copySuccess = false;
      }, 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  }
</script>

<dialog bind:this={dialog} class="modal">
  <div class="modal-box max-w-lg">
    <h3 class="font-bold text-lg mb-4">Export Build</h3>

    {#if exportError}
      <div class="alert alert-error mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="stroke-current shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{exportError}</span>
      </div>
    {:else if exportCode}
      <p class="text-sm opacity-70 mb-3">
        Your build has been encoded. Copy the code below to share it.
      </p>

      <div class="relative">
        <textarea
          class="textarea textarea-bordered w-full font-mono text-xs h-32 resize-none"
          readonly
          value={exportCode}
        ></textarea>
        <button
          class="btn btn-sm btn-primary absolute top-2 right-2"
          onclick={copyToClipboard}
        >
          {#if copySuccess}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Copied!
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Copy
          {/if}
        </button>
      </div>

      {#if exportStats}
        <p class="text-xs opacity-50 mt-2">
          {exportStats.base64Length} characters ({exportStats.totalBytes} bytes)
        </p>
      {/if}
    {:else}
      <div class="flex justify-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    {/if}

    <div class="modal-action">
      <button class="btn" onclick={close}>Close</button>
    </div>
  </div>

  <form method="dialog" class="modal-backdrop">
    <button aria-label="Close" onclick={close}>close</button>
  </form>
</dialog>

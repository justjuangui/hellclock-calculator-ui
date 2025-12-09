<script lang="ts">
  import type { PipelineInfo } from "./types";
  import PhaseView from "./PhaseView.svelte";

  interface Props {
    pipeline: PipelineInfo;
  }

  const { pipeline }: Props = $props();
</script>

<div class="space-y-4">
  <!-- Pipeline Steps (if available) -->
  {#if pipeline.pipelineSteps.length > 0}
    <div class="text-xs text-base-content/60">
      Pipeline: {pipeline.pipelineSteps.join(" → ")}
    </div>
  {/if}

  <!-- Phases -->
  <div class="space-y-2">
    {#each pipeline.phases as phase (phase.id)}
      <PhaseView {phase} />
    {/each}
  </div>

  <!-- No phases message -->
  {#if pipeline.phases.length === 0}
    <div class="text-center py-8 text-base-content/60">
      <p class="text-sm">No phases found in this pipeline.</p>
    </div>
  {/if}
</div>

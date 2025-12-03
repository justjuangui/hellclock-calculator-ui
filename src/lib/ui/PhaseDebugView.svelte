<script lang="ts">
  import { type EvaluationNode } from "$lib/engine/types";
  import { parsePhases } from "./phase/phase-parser";
  import PhaseWaterfallView from "./phase/PhaseWaterfallView.svelte";
  import PhaseDebugView from "./PhaseDebugView.svelte";

  interface Props {
    node: EvaluationNode;
  }

  const { node }: Props = $props();

  // Parse phases using the tree visitor utility
  const phases = $derived(parsePhases(node));

  // Helper for formatting values in fallback view
  const fmt = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/\.?0+$/, "");

  const metaEntries = (m?: Record<string, string | number>) =>
    Object.entries(m ?? {});
</script>

<div class="space-y-3">
  {#if phases.length === 0}
    <!-- Fallback: show original tree if no phases detected -->
    <div class="space-y-2">
      <div class="bg-base-100 border border-base-300 rounded-lg">
        <div class="p-3">
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm font-medium">
              {node.name || "(unnamed)"}
            </span>
            {#if node.type}
              <span class="badge badge-ghost badge-xs">{node.type}</span>
            {/if}
            <span class="badge badge-outline badge-xs font-mono">
              = {fmt(node.value)}
            </span>
          </div>

          {#if node.meta && metaEntries(node.meta).length}
            <div class="flex flex-wrap gap-1 text-xs mt-2">
              {#each metaEntries(node.meta) as [k, v] (k)}
                <span class="badge badge-ghost badge-xs">{k}: {v}</span>
              {/each}
            </div>
          {/if}

          {#if node.children?.length}
            <div class="mt-2 space-y-1">
              {#each node.children as c (c.name || Math.random())}
                <PhaseDebugView node={c} />
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <!-- Render table view directly -->
    <PhaseWaterfallView {phases} />
  {/if}
</div>

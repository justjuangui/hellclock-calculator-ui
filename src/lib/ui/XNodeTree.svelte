<script lang="ts">
  import { type EvaluationNode } from "$lib/engine/types";

  interface Props {
    node: EvaluationNode;
    depth?: number;
    expandAll?: boolean | null;
  }

  let { node, depth = 0, expandAll = null }: Props = $props();

  const fmt = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/\.?0+$/, "");

  const metaEntries = (m?: Record<string, string | number>) => Object.entries(m ?? {});

  // Determine initial expanded state: first level expanded by default, or controlled by expandAll
  let expanded = $state(expandAll !== null ? expandAll : depth === 0);

  // React to expandAll changes
  $effect(() => {
    if (expandAll !== null) {
      expanded = expandAll;
    }
  });

  const hasChildren = node.children && node.children.length > 0;

  function toggleExpanded() {
    expanded = !expanded;
  }
</script>

<div class="space-y-2">
  <div class="flex items-center gap-2">
    {#if hasChildren}
      <button
        onclick={toggleExpanded}
        class="btn btn-ghost btn-xs p-0 min-h-0 h-auto w-4 hover:bg-transparent"
        aria-label={expanded ? "Collapse" : "Expand"}
      >
        <span class="text-base leading-none select-none">
          {expanded ? "▼" : "▶"}
        </span>
      </button>
    {:else}
      <span class="w-4"></span>
    {/if}
    <span class="font-mono text-sm">{node.name || "(unnamed)"}</span>
    {#if node.type}<span class="badge badge-ghost badge-sm">{node.type}</span>{/if}
    <span class="badge badge-outline badge-sm">= {fmt(node.value)}</span>
  </div>

  {#if node.meta && metaEntries(node.meta).length}
    <div class="flex flex-wrap gap-1 text-xs opacity-70">
      {#each metaEntries(node.meta) as [k, v]}
        <span class="badge badge-ghost">{k}: {v}</span>
      {/each}
    </div>
  {/if}

  {#if node.details}
    <div class="text-xs opacity-60 ml-2">
      {#each Object.entries(node.details) as [key, value]}
        <div><strong>{key}:</strong> {JSON.stringify(value)}</div>
      {/each}
    </div>
  {/if}

  {#if hasChildren && expanded}
    <div class="ml-3 border-l pl-3 space-y-3">
      {#each node.children as c}
        <svelte:self node={c} depth={depth + 1} {expandAll} />
      {/each}
    </div>
  {/if}
</div>

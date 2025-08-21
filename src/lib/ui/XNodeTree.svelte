<script lang="ts">
  import { type XNode } from '$lib/engine/types';

  export let node: XNode;

  const fmt = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/\.?0+$/, '');

  const metaEntries = (m?: Record<string, string>) => Object.entries(m ?? {});
</script>

<div class="space-y-2">
  <div class="flex items-center gap-2">
    <span class="font-mono text-sm">{node.name ?? '(unnamed)'}</span>
    {#if node.op}<span class="badge badge-ghost badge-sm">{node.op}</span>{/if}
    <span class="badge badge-outline badge-sm">= {fmt(node.value)}</span>
  </div>

  {#if metaEntries(node.meta).length}
    <div class="flex flex-wrap gap-1 text-xs opacity-70">
      {#each metaEntries(node.meta) as [k,v]}
        <span class="badge badge-ghost">{k}: {v}</span>
      {/each}
    </div>
  {/if}

  {#if node.children?.length}
    <div class="ml-3 border-l pl-3 space-y-3">
      {#each node.children as c}
        <svelte:self node={c} />
      {/each}
    </div>
  {/if}
</div>

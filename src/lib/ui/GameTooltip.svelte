<script lang="ts">
  import type { TooltipLine } from "$lib/hellclock/utils";
  import { spriteUrl } from "$lib/hellclock/utils";

  interface Props {
    lines: TooltipLine[];
  }

  const { lines }: Props = $props();
</script>

<div class="tooltip-content">
  {#each lines as line}
    {#if line.type === "header"}
      <p
        class="text-sm font-semibold mb-1"
        style={line.color ? `color: ${line.color}` : ""}
      >
        {line.text}
      </p>
    {:else if line.type === "info"}
      <p class="text-xs opacity-70 mb-0.5">{line.text}</p>
    {:else if line.type === "divider"}
      <div class="divider my-1"></div>
    {:else if line.type === "affix"}
      <div class="flex items-center gap-1 mb-0.5">
        {#if line.icon}
          <img
            src={spriteUrl(line.icon)}
            alt=""
            class="w-3 h-3 opacity-60"
          />
        {/if}
        <p class="text-xs">{line.text}</p>
      </div>
    {/if}
  {/each}
</div>
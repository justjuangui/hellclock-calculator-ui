<script lang="ts">
  import type { FormulaInfo } from "./types";
  import XNodeTree from "../XNodeTree.svelte";
  import { formatNumber } from "$lib/utils/phase-formatter";

  interface Props {
    formula: FormulaInfo;
    name: string;
    value: number;
  }

  const { formula, name, value }: Props = $props();
</script>

<div class="space-y-3">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-lg font-semibold">{name}</h3>
      <div class="text-xs text-base-content/60">Formula Expression</div>
    </div>
    <span class="badge badge-lg badge-primary font-mono">
      = {formatNumber(value)}
    </span>
  </div>

  <!-- Expression Tree -->
  <div class="card bg-base-100 border border-base-300 p-3">
    <XNodeTree node={formula.expression} />
  </div>
</div>

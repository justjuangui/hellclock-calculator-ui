<script lang="ts">
  import type { EvaluationNode } from "$lib/engine/types";
  import { parseExplanation } from "./phase/phase-parser";
  import PipelineView from "./phase/PipelineView.svelte";
  import FormulaView from "./phase/FormulaView.svelte";
  import DamageFlowView from "./phase/DamageFlowView.svelte";
  import XNodeTree from "./XNodeTree.svelte";

  interface Props {
    node: EvaluationNode;
  }

  const { node }: Props = $props();

  const parsed = $derived(parseExplanation(node));
</script>

<div class="space-y-3">
  <!-- Type indicator -->
  <div class="text-xs text-base-content/60">
    {#if parsed.rootType === "stat"}
      Stat with Pipeline
    {:else if parsed.rootType === "damage_flow"}
      Damage Flow
    {:else}
      Formula
    {/if}
  </div>

  <!-- Content -->
  {#if parsed.rootType === "damage_flow" && parsed.damageFlow}
    <DamageFlowView damageFlow={parsed.damageFlow} name={parsed.name} />
  {:else if parsed.rootType === "stat" && parsed.pipeline}
    <PipelineView pipeline={parsed.pipeline} />
  {:else if parsed.rootType === "formula" && parsed.formula}
    <FormulaView
      formula={parsed.formula}
      name={parsed.name}
      value={parsed.value}
    />
  {:else}
    <!-- Fallback to raw tree if no structured view available -->
    <XNodeTree {node} expandAll={false} />
  {/if}
</div>

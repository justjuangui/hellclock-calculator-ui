<script lang="ts">
  import { type EvaluationNode } from "$lib/engine/types";
  import ExplanationView from "./ExplanationView.svelte";

  interface Props {
    node: EvaluationNode;
  }

  const { node }: Props = $props();
</script>

<!--
  PhaseDebugView is now a wrapper around ExplanationView for backward compatibility.
  The new ExplanationView handles all explanation types:
  - Pipeline (stat with phases)
  - Damage Flow
  - Formula expressions
-->
<ExplanationView {node} />

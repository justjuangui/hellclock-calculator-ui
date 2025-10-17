<script lang="ts">
  import { type EvaluationNode } from "$lib/engine/types";
  import PhaseDebugView from "./PhaseDebugView.svelte";

  type Props = {
    node: EvaluationNode;
  };

  const { node }: Props = $props();

  const fmt = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/\.?0+$/, "");

  const metaEntries = (m?: Record<string, string | number>) =>
    Object.entries(m ?? {});

  // Parse the debug tree to identify phases and organize contributions
  const parsePhases = (rootNode: EvaluationNode) => {
    const phases: Array<{
      id: string;
      name: string;
      displayName: string;
      value: number;
      contributions: EvaluationNode[];
      color: string;
    }> = [];
    let phaseCounter = 0;

    // Phase color mapping for better visual distinction
    const phaseColors = {
      base: "badge-primary",
      add: "badge-secondary",
      mult: "badge-accent",
      multadd: "badge-info",
      override: "badge-warning",
    };

    // Recursively find all contribution nodes within a phase tree
    const findContributionsRecursively = (
      node: EvaluationNode,
    ): EvaluationNode[] => {
      const contributions: EvaluationNode[] = [];

      const traverse = (current: EvaluationNode) => {
        if (current.type === "contribution") {
          contributions.push(current);
        }
        if (current.children) {
          current.children.forEach((child) => traverse(child));
        }
      };

      if (node.children) {
        node.children.forEach((child) => traverse(child));
      }

      return contributions;
    };

    const findPhases = (node: EvaluationNode) => {
      if (node.type && node.type.includes("phase_")) {
        const phaseName = node.type;

        const displayName = node.name
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        phases.push({
          id: `phase-${phaseCounter++}`,
          name: phaseName,
          displayName: displayName,
          value: node.value,
          contributions: findContributionsRecursively(node),
          color:
            phaseColors[phaseName as keyof typeof phaseColors] ||
            "badge-neutral",
        });

        return;
      }
      // Check if this node represents a phase (contains "phase_" in name)
      if (node.name && node.name.includes("phase_")) {
        const phaseName = node.name.replace("phase_", "");
        const displayName =
          phaseName.charAt(0).toUpperCase() + phaseName.slice(1);

        phases.push({
          id: `phase-${phaseCounter++}`,
          name: phaseName,
          displayName: displayName,
          value: node.value,
          contributions: findContributionsRecursively(node),
          color:
            phaseColors[phaseName as keyof typeof phaseColors] ||
            "badge-neutral",
        });

        // STOP: Don't search for more phases inside this phase node
        // We only want top-level phases, not nested phases
        return;
      }

      // Only recursively search children for phases if this is NOT a phase node
      if (node.children) {
        node.children.forEach((child) => findPhases(child));
      }
    };

    findPhases(rootNode);
    return phases;
  };

  const phases = parsePhases(node);
  let expandedPhases = $state<Record<string, boolean>>({});

  const togglePhase = (phaseName: string) => {
    expandedPhases[phaseName] = !expandedPhases[phaseName];
  };

  // Helper function to format contribution data in a user-friendly way
  const formatContributionInfo = (contribution: EvaluationNode) => {
    const info: Record<string, any> = {};

    // Extract user-friendly information from meta and details
    if (contribution.meta) {
      Object.entries(contribution.meta).forEach(([key, value]) => {
        switch (key) {
          case "operation_result":
            info["Operation"] = value;
            break;
          case "function":
            info["Function"] = value;
            break;
          case "source":
            info["Source"] = value;
            break;
          case "layer":
            info["Layer"] = value;
            break;
          default:
            if (
              key !== "contribution_count" &&
              key !== "filter_group" &&
              key !== "filter_layer" &&
              key !== "filter_who"
            ) {
              info[key.charAt(0).toUpperCase() + key.slice(1)] = value;
            }
        }
      });
    }

    if (contribution.details) {
      Object.entries(contribution.details).forEach(([key, value]) => {
        if (key !== "original_value") {
          info[key.charAt(0).toUpperCase() + key.slice(1)] = value;
        }
      });
    }

    return info;
  };
</script>

<div class="space-y-2">
  {#if phases.length === 0}
    <!-- Fallback: show original tree if no phases detected -->
    <div class="space-y-2">
      <div class="bg-base-100 border border-base-300 rounded-lg">
        <div class="p-3">
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm font-medium"
              >{node.name || "(unnamed)"}</span
            >
            {#if node.type}
              <span class="badge badge-ghost badge-xs">{node.type}</span>
            {/if}
            <span class="badge badge-outline badge-xs font-mono"
              >= {fmt(node.value)}</span
            >
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
    <!-- Enhanced phase-based view -->
    {#each phases as phase (phase.id)}
      <div class="bg-base-100 border border-base-300 rounded-lg">
        <!-- Enhanced Phase Header -->
        <button
          class="w-full text-left transition-colors hover:bg-base-200"
          onclick={() => togglePhase(phase.id)}
        >
          <div
            class="flex items-center justify-between p-3 border-b border-base-300"
          >
            <div class="flex items-center gap-2">
              <h4 class="text-base font-semibold text-base-content">
                {phase.displayName} Phase
              </h4>
              <span class="badge {phase.color} badge-xs font-mono"
                >= {fmt(phase.value)}</span
              >
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-base-content/70">
                {phase.contributions.length}
                {phase.contributions.length === 1
                  ? "contribution"
                  : "contributions"}
              </span>
              <div
                class="transition-transform duration-200 {expandedPhases[
                  phase.id
                ]
                  ? 'rotate-90'
                  : 'rotate-0'}"
              >
                <svg
                  class="w-3 h-3 text-base-content/70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </button>

        <!-- Enhanced Phase Contributions (Collapsible) -->
        {#if expandedPhases[phase.id]}
          <div class="p-3 space-y-2 bg-base-200/30">
            {#if phase.contributions.length === 0}
              <!-- Empty State: No contributions found -->
              <div
                class="flex flex-col items-center justify-center py-6 text-center"
              >
                <div class="mb-2">
                  <svg
                    class="w-8 h-8 text-base-content/30"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15.5 6.5a7.5 7.5 0 11-11.196 3.461A7.5 7.5 0 015.196 6.5z"
                    />
                  </svg>
                </div>
                <h6 class="text-sm font-medium text-base-content/60 mb-1">
                  No contributions for this phase
                </h6>
                <p class="text-xs text-base-content/50 max-w-sm">
                  This phase doesn't contain any contribution nodes. The
                  calculation uses base values or other computation methods.
                </p>
              </div>
            {:else}
              {#each phase.contributions as contribution (Math.random())}
                <div class="bg-base-100 rounded border border-base-300 p-3">
                  <!-- Contribution Header -->
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <h5 class="text-sm font-medium text-base-content">
                        {contribution.name && contribution.name !== "(unnamed)"
                          ? contribution.name
                              .split("_")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1),
                              )
                              .join(" ")
                          : "Contribution"}
                      </h5>
                      {#if contribution.type}
                        <span class="badge badge-ghost badge-xs"
                          >{contribution.type}</span
                        >
                      {/if}
                    </div>
                    <span class="badge badge-outline badge-xs font-mono"
                      >= {fmt(contribution.value)}</span
                    >
                  </div>

                  <!-- Contribution Details -->
                  <div class="space-y-1">
                    {#each Object.entries(formatContributionInfo(contribution)) as [key, value] (key)}
                      <div class="flex items-start gap-2 text-xs">
                        <span class="font-medium text-base-content/80 min-w-16"
                          >{key}:</span
                        >
                        <span
                          class="text-base-content/70 font-mono bg-base-200 px-1 py-0.5 rounded text-xs"
                        >
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : value}
                        </span>
                      </div>
                    {/each}
                  </div>

                  <!-- Nested Children (if any) -->
                  {#if contribution.children?.length}
                    <div class="mt-3 space-y-1">
                      <h6
                        class="text-xs font-medium text-base-content/80 border-b border-base-300 pb-1"
                      >
                        Sub-calculations
                      </h6>
                      <div class="space-y-1 pl-3 border-l-2 border-base-300">
                        {#each contribution.children as child (Math.random())}
                          <div class="bg-base-200/30 rounded p-2">
                            <div class="flex items-center justify-between mb-1">
                              <span class="font-mono text-xs text-base-content">
                                {child.name || "(unnamed)"}
                              </span>
                              <div class="flex items-center gap-1">
                                {#if child.type}
                                  <span class="badge badge-ghost badge-xs"
                                    >{child.type}</span
                                  >
                                {/if}
                                <span
                                  class="badge badge-outline badge-xs font-mono"
                                  >= {fmt(child.value)}</span
                                >
                              </div>
                            </div>

                            {#if child.meta && metaEntries(child.meta).length}
                              <div class="flex flex-wrap gap-1">
                                {#each metaEntries(child.meta) as [k, v] (k)}
                                  <span class="badge badge-ghost badge-xs"
                                    >{k}: {v}</span
                                  >
                                {/each}
                              </div>
                            {/if}
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>

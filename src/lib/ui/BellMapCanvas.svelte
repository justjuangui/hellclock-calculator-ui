<script lang="ts">
  import { onMount, onDestroy, getContext } from "svelte";
  import { Application, Container, Graphics, Sprite, Assets } from "pixi.js";
  import { Viewport } from "pixi-viewport";
  import type {
    BellsHelper,
    GreatBellSkillTreeDefinition,
    SkillTreeNodeDefinition,
  } from "$lib/hellclock/bells";
  import { BELL_TYPES_BY_ID } from "$lib/hellclock/bells";
  import { useBellEquipped } from "$lib/context/bellequipped.svelte";
  import { spriteUrl } from "$lib/hellclock/utils";
  import GameTooltip from "$lib/ui/GameTooltip.svelte";
  import type { StatsHelper } from "$lib/hellclock/stats";
  import type { SkillsHelper } from "$lib/hellclock/skills";

  let {
    bellId,
    onNodeClick,
    onNodeRightClick,
    lang = "en",
  }: {
    bellId: number;
    onNodeClick?: (
      bell: GreatBellSkillTreeDefinition,
      node: SkillTreeNodeDefinition,
    ) => void;
    onNodeRightClick?: (
      bell: GreatBellSkillTreeDefinition,
      node: SkillTreeNodeDefinition,
    ) => void;
    lang?: string;
  } = $props();

  const bellsHelper = getContext<BellsHelper>("bellsHelper");
  const bellEquippedApi = useBellEquipped();
  const statsHelper = getContext<StatsHelper>("statsHelper");
  const skillsHelper = getContext<SkillsHelper>("skillsHelper");

  let canvasContainer: HTMLDivElement;
  let app: Application | null = null;
  let viewport: Viewport | null = null;
  let isLoadingAssets = $state(true);
  let loadingError = $state<string | null>(null);

  // Tooltip state
  let hoveredNode = $state<{
    bell: GreatBellSkillTreeDefinition;
    node: SkillTreeNodeDefinition;
    screenX: number;
    screenY: number;
  } | null>(null);

  const NODE_SIZE = 20;
  const NODE_HOVER_SCALE = 1.2;

  // Get bell color based on type
  function getBellColor(id: number): number {
    const type = BELL_TYPES_BY_ID[id];
    switch (type) {
      case "Campaign":
        return 0x60a5fa; // Blue
      case "Infernal":
        return 0xf87171; // Red
      case "Oblivion":
        return 0xa78bfa; // Purple
      default:
        return 0xffffff;
    }
  }

  async function initPixi() {
    if (!canvasContainer) return;

    try {
      // Create Pixi application
      app = new Application();
      await app.init({
        width: canvasContainer.clientWidth,
        height: canvasContainer.clientHeight,
        backgroundColor: 0x0a0a0f,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
      });

      canvasContainer.appendChild(app.canvas);

      // Create viewport for pan/zoom
      viewport = new Viewport({
        screenWidth: canvasContainer.clientWidth,
        screenHeight: canvasContainer.clientHeight,
        worldWidth: 3000,
        worldHeight: 3000,
        events: app.renderer.events,
      });

      app.stage.addChild(viewport);

      // Activate plugins
      viewport.drag().pinch().wheel().decelerate().clampZoom({
        minScale: 0.2,
        maxScale: 1.5,
      });

      // Draw starfield background
      drawStarfield(viewport);

      // Draw the bell
      await drawBell(viewport);

      // Center viewport on bell nodes
      centerOnBell();

      isLoadingAssets = false;
    } catch (error) {
      console.error("Failed to initialize Pixi:", error);
      loadingError =
        error instanceof Error ? error.message : "Failed to load bell map";
      isLoadingAssets = false;
    }
  }

  function centerOnBell() {
    if (!viewport || !bellsHelper) return;

    const bell = bellsHelper.getBellById(bellId);
    if (!bell || bell.nodes.length === 0) {
      viewport.moveCenter(0, 0);
      return;
    }

    // Calculate center of all nodes
    let sumX = 0,
      sumY = 0;
    for (const node of bell.nodes) {
      sumX += node.Position[0];
      sumY += node.Position[1];
    }
    const centerX = sumX / bell.nodes.length;
    const centerY = sumY / bell.nodes.length;

    viewport.moveCenter(centerX, centerY);
    viewport.setZoom(0.5);
  }

  function drawStarfield(container: Container) {
    const stars = new Graphics();

    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 3000 - 1500;
      const y = Math.random() * 3000 - 1500;
      const radius = Math.random() * 1.5 + 0.5;
      const alpha = Math.random() * 0.4 + 0.2;

      stars.circle(x, y, radius);
      stars.fill({ color: 0xffffff, alpha });
    }

    container.addChild(stars);
  }

  async function drawBell(container: Container) {
    if (!bellsHelper) return;

    const bell = bellsHelper.getBellById(bellId);
    if (!bell) return;

    const bellContainer = new Container();
    container.addChild(bellContainer);

    const bellColor = getBellColor(bellId);

    // Draw edges first
    drawEdges(bellContainer, bell, bellColor);

    // Draw nodes
    drawNodes(bellContainer, bell, bellColor);
  }

  function drawEdges(
    container: Container,
    bell: GreatBellSkillTreeDefinition,
    bellColor: number,
  ) {
    const edgesGraphics = new Graphics();
    container.addChild(edgesGraphics);

    for (const node of bell.nodes) {
      const startX = node.Position[0];
      const startY = node.Position[1];

      for (const edge of node.edges) {
        const requiredNode = bell.nodes.find(
          (n) => n.name === edge.requiredNode.name,
        );
        if (!requiredNode) continue;

        const endX = requiredNode.Position[0];
        const endY = requiredNode.Position[1];

        const isAllocated =
          bellEquippedApi.isNodeAllocated(bell.id, node.GUID) &&
          bellEquippedApi.isNodeAllocated(bell.id, requiredNode.GUID);

        const color = isAllocated ? bellColor : 0x444444;
        const alpha = isAllocated ? 1 : 0.5;

        edgesGraphics.moveTo(startX, startY);
        edgesGraphics.lineTo(endX, endY);
        edgesGraphics.stroke({
          width: 2,
          color,
          alpha,
        });
      }
    }
  }

  function drawNodes(
    container: Container,
    bell: GreatBellSkillTreeDefinition,
    bellColor: number,
  ) {
    for (const node of bell.nodes) {
      const nodeContainer = new Container();
      const x = node.Position[0];
      const y = node.Position[1];
      nodeContainer.position.set(x, y);

      const level = bellEquippedApi.getNodeLevel(bell.id, node.GUID);
      const isAllocated = level > 0;
      const canAllocate = bellEquippedApi.canAllocateNode(
        bell.id,
        node.GUID,
      ).canAllocate;

      // Determine node appearance
      let fillColor = 0x1a1a2e;
      let glowColor = 0x444444;
      let strokeColor = 0x666666;
      let strokeWidth = 2;
      let glowAlpha = 0.2;

      if (isAllocated) {
        fillColor = bellColor;
        glowColor = bellColor;
        strokeColor = 0xffffff;
        strokeWidth = 3;
        glowAlpha = 0.8;
      } else if (canAllocate) {
        glowColor = bellColor;
        strokeColor = bellColor;
        glowAlpha = 0.4;
      }

      // Outer glow
      const glow = new Graphics();
      glow.circle(0, 0, NODE_SIZE / 2 + 4);
      glow.fill({ color: glowColor, alpha: glowAlpha });
      nodeContainer.addChild(glow);

      // Main node circle
      const circle = new Graphics();
      circle.circle(0, 0, NODE_SIZE / 2);
      circle.fill(fillColor);
      circle.stroke({
        width: strokeWidth,
        color: strokeColor,
        alpha: 1,
      });
      nodeContainer.addChild(circle);

      // Level indicator for multi-level nodes
      if (node.maxLevel > 1 && level > 0) {
        const levelText = new Graphics();
        levelText.circle(NODE_SIZE / 2, -NODE_SIZE / 2, 6);
        levelText.fill({ color: 0x000000, alpha: 0.8 });
        levelText.stroke({ width: 1, color: 0xffffff });
        nodeContainer.addChild(levelText);
      }

      // Make interactive
      nodeContainer.eventMode = "static";
      nodeContainer.cursor = "pointer";

      nodeContainer.on("pointerover", (event) => {
        nodeContainer.scale.set(NODE_HOVER_SCALE);

        if (app && app.canvas) {
          const rect = app.canvas.getBoundingClientRect();
          hoveredNode = {
            bell,
            node,
            screenX: event.global.x + rect.left,
            screenY: event.global.y + rect.top,
          };
        }
      });

      nodeContainer.on("pointerout", () => {
        nodeContainer.scale.set(1);
        hoveredNode = null;
      });

      nodeContainer.on("pointertap", () => {
        if (onNodeClick) {
          onNodeClick(bell, node);
        }
      });

      nodeContainer.on("rightclick", () => {
        if (onNodeRightClick) {
          onNodeRightClick(bell, node);
        }
      });

      container.addChild(nodeContainer);
    }
  }

  function updateCanvas() {
    if (!viewport) return;

    viewport.removeChildren();
    drawStarfield(viewport);
    drawBell(viewport);
  }

  // React to allocation changes
  $effect(() => {
    const _hash = bellEquippedApi.allocatedNodes.size;
    if (app && viewport) {
      updateCanvas();
    }
  });

  // Track previous bell ID to detect actual changes
  let previousBellId: number | null = null;

  // React to bell ID changes
  $effect(() => {
    const currentBellId = bellId;
    if (app && viewport) {
      updateCanvas();
      // Only center if bell ID actually changed
      if (previousBellId !== null && previousBellId !== currentBellId) {
        centerOnBell();
      }
      previousBellId = currentBellId;
    }
  });

  onMount(() => {
    initPixi();
  });

  onDestroy(() => {
    if (app) {
      app.destroy(true, { children: true });
      app = null;
    }
  });

  // Cleanup on window resize
  function handleResize() {
    if (app && canvasContainer) {
      app.renderer.resize(
        canvasContainer.clientWidth,
        canvasContainer.clientHeight,
      );
      if (viewport) {
        viewport.resize(
          canvasContainer.clientWidth,
          canvasContainer.clientHeight,
        );
      }
    }
  }
</script>

<svelte:window onresize={handleResize} />

<div class="relative w-full h-full">
  <div bind:this={canvasContainer} class="w-full h-full"></div>

  {#if isLoadingAssets}
    <div
      class="absolute inset-0 flex items-center justify-center bg-base-300/80"
    >
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {/if}

  {#if loadingError}
    <div class="absolute inset-0 flex items-center justify-center bg-base-300">
      <div class="alert alert-error max-w-md">
        <span>Error: {loadingError}</span>
      </div>
    </div>
  {/if}

  <!-- Tooltip -->
  {#if hoveredNode && bellsHelper && statsHelper && skillsHelper}
    <div
      class="fixed z-50 pointer-events-none w-64"
      style="left: {hoveredNode.screenX + 20}px; top: {hoveredNode.screenY + 20}px;"
    >
      <div class="bg-base-100 border border-base-300 rounded-lg shadow-xl p-3">
        <GameTooltip
          lines={bellsHelper.getTooltipLines(
            hoveredNode.bell,
            hoveredNode.node,
            lang,
            bellEquippedApi.getNodeLevel(
              hoveredNode.bell.id,
              hoveredNode.node.GUID,
            ),
            statsHelper,
            skillsHelper,
          )}
        />
      </div>
    </div>
  {/if}
</div>

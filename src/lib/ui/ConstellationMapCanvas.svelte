<script lang="ts">
  import { onMount, onDestroy, getContext } from "svelte";
  import {
    Application,
    Assets,
    Container,
    Graphics,
    Sprite,
    Text,
    TextStyle,
  } from "pixi.js";
  import { Viewport } from "pixi-viewport";
  import type {
    ConstellationDetails,
    ConstellationsHelper,
    ConstellationSkillTreeDefinition,
    SkillTreeNodeDefinition,
    DevotionConfig,
  } from "$lib/hellclock/constellations";
  import { useConstellationEquipped } from "$lib/context/constellationequipped.svelte";
  import { spriteUrl, parseRGBA01ToPixiHex } from "$lib/hellclock/utils";
  import GameTooltip from "$lib/ui/GameTooltip.svelte";
  import type { StatsHelper } from "$lib/hellclock/stats";
  import type { SkillsHelper } from "$lib/hellclock/skills";

  let {
    onNodeClick,
    searchTarget = null,
    lang = "en",
  }: {
    onNodeClick?: (
      constellation: ConstellationSkillTreeDefinition,
      node: SkillTreeNodeDefinition,
    ) => void;
    searchTarget?: {
      constellation: ConstellationSkillTreeDefinition;
      node?: SkillTreeNodeDefinition;
    } | null;
    lang?: string;
  } = $props();

  const constellationsHelper = getContext<ConstellationsHelper>(
    "constellationsHelper",
  );
  const constellationEquippedApi = useConstellationEquipped();
  const statsHelper = getContext<StatsHelper>("statsHelper");
  const skillsHelper = getContext<SkillsHelper>("skillsHelper");
  let canvasContainer: HTMLDivElement;
  let app: Application | null = null;
  let viewport: Viewport | null = null;

  // Tooltip state
  let hoveredNode = $state<{
    constellation: ConstellationSkillTreeDefinition;
    node: SkillTreeNodeDefinition;
    screenX: number;
    screenY: number;
  } | null>(null);

  const NODE_SIZE = 15;
  const NODE_HOVER_SCALE = 1.2;

  async function initPixi() {
    if (!canvasContainer) return;

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
      worldWidth: 4000,
      worldHeight: 4000,
      events: app.renderer.events,
    });

    app.stage.addChild(viewport);

    // Activate plugins
    viewport.drag().pinch().wheel().decelerate().clampZoom({
      minScale: 0.3,
      maxScale: 10,
    });

    // Draw starfield background
    drawStarfield(viewport);

    // Draw all constellations
    await drawAllConstellations(viewport);

    // Center viewport
    viewport.moveCenter(0, 0);
  }

  function drawStarfield(container: Container) {
    const stars = new Graphics();

    // Create random stars
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 4000;
      const y = Math.random() * 4000;
      const radius = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.5 + 0.3;

      stars.circle(x, y, radius);
      stars.fill({ color: 0xffffff, alpha });
    }

    container.addChild(stars);
  }

  async function drawAllConstellations(container: Container) {
    const constellations = constellationsHelper.getAllConstellations();
    // Assets are already preloaded by AssetPreloader in +layout.svelte
    // Just draw constellations using cached assets
    for (const constellationDetails of constellations) {
      await drawConstellation(container, constellationDetails);
    }
  }

  function calculatePositionInViewport(
    position: [number, number],
    nodeViewPosition: [number, number, number],
    nodeViewScale: [number, number, number],
  ): [number, number] {
    const x = position[0];
    const y = -position[1];
    return [x, y];
  }

  function calculateNodePositionInViewport(
    nodePosition: [number, number],
    nodeViewPosition: [number, number, number],
    nodeViewScale: [number, number, number],
  ): [number, number] {
    const x = nodePosition[0] * nodeViewScale[0] + nodeViewPosition[0];
    const y = nodePosition[1] * nodeViewScale[1] - nodeViewPosition[1];
    return [x, y];
  }

  function fitSprite(
    sprite: Sprite,
    boxW: number,
    boxH: number,
    mode: "contain" | "cover" = "contain",
  ) {
    const texW = sprite.texture.width;
    const texH = sprite.texture.height;
    if (!texW || !texH) return;

    const scaleX = boxW / texW;
    const scaleY = boxH / texH;
    const s =
      mode === "cover" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);

    sprite.scale.set(s);
    sprite.anchor.set(0.5);
  }

  async function drawConstellation(
    container: Container,
    constellationDetails: ConstellationDetails,
  ) {
    const constellation = constellationDetails.definition;
    const constellationContainer = new Container();
    const pos = calculatePositionInViewport(
      constellationDetails.position,
      constellationDetails.nodeViewPosition,
      constellationDetails.nodeViewScale,
    );

    // Get the devotion config for this constellation's category
    const devotionConfig = constellationsHelper.getDevotionConfigByCategory(
      constellation.eDevotionCategory as any,
    );

    // Fallback to Neutral if config not found
    const config =
      devotionConfig ||
      constellationsHelper.getDevotionConfigByCategory("Neutral");
    if (!config) return; // Skip if no config available

    container.addChild(constellationContainer);
    constellationContainer.position.set(pos[0], pos[1]);

    const constellationIsUnlocked =
      constellationEquippedApi.constellationUnlocked(constellation.id);

    if (constellationIsUnlocked) {
      const currentDevotionPoints =
        constellationEquippedApi.getTotalDevotionSpent(constellation.id);
      const totalNodes = constellation.nodes.length;

      const texture = Assets.get(
        spriteUrl(constellationDetails.definition.illustrationLine)!,
      );

      const sprite = Sprite.from(texture);
      sprite.alpha = 0.6;

      if (currentDevotionPoints === totalNodes) {
        const spriteColors = parseRGBA01ToPixiHex(
          config.illustrationMasteredColor,
        );
        sprite.tint = spriteColors.color;
        sprite.alpha = spriteColors.alpha;
      }

      constellationContainer.addChild(sprite);
      fitSprite(
        sprite,
        constellationDetails.width * constellationDetails.nodeViewScale[0],
        constellationDetails.height * constellationDetails.nodeViewScale[1],
        "contain",
      );
    }

    // Draw edges first (behind nodes)
    drawEdges(
      constellationContainer,
      constellation,
      constellationDetails.nodeViewPosition,
      constellationDetails.nodeViewScale,
      config,
    );

    // Draw nodes
    drawNodes(
      constellationContainer,
      constellation,
      constellationDetails.nodeViewPosition,
      constellationDetails.nodeViewScale,
      config,
    );
  }

  function drawEdges(
    container: Container,
    constellation: ConstellationSkillTreeDefinition,
    nodeViewPosition: [number, number, number],
    nodeViewScale: [number, number, number],
    devotionConfig: DevotionConfig,
  ) {
    const edgesGraphics = new Graphics();
    container.addChild(edgesGraphics);

    // Parse devotion colors for edges
    const investedColor = parseRGBA01ToPixiHex(
      devotionConfig.investedConnectionColor,
    );
    const appliedColor = parseRGBA01ToPixiHex(
      devotionConfig.appliedConnectionColor,
    );

    for (const node of constellation.nodes) {
      const nodePos = calculateNodePositionInViewport(
        node.Position,
        nodeViewPosition,
        nodeViewScale,
      );
      const startX = nodePos[0];
      const startY = nodePos[1];

      for (const edge of node.edges) {
        const requiredNode = constellation.nodes.find(
          (n) => n.name === edge.requiredNode.name,
        );
        if (!requiredNode) continue;

        const endPos = calculateNodePositionInViewport(
          requiredNode.Position,
          nodeViewPosition,
          nodeViewScale,
        );
        const endX = endPos[0];
        const endY = endPos[1];

        const isAllocated =
          constellationEquippedApi.isNodeAllocated(
            constellation.id,
            node.name,
          ) &&
          constellationEquippedApi.isNodeAllocated(
            constellation.id,
            requiredNode.name,
          );

        // Use devotion-specific colors
        const color = isAllocated ? appliedColor.color : investedColor.color;
        const alpha = isAllocated ? appliedColor.alpha : investedColor.alpha;

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
    constellation: ConstellationSkillTreeDefinition,
    nodeViewPosition: [number, number, number],
    nodeViewScale: [number, number, number],
    devotionConfig: DevotionConfig,
  ) {
    // Parse devotion colors for nodes
    const nodeColor = parseRGBA01ToPixiHex(devotionConfig.nodeColor);
    const appliedColor = parseRGBA01ToPixiHex(
      devotionConfig.appliedConnectionColor,
    );

    for (const node of constellation.nodes) {
      const nodeContainer = new Container();
      const pos = calculateNodePositionInViewport(
        node.Position,
        nodeViewPosition,
        nodeViewScale,
      );
      nodeContainer.position.set(pos[0], pos[1]);

      const level = constellationEquippedApi.getNodeLevel(
        constellation.id,
        node.name,
      );
      const isAllocated = level > 0;
      const canAllocate = constellationEquippedApi.canAllocateNode(
        constellation.id,
        node.name,
      ).canAllocate;

      // Determine node color using devotion config
      let fillColor = 0x1a1a2e;
      let glowColor = 0x44444;
      let strokeColor = 0x888888;
      let strokeWidth = 2;
      let glowAlpha = 0.2;

      if (isAllocated) {
        // Selected nodes: use nodeColor fill with appliedConnectionColor border
        fillColor = nodeColor.color;
        glowColor = appliedColor.color;
        // strokeColor = appliedColor.color;
        strokeWidth = 3;
        glowAlpha = 0.8;
      } else if (canAllocate) {
        glowColor = nodeColor.color;
        strokeColor = nodeColor.color;
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

      // Make interactive
      nodeContainer.eventMode = "static";
      nodeContainer.cursor = "pointer";

      nodeContainer.on("pointerover", (event) => {
        nodeContainer.scale.set(NODE_HOVER_SCALE);

        // Set tooltip state with screen coordinates
        if (app && app.canvas) {
          const rect = app.canvas.getBoundingClientRect();
          hoveredNode = {
            constellation,
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
          onNodeClick(constellation, node);
        }
      });

      container.addChild(nodeContainer);
    }
  }

  function updateCanvas() {
    if (!viewport) return;

    // Clear and redraw
    viewport.removeChildren();
    drawStarfield(viewport);
    drawAllConstellations(viewport);
  }

  // React to allocation changes
  $effect(() => {
    const hash = constellationEquippedApi.allocatedNodes.size;
    if (app && viewport) {
      updateCanvas();
    }
  });

  // React to search target changes - pan and zoom to result
  $effect(() => {
    if (searchTarget && viewport) {
      panToSearchTarget(searchTarget);
    }
  });

  function panToSearchTarget(target: {
    constellation: ConstellationSkillTreeDefinition;
    node?: SkillTreeNodeDefinition;
  }) {
    if (!viewport) return;

    const constellations = constellationsHelper.getAllConstellations();
    const index = constellations.find(
      (c) => c.definition.id === target.constellation.id,
    );
    if (!index) return;

    // Calculate constellation position
    const pos = calculatePositionInViewport(
      index.position,
      index.nodeViewPosition,
      index.nodeViewScale,
    );
    const constellationX = pos[0];
    const constellationY = pos[1];

    let targetX = constellationX + index.width / 2;
    let targetY = constellationY;

    // If specific node, adjust to node position
    if (target.node) {
      const nodePos = calculateNodePositionInViewport(
        target.node.Position,
        index.nodeViewPosition,
        index.nodeViewScale,
      );
      targetX += nodePos[0];
      targetY += nodePos[1];
    }

    // Animate pan to target
    viewport.animate({
      time: 500,
      position: { x: targetX, y: targetY },
      scale: 1.2,
    });
  }

  onMount(async () => {
    await initPixi();
  });

  onDestroy(() => {
    if (app) {
      app.destroy(true, { children: true });
      app = null;
    }
  });
</script>

<div
  bind:this={canvasContainer}
  class="constellation-map-canvas w-full h-full"
></div>

<!-- Tooltip Overlay -->
{#if hoveredNode}
  {@const nodeLevel = constellationEquippedApi.getNodeLevel(
    hoveredNode.constellation.id,
    hoveredNode.node.name,
  )}
  {@const tooltipLines = constellationsHelper.getTooltipLines(
    hoveredNode.constellation,
    hoveredNode.node,
    lang,
    nodeLevel,
    statsHelper,
    skillsHelper,
  )}
  <div
    class="fixed z-50 pointer-events-none"
    style="left: {hoveredNode.screenX + 20}px; top: {hoveredNode.screenY +
      20}px;"
  >
    <div class="bg-base-100 border border-base-300 rounded-lg shadow-xl p-3">
      <GameTooltip lines={tooltipLines} />
    </div>
  </div>
{/if}

<style>
  .constellation-map-canvas {
    position: relative;
    overflow: hidden;
    cursor: grab;
  }

  .constellation-map-canvas:active {
    cursor: grabbing;
  }
</style>

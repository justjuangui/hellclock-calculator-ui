<script lang="ts">
  import type {
    RelicItem,
    RelicsHelper,
    RelicBaseDefinition,
    RelicConfiguration,
    RelicRarity,
    RelicImbuedType,
    RelicAffix,
    RelicSize,
  } from "$lib/hellclock/relics";
  import { translate } from "$lib/hellclock/lang";
  import { parseRGBA01ToCss } from "$lib/hellclock/utils";
  import { getContext } from "svelte";
  import AffixSelector from "$lib/ui/AffixSelector.svelte";

  interface Props {
    title: string;
    availableSpace: { width: number; height: number };
    onRelicSelected: (relic: RelicItem) => void;
  }

  const relicsHelper = getContext<RelicsHelper>("relicsHelper");
  const lang = getContext<string>("lang") || "en";
  const { title, availableSpace, onRelicSelected }: Props = $props();

  // Selection flow state (in order: Size → Rarity → Tier → Icon)
  let selectedSize = $state<RelicSize | null>(null);
  let selectedRarity = $state<RelicRarity | null>(null);
  let selectedTier = $state<number>(1);
  let selectedImbuedType = $state<RelicImbuedType>("None");
  let search = $state("");

  // Active tab for affix configuration
  const affixTabs = [
    "special",
    "primary",
    "secondary",
    "imbuement",
    "corrupted",
  ];
  let activeAffixTab = $state<
    "primary" | "secondary" | "imbuement" | "corrupted" | "special"
  >("primary");

  // Selection state
  let selectedRelicDef = $state<RelicBaseDefinition | null>(null);
  let relicConfiguration = $state<RelicConfiguration | null>(null);

  // Available sizes based on space constraints
  const availableSizes = $derived.by(() => {
    if (!relicsHelper) return [];
    const sizes: RelicSize[] = ["Small", "Large", "Exalted", "Grand"];
    return sizes.filter((size) => {
      const sizeConfig = relicsHelper.getRelicSizeConfig(size);
      if (!sizeConfig) return false;
      return (
        sizeConfig.relicInventoryShape.width <= availableSpace.width &&
        sizeConfig.relicInventoryShape.height <= availableSpace.height
      );
    });
  });

  // Available rarities for selected size
  const availableRarities = $derived.by(() => {
    if (!selectedSize || !relicsHelper) return [];
    const relics = relicsHelper.getRelicDefinitionsBySize(selectedSize);
    const rarities = new Set<RelicRarity>();

    relics.forEach((relic) => {
      if (relic.type === "UniqueRelicBaseDefinition") {
        rarities.add("Unique");
      } else {
        // Non-unique relics can be Common, Magic, or Rare
        rarities.add("Common");
        rarities.add("Magic");
        rarities.add("Rare");
      }
    });

    return Array.from(rarities);
  });

  // Available relics for selected size and rarity
  const availableRelicDefs = $derived.by(() => {
    if (!selectedSize || !selectedRarity || !relicsHelper || !selectedTier)
      return [];

    let relics = relicsHelper.getRelicDefinitionsBySize(selectedSize);

    // Filter by rarity
    relics = relics.filter((relic) => {
      if (selectedRarity === "Unique") {
        return relic.type === "UniqueRelicBaseDefinition";
      } else {
        return (
          relic.type === "RelicBaseDefinition" &&
          relic.name.includes(`Tier${selectedTier}`)
        ); // Assuming naming convention includes tier
      }
    });

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      relics = relics.filter(
        (relic) =>
          (relic.nameLocalizationKey &&
            translate(relic.nameLocalizationKey, lang)
              ?.toLowerCase()
              .includes(searchLower)) ||
          relic.name.toLowerCase().includes(searchLower),
      );
    }

    return relics;
  });

  const availableImbuedTypes = $derived.by(() => {
    if (!selectedSize || !relicsHelper) return ["None"];
    return relicsHelper
      .getAvailableImbuedTypesForSize(selectedSize)
      .filter((m) => m != "Corrupted");
  });

  function getRelicSpriteUrl(rbd: RelicBaseDefinition, tier: number): string {
    let spriteName = "";
    if (rbd.sprite) {
      spriteName = rbd.sprite;
    } else {
      spriteName = relicsHelper?.getRelicSprite(rbd.eRelicSize, tier) || "";
    }

    return `/assets/sprites/${spriteName}.png`;
  }

  // Reset dependent selections when parent selection changes
  $effect(() => {
    if (selectedSize && !availableSizes.includes(selectedSize)) {
      selectedSize = null;
    }
  });

  $effect(() => {
    if (!selectedSize) {
      selectedImbuedType = "None";
    }
  });

  $effect(() => {
    if (
      selectedRarity &&
      (!selectedSize || !availableRarities.includes(selectedRarity))
    ) {
      selectedRarity = null;
    }
  });

  $effect(() => {
    if (
      selectedRelicDef &&
      (!selectedSize ||
        !selectedRarity ||
        selectedRelicDef.eRelicSize !== selectedSize)
    ) {
      selectedRelicDef = null;
    }
  });

  $effect(() => {
    if (selectedRelicDef && !availableRelicDefs.includes(selectedRelicDef)) {
      selectedRelicDef = null;
    }
  });

  // Update configuration when filters change
  $effect(() => {
    if (selectedRelicDef && selectedRarity) {
      relicConfiguration =
        relicsHelper?.createDefaultConfiguration(
          selectedRelicDef,
          selectedRarity,
          selectedTier,
        ) || null;
    }
  });

  function selectRelic(relicDef: RelicBaseDefinition) {
    selectedRelicDef = relicDef;
    activeAffixTab = "primary";
    selectedImbuedType = "None";

    relicConfiguration =
      relicsHelper?.createDefaultConfiguration(
        relicDef,
        selectedRarity!,
        selectedTier,
      ) || null;
  }

  function getRarityColor(rarity: RelicRarity): string {
    if (!relicsHelper) return "#999";
    return relicsHelper.getRelicRarityColor(rarity);
  }

  function finalizeSelection() {
    if (!selectedRelicDef || !relicConfiguration || !relicsHelper) return;

    const sizeConfig = relicsHelper.getRelicSizeConfig(
      selectedRelicDef.eRelicSize,
    );

    const simpleRelic: RelicItem = {
      id: `relic-${selectedRelicDef.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: getRelicDisplayName(selectedRelicDef, relicConfiguration),
      size: selectedSize!,
      tier: relicConfiguration.tier,
      imbuedType: selectedImbuedType,
      rarity: relicConfiguration.rarity,
      sprite: getRelicSpriteUrl(selectedRelicDef, relicConfiguration.tier),
      width: sizeConfig?.relicInventoryShape.width || 1,
      height: sizeConfig?.relicInventoryShape.height || 1,
      selectedPrimaryAffixes: [...relicConfiguration.selectedPrimaryAffixes],
      selectedSecondaryAffixes: [
        ...relicConfiguration.selectedSecondaryAffixes,
      ],
      selectedCorruptionAffix: relicConfiguration.selectedCorruptionAffix
        ? { ...relicConfiguration.selectedCorruptionAffix }
        : undefined,
      selectedDevotionAffix: relicConfiguration.selectedDevotionAffix
        ? { ...relicConfiguration.selectedDevotionAffix }
        : undefined,
      selectedSpecialAffix: relicConfiguration.selectedSpecialAffix
        ? { ...relicConfiguration.selectedSpecialAffix }
        : undefined,
      primaryAffixValues: { ...relicConfiguration.primaryAffixValues },
      secondaryAffixValues: { ...relicConfiguration.secondaryAffixValues },
      implicitAffixValues: { ...relicConfiguration.implicitAffixValues },
      specialAffixValues: { ...relicConfiguration.specialAffixValues },
    };

    onRelicSelected(simpleRelic);
  }

  function updateAffixValue(
    affixId: number,
    value: number,
    type: "primary" | "secondary" | "implicit" | "corrupted" | "special",
  ) {
    if (!relicConfiguration) return;

    if (type === "primary") {
      relicConfiguration.primaryAffixValues[affixId] = value;
    } else if (type === "secondary") {
      relicConfiguration.secondaryAffixValues[affixId] = value;
    } else if (type === "corrupted") {
      relicConfiguration.corruptionAffixValues[affixId] = value;
    } else if (type === "special") {
      relicConfiguration.specialAffixValues[affixId] = value;
    } else {
      relicConfiguration.implicitAffixValues[affixId] = value;
    }

    // Trigger reactivity
    relicConfiguration = { ...relicConfiguration };
  }

  function toggleAffix(
    affix: RelicAffix,
    type: "primary" | "secondary" | "corrupted" | "imbuement" | "special",
  ) {
    if (
      !relicConfiguration ||
      !selectedRelicDef ||
      !selectedRarity ||
      !relicsHelper
    )
      return;

    if (type === "corrupted") {
      if (relicConfiguration.selectedCorruptionAffix?.id === affix.id) {
        // Remove affix
        delete relicConfiguration.selectedCorruptionAffix;
        delete relicConfiguration.implicitAffixValues[affix.id];
      } else {
        // Add affix (only one allowed)
        relicConfiguration.selectedCorruptionAffix = affix;
        const [_, max] = relicsHelper.getAffixValueRange(
          affix.id,
          selectedTier,
        ) || [0, 0];
        relicConfiguration.implicitAffixValues[affix.id] = max;
      }
      return;
    }

    if (type === "imbuement") {
      if (relicConfiguration.selectedDevotionAffix?.id === affix.id) {
        // Remove affix
        delete relicConfiguration.selectedDevotionAffix;
        delete relicConfiguration.implicitAffixValues[affix.id];
      } else {
        // Add affix (only one allowed)
        relicConfiguration.selectedDevotionAffix = affix;
        const [_, max] = relicsHelper.getAffixValueRange(
          affix.id,
          selectedTier,
        ) || [0, 0];
        relicConfiguration.implicitAffixValues[affix.id] = max;
      }
      return;
    }

    if (type === "special") {
      if (relicConfiguration.selectedSpecialAffix?.id === affix.id) {
        // Remove affix
        delete relicConfiguration.selectedSpecialAffix;
        delete relicConfiguration.specialAffixValues[affix.id];
      } else {
        // Add affix (only one allowed)
        relicConfiguration.selectedSpecialAffix = affix;
        const [_, max] = relicsHelper.getAffixValueRange(
          affix.id,
          selectedTier,
        ) || [0, 0];
        relicConfiguration.specialAffixValues[affix.id] = max;
      }
      return;
    }

    const affixArray =
      type === "primary"
        ? relicConfiguration.selectedPrimaryAffixes
        : relicConfiguration.selectedSecondaryAffixes;

    const index = affixArray.findIndex((a) => a.id === affix.id);

    if (index >= 0) {
      // Remove affix
      affixArray.splice(index, 1);
      if (type === "primary") {
        delete relicConfiguration.primaryAffixValues[affix.id];
      } else {
        delete relicConfiguration.secondaryAffixValues[affix.id];
      }
    } else {
      // Add affix
      const maxCounts = relicsHelper.getMaxAffixCounts(
        selectedRelicDef,
        selectedRarity,
      );
      const maxCount =
        type === "primary" ? maxCounts.primary : maxCounts.secondary;

      if (affixArray.length < maxCount) {
        affixArray.push(affix);
        const [_, max] = relicsHelper.getAffixValueRange(
          affix.id,
          selectedTier,
        ) || [0, 0];

        if (type === "primary") {
          relicConfiguration.primaryAffixValues[affix.id] = max;
        } else {
          relicConfiguration.secondaryAffixValues[affix.id] = max;
        }
      }
    }

    // Trigger reactivity
    relicConfiguration = { ...relicConfiguration };
  }

  function getRelicDisplayName(
    rbd: RelicBaseDefinition,
    rcf: RelicConfiguration | null,
  ): string {
    if (rbd.nameLocalizationKey) {
      return translate(rbd.nameLocalizationKey, lang) || rbd.name;
    }

    // Display name is [Prefix] [RelicSize] Relic [PostFix]
    let displayName = `${rbd.eRelicSize} Relic`;

    if (rcf) {
      if (rcf.selectedSpecialAffix) {
        displayName = `${translate(rcf.selectedSpecialAffix.nameLocalizationKey, lang)} ${displayName}`;
      }
      if (rcf.selectedPrimaryAffixes?.length) {
        displayName += ` of ${translate(rcf.selectedPrimaryAffixes[0].nameLocalizationKey, lang)}`;
      } else if (rcf.selectedSecondaryAffixes?.length) {
        displayName += ` of ${translate(rcf.selectedSecondaryAffixes[0].nameLocalizationKey, lang)}`;
      }
    }
    return displayName;
  }

  function getAffixCountByAffixTab(
    rcf: RelicConfiguration | null,
    type: string,
  ): string {
    if (!rcf) return "(0/0)";
    if (type === "primary") {
      return `(${rcf.selectedPrimaryAffixes.length}/${rcf.maxPrimaryAffixes})`;
    } else if (type === "secondary") {
      return `(${rcf.selectedSecondaryAffixes.length}/${rcf.maxSecondaryAffixes})`;
    } else if (type === "imbuement") {
      return `(${rcf.selectedDevotionAffix ? 1 : 0}/${rcf.maxDevotionAffixes})`;
    } else if (type === "corrupted") {
      return `(${rcf.selectedCorruptionAffix ? 1 : 0}/${rcf.maxCorruptionAffixes})`;
    } else if (type === "special") {
      return `(${rcf.selectedSpecialAffix ? 1 : 0}/${rcf.maxSpecialAffixes})`;
    }
    return "(0/0)";
  }
</script>

<!-- Header -->
<div class="px-4 pt-4 pb-2 border-b border-base-300">
  <h3 class="text-base font-semibold">{title}</h3>
  <div class="text-xs opacity-60 mt-1">
    Available Space: {availableSpace.width}×{availableSpace.height}
  </div>
</div>

<!-- Step-by-Step Selection Layout -->
<div class="flex flex-1 overflow-hidden h-96">
  <!-- Left Panel - Selection Flow (30% width) -->
  <div class="w-[25%] border-r border-base-300 p-3 overflow-y-auto">
    <!-- Step 1: Size Selection -->
    <div class="mb-4">
      <div class="text-xs font-medium mb-2 flex items-center">
        <span class="badge badge-primary badge-xs mr-2">1</span>
        Select Size
      </div>
      <select
        bind:value={selectedSize}
        class="select select-bordered select-sm w-full"
      >
        {#each availableSizes as size (size)}
          {@const sizeConfig = relicsHelper?.getRelicSizeConfig(size)}
          <option value={size}
            >{size} ({sizeConfig?.relicInventoryShape.width}x{sizeConfig
              ?.relicInventoryShape.height})</option
          >
        {/each}
      </select>
    </div>

    <!-- Step 2: Rarity Selection -->
    {#if selectedSize}
      <div class="mb-4">
        <div class="text-xs font-medium mb-2 flex items-center">
          <span class="badge badge-primary badge-xs mr-2">2</span>
          Select Rarity
        </div>
        <select
          bind:value={selectedRarity}
          class="select select-bordered select-sm w-full"
          style={selectedRarity != null
            ? `border-color: ${parseRGBA01ToCss(getRarityColor(selectedRarity))}`
            : ""}
        >
          {#each availableRarities as rarity (rarity)}
            <option value={rarity}>{rarity}</option>
          {/each}
        </select>
      </div>
    {/if}

    <!-- Step 3: Tier Selection -->
    {#if selectedSize && selectedRarity}
      <div class="mb-4">
        <div class="text-xs font-medium mb-2 flex items-center">
          <span class="badge badge-primary badge-xs mr-2">3</span>
          Select Tier: {selectedTier}
        </div>
        <input
          type="range"
          min="1"
          max="4"
          bind:value={selectedTier}
          class="range range-xs w-full"
        />
        <div class="flex justify-between text-xs opacity-50 mt-1">
          <span>1</span><span>2</span><span>3</span><span>4</span>
        </div>
      </div>
    {/if}

    <!-- Search -->
    {#if selectedSize && selectedRarity}
      <div class="mb-4">
        <div class="text-xs font-medium mb-2">Search Relics</div>
        <input
          type="text"
          placeholder="Filter by name..."
          bind:value={search}
          class="input input-bordered input-sm w-full"
        />
      </div>
    {/if}
  </div>

  <!-- Center Panel - Relic List (35% width) -->
  <div class="w-[35%] border-r border-base-300 p-3 overflow-y-auto">
    {#if selectedSize && selectedRarity}
      <h4 class="text-sm font-semibold mb-3">
        Available Relics ({availableRelicDefs.length})
      </h4>

      {#if availableRelicDefs.length > 0}
        <div class="space-y-2">
          {#each availableRelicDefs as relicDef (relicDef.id)}
            <button
              class="w-full flex flex-row gap-1 p-3 border rounded text-left transition-colors {selectedRelicDef?.id ===
              relicDef.id
                ? 'border-primary bg-primary/10'
                : 'border-base-300 hover:border-base-400 hover:bg-base-200'}"
              onclick={() => selectRelic(relicDef)}
            >
              <img
                alt={relicDef.name}
                src={getRelicSpriteUrl(relicDef, selectedTier)}
                class="w-12 mb-2"
              />
              <div class="flex-shrink">
                <div class="font-medium">
                  {getRelicDisplayName(
                    relicDef,
                    selectedRelicDef?.id == relicDef.id
                      ? relicConfiguration
                      : null,
                  )}
                </div>
                <div class="text-xs opacity-70 mt-1">
                  Primary: {relicDef.primaryAffixAmount[0]}-{relicDef
                    .primaryAffixAmount[1]} • Secondary: {relicDef
                    .secondaryAffixAmount[0]}-{relicDef.secondaryAffixAmount[1]}
                </div>
                {#if relicDef.type === "UniqueRelicBaseDefinition"}
                  <div class="text-xs mt-1 text-orange-600 font-medium">
                    Unique Relic
                  </div>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      {:else}
        <div class="flex h-full items-center justify-center">
          <div class="text-center py-8 opacity-70">
            <p class="text-sm">No relics available</p>
            <p class="text-xs mt-1">Try different size/rarity combination</p>
          </div>
        </div>
      {/if}
    {:else}
      <div class="flex h-full items-center justify-center">
        <div class="text-center py-8 opacity-70">
          <p class="text-sm">Select size and rarity first</p>
          <p class="text-xs mt-1">Follow the steps on the left</p>
        </div>
      </div>
    {/if}
  </div>

  <!-- Right Panel - Tabbed Affix Configuration (35% width) -->
  <div class="w-[40%] p-3 flex flex-col">
    {#if selectedRelicDef && relicConfiguration}
      <!-- Header with Place button -->
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-semibold">Configure Affixes</h4>
        <button class="btn btn-primary btn-sm" onclick={finalizeSelection}>
          Place Relic
        </button>
      </div>

      <!-- Affix Tabs -->
      <div class="tabs tabs-bordered tabs-xs mb-3">
        {#if relicsHelper && selectedRelicDef && selectedRarity}
          {#each affixTabs as tab}
            <button
              class="tab {activeAffixTab === tab ? 'tab-active' : ''}"
              onclick={() => (activeAffixTab = tab as any)}
            >
              {`${tab.charAt(0).toUpperCase() + tab.substring(1)} ${getAffixCountByAffixTab(relicConfiguration, tab)}`}
            </button>
          {/each}
        {/if}
      </div>

      <!-- Tab Content -->
      <div class="overflow-y-auto">
        {#if activeAffixTab === "primary" && relicConfiguration}
          <AffixSelector
            relicSize={selectedSize!}
            affixes={relicConfiguration.availablePrimaryAffixes ?? []}
            selectedAffixes={relicConfiguration.selectedPrimaryAffixes}
            affixValues={relicConfiguration.primaryAffixValues}
            maxAffixes={relicConfiguration.maxPrimaryAffixes}
            tier={selectedTier}
            onToggleAffix={(affix) => toggleAffix(affix, "primary")}
            onUpdateValue={(affixId, value) =>
              updateAffixValue(affixId, value, "primary")}
          />
        {:else if activeAffixTab === "secondary" && relicConfiguration}
          <AffixSelector
            relicSize={selectedSize!}
            affixes={relicConfiguration.availableSecondaryAffixes ?? []}
            selectedAffixes={relicConfiguration.selectedSecondaryAffixes}
            affixValues={relicConfiguration.secondaryAffixValues}
            maxAffixes={relicConfiguration.maxSecondaryAffixes}
            tier={selectedTier}
            onToggleAffix={(affix) => toggleAffix(affix, "secondary")}
            onUpdateValue={(affixId, value) =>
              updateAffixValue(affixId, value, "secondary")}
          />
        {:else if activeAffixTab === "corrupted" && relicConfiguration}
          <AffixSelector
            relicSize={selectedSize!}
            affixes={relicConfiguration.availableCorruptionAffixes ?? []}
            selectedAffixes={relicConfiguration.selectedCorruptionAffix
              ? [relicConfiguration.selectedCorruptionAffix]
              : []}
            affixValues={relicConfiguration.implicitAffixValues}
            maxAffixes={relicConfiguration.maxCorruptionAffixes}
            tier={selectedTier}
            onToggleAffix={(affix) => toggleAffix(affix, "corrupted")}
            onUpdateValue={(affixId, value) =>
              updateAffixValue(affixId, value, "corrupted")}
          />
        {:else if activeAffixTab === "special" && relicConfiguration}
          <AffixSelector
            relicSize={selectedSize!}
            affixes={relicConfiguration.availableSpecialAffixes ?? []}
            selectedAffixes={relicConfiguration.selectedSpecialAffix
              ? [relicConfiguration.selectedSpecialAffix]
              : []}
            affixValues={relicConfiguration.specialAffixValues}
            maxAffixes={1}
            tier={selectedTier}
            onToggleAffix={(affix) => toggleAffix(affix, "special")}
            onUpdateValue={(affixId, value) =>
              updateAffixValue(affixId, value, "special")}
          />
        {:else if activeAffixTab === "imbuement" && relicConfiguration}
          <div class="p-2">
            <select
              bind:value={selectedImbuedType}
              class="select select-bordered select-sm w-full"
            >
              {#each availableImbuedTypes as imbuedType (imbuedType)}
                <option value={imbuedType}
                  >{imbuedType.charAt(0).toUpperCase() +
                    imbuedType.substring(1).replaceAll("Imbued", "")}</option
                >
              {/each}
            </select>
          </div>

          {#if selectedImbuedType === "None"}
            <div class="text-center py-4 opacity-70">
              <p class="text-sm">No devotion affix selected</p>
            </div>
          {:else}
            <AffixSelector
              relicSize={selectedSize!}
              affixes={selectedImbuedType === "FaithImbued"
                ? (relicConfiguration.availableFaithImbuedAffixes ?? [])
                : selectedImbuedType === "DisciplineImbued"
                  ? (relicConfiguration.availableDisciplineImbuedAffixes ?? [])
                  : selectedImbuedType === "FuryImbued"
                    ? (relicConfiguration.availableFuryImbuedAffixes ?? [])
                    : []}
              selectedAffixes={relicConfiguration.selectedDevotionAffix
                ? [relicConfiguration.selectedDevotionAffix]
                : []}
              affixValues={relicConfiguration.implicitAffixValues}
              maxAffixes={relicConfiguration.maxDevotionAffixes}
              tier={selectedTier}
              onToggleAffix={(affix) => toggleAffix(affix, "imbuement")}
              onUpdateValue={(affixId, value) =>
                updateAffixValue(affixId, value, "implicit")}
            />
          {/if}
        {/if}
      </div>
    {:else}
      <div class="flex items-center justify-center h-full">
        <div class="text-center opacity-70">
          <p class="text-sm">Select a relic to configure</p>
          <p class="text-xs mt-1">Choose from the available relics</p>
        </div>
      </div>
    {/if}
  </div>
</div>

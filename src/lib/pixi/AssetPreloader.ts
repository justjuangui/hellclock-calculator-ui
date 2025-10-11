import { Assets } from "pixi.js";
import type { ConstellationsHelper } from "$lib/hellclock/constellations";
import { spriteUrl } from "$lib/hellclock/utils";

export type AssetCategory = "constellations" | "bells" | "nodeIcons" | "ui";

export type LoadProgressCallback = (
  progress: number,
  label: string,
  category: AssetCategory,
) => void;

/**
 * Centralized PixiJS asset preloader
 * Loads all game sprites once at app initialization
 * Provides cached access via Assets.get()
 */
export class AssetPreloader {
  private loaded = false;
  private loading = false;

  /**
   * Initialize and preload all game assets
   */
  async init(
    constellationsHelper?: ConstellationsHelper,
    onProgress?: LoadProgressCallback,
  ): Promise<void> {
    if (this.loaded || this.loading) {
      return; // Already loaded or loading
    }

    this.loading = true;

    try {
      // Collect all sprite URLs to preload
      const assetUrls: string[] = [];

      // 1. Constellation sprites
      if (constellationsHelper) {
        onProgress?.(0, "Loading constellation assets...", "constellations");
        const constellations = constellationsHelper.getAllConstellations();
        const constellationUrls = constellations
          .flatMap((c) => [
            spriteUrl(c.definition.illustrationLine),
            spriteUrl(c.definition.illustrationBlurredLine),
          ])
          .filter((url): url is string => url !== undefined);
        assetUrls.push(...constellationUrls);
      }

      // 2. Bell sprites (will be used later)
      // onProgress?.(33, "Loading bell assets...", "bells");
      // const bellUrls = [
      //   spriteUrl("CampaignBell"),
      //   spriteUrl("InfernalBell"),
      //   spriteUrl("OblivionBell"),
      // ].filter((url): url is string => url !== undefined);
      // assetUrls.push(...bellUrls);

      // 3. Node icon sprites (if needed)
      // onProgress?.(66, "Loading node icons...", "nodeIcons");
      // Add node icon URLs here if they exist

      // Preload all assets
      if (assetUrls.length > 0) {
        onProgress?.(50, "Preloading textures...", "ui");

        // Wrap Assets.load with promise that waits for full completion
        await new Promise<void>((resolve, reject) => {
          Assets.load(assetUrls, (progress) => {
            onProgress?.(75,`Asset loading progress: ${(progress*100).toFixed(2)}`, "ui");
            if (progress === 1) {
              resolve();
            }
          }).catch(reject);
        });
      }

      onProgress?.(100, "Assets loaded", "ui");
      this.loaded = true;
    } catch (error) {
      console.error("Failed to preload assets:", error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Check if assets are loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Check if assets are currently loading
   */
  isLoading(): boolean {
    return this.loading;
  }

  /**
   * Get a preloaded texture by sprite name
   * Returns undefined if not loaded
   */
  getTexture(spriteName: string) {
    const url = spriteUrl(spriteName);
    if (!url) return undefined;
    return Assets.get(url);
  }

  /**
   * Unload specific assets to free memory
   */
  async unloadCategory(category: AssetCategory): Promise<void> {
    // Implementation can be added when needed
    // Use Assets.unload() to remove specific assets
  }

  /**
   * Unload all assets
   */
  async unloadAll(): Promise<void> {
    // Use Assets.unload() or clear cache if needed
    this.loaded = false;
  }
}

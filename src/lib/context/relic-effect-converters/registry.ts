import type {
  EffectConverter,
  EffectConverterContext,
  EffectConversionResult,
  SkillEffect,
} from "./types";

class EffectConverterRegistry {
  private converters: Map<string, EffectConverter[]> = new Map();

  /**
   * Register a converter for a specific effect type.
   * Multiple converters can be registered for the same effect type.
   */
  register<T extends SkillEffect>(converter: EffectConverter<T>): void {
    const existing = this.converters.get(converter.effectType) || [];
    existing.push(converter as EffectConverter);
    this.converters.set(converter.effectType, existing);
  }

  /**
   * Unregister all converters for a specific effect type.
   */
  unregister(effectType: string): void {
    this.converters.delete(effectType);
  }

  /**
   * Get all converters registered for a specific effect type.
   */
  getConverters(effectType: string): EffectConverter[] {
    return this.converters.get(effectType) || [];
  }

  /**
   * Check if any converter is registered for a specific effect type.
   */
  hasConverter(effectType: string): boolean {
    return (
      this.converters.has(effectType) &&
      this.converters.get(effectType)!.length > 0
    );
  }

  /**
   * Convert an effect using the appropriate registered converter.
   * Returns null if no converter can handle the effect.
   */
  convert(
    effect: SkillEffect,
    context: EffectConverterContext,
  ): EffectConversionResult | null {
    const converters = this.getConverters(effect.type);

    if (converters.length === 0) {
      return null;
    }

    // Try each converter until one can handle it
    for (const converter of converters) {
      if (!converter.canHandle || converter.canHandle(effect, context)) {
        return converter.convert(effect, context);
      }
    }

    return null;
  }

  /**
   * Get list of all registered effect types.
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.converters.keys());
  }
}

export const effectConverterRegistry = new EffectConverterRegistry();
export type { EffectConverterRegistry };

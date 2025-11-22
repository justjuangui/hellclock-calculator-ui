// SkillCard Display Helper Class
// Loads and retrieves skill display configurations

import type { SkillDisplayConfig, SkillDisplayDefinitions } from './skillcard-types';

export class SkillDisplayHelper {
  private configs: SkillDisplayDefinitions;
  private configMap: Map<string, SkillDisplayConfig>;

  constructor(data: SkillDisplayDefinitions) {
    this.configs = data;
    this.configMap = new Map();

    // Build map for quick lookups
    for (const config of data.skills) {
      this.configMap.set(config.skillId, config);
    }
  }

  /**
   * Get display config for a specific skill by ID
   */
  getConfigBySkillId(skillId: string): SkillDisplayConfig | undefined {
    return this.configMap.get(skillId);
  }

  /**
   * Get all skill display configurations
   */
  getAllConfigs(): SkillDisplayConfig[] {
    return this.configs.skills;
  }

  /**
   * Check if a skill has a display configuration
   */
  hasConfig(skillId: string): boolean {
    return this.configMap.has(skillId);
  }

  /**
   * Get default config to use when skill-specific config is not found
   * Uses BasicAttackDefinition as template or creates a minimal fallback
   */
  getDefaultConfig(): SkillDisplayConfig {
    // Try to use BasicAttackDefinition as default template
    const basicAttack = this.configMap.get('BasicAttackDefinition');
    if (basicAttack) {
      return basicAttack;
    }

    // Minimal fallback config
    return {
      skillId: '_default',
      defaults: {
        format: { type: 'integer' },
        conditions: { hideIfNull: true },
        style: { labelOpacity: 0.6 }
      },
      sections: {
        summary: {
          defaults: {
            style: { valueWeight: 'bold', valueSize: 'lg', labelSize: 'xs' }
          },
          layout: { columns: 4, gap: 2 },
          rows: [
            {
              id: 'damage',
              displayName: 'Damage',
              valueType: 'evaluate',
              value: 'Dmg_Total',
              style: { valueColor: 'error' },
              conditions: { hideIfZero: true }
            },
            {
              id: 'dps',
              displayName: 'DPS',
              valueType: 'evaluate',
              value: 'DPS',
              format: { type: 'decimal', decimals: 1 },
              style: { valueColor: 'success' }
            },
            {
              id: 'mana',
              displayName: 'Mana',
              valueType: 'fromSkill',
              value: 'manaCost',
              style: { valueColor: 'warning' }
            },
            {
              id: 'speed',
              displayName: 'Speed',
              valueType: 'computed',
              value: 'attackSpeedOrCooldown',
              format: { type: 'time' },
              style: { valueColor: 'info' }
            }
          ]
        },
        damageDistribution: {
          defaults: {
            conditions: { hideIfZero: true }
          },
          rows: [
            { id: 'physical', displayName: 'Physical', valueType: 'evaluate', value: 'Dmg_Physical', style: { color: 'neutral' } },
            { id: 'fire', displayName: 'Fire', valueType: 'evaluate', value: 'Dmg_Fire', style: { color: 'warning' } },
            { id: 'plague', displayName: 'Plague', valueType: 'evaluate', value: 'Dmg_Plague', style: { color: 'success' } },
            { id: 'lightning', displayName: 'Lightning', valueType: 'evaluate', value: 'Dmg_Lightning', style: { color: 'info' } }
          ]
        }
      }
    };
  }

  /**
   * Get config for skill, falling back to default if not found
   */
  getConfigOrDefault(skillId: string): SkillDisplayConfig {
    return this.getConfigBySkillId(skillId) || this.getDefaultConfig();
  }
}

<script lang="ts">
  interface Props {
    evaluationResult: Record<string, any> | null;
    skillName?: string; // Optional skill name to construct stat keys
  }

  const { evaluationResult, skillName: _skillName }: Props = $props();

  // Damage type configuration
  const damageTypes = [
    { key: 'Physical', label: 'Physical', color: 'progress-neutral' },
    { key: 'Fire', label: 'Fire', color: 'progress-warning' },
    { key: 'Plague', label: 'Plague', color: 'progress-success' },
    { key: 'Lightning', label: 'Lightning', color: 'progress-info' }
  ];

  // Extract damage distribution from evaluation result
  function getDamageDistribution() {
    if (!evaluationResult) return null;

    const distribution: Array<{ label: string; value: number; percentage: number; color: string }> = [];
    let totalDamage = 0;

    // Find the skill prefix by looking for keys with pattern skill_*_Dmg_
    let skillPrefix = '';
    if (!skillPrefix) {
      for (const key in evaluationResult) {
        const match = key.match(/^(skill_\w+)_Dmg_/);
        if (match) {
          skillPrefix = match[1];
          break;
        }
      }
    }

    // Try to find damage values for each type
    for (const damageType of damageTypes) {
      let value = 0;
      let distribution_value = 0;

      // First priority: Look for skill-specific damage stats
      if (skillPrefix) {
        const dmgKey = `${skillPrefix}_Dmg_${damageType.key}`;
        const dstKey = `${skillPrefix}_Dst_${damageType.key}`;

        if (evaluationResult[dmgKey] !== undefined) {
          const parsed = typeof evaluationResult[dmgKey] === 'string'
            ? parseFloat(evaluationResult[dmgKey])
            : evaluationResult[dmgKey];

          if (!isNaN(parsed) && parsed > 0) {
            value = parsed;
          }
        }

        // Get distribution percentage if available
        if (evaluationResult[dstKey] !== undefined) {
          const parsed = typeof evaluationResult[dstKey] === 'string'
            ? parseFloat(evaluationResult[dstKey])
            : evaluationResult[dstKey];

          if (!isNaN(parsed)) {
            distribution_value = parsed;
          }
        }
      }

      // Fallback: Look for generic damage keys
      if (value === 0) {
        const possibleKeys = [
          `${damageType.key} Damage`,
          `${damageType.key}Damage`,
          `Dmg_${damageType.key}`
        ];

        for (const key of possibleKeys) {
          if (evaluationResult[key] !== undefined && evaluationResult[key] !== null) {
            const parsed = typeof evaluationResult[key] === 'string'
              ? parseFloat(evaluationResult[key])
              : evaluationResult[key];

            if (!isNaN(parsed) && parsed > 0) {
              value = parsed;
              break;
            }
          }
        }
      }

      if (value > 0) {
        distribution.push({
          label: damageType.label,
          value,
          percentage: distribution_value > 0 ? Math.round(distribution_value * 100) : 0,
          color: damageType.color
        });
        totalDamage += value;
      }
    }

    // Calculate percentages if not already provided
    if (totalDamage > 0) {
      for (const item of distribution) {
        if (item.percentage === 0) {
          item.percentage = Math.round((item.value / totalDamage) * 100);
        }
      }
    }

    return distribution.length > 0 ? distribution : null;
  }

  const damageDistribution = $derived(getDamageDistribution());
</script>

{#if damageDistribution && damageDistribution.length > 0}
  <div>
    <div class="text-xs font-semibold mb-1.5 opacity-70">Damage Distribution</div>
    <div class="space-y-1">
      {#each damageDistribution as damage, i (i)}
        <div class="flex items-center gap-2">
          <div class="w-20 text-xs">{damage.label}</div>
          <progress
            class={`progress ${damage.color} flex-1`}
            value={damage.percentage}
            max="100"
          ></progress>
          <div class="w-24 text-xs text-right font-mono">
            {Math.round(damage.value)} ({damage.percentage}%)
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

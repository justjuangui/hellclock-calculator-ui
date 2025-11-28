import type { Engine } from "$lib/engine";
import type { GamePack, ExplainPayload } from "$lib/engine/types";
import type { StatsHelper } from "$lib/hellclock/stats";
import type { GearsHelper } from "$lib/hellclock/gears";
import type { SkillsHelper } from "$lib/hellclock/skills";
import { getContext, setContext } from "svelte";
import { useGearEvaluation } from "$lib/context/gearevaluation.svelte";
import { useSkillEvaluation } from "$lib/context/skillevaluation.svelte";
import { useRelicEvaluation } from "$lib/context/relicevaluation.svelte";
import { useConstellationEvaluation } from "$lib/context/constellationevaluation.svelte";
import { useBellEvaluation } from "$lib/context/bellevaluation.svelte";
import { useStatusEvaluation } from "$lib/context/statusevaluation.svelte";
import { useWorldTierEvaluation } from "$lib/context/worldtierevaluation.svelte";

// Unified mod source type for evaluation
export type UnifiedModSource = {
  source: string;
  amount: number;
  layer: string;
  meta: {
    type: string;
    id: string;
    slot: string;
    [key: string]: any; // Allow additional meta properties
  };
};

export type UnifiedModCollection = Record<string, UnifiedModSource[]>;

export type EvaluationResult = {
  values: Record<string, any>;
  error?: string;
};

export type StatEvaluation = {
  result: EvaluationResult | null;
  loading: boolean;
  error: string | null;
};

export type EvaluationManagerAPI = {
  // Current evaluation state
  get statEvaluation(): StatEvaluation;

  // Manual evaluation methods
  evaluateAll: () => Promise<void>;
  evaluateStats: () => Promise<EvaluationResult>;
  evaluateSkill: (skill: any, skillsHelper: any) => Promise<any>;
  explain: (stat: string) => Promise<ExplainPayload>;

  // Force re-evaluation
  invalidateCache: () => void;

  // Actor/target management
  setActor: (actor: any) => void;
  setTarget: (target: any) => void;
};

const evaluationManagerKey = Symbol("evaluation-manager");

export function provideEvaluationManager(
  engine?: Engine,
  gamepack?: GamePack,
  _statsHelper?: StatsHelper,
  _gearsHelper?: GearsHelper,
  _skillsHelper?: SkillsHelper,
): EvaluationManagerAPI {
  let statEvaluation = $state<StatEvaluation>({
    result: null,
    loading: false,
    error: null,
  });

  let actor = $state<any>(null);
  let target = $state<any>(null);
  let actorBuilt = $state(false);
  let sheet = $state<any>(null);

  // Cache tracking
  let lastGearHash = $state<string>("");
  let lastSkillHash = $state<string>("");
  let lastRelicHash = $state<string>("");
  let lastConstellationHash = $state<string>("");
  let lastBellHash = $state<string>("");
  let lastStatusHash = $state<string>("");
  let lastWorldTierHash = $state<string>("");

  // Get evaluation APIs (these must be called after contexts are initialized)
  let gearEvaluationAPI: ReturnType<typeof useGearEvaluation> | null = null;
  let skillEvaluationAPI: ReturnType<typeof useSkillEvaluation> | null = null;
  let relicEvaluationAPI: ReturnType<typeof useRelicEvaluation> | null = null;
  let constellationEvaluationAPI: ReturnType<
    typeof useConstellationEvaluation
  > | null = null;
  let bellEvaluationAPI: ReturnType<typeof useBellEvaluation> | null = null;
  let statusEvaluationAPI: ReturnType<typeof useStatusEvaluation> | null = null;
  let worldTierEvaluationAPI: ReturnType<typeof useWorldTierEvaluation> | null =
    null;

  // Initialize APIs after contexts are available
  $effect(() => {
    try {
      gearEvaluationAPI = useGearEvaluation();
      skillEvaluationAPI = useSkillEvaluation();
      relicEvaluationAPI = useRelicEvaluation();
      constellationEvaluationAPI = useConstellationEvaluation();
      bellEvaluationAPI = useBellEvaluation();
      statusEvaluationAPI = useStatusEvaluation();
      worldTierEvaluationAPI = useWorldTierEvaluation();
    } catch {
      // APIs not available yet
    }
  });

  // Initialize from gamepack
  $effect(() => {
    if (gamepack) {
      actor = gamepack["hellclock-actor"];
      sheet = gamepack["Player Sheet"];
    }
  });

  // Initial evaluation trigger - runs once when all dependencies are ready
  $effect(() => {
    // Trigger initial evaluation once everything is initialized and no result exists yet
    if (
      gearEvaluationAPI &&
      skillEvaluationAPI &&
      relicEvaluationAPI &&
      constellationEvaluationAPI &&
      bellEvaluationAPI &&
      statusEvaluationAPI &&
      worldTierEvaluationAPI &&
      actor &&
      sheet &&
      !statEvaluation.result &&
      !statEvaluation.loading
    ) {
      console.log("Triggering initial evaluation for default stats");
      evaluateAll();
    }
  });

  // Reactive evaluation when gear, skills, relics, constellations, statuses, or world tier change
  $effect(() => {
    if (
      !gearEvaluationAPI ||
      !skillEvaluationAPI ||
      !relicEvaluationAPI ||
      !constellationEvaluationAPI ||
      !bellEvaluationAPI ||
      !statusEvaluationAPI ||
      !worldTierEvaluationAPI
    )
      return;

    const currentGearHash = gearEvaluationAPI.gearHash;
    const currentSkillHash = skillEvaluationAPI.skillHash;
    const currentRelicHash = relicEvaluationAPI.relicHash;
    const currentConstellationHash =
      constellationEvaluationAPI.constellationHash;
    const currentBellHash = bellEvaluationAPI.bellHash;
    const currentStatusHash = statusEvaluationAPI.statusHash;
    const currentWorldTierHash = worldTierEvaluationAPI.worldTierHash;

    // Check if equipment, status effects, or world tier have changed
    if (
      currentGearHash !== lastGearHash ||
      currentSkillHash !== lastSkillHash ||
      currentRelicHash !== lastRelicHash ||
      currentConstellationHash !== lastConstellationHash ||
      currentBellHash !== lastBellHash ||
      currentStatusHash !== lastStatusHash ||
      currentWorldTierHash !== lastWorldTierHash
    ) {
      lastGearHash = currentGearHash;
      lastSkillHash = currentSkillHash;
      lastRelicHash = currentRelicHash;
      lastConstellationHash = currentConstellationHash;
      lastBellHash = currentBellHash;
      lastStatusHash = currentStatusHash;
      lastWorldTierHash = currentWorldTierHash;

      // Invalidate actor cache and trigger evaluation
      actorBuilt = false;

      // Auto-evaluate if not already loading
      if (!statEvaluation.loading) {
        evaluateAll();
      }
    }
  });

  async function buildActor(): Promise<boolean> {
    if (!engine || !actor) {
      throw new Error("Engine and actor are required");
    }

    if (actorBuilt) return true;

    const resActor = await engine.build(actor, { timeoutMs: 5000 });

    if ((resActor as any)?.error) {
      throw new Error((resActor as any).error);
    }

    actorBuilt = true;
    return true;
  }

  async function evaluateStats(): Promise<EvaluationResult> {
    if (!engine || !sheet) {
      throw new Error("Engine and sheet are required");
    }

    if (
      !gearEvaluationAPI ||
      !skillEvaluationAPI ||
      !relicEvaluationAPI ||
      !constellationEvaluationAPI ||
      !bellEvaluationAPI ||
      !statusEvaluationAPI ||
      !worldTierEvaluationAPI
    ) {
      throw new Error(
        "Gear, Skill, Relic, Constellation, Bell, Status, and WorldTier evaluation APIs are required",
      );
    }

    await buildActor();

    // Collect modifications from gear, skills, relics, constellations, bells, statuses, and world tier
    const gearMods = gearEvaluationAPI.getGearMods();
    const skillMods = skillEvaluationAPI.getSkillMods();
    const relicMods = relicEvaluationAPI.getRelicMods();
    const constellationMods = constellationEvaluationAPI.getConstellationMods();
    const bellMods = bellEvaluationAPI.getBellMods();
    const statusMods = statusEvaluationAPI.getStatusMods();
    const worldTierMods = worldTierEvaluationAPI.getWorldTierMods();

    // Merge all modifications into unified collection
    const allMods: UnifiedModCollection = {};

    // Add gear mods
    Object.entries(gearMods).forEach(([statName, sources]) => {
      allMods[statName] = sources.map((source) => ({
        source: source.source,
        amount: source.amount,
        layer: source.layer,
        meta: {
          type: source.meta.type,
          id: source.meta.id,
          slot: source.meta.slot,
          value: source.meta.value,
        },
      }));
    });

    // Add skill mods, merging with existing gear mods
    Object.entries(skillMods).forEach(([statName, sources]) => {
      const unifiedSources = sources.map((source) => ({
        source: source.source,
        amount: source.amount,
        layer: source.layer,
        meta: {
          type: source.meta.type,
          id: source.meta.id,
          slot: source.meta.slot,
          level: source.meta.level,
          base: source.meta.base,
          value: source.meta.value,
        },
      }));

      if (statName in allMods) {
        allMods[statName] = [...allMods[statName], ...unifiedSources];
      } else {
        allMods[statName] = unifiedSources;
      }
    });

    // Add relic mods, merging with existing gear and skill mods
    Object.entries(relicMods).forEach(([statName, sources]) => {
      const unifiedSources = sources.map((source) => ({
        source: source.source,
        amount: source.amount,
        layer: source.layer,
        meta: {
          type: source.meta.type,
          id: source.meta.id,
          slot: source.meta.position, // Use position as slot for relics
          affixType: source.meta.affixType,
          value: source.meta.value,
        },
      }));

      if (statName in allMods) {
        allMods[statName] = [...allMods[statName], ...unifiedSources];
      } else {
        allMods[statName] = unifiedSources;
      }
    });

    // Add constellation mods, merging with existing gear, skill, and relic mods
    Object.entries(constellationMods).forEach(([statName, sources]) => {
      const unifiedSources = sources.map((source) => ({
        source: source.source,
        amount: source.amount,
        layer: source.layer,
        meta: {
          type: source.meta.type,
          id: source.meta.constellationId,
          slot: source.meta.nodeId,
          constellationId: source.meta.constellationId,
          nodeId: source.meta.nodeId,
          level: source.meta.level,
          value: source.meta.value,
        },
      }));

      if (statName in allMods) {
        allMods[statName] = [...allMods[statName], ...unifiedSources];
      } else {
        allMods[statName] = unifiedSources;
      }
    });

    // Add bell mods, merging with existing mods
    Object.entries(bellMods).forEach(([statName, sources]) => {
      const unifiedSources = sources.map((source) => ({
        source: source.source,
        amount: source.amount,
        layer: source.layer,
        meta: {
          type: source.meta.type,
          id: source.meta.bellId,
          slot: source.meta.nodeId,
          bellId: source.meta.bellId,
          nodeId: source.meta.nodeId,
          level: source.meta.level,
          value: source.meta.value,
        },
      }));

      if (statName in allMods) {
        allMods[statName] = [...allMods[statName], ...unifiedSources];
      } else {
        allMods[statName] = unifiedSources;
      }
    });

    // Add status mods, merging with existing gear, skill, relic, constellation, and bell mods
    Object.entries(statusMods).forEach(([statName, sources]) => {
      const unifiedSources = sources.map((source) => ({
        source: source.source,
        amount: source.amount,
        layer: source.layer,
        meta: {
          type: source.meta.type,
          id: String(source.meta.statusId),
          slot: source.meta.statusName,
          statusId: source.meta.statusId,
          statusName: source.meta.statusName,
          intensity: source.meta.intensity,
          stacks: source.meta.stacks,
          originalSource: source.meta.originalSource,
        },
      }));

      if (statName in allMods) {
        allMods[statName] = [...allMods[statName], ...unifiedSources];
      } else {
        allMods[statName] = unifiedSources;
      }
    });

    // Add world tier mods, merging with existing mods
    Object.entries(worldTierMods).forEach(([statName, sources]) => {
      const unifiedSources = sources.map((source) => ({
        source: source.source,
        amount: source.amount,
        layer: source.layer,
        meta: {
          type: source.meta.type,
          id: source.meta.id,
          slot: "global", // World tiers apply globally
          statDefinition: source.meta.statDefinition,
        },
      }));

      if (statName in allMods) {
        allMods[statName] = [...allMods[statName], ...unifiedSources];
      } else {
        allMods[statName] = unifiedSources;
      }
    });

    // TODO: From now Only Player stats is setted, need to add target stats if any and Summons
    const payload = {
      setEntity: {
        player: {
          stats: allMods,
        },
      },
      outputs: {
        player: Object.values(sheet?.displayedStats ?? {}).flatMap(
          (v): string[] =>
            Array.isArray(v) ? v : typeof v === "string" ? [v] : [],
        ),
      },
    };

    console.debug("Evaluating stats with payload:", payload);

    const result = await engine.eval(payload, { timeoutMs: 5000 });

    if ((result as any)?.error) {
      throw new Error((result as any).error);
    }

    return (result as any)["player"] as EvaluationResult;
  }

  async function evaluateAll(): Promise<void> {
    statEvaluation.loading = true;
    statEvaluation.error = null;

    try {
      const result = await evaluateStats();
      statEvaluation.result = result;
    } catch (e: any) {
      statEvaluation.error = String(e?.message || e);
      statEvaluation.result = null;
    } finally {
      statEvaluation.loading = false;
    }
  }

  async function explain(
    stat: string,
    entity: string = "player",
  ): Promise<ExplainPayload> {
    if (!engine) {
      throw new Error("Engine is required for explanation");
    }

    await buildActor();

    const result = await engine.explain(
      { entityId: entity, output: stat },
      { timeoutMs: 5000 },
    );

    if ((result as any)?.error) {
      throw new Error((result as any).error);
    }

    return result as ExplainPayload;
  }

  async function evaluateSkill(skill: any, skillsHelper: any): Promise<any> {
    if (!engine) {
      throw new Error("Engine is required for skill evaluation");
    }

    // Ensure actor is built before evaluating skill
    await buildActor();

    const groups = skillsHelper.getSkillDisplayValueModsById(skill.skill.name);
    const baseValueMods = skillsHelper.getSkillBaseValueModsById(
      skill.skill.name,
    );
    const outputs = baseValueMods.map((baseValMod: any) =>
      `skill_${skill.skill.name}_${baseValMod.id}`.replaceAll(" ", ""),
    );
    const payload = { setEntity: {}, outputs: { player: outputs } };

    console.log(
      "Evaluating skill via EvaluationManager",
      skill.skill.name,
      payload,
    );
    const resultOutputs = await engine.eval(payload, { timeoutMs: 5000 });

    if ((resultOutputs as any)?.error) {
      throw new Error((resultOutputs as any).error);
    }

    const result = (resultOutputs as any)["player"] || {};

    return {
      skill,
      result,
      valueGroups: groups,
      error: null,
      loading: false,
    };
  }

  function invalidateCache(): void {
    actorBuilt = false;
    statEvaluation = {
      result: null,
      loading: false,
      error: null,
    };
  }

  const api: EvaluationManagerAPI = {
    get statEvaluation() {
      return statEvaluation;
    },

    evaluateAll,
    evaluateStats,
    evaluateSkill,
    explain,
    invalidateCache,

    setActor: (newActor) => {
      actor = newActor;
      actorBuilt = false;
    },

    setTarget: (newTarget) => {
      target = newTarget;
      actorBuilt = false;
    },
  };

  setContext(evaluationManagerKey, api);
  return api;
}

export function useEvaluationManager(): EvaluationManagerAPI {
  const ctx = getContext<EvaluationManagerAPI>(evaluationManagerKey);
  if (!ctx) {
    throw new Error(
      "EvaluationManager context not found. Did you call provideEvaluationManager() in +layout.svelte?",
    );
  }
  return ctx;
}

import type { Engine } from "$lib/engine";
import type { GamePack, ExplainPayload, EvaluateRequest } from "$lib/engine/types";
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
import { useSkillTagEvaluation } from "$lib/context/skilltagevaluation.svelte";
import { mergeDeltas, type ContributionDelta } from "$lib/context/evaluation-types";

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
  let _target = $state<any>(null);
  let actorBuilt = $state(false);
  let sheet = $state<any>(null);

  // Hash tracking for reactive change detection
  // (providers track their own deltas, but we still need to detect when to re-evaluate)
  let lastGearHash = $state<string>("");
  let lastSkillHash = $state<string>("");
  let lastRelicHash = $state<string>("");
  let lastConstellationHash = $state<string>("");
  let lastBellHash = $state<string>("");
  let lastStatusHash = $state<string>("");
  let lastWorldTierHash = $state<string>("");
  let lastSkillTagHash = $state<string>("");

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
  let skillTagEvaluationAPI: ReturnType<typeof useSkillTagEvaluation> | null =
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
      skillTagEvaluationAPI = useSkillTagEvaluation();
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
      skillTagEvaluationAPI &&
      actor &&
      sheet &&
      !statEvaluation.result &&
      !statEvaluation.loading
    ) {
      console.log("Triggering initial evaluation for default stats");
      evaluateAll();
    }
  });

  // Reactive evaluation when gear, skills, relics, constellations, statuses, world tier, or skill tags change
  // Uses incremental delta-based updates - BuildGraph is only called once at startup
  $effect(() => {
    if (
      !gearEvaluationAPI ||
      !skillEvaluationAPI ||
      !relicEvaluationAPI ||
      !constellationEvaluationAPI ||
      !bellEvaluationAPI ||
      !statusEvaluationAPI ||
      !worldTierEvaluationAPI ||
      !skillTagEvaluationAPI
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
    const currentSkillTagHash = skillTagEvaluationAPI.skillTagHash;

    // Check if any provider has changed
    if (
      currentGearHash !== lastGearHash ||
      currentSkillHash !== lastSkillHash ||
      currentRelicHash !== lastRelicHash ||
      currentConstellationHash !== lastConstellationHash ||
      currentBellHash !== lastBellHash ||
      currentStatusHash !== lastStatusHash ||
      currentWorldTierHash !== lastWorldTierHash ||
      currentSkillTagHash !== lastSkillTagHash
    ) {
      lastGearHash = currentGearHash;
      lastSkillHash = currentSkillHash;
      lastRelicHash = currentRelicHash;
      lastConstellationHash = currentConstellationHash;
      lastBellHash = currentBellHash;
      lastStatusHash = currentStatusHash;
      lastWorldTierHash = currentWorldTierHash;
      lastSkillTagHash = currentSkillTagHash;

      // NOTE: We no longer set actorBuilt = false here
      // BuildGraph is only called once at startup, subsequent changes use Evaluate with deltas

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
      !worldTierEvaluationAPI ||
      !skillTagEvaluationAPI
    ) {
      throw new Error(
        "Gear, Skill, Relic, Constellation, Bell, Status, WorldTier, and SkillTag evaluation APIs are required",
      );
    }

    // Build actor only once at startup
    await buildActor();

    // Collect deltas from all providers (incremental updates)
    const delta = mergeDeltas(
      gearEvaluationAPI.getDelta(),
      skillEvaluationAPI.getDelta(),
      relicEvaluationAPI.getDelta(),
      constellationEvaluationAPI.getDelta(),
      bellEvaluationAPI.getDelta(),
      statusEvaluationAPI.getDelta(),
      worldTierEvaluationAPI.getDelta(),
      skillTagEvaluationAPI.getDelta(),
    );

    // Build the payload using new API format with removeStats/removeFlags
    const payload: EvaluateRequest = {
      setEntity: {
        player: {
          // Remove old contributions first
          removeStats: delta.removeStats,
          removeFlags: delta.removeFlags,
          // Add new contributions
          stats: delta.stats,
          flags: delta.flags,
        },
      },
      outputs: {
        player: Object.values(sheet?.displayedStats ?? {}).flatMap(
          (v): string[] =>
            Array.isArray(v) ? v : typeof v === "string" ? [v] : [],
        ),
      },
    };

    // Add broadcasts if any exist (with remove + add)
    if (delta.broadcasts.length > 0 || delta.removeBroadcasts.length > 0) {
      payload.broadcast = {
        player: {
          remove: delta.removeBroadcasts,
          add: delta.broadcasts.map((bc) => ({
            consumer_id: bc.consumer_id,
            flag_suffix: bc.flag_suffix,
            stat_suffix: bc.stat_suffix,
            contribution: bc.contribution,
          })),
        },
      };
    }

    console.debug("Evaluating stats with delta payload:", payload);

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
    // Reset actor state - will trigger BuildGraph on next evaluation
    actorBuilt = false;
    statEvaluation = {
      result: null,
      loading: false,
      error: null,
    };

    // Reset all provider trackers (for full rebuild scenarios like character switch or import)
    gearEvaluationAPI?.resetTracker();
    skillEvaluationAPI?.resetTracker();
    relicEvaluationAPI?.resetTracker();
    constellationEvaluationAPI?.resetTracker();
    bellEvaluationAPI?.resetTracker();
    statusEvaluationAPI?.resetTracker();
    worldTierEvaluationAPI?.resetTracker();
    skillTagEvaluationAPI?.resetTracker();

    // Reset hash tracking
    lastGearHash = "";
    lastSkillHash = "";
    lastRelicHash = "";
    lastConstellationHash = "";
    lastBellHash = "";
    lastStatusHash = "";
    lastWorldTierHash = "";
    lastSkillTagHash = "";
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
      _target = newTarget;
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

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlugin } from "../cases/registry";
import { simPhaseOf } from "../lab/phase";
import type { Readout } from "../sim/core/readout";
import { generateJson } from "./generate";
import { getLLM } from "./llm";
import {
  classPrompt, inputHash, mockClassReview, mockTeamReview, scrubTeamReview, summarizeSim, teamPrompt,
  type ClassReviewInput, type SimSummary, type TeamReviewInput,
} from "./prompts";
import { classReviewSchema, teamReviewSchema, type ClassReview, type ReviewResult, type TeamReview } from "./types";

export const COOLDOWN_MS = 30_000;

export class ReviewError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

type SubRow = { team_id: string; phase: string; kind: string; version: number; payload: Record<string, unknown> };
type RunRow = { team_id: string; phase: string; design: Record<string, unknown>; result: Readout; created_at: string };

/** step 에 속한 Phase 의 시뮬레이션·설계 키 (예: s5_deep → p2, p3) */
function simPhasesOfStep(plugin: { phases: { key: string; step: string }[] }, step: string): string[] {
  return [...new Set(plugin.phases.filter((p) => p.step === step).map((p) => simPhaseOf(p.key)))];
}

function latestSubmissions(rows: SubRow[], teamId: string, phases: string[]): Record<string, unknown> {
  const best = new Map<string, SubRow>();
  for (const r of rows) {
    if (r.team_id !== teamId || !phases.includes(r.phase)) continue;
    const k = `${r.phase}.${r.kind}`;
    if (!best.has(k) || r.version > best.get(k)!.version) best.set(k, r);
  }
  return Object.fromEntries([...best.entries()].sort().map(([k, r]) => [k, r.payload]));
}

function latestSim(runs: RunRow[], teamId: string, phases: string[]): SimSummary | null {
  const mine = runs
    .filter((r) => r.team_id === teamId && phases.includes(r.phase) && !(r.design as { aa?: boolean }).aa)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return mine[0] ? summarizeSim(mine[0].result) : null;
}

type Where = { classId: string; teamId: string | null; step: string; scope: string };

async function findCached<T>(db: SupabaseClient, where: Where, hash: string) {
  let q = db.from("ai_reviews").select("output, model, input_hash, created_at").eq("class_id", where.classId).eq("step", where.step).eq("scope", where.scope);
  q = where.teamId ? q.eq("team_id", where.teamId) : q.is("team_id", null);
  const { data } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return { hit: null as ReviewResult<T> | null, lastAt: null as number | null };
  const hit = data.input_hash === hash ? { output: data.output as T, model: data.model as string, cached: true, createdAt: data.created_at as string } : null;
  return { hit, lastAt: new Date(data.created_at).getTime() };
}

function checkCooldown(lastAt: number | null, now: number) {
  if (lastAt !== null && now - lastAt < COOLDOWN_MS) {
    throw new ReviewError(`${Math.ceil((COOLDOWN_MS - (now - lastAt)) / 1000)}초 뒤에 다시 요청할 수 있어요.`, 429);
  }
}

async function save(db: SupabaseClient, where: Where, model: string, hash: string, output: unknown) {
  const { data, error } = await db.from("ai_reviews")
    .insert({ class_id: where.classId, team_id: where.teamId, step: where.step, scope: where.scope, model, input_hash: hash, output })
    .select("created_at").single();
  if (error) {
    console.error("[review] 저장 실패", error);
    throw new ReviewError("리뷰를 저장하지 못했어요.", 500);
  }
  return data.created_at as string;
}

export async function reviewTeam(db: SupabaseClient, args: { classId: string; teamId: string; step: string }, now = Date.now()): Promise<ReviewResult<TeamReview>> {
  const { data: team } = await db.from("teams").select("id, case_key").eq("id", args.teamId).eq("class_id", args.classId).maybeSingle();
  if (!team) throw new ReviewError("이 수업에 속한 조가 아니에요.", 404);
  const plugin = getPlugin(team.case_key);
  if (!plugin) throw new ReviewError("먼저 사례를 골라주세요.", 409);
  const phases = simPhasesOfStep(plugin, args.step);
  if (phases.length === 0) throw new ReviewError("이 스텝에는 AI 피드백이 없어요.", 400);

  const [subs, runs] = await Promise.all([
    db.from("submissions").select("team_id, phase, kind, version, payload").eq("team_id", args.teamId),
    db.from("sim_runs").select("team_id, phase, design, result, created_at").eq("team_id", args.teamId),
  ]);
  const submission = latestSubmissions((subs.data ?? []) as SubRow[], args.teamId, phases);
  if (Object.keys(submission).length === 0) throw new ReviewError("먼저 이 스텝에서 무언가를 제출해 주세요.", 409);

  const input: TeamReviewInput = {
    case: plugin.key, step: args.step,
    rubric: phases.map((p) => plugin.rubric[p]).filter(Boolean).join("\n"),
    submission, sim: latestSim((runs.data ?? []) as RunRow[], args.teamId, phases), revealed: false,
  };
  const hash = inputHash(input);
  const where: Where = { classId: args.classId, teamId: args.teamId, step: args.step, scope: "team" };
  const { hit, lastAt } = await findCached<TeamReview>(db, where, hash);
  if (hit) return hit;
  checkCooldown(lastAt, now);

  const llm = getLLM(() => mockTeamReview(input));
  const output = scrubTeamReview(await generateJson(llm, teamReviewSchema, teamPrompt(input)));
  const createdAt = await save(db, where, llm.model, hash, output);
  return { output, model: llm.model, cached: false, createdAt };
}

export async function reviewClass(db: SupabaseClient, args: { classId: string; step: string }, now = Date.now()): Promise<ReviewResult<ClassReview>> {
  const { data: teams } = await db.from("teams").select("id, name, case_key").eq("class_id", args.classId);
  const [subs, runs] = await Promise.all([
    db.from("submissions").select("team_id, phase, kind, version, payload").eq("class_id", args.classId),
    db.from("sim_runs").select("team_id, phase, design, result, created_at").eq("class_id", args.classId),
  ]);
  const rubrics: Record<string, string> = {};
  const input: ClassReviewInput = { step: args.step, teams: [], rubrics };
  for (const t of [...(teams ?? [])].sort((a, b) => a.name.localeCompare(b.name, "ko"))) {
    const plugin = getPlugin(t.case_key);
    if (!plugin) continue;
    const phases = simPhasesOfStep(plugin, args.step);
    if (phases.length === 0) continue;
    const submission = latestSubmissions((subs.data ?? []) as SubRow[], t.id, phases);
    if (Object.keys(submission).length === 0) continue;
    rubrics[plugin.key] = phases.map((p) => plugin.rubric[p]).filter(Boolean).join("\n");
    input.teams.push({ team: t.name, case: plugin.key, submission, sim: latestSim((runs.data ?? []) as RunRow[], t.id, phases) });
  }
  if (input.teams.length === 0) throw new ReviewError("이 스텝에 제출한 조가 아직 없어요.", 409);

  const hash = inputHash(input);
  const where: Where = { classId: args.classId, teamId: null, step: args.step, scope: "class" };
  const { hit, lastAt } = await findCached<ClassReview>(db, where, hash);
  if (hit) return hit;
  checkCooldown(lastAt, now);

  const llm = getLLM(() => mockClassReview(input));
  const output = await generateJson(llm, classReviewSchema, classPrompt(input));
  const createdAt = await save(db, where, llm.model, hash, output);
  return { output, model: llm.model, cached: false, createdAt };
}

/**
 * 거래후기 실험 엔진 (docs/cases/daangn.md §2-1 ~ §2-3, §3-2 ~ §3-5): p1(외부 플랫폼 F) 과 p2(자체 플랫폼 재설계).
 * 같은 (설계, 시드)면 항상 같은 Readout. 노이즈는 공통 난수(CRN)라서 설계가 달라도 같은 날·셀·그룹의 노이즈는 공유된다.
 */
import { SimulationRejected } from "../types";
import {
  binomialCount, crnZ, designHash, obfBoundary, powerProp, propTest, srm, ssProp,
  type Comparison, type Flag, type MetricResult, type PeriodRow, type Readout,
} from "@/lib/sim/core";
import { CALIB } from "./effects";
import {
  ALL_ASSIGNED_ENTRY, ALL_ASSIGNED_PER_DAY, DEVICE_MULTI_SHARE, ENTRANTS_PER_DAY, ENTRY_RATE, INSTANCE_MULTI_SHARE, NEW_FIRST_DAY_SHARE, NEW_SHARE,
  RATE, RECIPIENTS_PER_DAY, REPORT_BASE, SALT, SDK_CELLS, SEED, SHORT_REVIEW_BASE, UNINSTALL_BASE, type MetricDef, type SdkKey,
} from "./population";
import type { DesignP1, DesignP2 } from "./schema";

export type SimOptions = { seed?: number; noise?: boolean; withTruth?: boolean };

type Pop = "all" | "received" | "entrants";
const POP_RANK: Record<Pop, number> = { all: 0, received: 1, entrants: 2 };
const POP_INFO: Record<Pop, { n: number; pE: number }> = {
  all: { n: ALL_ASSIGNED_PER_DAY, pE: ALL_ASSIGNED_ENTRY },
  received: { n: RECIPIENTS_PER_DAY, pE: ENTRY_RATE },
  entrants: { n: ENTRANTS_PER_DAY, pE: 1 },
};
const ASSIGN_POP = { install_all: "all", review_received: "received", review_screen_open: "entrants" } as const;

export type ReviewCfg = {
  phase: "p1" | "p2";
  aa: boolean;
  days: number;
  pop: Pop;
  source: "client" | "server";
  def: MetricDef;
  guardrails: ("short_review_rate" | "uninstall_rate" | "report_rate")[];
  alpha: number;
  power: number;
  mdePp: number;
  stopping: "fixed" | "peek_stop" | "sequential";
  /** 실험 중 그룹이 바뀌는 사용자 비중 */
  flip: number;
  carry: boolean;
  newPolicy: "bug" | "first_launch" | "exclude";
  runAa: boolean;
  key: "instance_id" | "device_id" | "user_id_hash";
  salt: "new_per_experiment" | "reuse_previous";
};

type Inherited = {
  assignment_timing?: keyof typeof ASSIGN_POP; analysis_population?: "all_assigned" | "review_received" | "review_screen_open"; metric_definition?: MetricDef;
  guardrails?: ReviewCfg["guardrails"]; alpha?: number; power?: number; mde_pp?: number; duration_days?: number; stopping?: ReviewCfg["stopping"]; aa_days?: number;
};

export function reviewCfg(d: DesignP1 | DesignP2): ReviewCfg {
  const x: Inherited = d;
  if (!x.assignment_timing || !x.analysis_population || !x.metric_definition || x.duration_days === undefined || x.alpha === undefined) {
    throw new SimulationRejected("먼저 2번 스텝(설계)에서 거래후기 실험 설계를 제출해 주세요. 재실험은 그 설계를 이어받아요.");
  }
  const assignPop = ASSIGN_POP[x.assignment_timing];
  const pop: Pop = x.analysis_population === "all_assigned" ? assignPop : x.analysis_population === "review_received" ? "received" : "entrants";
  if (POP_RANK[pop] < POP_RANK[assignPop]) {
    throw new SimulationRejected("배정한 사용자보다 더 넓은 모집단은 분석할 수 없어요. 분석 모집단을 배정 범위 안으로 좁혀주세요.");
  }
  const aa = d.aa === true;
  const common = {
    aa, days: aa ? (x.aa_days ?? 7) : x.duration_days, pop, def: x.metric_definition, guardrails: x.guardrails ?? [], alpha: x.alpha,
    power: x.power ?? 0.8, mdePp: x.mde_pp ?? 2, stopping: aa ? ("fixed" as const) : (x.stopping ?? "fixed"),
  };
  if (d.phase === "p1") {
    if (aa && !d.run_aa_first) throw new SimulationRejected("설계에서 'A/A 먼저'를 선택하지 않았어요. 설계를 고치고 다시 제출해 주세요.");
    return {
      ...common, phase: "p1", source: d.data_source === "server_db" ? "server" : "client", flip: INSTANCE_MULTI_SHARE, carry: false, newPolicy: "bug",
      runAa: d.run_aa_first, key: "instance_id", salt: "new_per_experiment",
    };
  }
  if (aa && !d.rerun_aa) throw new SimulationRejected("설계에서 'A/A 재검증'을 선택하지 않았어요. 설계를 고치고 다시 제출해 주세요.");
  return {
    ...common, phase: "p2", source: d.logging === "server_events" ? "server" : "client",
    flip: d.assignment_key === "instance_id" ? INSTANCE_MULTI_SHARE : d.assignment_key === "device_id" ? DEVICE_MULTI_SHARE : 0,
    carry: d.salt === "reuse_previous", newPolicy: d.new_user_policy === "exclude" ? "exclude" : "first_launch",
    runAa: d.rerun_aa, key: d.assignment_key, salt: d.salt,
  };
}

// ───────────────────────── 셀 단위 생성 ─────────────────────────

type Cell = { n: number; prim: number; sub: number; short: number; uninstall: number; report: number; serverPrim: number; clientPrim: number };
type Arms = "A" | "B";
type Day = Record<string, Record<Arms, Cell>>; // 키: `${type}/${sdk}`
type Counter = (n: number, p: number, z: number) => number;

const CELL_KEYS = (cfg: ReviewCfg) =>
  (cfg.newPolicy === "exclude" ? (["existing"] as const) : (["existing", "new"] as const)).flatMap((t) => SDK_CELLS.map((s) => ({ type: t, sdk: s.key as SdkKey, share: s.share, key: `${t}/${s.key}` })));

/** 실험군(B)에 적용되는 후기 작성률 상승(절대, 진입자 기준) */
function effectOf(cfg: ReviewCfg, def: MetricDef | "sub"): number {
  if (cfg.aa) return 0;
  const base = def === "started" ? CALIB.review.effectStarted : CALIB.review.effect;
  return base * (1 - cfg.flip * (1 - CALIB.bug.flipEffectKeep)) + (cfg.carry ? CALIB.review.carryover : 0);
}

function generate(cfg: ReviewCfg, noise: boolean, seed: number): { days: Day[]; moved: number[]; totalN: number[] } {
  const count: Counter = noise ? binomialCount : (n, p) => n * p;
  const { n: N0, pE } = POP_INFO[cfg.pop];
  const z = (day: number, segment: string, arm: string, metric: string) => (noise ? crnZ(seed, { case: "daangn", phase: cfg.phase, period: day, segment, arm, metric: `${metric}${SALT.review}` }) : 0);
  const cells = CELL_KEYS(cfg);
  const days: Day[] = [];
  const moved: number[] = [];
  const totalN: number[] = [];
  for (let day = 1; day <= cfg.days; day++) {
    const N = noise ? Math.round(N0 * (1 + 0.03 * z(day, "*", "*", "inflow"))) : N0;
    totalN.push(N);
    const mv = cfg.newPolicy === "bug" ? (CALIB.bug.forcedControl / 2) * N : 0;
    moved.push(mv);
    const out: Day = {};
    for (const c of cells) {
      const base = N * (c.type === "existing" ? 1 - NEW_SHARE : NEW_SHARE) * c.share;
      let nB: number;
      if (c.type === "new" && cfg.newPolicy === "bug") nB = Math.max(0, base / 2 - mv * c.share + (noise ? Math.sqrt(base * 0.25) * z(day, c.key, "B", "split") : 0));
      else nB = noise ? Math.min(base, Math.max(0, Math.round(base / 2 + Math.sqrt(base * 0.25) * z(day, c.key, "B", "split")))) : base / 2;
      if (noise) nB = Math.round(nB);
      const nA = noise ? Math.round(base) - nB : base - nB;
      const row = {} as Record<Arms, Cell>;
      for (const arm of ["A", "B"] as const) {
        const n = arm === "A" ? nA : nB;
        const treated = arm === "B";
        const r = (def: MetricDef) => RATE[def][c.type] * pE;
        const pSub = r("submitted_72h") + (treated ? effectOf(cfg, "sub") * pE : 0);
        const pPrim = r(cfg.def) + (treated ? effectOf(cfg, cfg.def) * pE : 0);
        const sub = count(n, pSub, z(day, c.key, arm, "sub"));
        const serverPrim = cfg.def === "submitted_72h" ? sub : count(n, pPrim, z(day, c.key, arm, "prim"));
        const clientP = pPrim * (1 - (c.sdk === "android_old" ? CALIB.bug.sdkLoss : 0)) * (1 + (treated ? CALIB.bug.dupEvent : 0));
        const clientPrim = count(n, clientP, z(day, c.key, arm, "client"));
        const short = count(sub, SHORT_REVIEW_BASE + (treated && !cfg.aa ? CALIB.review.shortEffect : 0), z(day, c.key, arm, "short"));
        row[arm] = {
          n, prim: cfg.source === "server" ? serverPrim : clientPrim, sub, short, serverPrim, clientPrim,
          uninstall: count(n, UNINSTALL_BASE, z(day, c.key, arm, "uninstall")), report: count(n, REPORT_BASE, z(day, c.key, arm, "report")),
        };
      }
      out[c.key] = row;
    }
    days.push(out);
  }
  return { days, moved, totalN };
}

const sumCells = (days: Day[], upTo: number, pick: (key: string) => boolean, arm: Arms): Cell => {
  const t: Cell = { n: 0, prim: 0, sub: 0, short: 0, uninstall: 0, report: 0, serverPrim: 0, clientPrim: 0 };
  for (let d = 0; d < upTo; d++) {
    for (const [k, row] of Object.entries(days[d])) {
      if (!pick(k)) continue;
      const c = row[arm];
      for (const f of Object.keys(t) as (keyof Cell)[]) t[f] += c[f];
    }
  }
  return t;
};
const all = () => true;

const DEF_LABEL: Record<MetricDef, string> = { started: "작성 시작", submitted: "제출 완료(기한 없음)", submitted_72h: "72시간 내 제출 완료" };

export function simulateReview(cfg: ReviewCfg, design: DesignP1 | DesignP2, opts: SimOptions = {}): Readout {
  const seed = opts.seed ?? SEED;
  const noise = opts.noise ?? true;
  const withTruth = opts.withTruth ?? true;
  const { days, moved, totalN } = generate(cfg, noise, seed);
  const truthGen = noise ? generate(cfg, false, seed) : { days, moved, totalN };

  // ── 중간 확인 규칙(일별 누적 검정, 메인 지표) ──
  let stop = cfg.days;
  if (cfg.stopping !== "fixed") {
    for (let k = 1; k <= cfg.days; k++) {
      const a = sumCells(days, k, all, "A");
      const b = sumCells(days, k, all, "B");
      if (a.n === 0 || b.n === 0) continue;
      const r = propTest({ x: a.prim, n: a.n }, { x: b.prim, n: b.n }, cfg.alpha);
      const hit = cfg.stopping === "peek_stop" ? r.p < cfg.alpha : Math.abs(r.z) >= obfBoundary(k, cfg.days, cfg.alpha);
      if (hit) { stop = k; break; }
    }
  }
  const bound = cfg.stopping === "sequential" ? obfBoundary(stop, cfg.days, cfg.alpha) : undefined;
  const A = sumCells(days, stop, all, "A");
  const B = sumCells(days, stop, all, "B");

  const compare = (a: { x: number; n: number }, b: { x: number; n: number }) => {
    const r = propTest(a, b, cfg.alpha);
    const significant = bound !== undefined ? Math.abs(r.z) >= bound : r.p < cfg.alpha;
    const c: Comparison = { vs: "A", arm: "B", d: r.d, ci: r.ci, rel: r.rel, relCi: r.relCi, p: r.p, win: r.win, significant, method: bound !== undefined ? "비율 z 검정 · 순차(OBF)" : "비율 z 검정" };
    return c;
  };
  const metric = (key: string, label: string, role: "P" | "G", a: { x: number; n: number }, b: { x: number; n: number }): MetricResult => ({
    key, label, role, type: "prop", arms: { A: { n: a.n, x: a.x }, B: { n: b.n, x: b.x } }, comparisons: [compare(a, b)],
  });
  const metrics: MetricResult[] = [
    metric("review_rate", `답례 후기 작성률 (${DEF_LABEL[cfg.def]})`, "P", { x: A.prim, n: A.n }, { x: B.prim, n: B.n }),
  ];
  if (cfg.guardrails.includes("short_review_rate")) metrics.push(metric("short_review_rate", "짧은 후기(10자 미만) 비율 (제출된 후기 중)", "G", { x: A.short, n: A.sub }, { x: B.short, n: B.sub }));
  if (cfg.guardrails.includes("uninstall_rate")) metrics.push(metric("uninstall_rate", "앱 삭제율", "G", { x: A.uninstall, n: A.n }, { x: B.uninstall, n: B.n }));
  if (cfg.guardrails.includes("report_rate")) metrics.push(metric("report_rate", "신고율", "G", { x: A.report, n: A.n }, { x: B.report, n: B.n }));

  // ── SRM ──
  const srmRes = srm([A.n, B.n], [0.5, 0.5]);

  // ── 일별 행 ──
  const periods: PeriodRow[] = Array.from({ length: stop }, (_, i) => {
    const da = sumCells(days.slice(i, i + 1), 1, all, "A");
    const db = sumCells(days.slice(i, i + 1), 1, all, "B");
    return { period: i + 1, arms: { A: { users: da.n, success: da.prim, short: da.short, submitted: da.sub }, B: { users: db.n, success: db.prim, short: db.short, submitted: db.sub } } };
  });

  // ── 패널 ──
  const panels: Record<string, unknown> = { meta: { aa: cfg.aa, platform: cfg.phase === "p1" ? "F" : "own" } };
  const seg = (pick: (k: string) => boolean) => {
    const a = sumCells(days, stop, pick, "A");
    const b = sumCells(days, stop, pick, "B");
    if (a.n === 0 || b.n === 0) return { A: { n: a.n, x: a.prim }, B: { n: b.n, x: b.prim } };
    const r = propTest({ x: a.prim, n: a.n }, { x: b.prim, n: b.n }, cfg.alpha);
    return { A: { n: a.n, x: a.prim }, B: { n: b.n, x: b.prim }, d: r.d, p: r.p, significant: r.p < cfg.alpha };
  };
  panels.segments = {
    byType: Object.fromEntries((cfg.newPolicy === "exclude" ? (["existing"] as const) : (["existing", "new"] as const)).map((t) => [t, seg((k) => k.startsWith(`${t}/`))])),
    bySdk: Object.fromEntries(SDK_CELLS.map((s) => [s.key, seg((k) => k.endsWith(`/${s.key}`))])),
  };
  if (cfg.source === "server") {
    panels.data_source = {
      rows: (["A", "B"] as const).map((arm) => {
        const t = arm === "A" ? A : B;
        return { arm, n: t.n, server: t.serverPrim, client: t.clientPrim };
      }),
    };
  }
  // 진단: 설치 코호트 분포, 양쪽 그룹에 동시에 존재하는 사용자
  {
    const newA = sumCells(days, stop, (k) => k.startsWith("new/"), "A").n;
    const newB = sumCells(days, stop, (k) => k.startsWith("new/"), "B").n;
    const forced = moved.slice(0, stop).reduce((s, x) => s + x, 0);
    const first = ((newA + newB) * NEW_FIRST_DAY_SHARE) / 2;
    const users = A.n + B.n;
    const dupZ = noise ? crnZ(seed, { case: "daangn", phase: cfg.phase, period: "diag", segment: "*", arm: "*", metric: `dup${SALT.review}` }) : 0;
    const dupUsers = Math.max(0, Math.round(users * cfg.flip + Math.sqrt(users * cfg.flip * (1 - cfg.flip)) * dupZ));
    panels.diagnostics = {
      cohorts: cfg.newPolicy === "exclude"
        ? []
        : [
            { label: "설치 후 24시간 이내", A: Math.round(first + forced), B: Math.round(first - forced) },
            { label: "설치 후 1~7일", A: Math.round(newA - first - forced), B: Math.round(newB - first + forced) },
            { label: "설치 후 7일 이후", A: A.n - newA, B: B.n - newB },
          ],
      bothGroups: { users: dupUsers, total: users, share: dupUsers / users },
      srmP: srmRes.p,
    };
  }
  if (cfg.phase === "p2") {
    // 지난 거래후기 실험의 배정과 이번 배정의 교차표. 같은 salt 를 쓰면 지난 실험군이 이번에도 실험군이다.
    const total = A.n + B.n;
    const same = cfg.salt === "reuse_previous" ? 1 : 0.5;
    const cross = (prev: "A" | "B", now: "A" | "B") => Math.round((total / 2) * (prev === now ? same : 1 - same) * ((now === "A" ? A.n : B.n) / (total / 2) || 1));
    panels.salt_crosstab = { rows: (["A", "B"] as const).map((prev) => ({ prev, A: cross(prev, "A"), B: cross(prev, "B") })) };
    if (cfg.newPolicy === "exclude") {
      panels.external_validity = { text: "신규 사용자(가입 7일 이내)를 실험에서 뺐어요. 이 결과는 기존 사용자에게만 일반화할 수 있어요. 신규 사용자에게도 같은 효과가 있을지는 알 수 없어요." };
    }
  }

  // ── 진짜 효과 · 계획 · 달성 검정력 (강사 전용) ──
  let planned: Readout["planned"];
  let achievedPower: number | undefined;
  if (withTruth) {
    const tA = sumCells(truthGen.days, stop, all, "A");
    const tB = sumCells(truthGen.days, stop, all, "B");
    const p1 = tA.prim / tA.n;
    const p2 = p1 + cfg.mdePp / 100;
    const nPer = ssProp(p1, Math.min(0.99, p2), cfg.alpha, cfg.power);
    planned = { nPerArm: nPer, days: Math.ceil(nPer / (tA.n / stop)) };
    if (!cfg.aa) {
      const dTrue = tB.prim / tB.n - p1;
      achievedPower = powerProp(p1, dTrue, tA.n, cfg.alpha);
      // 표본이 커서 통계적으로는 잡히더라도, 효과가 팀이 검출하려던 크기(MDE)에 한참 못 미치면 설계가 의도한 질문에 답하지 못한다
      if (Math.abs(dTrue) < 0.25 * (cfg.mdePp / 100)) achievedPower = Math.min(achievedPower, 0.25);
    }
    panels._truth = {
      note: "기댓값 경로(노이즈 없음)의 진짜 효과와 플랫폼 버그. 조 화면에 보내지 않는다.",
      pEntrant: POP_INFO[cfg.pop].pE,
      effectAmongEntrants: effectOf(cfg, cfg.def),
      observedBiasPp: tB.prim / tB.n - tA.prim / tA.n - effectOf(cfg, cfg.def) * POP_INFO[cfg.pop].pE,
      flipShare: cfg.flip,
      newPolicy: cfg.newPolicy,
      carryover: cfg.carry,
    };
  }

  // ── 플래그 (조 화면에는 내려보내지 않는다) ──
  const flags: Flag[] = [];
  if (srmRes.p < 0.001) flags.push("SRM");
  if (cfg.flip >= 0.03) flags.push("CONTAMINATION");
  if (cfg.source === "client") flags.push("INSTRUMENTATION");
  if (cfg.def === "started") flags.push("GOODHART");
  if (cfg.carry) flags.push("CARRYOVER");
  if (cfg.stopping === "peek_stop") flags.push("PEEKED");
  if (achievedPower !== undefined && achievedPower < 0.5) flags.push("UNDERPOWERED");

  return {
    caseKey: "daangn",
    phase: cfg.phase,
    designHash: designHash("daangn", cfg.phase, design),
    periods,
    stoppedAt: stop,
    srm: { counts: [A.n, B.n], ratios: [0.5, 0.5], p: srmRes.p },
    metrics,
    planned,
    achievedPower,
    panels,
    flags,
  };
}

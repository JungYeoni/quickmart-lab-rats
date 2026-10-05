/**
 * s6 출시 결정 + 장기 검증 계획 (docs/cases/netflix.md §3-5). 새로 측정하는 지표는 없고, 고른 장기 검증 방식의 시뮬레이션 패널을 만든다.
 * - holdout: 홀드아웃 비율·기간별 리텐션 검출력 (기준 효과 +0.15%p, 스펙에 적힌 R3 정상 상태 효과)
 * - extend: 결선을 연장했을 때의 기간별 검출력
 * - bandit: Thompson Sampling 으로 트래픽을 몰아줄 때의 누적 regret, 추정치 편향, 리텐션 피드백 지연
 */
import { crnStream, designHash, powerProp, type Flag, type Readout } from "@/lib/sim/core";
import type { SimOptions } from "./common";
import { CALIB, noveltyAt, TRUTH, type RankerId } from "./effects";
import { HOURS_MEAN, MEMBERS, PLAN_ALPHA, RETENTION, SALT, SEED } from "./population";
import type { DesignP3 } from "./schema";

const REF_RET = 0.0015;
const ramp = (weeks: number) => Math.min(1, weeks / CALIB.retentionRampWeeks);
const effN = (a: number, b: number) => 2 / (1 / a + 1 / b);

// ───────────────────────── 밴딧 ─────────────────────────

const BANDIT_ARMS: RankerId[] = ["R0", "R2", "R3", "R4"];
const DAYS = 28;
/** 하루에 새로 들어와 어느 그룹엔가 배정되는 멤버 수(전체의 일부를 쓰는 실험 가정) */
const DAILY_NEW = 60_000;
const SIGMA = 9;
const PRIOR = { mean: HOURS_MEAN, sd: 3 };
const SAMPLES = 100;
const FLOOR = 0.02;
const REPS = 100;
/** 리텐션 판독일: 실험 종료 후 28일(리텐션 정의) */
const READ_DAY = DAYS + 28;

const mu = (id: RankerId, day: number) => HOURS_MEAN * (1 + TRUTH[id].hours + noveltyAt(id, day));
const muSteady = (id: RankerId) => HOURS_MEAN * (1 + TRUTH[id].hours);

type BanditRun = { alloc: number[][]; est: number[]; regret: number[] };

function runBandit(seed: number, rep: number): BanditRun {
  const g = crnStream(seed, { case: "netflix", phase: "p3", period: "bandit", segment: String(rep), arm: "*", metric: `ts${SALT.ab}` });
  const k = BANDIT_ARMS.length;
  const sumX = Array(k).fill(0);
  const cnt = Array(k).fill(0);
  const alloc: number[][] = [];
  const wSum = Array(k).fill(0);
  const wN = Array(k).fill(0);
  const best = Math.max(...BANDIT_ARMS.map(muSteady));
  const regret: number[] = [];
  let cum = 0;
  for (let t = 1; t <= DAYS; t++) {
    const wins = Array(k).fill(0);
    const post = BANDIT_ARMS.map((_, a) => {
      const prec = 1 / (PRIOR.sd * PRIOR.sd) + cnt[a] / (SIGMA * SIGMA);
      return { m: (PRIOR.mean / (PRIOR.sd * PRIOR.sd) + sumX[a] / (SIGMA * SIGMA)) / prec, sd: Math.sqrt(1 / prec) };
    });
    for (let s = 0; s < SAMPLES; s++) {
      let bi = 0, bv = -Infinity;
      post.forEach((p, a) => { const v = p.m + p.sd * g(); if (v > bv) { bv = v; bi = a; } });
      wins[bi]++;
    }
    let share = wins.map((w) => Math.max(FLOOR, w / SAMPLES));
    const tot = share.reduce((s, v) => s + v, 0);
    share = share.map((v) => v / tot);
    const n = share.map((v) => v * DAILY_NEW);
    alloc.push(n);
    let dayRegret = 0;
    BANDIT_ARMS.forEach((id, a) => {
      const obs = mu(id, t) + (SIGMA / Math.sqrt(n[a])) * g();
      sumX[a] += n[a] * obs;
      cnt[a] += n[a];
      wSum[a] += n[a] * obs;
      wN[a] += n[a];
      dayRegret += n[a] * (best - muSteady(id));
    });
    cum += dayRegret;
    regret.push(cum);
  }
  return { alloc, est: wSum.map((s, a) => s / wN[a]), regret };
}

function banditPanel(seed: number) {
  const k = BANDIT_ARMS.length;
  const runs = Array.from({ length: REPS }, (_, r) => runBandit(seed, r));
  const shown = runs[0];
  const best = Math.max(...BANDIT_ARMS.map(muSteady));
  // 균등 배정: 같은 트래픽을 4개 그룹에 똑같이
  const uniformRegretPerDay = BANDIT_ARMS.reduce((s, id) => s + (DAILY_NEW / k) * (best - muSteady(id)), 0);
  const uniformCum = Array.from({ length: DAYS }, (_, i) => uniformRegretPerDay * (i + 1));
  const share = (r: BanditRun) => BANDIT_ARMS.map((_, a) => r.alloc.map((d) => d[a] / DAILY_NEW));

  // 추정치 편향: 밴딧이 모은 평균 시청 시간(배정이 많은 날에 가중) − 같은 28일을 균등하게 본 평균
  const timeAvg = (id: RankerId) => Array.from({ length: DAYS }, (_, i) => mu(id, i + 1)).reduce((s, v) => s + v, 0) / DAYS;
  const meanEst = BANDIT_ARMS.map((_, a) => runs.reduce((s, r) => s + r.est[a], 0) / REPS);
  const bias = BANDIT_ARMS.map((id, a) => meanEst[a] - timeAvg(id));

  // 4주 리텐션: 판독일(실험 종료 28일 뒤)까지 경과한 주 / 10 만큼만 효과가 보인다. 늦게 배정된 멤버는 경과가 짧다.
  const factor = (t: number) => ramp((READ_DAY - t) / 7);
  const expectedRet = (id: RankerId, alloc: number[][], a: number) => {
    let w = 0, f = 0;
    alloc.forEach((d, i) => { w += d[a]; f += d[a] * factor(i + 1); });
    return TRUTH[id].retention * (f / w);
  };
  const retRows = BANDIT_ARMS.map((id, a) => {
    const bandit = runs.reduce((s, r) => s + expectedRet(id, r.alloc, a), 0) / REPS;
    const uniform = expectedRet(id, Array.from({ length: DAYS }, () => Array(k).fill(DAILY_NEW / k)), a);
    return { id, banditPp: bandit * 100, uniformPp: uniform * 100 };
  });
  const members = (r: BanditRun, a: number) => r.alloc.reduce((s, d) => s + d[a], 0);
  const mem = BANDIT_ARMS.map((_, a) => runs.reduce((s, r) => s + members(r, a), 0) / REPS);
  const iC = BANDIT_ARMS.indexOf("R0");
  const i3 = BANDIT_ARMS.indexOf("R3");
  const powerBandit = powerProp(RETENTION, retRows[i3].banditPp / 100, effN(mem[i3], mem[iC]), PLAN_ALPHA);
  const nUni = (DAILY_NEW / k) * DAYS;
  const powerUniform = powerProp(RETENTION, retRows[i3].uniformPp / 100, nUni, PLAN_ALPHA);

  return {
    arms: BANDIT_ARMS,
    days: DAYS,
    dailyNew: DAILY_NEW,
    allocation: BANDIT_ARMS.map((id, a) => ({ id, share: share(shown)[a] })),
    regret: { bandit: shown.regret, uniform: uniformCum, banditTotal: shown.regret[DAYS - 1], uniformTotal: uniformCum[DAYS - 1], unit: "멤버·시간(주간 시청 시간 기준)" },
    hoursBias: BANDIT_ARMS.map((id, a) => ({ id, estimate: meanEst[a], target: timeAvg(id), bias: bias[a] })),
    retention: {
      feedbackLagDays: 28, readDay: READ_DAY, rows: retRows, members: BANDIT_ARMS.map((id, a) => ({ id, bandit: mem[a], uniform: nUni })),
      powerBandit, powerUniform, referenceNote: "R3 vs R0 의 리텐션 효과를 판독일에 비교할 때의 검정력",
    },
    note: "밴딧은 시청 시간 보상으로 트래픽을 옮겨요. 리텐션은 28일 뒤에야 알 수 있어서 트래픽 배분에 쓰이지 못하고, 늦게 배정된 멤버는 효과를 덜 보여요.",
  };
}

// ───────────────────────── 홀드아웃 · 연장 ─────────────────────────

function holdoutPanel(pct: number, months: number) {
  const row = (p: number) => {
    const nH = (MEMBERS * p) / 100;
    const weeks = months * 4.345;
    const eff = REF_RET * ramp(weeks);
    return { pct: p, holdoutMembers: nH, effectPp: eff * 100, power: powerProp(RETENTION, eff, effN(nH, MEMBERS - nH), PLAN_ALPHA) };
  };
  const mine = row(pct);
  return { months, ...mine, table: [1, 2, 5, 10].map(row), referenceNote: "R3 수준(정상 상태 +0.15%p)의 리텐션 효과를 가정했어요." };
}

function extendPanel() {
  const nArm = Math.floor((MEMBERS * 0.1) / 3);
  return {
    perGroup: nArm,
    rows: [4, 8, 12, 16].map((w) => ({ weeks: w, effectPp: REF_RET * ramp(w) * 100, power: powerProp(RETENTION, REF_RET * ramp(w), nArm, PLAN_ALPHA) })),
    referenceNote: "멤버의 10%를 3개 그룹에 나눠 쓰는 결선을 연장하고, R3 수준(정상 상태 +0.15%p)의 효과를 가정했어요.",
  };
}

export function simulateFinal(d: DesignP3, opts: SimOptions = {}): Readout {
  const seed = opts.seed ?? SEED;
  const panels: Record<string, unknown> = { meta: { ship: d.ship, long_term: d.long_term } };
  if (d.long_term === "holdout") panels.holdout_plan = holdoutPanel(d.holdout_pct!, d.holdout_months!);
  if (d.long_term === "extend") panels.extend_plan = extendPanel();
  if (d.long_term === "bandit") panels.bandit = banditPanel(seed);
  const flags: Flag[] = [];
  if (d.ship === "R2") flags.push("GOODHART");
  return { caseKey: "netflix", phase: "p3", designHash: designHash("netflix", "p3", d), periods: [], metrics: [], panels, flags };
}

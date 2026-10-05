/**
 * 넷플릭스 사례 검증 시나리오 (docs/cases/netflix.md §6). 기대값은 문서가 진실의 원천이다.
 * 스펙에 설계 칸이 비어 있는 시나리오는 팩토리 기본값으로 채웠다.
 */
import { describe, expect, it } from "vitest";
import { toTeamView, type Readout } from "@/lib/sim/core";
import { SimulationRejected } from "../../types";
import { diagnoseFlags, netflixPlugin, simulateNetflix, validateDesign } from "../index";

type D = Record<string, unknown>;
const ALL = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"];
const il = (over: D = {}): D => ({
  phase: "p1", method: "interleaving", il_scheme: "team_draft", il_credit: "qualified_play_10min", il_members_per_pair: 10000, il_days: 7,
  candidates: ALL, correction: "bh", advance_rule: "보정 후 유의 + 선호 0.51 이상", ...over,
});
const abn = (over: D = {}): D => ({
  phase: "p1", method: "abn_all", abn_primary: "hours", abn_fraction: 0.1, abn_weeks: 2, candidates: ALL, correction: "bonferroni", advance_rule: "보정 후 유의", ...over,
});
const fin = (over: D = {}): D => ({
  phase: "p2", finalists: ["R2", "R3"], fraction: 0.1, weeks: 6, primary: "hours", hours_treatment: "winsorize_p99", cuped: true, correction: "bh", stopping: "fixed", exclude_first_week: true, ...over,
});
const last = (over: D = {}): D => ({ phase: "p3", ship: "R3", long_term: "bandit", rationale: "r", ...over });

const metric = (r: Readout, key: string) => r.metrics.find((m) => m.key === key)!;
const cmp = (r: Readout, key: string, arm = "B") => metric(r, key).comparisons.find((c) => c.arm === arm)!;
const pref = (r: Readout, id: string) => 0.5 + cmp(r, `pref_${id}`).d;
const sigPref = (r: Readout, id: string) => cmp(r, `pref_${id}`).significant;
const pOf = (r: Readout, id: string) => cmp(r, `pref_${id}`).p;
const width = (r: Readout, key: string, arm = "B") => cmp(r, key, arm).ci[1] - cmp(r, key, arm).ci[0];
const NULLS = ["R1", "R5", "R8"];

describe("넷플릭스 검증 시나리오", () => {
  it("#1 인터리빙 + Team Draft + 충분 시청 + BH: R3·R4 유의, R2·R7 경계 이상, R5·R8 유의 아님", () => {
    const r = simulateNetflix(il());
    expect(sigPref(r, "R3")).toBe(true);
    expect(sigPref(r, "R4")).toBe(true);
    for (const id of ["R2", "R7"]) expect(pOf(r, id)).toBeLessThan(0.1);
    expect(sigPref(r, "R5")).toBe(false);
    expect(sigPref(r, "R8")).toBe(false);
    // 선호 순위가 진짜 효과 순서와 거의 일치: R3 > R4 > R2·R7 > R1
    expect(pref(r, "R3")).toBeGreaterThan(pref(r, "R4"));
    expect(pref(r, "R4")).toBeGreaterThan(Math.max(pref(r, "R2"), pref(r, "R7")) - 0.002);
    expect(Math.min(pref(r, "R2"), pref(r, "R7"))).toBeGreaterThan(pref(r, "R1") - 0.002);
    expect(r.flags).toEqual([]);
  });

  it("#2 재생 시작 귀속: R2 가 1위(0.55 이상), GOODHART. 귀속을 바꿔 보면 순위가 달라진다", () => {
    const r = simulateNetflix(il({ il_credit: "play_start" }));
    const prefs = ALL.map((id) => [id, pref(r, id)] as const).sort((a, b) => b[1] - a[1]);
    expect(prefs[0][0]).toBe("R2");
    expect(prefs[0][1]).toBeGreaterThanOrEqual(0.55);
    expect(r.flags).toContain("GOODHART");
    const alt = (r.panels.alt_credit as { credit: string; rows: { id: string; pref: number }[] }).rows.find((x) => x.id === "R2")!;
    expect(alt.pref).toBeLessThan(0.53);
  });

  it("#3 balanced_fixed_first: R5·R8 포함 대부분 선호 > 0.51, POSITION_BIAS", () => {
    const r = simulateNetflix(il({ il_scheme: "balanced_fixed_first" }));
    expect(pref(r, "R5")).toBeGreaterThan(0.51);
    expect(pref(r, "R8")).toBeGreaterThan(0.51);
    expect(ALL.filter((id) => pref(r, id) > 0.51).length).toBeGreaterThanOrEqual(6);
    expect(r.flags).toContain("POSITION_BIAS");
  });

  it("#4 correction none: 무효 후보 중 최소 1개 p < 0.05 (CRN 고정으로 재현), MULTIPLE_TESTING", () => {
    const r = simulateNetflix(il({ correction: "none" }));
    expect(NULLS.some((id) => pOf(r, id) < 0.05)).toBe(true);
    expect(r.flags).toContain("MULTIPLE_TESTING");
    const again = simulateNetflix(il({ correction: "none" }));
    expect(NULLS.map((id) => pOf(again, id))).toEqual(NULLS.map((id) => pOf(r, id)));
  });

  it("#5 abn_all hours, 9군, 전체 10%, 2주: R3 포함 대부분 유의 아님, UNDERPOWERED", () => {
    const r = simulateNetflix(abn());
    const sigCount = ALL.filter((id) => cmp(r, `hours_${id}`).significant).length;
    expect(sigCount).toBeLessThanOrEqual(4);
    expect(r.flags).toContain("UNDERPOWERED");
    const note = r.panels.power_note as { neededTotalMembers: number; perGroup: number; neededPerGroup: number };
    expect(note.neededPerGroup).toBeGreaterThan(note.perGroup);
    // 리텐션은 기간 내 판단 불가 수준
    const ret = simulateNetflix(abn({ abn_primary: "retention", abn_weeks: 4 }));
    expect(ret.achievedPower!).toBeLessThan(0.2);
  });

  it("#6 결선 R2+R3, 10%, 2주, raw: R2 시청 시간 유의 상승(신규성), NOVELTY", () => {
    const r = simulateNetflix(fin({ weeks: 2, hours_treatment: "raw", cuped: false, exclude_first_week: false }));
    expect(cmp(r, "hours", "B").significant).toBe(true);
    expect(cmp(r, "hours", "B").d).toBeGreaterThan(0);
    expect(r.flags).toContain("NOVELTY");
  });

  it("#7 결선 R2+R3, 10%, 6주, winsorize + cuped, 첫 주 제외: R3 +0.9~1.3% 유의, R2 유의 아님", () => {
    const r = simulateNetflix(fin());
    const r2 = cmp(r, "hours", "B");
    const r3 = cmp(r, "hours", "C");
    expect(r3.rel * 100).toBeGreaterThanOrEqual(0.9);
    expect(r3.rel * 100).toBeLessThanOrEqual(1.3);
    expect(r3.significant).toBe(true);
    expect(r2.significant).toBe(false);
    // 2분 내 이탈은 R2 에서 늘어난다
    expect(cmp(r, "early_exit", "B").d).toBeGreaterThan(0);
    expect(r.flags).not.toContain("NOVELTY");
    // 주별 시계열: R2 는 1주차에 가장 높다
    const wk = r.periods.map((p) => p.arms.B!.hours);
    expect(wk[0]).toBeGreaterThan(wk[wk.length - 1]);
  });

  it("#8 raw + cuped false: R3 CI 폭이 #7 대비 1.6배 이상", () => {
    const base = simulateNetflix(fin());
    const raw = simulateNetflix(fin({ hours_treatment: "raw", cuped: false }));
    expect(width(raw, "hours", "C")).toBeGreaterThanOrEqual(1.6 * width(base, "hours", "C"));
  });

  it("#9 결선 primary retention, 4주: R3 효과 +0.04~0.09%p, p > 0.05, 달성 검정력 0.12~0.35, UNDERPOWERED", () => {
    const r = simulateNetflix(fin({ primary: "retention", weeks: 4, finalists: ["R3", "R4"], exclude_first_week: false }));
    const c = cmp(r, "retention", "B");
    expect(c.d * 100).toBeGreaterThanOrEqual(0.04);
    expect(c.d * 100).toBeLessThanOrEqual(0.09);
    expect(c.p).toBeGreaterThan(0.05);
    expect(r.achievedPower!).toBeGreaterThanOrEqual(0.12);
    expect(r.achievedPower!).toBeLessThanOrEqual(0.35);
    expect(r.flags).toContain("UNDERPOWERED");
  });

  it("#10 s6 bandit 패널: 누적 regret 이 균등 배정보다 낮고, 리텐션 추정이 편향·검정력 저하", () => {
    const r = simulateNetflix(last());
    const b = r.panels.bandit as {
      regret: { banditTotal: number; uniformTotal: number };
      retention: { rows: { id: string; banditPp: number; uniformPp: number }[]; powerBandit: number; powerUniform: number; feedbackLagDays: number };
      hoursBias: { id: string; bias: number }[];
    };
    expect(b.regret.banditTotal).toBeLessThan(b.regret.uniformTotal);
    const r3 = b.retention.rows.find((x) => x.id === "R3")!;
    expect(r3.banditPp).toBeLessThan(r3.uniformPp);
    expect(b.retention.powerBandit).toBeLessThan(b.retention.powerUniform);
    expect(b.retention.feedbackLagDays).toBe(28);
    const maxBias = Math.max(...b.hoursBias.map((x) => Math.abs(x.bias)));
    expect(maxBias).toBeGreaterThan(0.005);
    // 홀드아웃·연장 패널
    const h = simulateNetflix(last({ long_term: "holdout", holdout_pct: 5, holdout_months: 3 })).panels.holdout_plan as { power: number; table: { pct: number; power: number }[] };
    expect(h.power).toBeGreaterThan(0.9);
    expect(h.table[0].power).toBeLessThan(h.table[2].power);
    expect(simulateNetflix(last({ long_term: "extend" })).panels.extend_plan).toBeTruthy();
  });

  it("#11 s1 ship_offline_best=yes: OFFLINE_ONLINE_GAP", () => {
    expect(diagnoseFlags({ ship_offline_best: "yes", reason: "NDCG 가 높아서", offline_online_risks: [] })).toEqual(["OFFLINE_ONLINE_GAP"]);
    expect(diagnoseFlags({ ship_offline_best: "no", reason: "온라인 확인", offline_online_risks: ["metric_mismatch"] })).toEqual([]);
  });

  it("#12 결정성·CRN: 동일 설계 동일 출력, 조 화면에는 숨김 정보가 없다", () => {
    for (const d of [il(), abn(), fin(), last()]) expect(simulateNetflix(d)).toEqual(simulateNetflix(d));
    const r = simulateNetflix(il({ il_credit: "play_start", il_scheme: "balanced_fixed_first", correction: "none" }));
    const team = JSON.stringify(toTeamView(r));
    for (const leak of ["GOODHART", "POSITION_BIAS", "MULTIPLE_TESTING", "achievedPower", "_truth", "flags"]) expect(team).not.toContain(leak);
    // 설계가 달라도 같은 (후보, 일)의 노이즈는 같다: 보정만 다르면 선호 추정치는 그대로
    expect(pref(simulateNetflix(il({ correction: "none" })), "R3")).toBe(pref(simulateNetflix(il()), "R3"));
  });
});

describe("넷플릭스 추가 검증", () => {
  it("peek_stop 은 신규성 구간에서 조기 종료하고 PEEKED + NOVELTY", () => {
    const r = simulateNetflix(fin({ stopping: "peek_stop", exclude_first_week: false, hours_treatment: "raw", cuped: false, weeks: 6 }));
    expect(r.stoppedAt!).toBeLessThan(4);
    expect(r.flags).toContain("PEEKED");
    expect(r.flags).toContain("NOVELTY");
  });
  it("대리 지표에서 R3 는 유의", () => {
    const r = simulateNetflix(fin({ primary: "surrogate_2ep", weeks: 4 }));
    expect(cmp(r, "surrogate_2ep", "C").significant).toBe(true);
    expect(r.panels.interpretation).toBeTruthy();
  });
  it("로그 변환은 기하평균 변화로 해석한다", () => {
    const r = simulateNetflix(fin({ hours_treatment: "log" }));
    expect(cmp(r, "hours", "C").significant).toBe(true);
    expect(cmp(r, "hours", "C").method).toContain("기하평균");
  });
  it("입력 검증", () => {
    expect(() => simulateNetflix(fin({ weeks: 1, exclude_first_week: true }))).toThrow(SimulationRejected);
    expect(() => simulateNetflix(fin({ primary: "retention", weeks: 3, exclude_first_week: false }))).toThrow(SimulationRejected);
    expect(() => simulateNetflix({ phase: "p1", method: "interleaving", candidates: ALL, correction: "bh", advance_rule: "x" })).toThrow(SimulationRejected);
    expect(validateDesign({ phase: "p2", finalists: ["R3"] }).ok).toBe(false);
    expect(() => netflixPlugin.simulate("diagnose", {} as never, { prior: {} })).toThrow(SimulationRejected);
    expect(netflixPlugin.simulate("p1_run", il() as never, { prior: {} }).caseKey).toBe("netflix");
  });
});

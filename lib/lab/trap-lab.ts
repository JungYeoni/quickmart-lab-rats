/**
 * s7 함정 연구소 계산 (reference/prototype.html 의 initLab 포팅). 서버 없이 브라우저에서 돌리는 교육용 계산이라
 * 사례와 무관하고 DB 에도 쓰지 않는다. 클라이언트 번들에 들어가므로 crn.ts(서버 전용 표시)는 import 하지 않는다.
 */
import { gaussian, mulberry32 } from "../sim/core/rng";
import { propTest, srm } from "../sim/core/stats";

/** 정규 근사 이항 표본 */
const binom = (n: number, p: number, g: () => number) => Math.max(0, Math.min(n, Math.round(n * p + Math.sqrt(n * p * (1 - p)) * g())));

export type PeekingResult = { runs: number; days: number; finalRate: number; everRate: number; paths: number[][] };

/**
 * 효과가 전혀 없는 A/A 실험을 runs 번 돌려, 마지막 날 한 번만 보는 경우와 매일 보다가 p < 0.05 가 뜨면 멈추는 경우의 위양성률을 비교한다.
 * 하루 표본은 그룹당 2,750명, 전환율 0.61.
 */
export function peekingExperiment(days: number, runs = 400, seed = 1000 + days, pathsShown = 24): PeekingResult {
  const g = gaussian(mulberry32(seed));
  let ever = 0;
  let fin = 0;
  const paths: number[][] = [];
  for (let k = 0; k < runs; k++) {
    let a = 0, na = 0, b = 0, nb = 0, hit = false;
    const zs: number[] = [];
    for (let d = 0; d < days; d++) {
      a += binom(2750, 0.61, g); na += 2750;
      b += binom(2750, 0.61, g); nb += 2750;
      const t = propTest({ x: a, n: na }, { x: b, n: nb });
      zs.push(t.z);
      if (t.p < 0.05) hit = true;
    }
    if (hit) ever++;
    if (Math.abs(zs[days - 1]) > 1.96) fin++;
    if (k < pathsShown) paths.push(zs);
  }
  return { runs, days, finalRate: fin / runs, everRate: ever / runs, paths };
}

/** 램프업 중 배정 비율을 바꾼 실험: 1주차(평소, B 10%)와 2주차(대형 프로모션, B 50%) */
export const SIMPSON = {
  week1: { A: { x: 9000, n: 90000 }, B: { x: 950, n: 10000 } },
  week2: { A: { x: 8000, n: 50000 }, B: { x: 7800, n: 50000 } },
};

export type Cell = { x: number; n: number };
export type SimpsonRow = { label: string; note?: string; A: Cell; B: Cell; d: number; p: number };

export function simpsonRows(view: "pool" | "split"): SimpsonRow[] {
  const row = (label: string, A: Cell, B: Cell, note?: string): SimpsonRow => {
    const t = propTest(A, B);
    return { label, note, A, B, d: t.d, p: t.p };
  };
  const { week1, week2 } = SIMPSON;
  if (view === "pool") {
    return [row("주문전환율 (2주 합계)", { x: week1.A.x + week2.A.x, n: week1.A.n + week2.A.n }, { x: week1.B.x + week2.B.x, n: week1.B.n + week2.B.n })];
  }
  return [row("1주차: B 10% 배정", week1.A, week1.B, "평소 주간"), row("2주차: B 50% 배정", week2.A, week2.B, "대형 프로모션 주간")];
}

export type SrmResult = { ok: true; a: number; b: number; ratioA: number; shareA: number; shareB: number; p: number; srm: boolean } | { ok: false; error: string };

/** SRM 계산기. 실무에서는 p < 0.001 이면 SRM 으로 보고 결과 해석을 멈춘다. */
export function srmCheck(a: number, b: number, ratioA: number): SrmResult {
  if (!(a > 0 && b > 0 && ratioA > 0 && ratioA < 1)) return { ok: false, error: "사용자 수는 0보다 크고, 비율은 1~99% 사이여야 해요." };
  const r = srm([a, b], [ratioA, 1 - ratioA]);
  return { ok: true, a, b, ratioA, shareA: a / r.N, shareB: b / r.N, p: r.p, srm: r.p < 0.001 };
}

import type { MetricResult } from "@/lib/sim/core/readout";

type Stat = { n: number; x?: number; mean?: number; sd?: number };

export const fmtInt = (n: number) => Math.round(n).toLocaleString("ko-KR");

export function fmtPct(v: number, digits = 2) {
  return `${(v * 100).toFixed(digits)}%`;
}

/** 크래시율처럼 아주 작은 비율은 소수점 자릿수를 늘린다 */
const digitsFor = (key: string) => (key === "crash" ? 3 : 2);

export function fmtValue(m: Pick<MetricResult, "key" | "type">, s: Stat | undefined): string {
  if (!s || s.n === 0) return "–";
  if (m.type === "prop") return fmtPct((s.x ?? 0) / s.n, digitsFor(m.key));
  return fmtInt(s.mean ?? 0);
}

export function statValue(m: Pick<MetricResult, "type">, s: Stat | undefined): number {
  if (!s || s.n === 0) return NaN;
  return m.type === "prop" ? (s.x ?? 0) / s.n : (s.mean ?? 0);
}

/** 차이: 비율 지표는 %p, 그 외는 원/ms 같은 원래 단위 */
export function fmtDiff(m: Pick<MetricResult, "key" | "type">, d: number): string {
  const sign = d > 0 ? "+" : d < 0 ? "−" : "";
  const a = Math.abs(d);
  return m.type === "prop" ? `${sign}${(a * 100).toFixed(digitsFor(m.key))}%p` : `${sign}${fmtInt(a)}`;
}

export function fmtRel(r: number): string {
  if (!Number.isFinite(r)) return "–";
  const sign = r > 0 ? "+" : r < 0 ? "−" : "";
  return `${sign}${(Math.abs(r) * 100).toFixed(1)}%`;
}

export function fmtP(p: number): string {
  if (p < 0.001) return "<0.001";
  return p.toFixed(3);
}

export const ROLE_LABEL = { P: "메인", G: "가드레일", S: "보조" } as const;
export const ARM_LABEL: Record<string, string> = { A: "A (대조군)", B: "B", C: "C", D: "D" };

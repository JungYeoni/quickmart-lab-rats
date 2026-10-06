"use client";
import { useState } from "react";
import type { PeriodRow } from "@/lib/sim/core/readout";
import { fmtPct, type ArmLabels } from "./format";

const COLORS: Record<string, string> = { A: "var(--a)", B: "var(--blue)", C: "var(--c)", D: "var(--warn)" };

/** 꺾은선으로 보여줄 시계열 한 가지. 사례가 정의하고(components/cases/<case>/series.ts) 공통 컴포넌트는 그리기만 한다. */
export type Series = { key: string; label: string; value: (row: Record<string, number>) => number; pct: boolean; digits?: number };

/** 기간별 그룹 비교 꺾은선 (프로토타입 lineChart 를 SVG 로 단순 포팅). 지표를 바꿔 볼 수 있다. */
export function TimeSeries({ periods, series: all, periodUnit = "일", armLabels = {} }: { periods: PeriodRow[]; series: Series[]; periodUnit?: string; armLabels?: ArmLabels }) {
  // 이 단계의 데이터에 없는 시계열(다른 Phase 용)은 버튼을 만들지 않는다
  const series = all.filter((s) => periods.some((p) => Object.values(p.arms).some((row) => Number.isFinite(s.value((row ?? {}) as Record<string, number>)))));
  const [key, setKey] = useState(series[0]?.key);
  const s = series.find((x) => x.key === key) ?? series[0];
  if (!s) return null;
  const arms = Object.keys(periods[0]?.arms ?? {});
  const data = arms.map((a) => ({ arm: a, v: periods.map((p) => s.value(p.arms[a as "A"] ?? {})) }));
  const vals = data.flatMap((d) => d.v).filter(Number.isFinite);
  if (vals.length === 0) return null;
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.12;
  const W = 640, H = 220, L = 56, R = 12, T = 12, B = 26;
  const x = (i: number) => L + (periods.length === 1 ? 0 : (i / (periods.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - (v - (lo - pad)) / (hi + pad - (lo - pad))) * (H - T - B);
  const fmt = (v: number) => (s.pct ? fmtPct(v, s.digits ?? 1) : v.toLocaleString("ko-KR", { maximumFractionDigits: s.digits ?? 0 }));
  const tick = periodUnit === "주" ? () => true : (i: number) => i === 0 || (i + 1) % 7 === 0 || i === periods.length - 1;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {series.map((x2) => (
          <button
            key={x2.key} onClick={() => setKey(x2.key)}
            className={`rounded-full border px-3 py-1 text-xs ${s.key === x2.key ? "border-brand bg-brand-soft font-semibold" : "border-line bg-surface text-ink2"}`}
          >
            {x2.label}
          </button>
        ))}
        <span className="ml-auto flex gap-3 text-xs text-ink2">
          {arms.map((a) => <span key={a} className="flex items-center gap-1"><i className="inline-block h-0.5 w-4" style={{ background: COLORS[a] }} />{armLabels[a]?.split(" ")[0] ?? a}</span>)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${periodUnit}별 ${s.label}`}>
        {[0, 0.5, 1].map((t) => {
          const v = lo - pad + t * (hi + pad - (lo - pad));
          return (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
              <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--ink3)">{fmt(v)}</text>
            </g>
          );
        })}
        {periods.map((p, i) => tick(i) && (
          <text key={String(p.period)} x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--ink3)">{p.period}{periodUnit}</text>
        ))}
        {data.map((d) => (
          <polyline key={d.arm} fill="none" stroke={COLORS[d.arm]} strokeWidth={2} strokeLinejoin="round"
            points={d.v.map((v, i) => (Number.isFinite(v) ? `${x(i)},${y(v)}` : "")).filter(Boolean).join(" ")} />
        ))}
      </svg>
    </div>
  );
}

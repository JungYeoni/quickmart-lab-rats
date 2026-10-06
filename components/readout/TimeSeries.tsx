"use client";
import { useState } from "react";
import type { PeriodRow } from "@/lib/sim/core/readout";
import { fmtPct } from "./format";

const COLORS: Record<string, string> = { A: "var(--a)", B: "var(--blue)", C: "var(--c)", D: "var(--warn)" };

type Series = { key: string; label: string; value: (a: Record<string, number>) => number; pct: boolean };

const SERIES: Series[] = [
  { key: "abandon", label: "장바구니 이탈률", value: (a) => (a.cart ? a.abandoned / a.cart : NaN), pct: true },
  { key: "conv", label: "주문전환율", value: (a) => (a.users ? a.orders / a.users : NaN), pct: true },
  { key: "users", label: "일 사용자 수", value: (a) => a.users, pct: false },
];

/** 일별 그룹 비교 꺾은선 (프로토타입 lineChart 를 SVG 로 단순 포팅). 지표를 바꿔 볼 수 있다. */
export function TimeSeries({ periods }: { periods: PeriodRow[] }) {
  const [key, setKey] = useState("abandon");
  const s = SERIES.find((x) => x.key === key)!;
  const arms = Object.keys(periods[0]?.arms ?? {});
  const data = arms.map((a) => ({ arm: a, v: periods.map((p) => s.value(p.arms[a as "A"] ?? {})) }));
  const all = data.flatMap((d) => d.v).filter(Number.isFinite);
  if (all.length === 0) return null;
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.12;
  const W = 640, H = 220, L = 52, R = 12, T = 12, B = 26;
  const x = (i: number) => L + (periods.length === 1 ? 0 : (i / (periods.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - (v - (lo - pad)) / (hi + pad - (lo - pad))) * (H - T - B);
  const fmt = (v: number) => (s.pct ? fmtPct(v, 1) : Math.round(v).toLocaleString("ko-KR"));
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {SERIES.map((x2) => (
          <button
            key={x2.key} onClick={() => setKey(x2.key)}
            className={`rounded-full border px-3 py-1 text-xs ${key === x2.key ? "border-brand bg-brand-soft font-semibold" : "border-line bg-surface text-ink2"}`}
          >
            {x2.label}
          </button>
        ))}
        <span className="ml-auto flex gap-3 text-xs text-ink2">
          {arms.map((a) => <span key={a} className="flex items-center gap-1"><i className="inline-block h-0.5 w-4" style={{ background: COLORS[a] }} />{a}</span>)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`일별 ${s.label}`}>
        {[0, 0.5, 1].map((t) => {
          const v = lo - pad + t * (hi + pad - (lo - pad));
          return (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
              <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--ink3)">{fmt(v)}</text>
            </g>
          );
        })}
        {periods.map((p, i) => (i === 0 || (i + 1) % 7 === 0 || i === periods.length - 1) && (
          <text key={String(p.period)} x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--ink3)">{p.period}일</text>
        ))}
        {data.map((d) => (
          <polyline key={d.arm} fill="none" stroke={COLORS[d.arm]} strokeWidth={2} strokeLinejoin="round"
            points={d.v.map((v, i) => (Number.isFinite(v) ? `${x(i)},${y(v)}` : "")).filter(Boolean).join(" ")} />
        ))}
      </svg>
    </div>
  );
}

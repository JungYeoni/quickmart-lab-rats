"use client";
import { useState } from "react";
import { fmtInt, fmtP, fmtPct } from "@/components/readout/format";
import { PanelSection } from "@/components/readout/PanelSection";
import { Button } from "@/components/ui";

const th = "px-2 py-2 text-right text-xs font-medium text-ink3";
const thl = "px-2 py-2 text-left text-xs font-medium text-ink3";
const td = "px-2 py-2 text-right tabular-nums";
const COLORS = ["var(--a)", "var(--blue)", "var(--c)", "var(--warn)", "var(--brand)", "#8b5cf6", "#0891b2", "#be185d"];
const sgn = (v: number, digits: number, unit = "") => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}${unit}`;

type Line = { label: string; values: number[]; dashed?: boolean };

/** 값 배열 여러 개를 겹쳐 그리는 간단한 꺾은선 (x 는 1부터 시작하는 일) */
function Lines({ lines, fmt, unit, base }: { lines: Line[]; fmt: (v: number) => string; unit: string; base?: number }) {
  const all = lines.flatMap((l) => l.values).concat(base === undefined ? [] : [base]);
  const lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.1;
  const W = 640, H = 200, L = 56, R = 12, T = 10, B = 24;
  const n = Math.max(...lines.map((l) => l.values.length));
  const x = (i: number) => L + (n === 1 ? 0 : (i / (n - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - (v - (lo - pad)) / (hi + pad - (lo - pad))) * (H - T - B);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {[0, 0.5, 1].map((t) => {
          const v = lo - pad + t * (hi + pad - (lo - pad));
          return (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
              <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--ink3)">{fmt(v)}</text>
            </g>
          );
        })}
        {base !== undefined && <line x1={L} x2={W - R} y1={y(base)} y2={y(base)} stroke="var(--ink3)" strokeDasharray="4 3" />}
        {[0, n - 1].map((i) => <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : "end"} fontSize={11} fill="var(--ink3)">{i + 1}{unit}</text>)}
        {lines.map((l, k) => (
          <polyline key={l.label} fill="none" stroke={COLORS[k % COLORS.length]} strokeWidth={2} strokeDasharray={l.dashed ? "5 3" : undefined}
            points={l.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3 text-xs text-ink2">
        {lines.map((l, k) => <span key={l.label} className="flex items-center gap-1"><i className="inline-block h-0.5 w-4" style={{ background: COLORS[k % COLORS.length] }} />{l.label}</span>)}
      </div>
    </div>
  );
}

type Meta = { method?: string; credit?: string };
type AltRow = { id: string; pref: number; p: number; significant: boolean };

/** 넷플릭스 사례 전용 패널: 인터리빙 선호 추이, 귀속 토글, 표본 크기, 꼬리 지표, 대리 지표 해설, 밴딧·홀드아웃·연장 시뮬레이션 */
export function NetflixPanels({ panels }: { phase: string; panels: Record<string, unknown> }) {
  const [alt, setAlt] = useState(false);
  const meta = panels.meta as Meta | undefined;
  const daily = panels.daily_pref as { days: number; rows: { id: string; cum: number[]; final: number }[] } | undefined;
  const altCredit = panels.alt_credit as { credit: string; rows: AltRow[] } | undefined;
  const sample = panels.sample_note as { neededPerPair: number; perPair: number; reference: string } | undefined;
  const power = panels.power_note as { perGroup: number; neededPerGroup: number; neededTotalMembers: number; referenceEffect: string; minWeeks: number } | undefined;
  const tail = panels.tail as { p99_hours: number; whale_share: number; note: string; rows: { id: string; raw: { d: number; rel: number; ciWidth: number }; winsor: { d: number; rel: number; ciWidth: number } }[] } | undefined;
  const interp = panels.interpretation as { text: string } | undefined;
  const retPower = panels.retention_power as { perGroup: number; neededPerGroup: number; referenceEffect: string; note: string } | undefined;
  const holdout = panels.holdout_plan as { pct: number; months: number; holdoutMembers: number; effectPp: number; power: number; table: { pct: number; holdoutMembers: number; power: number }[]; referenceNote: string } | undefined;
  const extend = panels.extend_plan as { perGroup: number; rows: { weeks: number; effectPp: number; power: number }[]; referenceNote: string } | undefined;
  const bandit = panels.bandit as
    | {
        arms: string[]; days: number; dailyNew: number; note: string;
        allocation: { id: string; share: number[] }[];
        regret: { bandit: number[]; uniform: number[]; banditTotal: number; uniformTotal: number; unit: string };
        hoursBias: { id: string; estimate: number; target: number; bias: number }[];
        retention: { feedbackLagDays: number; readDay: number; rows: { id: string; banditPp: number; uniformPp: number }[]; members: { id: string; bandit: number; uniform: number }[]; powerBandit: number; powerUniform: number; referenceNote: string };
      }
    | undefined;

  return (
    <div className="space-y-3">
      {daily && (
        <PanelSection open title="일별 선호 추이 (누적)" hint="후보 몫이 현행(R0) 몫보다 더 선택된 비율이에요. 0.5 가 같다는 뜻이에요.">
          <Lines lines={daily.rows.map((r) => ({ label: r.id, values: r.cum }))} fmt={(v) => v.toFixed(3)} unit="일" base={0.5} />
        </PanelSection>
      )}
      {altCredit && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-ink2">같은 후보를 다른 성과 기준으로 세면 어떨까요?</span>
            <Button variant="ghost" onClick={() => setAlt((v) => !v)}>{alt ? "접기" : "다른 기준으로 보기"}</Button>
          </div>
          {alt && (
            <div className="mt-3 overflow-x-auto">
              <p className="mb-2 text-xs text-ink3">지금 보는 기준: {meta?.credit === "play_start" ? "재생 시작" : "충분한 시청(10분 이상)"} → 아래는 {altCredit.credit === "play_start" ? "재생 시작" : "충분한 시청(10분 이상)"} 기준이에요.</p>
              <table className="w-full min-w-[360px] text-sm">
                <thead><tr><th className={thl}>후보</th><th className={th}>선호도</th><th className={th}>p</th><th className={th}>유의</th></tr></thead>
                <tbody>
                  {altCredit.rows.map((r) => (
                    <tr key={r.id} className="border-t border-line"><td className="px-2 py-2 font-medium">{r.id}</td><td className={td}>{r.pref.toFixed(3)}</td><td className={td}>{fmtP(r.p)}</td><td className={td}>{r.significant ? "유의" : "–"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {sample && (
        <PanelSection title="표본 크기 점검" hint={sample.reference}>
          <p className="text-sm tabular-nums">필요한 쌍당 멤버 수 <b>{fmtInt(sample.neededPerPair)}명</b> · 설계 <b>{fmtInt(sample.perPair)}명</b></p>
        </PanelSection>
      )}
      {power && (
        <PanelSection open title="표본 크기 점검" hint={`${power.referenceEffect}를 80% 검정력으로 잡으려면 그룹당 얼마나 필요한지 계산했어요.`}>
          <p className="text-sm tabular-nums">그룹당 필요 <b>{fmtInt(power.neededPerGroup)}명</b> · 설계 <b>{fmtInt(power.perGroup)}명</b> · 전체 필요 멤버 약 <b>{fmtInt(power.neededTotalMembers)}명</b>{power.minWeeks > 1 ? ` · 최소 ${power.minWeeks}주 이상 관찰 필요` : ""}</p>
        </PanelSection>
      )}
      {tail && (
        <PanelSection title="꼬리가 긴 시청 시간" hint={tail.note}>
          <p className="mb-2 text-sm tabular-nums">상위 1% 경계(p99) {tail.p99_hours.toFixed(1)}시간 · 주 60시간 이상 고래 {fmtPct(tail.whale_share, 2)}</p>
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr><th className={thl}>후보</th><th className={th}>원시 추정(시간)</th><th className={th}>원시 CI 폭</th><th className={th}>윈저라이징 추정(시간)</th><th className={th}>윈저라이징 CI 폭</th></tr></thead>
            <tbody>
              {tail.rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-2 py-2 font-medium">{r.id}</td><td className={td}>{sgn(r.raw.d, 3)}</td><td className={td}>{r.raw.ciWidth.toFixed(3)}</td><td className={td}>{sgn(r.winsor.d, 3)}</td><td className={td}>{r.winsor.ciWidth.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PanelSection>
      )}
      {interp && <PanelSection open title="지표 해석 주의"><p className="text-sm">{interp.text}</p></PanelSection>}
      {retPower && (
        <PanelSection open title="리텐션 표본 크기 점검" hint={retPower.note}>
          <p className="text-sm tabular-nums">{retPower.referenceEffect}을 잡으려면 그룹당 <b>{fmtInt(retPower.neededPerGroup)}명</b> 필요 · 설계 <b>{fmtInt(retPower.perGroup)}명</b></p>
        </PanelSection>
      )}
      {holdout && (
        <PanelSection open title="장기 홀드아웃 검출력" hint={holdout.referenceNote}>
          <p className="mb-2 text-sm tabular-nums">내 설계: 홀드아웃 {holdout.pct}% ({fmtInt(holdout.holdoutMembers)}명), {holdout.months}개월 → 보이는 효과 {holdout.effectPp.toFixed(3)}%p, 검정력 <b>{fmtPct(holdout.power, 0)}</b></p>
          <table className="w-full min-w-[360px] text-sm">
            <thead><tr><th className={thl}>홀드아웃 비율</th><th className={th}>멤버 수</th><th className={th}>검정력</th></tr></thead>
            <tbody>{holdout.table.map((r) => <tr key={r.pct} className="border-t border-line"><td className="px-2 py-2 font-medium">{r.pct}%</td><td className={td}>{fmtInt(r.holdoutMembers)}</td><td className={td}>{fmtPct(r.power, 0)}</td></tr>)}</tbody>
          </table>
        </PanelSection>
      )}
      {extend && (
        <PanelSection open title="결선 실험을 연장하면" hint={extend.referenceNote}>
          <table className="w-full min-w-[360px] text-sm">
            <thead><tr><th className={thl}>기간</th><th className={th}>보이는 효과(%p)</th><th className={th}>검정력</th></tr></thead>
            <tbody>{extend.rows.map((r) => <tr key={r.weeks} className="border-t border-line"><td className="px-2 py-2 font-medium">{r.weeks}주</td><td className={td}>{r.effectPp.toFixed(3)}</td><td className={td}>{fmtPct(r.power, 0)}</td></tr>)}</tbody>
          </table>
        </PanelSection>
      )}
      {bandit && (
        <>
          <PanelSection open title="밴딧(Thompson Sampling) 시뮬레이션: 트래픽 배분" hint={`${bandit.days}일 동안 하루 ${fmtInt(bandit.dailyNew)}명이 새로 배정된다고 가정했어요. ${bandit.note}`}>
            <Lines lines={bandit.allocation.map((a) => ({ label: a.id, values: a.share }))} fmt={(v) => fmtPct(v, 0)} unit="일" />
          </PanelSection>
          <PanelSection open title="누적 regret: 밴딧 vs 균등 배정" hint={`가장 좋은 랭커를 처음부터 썼을 때 대비 손실이에요(${bandit.regret.unit}).`}>
            <Lines lines={[{ label: "밴딧", values: bandit.regret.bandit }, { label: "균등 배정", values: bandit.regret.uniform, dashed: true }]} fmt={(v) => fmtInt(v)} unit="일" />
            <p className="mt-2 text-sm tabular-nums">28일 누적: 밴딧 {fmtInt(bandit.regret.banditTotal)} · 균등 {fmtInt(bandit.regret.uniformTotal)}</p>
          </PanelSection>
          <PanelSection open title="밴딧이 모은 데이터로 효과를 추정하면" hint="트래픽이 몰린 날의 값이 더 많이 반영돼서 추정치가 치우쳐요(반복 100회 평균).">
            <table className="mb-4 w-full min-w-[480px] text-sm">
              <thead><tr><th className={thl}>랭커</th><th className={th}>밴딧 추정 시청 시간</th><th className={th}>28일을 균등하게 본 평균</th><th className={th}>편향(시간)</th></tr></thead>
              <tbody>{bandit.hoursBias.map((r) => <tr key={r.id} className="border-t border-line"><td className="px-2 py-2 font-medium">{r.id}</td><td className={td}>{r.estimate.toFixed(3)}</td><td className={td}>{r.target.toFixed(3)}</td><td className={td}>{sgn(r.bias, 3)}</td></tr>)}</tbody>
            </table>
            <h5 className="mb-1 text-xs font-semibold text-ink2">28일 리텐션: 실험 종료 {bandit.retention.feedbackLagDays}일 뒤({bandit.retention.readDay}일째)에야 알 수 있어요</h5>
            <table className="w-full min-w-[480px] text-sm">
              <thead><tr><th className={thl}>랭커</th><th className={th}>보이는 효과: 밴딧(%p)</th><th className={th}>균등 배정(%p)</th><th className={th}>배정 멤버: 밴딧</th><th className={th}>균등</th></tr></thead>
              <tbody>
                {bandit.retention.rows.map((r, i) => (
                  <tr key={r.id} className="border-t border-line"><td className="px-2 py-2 font-medium">{r.id}</td><td className={td}>{r.banditPp.toFixed(3)}</td><td className={td}>{r.uniformPp.toFixed(3)}</td><td className={td}>{fmtInt(bandit.retention.members[i].bandit)}</td><td className={td}>{fmtInt(bandit.retention.members[i].uniform)}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-sm tabular-nums">{bandit.retention.referenceNote}: 밴딧 검정력 <b>{fmtPct(bandit.retention.powerBandit, 0)}</b> vs 균등 <b>{fmtPct(bandit.retention.powerUniform, 0)}</b></p>
          </PanelSection>
        </>
      )}
    </div>
  );
}

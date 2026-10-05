import type { ReactNode } from "react";
import { fmtDiff, fmtInt, fmtP, fmtValue } from "@/components/readout/format";
import { Badge } from "@/components/ui";

type Stat = { n: number; x?: number; mean?: number; sd?: number };
type Cmp = { arms: { A: Stat; B: Stat }; d?: number; ci?: [number, number]; rel?: number; p?: number; significant?: boolean };
type M = { key: string; type: "prop" | "mean" };

const LABEL: Record<string, string> = { abandon: "이탈률", conv: "주문전환율", aov: "평균주문금액", near_min_share: "최소금액 근처 주문 비중", gmv: "인당 거래액" };
const TYPE_LABEL: Record<string, string> = { general: "일반", first_order: "첫 주문 혜택", member: "멤버십" };
const OS_LABEL: Record<string, string> = { android: "안드로이드", ios_new: "iOS 신버전", ios_old: "iOS 구버전" };

const metricOf = (key: string): M => ({ key, type: key === "aov" || key === "gmv" ? "mean" : "prop" });

function Section({ title, hint, open, children }: { title: string; hint?: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="rounded-2xl border border-line bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
      {hint && <p className="mt-1 text-xs text-ink3">{hint}</p>}
      <div className="mt-3 overflow-x-auto">{children}</div>
    </details>
  );
}

function CmpCell({ m, c }: { m: M; c: Cmp }) {
  return (
    <td className="px-2 py-2 text-right tabular-nums">
      <div className="text-xs text-ink3">{fmtValue(m, c.arms.A)} → {fmtValue(m, c.arms.B)}</div>
      {c.d !== undefined && (
        <div>
          <b>{fmtDiff(m, c.d)}</b> <span className="text-xs text-ink3">p {fmtP(c.p ?? 1)}</span>{" "}
          {c.significant && <Badge tone="run">유의</Badge>}
        </div>
      )}
    </td>
  );
}

const th = "px-2 py-2 text-right text-xs font-medium text-ink3";

/** 배민 사례 전용 패널: 주차별, 고객 유형별, OS별 사용자 수, 트리거 비교 (phase 별로 있는 것만 렌더링) */
export function BaeminPanels({ phase, panels }: { phase: string; panels: Record<string, unknown> }) {
  const weekly = panels.weekly as { week: number; bShare: number; conv: Cmp; [k: string]: unknown }[] | undefined;
  const segments = panels.segments as Record<string, Record<string, Cmp>> | undefined;
  const byOs = panels.byOs as Record<string, Record<string, { users: number; crash: number }>> | undefined;
  const trigger = panels.trigger as { biased?: { conv: Cmp; aov: Cmp }; counterfactual?: { conv: Cmp; aov: Cmp; n: { A: number; B: number } } } | undefined;
  const sim = phase.slice(0, 2);

  return (
    <div className="space-y-3">
      {trigger && (
        <Section open title="트리거 사용자 비교" hint="업셀링 문구 노출 조건(고허들 쿠폰 보유 + 최소금액 달성)을 채운 사용자에 한정한 분석이에요.">
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr><th className="px-2 py-2 text-left text-xs font-medium text-ink3">비교</th><th className={th}>주문전환율 (왼쪽 → 오른쪽)</th><th className={th}>평균주문금액</th></tr></thead>
            <tbody>
              {trigger.counterfactual && (
                <tr className="border-t border-line">
                  <td className="px-2 py-2">대조군에서 같은 조건을 채웠을 사용자 → B 에서 문구를 본 사용자 <span className="text-xs text-ink3">({fmtInt(trigger.counterfactual.n.A)}명 · {fmtInt(trigger.counterfactual.n.B)}명)</span></td>
                  <CmpCell m={metricOf("conv")} c={trigger.counterfactual.conv} />
                  <CmpCell m={metricOf("aov")} c={trigger.counterfactual.aov} />
                </tr>
              )}
              {trigger.biased && (
                <tr className="border-t border-line">
                  <td className="px-2 py-2">B 에서 문구를 못 본 사용자 → B 에서 문구를 본 사용자</td>
                  <CmpCell m={metricOf("conv")} c={trigger.biased.conv} />
                  <CmpCell m={metricOf("aov")} c={trigger.biased.aov} />
                </tr>
              )}
            </tbody>
          </table>
        </Section>
      )}

      {segments && (
        <Section open={sim === "p2"} title="고객 유형별 결과" hint="같은 지표를 고객 유형으로 나눠서 본 표예요. (A → B)">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr><th className="px-2 py-2 text-left text-xs font-medium text-ink3">고객 유형</th>{Object.keys(LABEL).filter((k) => k !== "gmv").map((k) => <th key={k} className={th}>{LABEL[k]}</th>)}</tr></thead>
            <tbody>
              {Object.entries(segments).map(([type, ms]) => (
                <tr key={type} className="border-t border-line">
                  <td className="px-2 py-2 font-medium">{TYPE_LABEL[type] ?? type}</td>
                  {["abandon", "conv", "aov", "near_min_share"].map((k) => <CmpCell key={k} m={metricOf(k)} c={ms[k]} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {byOs && (
        <Section open={sim === "p2"} title="OS별 사용자 수와 크래시" hint="그룹별로 집계된 사용자 수와 크래시 수예요.">
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr><th className="px-2 py-2 text-left text-xs font-medium text-ink3">OS</th>{Object.keys(Object.values(byOs)[0]).map((a) => <th key={a} className={th}>{a} 사용자 수</th>)}{Object.keys(Object.values(byOs)[0]).map((a) => <th key={`c${a}`} className={th}>{a} 크래시</th>)}</tr></thead>
            <tbody>
              {Object.entries(byOs).map(([os, arms]) => (
                <tr key={os} className="border-t border-line">
                  <td className="px-2 py-2 font-medium">{OS_LABEL[os] ?? os}</td>
                  {Object.values(arms).map((g, i) => <td key={i} className="px-2 py-2 text-right tabular-nums">{fmtInt(g.users)}</td>)}
                  {Object.values(arms).map((g, i) => <td key={`c${i}`} className="px-2 py-2 text-right tabular-nums">{fmtInt(g.crash)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {weekly && weekly.length > 1 && (
        <Section title="주차별 결과" hint="실험 기간을 1주 단위로 나눠서 본 주문전환율이에요. (A → B)">
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr><th className="px-2 py-2 text-left text-xs font-medium text-ink3">주차</th><th className={th}>B 배정 비중</th><th className={th}>주문전환율</th></tr></thead>
            <tbody>
              {weekly.map((w) => (
                <tr key={w.week} className="border-t border-line">
                  <td className="px-2 py-2 font-medium">{w.week}주차</td>
                  <td className="px-2 py-2 text-right tabular-nums">{(w.bShare * 100).toFixed(0)}%</td>
                  <CmpCell m={metricOf("conv")} c={w.conv} />
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}

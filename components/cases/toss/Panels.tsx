import { fmtDiff, fmtP, fmtPct, fmtRel } from "@/components/readout/format";
import { PanelSection } from "@/components/readout/PanelSection";
import { Badge } from "@/components/ui";

type Ci = [number, number];
type Row = { d: number; ci: Ci; p: number; significant: boolean };
type MT = { key: string; type: "prop" | "mean" | "ratio" };
const KEY_TYPE: Record<string, MT["type"]> = { push_ctr: "ratio", clicks_per_user: "mean", app_open_au: "prop", sends_per_user: "mean" };
const mt = (key: string, type?: MT["type"]): MT => ({ key, type: type ?? KEY_TYPE[key] ?? "prop" });

const th = "px-2 py-2 text-right text-xs font-medium text-ink3";
const thl = "px-2 py-2 text-left text-xs font-medium text-ink3";
const SEG_LABEL: Record<string, string> = { heavy: "헤비", medium: "미디엄", light: "라이트" };
const armName = (a: string) => (a === "B" ? "V1" : a === "C" ? "V2" : a);

function Sig({ s }: { s: boolean }) {
  return <Badge tone={s ? "run" : "draft"}>{s ? "유의" : "유의하지 않음"}</Badge>;
}

function DiffCell({ m, r }: { m: MT; r: Row }) {
  return (
    <td className="px-2 py-2 text-right tabular-nums">
      <b>{fmtDiff(m, r.d)}</b> <span className="text-xs text-ink3">p {fmtP(r.p)}</span> <Sig s={r.significant} />
    </td>
  );
}

/** 토스 사례 전용 패널: 구성 효과 분해, 리플레이 vs 온라인, 비열등성, V1 vs V2, 서비스별 AU, 라이트 AU, HTE, 서비스 담당자 이벤트 */
export function TossPanels({ panels }: { phase: string; panels: Record<string, unknown> }) {
  const composition = panels.composition as
    | { active: false; hint: string }
    | { active: true; rows: { arm: string; name: string; ctrA: number; ctrV: number; ctrChange: number; composition: number; behavior: number; sendsChangeRel: number; clicksChangeRel: number }[] }
    | undefined;
  const gap = panels.replay_gap as { rows: { arm: string; name: string; offlineClickLossRel: number; onlineClicksRel: number }[] } | undefined;
  const ni = panels.non_inferiority as { rows: { metric: string; label: string; arm: string; d: number; margin: number; marginPct: number; lowerBound: number; passed: boolean; type: MT["type"] }[]; hint?: string } | undefined;
  const h2h = panels.v1_vs_v2 as { rows: (Row & { metric: string; label: string; type: MT["type"] })[]; note: string } | undefined;
  const services = panels.services as
    | { tests: number; correction: string; significant: number; rows: { id: string; lowFreq: boolean; A: { n: number; x: number }; arms: Record<string, Row & { n: number; x: number }> }[] }
    | undefined;
  const lightAu = panels.light_au as Record<string, { vA: number; vB: number } & Row> | undefined;
  const hte = panels.hte as { rows: { seg: string; label: string; arms: Record<string, Record<string, { vA: number; vB: number } & Row & { type: MT["type"] }>> }[] } | undefined;
  const event = panels.event as { title: string; text: string; response: string } | undefined;

  return (
    <div className="space-y-3">
      {event && (
        <section role="alert" className="rounded-2xl border border-warn bg-warn-soft p-4 text-sm">
          <h4 className="font-semibold text-warn">{event.title}</h4>
          <p className="mt-1">{event.text}</p>
          {event.response && <p className="mt-2 text-ink2"><b>제출한 대응안</b>: {event.response}</p>}
        </section>
      )}

      {composition && (
        <PanelSection open title="CTR 변화 분해: 구성 효과 + 행동 효과" hint="CTR 이 오른 것이 사람들이 더 눌러서인지, 덜 보내서(분모가 줄어서)인지 나눠 봐요. 구성 효과는 억제된 푸시의 과거 클릭만 빼고 남은 푸시의 반응은 그대로라고 가정한 값이에요.">
          {composition.active ? (
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr><th className={thl}>변이안</th><th className={th}>CTR 변화</th><th className={th}>구성 효과(덜 보내서)</th><th className={th}>행동 효과(남은 푸시 반응)</th><th className={th}>발송 수 변화</th><th className={th}>인당 클릭 수 변화</th></tr>
              </thead>
              <tbody>
                {composition.rows.map((r) => (
                  <tr key={r.arm} className="border-t border-line tabular-nums">
                    <td className="px-2 py-2 font-medium">{r.name}</td>
                    <td className="px-2 py-2 text-right"><b>{fmtDiff(mt("push_ctr"), r.ctrChange)}</b></td>
                    <td className="px-2 py-2 text-right">{fmtDiff(mt("push_ctr"), r.composition)}</td>
                    <td className="px-2 py-2 text-right">{fmtDiff(mt("push_ctr"), r.behavior)}</td>
                    <td className="px-2 py-2 text-right">{fmtRel(r.sendsChangeRel)}</td>
                    <td className="px-2 py-2 text-right">{fmtRel(r.clicksChangeRel)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-ink2">{composition.hint}</p>
          )}
        </PanelSection>
      )}

      {gap && (
        <PanelSection title="오프라인 리플레이 vs 온라인 실험: 클릭 변화" hint="설계 화면의 리플레이가 예측한 클릭 손실과 실제 실험에서 관찰한 인당 클릭 변화를 비교해요.">
          <table className="w-full min-w-[420px] text-sm">
            <thead><tr><th className={thl}>변이안</th><th className={th}>오프라인 클릭 손실 추정</th><th className={th}>온라인 인당 클릭 변화</th></tr></thead>
            <tbody>
              {gap.rows.map((r) => (
                <tr key={r.arm} className="border-t border-line tabular-nums">
                  <td className="px-2 py-2 font-medium">{r.name}</td>
                  <td className="px-2 py-2 text-right">{fmtRel(r.offlineClickLossRel)}</td>
                  <td className="px-2 py-2 text-right">{fmtRel(r.onlineClicksRel)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PanelSection>
      )}

      {ni && (
        <PanelSection open={ni.rows.length > 0} title="비열등성 검정" hint="허용하는 손실(마진)보다 나빠지지 않았는지 단측으로 확인해요. 신뢰구간의 하한이 마진보다 크면 통과예요.">
          {ni.rows.length === 0 ? (
            <p className="text-sm text-ink2">{ni.hint}</p>
          ) : (
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr><th className={thl}>지표</th><th className={thl}>변이안</th><th className={th}>차이</th><th className={th}>마진 ({ni.rows[0].marginPct}%)</th><th className={th}>단측 하한</th><th className={th}>결과</th></tr></thead>
              <tbody>
                {ni.rows.map((r) => (
                  <tr key={`${r.metric}${r.arm}`} className="border-t border-line tabular-nums">
                    <td className="px-2 py-2">{r.label}</td>
                    <td className="px-2 py-2 font-medium">{armName(r.arm)}</td>
                    <td className="px-2 py-2 text-right">{fmtDiff(mt(r.metric, r.type), r.d)}</td>
                    <td className="px-2 py-2 text-right">{fmtDiff(mt(r.metric, r.type), r.margin)}</td>
                    <td className="px-2 py-2 text-right">{fmtDiff(mt(r.metric, r.type), r.lowerBound)}</td>
                    <td className="px-2 py-2 text-right"><Badge tone={r.passed ? "done" : "bad"}>{r.passed ? "통과" : "통과하지 못함"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PanelSection>
      )}

      {h2h && (
        <PanelSection title="V1 vs V2 직접 비교" hint={h2h.note}>
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr><th className={thl}>지표</th><th className={th}>V2 − V1 (95% 신뢰구간)</th></tr></thead>
            <tbody>
              {h2h.rows.map((r) => (
                <tr key={r.metric} className="border-t border-line">
                  <td className="px-2 py-2">{r.label}</td>
                  <td className="px-2 py-2 text-right tabular-nums"><b>{fmtDiff(mt(r.metric, r.type), r.d)}</b> <span className="text-xs text-ink3">[{fmtDiff(mt(r.metric, r.type), r.ci[0])} ~ {fmtDiff(mt(r.metric, r.type), r.ci[1])}] p {fmtP(r.p)}</span> <Sig s={r.significant} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </PanelSection>
      )}

      {lightAu && (
        <PanelSection title="라이트 사용자 앱 오픈 AU (마지막 주)" hint="푸시를 가장 적게 받는 사용자 집단의 앱 오픈 비율이에요. 대조군(A) 대비 차이예요.">
          <table className="w-full min-w-[420px] text-sm">
            <thead><tr><th className={thl}>변이안</th><th className={th}>A → 변이안</th><th className={th}>차이</th></tr></thead>
            <tbody>
              {Object.entries(lightAu).map(([arm, r]) => (
                <tr key={arm} className="border-t border-line tabular-nums">
                  <td className="px-2 py-2 font-medium">{armName(arm)}</td>
                  <td className="px-2 py-2 text-right text-xs text-ink3">{fmtPct(r.vA, 2)} → {fmtPct(r.vB, 2)}</td>
                  <DiffCell m={mt("app_open_au")} r={r} />
                </tr>
              ))}
            </tbody>
          </table>
        </PanelSection>
      )}

      {services && (
        <PanelSection open title={`서비스별 앱 오픈 AU (${services.tests}개 검정)`} hint={`12개 서비스를 각 변이안과 대조군으로 비교해요. S10~S12 는 저빈도 서비스예요. 다중검정 보정: ${services.correction === "none" ? "없음" : services.correction === "bh" ? "BH" : "Bonferroni"} · 유의한 검정 ${services.significant}개 · 표의 p 는 보정 전 값이고 \"유의\" 표시는 보정 후 기준이에요`}>
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr><th className={thl}>서비스</th><th className={th}>A AU</th>{Object.keys(services.rows[0].arms).map((a) => <th key={a} className={th}>{armName(a)} − A</th>)}</tr>
            </thead>
            <tbody>
              {services.rows.map((s) => (
                <tr key={s.id} className="border-t border-line tabular-nums">
                  <td className="px-2 py-2 font-medium">{s.id}{s.lowFreq && <span className="ml-1 text-xs text-ink3">저빈도</span>}</td>
                  <td className="px-2 py-2 text-right">{fmtPct(s.A.x / s.A.n, 2)}</td>
                  {Object.entries(s.arms).map(([a, r]) => <DiffCell key={a} m={mt("app_open_au")} r={r} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </PanelSection>
      )}

      {hte && (
        <PanelSection open title="이질적 처치 효과 (HTE): 활동성 세그먼트별" hint="세그먼트마다 대조군(A)과 비교한 차이예요. 앱 오픈 AU 는 마지막 주 기준이에요.">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr><th className={thl}>세그먼트</th><th className={thl}>변이안</th><th className={th}>푸시 CTR</th><th className={th}>인당 주간 클릭 수</th><th className={th}>앱 오픈 AU</th></tr>
            </thead>
            <tbody>
              {hte.rows.flatMap((s) =>
                Object.entries(s.arms).map(([a, m]) => (
                  <tr key={`${s.seg}${a}`} className="border-t border-line tabular-nums">
                    <td className="px-2 py-2 font-medium">{SEG_LABEL[s.seg] ?? s.label}</td>
                    <td className="px-2 py-2">{armName(a)}</td>
                    <DiffCell m={mt("push_ctr")} r={m.push_ctr} />
                    <DiffCell m={mt("clicks_per_user")} r={m.clicks_per_user} />
                    <DiffCell m={mt("app_open_au")} r={m.app_open_au} />
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </PanelSection>
      )}
    </div>
  );
}

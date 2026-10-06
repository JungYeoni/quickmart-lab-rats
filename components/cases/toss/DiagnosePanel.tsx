import { fmtPct } from "@/components/readout/format";
import { Card } from "@/components/ui";
import { IMPORTANCE, POOLED_BINS, PURPOSES, STRATA } from "@/lib/cases/toss/diagnose";

/** s1_diagnose: 푸시 관찰 데이터(EDA). "많이 받을수록 CTR 이 낮다"를 그대로 믿어도 되는지가 질문이다. */
export function TossDiagnosePanel() {
  const W = 420, H = 180, L = 44, R = 12, T = 10, B = 28;
  const maxX = 22;
  const lo = 0.07, hi = 0.17;
  const x = (v: number) => L + (v / maxX) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  return (
    <div className="space-y-3">
      <Card className="!p-4 text-sm">
        <h4 className="mb-1 font-semibold">상황</h4>
        <p className="text-ink2">
          가입자 2,900만 명, 서비스 100개 이상으로 푸시 발송량이 늘면서 전사 푸시 CTR 이 조금씩 떨어지고 있어요.
          “푸시를 많이 받을수록 CTR 이 낮다”는 이야기가 있고, <b>무반응 푸시를 쉬게 하는 디타게팅</b>을 고민 중이에요. 아래는 대조군의 과거 <b>관찰 데이터</b>예요.
        </p>
      </Card>

      <Card className="!p-4">
        <h4 className="mb-2 text-sm font-semibold">주간 수신량 구간별 CTR (전체를 합친 값)</h4>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-lg" role="img" aria-label="주간 수신량과 CTR 산점도">
          {[0.08, 0.12, 0.16].map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
              <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--ink3)">{fmtPct(v, 0)}</text>
            </g>
          ))}
          {POOLED_BINS.map((p) => (
            <g key={p.label}>
              <circle cx={x(p.mid)} cy={y(p.ctr)} r={6} fill="var(--blue)" />
              <text x={x(p.mid)} y={y(p.ctr) - 10} textAnchor="middle" fontSize={11} fill="var(--ink2)">{fmtPct(p.ctr, 1)}</text>
              <text x={x(p.mid)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--ink3)">{p.label}</text>
            </g>
          ))}
        </svg>
      </Card>

      <Card className="!p-4">
        <h4 className="mb-2 text-sm font-semibold">활동성 × 목적별 푸시 CTR</h4>
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="text-left text-xs text-ink3">
              <th className="py-1 font-medium">활동성</th><th className="py-1 text-right font-medium">주당 수신</th><th className="py-1 text-right font-medium">프로모션 비중</th>
              {PURPOSES.map((p) => <th key={p.key} className="py-1 text-right font-medium">{p.label} CTR</th>)}
            </tr>
          </thead>
          <tbody>
            {STRATA.map((s) => (
              <tr key={s.key} className="border-t border-line tabular-nums">
                <td className="py-1.5 font-medium">{s.label}</td>
                <td className="py-1.5 text-right">{s.sends}개</td>
                <td className="py-1.5 text-right">{fmtPct(s.promoShare, 0)}</td>
                {s.ctrByPurpose.map((c) => <td key={c.key} className="py-1.5 text-right">{fmtPct(c.ctr, 1)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ink3">같은 활동성·같은 목적 안에서 주당 푸시가 1개 늘어날 때 CTR 은 약 −0.08%p 변해요.</p>
      </Card>

      <Card className="!p-4">
        <h4 className="mb-2 text-sm font-semibold">CTR 을 설명하는 피처 중요도 (SHAP 스타일)</h4>
        <ul className="space-y-1.5">
          {IMPORTANCE.map((f) => (
            <li key={f.feature} className="flex items-center gap-3 text-sm">
              <span className="w-32 text-ink2">{f.feature}</span>
              <span className="h-3 rounded bg-brand" style={{ width: `${f.value * 240}px` }} />
              <span className="tabular-nums text-ink3">{f.value.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </Card>
      <p className="text-xs text-ink3">모든 수치는 교육용 가상 데이터예요. 출처: 토스 기술 블로그 「진짜 A/B 테스트: 토스의 푸시 생태계를 데이터로 재설계한 방법」을 각색한 가상 시나리오.</p>
    </div>
  );
}

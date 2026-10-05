import { fmtPct } from "@/components/readout/format";
import { Card } from "@/components/ui";
import { replay, type Rule } from "@/lib/cases/toss/replay";

type Obj = Record<string, unknown>;
const asRule = (v: unknown): Rule | null => {
  const r = v as Partial<Rule> | undefined;
  return r && r.N && r.W && r.C && r.G ? (r as Rule) : null;
};

/**
 * 설계 화면의 오프라인 리플레이: 과거 로그에 규칙을 적용해 보는 시뮬레이션이에요.
 * 억제된 푸시의 과거 클릭을 전부 잃는다고 가정하기 때문에, 클릭 손실이 실제 실험보다 크게 나올 수 있어요.
 */
export function TossDesignAside({ phase, value }: { phase: string; value: Obj }) {
  if (phase !== "p1") return null;
  const v = (value.variants ?? {}) as Obj;
  const rows = (["V1", "V2"] as const).map((k) => ({ k, rule: asRule(v[k]) }));
  return (
    <Card className="!p-4">
      <h4 className="mb-1 text-sm font-semibold">오프라인 리플레이 (과거 로그에 규칙을 적용한 결과)</h4>
      <p className="mb-3 text-xs text-ink3">변이안의 N·W·C·G 를 모두 고르면 보여줘요. 오프라인에서는 억제된 푸시의 과거 클릭을 전부 잃는다고 가정해요.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs text-ink3">
              <th className="py-1 font-medium">변이안</th><th className="py-1 text-right font-medium">발송 감소율</th>
              <th className="py-1 text-right font-medium">오프라인 클릭 손실 추정</th><th className="py-1 text-right font-medium">오프라인 예상 CTR</th>
              <th className="py-1 text-right font-medium">헤비 · 미디엄 · 라이트 억제율</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ k, rule }) => {
              const r = rule ? replay(rule) : null;
              return (
                <tr key={k} className="border-t border-line tabular-nums">
                  <td className="py-1.5 font-medium">{k}</td>
                  {r ? (
                    <>
                      <td className="py-1.5 text-right">{fmtPct(r.s, 1)}</td>
                      <td className="py-1.5 text-right">−{fmtPct(r.clickLossOffline, 1)}</td>
                      <td className="py-1.5 text-right">{fmtPct(r.ctrOffline, 1)}</td>
                      <td className="py-1.5 text-right">{r.bySegment.map((s) => fmtPct(s.s, 0)).join(" · ")}</td>
                    </>
                  ) : (
                    <td colSpan={4} className="py-1.5 text-ink3">N·W·C·G 를 모두 골라주세요</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

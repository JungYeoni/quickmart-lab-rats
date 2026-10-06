import { Card } from "@/components/ui";
import { OFFLINE_NDCG, ORIGINAL_FACTS } from "@/lib/cases/netflix/content";

/** s1_diagnose: 오프라인 평가 결과(NDCG). "오프라인 1등을 바로 출시해도 될까?"가 질문이다. */
export function NetflixDiagnosePanel() {
  const lo = 0.78, hi = 0.85;
  return (
    <div className="space-y-3">
      <Card className="!p-4 text-sm">
        <h4 className="mb-1 font-semibold">상황</h4>
        <p className="text-ink2">
          가상 OTT <b>플릭스</b>의 추천 팀에는 새 랭킹 후보 R1~R8이 있고, 현행 랭커는 R0예요. 후보마다 과거 시청 로그로 오프라인 평가(NDCG)를 해 봤어요.
          후보를 전부 실서비스에서 실험하기에는 시간과 트래픽이 모자라요. 오프라인 1등을 바로 출시해도 될까요?
        </p>
      </Card>
      <Card className="!p-4">
        <h4 className="mb-2 text-sm font-semibold">오프라인 평가 (NDCG@10, 높을수록 좋아요)</h4>
        <table className="w-full max-w-lg text-sm">
          <thead>
            <tr className="text-xs text-ink3"><th className="px-2 py-1 text-left font-medium">순위</th><th className="px-2 py-1 text-left font-medium">후보</th><th className="px-2 py-1 text-right font-medium">NDCG</th><th className="w-1/2 px-2 py-1" /></tr>
          </thead>
          <tbody>
            {OFFLINE_NDCG.map((r) => (
              <tr key={r.id} className="border-t border-line tabular-nums">
                <td className="px-2 py-1.5">{r.rank}위</td>
                <td className="px-2 py-1.5 font-medium">{r.id}</td>
                <td className="px-2 py-1.5 text-right">{r.ndcg.toFixed(3)}</td>
                <td className="px-2 py-1.5"><div className="h-2 rounded bg-brand-soft"><div className="h-2 rounded bg-brand" style={{ width: `${((r.ndcg - lo) / (hi - lo)) * 100}%` }} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="!p-4 text-sm">
        <h4 className="mb-1 font-semibold">원문에서 확인된 사실 (Netflix 기술 블로그)</h4>
        <ul className="list-disc space-y-1 pl-5 text-ink2">
          {ORIGINAL_FACTS.map((f) => <li key={f}>{f}</li>)}
        </ul>
      </Card>
      <p className="text-xs text-ink3">
        모든 수치(후보 수, 오프라인 점수, 효과 크기, 표본)는 교육용 가상 데이터예요. 출처: Netflix Technology Blog 「Innovating Faster on Personalization Algorithms at Netflix Using Interleaving」(2017)을 각색한 가상 시나리오.
      </p>
    </div>
  );
}

import { Card } from "@/components/ui";
import { FIREBASE_FACTS } from "@/lib/cases/daangn/content";

/** s1_diagnose: 실험 문서(템플릿) 작성 안내. 사례 상황과 원문에서 확인된 사실을 보여준다. */
export function DaangnDiagnosePanel() {
  return (
    <div className="space-y-3">
      <Card className="!p-4 text-sm">
        <h4 className="mb-1 font-semibold">상황</h4>
        <p className="text-ink2">
          거래가 끝나면 상대가 남긴 후기를 푸시로 알려줘요. 후기를 받은 사용자도 <b>답례 후기</b>를 남기도록 유도하는 <b>새 후기 화면</b>을 실험하려고 해요.
          후기를 받은 사용자를 무작위로 반씩 나눠 실험군에 새 화면을 보여주고 후기 작성 여부를 비교해요. 먼저 <b>실험 문서</b>부터 써요.
        </p>
      </Card>
      <Card className="!p-4 text-sm">
        <h4 className="mb-1 font-semibold">지금 쓰는 실험 플랫폼 (외부 플랫폼 F)</h4>
        <p className="mb-2 text-ink2">원문에서 확인된 외부 플랫폼(Firebase A/B)의 문제예요.</p>
        <ul className="list-disc space-y-1 pl-5 text-ink2">
          {FIREBASE_FACTS.map((f) => <li key={f}>{f}</li>)}
        </ul>
      </Card>
      <p className="text-xs text-ink3">
        모든 수치는 교육용 가상 데이터예요. 출처: 당근 팀 블로그 「1주 1개 실험하는 프로덕트 팀이 되는 여정」(2022.03.21)을 각색한 가상 시나리오. 원문은 외부 플랫폼으로 Firebase A/B 를 썼고, 화면에서는 &ldquo;외부 플랫폼 F&rdquo;로 부르고 있어요.
      </p>
    </div>
  );
}

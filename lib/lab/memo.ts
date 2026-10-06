/** s8 결정 메모: 조가 지금까지 제출한 결정을 발표용 요약으로 모은다 (클라이언트·서버 공용, 숨김 정보 없음). */
import type { ClientCase } from "../cases/types";
import { latestOf, simPhaseOf, type Submission } from "./phase";

export function buildMemoDoc(client: ClientCase, subs: Submission[]): string {
  const lines = client.phases
    .filter((p) => p.kind === "decide")
    .flatMap((def) => {
      const sim = simPhaseOf(def.key);
      const s = latestOf(subs, sim, "decision");
      if (!s) return [];
      const label = client.decisions[sim]?.options.find((o) => o.id === s.payload.option)?.label ?? String(s.payload.option ?? "");
      return [`${def.title}\n  결정: ${label}\n  근거: ${String(s.payload.rationale ?? "")}`];
    });
  const memo = latestOf(subs, "memo", "note");
  const tail = memo ? [`\n가장 많이 배운 실험: ${String(memo.payload.learned ?? "")}\n다른 조에게 전할 한 가지: ${String(memo.payload.lesson ?? "")}`] : [];
  return [`[${client.meta.company} ${client.meta.title} 실험 결정 요약]`, "", ...(lines.length ? lines : ["아직 제출한 결정이 없어요."]), ...tail].join("\n");
}

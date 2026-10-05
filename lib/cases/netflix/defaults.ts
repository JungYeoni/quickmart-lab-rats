/**
 * 폼 초기값. 성패를 가르는 선택(방식, 귀속, 보정, 윈저라이징, CUPED 등)은 비워 두어 조가 직접 고르게 한다.
 * 숫자 칸만 합리적인 시작값을 넣어 둔다.
 */
type Obj = Record<string, unknown>;

export function defaultDesign(phase: string, prev?: Obj): Obj {
  const sim = phase.slice(0, 2);
  if (phase === "diagnose") return { reason: "", offline_online_risks: [] };
  if (sim === "p1") return { phase: "p1", candidates: [], abn_fraction: 0.1, abn_weeks: 2, il_members_per_pair: 10000, il_days: 7, advance_rule: "", ...(prev && prev.phase === "p1" ? prev : {}) };
  if (sim === "p2") return { phase: "p2", finalists: [], fraction: 0.1, weeks: 4, ...(prev && prev.phase === "p2" ? prev : {}) };
  return { phase: "p3", rationale: "", ...(prev && prev.phase === "p3" ? prev : {}) };
}

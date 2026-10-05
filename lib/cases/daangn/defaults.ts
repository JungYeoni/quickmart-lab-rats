/**
 * 폼 초기값. 성패를 가르는 선택(배정 시점, 분석 모집단, 데이터 소스, 지표 정의, A/A 여부, 배정 키, salt, 배정 단위, SE 방식 등)은
 * 비워 두어 조가 직접 고르게 한다. 재실험(p2)은 s2 에서 제출한 거래후기 설계를 이어받는다.
 */
type Obj = Record<string, unknown>;

const reviewBase = (): Obj => ({ guardrails: [], alpha: 0.05, power: 0.8, mde_pp: 2, duration_days: 14, aa_days: 7 });

export function defaultDesign(phase: string, prev?: Obj): Obj {
  const sim = phase.slice(0, 2);
  if (phase === "diagnose") return { background: "", problem: "", hypothesis: { action: "", behavior: "", impact: "" }, success_criteria: "", risks: "", owner: "" };
  if (sim === "p1") return { phase: "p1", ...reviewBase(), ...(prev && prev.phase === "p1" ? prev : {}) };
  if (sim === "p2") {
    const inherit = prev && prev.phase === "p1" ? prev : reviewBase();
    const { data_source, run_aa_first, phase: _phase, ...rest } = inherit;
    void data_source; void run_aa_first; void _phase;
    return { ...rest, phase: "p2" };
  }
  return { phase: "p3", guardrails: [], alpha: 0.05, power: 0.8, mde_pct: 3, duration_days: 14, qualitative_weight: "" };
}

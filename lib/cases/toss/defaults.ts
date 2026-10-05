/**
 * 폼 초기값. 성패를 가르는 선택(메인 지표, 분석 단위, 중간 확인 규칙, 규칙 파라미터, 사전 합의)은 비워 두어 조가 직접 고르게 한다.
 * 확대 실험(p2)은 s2 에서 제출한 설계를 이어받는다. 이어받을 설계가 없으면 변이안을 비워 둔다(시뮬레이션이 안내하며 거부).
 */
type Obj = Record<string, unknown>;

const blankP1 = (): Obj => ({
  phase: "p1",
  hypothesis: { action: "", behavior: "", impact: "" },
  variants: { V1: {}, V2: {} },
  sample_fraction: 0.06,
  duration_weeks: 8,
  hypothesis_type: {},
  guardrails: [],
  secondary: [],
  cuped: false,
  correction: "none",
});

export function defaultDesign(phase: string, prev?: Obj): Obj {
  const sim = phase.slice(0, 2);
  if (phase === "diagnose") return { rationale: "" };
  if (sim === "p1") return { ...blankP1(), ...(prev && prev.phase === "p1" ? prev : {}) };
  const base: Obj = { ...blankP1(), ...(prev && prev.phase === "p1" ? prev : {}) };
  if (!prev || prev.phase !== "p1") delete base.variants;
  return {
    ...base, phase: "p2", arms: ["A", "V1", "V2"], fraction_total: 0.3, duration_weeks: 6, cuped: false, correction: "none", response_to_stakeholders: "",
  };
}

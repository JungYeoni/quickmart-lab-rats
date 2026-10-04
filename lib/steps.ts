export const STEP_KEYS = [
  "s0_pick",
  "s1_diagnose",
  "s2_design",
  "s3_run",
  "s4_readout",
  "s5_deep",
  "s6_final",
  "s7_lab",
  "s8_share",
] as const;
export type StepKey = (typeof STEP_KEYS)[number];

export const STEP_STATUSES = ["locked", "open", "closed"] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

export const STEP_LABELS: Record<StepKey, string> = {
  s0_pick: "사례 선택",
  s1_diagnose: "진단",
  s2_design: "설계",
  s3_run: "실행",
  s4_readout: "결과 읽기",
  s5_deep: "심화",
  s6_final: "최종 결정",
  s7_lab: "함정 연구소",
  s8_share: "직소 공유",
};

export const STATUS_LABELS: Record<StepStatus, string> = {
  locked: "잠김",
  open: "진행 중",
  closed: "마감",
};

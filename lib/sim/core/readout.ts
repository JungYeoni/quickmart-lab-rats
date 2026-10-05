/** Readout 공통 타입 (docs/sim-core.md §3) + 조 화면용 변환 */
import type { Flag } from "./flags";

export type Arm = "A" | "B" | "C" | "D";

export type PeriodRow = {
  period: number | string;
  /** 그룹별 일/주 집계. 사례별 키를 자유롭게 둔다. */
  arms: Partial<Record<Arm, Record<string, number>>>;
};

export type Comparison = {
  vs: Arm;
  arm: Arm;
  d: number;
  ci: [number, number];
  rel: number;
  relCi: [number, number];
  p: number;
  win: number;
  significant: boolean;
  method: string;
};

export type MetricResult = {
  key: string;
  label: string;
  role: "P" | "G" | "S";
  type: "prop" | "mean" | "ratio";
  arms: Partial<Record<Arm, { n: number; x?: number; mean?: number; sd?: number }>>;
  comparisons: Comparison[];
};

export type Readout = {
  caseKey: string;
  phase: string;
  designHash: string;
  periods: PeriodRow[];
  stoppedAt?: number;
  srm?: { counts: number[]; ratios: number[]; p: number };
  metrics: MetricResult[];
  planned?: { nPerArm: number; days: number };
  achievedPower?: number;
  /** 사례 전용 패널. 키가 "_" 로 시작하면 강사·AI 전용(조 화면에 내려보내지 않음). */
  panels: Record<string, unknown>;
  /** 조 화면에는 노출하지 않는다 */
  flags: Flag[];
  costs?: Record<string, number>;
};

/**
 * 조 화면 API 응답용: flags, achievedPower(진짜 효과에서 계산한 값이라 효과 크기를 드러냄), "_" 패널을 제거한 사본.
 * 원본은 바꾸지 않는다.
 */
export type TeamReadout = Omit<Readout, "flags" | "achievedPower">;

export function toTeamView(readout: Readout): TeamReadout {
  const { flags: _flags, achievedPower: _power, panels, ...rest } = readout;
  void _flags;
  void _power;
  const visible = Object.fromEntries(Object.entries(panels).filter(([k]) => !k.startsWith("_")));
  return { ...rest, panels: visible };
}

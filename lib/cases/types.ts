/** 사례 플러그인 인터페이스 (docs/sim-core.md §5) */
import type { ZodType } from "zod";
import type { CaseKey } from "../cases";
import type { StepKey } from "../steps";
import type { Readout } from "../sim/core/readout";

export type PhaseKind = "diagnose" | "design" | "run" | "readout" | "decide";

export type PhaseDef = { key: string; step: StepKey; title: string; kind: PhaseKind };

export type FieldOption = { value: string | number | boolean; label: string; desc?: string };

/** designSchema 와 함께 폼을 자동 렌더링하는 데 쓰는 입력란 메타. 문구는 해요체. */
export type FieldMeta = {
  /** designSchema 안의 점 표기 경로 (예: "scope.os", "metrics.primary") */
  name: string;
  label: string;
  help?: string;
  type: "text" | "textarea" | "number" | "select" | "multiselect" | "boolean";
  options?: FieldOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

export type DecisionOption = { id: string; label: string; desc: string };

export interface CasePlugin<D = unknown> {
  key: CaseKey;
  meta: {
    title: string;
    company: string;
    sourceUrl: string;
    sourceTitle: string;
    difficulty: 1 | 2 | 3 | 4;
    concepts: string[];
  };
  phases: PhaseDef[];
  designSchema: Record<string, ZodType>;
  formMeta: Record<string, FieldMeta[]>;
  /** 설계가 유효하지 않으면 SimulationRejected 를 던진다 */
  simulate(phase: string, design: D, ctx: { prior: Record<string, Readout> }): Readout;
  rubric: Record<string, string>;
  decisions: Record<string, { options: DecisionOption[] }>;
  reveal: Record<string, string>;
}

/** 시뮬레이션을 돌릴 수 없는 설계. 메시지는 조 화면에 그대로 보여준다. */
export class SimulationRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimulationRejected";
  }
}

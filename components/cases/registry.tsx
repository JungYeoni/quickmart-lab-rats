import type { ComponentType } from "react";
import type { CaseKey } from "@/lib/cases";
import { BaeminDiagnosePanel } from "./baemin/DiagnosePanel";
import { BaeminPanels } from "./baemin/Panels";

/** 사례 전용 화면 조각. 공통 컴포넌트(StepView, ReadoutView)는 이 레지스트리를 통해서만 사례 로직에 닿는다. */
export type CaseUi = {
  Diagnose?: ComponentType;
  Panels?: ComponentType<{ phase: string; panels: Record<string, unknown> }>;
};

const CASE_UI: Partial<Record<CaseKey, CaseUi>> = {
  baemin: { Diagnose: BaeminDiagnosePanel, Panels: BaeminPanels },
};

export const getCaseUi = (key: string): CaseUi => CASE_UI[key as CaseKey] ?? {};

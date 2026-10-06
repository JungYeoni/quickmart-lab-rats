import type { ComponentType } from "react";
import type { ArmLabels } from "@/components/readout/format";
import type { Series } from "@/components/readout/TimeSeries";
import type { CaseKey } from "@/lib/cases";
import { BaeminDiagnosePanel } from "./baemin/DiagnosePanel";
import { BaeminPanels } from "./baemin/Panels";
import { DaangnDiagnosePanel } from "./daangn/DiagnosePanel";
import { DaangnPanels } from "./daangn/Panels";
import { daangnSeries } from "./daangn/series";
import { NetflixDiagnosePanel } from "./netflix/DiagnosePanel";
import { NetflixPanels } from "./netflix/Panels";
import { netflixSeries } from "./netflix/series";
import { netflixArmLabels } from "./netflix/armLabels";
import { baeminSeries } from "./baemin/series";
import { TossDesignAside } from "./toss/DesignAside";
import { TossDiagnosePanel } from "./toss/DiagnosePanel";
import { TossPanels } from "./toss/Panels";
import { tossSeries } from "./toss/series";

/** 사례 전용 화면 조각. 공통 컴포넌트(StepView, ReadoutView)는 이 레지스트리를 통해서만 사례 로직에 닿는다. */
export type CaseUi = {
  Diagnose?: ComponentType;
  /** 설계 폼 옆에 보여줄 것(예: 토스의 오프라인 리플레이). 지금 입력 중인 값을 받는다. */
  DesignAside?: ComponentType<{ phase: string; value: Record<string, unknown> }>;
  Panels?: ComponentType<{ phase: string; panels: Record<string, unknown> }>;
  series?: Series[];
  /** 기간 단위 (기본 "일") */
  periodUnit?: string;
  armLabels?: ArmLabels;
  /** 결과마다 그룹 이름이 달라지는 사례(예: 넷플릭스 결선 후보)가 패널에서 라벨을 뽑는다. armLabels 위에 덮어쓴다. */
  armLabelsOf?: (panels: Record<string, unknown>) => ArmLabels;
};

const CASE_UI: Partial<Record<CaseKey, CaseUi>> = {
  baemin: { Diagnose: BaeminDiagnosePanel, Panels: BaeminPanels, series: baeminSeries },
  daangn: { Diagnose: DaangnDiagnosePanel, Panels: DaangnPanels, series: daangnSeries, armLabels: { A: "A (대조군)", B: "B (실험군)" } },
  netflix: { Diagnose: NetflixDiagnosePanel, Panels: NetflixPanels, series: netflixSeries, periodUnit: "주", armLabels: { A: "A (현행 R0)" }, armLabelsOf: netflixArmLabels },
  toss: {
    Diagnose: TossDiagnosePanel, DesignAside: TossDesignAside, Panels: TossPanels, series: tossSeries, periodUnit: "주",
    armLabels: { A: "A (대조군)", B: "V1", C: "V2" },
  },
};

export const getCaseUi = (key: string): CaseUi => CASE_UI[key as CaseKey] ?? {};

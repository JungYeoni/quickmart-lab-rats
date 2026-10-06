import type { CasePlugin, PhaseDef } from "../types";
import { SimulationRejected } from "../types";
import { formMeta } from "./formMeta";
import { decisions, reveal, rubric } from "./rubric";
import { diagnoseSchema, p1Schema, p2Schema, p3Schema, p4Schema, type Design } from "./schema";
import { simulateBaemin } from "./simulate";

const phases: PhaseDef[] = [
  { key: "diagnose", step: "s1_diagnose", title: "이탈 퍼널 진단", kind: "diagnose" },
  { key: "p1", step: "s2_design", title: "P1 설계", kind: "design" },
  { key: "p1_run", step: "s3_run", title: "P1 실행 (A/A → 본 실험)", kind: "run" },
  { key: "p1_readout", step: "s4_readout", title: "P1 결과", kind: "readout" },
  { key: "p1_decide", step: "s4_readout", title: "P1 결정", kind: "decide" },
  { key: "p2", step: "s5_deep", title: "P2 확대 설계", kind: "design" },
  { key: "p2_readout", step: "s5_deep", title: "P2 결과", kind: "readout" },
  { key: "p2_decide", step: "s5_deep", title: "P2 결정", kind: "decide" },
  { key: "p3", step: "s5_deep", title: "P3 혜택 넛지 설계", kind: "design" },
  { key: "p3_readout", step: "s5_deep", title: "P3 결과", kind: "readout" },
  { key: "p3_decide", step: "s5_deep", title: "P3 결정", kind: "decide" },
  { key: "p4", step: "s6_final", title: "P4 부족 금액 추천 설계", kind: "design" },
  { key: "p4_readout", step: "s6_final", title: "P4 결과", kind: "readout" },
  { key: "p4_decide", step: "s6_final", title: "P4 결정", kind: "decide" },
];

export const baeminPlugin: CasePlugin<Design> = {
  key: "baemin",
  meta: {
    title: "최소주문금액바 4번의 A/B 실험",
    company: "우아한형제들",
    sourceUrl: "https://techblog.woowahan.com/26379/",
    sourceTitle: "한 번 성공하니 다음도 쉬울 줄 알았다: 최소주문금액바 4번의 A/B실험",
    difficulty: 2,
    concepts: [
      "가설(ABI)", "OEC·가드레일·보조 지표", "실험 단위", "범위와 외적 타당성", "표본·MDE·기간", "신규성 효과", "Peeking", "Ramp-up",
      "SRM·생존 편향·계측 문제", "Underpowered NULL", "트리거 분석·선택 편향", "A/B/n·다중검정", "보조 지표에서 다음 가설 찾기",
    ],
  },
  phases,
  designSchema: { diagnose: diagnoseSchema, p1: p1Schema, p2: p2Schema, p3: p3Schema, p4: p4Schema },
  formMeta,
  /** phase 는 'p1'~'p4' (또는 'p1_run' 처럼 접두가 p1~p4 인 키). 진단은 시뮬레이션이 없다. */
  simulate(phase, design) {
    const sim = phase.slice(0, 2);
    if (!["p1", "p2", "p3", "p4"].includes(sim)) throw new SimulationRejected("이 단계에는 시뮬레이션이 없어요.");
    return simulateBaemin({ ...design, phase: sim });
  },
  rubric,
  decisions,
  reveal,
};

export { simulateBaemin, validateDesign } from "./simulate";

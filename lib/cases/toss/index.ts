import type { CasePlugin } from "../types";
import { SimulationRejected } from "../types";
import { rubric, reveal } from "./rubric";
import type { Design } from "./schema";
import { simulateToss } from "./simulate";
import { tossClient } from "./ui";

/** 서버 전용 플러그인: 클라이언트용 정의 + 시뮬 엔진 + 루브릭 + 정답 해설 */
export const tossPlugin: CasePlugin<Design> = {
  ...tossClient,
  /** phase 는 'p1', 'p2' (또는 'p1_run' 처럼 접두가 p1·p2 인 키). 진단과 최종 결정에는 시뮬레이션이 없다. */
  simulate(phase, design) {
    const sim = phase.slice(0, 2);
    if (sim !== "p1" && sim !== "p2") throw new SimulationRejected("이 단계에는 시뮬레이션이 없어요.");
    return simulateToss({ ...design, phase: sim });
  },
  rubric,
  reveal,
};

export { simulateToss, validateDesign } from "./simulate";

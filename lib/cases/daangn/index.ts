import type { CasePlugin } from "../types";
import { SimulationRejected } from "../types";
import { rubric, reveal } from "./rubric";
import type { Design } from "./schema";
import { simulateDaangn } from "./simulate";
import { daangnClient } from "./ui";

/** 서버 전용 플러그인: 클라이언트용 정의 + 시뮬 엔진 + 루브릭 + 정답 해설 */
export const daangnPlugin: CasePlugin<Design> = {
  ...daangnClient,
  /** phase 는 'p1'~'p3' (또는 'p1_run' 처럼 접두가 p1~p3 인 키). 실험 문서(진단)에는 시뮬레이션이 없다. */
  simulate(phase, design) {
    const sim = phase.slice(0, 2);
    if (sim !== "p1" && sim !== "p2" && sim !== "p3") throw new SimulationRejected("이 단계에는 시뮬레이션이 없어요.");
    return simulateDaangn({ ...design, phase: sim });
  },
  rubric,
  reveal,
};

export { simulateDaangn, validateDesign } from "./simulate";

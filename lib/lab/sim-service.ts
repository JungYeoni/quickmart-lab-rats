import "server-only";
import { SimulationRejected, type CasePlugin } from "../cases/types";
import { toTeamView, type Readout, type TeamReadout } from "../sim/core";

export type SimMode = "main" | "aa";

export type SimOutcome = { ok: true; readout: Readout; team: TeamReadout } | { ok: false; message: string };

/**
 * 제출된 설계로 시뮬레이션. 거부되는 설계(SimulationRejected)는 조 화면에 보여줄 메시지로 돌려준다.
 * 반환하는 team 은 flags·achievedPower·"_" 패널이 빠진 조 화면용 사본이다.
 */
export function runSimulation(plugin: CasePlugin<never>, phaseKey: string, design: Record<string, unknown>, mode: SimMode): SimOutcome {
  const d = mode === "aa" ? { ...design, aa: true } : design;
  try {
    const readout = plugin.simulate(phaseKey, d as never, { prior: {} });
    return { ok: true, readout, team: toTeamView(readout) };
  } catch (e) {
    if (e instanceof SimulationRejected) return { ok: false, message: e.message };
    throw e;
  }
}

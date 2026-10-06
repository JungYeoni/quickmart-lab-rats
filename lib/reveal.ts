/** 정답 공개 이후 조에게 내려가는 정보를 만든다 (순수 함수). 공개 전에는 이 함수의 결과를 API 가 내려보내지 않는다(규칙 3). */
import type { CasePlugin } from "./cases/types";
import { simPhaseOf } from "./lab/phase";
import { FLAG_LABELS, type Flag } from "./sim/core/flags";
import type { Readout } from "./sim/core/readout";

export type RunRow = { team_id: string; phase: string; design: Record<string, unknown>; result: Readout; created_at: string };

/** 조의 시뮬레이션 Phase 별 최신 본 실험(A/A 제외) 결과 */
export function latestRunPerPhase(runs: RunRow[], teamId: string): Map<string, RunRow> {
  const best = new Map<string, RunRow>();
  for (const r of runs) {
    if (r.team_id !== teamId || (r.design as { aa?: boolean }).aa) continue;
    const cur = best.get(r.phase);
    if (!cur || r.created_at > cur.created_at) best.set(r.phase, r);
  }
  return best;
}

export type RevealItem = { step: string; phase: string; title: string; text: string };
export type RevealFlags = { step: string; phase: string; title: string; flags: { code: Flag; label: string }[]; achievedPower: number | null };
export type RevealPayload = { items: RevealItem[]; flags: RevealFlags[] };

type Plugin = Pick<CasePlugin, "phases" | "reveal">;

export function buildReveal(plugin: Plugin, runs: RunRow[], teamId: string): RevealPayload {
  const defOf = (sim: string) => plugin.phases.find((p) => simPhaseOf(p.key) === sim);
  const items: RevealItem[] = [];
  for (const [phase, text] of Object.entries(plugin.reveal)) {
    const def = defOf(phase);
    if (def && text) items.push({ step: def.step, phase, title: def.title, text });
  }
  const flags: RevealFlags[] = [];
  for (const [phase, run] of latestRunPerPhase(runs, teamId)) {
    const def = defOf(phase);
    if (!def) continue;
    flags.push({
      step: def.step, phase, title: def.title,
      flags: (run.result.flags ?? []).map((code) => ({ code, label: FLAG_LABELS[code] })),
      achievedPower: run.result.achievedPower ?? null,
    });
  }
  return { items, flags };
}

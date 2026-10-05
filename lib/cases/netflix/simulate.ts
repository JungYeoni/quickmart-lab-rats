/** 넷플릭스 시뮬레이션 진입점: 설계를 검증하고 단계(p1 스크리닝 / p2 결선 A/B / p3 장기 검증 계획)에 맞는 엔진으로 보낸다. */
import { SimulationRejected } from "../types";
import type { Flag, Readout } from "@/lib/sim/core";
import type { SimOptions } from "./common";
import { simulateFinal } from "./final";
import { simulateFinals } from "./finals";
import { designUnion, diagnoseSchema, type Design } from "./schema";
import { simulateScreening } from "./screening";

export type { SimOptions };

export function validateDesign(input: unknown): { ok: true; design: Design } | { ok: false; message: string } {
  const parsed = designUnion.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "설계 입력을 확인해 주세요." };
  return { ok: true, design: parsed.data };
}

export function simulateNetflix(input: unknown, opts: SimOptions = {}): Readout {
  const v = validateDesign(input);
  if (!v.ok) throw new SimulationRejected(v.message);
  const d = v.design;
  if (d.phase === "p1") return simulateScreening(d, opts);
  if (d.phase === "p2") return simulateFinals(d, opts);
  return simulateFinal(d, opts);
}

/** s1 진단 제출에서 뽑는 플래그(시뮬레이션이 없는 단계). 오프라인 1등을 바로 출시하겠다고 하면 OFFLINE_ONLINE_GAP. */
export function diagnoseFlags(payload: unknown): Flag[] {
  const p = diagnoseSchema.safeParse(payload);
  return p.success && p.data.ship_offline_best === "yes" ? ["OFFLINE_ONLINE_GAP"] : [];
}

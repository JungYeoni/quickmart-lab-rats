/** 당근 시뮬레이션 진입점: 설계를 검증하고 단계(p1·p2 거래후기 / p3 거래완료 게시글)에 맞는 엔진으로 보낸다. */
import { SimulationRejected } from "../types";
import type { Readout } from "@/lib/sim/core";
import { simulateListing } from "./listing";
import { reviewCfg, simulateReview, type SimOptions } from "./review";
import { designUnion, type Design } from "./schema";

export type { SimOptions };

export function validateDesign(input: unknown): { ok: true; design: Design } | { ok: false; message: string } {
  const parsed = designUnion.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "설계 입력을 확인해 주세요." };
  return { ok: true, design: parsed.data };
}

export function simulateDaangn(input: unknown, opts: SimOptions = {}): Readout {
  const v = validateDesign(input);
  if (!v.ok) throw new SimulationRejected(v.message);
  const d = v.design;
  if (d.phase === "p3") return simulateListing(d, opts);
  return simulateReview(reviewCfg(d), d, opts);
}

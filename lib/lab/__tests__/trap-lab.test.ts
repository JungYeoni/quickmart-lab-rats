import { describe, expect, it } from "vitest";
import { baeminClient } from "@/lib/cases/baemin/ui";
import { memoPayload } from "@/lib/schemas";
import { buildMemoDoc } from "../memo";
import type { Submission } from "../phase";
import { peekingExperiment, simpsonRows, srmCheck } from "../trap-lab";

describe("함정 연구소", () => {
  it("Peeking: 끝에 한 번만 보면 위양성 5% 근처, 매일 보다 멈추면 크게 불어난다", () => {
    for (const days of [7, 14, 28]) {
      const r = peekingExperiment(days);
      expect(r.finalRate).toBeGreaterThan(0.02);
      expect(r.finalRate).toBeLessThan(0.09);
      expect(r.everRate).toBeGreaterThan(r.finalRate * 2);
      expect(r.paths).toHaveLength(24);
      expect(r.paths[0]).toHaveLength(days);
    }
    expect(peekingExperiment(28).everRate).toBeGreaterThan(peekingExperiment(7).everRate);
  });
  it("Peeking: 같은 입력이면 같은 결과", () => {
    expect(peekingExperiment(14)).toEqual(peekingExperiment(14));
  });

  it("심슨의 역설: 합치면 B 가 유의하게 좋고, 기간별로 보면 둘 다 B 가 나쁘다", () => {
    const [pool] = simpsonRows("pool");
    expect(pool.d).toBeGreaterThan(0);
    expect(pool.p).toBeLessThan(0.001);
    const split = simpsonRows("split");
    expect(split).toHaveLength(2);
    for (const r of split) expect(r.d).toBeLessThan(0);
  });

  it("SRM 계산기: 같은 0.6%p 차이도 표본이 작으면 우연, 크면 SRM", () => {
    const big = srmCheck(500000, 494000, 0.5);
    expect(big.ok && big.srm).toBe(true);
    const small = srmCheck(500, 494, 0.5);
    expect(small.ok && small.srm).toBe(false);
    expect(srmCheck(0, 10, 0.5).ok).toBe(false);
    expect(srmCheck(10, 10, 1).ok).toBe(false);
  });
});

describe("s8 결정 메모", () => {
  it("메모 입력 검증", () => {
    expect(memoPayload.safeParse({ learned: "  ", lesson: "x" }).success).toBe(false);
    expect(memoPayload.safeParse({ learned: "a", lesson: "" }).success).toBe(false);
    expect(memoPayload.safeParse({ learned: "a", lesson: "b" }).success).toBe(true);
  });

  it("제출한 결정과 메모를 발표용 요약으로 모은다", () => {
    const decide = baeminClient.phases.find((p) => p.kind === "decide")!;
    const sim = decide.key.slice(0, 2);
    const opt = baeminClient.decisions[sim].options[0];
    const subs: Submission[] = [
      { step: decide.step, phase: sim, kind: "decision", version: 1, payload: { option: opt.id, rationale: "표본이 충분했어요" } },
      { step: "s8_share", phase: "memo", kind: "note", version: 1, payload: { learned: "SRM 이 중요", lesson: "먼저 데이터를 의심하자" } },
    ];
    const doc = buildMemoDoc(baeminClient, subs);
    expect(doc).toContain(opt.label);
    expect(doc).toContain("표본이 충분했어요");
    expect(doc).toContain("먼저 데이터를 의심하자");
    expect(buildMemoDoc(baeminClient, [])).toContain("아직 제출한 결정이 없어요");
  });
});

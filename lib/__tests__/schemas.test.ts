import { describe, expect, it } from "vitest";
import { generateClassCode, normalizeClassCode } from "../class-code";
import { createClassBody, joinTeamBody, pickCaseBody, setStepBody } from "../schemas";
import { STEP_KEYS } from "../steps";

describe("class code", () => {
  it("6자리이고 헷갈리는 글자가 없다", () => {
    for (let i = 0; i < 200; i++) expect(generateClassCode()).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
  });
  it("공백 제거 + 대문자", () => {
    expect(normalizeClassCode("  ab3k9z ")).toBe("AB3K9Z");
  });
});

describe("request schemas", () => {
  it("createClass 기본값: 사례당 2조, 4개 사례 전부", () => {
    const r = createClassBody.parse({ title: "수업" });
    expect(r.maxTeamsPerCase).toBe(2);
    expect(r.allowedCases).toHaveLength(4);
  });
  it("createClass 는 빈 제목과 모르는 사례를 거절", () => {
    expect(createClassBody.safeParse({ title: " " }).success).toBe(false);
    expect(createClassBody.safeParse({ title: "x", allowedCases: ["unknown"] }).success).toBe(false);
  });
  it("joinTeam 은 조 이름 공백을 다듬고 빈 값은 거절", () => {
    expect(joinTeamBody.parse({ code: "AB3K9Z", name: "  1조 " }).name).toBe("1조");
    expect(joinTeamBody.safeParse({ code: "AB3K9Z", name: "" }).success).toBe(false);
  });
  it("pickCase 는 uuid 와 사례 키를 요구", () => {
    expect(pickCaseBody.safeParse({ code: "AB3K9Z", teamId: "nope", caseKey: "toss" }).success).toBe(false);
    expect(pickCaseBody.safeParse({ code: "AB3K9Z", teamId: crypto.randomUUID(), caseKey: "toss" }).success).toBe(true);
  });
  it("setStep 은 스텝 9개와 3가지 상태만 허용", () => {
    expect(STEP_KEYS).toHaveLength(9);
    expect(setStepBody.safeParse({ code: "AB3K9Z", step: "s9_x", status: "open" }).success).toBe(false);
    expect(setStepBody.safeParse({ code: "AB3K9Z", step: "s0_pick", status: "paused" }).success).toBe(false);
    expect(setStepBody.safeParse({ code: "AB3K9Z", step: "s0_pick", status: "open" }).success).toBe(true);
  });
});

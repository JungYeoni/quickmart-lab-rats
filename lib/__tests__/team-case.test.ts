import { describe, expect, it } from "vitest";
import { checkCasePick, countByCase } from "../team-case";

const opts = { allowedCases: ["baemin", "toss", "daangn", "netflix"], maxTeamsPerCase: 2 };

describe("checkCasePick", () => {
  it("정원 안이면 통과", () => {
    expect(checkCasePick("baemin", ["baemin", null, "toss"], opts)).toEqual({ ok: true });
  });

  it("다른 조 2개가 이미 골랐으면 거절", () => {
    const r = checkCasePick("baemin", ["baemin", "baemin", "toss"], opts);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("full");
  });

  it("제한이 1이면 한 조만 고를 수 있다", () => {
    expect(checkCasePick("toss", ["toss"], { ...opts, maxTeamsPerCase: 1 }).ok).toBe(false);
    expect(checkCasePick("toss", [], { ...opts, maxTeamsPerCase: 1 }).ok).toBe(true);
  });

  it("수업이 허용하지 않은 사례는 거절", () => {
    const r = checkCasePick("netflix", [], { ...opts, allowedCases: ["baemin"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not_allowed");
  });

  it("본인 선택은 otherTeamCases 에 포함되지 않으므로 같은 사례를 다시 눌러도 통과", () => {
    // 정원이 2인 사례에 내가 이미 속해 있어도, 나를 뺀 목록은 1개뿐
    expect(checkCasePick("baemin", ["baemin"], opts).ok).toBe(true);
  });
});

describe("countByCase", () => {
  it("null 은 세지 않는다", () => {
    expect(countByCase(["baemin", null, "baemin", "toss"])).toEqual({ baemin: 2, toss: 1 });
  });
});

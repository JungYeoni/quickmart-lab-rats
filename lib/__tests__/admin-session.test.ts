import { describe, expect, it } from "vitest";
import { createAdminToken, safeEqual, verifyAdminToken } from "../auth/admin-session";

const SECRET = "test-secret-value";
const NOW = 1_700_000_000_000;

describe("admin session token", () => {
  it("발급한 토큰은 검증을 통과한다", () => {
    expect(verifyAdminToken(createAdminToken(SECRET, NOW), SECRET, NOW + 1000)).toBe(true);
  });

  it("다른 비밀키로는 통과하지 못한다", () => {
    expect(verifyAdminToken(createAdminToken(SECRET, NOW), "other-secret", NOW)).toBe(false);
  });

  it("변조한 토큰은 거절한다", () => {
    const [role, exp, sig] = createAdminToken(SECRET, NOW).split(".");
    expect(verifyAdminToken(`${role}.${Number(exp) + 99999}.${sig}`, SECRET, NOW)).toBe(false);
  });

  it("만료된 토큰은 거절한다", () => {
    const token = createAdminToken(SECRET, NOW);
    expect(verifyAdminToken(token, SECRET, NOW + 13 * 60 * 60 * 1000)).toBe(false);
  });

  it("없거나 깨진 토큰은 거절한다", () => {
    expect(verifyAdminToken(undefined, SECRET)).toBe(false);
    expect(verifyAdminToken("garbage", SECRET)).toBe(false);
  });
});

describe("safeEqual", () => {
  it("같은 문자열만 true", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

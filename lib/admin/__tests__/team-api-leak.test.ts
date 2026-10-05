/**
 * 규칙 3 보호(정적 검사): 조 화면이 호출하는 API 라우트는 sim_runs 원본(flags 포함)이나 강사용 모듈을 응답에 쓰지 않는다.
 * 강사 전용 라우트(/api/admin/*)만 isAdmin 검사 후 원본을 읽을 수 있다.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const TEAM_ROUTES = ["app/api/submit/route.ts", "app/api/simulate/route.ts", "app/api/demo/simulate/route.ts", "app/api/team/join/route.ts", "app/api/team/case/route.ts", "app/api/class/route.ts"];

describe("조 화면용 API 라우트", () => {
  for (const f of TEAM_ROUTES) {
    it(`${f} 는 admin 보드·flags 를 응답에 쓰지 않는다`, () => {
      const src = read(f);
      expect(src).not.toMatch(/lib\/admin\/board/);
      expect(src).not.toMatch(/\.flags\b/);
    });
  }
  it("/api/simulate 와 /api/demo/simulate 는 readout 원본이 아니라 team 사본을 돌려준다", () => {
    for (const f of ["app/api/simulate/route.ts", "app/api/demo/simulate/route.ts"]) {
      const src = read(f);
      expect(src, f).toMatch(/NextResponse\.json\(\{ readout: out\.team \}\)/);
      expect(src, f).not.toMatch(/NextResponse\.json\(\{ readout: out\.readout/);
    }
  });
  it("강사 보드 라우트는 isAdmin 으로 막혀 있다", () => {
    expect(read("app/api/admin/board/route.ts")).toMatch(/if \(!\(await isAdmin\(\)\)\) return fail\(.*401\)/);
  });
});

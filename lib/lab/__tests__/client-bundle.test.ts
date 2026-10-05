/**
 * 규칙 3·5 보호: 조 화면(클라이언트) 코드에서 import 를 따라가도 서버 전용 모듈(루브릭·정답 해설, 진짜 효과, 시뮬 엔진,
 * service role)에 닿지 않아야 한다. 닿으면 그 코드가 브라우저로 내려간다.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../..");

const FORBIDDEN = [
  "lib/cases/baemin/rubric.ts",
  "lib/cases/baemin/effects.ts",
  "lib/cases/baemin/simulate.ts",
  "lib/cases/baemin/index.ts",
  "lib/cases/toss/rubric.ts",
  "lib/cases/toss/effects.ts",
  "lib/cases/toss/simulate.ts",
  "lib/cases/toss/index.ts",
  "lib/cases/toss/population.ts",
  "lib/cases/registry.ts",
  "lib/review/service.ts",
  "lib/review/llm.ts",
  "lib/lab/sim-service.ts",
  "lib/supabase/server.ts",
  "lib/sim/core/crn.ts",
  "lib/env.ts",
];

const EXT = [".ts", ".tsx", "/index.ts", "/index.tsx"];

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(from), spec);
  else return null; // 외부 패키지
  for (const e of ["", ...EXT]) if (existsSync(base + e) && /\.(ts|tsx)$/.test(base + e)) return base + e;
  return null;
}

function closure(entry: string): Set<string> {
  const seen = new Set<string>();
  const walk = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/(?:import|export)[^"';]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)) {
      const r = resolveImport(file, m[1] ?? m[2]);
      if (r) walk(r);
    }
  };
  walk(join(ROOT, entry));
  return seen;
}

const rel = (s: Set<string>) => [...s].map((f) => f.slice(ROOT.length + 1).replaceAll("\\", "/"));

describe("클라이언트 번들 경계", () => {
  for (const entry of ["components/StepView.tsx", "components/TeamScreen.tsx", "components/DemoCase.tsx", "components/admin/LiveBoard.tsx", "components/review/ClassReviewPanel.tsx", "lib/cases/client-registry.ts", "lib/lab/adapter.ts"]) {
    it(`${entry} 에서 서버 전용 모듈로 이어지지 않는다`, () => {
      const files = rel(closure(entry));
      for (const bad of FORBIDDEN) expect(files, `${entry} → ${bad}`).not.toContain(bad);
      // 서버 전용 import 도 안 된다
      for (const f of files) expect(readFileSync(join(ROOT, f), "utf8"), f).not.toMatch(/from\s+["']server-only["']/);
    });
  }

  it("검사기가 실제로 동작한다: 서버용 플러그인 진입점은 금지 모듈에 닿는다", () => {
    const files = rel(closure("lib/cases/baemin/index.ts"));
    expect(files).toContain("lib/cases/baemin/rubric.ts");
    expect(files).toContain("lib/cases/baemin/simulate.ts");
  });
});

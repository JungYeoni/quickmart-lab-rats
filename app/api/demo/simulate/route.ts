import { NextResponse } from "next/server";
import { fail, parseBody } from "@/lib/api";
import { getPlugin } from "@/lib/cases/registry";
import { demoEnabled } from "@/lib/demo";
import { runSimulation } from "@/lib/lab/sim-service";
import { demoSimulateBody } from "@/lib/schemas";

// 데모 모드: DB 없이 사례 플러그인으로 시뮬레이션만 돌린다. 조 화면용 사본(flags·숨김 필드 제거)만 반환.
export async function POST(req: Request) {
  if (!demoEnabled()) return fail("데모 모드가 꺼져 있어요.", 404);
  const body = await parseBody(req, demoSimulateBody);
  if ("error" in body) return body.error;
  const plugin = getPlugin(body.data.caseKey);
  if (!plugin) return fail("아직 준비되지 않은 사례예요.", 404);
  const out = runSimulation(plugin, body.data.phase, body.data.design, body.data.mode);
  if (!out.ok) return fail(out.message);
  return NextResponse.json({ readout: out.team });
}

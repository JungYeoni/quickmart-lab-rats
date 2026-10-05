import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { buildBoard, type SimRunRow, type SubmissionRow, type TeamRow } from "@/lib/admin/board";
import { isAdmin } from "@/lib/auth/admin";
import { normalizeClassCode } from "@/lib/class-code";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 강사 화면 전용: 조별 최신 제출 + sim_runs 원본(flags 포함)을 모아 비교표·개념 보드 데이터로 만든다. 관리자 쿠키가 없으면 401.
export async function GET(req: Request) {
  if (!(await isAdmin())) return fail("강사 로그인이 필요해요.", 401);
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return fail("수업 코드가 필요해요.");

  const db = supabaseAdmin();
  const { data: cls } = await db.from("classes").select("id").eq("code", normalizeClassCode(code)).maybeSingle();
  if (!cls) return fail("수업 코드를 찾을 수 없어요.", 404);

  const [teams, subs, runs] = await Promise.all([
    db.from("teams").select("id, name, case_key").eq("class_id", cls.id),
    db.from("submissions").select("team_id, step, phase, kind, version, payload, created_at").eq("class_id", cls.id),
    db.from("sim_runs").select("team_id, case_key, phase, design, design_hash, result, created_at").eq("class_id", cls.id).order("created_at", { ascending: false }).limit(500),
  ]);
  if (teams.error || subs.error || runs.error) {
    console.error("[api/admin/board] 조회 실패", teams.error ?? subs.error ?? runs.error);
    return fail("보드 데이터를 불러오지 못했어요.", 500);
  }
  return NextResponse.json(buildBoard(teams.data as TeamRow[], subs.data as SubmissionRow[], runs.data as SimRunRow[]));
}

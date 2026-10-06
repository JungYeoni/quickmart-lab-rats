import { NextResponse } from "next/server";
import { fail, parseBody } from "@/lib/api";
import { normalizeClassCode } from "@/lib/class-code";
import { readShare } from "@/lib/review/service";
import { teamScopedBody } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase/server";

// 직소 브리핑 읽기(조 화면): 강사가 만든 최신 브리핑. 정답 공개 전에는 함정 이름이 든 문장을 뺀다.
export async function POST(req: Request) {
  const body = await parseBody(req, teamScopedBody);
  if ("error" in body) return body.error;
  const db = supabaseAdmin();
  const { data: cls } = await db.from("classes").select("id, reveal_answers").eq("code", normalizeClassCode(body.data.code)).maybeSingle();
  if (!cls) return fail("수업 코드를 찾을 수 없어요.", 404);
  const { data: team } = await db.from("teams").select("id").eq("id", body.data.teamId).eq("class_id", cls.id).maybeSingle();
  if (!team) return fail("이 수업에 속한 조가 아니에요.", 404);
  return NextResponse.json(await readShare(db, cls.id, cls.reveal_answers === true));
}

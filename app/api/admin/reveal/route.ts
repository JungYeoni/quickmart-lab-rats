import { NextResponse } from "next/server";
import { fail, parseBody } from "@/lib/api";
import { isAdmin } from "@/lib/auth/admin";
import { normalizeClassCode } from "@/lib/class-code";
import { revealToggleBody } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase/server";

// 정답 공개 토글(강사). 켜면 조 화면에 원문 비교 해설과 이 조가 마주친 함정이 보인다.
export async function POST(req: Request) {
  if (!(await isAdmin())) return fail("강사 로그인이 필요해요.", 401);
  const body = await parseBody(req, revealToggleBody);
  if ("error" in body) return body.error;

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("classes").update({ reveal_answers: body.data.reveal }).eq("code", normalizeClassCode(body.data.code)).select("id").maybeSingle();
  if (error) {
    console.error("[api/admin/reveal] 실패", error);
    return fail("정답 공개 상태를 바꾸지 못했어요.", 500);
  }
  if (!data) return fail("수업 코드를 찾을 수 없어요.", 404);
  return NextResponse.json({ ok: true, reveal: body.data.reveal });
}

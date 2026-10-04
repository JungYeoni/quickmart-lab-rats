import { NextResponse } from "next/server";
import { fail, parseBody } from "@/lib/api";
import { isAdmin } from "@/lib/auth/admin";
import { normalizeClassCode } from "@/lib/class-code";
import { setStepBody } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase/server";

// 스텝 열기/닫기(강사)
export async function POST(req: Request) {
  if (!(await isAdmin())) return fail("강사 로그인이 필요해요.", 401);
  const body = await parseBody(req, setStepBody);
  if ("error" in body) return body.error;

  const db = supabaseAdmin();
  const { data: cls } = await db.from("classes").select("id").eq("code", normalizeClassCode(body.data.code)).maybeSingle();
  if (!cls) return fail("수업 코드를 찾을 수 없어요.", 404);

  const { error } = await db
    .from("step_states")
    .update({ status: body.data.status, updated_at: new Date().toISOString() })
    .eq("class_id", cls.id)
    .eq("step", body.data.step);
  if (error) return fail("스텝 상태를 바꾸지 못했어요.", 500);
  return NextResponse.json({ ok: true });
}

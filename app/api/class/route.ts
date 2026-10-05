import { NextResponse } from "next/server";
import { fail, parseBody } from "@/lib/api";
import { isAdmin } from "@/lib/auth/admin";
import { generateClassCode } from "@/lib/class-code";
import { createClassBody } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase/server";

// 수업 생성(강사). 스텝 9개는 DB 트리거(init_steps)가 만든다.
export async function POST(req: Request) {
  if (!(await isAdmin())) return fail("강사 로그인이 필요해요.", 401);
  const body = await parseBody(req, createClassBody);
  if ("error" in body) return body.error;
  const { title, maxTeamsPerCase, allowedCases } = body.data;

  const db = supabaseAdmin();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateClassCode();
    const { data, error } = await db
      .from("classes")
      .insert({ code, title, max_teams_per_case: maxTeamsPerCase, allowed_cases: allowedCases })
      .select("id, code")
      .single();
    if (!error) return NextResponse.json({ id: data.id, code: data.code });
    if (error.code !== "23505") {
      console.error("[api/class] 수업 생성 실패", error);
      return fail("수업을 만들지 못했어요.", 500);
    } // unique 충돌이면 새 코드로 재시도
  }
  return fail("수업 코드를 만들지 못했어요. 다시 시도해 주세요.", 500);
}

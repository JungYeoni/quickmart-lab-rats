import { NextResponse } from "next/server";
import { fail, parseBody } from "@/lib/api";
import { normalizeClassCode } from "@/lib/class-code";
import { joinTeamBody } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase/server";

// 조 입장: 같은 조 이름으로 다시 들어오면 기존 조로 복귀(localStorage 를 잃은 경우)
export async function POST(req: Request) {
  const body = await parseBody(req, joinTeamBody);
  if ("error" in body) return body.error;
  const code = normalizeClassCode(body.data.code);
  const name = body.data.name;

  const db = supabaseAdmin();
  const { data: cls } = await db.from("classes").select("id, code").eq("code", code).maybeSingle();
  if (!cls) return fail("수업 코드를 찾을 수 없어요. 코드를 다시 확인해 주세요.", 404);

  const { data: existing } = await db.from("teams").select("id").eq("class_id", cls.id).eq("name", name).maybeSingle();
  if (existing) {
    await db.from("teams").update({ last_seen_at: new Date().toISOString() }).eq("id", existing.id);
    return NextResponse.json({ teamId: existing.id, code: cls.code, rejoined: true });
  }

  const { data: team, error } = await db.from("teams").insert({ class_id: cls.id, name }).select("id").single();
  if (error) {
    console.error("[api/team/join] 조 생성 실패", error);
    return fail("조를 만들지 못했어요.", 500);
  }
  return NextResponse.json({ teamId: team.id, code: cls.code, rejoined: false });
}

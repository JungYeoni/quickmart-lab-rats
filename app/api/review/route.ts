import { NextResponse } from "next/server";
import { fail, parseBody } from "@/lib/api";
import { isAdmin } from "@/lib/auth/admin";
import { normalizeClassCode } from "@/lib/class-code";
import { ReviewError, reviewClass, reviewShare, reviewTeam } from "@/lib/review/service";
import { reviewBody } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 60;

// team: 조 화면에서 호출(플래그 이름이 새지 않게 걸러진 피드백만), class: 강사 전용.
// 같은 입력은 ai_reviews 캐시를 재사용하고, 새로 만들 때는 30초 쿨다운을 둔다.
export async function POST(req: Request) {
  const body = await parseBody(req, reviewBody);
  if ("error" in body) return body.error;
  const { code, step, scope, teamId } = body.data;

  if ((scope === "class" || scope === "share") && !(await isAdmin())) return fail("강사 로그인이 필요해요.", 401);
  if (scope === "team" && !teamId) return fail("조 정보가 필요해요.");

  const db = supabaseAdmin();
  const { data: cls } = await db.from("classes").select("id").eq("code", normalizeClassCode(code)).maybeSingle();
  if (!cls) return fail("수업 코드를 찾을 수 없어요.", 404);

  try {
    const result =
      scope === "team" ? await reviewTeam(db, { classId: cls.id, teamId: teamId!, step })
      : scope === "share" ? await reviewShare(db, { classId: cls.id })
      : await reviewClass(db, { classId: cls.id, step });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ReviewError) return fail(e.message, e.status);
    console.error("[api/review] 실패", e);
    return fail("AI 리뷰를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.", 502);
  }
}

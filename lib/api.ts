import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** JSON 본문을 zod 로 검증. 실패하면 NextResponse(에러)를 돌려준다. */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<{ data: T } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: fail("요청 형식이 올바르지 않아요.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: fail(parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요.") };
  return { data: parsed.data };
}

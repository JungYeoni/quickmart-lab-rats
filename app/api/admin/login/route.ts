import { NextResponse } from "next/server";
import { fail, parseBody } from "@/lib/api";
import { loginBody } from "@/lib/schemas";
import { serverEnv } from "@/lib/env";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, createAdminToken, safeEqual } from "@/lib/auth/admin-session";

export async function POST(req: Request) {
  const body = await parseBody(req, loginBody);
  if ("error" in body) return body.error;
  if (!safeEqual(body.data.password, serverEnv.adminPassword)) return fail("비밀번호가 맞지 않아요.", 401);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createAdminToken(serverEnv.adminSessionSecret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}

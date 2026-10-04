import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "lab_admin";
const MAX_AGE_SEC = 60 * 60 * 12;

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function createAdminToken(secret: string, now = Date.now()): string {
  const payload = `admin.${Math.floor(now / 1000) + MAX_AGE_SEC}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyAdminToken(token: string | undefined, secret: string, now = Date.now()): boolean {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  if (!safeEqual(token.slice(i + 1), sign(payload, secret))) return false;
  const [role, exp] = payload.split(".");
  return role === "admin" && Number(exp) * 1000 > now;
}

export const ADMIN_COOKIE_MAX_AGE = MAX_AGE_SEC;

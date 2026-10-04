import "server-only";
import { cookies } from "next/headers";
import { serverEnv } from "../env";
import { ADMIN_COOKIE, verifyAdminToken } from "./admin-session";

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminToken(jar.get(ADMIN_COOKIE)?.value, serverEnv.adminSessionSecret);
}

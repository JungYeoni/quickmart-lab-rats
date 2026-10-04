import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "../env";

/** service role 클라이언트. 모든 DB 쓰기는 Route Handler 에서 이걸로만 한다. */
export function supabaseAdmin() {
  return createClient(serverEnv.supabaseUrl, serverEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

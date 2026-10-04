function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`환경변수 ${name} 가 없어요. .env.local 을 확인해 주세요.`);
  return v;
}

/** 서버 전용. 클라이언트 번들에서 import 하지 말 것. */
export const serverEnv = {
  get supabaseUrl() { return need("NEXT_PUBLIC_SUPABASE_URL"); },
  get serviceRoleKey() { return need("SUPABASE_SERVICE_ROLE_KEY"); },
  get adminPassword() { return need("ADMIN_PASSWORD"); },
  get adminSessionSecret() { return need("ADMIN_SESSION_SECRET"); },
};

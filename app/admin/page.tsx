import Link from "next/link";
import { AdminLogin } from "@/components/AdminLogin";
import { CreateClassForm } from "@/components/CreateClassForm";
import { Card } from "@/components/ui";
import { isAdmin } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAdmin();
  const classes = authed
    ? ((await supabaseAdmin().from("classes").select("code, title, created_at").order("created_at", { ascending: false }).limit(10)).data ?? [])
    : [];

  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">강사</h1>
      {!authed ? (
        <AdminLogin />
      ) : (
        <>
          <CreateClassForm />
          {classes.length > 0 && (
            <Card>
              <h2 className="mb-3 text-lg font-bold">최근 수업</h2>
              <ul className="divide-y divide-line">
                {classes.map((c) => (
                  <li key={c.code}>
                    <Link href={`/c/${c.code}/admin`} className="flex items-center justify-between py-2.5 hover:text-brand">
                      <span>{c.title}</span>
                      <span className="font-mono text-sm tracking-widest text-ink3">{c.code}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </main>
  );
}

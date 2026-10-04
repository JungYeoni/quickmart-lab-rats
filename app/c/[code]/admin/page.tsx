import { redirect } from "next/navigation";
import { InstructorBoard } from "@/components/InstructorBoard";
import { isAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function InstructorPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!(await isAdmin())) redirect("/admin");
  return <InstructorBoard code={code} />;
}

import { notFound } from "next/navigation";
import { DemoCase } from "@/components/DemoCase";
import { CASE_KEYS, type CaseKey } from "@/lib/cases";
import { getClientCase } from "@/lib/cases/client-registry";
import { demoEnabled } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const metadata = { title: "사례 데모 · 퀵마트 실험실" };

export default async function DemoPage({ params }: { params: Promise<{ case: string }> }) {
  const { case: key } = await params;
  if (!demoEnabled() || !(CASE_KEYS as readonly string[]).includes(key) || !getClientCase(key)) notFound();
  return <DemoCase caseKey={key as CaseKey} />;
}

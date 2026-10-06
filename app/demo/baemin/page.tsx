import { notFound } from "next/navigation";
import { DemoBaemin } from "@/components/DemoBaemin";
import { demoEnabled } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const metadata = { title: "배민 사례 데모 · 퀵마트 실험실" };

export default function DemoPage() {
  if (!demoEnabled()) notFound();
  return <DemoBaemin />;
}

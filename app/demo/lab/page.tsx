import { notFound } from "next/navigation";
import { TrapLab } from "@/components/lab/TrapLab";
import { demoEnabled } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const metadata = { title: "함정 연구소 데모 · 퀵마트 실험실" };

/** 함정 연구소 단독 데모(수업 없이). 사례와 무관한 공통 화면이다. */
export default function LabDemoPage() {
  if (!demoEnabled()) notFound();
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-bold tracking-tight">함정 연구소</h1>
      <TrapLab />
    </main>
  );
}

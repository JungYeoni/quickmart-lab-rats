"use client";
import { useState } from "react";
import { CASE_KEYS, CASES } from "@/lib/cases";
import { STEP_KEYS, STEP_LABELS, type StepKey, type StepStatus } from "@/lib/steps";
import { countByCase } from "@/lib/team-case";
import { useClassLive } from "@/lib/use-class-live";
import { StatusBadge } from "./StatusBadge";
import { LiveBoard } from "./admin/LiveBoard";
import { Button, Card, ErrorText } from "./ui";

const ACTION_LABELS: Record<StepStatus, string> = { locked: "잠금", open: "열기", closed: "마감" };

// 프로젝터용: 큰 글씨
export function InstructorBoard({ code }: { code: string }) {
  const { cls, teams, steps, error, loading } = useClassLive(code);
  const [msg, setMsg] = useState("");

  async function setStatus(step: StepKey, status: StepStatus) {
    setMsg("");
    const res = await fetch("/api/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, step, status }),
    });
    if (!res.ok) setMsg((await res.json()).error ?? "바꾸지 못했어요.");
  }

  if (loading) return <p className="p-8 text-ink3">불러오는 중…</p>;
  if (error || !cls) return <p className="p-8 text-neg">{error ?? "수업을 찾을 수 없어요."}</p>;

  const counts = countByCase(teams.map((t) => t.case_key));
  const unpicked = teams.filter((t) => !t.case_key);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink3">{cls.title}</p>
          <h1 className="text-4xl font-bold tracking-tight">
            수업 코드 <span className="font-mono tracking-[0.2em] text-brand">{cls.code}</span>
          </h1>
        </div>
        <p className="text-lg text-ink2">참여 {teams.length}개 조</p>
      </header>

      <Card>
        <h2 className="mb-3 text-xl font-bold">스텝 컨트롤</h2>
        <ul className="divide-y divide-line">
          {STEP_KEYS.map((k, i) => (
            <li key={k} className="flex flex-wrap items-center gap-3 py-3">
              <span className="w-6 text-sm text-ink3">{i}</span>
              <span className="min-w-40 flex-1 text-lg font-semibold">{STEP_LABELS[k]}</span>
              <StatusBadge status={steps[k]} />
              <div className="flex gap-2">
                {(["locked", "open", "closed"] as const).map((s) => (
                  <Button key={s} variant={steps[k] === s ? "primary" : "ghost"} onClick={() => setStatus(k, s)}>
                    {ACTION_LABELS[s]}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <ErrorText>{msg}</ErrorText>
      </Card>

      <Card>
        <h2 className="mb-3 text-xl font-bold">사례 선택 현황</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CASE_KEYS.filter((k) => cls.allowed_cases.includes(k)).map((k) => {
            const n = counts[k] ?? 0;
            const full = n >= cls.max_teams_per_case;
            return (
              <div key={k} className="rounded-xl border border-line bg-sunk p-4">
                <div className="flex items-center justify-between">
                  <b className="text-lg">
                    {CASES[k].company} · {CASES[k].title}
                  </b>
                  <span className={`text-lg font-bold ${full ? "text-warn" : "text-ink"}`}>
                    {n} / {cls.max_teams_per_case}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink3">
                  {n === 0 ? "아직 아무도 고르지 않았어요" : teams.filter((t) => t.case_key === k).map((t) => t.name).join(", ")}
                </p>
                {full && <p className="mt-1 text-sm font-semibold text-warn">정원이 찼어요</p>}
              </div>
            );
          })}
        </div>
        {unpicked.length > 0 && <p className="mt-4 text-ink2">사례를 아직 고르지 않은 조: {unpicked.map((t) => t.name).join(", ")}</p>}
      </Card>

      <LiveBoard code={code} allowedCases={cls.allowed_cases} />
    </main>
  );
}

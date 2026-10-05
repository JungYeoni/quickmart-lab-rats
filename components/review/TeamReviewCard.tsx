"use client";
import { useState } from "react";
import type { ReviewResult, TeamReview } from "@/lib/review/types";
import type { StepKey } from "@/lib/steps";
import { Badge, Button, Card, ErrorText } from "../ui";

/** 조별 AI 피드백 카드. 정답을 말하지 않고 질문으로 유도한다(서버에서 플래그 이름은 걸러서 내려온다). */
export function TeamReviewCard({ code, teamId, step }: { code: string; teamId: string; step: StepKey }) {
  const [res, setRes] = useState<ReviewResult<TeamReview> | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, teamId, step, scope: "team" }),
      });
      const body = await r.json();
      if (!r.ok) setErr(body.error ?? "피드백을 받지 못했어요.");
      else setRes(body);
    } catch {
      setErr("피드백을 받지 못했어요. 네트워크를 확인해 주세요.");
    }
    setBusy(false);
  }

  const o = res?.output;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">AI 피드백</h2>
        {res?.model === "mock" && <Badge tone="warn">샘플 피드백</Badge>}
        <Button className="ml-auto" variant="ghost" onClick={ask} disabled={busy}>{busy ? "만드는 중…" : o ? "다시 받기" : "피드백 받기"}</Button>
      </div>
      <p className="mt-1 text-sm text-ink3">제출한 내용을 바탕으로 질문을 드려요. 정답을 알려주지는 않아요.</p>
      <ErrorText>{err}</ErrorText>
      {o && (
        <div className="mt-4 space-y-4 text-sm">
          <p><b className="text-2xl tabular-nums">{Math.round(o.score)}</b><span className="text-ink3"> / 100</span></p>
          <List title="잘한 점" items={o.strengths} />
          <List title="더 살펴볼 점" items={o.issues} />
          <List title="이런 질문은 어때요?" items={o.nudge_questions} accent />
          {o.vs_original && <p className="rounded-lg bg-sunk p-3">{o.vs_original}</p>}
        </div>
      )}
    </Card>
  );
}

function List({ title, items, accent }: { title: string; items: string[]; accent?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <ul className={`list-disc space-y-1 pl-5 ${accent ? "text-brand" : "text-ink2"}`}>{items.map((x) => <li key={x}>{x}</li>)}</ul>
    </div>
  );
}

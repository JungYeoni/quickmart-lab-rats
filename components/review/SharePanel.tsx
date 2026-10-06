"use client";
import { useState } from "react";
import { CASES } from "@/lib/cases";
import type { ReviewResult, ShareReview } from "@/lib/review/types";
import { Badge, Button, Card, ErrorText } from "../ui";

/** 강사 전용: s8 직소 공유용 조별 2분 브리핑 초안. 조들이 결정 메모를 낸 뒤에 만든다. */
export function SharePanel({ code }: { code: string }) {
  const [res, setRes] = useState<ReviewResult<ShareReview> | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, step: "s8_share", scope: "share" }),
      });
      const body = await r.json();
      if (!r.ok) setErr(body.error ?? "브리핑을 만들지 못했어요.");
      else setRes(body);
    } catch {
      setErr("브리핑을 만들지 못했어요. 네트워크를 확인해 주세요.");
    }
    setBusy(false);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">직소 브리핑 만들기</h2>
        <Button onClick={run} disabled={busy}>{busy ? "만드는 중…" : "브리핑 만들기"}</Button>
        {res && <span className="text-xs text-ink3">{res.model === "mock" ? "샘플 브리핑(AI 키 미연결)" : res.model}{res.cached ? " · 이전 결과 재사용" : ""}</span>}
      </div>
      <p className="mt-1 text-sm text-ink3">조의 결정과 결정 메모를 모아 조별 2분 브리핑 초안을 만들어요. 만들면 조 화면의 &lsquo;직소 공유&rsquo;에도 나타나요.</p>
      <ErrorText>{err}</ErrorText>
      {res && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {res.output.briefs.map((b) => (
            <div key={b.team} className="rounded-xl border border-line bg-sunk p-4">
              <b className="text-lg">{b.team} <span className="text-sm font-normal text-ink3">{CASES[b.case as keyof typeof CASES]?.company ?? b.case}</span></b>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink2">{b.story_in_3_lines.map((l) => <li key={l}>{l}</li>)}</ol>
              {b.traps_we_hit.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{b.traps_we_hit.map((t) => <Badge key={t} tone="warn">{t}</Badge>)}</div>}
              <p className="mt-2 text-sm"><b>다른 조에게</b> {b.one_lesson_for_other_teams}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

"use client";
import { useState } from "react";
import { CASES } from "@/lib/cases";
import type { ClassReview, ReviewResult } from "@/lib/review/types";
import { STEP_KEYS, STEP_LABELS, type StepKey } from "@/lib/steps";
import { Badge, Button, Card, ErrorText } from "../ui";

const STATUS_TONE = { found: "done", missed: "bad", "n/a": "draft" } as const;
const STATUS_LABEL = { found: "발견", missed: "놓침", "n/a": "해당 없음" } as const;

/** 강사 전용 AI 종합 분석: 사례가 달라도 같은 개념끼리 가로질러 본다. */
export function ClassReviewPanel({ code }: { code: string }) {
  const [step, setStep] = useState<StepKey>("s2_design");
  const [res, setRes] = useState<ReviewResult<ClassReview> | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, step, scope: "class" }),
      });
      const body = await r.json();
      if (!r.ok) setErr(body.error ?? "분석하지 못했어요.");
      else setRes(body);
    } catch {
      setErr("분석하지 못했어요. 네트워크를 확인해 주세요.");
    }
    setBusy(false);
  }

  const o = res?.output;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">AI 종합 분석</h2>
        <select value={step} onChange={(e) => setStep(e.target.value as StepKey)} className="rounded-lg border border-line bg-sunk px-3 py-2 text-sm" aria-label="분석할 스텝">
          {STEP_KEYS.filter((k) => k !== "s0_pick" && k !== "s7_lab" && k !== "s8_share").map((k) => <option key={k} value={k}>{STEP_LABELS[k]}</option>)}
        </select>
        <Button onClick={run} disabled={busy}>{busy ? "분석 중…" : "분석하기"}</Button>
        {res && <span className="text-xs text-ink3">{res.model === "mock" ? "샘플 분석(AI 키 미연결)" : res.model}{res.cached ? " · 이전 결과 재사용" : ""}</span>}
      </div>
      <ErrorText>{err}</ErrorText>
      {o && (
        <div className="mt-5 space-y-6">
          <p className="text-lg">{o.summary}</p>

          <section>
            <h3 className="mb-2 text-lg font-bold">개념 보드</h3>
            <ul className="divide-y divide-line">
              {o.concept_board.map((c) => (
                <li key={c.concept} className="py-3">
                  <b>{c.concept}</b>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {c.found_by.map((t) => <Badge key={`f${t}`} tone="done">{t} 발견</Badge>)}
                    {c.missed_by.map((t) => <Badge key={`m${t}`} tone="bad">{t} 놓침</Badge>)}
                  </div>
                  {c.note && <p className="mt-1 text-sm text-ink2">{c.note}</p>}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-lg font-bold">조별 카드</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {o.team_cards.map((t) => (
                <div key={t.team} className="rounded-xl border border-line bg-sunk p-4">
                  <div className="flex items-center justify-between">
                    <b className="text-lg">{t.team} <span className="text-sm font-normal text-ink3">{CASES[t.case as keyof typeof CASES]?.company ?? t.case}</span></b>
                    <b className="text-xl tabular-nums">{Math.round(t.score)}</b>
                  </div>
                  <p className="mt-1 text-sm text-ink2">{t.one_liner}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(t.trap_status).map(([k, v]) => <Badge key={k} tone={STATUS_TONE[v]}>{k} · {STATUS_LABEL[v]}</Badge>)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-1 text-lg font-bold">사례를 가로지르는 통찰</h3>
            <p className="text-ink2">{o.cross_case_insight}</p>
          </section>
          <section>
            <h3 className="mb-1 text-lg font-bold">토론 질문</h3>
            <ul className="list-disc space-y-1 pl-5 text-ink2">{o.discussion_questions.map((q) => <li key={q}>{q}</li>)}</ul>
          </section>
        </div>
      )}
    </Card>
  );
}

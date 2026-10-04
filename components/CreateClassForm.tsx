"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CASE_KEYS, CASES } from "@/lib/cases";
import { Button, Card, ErrorText, Field, inputClass } from "./ui";

export function CreateClassForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [maxTeams, setMaxTeams] = useState(2);
  const [allowed, setAllowed] = useState<string[]>([...CASE_KEYS]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (k: string) => setAllowed((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/class", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, maxTeamsPerCase: maxTeams, allowedCases: allowed }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "수업을 만들지 못했어요.");
    router.push(`/c/${data.code}/admin`);
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold">새 수업 만들기</h2>
      <form onSubmit={submit} className="space-y-4">
        <Field label="수업 이름">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 10월 DA 트랙 A/B 실습" required />
        </Field>
        <Field label="사례당 최대 조 수">
          <input type="number" min={1} max={20} className={inputClass} value={maxTeams} onChange={(e) => setMaxTeams(Number(e.target.value))} />
        </Field>
        <fieldset>
          <legend className="mb-1 text-xs font-semibold text-ink2">선택 가능한 사례</legend>
          <div className="flex flex-wrap gap-2">
            {CASE_KEYS.map((k) => (
              <label key={k} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-sunk px-3 py-1.5 text-sm">
                <input type="checkbox" checked={allowed.includes(k)} onChange={() => toggle(k)} />
                {CASES[k].company} · {CASES[k].title}
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="submit" disabled={busy || allowed.length === 0}>{busy ? "만드는 중…" : "수업 만들기"}</Button>
        <ErrorText>{error}</ErrorText>
      </form>
    </Card>
  );
}

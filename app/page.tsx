"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorText, Field, inputClass } from "@/components/ui";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "입장하지 못했어요.");
      try {
        localStorage.setItem(`lab:team:${data.code}`, data.teamId);
      } catch {}
      router.push(`/c/${data.code}/t/${data.teamId}`);
    } catch {
      setError("네트워크 오류예요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-4 py-10">
      <div>
        <div className="mb-3 grid h-9 w-9 place-items-center rounded-xl bg-brand text-sm font-bold text-white">Q</div>
        <h1 className="text-3xl font-bold tracking-tight">퀵마트 실험실</h1>
        <p className="mt-2 text-ink2">수업 코드와 조 이름을 입력하면 입장해요.</p>
      </div>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field label="수업 코드">
            <input
              className={`${inputClass} uppercase tracking-widest`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="예: AB3K9Z"
              autoComplete="off"
              required
            />
          </Field>
          <Field label="조 이름">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 1조" maxLength={30} required />
          </Field>
          <Button type="submit" disabled={busy} className="w-full">{busy ? "입장 중…" : "입장하기"}</Button>
          <ErrorText>{error}</ErrorText>
        </form>
      </Card>
      <p className="text-center text-xs text-ink3">
        강사라면 <a className="text-brand underline" href="/admin">강사 로그인</a>
      </p>
    </main>
  );
}

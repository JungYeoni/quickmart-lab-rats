"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorText, Field, inputClass } from "./ui";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error ?? "로그인하지 못했어요.");
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <Field label="강사 비밀번호">
          <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Button type="submit" disabled={busy} className="w-full">{busy ? "확인 중…" : "로그인"}</Button>
        <ErrorText>{error}</ErrorText>
      </form>
    </Card>
  );
}

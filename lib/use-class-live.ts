"use client";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "./supabase/client";
import type { StepKey, StepStatus } from "./steps";

export type LiveClass = { id: string; code: string; title: string; allowed_cases: string[]; max_teams_per_case: number };
export type LiveTeam = { id: string; name: string; case_key: string | null; last_seen_at: string };
export type LiveSteps = Partial<Record<StepKey, StepStatus>>;

/** 수업 정보 + 조 목록 + 스텝 상태를 읽고, 변경이 생기면 Realtime 으로 다시 읽는다. (읽기 전용, anon) */
export function useClassLive(code: string) {
  const [cls, setCls] = useState<LiveClass | null>(null);
  const [teams, setTeams] = useState<LiveTeam[]>([]);
  const [steps, setSteps] = useState<LiveSteps>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (classId: string) => {
    const db = supabaseBrowser();
    const [t, s] = await Promise.all([
      db.from("teams").select("id, name, case_key, last_seen_at").eq("class_id", classId).order("created_at"),
      db.from("step_states").select("step, status").eq("class_id", classId),
    ]);
    if (t.data) setTeams(t.data as LiveTeam[]);
    if (s.data) setSteps(Object.fromEntries(s.data.map((r) => [r.step, r.status])) as LiveSteps);
  }, []);

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof supabaseBrowser>["channel"]> | null = null;
    let cancelled = false;
    const db = supabaseBrowser();
    (async () => {
      const { data, error: err } = await db
        .from("classes").select("id, code, title, allowed_cases, max_teams_per_case").eq("code", code.toUpperCase()).maybeSingle();
      if (cancelled) return;
      if (err || !data) {
        setError("수업을 찾을 수 없어요.");
        setLoading(false);
        return;
      }
      setCls(data as LiveClass);
      await load(data.id);
      if (cancelled) return;
      setLoading(false);
      const filter = `class_id=eq.${data.id}`;
      channel = db
        .channel(`class:${data.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "step_states", filter }, () => load(data.id))
        .on("postgres_changes", { event: "*", schema: "public", table: "teams", filter }, () => load(data.id))
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) db.removeChannel(channel);
    };
  }, [code, load]);

  return { cls, teams, steps, error, loading };
}

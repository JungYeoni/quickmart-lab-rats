/**
 * 스텝 화면이 데이터를 읽고 쓰는 창구. 같은 화면 컴포넌트를 실제 수업(DB + API)과 데모(브라우저 저장 + 데모 API)에 쓴다.
 */
import type { TeamReadout } from "../sim/core/readout";
import { simPhaseOf, type Submission, type SubmissionKind } from "./phase";

export type SubmitInput = { step: string; phase: string; kind: SubmissionKind; payload: Record<string, unknown> };
export type Result<T> = ({ ok: true } & T) | { ok: false; error: string };
export type SimInput = { phase: string; mode: "main" | "aa" };

export interface LabAdapter {
  mode: "remote" | "demo";
  loadSubmissions(): Promise<Submission[]>;
  submit(input: SubmitInput): Promise<Result<{ version: number }>>;
  simulate(input: SimInput): Promise<Result<{ readout: TeamReadout }>>;
}

async function post<T>(url: string, body: unknown): Promise<Result<T>> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "요청을 처리하지 못했어요." };
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: "네트워크 오류예요. 잠시 뒤 다시 시도해 주세요." };
  }
}

/** 실제 수업: 읽기는 anon(latest_submissions 뷰), 쓰기와 시뮬레이션은 서버 API */
export function createRemoteAdapter(code: string, teamId: string): LabAdapter {
  return {
    mode: "remote",
    async loadSubmissions() {
      const { supabaseBrowser } = await import("../supabase/client");
      const { data } = await supabaseBrowser().from("latest_submissions").select("step, phase, kind, payload, version").eq("team_id", teamId);
      return (data ?? []) as Submission[];
    },
    submit: (input) => post("/api/submit", { code, teamId, ...input }),
    simulate: (input) => post("/api/simulate", { code, teamId, ...input }),
  };
}

const demoKey = (caseKey: string) => `lab:demo:${caseKey}`;

function readDemo(caseKey: string): Submission[] {
  try {
    return JSON.parse(localStorage.getItem(demoKey(caseKey)) ?? "[]");
  } catch {
    return [];
  }
}

export function resetDemo(caseKey = "baemin") {
  try {
    localStorage.removeItem(demoKey(caseKey));
  } catch {}
}

/** 데모: 제출을 localStorage 에 두고, 시뮬레이션은 DB 가 필요 없는 /api/demo/simulate 로 돌린다 */
export function createDemoAdapter(caseKey = "baemin"): LabAdapter {
  const simulateDemo = async (phase: string, mode: "main" | "aa", design: Record<string, unknown>) =>
    post<{ readout: TeamReadout }>("/api/demo/simulate", { caseKey, phase, mode, design });

  return {
    mode: "demo",
    async loadSubmissions() {
      return readDemo(caseKey);
    },
    async submit(input) {
      // 서버와 같은 규칙: 시뮬레이션이 거부할 설계는 제출 단계에서 알려준다
      if (input.kind === "design") {
        const r = await simulateDemo(input.phase, "main", input.payload);
        if (!r.ok) return r;
      }
      const subs = readDemo(caseKey);
      const prev = subs.find((s) => s.phase === input.phase && s.kind === input.kind);
      const version = (prev?.version ?? 0) + 1;
      const next = subs.filter((s) => s !== prev).concat({ ...input, version });
      try {
        localStorage.setItem(demoKey(caseKey), JSON.stringify(next));
      } catch {
        return { ok: false, error: "브라우저에 저장하지 못했어요." };
      }
      return { ok: true, version };
    },
    async simulate({ phase, mode }) {
      const sim = simPhaseOf(phase);
      const design = readDemo(caseKey).find((s) => s.phase === sim && s.kind === "design");
      if (!design) return { ok: false, error: "먼저 설계를 제출해 주세요." };
      return simulateDemo(phase, mode, design.payload);
    },
  };
}

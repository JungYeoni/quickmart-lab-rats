import { z } from "zod";
import { CASE_KEYS } from "./cases";
import { STEP_KEYS, STEP_STATUSES } from "./steps";

export const classCode = z.string().trim().min(4).max(12);

export const loginBody = z.object({ password: z.string().min(1).max(200) });

export const createClassBody = z.object({
  title: z.string().trim().min(1, "수업 이름을 입력해 주세요").max(80),
  maxTeamsPerCase: z.number().int().min(1).max(20).default(2),
  allowedCases: z.array(z.enum(CASE_KEYS)).min(1).default([...CASE_KEYS]),
});

export const joinTeamBody = z.object({
  code: classCode,
  name: z.string().trim().min(1, "조 이름을 입력해 주세요").max(30),
});

export const pickCaseBody = z.object({
  code: classCode,
  teamId: z.string().uuid(),
  caseKey: z.enum(CASE_KEYS),
});

export const setStepBody = z.object({
  code: classCode,
  step: z.enum(STEP_KEYS),
  status: z.enum(STEP_STATUSES),
});

export const reviewBody = z.object({
  code: classCode,
  step: z.enum(STEP_KEYS),
  scope: z.enum(["team", "class", "share"]),
  teamId: z.string().uuid().optional(),
});

export const submitBody = z.object({
  code: classCode,
  teamId: z.string().uuid(),
  step: z.enum(STEP_KEYS),
  /** 설계·결정은 Phase('p1'~'p4'), 진단은 'diagnose' */
  phase: z.string().min(1).max(40),
  kind: z.enum(["design", "decision", "note", "diagnosis"]),
  payload: z.record(z.string(), z.unknown()),
});

export const simulateBody = z.object({
  code: classCode,
  teamId: z.string().uuid(),
  /** 플러그인 Phase 키 (예: 'p1_run', 'p1_readout') */
  phase: z.string().min(1).max(40),
  mode: z.enum(["main", "aa"]).default("main"),
});

export const demoSimulateBody = z.object({
  caseKey: z.enum(CASE_KEYS).default("baemin"),
  phase: z.string().min(1).max(40),
  mode: z.enum(["main", "aa"]).default("main"),
  design: z.record(z.string(), z.unknown()),
});

/** 정답 공개 토글(강사) */
export const revealToggleBody = z.object({ code: classCode, reveal: z.boolean() });

/** 조 화면: 공개된 정답·함정 보기, 직소 브리핑 읽기 */
export const teamScopedBody = z.object({ code: classCode, teamId: z.string().uuid() });

/** s8 결정 메모 (공통, 사례와 무관) */
export const memoPayload = z.object({
  learned: z.string().trim().min(1, "가장 많이 배운 실험과 이유를 적어주세요").max(1000, "1,000자 이내로 적어주세요"),
  lesson: z.string().trim().min(1, "다른 조에게 전할 한 가지를 적어주세요").max(500, "500자 이내로 적어주세요"),
});
export type MemoPayload = z.infer<typeof memoPayload>;

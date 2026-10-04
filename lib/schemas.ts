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

import type { CaseKey } from "./cases";

export type CasePickResult =
  | { ok: true }
  | { ok: false; reason: "not_allowed" | "full"; message: string };

/**
 * 사례당 최대 조 수 검사. `otherTeamCases`에는 지금 고르는 조를 뺀 나머지 조들의 선택값을 넣는다.
 * (같은 사례를 다시 누르는 경우도 통과해야 하기 때문)
 */
export function checkCasePick(
  caseKey: CaseKey,
  otherTeamCases: (string | null)[],
  opts: { allowedCases: string[]; maxTeamsPerCase: number },
): CasePickResult {
  if (!opts.allowedCases.includes(caseKey)) {
    return { ok: false, reason: "not_allowed", message: "이번 수업에서 선택할 수 없는 사례예요." };
  }
  const taken = otherTeamCases.filter((c) => c === caseKey).length;
  if (taken >= opts.maxTeamsPerCase) {
    return {
      ok: false,
      reason: "full",
      message: `이 사례는 이미 ${opts.maxTeamsPerCase}개 조가 골랐어요. 다른 사례를 골라주세요.`,
    };
  }
  return { ok: true };
}

export function countByCase(teamCases: (string | null)[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of teamCases) if (c) counts[c] = (counts[c] ?? 0) + 1;
  return counts;
}

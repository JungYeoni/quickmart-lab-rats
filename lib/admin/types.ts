/** 강사 화면 전용 보드 데이터. flags·진짜 효과 기반 값이 들어 있으므로 관리자 API(/api/admin/board)로만 내려간다. */
import type { Flag } from "../sim/core/flags";

export type BoardSubmission = { step: string; phase: string; kind: string; version: number; payload: Record<string, unknown>; at: string };

export type BoardTeam = {
  id: string;
  name: string;
  caseKey: string | null;
  /** (step, phase, kind) 별 최신 제출 */
  submissions: BoardSubmission[];
};

export type BoardComparisonCell = { arm: string; d: number; ci: [number, number]; rel: number; p: number; significant: boolean };

export type BoardRow = {
  teamId: string;
  teamName: string;
  phase: string;
  design: Record<string, unknown>;
  designHash: string;
  primaryLabel: string | null;
  primaryKey: string | null;
  primaryType: "prop" | "mean" | "ratio" | null;
  primary: BoardComparisonCell[];
  achievedPower: number | null;
  srmP: number | null;
  stoppedAt: number | null;
  flags: Flag[];
  at: string;
};

/** 같은 사례·같은 Phase 를 돌린 조들의 비교: 같은 모집단, 다른 설계, 다른 결과 */
export type BoardComparison = { caseKey: string; phase: string; rows: BoardRow[] };

export type FlagBoardRow = { flag: Flag; teams: { id: string; name: string; caseKey: string }[] };

export type BoardData = {
  teams: BoardTeam[];
  comparisons: BoardComparison[];
  /** 개념(플래그) 별로 어느 조가 걸렸는지 */
  flagBoard: FlagBoardRow[];
  generatedAt: string;
};

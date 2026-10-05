/** 후보 랭커 ID (클라이언트·서버 공용, 숨은 값 없음) */
export const CANDIDATE_IDS = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"] as const;
export type CandidateId = (typeof CANDIDATE_IDS)[number];

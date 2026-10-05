/**
 * 숨겨진 진짜 효과 (docs/cases/netflix.md §2). 서버 전용 — 조 화면 번들에 들어가면 안 된다.
 * 보정 노브(±50%)는 CALIB 에 모으고 CALIBRATION.md 에 기록한다.
 */
import type { CandidateId } from "./content-ids";

export type RankerId = "R0" | CandidateId;

export type RankerTruth = {
  /** 인터리빙 선호: 충분 시청 귀속 / 재생 시작 귀속 */
  ilQualified: number;
  ilStart: number;
  /** 정상 상태 주간 시청 시간 상대 효과 */
  hours: number;
  /** 28일 리텐션 정상 상태 효과(절대, 비율 단위) */
  retention: number;
  /** 신규성 효과의 첫날 크기 */
  novelty: number;
};

export const CALIB = {
  noveltyBase: 0.015,
  noveltyClickbait: 0.03,
  noveltyTauDays: 4,
  /** 첫 슬롯을 늘 같은 랭커가 차지할 때 그 랭커 선호에 얹히는 편향 */
  positionBias: 0.015,
  /** 리텐션 효과가 정상 상태에 도달하는 데 걸리는 주 */
  retentionRampWeeks: 10,
  /** 대리 지표(시리즈 2화 이상) 효과 = 시청 시간 상대 효과 × 이 값(절대, 비율 단위). 스펙에 없는 가상 가정 */
  surrogatePerHours: 0.8,
};

const t = (ilQualified: number, ilStart: number, hours: number, retentionPp: number, novelty = CALIB.noveltyBase): RankerTruth => ({
  ilQualified, ilStart, hours, retention: retentionPp / 100, novelty,
});

export const TRUTH: Record<RankerId, RankerTruth> = {
  R0: { ilQualified: 0.5, ilStart: 0.5, hours: 0, retention: 0, novelty: 0 },
  R1: t(0.505, 0.508, 0.002, 0),
  R2: t(0.512, 0.56, 0.004, 0, CALIB.noveltyClickbait),
  R3: t(0.524, 0.515, 0.011, 0.15),
  R4: t(0.518, 0.52, 0.008, 0.08),
  R5: t(0.5, 0.503, 0, 0),
  R6: t(0.49, 0.492, -0.006, -0.05),
  R7: t(0.512, 0.506, 0.005, 0.03),
  R8: t(0.497, 0.501, 0, 0),
};

export const surrogateEffect = (id: RankerId) => TRUTH[id].hours * CALIB.surrogatePerHours;

/** 신규성: d 일째(1부터) 추가 시청 시간 상대 효과 */
export const noveltyAt = (id: RankerId, day: number) => TRUTH[id].novelty * Math.exp(-(day - 1) / CALIB.noveltyTauDays);

/** 일 구간 [d0, d1] (1부터) 평균 신규성 */
export function noveltyAvg(id: RankerId, d0: number, d1: number): number {
  if (d1 < d0) return 0;
  let s = 0;
  for (let d = d0; d <= d1; d++) s += noveltyAt(id, d);
  return s / (d1 - d0 + 1);
}

/** 리텐션 효과: 정상 상태 × min(1, 경과 주 / 10) */
export const retentionObserved = (id: RankerId, weeks: number) => TRUTH[id].retention * Math.min(1, weeks / CALIB.retentionRampWeeks);

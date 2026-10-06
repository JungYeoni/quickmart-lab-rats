/**
 * 디타게팅 규칙 → 발송 감소율과 오프라인 리플레이 (docs/cases/toss.md §2-1 ~ §2-3).
 * 클라이언트에서도 쓴다(설계 화면의 오프라인 리플레이 패널). 그래서 온라인 진짜 효과(ΔC, 습관 침식)는 여기 두지 않는다
 * — 그건 effects.ts(서버 전용)에만 있다. 리플레이는 "억제된 푸시의 과거 클릭을 전부 잃는다"고 가정해 클릭 손실을 과대추정한다.
 */

export const N_VALUES = [2, 3, 4, 5, 6, 8] as const;
export const W_VALUES = [7, 14, 30] as const;
export const C_VALUES = [7, 14, 30] as const;
export const G_VALUES = ["same_service", "same_purpose"] as const;
export type Rule = { N: number; W: number; C: number; G: (typeof G_VALUES)[number] };

/** 기준표(W=14, C=14, G=same_service)의 발송 감소율 */
const BASE_S: Record<number, number> = { 2: 0.34, 3: 0.25, 4: 0.2, 5: 0.16, 6: 0.13, 8: 0.09 };
/** 억제된 푸시의 과거 CTR */
const CTR_SUPP: Record<number, number> = { 2: 0.025, 3: 0.016, 4: 0.012, 5: 0.01, 6: 0.009, 8: 0.008 };

export const S_CAP = 0.55;
export const BASE_CTR = 0.121;

/** 세그먼트 구성 (활동성): 사용자 비중, 주당 수신 푸시, 푸시 단위 CTR, 억제 집중 배수 */
export const SEGMENTS = [
  { key: "heavy", label: "헤비", share: 0.3, sends: 16, ctr: 0.145, supp: 1.1, au: 0.93 },
  { key: "medium", label: "미디엄", share: 0.45, sends: 8, ctr: 0.105, supp: 1.0, au: 0.66 },
  { key: "light", label: "라이트", share: 0.25, sends: 4, ctr: 0.065, supp: 0.8, au: 0.28 },
] as const;
export type SegKey = (typeof SEGMENTS)[number]["key"];

/** 발송 가중 기준 풀링 CTR (대조군, 약 12.1%) */
export const POOLED_CTR = SEGMENTS.reduce((s, g) => s + g.share * g.sends * g.ctr, 0) / SEGMENTS.reduce((s, g) => s + g.share * g.sends, 0);

/** 세그먼트별 억제 배수를 발송 가중 평균 1 로 정규화하는 상수 */
const SUPP_NORM = SEGMENTS.reduce((s, g) => s + g.share * g.sends * g.supp, 0) / SEGMENTS.reduce((s, g) => s + g.share * g.sends, 0);

export function sendReduction(r: Rule): number {
  const w = r.W === 7 ? 0.8 : r.W === 30 ? 1.12 : 1;
  const c = r.C === 7 ? 0.75 : r.C === 30 ? 1.15 : 1;
  const g = r.G === "same_purpose" ? 1.2 : 1;
  return Math.min(S_CAP, (BASE_S[r.N] ?? 0) * w * c * g);
}

export const ctrSuppressed = (N: number) => CTR_SUPP[N] ?? 0.01;

/** 세그먼트별 발송 감소율. 발송 가중 평균이 sendReduction 과 같다. */
export function segmentReduction(s: number, seg: SegKey): number {
  const g = SEGMENTS.find((x) => x.key === seg)!;
  return Math.min(0.9, (s * g.supp) / SUPP_NORM);
}

export type ReplayResult = {
  /** 발송 감소율 (오프라인과 온라인이 거의 같다) */
  s: number;
  /** 오프라인 클릭 손실 추정: 억제된 푸시의 과거 클릭을 전부 잃는다고 가정 (대조군 클릭 대비 비율) */
  clickLossOffline: number;
  /** 억제만 하고 남은 푸시의 반응은 그대로라고 가정했을 때의 CTR */
  ctrOffline: number;
  bySegment: { key: SegKey; label: string; s: number }[];
};

export function replay(r: Rule): ReplayResult {
  const s = sendReduction(r);
  const loss = (s * ctrSuppressed(r.N)) / BASE_CTR;
  return {
    s,
    clickLossOffline: loss,
    ctrOffline: (POOLED_CTR * (1 - loss)) / (1 - s),
    bySegment: SEGMENTS.map((g) => ({ key: g.key, label: g.label, s: segmentReduction(s, g.key) })),
  };
}

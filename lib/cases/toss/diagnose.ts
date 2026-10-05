/**
 * s1_diagnose 의 관찰 데이터 (docs/cases/toss.md §1-2). 대조군 과거 데이터이고 모두 교육용 가상 수치다.
 * 풀링 수치 4개와 층화 기울기(−0.08%p)는 스펙 값. 층화 표의 목적 비중과 중요도 막대는 스펙에 값이 없어 가상으로 채웠다.
 */
import { SEGMENTS } from "./replay";

/** 주간 수신량 구간별 CTR (풀링) */
export const POOLED_BINS = [
  { label: "1~3개", mid: 2, ctr: 0.158 },
  { label: "4~7개", mid: 5.5, ctr: 0.129 },
  { label: "8~15개", mid: 11.5, ctr: 0.104 },
  { label: "16개 이상", mid: 20, ctr: 0.081 },
] as const;

/** 최소제곱 기울기 (%p / 푸시 1개) */
export function slope(points: readonly { mid: number; ctr: number }[]): number {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.mid, 0) / n;
  const my = points.reduce((s, p) => s + p.ctr, 0) / n;
  const sxy = points.reduce((s, p) => s + (p.mid - mx) * (p.ctr - my), 0);
  const sxx = points.reduce((s, p) => s + (p.mid - mx) ** 2, 0);
  return (sxy / sxx) * 100;
}

/** 같은 세그먼트·같은 목적 안에서 주당 푸시 1개 추가 시 CTR 변화 (%p). 이게 진짜 피로 효과다. */
export const STRATIFIED_SLOPE_PP = -0.08;
export const POOLED_SLOPE_PP = slope(POOLED_BINS);

export const PURPOSES = [
  { key: "info", label: "정보성", share: 0.35, mult: 1.6 },
  { key: "promo", label: "프로모션", share: 0.45, mult: 0.6 },
  { key: "retention", label: "리텐션", share: 0.2, mult: 0.9 },
] as const;
const MULT_NORM = PURPOSES.reduce((s, p) => s + p.share * p.mult, 0);

/** 활동성별 프로모션 비중 (가상): 많이 받는 사람일수록 프로모션을 많이 받는다 */
const PROMO_SHARE: Record<string, number> = { heavy: 0.5, medium: 0.45, light: 0.3 };

export const STRATA = SEGMENTS.map((g) => ({
  key: g.key,
  label: g.label,
  sends: g.sends,
  promoShare: PROMO_SHARE[g.key],
  ctrByPurpose: PURPOSES.map((p) => ({ key: p.key, label: p.label, ctr: (g.ctr * p.mult) / MULT_NORM })),
}));

/** SHAP 스타일 피처 중요도 (가상) */
export const IMPORTANCE = [
  { feature: "최근 푸시 빈도", value: 0.31 },
  { feature: "최근 클릭 이력", value: 0.27 },
  { feature: "카테고리 적합도", value: 0.24 },
  { feature: "수신 시각", value: 0.18 },
];

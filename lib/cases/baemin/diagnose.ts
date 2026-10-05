/**
 * s1_diagnose 의 관찰 데이터(이탈 퍼널 대시보드). 대조군 퍼널 수치는 population.ts 와 같고,
 * 최소금액 미달 비중과 재방문 분포는 스펙에 값이 없어 가상으로 채웠다. 모두 교육용 가상 데이터.
 * 관찰 데이터라서 "바를 보여주면 이탈이 줄 것"을 이 데이터만으로는 말할 수 없다(교란이 섞여 있다).
 */
import { ABANDON, CART_ADD, MIN_ORDER_KRW, TYPE_KEYS } from "./population";

export const FUNNEL_BY_TYPE = TYPE_KEYS.map((t) => ({
  type: t,
  cartAdd: CART_ADD[t],
  abandon: ABANDON[t],
  /** 이탈한 장바구니 중 최소주문금액(15,000원)에 못 미친 비중 (가상) */
  belowMin: { general: 0.64, first_order: 0.71, member: 0.52 }[t],
}));

/** 장바구니 이탈 전 재방문 횟수별: 사용자 비중과 주문 비율 (가상). 재방문이 많은 사람은 원래 구매 의도가 높다. */
export const REVISIT_ROWS = [
  { label: "0회", share: 0.38, orderRate: 0.09 },
  { label: "1회", share: 0.27, orderRate: 0.14 },
  { label: "2회", share: 0.18, orderRate: 0.22 },
  { label: "3회 이상", share: 0.17, orderRate: 0.31 },
];

export const MIN_ORDER = MIN_ORDER_KRW;

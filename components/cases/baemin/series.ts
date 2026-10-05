import type { Series } from "@/components/readout/TimeSeries";

/** 배민 Readout 의 일별 시계열 */
export const baeminSeries: Series[] = [
  { key: "abandon", label: "장바구니 이탈률", value: (a) => (a.cart ? a.abandoned / a.cart : NaN), pct: true },
  { key: "conv", label: "주문전환율", value: (a) => (a.users ? a.orders / a.users : NaN), pct: true },
  { key: "users", label: "일 사용자 수", value: (a) => a.users, pct: false },
];

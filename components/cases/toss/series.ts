import type { Series } from "@/components/readout/TimeSeries";

/** 토스 Readout 의 주간 시계열 */
export const tossSeries: Series[] = [
  { key: "ctr", label: "푸시 CTR", value: (a) => a.ctr, pct: true, digits: 2 },
  { key: "clicks_per_user", label: "인당 주간 클릭 수", value: (a) => a.clicks_per_user, pct: false, digits: 2 },
  { key: "sends_per_user", label: "인당 주간 발송 수", value: (a) => a.sends_per_user, pct: false, digits: 1 },
  { key: "light_au", label: "라이트 사용자 앱 오픈 AU", value: (a) => a.light_au, pct: true, digits: 2 },
  { key: "au", label: "전체 앱 오픈 AU", value: (a) => a.au, pct: true, digits: 2 },
];

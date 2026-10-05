import type { Series } from "@/components/readout/TimeSeries";

/** 넷플릭스 결선 Readout 의 주별 시계열 (스크리닝은 전용 패널의 일별 선호 추이를 쓴다) */
export const netflixSeries: Series[] = [
  { key: "hours", label: "주간 평균 시청 시간(원시, 시간)", value: (a) => a.hours, pct: false, digits: 2 },
];

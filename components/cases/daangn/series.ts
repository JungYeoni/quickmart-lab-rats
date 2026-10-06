import type { Series } from "@/components/readout/TimeSeries";

/** 당근 Readout 의 일별 시계열. 거래후기(p1·p2)와 검색 노출(p3)의 데이터 키가 달라서, 이 단계에 없는 것은 자동으로 빠진다. */
export const daangnSeries: Series[] = [
  { key: "rate", label: "후기 작성률", value: (a) => (a.users ? a.success / a.users : NaN), pct: true, digits: 2 },
  { key: "short", label: "짧은 후기 비율", value: (a) => (a.submitted ? a.short / a.submitted : NaN), pct: true, digits: 1 },
  { key: "create", label: "게시글 작성률", value: (a) => (a.users && a.creators !== undefined ? a.creators / a.users : NaN), pct: true, digits: 2 },
  { key: "chat", label: "검색 → 채팅 전환율", value: (a) => (a.users && a.chats !== undefined ? a.chats / a.users : NaN), pct: true, digits: 2 },
  { key: "sell", label: "판매완료율", value: (a) => (a.listings ? a.sold / a.listings : NaN), pct: true, digits: 2 },
  { key: "users", label: "일 사용자 수", value: (a) => a.users, pct: false },
];

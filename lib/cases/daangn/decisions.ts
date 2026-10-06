import type { DecisionDef } from "../types";

export const decisions: Record<string, DecisionDef> = {
  p1: {
    options: [
      { id: "ship", label: "배포", desc: "이번 결과를 근거로 새 화면을 배포해요." },
      { id: "discard_fix_platform", label: "결과 폐기하고 플랫폼부터 고친 뒤 재실험", desc: "이 결과는 믿지 않고, 실험 플랫폼의 문제를 먼저 고쳐요." },
      { id: "ship_excluding_new", label: "신규 사용자만 빼고 재분석해서 배포", desc: "문제가 의심되는 신규 사용자를 빼고 다시 분석한 뒤 배포해요." },
    ],
  },
  p2: {
    options: [
      { id: "ship", label: "배포", desc: "재실험 결과를 근거로 새 화면을 배포해요." },
      { id: "improve_quality_rerun", label: "품질 보완 후 재실험", desc: "후기 품질 하락을 보완하는 장치를 넣고 다시 확인해요." },
      { id: "ship_with_monitoring", label: "배포 + 품질 모니터링", desc: "배포하고 후기 품질 지표를 계속 지켜봐요." },
    ],
  },
  p3: {
    options: [
      { id: "ship_default", label: "기본값으로 배포", desc: "거래완료 게시글을 검색 결과에 기본으로 노출해요." },
      { id: "no_ship", label: "배포 안 함", desc: "지금은 기본 노출을 바꾸지 않아요." },
      { id: "ship_with_toggle", label: "배포 + \"판매완료 글 숨기기\" 토글 제공", desc: "기본으로 보여주되 원치 않는 사용자가 끌 수 있게 해요." },
      { id: "rerun_cluster", label: "동네(클러스터) 배정으로 재실험", desc: "시장 효과까지 보도록 동네 단위로 다시 실험해요." },
    ],
  },
};

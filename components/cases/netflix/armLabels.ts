import type { ArmLabels } from "@/components/readout/format";

/** 결선 A/B 의 그룹 이름: A 는 현행 R0, B·C·D 는 설계에서 고른 결선 후보(고른 순서) */
export function netflixArmLabels(panels: Record<string, unknown>): ArmLabels {
  const finalists = (panels.meta as { finalists?: string[] } | undefined)?.finalists;
  if (!finalists) return {};
  return Object.fromEntries(finalists.map((id, i) => [["B", "C", "D"][i], id]));
}

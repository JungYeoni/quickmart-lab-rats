import type { ReactNode } from "react";

/** 사례 전용 패널을 감싸는 접이식 영역 (공통) */
export function PanelSection({ title, hint, open, children }: { title: string; hint?: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="rounded-2xl border border-line bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
      {hint && <p className="mt-1 text-xs text-ink3">{hint}</p>}
      <div className="mt-3 overflow-x-auto">{children}</div>
    </details>
  );
}

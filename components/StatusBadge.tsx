import { Badge } from "./ui";
import { STATUS_LABELS, type StepStatus } from "@/lib/steps";

const TONE = { locked: "draft", open: "run", closed: "done" } as const;

export function StatusBadge({ status = "locked" }: { status?: StepStatus }) {
  return <Badge tone={TONE[status]}>{STATUS_LABELS[status]}</Badge>;
}

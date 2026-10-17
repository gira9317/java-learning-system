import type { StageStatus, SubmissionKind } from "@/api/submissions-api";

const label: Record<StageStatus, string> = {
  none: "未提出",
  pending: "レビュー待ち",
  approved: "承認",
  rejected: "差し戻し",
};

const color: Record<StageStatus, string> = {
  none: "border border-hairline text-ink-muted-48",
  pending: "bg-primary text-white",
  approved: "bg-success text-white",
  rejected: "bg-danger text-white",
};

export function SubmissionChip({ status }: { status: StageStatus | null }) {
  const s = status ?? "none";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 type-fine ${color[s]}`}>{label[s]}</span>;
}

export const kindLabel: Record<SubmissionKind, string> = {
  flow: "フロー図",
  code: "コード",
};

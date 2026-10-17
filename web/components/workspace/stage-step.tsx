import type { StageStatus } from "@/api/submissions-api";

const stageLabel: Record<StageStatus, string> = {
  none: "未提出",
  pending: "レビュー待ち",
  approved: "承認済み",
  rejected: "要再提出",
};

/** 「フロー図: 承認済み」のような、提出の段階の表示 */
export function StageStep({ label, status }: { label: string; status: StageStatus }) {
  const color =
    status === "approved"
      ? "bg-success text-white"
      : status === "pending"
        ? "bg-primary text-white"
        : status === "rejected"
          ? "bg-danger text-white"
          : "border border-hairline text-ink-muted-48";
  return (
    <span className="flex items-center gap-2 type-fine sm:type-caption">
      <span className="text-ink-muted-80">{label}</span>
      <span className={`rounded-full px-2.5 py-0.5 type-fine ${color}`}>{stageLabel[status]}</span>
    </span>
  );
}

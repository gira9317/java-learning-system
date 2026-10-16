import { CheckIcon, LockIcon } from "./icons";
import { statusLabel, type LessonStatus } from "@/lib/lessons";

export function StatusChip({ status }: { status: LessonStatus }) {
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-0.5 type-fine text-white">
        <CheckIcon size={12} strokeWidth={2.4} />
        {statusLabel[status]}
      </span>
    );
  if (status === "in-progress")
    return (
      <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 type-fine text-white">
        {statusLabel[status]}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-0.5 type-fine text-ink-muted-48">
      <LockIcon size={11} />
      {statusLabel[status]}
    </span>
  );
}

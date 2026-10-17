import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { StatusChip } from "@/components/status-chip";
import { pad, type Lesson } from "@/lib/lessons";

/**
 * コード演習の 2 つのページ（教材 / 演習）で共通の見出しバー。
 * レッスン名・進み具合・「教材 | 演習」の切り替え・前後のレッスンへの移動を持つ。
 */
export function LessonHeader({
  lesson,
  lessons,
  active,
}: {
  lesson: Lesson;
  lessons: Lesson[];
  active: "material" | "exercise";
}) {
  const total = lessons.length;
  const index = lessons.findIndex((l) => l.id === lesson.id);
  const prev = lessons[index - 1];
  const next = lessons[index + 1];
  const completed = lesson.status === "completed";

  const tabs = [
    { key: "material", label: "教材", href: `/lessons/${lesson.id}` },
    { key: "exercise", label: "演習", href: `/lessons/${lesson.id}/exercise` },
  ] as const;

  return (
    <div className="frosted z-20 flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-black/[0.08] px-4 sm:px-6">
      <div className="flex min-w-0 items-baseline gap-3">
        <span className="hidden type-caption shrink-0 text-ink-muted-48 sm:inline">
          Lesson {pad(lesson.id)} / {total}
        </span>
        <h1 className="truncate type-body-strong sm:type-tagline">
          <span className="text-ink-muted-48 sm:hidden">{pad(lesson.id)} </span>
          {lesson.title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <nav aria-label="教材と演習の切り替え" className="grid grid-cols-2 gap-1 rounded-full bg-parchment p-1">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={active === tab.key ? "page" : undefined}
              className={`btn min-h-8 rounded-full px-4 type-caption ${
                active === tab.key
                  ? "border border-hairline bg-canvas font-semibold text-ink"
                  : "border border-transparent text-ink-muted-80"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-[3px] lg:flex" aria-label={`全${total}レッスン中 ${index + 1} 番目`}>
          {lessons.map((l) => (
            <span
              key={l.id}
              className={`h-1 w-4 rounded-full ${
                l.id === lesson.id ? "bg-primary" : l.status === "completed" ? "bg-ink" : "bg-chip"
              }`}
            />
          ))}
        </div>
        <span className="hidden md:inline-flex">
          <StatusChip status={completed ? "completed" : "in-progress"} />
        </span>

        <nav className="hidden items-center gap-1.5 sm:flex" aria-label="前後のレッスン">
          {prev ? (
            <Link href={`/lessons/${prev.id}`} className="btn btn-icon size-8" aria-label="前のレッスン">
              <ChevronLeftIcon size={15} />
            </Link>
          ) : (
            <span className="btn btn-icon size-8 opacity-40" aria-hidden>
              <ChevronLeftIcon size={15} />
            </span>
          )}
          {next && next.status !== "locked" ? (
            <Link href={`/lessons/${next.id}`} className="btn btn-icon size-8" aria-label="次のレッスン">
              <ChevronRightIcon size={15} />
            </Link>
          ) : (
            <span className="btn btn-icon size-8 opacity-40" aria-hidden>
              <ChevronRightIcon size={15} />
            </span>
          )}
        </nav>
      </div>
    </div>
  );
}

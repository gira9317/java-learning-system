"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { getNotifications, readNotification, type NotificationFeed } from "@/api/notifications-api";
import { pad } from "@/lib/lessons";
import { REVIEW_UPDATED_EVENT } from "@/lib/review-events";
import { usePathname } from "next/navigation";
import { BellIcon } from "./icons";

const POLL_MS = 30_000;
const dateFormat = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });

export function ReviewNotifications() {
  const router = useRouter();
  const pathname = usePathname();
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const sequence = useRef(0);
  const reviewVersion = useRef<string | null>(null);
  const headingId = useId();

  useEffect(() => {
    let active = true;
    async function load() {
      const version = ++sequence.current;
      try {
        const next = await getNotifications();
        if (active && version === sequence.current) {
          const changed = reviewVersion.current === null
            ? next.notifications.length > 0
            : reviewVersion.current !== next.review_version;
          reviewVersion.current = next.review_version;
          setFeed(next);
          setError(null);
          if (changed) {
            // 演習中はMonacoを含むページを再取得せず、提出状態のみ更新する。
            window.dispatchEvent(new Event(REVIEW_UPDATED_EVENT));
            if (!/^\/lessons\/\d+\/exercise$/.test(pathname)) router.refresh();
          }
        }
      } catch {
        if (active && version === sequence.current) setError("通知を取得できませんでした。次の更新で再試行します。");
      }
    }
    function refresh() { if (document.visibilityState === "visible") void load(); }
    function opened() { if (details.current?.open) refresh(); }
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !details.current?.contains(event.target) && details.current) details.current.open = false;
    }
    void load();
    const timer = setInterval(refresh, POLL_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    document.addEventListener("pointerdown", outside);
    const element = details.current;
    element?.addEventListener("toggle", opened);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      document.removeEventListener("pointerdown", outside);
      element?.removeEventListener("toggle", opened);
    };
  }, [router,pathname]);

  async function markRead(id: string) {
    ++sequence.current; // 既読前に開始した取得結果で、未読表示へ戻さない。
    setReading(id);
    try {
      const result = await readNotification(id);
      ++sequence.current;
      setFeed((current) => {
        if (!current) return current;
        const wasUnread = current.notifications.some((item) => item.id === id && !item.review_read_at);
        return {
          ...current,
          unread_count: Math.max(0, current.unread_count - (wasUnread ? 1 : 0)),
          notifications: current.notifications.map((item) => item.id === id ? { ...item, review_read_at: result.notification.review_read_at } : item),
        };
      });
      setError(null);
    } catch { setError("既読にできませんでした。もう一度お試しください。"); }
    finally { setReading(null); }
  }

  const count = feed?.unread_count ?? 0;
  return (
    <details ref={details} className="relative" onKeyDown={(event) => {
      if (event.key === "Escape" && details.current) {
        details.current.open = false;
        details.current.querySelector("summary")?.focus();
      }
    }}>
      <summary className="relative flex size-9 cursor-pointer list-none items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white [&::-webkit-details-marker]:hidden" aria-label={`レビュー結果の通知${count ? `、未読${count}件` : ""}`}>
        <BellIcon size={19} />
        {count > 0 && <span className="absolute -top-0.5 -right-0.5 grid min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4.5 text-white" aria-hidden>{count > 99 ? "99+" : count}</span>}
      </summary>
      <section aria-labelledby={headingId} className="fixed top-12 right-4 z-50 w-[calc(100vw-2rem)] max-w-96 overflow-hidden rounded-lg border border-hairline bg-canvas text-ink shadow-lg md:absolute md:top-11 md:right-0 md:w-96">
        <header className="border-b border-hairline px-4 py-3">
          <h2 id={headingId} className="type-body-strong">レビュー結果 <span className="type-caption text-ink-muted-48">未読 {count}件</span></h2>
          <p className="type-fine mt-1 text-ink-muted-48">未読を優先して最大30件表示します。</p>
        </header>
        {error && <p role="alert" className="px-4 py-3 type-caption text-danger">{error}</p>}
        {!feed && !error && <p role="status" className="px-4 py-6 type-caption text-ink-muted-48">通知を確認しています…</p>}
        {feed?.notifications.length === 0 && <p className="px-4 py-6 type-caption text-ink-muted-48">まだレビュー結果はありません。提出が承認・差し戻しされると、ここに届きます。</p>}
        <ul className="max-h-[min(65dvh,30rem)] divide-y divide-hairline overflow-y-auto overscroll-contain">
          {feed?.notifications.map((item) => (
            <li key={item.id} className={!item.review_read_at ? "bg-primary/5" : undefined}>
              <Link href={`/lessons/${item.lesson_id}/exercise?question=${item.question_no}`} className="block px-4 pt-4 pb-2 hover:bg-pearl focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary-focus" onClick={() => {
                if (!item.review_read_at) void markRead(item.id);
                if (details.current) details.current.open = false;
              }}>
                <p className={`type-caption-strong ${item.status === "approved" ? "text-success" : "text-danger"}`}>{!item.review_read_at && <span className="mr-2">●</span>}{item.kind === "flow" ? "フロー図" : "コード"}が{item.status === "approved" ? "承認されました" : "差し戻されました"}</p>
                <p className="type-caption-strong mt-2">Lesson {pad(item.lesson_number)} · 第{item.question_no}問</p>
                <p className="type-caption mt-1">{item.lesson_title}</p>
                {item.review_comment && <p className="type-caption mt-2 whitespace-pre-wrap break-words text-ink-muted-80">{item.review_comment}</p>}
                <p className="type-fine mt-2 text-ink-muted-48"><time dateTime={item.reviewed_at}>{dateFormat.format(new Date(item.reviewed_at))}</time> · 問題を開く</p>
              </Link>
              {!item.review_read_at && <button type="button" className="mx-4 mb-3 cursor-pointer py-1 type-fine text-link underline underline-offset-4 disabled:cursor-default disabled:opacity-50" disabled={reading !== null} onClick={() => void markRead(item.id)}>{reading === item.id ? "更新中…" : "既読にする"}</button>}
            </li>
          ))}
        </ul>
      </section>
    </details>
  );
}

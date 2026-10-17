"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAdminSummary } from "@/api/admin-api";
import { logout, type User } from "@/api/auth-api";
import { accountDestination } from "@/lib/account-navigation";
import { CupIcon } from "./icons";
import { ReviewNotifications } from "./review-notifications";

export type Variant = "marketing" | "app" | "admin" | "minimal";

const links: Record<Variant, { href: string; label: string }[]> = {
  marketing: [
    { href: "/#features", label: "特長" },
    { href: "/#how", label: "学び方" },
    { href: "/#curriculum", label: "カリキュラム" },
  ],
  app: [
    { href: "/home", label: "ホーム" },
    { href: "/lectures", label: "講義" },
    { href: "/curriculm", label: "コード演習" },
  ],
  admin: [
    { href: "/admin", label: "レビュー" },
    { href: "/admin/users", label: "受講者" },
    { href: "/admin/lectures", label: "講義" },
  ],
  minimal: [],
};

// レビュー待ちの件数を取り直す間隔（管理画面のバッジ）
const SUMMARY_INTERVAL_MS = 30_000;

// global-nav: 44px の真っ黒なバー。モバイルではリンクをハンバーガーメニューにたたむ。
export function GlobalNavClient({ variant = "app", user = null, pending = false }: { variant?: Variant; user?: User | null; pending?: boolean }) {
  const [open, setOpen] = useState(false);
  const items = links[variant];
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const signedIn = user !== null;
  const destination = accountDestination(user);

  // 管理画面では、レビュー待ちの件数を定期的に取り直してバッジに出す（アプリ内の通知）
  useEffect(() => {
    if (variant !== "admin") return;
    const load = () => getAdminSummary().then((s) => setPendingCount(s.pendingCount), () => {});
    load();
    const timer = setInterval(load, SUMMARY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [variant]);

  async function signOut() {
    setOpen(false);
    await logout().catch(() => {});
    // サインイン状態が変わったので、ページ読み込みとして移動する（router.replace は使わない）。
    // クライアント側のルーターは「/login → 別ページへ転送」という前の結果を覚えていることがあり、
    // それを使い回されると古い状態のページに戻されてしまう。
    window.location.replace("/login");
  }

  return (
    <header className="sticky top-0 z-40 shrink-0 bg-black text-white">
      <nav className="mx-auto flex h-11 max-w-[1440px] items-center justify-between px-4 sm:px-6">
        <Link
          href={variant === "app" ? "/home" : variant === "admin" ? "/admin" : "/"}
          className="flex items-center gap-2 text-[13px] font-semibold tracking-[-0.12px]"
          onClick={() => setOpen(false)}
        >
          <CupIcon size={17} />
          Java Training
        </Link>

        <ul className="hidden items-center gap-7 text-[12px] tracking-[-0.12px] text-white/80 md:flex">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="flex items-center gap-1.5">
                {item.label}
                {item.href === "/admin" && <PendingBadge count={pendingCount} />}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1 text-[12px] text-white/80">
          {user?.role === "user" && !user.mustChangePassword && <ReviewNotifications key={user.id} />}
          {variant === "marketing" && !pending && (
            <Link href={destination.href} className="btn rounded-full px-3 py-1.5 text-white">
              {destination.label}
            </Link>
          )}
          {signedIn && (
            <>
              <button type="button" onClick={signOut} className="hidden cursor-pointer px-2 md:inline">
                サインアウト
              </button>
              <span
                className="ml-2 grid size-7 place-items-center rounded-full bg-white/15 text-[11px] text-white"
                aria-label={user ? `${user.name}（${user.employeeNo}）` : "サインイン中のユーザー"}
                title={user ? `${user.name}（${user.employeeNo}）` : undefined}
              >
                {user?.name.slice(0, 1) ?? ""}
              </span>
            </>
          )}
          {items.length > 0 && (
            <button
              type="button"
              className="btn -mr-2 size-11 md:hidden"
              aria-expanded={open}
              aria-controls="global-menu"
              aria-label={open ? "メニューを閉じる" : "メニューを開く"}
              onClick={() => setOpen((o) => !o)}
            >
              <span className="relative block h-3 w-4" aria-hidden>
                <span className={`absolute left-0 h-px w-4 bg-white transition-transform ${open ? "top-1.5 rotate-45" : "top-0.5"}`} />
                <span className={`absolute left-0 h-px w-4 bg-white transition-transform ${open ? "top-1.5 -rotate-45" : "top-2.5"}`} />
              </span>
            </button>
          )}
        </div>
      </nav>

      {open && (
        <div id="global-menu" className="border-t border-white/10 px-4 pt-2 pb-6 md:hidden">
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block border-b border-white/10 py-3.5 type-tagline"
                  onClick={() => setOpen(false)}
                >
                  <span className="flex items-center gap-2">
                    {item.label}
                    {item.href === "/admin" && <PendingBadge count={pendingCount} />}
                  </span>
                </Link>
              </li>
            ))}
            {signedIn && (
              <li>
                <button type="button" className="block w-full cursor-pointer py-3.5 text-left type-body text-white/60" onClick={signOut}>
                  サインアウト
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}

function PendingBadge({ count }: { count: number | null }) {
  if (!count) return null;
  return (
    <span
      className="grid min-w-[18px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-[18px] text-white"
      aria-label={`レビュー待ち ${count} 件`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

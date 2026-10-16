"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMe, logout, type User } from "@/api/auth-api";
import { CupIcon } from "./icons";

type Variant = "marketing" | "app" | "minimal";

const links: Record<Variant, { href: string; label: string }[]> = {
  marketing: [
    { href: "/#features", label: "特長" },
    { href: "/#how", label: "学び方" },
    { href: "/#curriculum", label: "カリキュラム" },
  ],
  app: [
    { href: "/home", label: "ホーム" },
    { href: "/home#curriculum", label: "カリキュラム" },
    { href: "/lessons/3", label: "学習を再開" },
  ],
  minimal: [],
};

// global-nav: 44px の真っ黒なバー。モバイルではリンクをハンバーガーメニューにたたむ。
export function GlobalNav({ variant = "app" }: { variant?: Variant }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = links[variant];
  const [user, setUser] = useState<User | null>(null);

  // アバターに出すため、サインイン中のユーザーを取る（未サインインなら何も出さない）
  useEffect(() => {
    if (variant !== "app") return;
    getMe().then(setUser, () => setUser(null));
  }, [variant]);

  async function signOut() {
    setOpen(false);
    await logout().catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 shrink-0 bg-black text-white">
      <nav className="mx-auto flex h-11 max-w-[1440px] items-center justify-between px-4 sm:px-6">
        <Link
          href={variant === "app" ? "/home" : "/"}
          className="flex items-center gap-2 text-[13px] font-semibold tracking-[-0.12px]"
          onClick={() => setOpen(false)}
        >
          <CupIcon size={17} />
          Java Training
        </Link>

        <ul className="hidden items-center gap-7 text-[12px] tracking-[-0.12px] text-white/80 md:flex">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1 text-[12px] text-white/80">
          {variant === "marketing" && (
            <Link href="/login" className="btn rounded-full px-3 py-1.5 text-white">
              サインイン
            </Link>
          )}
          {variant === "app" && (
            <>
              <button type="button" onClick={signOut} className="hidden px-2 md:inline">
                サインアウト
              </button>
              <span
                className="ml-2 grid size-7 place-items-center rounded-full bg-white/15 text-[11px] text-white"
                aria-label={user ? `${user.name}（${user.employeeNo}）` : "受講者"}
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
                  {item.label}
                </Link>
              </li>
            ))}
            {variant === "app" && (
              <li>
                <button type="button" className="block w-full py-3.5 text-left type-body text-white/60" onClick={signOut}>
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

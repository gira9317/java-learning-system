import type { Metadata } from "next";
import { Suspense } from "react";
import { getSolvedEggs } from "@/api/easter-api";
import { GlobalNav } from "@/components/global-nav";
import { getCookieHeader, requireUser } from "@/lib/session";
import { FlagForm } from "./flag-form";

export const metadata: Metadata = {
  title: "フラグ — Java Training",
  robots: { index: false },
};

// イースターエッグ（CTF 風の隠し要素）のゴール。見つけたフラグを入力すると、バッジがもらえる
export default function FlagPage() {
  return (
    <>
      <GlobalNav variant="app" />
      <main className="flex flex-1 flex-col bg-canvas px-4 pt-12 pb-16 sm:justify-center sm:bg-parchment sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-100 sm:max-w-115 sm:rounded-lg sm:border sm:border-hairline sm:bg-canvas sm:px-12 sm:py-12">
          <div className="text-center">
            <h1 className="type-display-md">フラグを入力</h1>
            <p className="type-body mt-2 text-ink-muted-80">
              見つけたフラグ <code className="font-mono">JAVA{"{...}"}</code> を入力すると、バッジがもらえます。
            </p>
          </div>
          <Suspense fallback={<div className="mt-10 h-48 animate-pulse rounded-lg bg-chip" aria-busy />}>
            <FlagContent />
          </Suspense>
        </div>
      </main>
    </>
  );
}

async function FlagContent() {
  await requireUser();
  const solved = await getSolvedEggs({ cookie: await getCookieHeader() });
  return <FlagForm initialSolved={solved} />;
}

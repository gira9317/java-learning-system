import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GlobalNav } from "@/components/global-nav";
import { CupIcon } from "@/components/icons";
import { accountDestination } from "@/lib/account-navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "サインイン — Java Training",
};

export default function LoginPage() {
  return (
    <>
      {/* サインイン済みなら、フォームを出さずに役割に合ったページへ移す */}
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <GlobalNav variant="minimal" />
      <main className="flex flex-1 flex-col bg-canvas px-4 pt-12 pb-16 sm:justify-center sm:bg-parchment sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-100 sm:max-w-115 sm:rounded-lg sm:border sm:border-hairline sm:bg-canvas sm:px-12 sm:py-12">
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-ink text-white">
              <CupIcon size={26} />
            </span>
            <h1 className="type-display-md mt-6">サインイン</h1>
            <p className="type-body mt-2 text-ink-muted-80">
              Java Training で学習を始めましょう。
            </p>
          </div>

          <LoginForm />

          <p className="type-caption mt-10 border-t border-hairline pt-6 text-center text-ink-muted-80">
            アカウントやパスワードがわからない場合は、
            <br className="sm:hidden" />
            研修担当者にお問い合わせください。
          </p>
        </div>
        <p className="type-caption mt-8 text-center">
          <Link href="/" className="text-link">
            Java Training について ›
          </Link>
        </p>
      </main>
    </>
  );
}

async function RedirectIfSignedIn() {
  const user = await getCurrentUser();
  if (user) redirect(accountDestination(user).href);
  return null;
}

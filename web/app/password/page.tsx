import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GlobalNav } from "@/components/global-nav";
import { CupIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/session";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = {
  title: "パスワードの変更 — Java Training",
};

export default function PasswordPage() {
  return (
    <>
      <GlobalNav variant="minimal" />
      <main className="flex flex-1 flex-col bg-canvas px-4 pt-12 pb-16 sm:justify-center sm:bg-parchment sm:px-6 sm:py-20">
        <div className="mx-auto w-full max-w-100 sm:max-w-115 sm:rounded-lg sm:border sm:border-hairline sm:bg-canvas sm:px-12 sm:py-12">
          <div className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-ink text-white">
              <CupIcon size={26} />
            </span>
            <h1 className="type-display-md mt-6">パスワードの変更</h1>
            <Suspense
              fallback={
                <p className="type-body mt-2 text-ink-muted-80">&nbsp;</p>
              }
            >
              <Lead />
            </Suspense>
          </div>

          <PasswordForm />
        </div>
      </main>
    </>
  );
}

async function Lead() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <p className="type-body mt-2 text-ink-muted-80">
      {user.mustChangePassword
        ? "初回サインインのため、配布されたパスワードを新しいものに変更してください。"
        : "現在のパスワードと、新しいパスワードを入力してください。"}
    </p>
  );
}

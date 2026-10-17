import Link from "next/link";
import { Suspense } from "react";
import { accountDestination } from "@/lib/account-navigation";
import { getCurrentUser } from "@/lib/session";

export function SessionLink({ className, guestLabel = "サインイン" }: { className?: string; guestLabel?: string }) {
  return (
    <Suspense fallback={<span className={className} aria-busy="true" aria-label="ログイン状態を確認中">確認中…</span>}>
      <ResolvedSessionLink className={className} guestLabel={guestLabel} />
    </Suspense>
  );
}

async function ResolvedSessionLink({ className, guestLabel }: { className?: string; guestLabel: string }) {
  const user = await getCurrentUser();
  const destination = accountDestination(user);
  return <Link href={destination.href} className={className}>{user ? destination.label : guestLabel}</Link>;
}

import { Suspense } from "react";
import { getCurrentUser } from "@/lib/session";
import { GlobalNavClient, type Variant } from "./global-nav-client";

export function GlobalNav({ variant = "app" }: { variant?: Variant }) {
  if (variant === "minimal") return <GlobalNavClient variant={variant} />;
  return (
    <Suspense fallback={<GlobalNavClient variant={variant} pending />}>
      <ResolvedNav variant={variant} />
    </Suspense>
  );
}

async function ResolvedNav({ variant }: { variant: Variant }) {
  const user = await getCurrentUser();
  return <GlobalNavClient variant={variant} user={user} />;
}

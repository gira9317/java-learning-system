import type { Metadata } from "next";
import Link from "next/link";
import { GlobalNav } from "@/components/global-nav";
import { CupIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "ページが見つかりません — Java Training",
};

// 404。スタックトレース風の飾りに、イースターエッグの入口（Duke.hello）を 1 行だけ紛れ込ませている
const TRACE = `Exception in thread "main" java.lang.ClassNotFoundException: Page
	at java.base/jdk.internal.loader.BuiltinClassLoader.loadClass(BuiltinClassLoader.java:641)
	at java.base/jdk.internal.loader.ClassLoaders$AppClassLoader.loadClass(ClassLoaders.java:188)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:526)
	at Duke.hello(Duke.java:15)
	at Router.resolve(Router.java:404)
	at Main.main(Main.java:1)`;

export default function NotFound() {
  return (
    <>
      <GlobalNav variant="minimal" />
      <main className="flex flex-1 flex-col items-center justify-center bg-parchment px-4 py-20 text-center sm:px-6">
        <span className="grid size-14 place-items-center rounded-full bg-ink text-white">
          <CupIcon size={26} />
        </span>
        <p className="type-caption-strong mt-6 text-ink-muted-48">404</p>
        <h1 className="type-display-md mt-1">ページが見つかりません</h1>
        <p className="type-body mt-3 text-ink-muted-80">URL が間違っているか、ページが移動した可能性があります。</p>
        <Link href="/" className="btn btn-primary mt-8">
          トップへ戻る
        </Link>
        <pre
          className="type-fine mt-14 w-full max-w-[640px] overflow-x-auto rounded-lg bg-canvas p-4 text-left font-mono text-ink-muted-48"
          aria-hidden
        >
          {TRACE}
        </pre>
      </main>
    </>
  );
}

import Link from "next/link";
import { SessionLink } from "./session-link";

const columns = [
  {
    title: "学習",
    links: [
      { href: "/home", label: "ホーム" },
      { href: "/lectures", label: "講義" },
      { href: "/curriculm", label: "コード演習" },
    ],
  },
  {
    title: "Java Training について",
    links: [
      { href: "/#features", label: "特長" },
      { href: "/#how", label: "学び方" },
      { href: "/login", label: "サインイン" },
    ],
  },
];

// footer: パーチメントの面に、行間を広くとったリンク列（dense-link）を並べる
export function SiteFooter() {
  return (
    <footer className="bg-parchment px-4 pt-10 pb-10 text-ink-muted-80 sm:px-6 sm:pt-12">
      <div className="mx-auto max-w-[1080px]">
        <p className="type-fine border-b border-hairline pb-4 text-ink-muted-48">
          学習の進み具合と、演習のフロー図・コード（作業途中の下書きを含む）はサーバーに保存されます。
        </p>
        <div className="grid gap-x-10 py-4 sm:grid-cols-2 md:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title} className="border-b border-hairline py-2 sm:border-0">
              <h3 className="type-caption-strong py-2 text-ink">{col.title}</h3>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href === "/login" ? (
                      <SessionLink className="type-caption leading-[2.2] hover:underline" />
                    ) : (
                      <Link href={link.href} className="type-caption leading-[2.2] hover:underline">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="type-fine border-t border-hairline pt-4 text-ink-muted-48">
          Java Training — 新人研修用 学習システム
        </p>
      </div>
    </footer>
  );
}

import type { ReactNode } from "react";

/** 管理画面の見出し */
export function AdminHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="type-caption-strong text-ink-muted-48">{eyebrow}</p>}
        <h1 className="type-display-lg mt-1">{title}</h1>
      </div>
      {children}
    </header>
  );
}

/** 白いカードの面 */
export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-hairline bg-canvas p-5 sm:p-6 ${className}`}>
      {title && <h2 className="type-tagline mb-4">{title}</h2>}
      {children}
    </section>
  );
}

/** 読み込み中の仮の枠 */
export function PanelSkeleton({ height = "h-64" }: { height?: string }) {
  return <div className={`${height} animate-pulse rounded-lg border border-hairline bg-canvas`} aria-busy />;
}

/** 横にスクロールできる表。スマホでもはみ出さない */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[640px] type-caption">
        <thead>
          <tr className="border-b border-hairline text-left text-ink-muted-48">
            {head.map((h) => (
              <th key={h} className="px-5 py-2 font-semibold sm:px-6">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-5 py-3 align-middle sm:px-6 ${className}`}>{children}</td>;
}

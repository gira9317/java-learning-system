import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// 資料（Markdown）の表示。見た目はコード演習の教材（lesson-material.tsx）に揃える。
// react-markdown は生の HTML を描画しないので、資料にスクリプトなどを埋め込まれることはない
const components: Components = {
  h1: ({ children }) => <h2 className="type-display-md mt-10 first:mt-0">{children}</h2>,
  h2: ({ children }) => <h2 className="type-tagline mt-10 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="type-body-strong mt-8">{children}</h3>,
  h4: ({ children }) => <h4 className="type-caption-strong mt-6 text-ink-muted-80">{children}</h4>,
  p: ({ children }) => <p className="type-body mt-3">{children}</p>,
  ul: ({ children }) => <ul className="type-body mt-3 list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="type-body mt-3 list-decimal space-y-1 pl-6">{children}</ol>,
  a: ({ children, href }) => (
    <a href={href} className="text-link underline" target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="mt-6 rounded-lg bg-parchment px-5 py-1 text-ink-muted-80">{children}</blockquote>
  ),
  hr: () => <hr className="mt-8 border-hairline" />,
  // ```java などのコードブロックは pre、文中の `x` は code だけになる
  pre: ({ children }) => (
    <pre className="mt-4 overflow-x-auto rounded-sm bg-tile-3 px-5 py-4 font-mono text-[13px] leading-[1.7] text-white/90 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit">
      {children}
    </pre>
  ),
  code: ({ children }) => (
    <code className="rounded-xs bg-parchment px-1.5 py-0.5 font-mono text-[0.88em]">{children}</code>
  ),
  table: ({ children }) => (
    <div className="mt-4 overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full type-caption">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-parchment text-left">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-hairline">{children}</tbody>,
  th: ({ children }) => <th className="px-4 py-2 font-semibold">{children}</th>,
  td: ({ children }) => <td className="px-4 py-2">{children}</td>,
  img: ({ src, alt }) => (
    // 資料の画像は外部 URL のため next/image ではなく img を使う
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} className="mt-4 max-w-full rounded-sm" />
  ),
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}

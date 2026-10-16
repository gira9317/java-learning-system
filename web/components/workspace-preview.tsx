/* マーケティング用の「製品レンダー」。学習画面を縮小した静的なプレビューで、唯一の product shadow を載せる。 */
export function WorkspacePreview() {
  return (
    <div className="overflow-hidden rounded-t-lg border border-b-0 border-hairline bg-canvas text-left shadow-product" aria-hidden>
      <div className="flex h-7 items-center gap-1.5 bg-black px-3">
        <span className="size-2 rounded-full bg-white/30" />
        <span className="size-2 rounded-full bg-white/30" />
        <span className="size-2 rounded-full bg-white/30" />
        <span className="ml-3 text-[10px] text-white/70">Java Training</span>
      </div>
      <div className="flex h-9 items-center justify-between border-b border-hairline bg-parchment px-4">
        <span className="truncate text-[12px] font-semibold">Lesson 03 / 10 · 条件分岐について学ぶ</span>
        <span className="shrink-0 rounded-full bg-primary px-3 py-0.5 text-[10px] text-white">学習を完了する</span>
      </div>
      <div className="grid h-[260px] grid-cols-1 divide-x divide-hairline sm:h-[320px] sm:grid-cols-[1.25fr_1.1fr] md:h-[360px] md:grid-cols-[1fr_1.25fr_1.1fr]">
        <div className="hidden p-5 md:block">
          <p className="text-[10px] font-semibold text-ink-muted-48">教材</p>
          <p className="mt-3 text-[15px] font-semibold">条件分岐について学ぶ</p>
          <div className="mt-3 space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-divider-soft" />
            <div className="h-1.5 w-11/12 rounded-full bg-divider-soft" />
            <div className="h-1.5 w-4/5 rounded-full bg-divider-soft" />
          </div>
          <div className="mt-5 rounded-sm bg-tile-3 p-3 font-mono text-[9px] leading-relaxed text-white/80">
            <span className="text-[#ff7ab2]">if</span> (score &gt;= <span className="text-[#d9c97c]">60</span>) {"{"} …
          </div>
          <div className="mt-5 space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-divider-soft" />
            <div className="h-1.5 w-3/5 rounded-full bg-divider-soft" />
          </div>
        </div>
        <div className="flex flex-col bg-tile-3 font-mono text-[10px] leading-[1.8] text-white/85">
          <p className="px-4 pt-3 font-sans text-[10px] font-semibold text-white/50">Main.java</p>
          <pre className="flex-1 px-4 pt-2">
            <span className="text-[#ff7ab2]">int</span> score = <span className="text-[#d9c97c]">80</span>;{"\n\n"}
            <span className="text-[#ff7ab2]">if</span> (score &gt;= <span className="text-[#d9c97c]">60</span>) {"{\n"}
            {"  "}System.out.println(<span className="text-[#fc6a5d]">&quot;合格&quot;</span>);{"\n"}
            {"}"} <span className="text-[#ff7ab2]">else</span> {"{\n"}
            {"  "}System.out.println(<span className="text-[#fc6a5d]">&quot;不合格&quot;</span>);{"\n"}
            {"}"}
          </pre>
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 font-sans">
            <span className="text-white/60">出力: 合格</span>
            <span className="rounded-full bg-primary px-3 py-0.5 text-white">採点する</span>
          </div>
        </div>
        <div className="relative hidden bg-parchment sm:block [background-image:radial-gradient(#d2d2d7_1px,transparent_1px)] [background-size:16px_16px]">
          <svg viewBox="0 0 200 260" className="absolute inset-0 m-auto h-[90%] w-full" fill="none">
            <g stroke="#7a7a7a" strokeWidth="1.2">
              <path d="M100 40v22M100 92v18M66 140H40v44M134 140h26v44M40 208v20h60M160 208v20h-60M100 228v6" />
            </g>
            <rect x="70" y="16" width="60" height="24" rx="12" fill="#1d1d1f" />
            <text x="100" y="32" textAnchor="middle" fontSize="10" fill="#fff">開始</text>
            <polygon points="72,62 138,62 128,92 62,92" fill="#fff" stroke="#1d1d1f" />
            <text x="100" y="81" textAnchor="middle" fontSize="9" fill="#1d1d1f">score を入力</text>
            <polygon points="100,110 136,140 100,170 64,140" fill="#fff" stroke="#0071e3" strokeWidth="2" />
            <text x="100" y="143" textAnchor="middle" fontSize="8" fill="#1d1d1f">≥ 60 ?</text>
            <rect x="12" y="184" width="56" height="24" rx="5" fill="#fff" stroke="#1d1d1f" />
            <text x="40" y="200" textAnchor="middle" fontSize="9" fill="#1d1d1f">合格</text>
            <rect x="132" y="184" width="56" height="24" rx="5" fill="#fff" stroke="#1d1d1f" />
            <text x="160" y="200" textAnchor="middle" fontSize="9" fill="#1d1d1f">不合格</text>
            <rect x="70" y="234" width="60" height="22" rx="11" fill="#1d1d1f" />
            <text x="100" y="249" textAnchor="middle" fontSize="10" fill="#fff">終了</text>
          </svg>
        </div>
      </div>
    </div>
  );
}

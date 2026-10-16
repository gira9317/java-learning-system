"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

const MIN_PERCENT = 18;

type Props = {
  children: ReactNode[];
  initial: number[];
  labels: string[];
};

/**
 * モバイルではタブで 1 ペインずつ切り替え、lg 以上では横並びにしてドラッグで幅を調整する。
 * 非表示のペインもマウントしたままにして、コードや図の編集内容を保つ。
 */
export function ResizablePanes({ children, initial, labels }: Props) {
  const [sizes, setSizes] = useState(initial);
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function resize(index: number, start: number[], delta: number) {
    const clamped = Math.max(MIN_PERCENT - start[index], Math.min(start[index + 1] - MIN_PERCENT, delta));
    const next = [...start];
    next[index] = start[index] + clamped;
    next[index + 1] = start[index + 1] - clamped;
    setSizes(next);
  }

  function onPointerDown(index: number, e: PointerEvent<HTMLDivElement>) {
    const container = containerRef.current;
    if (!container) return;
    e.preventDefault();
    const width = container.getBoundingClientRect().width;
    const startX = e.clientX;
    const start = [...sizes];

    const onMove = (ev: globalThis.PointerEvent) => resize(index, start, ((ev.clientX - startX) / width) * 100);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragging(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    setDragging(true);
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") resize(index, sizes, -2);
    if (e.key === "ArrowRight") resize(index, sizes, 2);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-hairline bg-canvas px-4 py-2 lg:hidden">
        <div role="tablist" aria-label="表示するペイン" className="grid grid-cols-3 gap-1 rounded-full bg-parchment p-1">
          {labels.map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              id={`pane-tab-${i}`}
              aria-selected={active === i}
              aria-controls={`pane-${i}`}
              onClick={() => setActive(i)}
              className={`btn min-h-9 rounded-full type-caption ${
                active === i ? "border border-hairline bg-canvas font-semibold text-ink" : "border border-transparent text-ink-muted-80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="flex min-h-0 flex-1 lg:flex-row">
        {children.map((child, i) => (
          <div key={i} className="contents">
            <div
              id={`pane-${i}`}
              role="tabpanel"
              aria-labelledby={`pane-tab-${i}`}
              className={`${active === i ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col lg:flex lg:[flex:var(--pane)_1_0%]`}
              style={{ "--pane": sizes[i] } as CSSProperties}
            >
              {child}
            </div>
            {i < children.length - 1 && (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-valuenow={Math.round(sizes[i])}
                aria-label="ペインの幅を調整"
                tabIndex={0}
                onPointerDown={(e) => onPointerDown(i, e)}
                onKeyDown={(e) => onKeyDown(i, e)}
                className="group relative hidden w-[9px] shrink-0 cursor-col-resize bg-parchment outline-none lg:block"
              >
                <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-hairline transition-colors group-hover:bg-primary-focus group-focus-visible:bg-primary-focus group-active:bg-primary-focus" />
                <span className="absolute top-1/2 left-1/2 h-8 w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-chip" />
              </div>
            )}
          </div>
        ))}
      </div>
      {/* ドラッグ中はカーソルを固定し、エディタ等のテキスト選択を防ぐ */}
      {dragging && <div className="fixed inset-0 z-50 cursor-col-resize select-none" />}
    </div>
  );
}

/** ペイン共通の見出しバー */
export function PaneHeader({
  icon,
  title,
  children,
  dark = false,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4 ${
        dark ? "border-white/10 bg-tile-1 text-white" : "border-hairline bg-canvas"
      }`}
    >
      <h2 className={`flex items-center gap-2 type-caption-strong ${dark ? "text-white/85" : "text-ink-muted-80"}`}>
        {icon}
        {title}
      </h2>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

import Image from "next/image";

// イースターエッグ（CTF 風の隠し要素）のバッジ。仕掛けは runner/src/eggs.ts、答え合わせは API の /easter。
// 画像は各キャラクターの公式のもの。出典とライセンスは public/eggs/LICENSES.md（クレジットは EggCredits で表示）

export type Egg = "duke" | "tux" | "gopher";

export const EGGS: { id: Egg; name: string; caption: string; image: string }[] = [
  // 元の SVG は用紙サイズ（612×793）の真ん中に描かれているので、ファイルは変えずに表示範囲だけ Duke の部分に絞る
  { id: "duke", name: "Duke", caption: "隠しクラスの宝物を見つけた", image: "/eggs/duke.svg#svgView(viewBox(181.5,186,249,422))" },
  { id: "tux", name: "Tux", caption: "ペンギンの隠しファイルを見つけた", image: "/eggs/tux.svg" },
  { id: "gopher", name: "Gopher", caption: "100 匹でトンネルを掘った", image: "/eggs/gopher.png" },
];

/** 丸いバッジ。取っていないものは「?」で伏せる */
export function EggBadge({ egg, solved, size = 40 }: { egg: Egg; solved: boolean; size?: number }) {
  const meta = EGGS.find((e) => e.id === egg)!;
  const inner = Math.round(size * 0.72);
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full ${solved ? "border border-hairline bg-white" : "border border-dashed border-hairline bg-canvas text-ink-muted-48"}`}
      style={{ width: size, height: size }}
      title={solved ? `${meta.name}: ${meta.caption}` : "まだ見つけていない"}
    >
      {solved ? (
        <Image src={meta.image} alt={meta.name} width={inner} height={inner} unoptimized className="object-contain" style={{ width: inner, height: inner }} />
      ) : (
        <span className="type-caption-strong">?</span>
      )}
    </span>
  );
}

/** 画像の作者表示（Gopher は CC BY 4.0、Tux は作者と The GIMP の明記が条件） */
export function EggCredits() {
  return (
    <p className="type-fine text-ink-muted-48">
      Duke © Sun Microsystems（BSD ライセンス）・ The Go gopher was designed by Renée French（
      <a href="https://creativecommons.org/licenses/by/4.0/" className="underline" target="_blank" rel="noreferrer">
        CC BY 4.0
      </a>
      ）・ Tux by Larry Ewing with The GIMP
    </p>
  );
}

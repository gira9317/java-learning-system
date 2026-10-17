import { nodeSize, type FlowNode, type FlowNodeType } from "@/lib/flow";

// フローチャートのノードの図形。編集画面（React Flow のノード）と、管理画面の読み取り専用の表示で共有する

const INK = "#1d1d1f";
const FOCUS = "#0071e3";
const DANGER = "#d70015";

type ShapeStyle = { selected?: boolean; issue?: boolean };

/** 図形そのもの（左上を原点に、幅 w・高さ h で描く） */
function Shape({ type, selected, issue }: { type: FlowNodeType } & ShapeStyle) {
  const { w, h } = nodeSize[type];
  const terminal = type === "start" || type === "end";
  const stroke = selected ? FOCUS : issue ? DANGER : INK;
  const strokeWidth = selected || issue ? 2 : 1.2;
  const fill = terminal ? INK : "#ffffff";
  // 線が切れないよう、線の太さの半分だけ内側に描く
  const i = strokeWidth / 2;

  if (terminal) {
    return (
      <rect
        x={i}
        y={i}
        width={w - i * 2}
        height={h - i * 2}
        rx={(h - i * 2) / 2}
        fill={fill}
        stroke={selected || issue ? stroke : fill}
        strokeWidth={strokeWidth}
      />
    );
  }
  if (type === "decision") {
    return <polygon points={`${w / 2},${i} ${w - i},${h / 2} ${w / 2},${h - i} ${i},${h / 2}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }
  if (type === "io") {
    const s = 12;
    return (
      <polygon points={`${s + i},${i} ${w - i},${i} ${w - s - i},${h - i} ${i},${h - i}`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    );
  }
  return <rect x={i} y={i} width={w - i * 2} height={h - i * 2} rx={8} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

/** React Flow のノードの中身（HTML の上に SVG の図形とラベルを重ねる） */
export function ShapeBody({ type, label, selected, issue }: { type: FlowNodeType; label: string } & ShapeStyle) {
  const { w, h } = nodeSize[type];
  const terminal = type === "start" || type === "end";
  return (
    <div className="relative" style={{ width: w, height: h }}>
      <svg width={w} height={h} className="absolute inset-0 overflow-visible" aria-hidden>
        <Shape type={type} selected={selected} issue={issue} />
      </svg>
      <span
        className={`absolute inset-0 grid place-items-center text-center text-[13px] leading-tight ${
          terminal ? "text-white" : "text-ink"
        } ${type === "decision" ? "px-8" : "px-3"}`}
      >
        {label}
      </span>
      {issue && (
        <span
          className="absolute -top-2 grid size-4 place-items-center rounded-full bg-danger text-[11px] font-bold text-white"
          style={{ right: type === "decision" ? w / 2 - 28 : -6 }}
          aria-label="採点で指摘があります"
        >
          !
        </span>
      )}
    </div>
  );
}

/** 管理画面のプレビュー用。SVG の中に、ノードの中心座標で描く */
export function NodeShape({ node, selected = false, issue = false }: { node: FlowNode } & ShapeStyle) {
  const { w, h } = nodeSize[node.type];
  const terminal = node.type === "start" || node.type === "end";
  return (
    <g transform={`translate(${node.x - w / 2} ${node.y - h / 2})`}>
      <Shape type={node.type} selected={selected} issue={issue} />
      <text x={w / 2} y={h / 2 + 4.5} textAnchor="middle" fontSize={13} fill={terminal ? "#ffffff" : INK}>
        {node.label}
      </text>
    </g>
  );
}

/** ノードを追加するボタンのアイコン */
export function PaletteGlyph({ type }: { type: FlowNodeType }) {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden className="shrink-0">
      {(type === "start" || type === "end") && <rect x="1" y="2" width="16" height="8" rx="4" fill={INK} />}
      {type === "process" && <rect x="1.5" y="2" width="15" height="8" rx="1.5" fill="none" stroke={INK} strokeWidth="1.3" />}
      {type === "decision" && <polygon points="9,0.8 17,6 9,11.2 1,6" fill="none" stroke={INK} strokeWidth="1.3" />}
      {type === "io" && <polygon points="4,2 17,2 14,10 1,10" fill="none" stroke={INK} strokeWidth="1.3" />}
    </svg>
  );
}

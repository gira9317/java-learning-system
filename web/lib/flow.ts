export type FlowNodeType = "start" | "end" | "process" | "decision" | "io";

export type FlowNode = {
  id: string;
  type: FlowNodeType;
  label: string;
  x: number; // 中心座標
  y: number;
};

export type FlowEdge = {
  id: string;
  from: string;
  to: string;
  branch?: "true" | "false";
};

export type FlowCheck = { label: string; ok: boolean; nodeIds?: string[] };

export const nodeTypeLabel: Record<FlowNodeType, string> = {
  start: "開始",
  end: "終了",
  process: "処理",
  decision: "条件分岐",
  io: "入出力",
};

export const nodeSize: Record<FlowNodeType, { w: number; h: number }> = {
  start: { w: 120, h: 40 },
  end: { w: 120, h: 40 },
  process: { w: 150, h: 46 },
  io: { w: 164, h: 46 },
  decision: { w: 172, h: 84 },
};

// Lesson 03 の初期状態。「不合格」から終了への接続が抜けている途中段階。
export const initialNodes: FlowNode[] = [
  { id: "n1", type: "start", label: "開始", x: 220, y: 50 },
  { id: "n2", type: "io", label: "score を入力", x: 220, y: 140 },
  { id: "n3", type: "decision", label: "score >= 60", x: 220, y: 250 },
  { id: "n4", type: "io", label: "「合格」と表示", x: 220, y: 380 },
  { id: "n5", type: "io", label: "「不合格」と表示", x: 430, y: 380 },
  { id: "n6", type: "end", label: "終了", x: 220, y: 490 },
];

export const initialEdges: FlowEdge[] = [
  { id: "e1", from: "n1", to: "n2" },
  { id: "e2", from: "n2", to: "n3" },
  { id: "e3", from: "n3", to: "n4", branch: "true" },
  { id: "e4", from: "n3", to: "n5", branch: "false" },
  { id: "e5", from: "n4", to: "n6" },
];

/**
 * エッジの SVG パス（直交ルーティング）と、分岐ラベルの位置を返す（管理画面のプレビュー用）。
 * 条件分岐は True を下、False を右から出す（編集画面の React Flow のノードと同じ向き）。
 */
export function edgePath(edge: FlowEdge, nodes: FlowNode[]) {
  const a = nodes.find((n) => n.id === edge.from);
  const b = nodes.find((n) => n.id === edge.to);
  if (!a || !b) return null;
  const sa = nodeSize[a.type];
  const sb = nodeSize[b.type];
  const targetTop = b.y - sb.h / 2;

  if (edge.branch === "false") {
    const sx = a.x + sa.w / 2;
    const label = { labelX: sx + 6, labelY: a.y - 7 };
    if (b.x > sx && targetTop > a.y) {
      return { d: `M${sx} ${a.y} H${b.x} V${targetTop}`, ...label };
    }
    // 分岐先が左側・上側にあるときは、右に一度出てから回り込む
    return { d: `M${sx} ${a.y} h18 V${targetTop - 18} H${b.x} V${targetTop}`, ...label };
  }

  const sy = a.y + sa.h / 2;
  // True は下から出す（それ以外の矢印と同じ経路）。ラベルは出口の右下に置く
  const label = edge.branch === "true" ? { labelX: a.x + 6, labelY: sy + 14 } : {};
  if (targetTop >= sy + 10) {
    if (Math.abs(a.x - b.x) < 1) return { d: `M${a.x} ${sy} V${targetTop}`, ...label };
    const midY = (sy + targetTop) / 2;
    return { d: `M${a.x} ${sy} V${midY} H${b.x} V${targetTop}`, ...label };
  }
  // 上方向に戻るループは右側を迂回する
  const side = Math.max(a.x + sa.w / 2, b.x + sb.w / 2) + 28;
  return { d: `M${a.x} ${sy} v16 H${side} V${targetTop - 16} H${b.x} V${targetTop}`, ...label };
}

/** 構造化ノードによるルールベース採点（MVP の暫定方式） */
export function gradeFlow(nodes: FlowNode[], edges: FlowEdge[]): FlowCheck[] {
  const starts = nodes.filter((n) => n.type === "start");
  const ends = nodes.filter((n) => n.type === "end");
  const decisions = nodes.filter((n) => n.type === "decision");

  const branchIssues = decisions
    .filter((d) => {
      const out = edges.filter((e) => e.from === d.id);
      return !out.some((e) => e.branch === "true") || !out.some((e) => e.branch === "false");
    })
    .map((d) => d.id);

  // 終了ノードから逆向きにたどって、終了に到達できないノードを探す
  const reach = new Set(ends.map((n) => n.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of edges) {
      if (reach.has(e.to) && !reach.has(e.from)) {
        reach.add(e.from);
        changed = true;
      }
    }
  }
  const deadEnds = nodes.filter((n) => !reach.has(n.id)).map((n) => n.id);

  const hasCondition = decisions.some((d) => /score\s*>=\s*60|score\s*<\s*60/.test(d.label));

  return [
    { label: "開始ノードが 1 つある", ok: starts.length === 1, nodeIds: starts.length > 1 ? starts.map((n) => n.id) : [] },
    { label: "終了ノードがある", ok: ends.length >= 1 },
    { label: "条件分岐で点数を判定している", ok: hasCondition, nodeIds: hasCondition ? [] : decisions.map((d) => d.id) },
    { label: "条件分岐に True / False の両方の接続がある", ok: decisions.length > 0 && branchIssues.length === 0, nodeIds: branchIssues },
    { label: "すべての経路が終了ノードに到達する", ok: ends.length > 0 && deadEnds.length === 0, nodeIds: deadEnds },
  ];
}

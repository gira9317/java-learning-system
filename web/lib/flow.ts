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
  { id: "n4", type: "io", label: "「合格」と表示", x: 100, y: 380 },
  { id: "n5", type: "io", label: "「不合格」と表示", x: 340, y: 380 },
  { id: "n6", type: "end", label: "終了", x: 220, y: 490 },
];

export const initialEdges: FlowEdge[] = [
  { id: "e1", from: "n1", to: "n2" },
  { id: "e2", from: "n2", to: "n3" },
  { id: "e3", from: "n3", to: "n4", branch: "true" },
  { id: "e4", from: "n3", to: "n5", branch: "false" },
  { id: "e5", from: "n4", to: "n6" },
];

/** エッジの SVG パス（直交ルーティング）と、分岐ラベルの位置を返す */
export function edgePath(edge: FlowEdge, nodes: FlowNode[]) {
  const a = nodes.find((n) => n.id === edge.from);
  const b = nodes.find((n) => n.id === edge.to);
  if (!a || !b) return null;
  const sa = nodeSize[a.type];
  const sb = nodeSize[b.type];
  const targetTop = b.y - sb.h / 2;

  if (edge.branch) {
    const dir = edge.branch === "true" ? -1 : 1;
    const sx = a.x + (dir * sa.w) / 2;
    if ((b.x - sx) * dir > 0 && targetTop > a.y) {
      return {
        d: `M${sx} ${a.y} H${b.x} V${targetTop}`,
        labelX: sx + dir * 14,
        labelY: a.y - 7,
      };
    }
    // 分岐先が反対側・上側にあるときは外側に一度出てから回り込む
    return {
      d: `M${sx} ${a.y} h${dir * 18} V${targetTop - 18} H${b.x} V${targetTop}`,
      labelX: sx + dir * 14,
      labelY: a.y - 7,
    };
  }

  const sy = a.y + sa.h / 2;
  if (targetTop >= sy + 10) {
    if (Math.abs(a.x - b.x) < 1) return { d: `M${a.x} ${sy} V${targetTop}` };
    const midY = (sy + targetTop) / 2;
    return { d: `M${a.x} ${sy} V${midY} H${b.x} V${targetTop}` };
  }
  // 上方向に戻るループは右側を迂回する
  const side = Math.max(a.x + sa.w / 2, b.x + sb.w / 2) + 28;
  return { d: `M${a.x} ${sy} v16 H${side} V${targetTop - 16} H${b.x} V${targetTop}` };
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

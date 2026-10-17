import type { BranchEdge, ShapeNode } from "../components/workspace/flow-node";

/** ドラッグ中のIDを変えず、元の場所に残すノードと内部の矢印を用意する。 */
export function startFlowDuplication(nodes: ShapeNode[], edges: BranchEdge[], draggedIds: string[], nextId: (prefix: "n" | "e") => string) {
  const dragged = new Set(draggedIds);
  const originals = nodes.filter((node) => dragged.has(node.id));
  if (!originals.length) return null;
  const stationaryIds = new Map(originals.map((node) => [node.id, nextId("n")]));
  const swapIds = new Map<string, string>();
  for (const [original, stationary] of stationaryIds) {
    swapIds.set(original, stationary);
    swapIds.set(stationary, original);
  }
  const copies: ShapeNode[] = originals.map((node) => ({
    ...node, id: stationaryIds.get(node.id)!, position: { ...node.position },
    selected: false, dragging: false, data: { ...node.data, issue: false },
  }));
  return {
    swapIds,
    nodes: [...nodes.map((node) => ({ ...node, selected: dragged.has(node.id) })), ...copies],
    edges: [
      // 元の矢印は元の場所へ残す。外側のノードへの接続は複製しない。
      ...edges.map((edge) => ({ ...edge, source: stationaryIds.get(edge.source) ?? edge.source, target: stationaryIds.get(edge.target) ?? edge.target, selected: false })),
      // 複数ノードを複製した場合、選択範囲内の接続も一緒に複製する。
      ...edges.filter((edge) => stationaryIds.has(edge.source) && stationaryIds.has(edge.target)).map((edge) => ({ ...edge, id: nextId("e"), selected: false, data: edge.data ? { ...edge.data } : undefined })),
    ],
  };
}

/** ドロップ後にIDを確定。元ノードのID・位置・接続を保持し、移動した側を新しいノードにする。 */
export function finishFlowDuplication(nodes: ShapeNode[], edges: BranchEdge[], swapIds: Map<string, string>) {
  return {
    nodes: nodes.map((node) => ({ ...node, id: swapIds.get(node.id) ?? node.id, dragging: false })),
    edges: edges.map((edge) => ({ ...edge, source: swapIds.get(edge.source) ?? edge.source, target: swapIds.get(edge.target) ?? edge.target })),
  };
}

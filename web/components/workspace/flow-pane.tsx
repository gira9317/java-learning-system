"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type IsValidConnection,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRef, useState } from "react";
import type { FlowContent } from "@/api/submissions-api";
import { FlowIcon, TrashIcon } from "@/components/icons";
import {
  gradeFlow,
  initialEdges,
  initialNodes,
  nodeSize,
  nodeTypeLabel,
  type FlowCheck,
  type FlowEdge,
  type FlowNode,
  type FlowNodeType,
} from "@/lib/flow";
import { nodeTypes, type BranchEdge, type ShapeNode } from "./flow-node";
import { PaletteGlyph } from "./flow-shapes";
import { PaneHeader } from "./resizable-panes";
import { StageBanner, SubmitButton, type SubmitControl } from "./submission-status";
import { autosaveLabel, useAutosave } from "./use-autosave";

/* ---------- 保存する形（中心座標の FlowNode / FlowEdge）と React Flow の形の変換 ---------- */

function toShapeNode(n: FlowNode): ShapeNode {
  const { w, h } = nodeSize[n.type];
  // React Flow の position は左上。保存する形は中心座標
  return { id: n.id, type: "shape", position: { x: n.x - w / 2, y: n.y - h / 2 }, data: { label: n.label, kind: n.type } };
}

function fromShapeNode(n: ShapeNode): FlowNode {
  const { w, h } = nodeSize[n.data.kind];
  return { id: n.id, type: n.data.kind, label: n.data.label, x: Math.round(n.position.x + w / 2), y: Math.round(n.position.y + h / 2) };
}

function toBranchEdge(e: FlowEdge): BranchEdge {
  return {
    id: e.id,
    source: e.from,
    target: e.to,
    sourceHandle: e.branch ?? "out",
    targetHandle: "in",
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "#7a7a7a" },
    data: { branch: e.branch },
  };
}

function fromBranchEdge(e: BranchEdge): FlowEdge {
  return { id: e.id, from: e.source, to: e.target, branch: e.data?.branch };
}

const PALETTE: FlowNodeType[] = ["start", "end", "process", "decision", "io"];
const DEFAULT_LABEL: Record<FlowNodeType, string> = { start: "開始", end: "終了", process: "処理", decision: "条件", io: "入出力" };

/*
 * フロー図エディタ（React Flow）。初めての人でも迷わないよう、一般的な作図ツールに近い操作にしている。
 * - 何もないところをドラッグ（左ボタン・ホイールの押し込み・タッチ）: 表示位置を移動
 * - ホイール: 拡大・縮小
 * - Backspace / Delete: 選んだノード・矢印を削除
 * - 複数選択は慣れた人向け: Shift + ドラッグで範囲選択、Shift / Ctrl + クリックで追加
 * - ノードの縁の丸（ハンドル）から別のノードへドラッグ: 矢印でつなぐ。条件分岐は左が True、右が False
 * ルールベース採点も備える。
 */
type FlowPaneProps = {
  onGraded: (checks: FlowCheck[] | null) => void;
  /** 開いたときの内容（下書き、なければ最後に提出したフロー図） */
  initial?: FlowContent;
  submit: SubmitControl;
  onSubmit: (content: FlowContent, checks: FlowCheck[]) => void;
  /** 下書きの保存（手を止めたときと、ページを離れるときに自動で呼ぶ） */
  saveDraft: (content: FlowContent, options: { keepalive: boolean }) => Promise<unknown>;
};

export function FlowPane(props: FlowPaneProps) {
  return (
    <ReactFlowProvider>
      <FlowEditor {...props} />
    </ReactFlowProvider>
  );
}

function FlowEditor({ onGraded, initial, submit, onSubmit, saveDraft }: FlowPaneProps) {
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<ShapeNode>((initial?.nodes ?? initialNodes).map(toShapeNode));
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<BranchEdge>((initial?.edges ?? initialEdges).map(toBranchEdge));
  const [checks, setChecks] = useState<FlowCheck[] | null>(null);
  const { screenToFlowPosition, deleteElements } = useReactFlow<ShapeNode, BranchEdge>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const counter = useRef(100);

  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedEdges = edges.filter((e) => e.selected);
  const single = selectedNodes.length === 1 && selectedEdges.length === 0 ? selectedNodes[0] : undefined;
  // 下の浮かせたパネルは、出す内容があるときだけ表示する
  const showPanel = selectedNodes.length > 0 || selectedEdges.length > 0 || checks !== null;

  /** 図が変わったら採点結果は古くなるので消す */
  function invalidate() {
    if (!checks) return;
    setChecks(null);
    onGraded(null);
    setNodes((ns) => ns.map((n) => (n.data.issue ? { ...n, data: { ...n.data, issue: false } } : n)));
  }

  function onNodesChange(changes: NodeChange<ShapeNode>[]) {
    onNodesChangeBase(changes);
    if (changes.some((c) => c.type === "position" || c.type === "remove" || c.type === "add")) invalidate();
  }

  function onEdgesChange(changes: EdgeChange<BranchEdge>[]) {
    onEdgesChangeBase(changes);
    if (changes.some((c) => c.type === "remove" || c.type === "add")) invalidate();
  }

  /** つないでよいか: 自分自身・同じ向きの重複・使用済みの True / False の出口は不可 */
  const isValidConnection: IsValidConnection<BranchEdge> = (c) =>
    c.source !== c.target &&
    !edges.some((e) => e.source === c.source && e.target === c.target) &&
    !(c.sourceHandle && c.sourceHandle !== "out" && edges.some((e) => e.source === c.source && e.sourceHandle === c.sourceHandle));

  function onConnect(c: Connection) {
    const branch = c.sourceHandle === "true" || c.sourceHandle === "false" ? c.sourceHandle : undefined;
    setEdges((es) => [...es, toBranchEdge({ id: `e${counter.current++}`, from: c.source, to: c.target, branch })]);
    invalidate();
  }

  /** 今見えている範囲の中央付近に、ノードを追加して選ぶ */
  function addNode(type: FlowNodeType) {
    const rect = wrapperRef.current?.getBoundingClientRect();
    const center = rect
      ? screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      : { x: 220, y: 300 };
    const offset = (counter.current % 5) * 14;
    const id = `n${counter.current++}`;
    const node = toShapeNode({
      id,
      type,
      label: DEFAULT_LABEL[type],
      x: Math.round((center.x + offset) / 10) * 10,
      y: Math.round((center.y + offset) / 10) * 10,
    });
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { ...node, selected: true }]);
    setEdges((es) => es.map((e) => ({ ...e, selected: false })));
    invalidate();
  }

  function setLabel(id: string, label: string) {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n)));
    invalidate();
  }

  function removeSelected() {
    void deleteElements({ nodes: selectedNodes, edges: selectedEdges });
  }

  function grade() {
    const result = gradeFlow(nodes.map(fromShapeNode), edges.map(fromBranchEdge));
    const issueIds = new Set(result.flatMap((c) => (c.ok ? [] : (c.nodeIds ?? []))));
    setNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, issue: issueIds.has(n.id) } })));
    setChecks(result);
    onGraded(result);
    return result;
  }

  // 提出の前に採点し、その結果も一緒に送る（研修担当者が参考にする）
  function handleSubmit() {
    const result = grade();
    onSubmit({ nodes: nodes.map(fromShapeNode), edges: edges.map(fromBranchEdge) }, result);
  }

  // 選択や採点の印は含めず、図の中身だけを下書きとして保存する
  const draftStatus = useAutosave<FlowContent>({ nodes: nodes.map(fromShapeNode), edges: edges.map(fromBranchEdge) }, saveDraft);

  const passed = checks?.filter((c) => c.ok).length ?? 0;

  return (
    <>
      <PaneHeader icon={<FlowIcon size={16} />} title="フロー図">
        <span className="hidden type-fine text-ink-muted-48 md:inline" role="status">
          {autosaveLabel(draftStatus)}
        </span>
        {checks && (
          <span className={`type-caption-strong ${passed === checks.length ? "text-success" : "text-danger"}`}>
            {passed} / {checks.length}
          </span>
        )}
        <button type="button" onClick={grade} className="btn btn-secondary">
          採点する
        </button>
        <SubmitButton control={submit} onClick={handleSubmit} />
      </PaneHeader>
      <StageBanner control={submit} />

      <div ref={wrapperRef} className="flow-canvas relative min-h-0 flex-1 bg-parchment">
        <ReactFlow<ShapeNode, BranchEdge>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          // 何もないところのドラッグは移動（左ボタン・ホイールの押し込み）。範囲選択は Shift を押しながら
          panOnDrag={[0, 1]}
          selectionKeyCode="Shift"
          selectionMode={SelectionMode.Partial}
          deleteKeyCode={["Backspace", "Delete"]}
          // Space を押しながらの移動は使わない。React Flow はページ全体で Space を受け取るため、
          // 有効のままだと、裏に残っているこのペインがコードエディタの Space を奪ってしまう
          panActivationKeyCode={null}
          multiSelectionKeyCode={["Shift", "Control", "Meta"]}
          snapToGrid
          snapGrid={[10, 10]}
          zoomOnDoubleClick={false}
          minZoom={0.3}
          maxZoom={2.5}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
          connectionLineStyle={{ stroke: "#0071e3", strokeWidth: 1.5 }}
          proOptions={{ hideAttribution: true }}
          aria-label="フローチャート"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#d2d2d7" />
          <Controls position="bottom-right" showInteractive={false} />

          {/* ノードパレット：モバイルは上部の横スクロール、sm 以上は左上に縦置き */}
          <Panel position="top-left" className="m-0! w-full sm:m-3! sm:w-auto">
            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-hairline bg-canvas px-3 py-2 sm:flex-col sm:items-stretch sm:border-0 sm:bg-transparent sm:p-0">
              <p className="hidden type-fine px-1 text-ink-muted-48 sm:block">ノードを追加</p>
              {PALETTE.map((type) => (
                <button key={type} type="button" onClick={() => addNode(type)} className="btn btn-pearl shrink-0 justify-start">
                  <PaletteGlyph type={type} />
                  {nodeTypeLabel[type]}
                </button>
              ))}
              <p className="hidden max-w-[11rem] px-1 pt-2 type-fine leading-relaxed text-ink-muted-48 sm:block">
                縁の丸をドラッグしてつなぐ
                <br />
                何もないところをドラッグで移動
                <br />
                ホイールで拡大・縮小
                <br />
                Backspace で削除
              </p>
            </div>
          </Panel>

          {/* プロパティ・採点結果：出す内容があるときだけ表示 */}
          {showPanel && (
            <Panel position="bottom-left" className="m-3! w-[min(360px,calc(100%-5rem))]">
              <div className="rounded-lg border border-hairline bg-canvas/95 px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                {single ? (
                  <>
                    <p className="type-fine text-ink-muted-48">{nodeTypeLabel[single.data.kind]}ノード</p>
                    <input
                      value={single.data.label}
                      onChange={(e) => setLabel(single.id, e.target.value)}
                      aria-label="ノードのラベル"
                      className="mt-2 h-9 w-full rounded-full border border-black/10 px-4 type-caption outline-none focus:border-primary-focus focus:ring-1 focus:ring-primary-focus"
                    />
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="type-fine text-ink-muted-48">縁の丸からドラッグして、ほかのノードとつなげます</p>
                      <button type="button" className="btn btn-pearl shrink-0" onClick={removeSelected}>
                        <TrashIcon size={14} />
                        削除
                      </button>
                    </div>
                  </>
                ) : selectedNodes.length > 0 || selectedEdges.length > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="type-caption">
                      {selectedNodes.length > 0 && <span className="font-semibold">ノード {selectedNodes.length} 個</span>}
                      {selectedNodes.length > 0 && selectedEdges.length > 0 && "、"}
                      {selectedEdges.length > 0 && <span className="font-semibold">矢印 {selectedEdges.length} 本</span>}
                      を選択中
                      <span className="block type-fine text-ink-muted-48">選んだノードをドラッグでまとめて移動、Backspace で削除</span>
                    </p>
                    <button type="button" className="btn btn-pearl shrink-0" onClick={removeSelected}>
                      <TrashIcon size={14} />
                      削除
                    </button>
                  </div>
                ) : checks ? (
                  <ul className="grid gap-x-4 gap-y-1 xl:grid-cols-2">
                    {checks.map((c) => (
                      <li key={c.label} className="flex gap-2 type-caption">
                        <span
                          className={`mt-[3px] grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${c.ok ? "bg-success" : "bg-danger"}`}
                        >
                          {c.ok ? "✓" : "!"}
                        </span>
                        <span className={c.ok ? "text-ink-muted-80" : "text-ink"}>{c.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </>
  );
}

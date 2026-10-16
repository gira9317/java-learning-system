"use client";

import { useRef, useState, type PointerEvent } from "react";
import {
  edgePath,
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
import { FlowIcon, LinkIcon, MinusIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { PaneHeader } from "./resizable-panes";

const VIEW_W = 440;
const VIEW_H = 560;

/*
 * React Flow 導入までのフロー図エディタ。
 * ノードの追加・移動（ドラッグ）・接続・ラベル編集・削除と、ルールベース採点を備える。
 */
export function FlowPane({ onGraded }: { onGraded: (checks: FlowCheck[] | null) => void }) {
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<FlowEdge[]>(initialEdges);
  const [selected, setSelected] = useState<{ kind: "node" | "edge"; id: string } | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [checks, setChecks] = useState<FlowCheck[] | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const counter = useRef(100);

  const issueIds = new Set(checks?.flatMap((c) => (c.ok ? [] : (c.nodeIds ?? []))) ?? []);
  const selectedNode = selected?.kind === "node" ? nodes.find((n) => n.id === selected.id) : undefined;

  function invalidate() {
    if (checks) {
      setChecks(null);
      onGraded(null);
    }
  }

  function toSvg(e: { clientX: number; clientY: number }) {
    const svg = svgRef.current!;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: pt.x, y: pt.y };
  }

  function onNodePointerDown(node: FlowNode, e: PointerEvent<SVGGElement>) {
    e.stopPropagation();
    if (connectFrom) {
      connect(connectFrom, node.id);
      return;
    }
    setSelected({ kind: "node", id: node.id });
    const start = toSvg(e);
    const origin = { x: node.x, y: node.y };
    let moved = false;
    const onMove = (ev: globalThis.PointerEvent) => {
      const p = toSvg(ev);
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;
      // 10px グリッドにスナップ
      const x = Math.round((origin.x + dx) / 10) * 10;
      const y = Math.round((origin.y + dy) / 10) * 10;
      setNodes((ns) => ns.map((n) => (n.id === node.id ? { ...n, x, y } : n)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (moved) invalidate();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function connect(from: string, to: string) {
    setConnectFrom(null);
    if (from === to || edges.some((e) => e.from === from && e.to === to)) return;
    const source = nodes.find((n) => n.id === from);
    let branch: FlowEdge["branch"];
    if (source?.type === "decision") {
      const out = edges.filter((e) => e.from === from);
      if (!out.some((e) => e.branch === "true")) branch = "true";
      else if (!out.some((e) => e.branch === "false")) branch = "false";
      else return;
    }
    setEdges((es) => [...es, { id: `e${counter.current++}`, from, to, branch }]);
    setSelected({ kind: "node", id: to });
    invalidate();
  }

  function addNode(type: FlowNodeType) {
    const id = `n${counter.current++}`;
    const offset = (counter.current % 5) * 14;
    const label = type === "process" ? "処理" : type === "io" ? "入出力" : type === "decision" ? "条件" : nodeTypeLabel[type];
    setNodes((ns) => [...ns, { id, type, label, x: 220 + offset, y: 300 + offset }]);
    setSelected({ kind: "node", id });
    invalidate();
  }

  function removeSelected() {
    if (!selected) return;
    if (selected.kind === "node") {
      setNodes((ns) => ns.filter((n) => n.id !== selected.id));
      setEdges((es) => es.filter((e) => e.from !== selected.id && e.to !== selected.id));
    } else {
      setEdges((es) => es.filter((e) => e.id !== selected.id));
    }
    setSelected(null);
    invalidate();
  }

  function grade() {
    const result = gradeFlow(nodes, edges);
    setChecks(result);
    onGraded(result);
  }

  const vw = VIEW_W / zoom;
  const vh = VIEW_H / zoom;
  const passed = checks?.filter((c) => c.ok).length ?? 0;

  return (
    <>
      <PaneHeader icon={<FlowIcon size={16} />} title="フロー図">
        {checks && (
          <span className={`type-caption-strong ${passed === checks.length ? "text-success" : "text-danger"}`}>
            {passed} / {checks.length}
          </span>
        )}
        <button type="button" onClick={grade} className="btn btn-primary">
          採点する
        </button>
      </PaneHeader>

      <div
        className="relative min-h-0 flex-1 overflow-hidden bg-parchment [background-image:radial-gradient(#d2d2d7_1px,transparent_1px)] [background-size:20px_20px]"
        onPointerDown={() => {
          setSelected(null);
          setConnectFrom(null);
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`${(VIEW_W - vw) / 2} ${(VIEW_H - vh) / 2 - 10} ${vw} ${vh}`}
          className="absolute inset-x-0 top-[53px] bottom-0 h-[calc(100%-53px)] w-full touch-none select-none sm:top-0 sm:h-full"
          role="img"
          aria-label="フローチャート"
        >
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10z" fill="#7a7a7a" />
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10z" fill="#0071e3" />
            </marker>
          </defs>

          {edges.map((edge) => {
            const p = edgePath(edge, nodes);
            if (!p) return null;
            const active = selected?.kind === "edge" && selected.id === edge.id;
            return (
              <g
                key={edge.id}
                className="cursor-pointer"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelected({ kind: "edge", id: edge.id });
                }}
              >
                <path d={p.d} stroke="transparent" strokeWidth={14} fill="none" />
                <path
                  d={p.d}
                  stroke={active ? "#0071e3" : "#7a7a7a"}
                  strokeWidth={active ? 2 : 1.4}
                  fill="none"
                  markerEnd={`url(#${active ? "arrow-active" : "arrow"})`}
                />
                {edge.branch && p.labelX !== undefined && (
                  <text
                    x={p.labelX}
                    y={p.labelY}
                    textAnchor={edge.branch === "true" ? "end" : "start"}
                    fontSize={11}
                    fontWeight={600}
                    fill="#333333"
                  >
                    {edge.branch === "true" ? "True" : "False"}
                  </text>
                )}
              </g>
            );
          })}

          {nodes.map((node) => (
            <NodeShape
              key={node.id}
              node={node}
              selected={selected?.kind === "node" && selected.id === node.id}
              connecting={connectFrom === node.id}
              issue={issueIds.has(node.id)}
              onPointerDown={(e) => onNodePointerDown(node, e)}
            />
          ))}
        </svg>

        {/* ノードパレット：モバイルは上部の横スクロール、sm 以上はキャンバス左上に縦置き */}
        <div
          className="absolute inset-x-0 top-0 z-10 flex items-center gap-1.5 overflow-x-auto border-b border-hairline bg-canvas px-3 py-2 sm:inset-x-auto sm:top-3 sm:left-3 sm:flex-col sm:items-stretch sm:border-0 sm:bg-transparent sm:p-0"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <p className="hidden type-fine px-1 text-ink-muted-48 sm:block">ノードを追加</p>
          {(["start", "process", "decision", "io"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addNode(type === "start" ? "end" : type)}
              className="btn btn-pearl shrink-0 justify-start"
            >
              <PaletteGlyph type={type} />
              {type === "start" ? "開始・終了" : nodeTypeLabel[type]}
            </button>
          ))}
        </div>

        {/* ズーム */}
        <div className="absolute right-3 bottom-3 flex flex-col gap-2" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" className="btn btn-icon" aria-label="拡大" onClick={() => setZoom((z) => Math.min(1.8, z + 0.2))}>
            <PlusIcon size={16} />
          </button>
          <button type="button" className="btn btn-icon" aria-label="縮小" onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}>
            <MinusIcon size={16} />
          </button>
        </div>

      </div>

      {/* プロパティ・採点結果 */}
      <div className="min-h-[124px] shrink-0 border-t border-hairline bg-canvas px-4 py-3">
        {connectFrom ? (
          <div className="flex items-center justify-between gap-3">
            <p className="type-caption">
              <span className="font-semibold text-primary">接続先のノード</span>をクリック
            </p>
            <button type="button" className="btn text-link type-caption" onClick={() => setConnectFrom(null)}>
              取消
            </button>
          </div>
        ) : selectedNode ? (
          <>
            <p className="type-fine text-ink-muted-48">{nodeTypeLabel[selectedNode.type]}ノード</p>
            <input
              value={selectedNode.label}
              onChange={(e) => {
                const label = e.target.value;
                setNodes((ns) => ns.map((n) => (n.id === selectedNode.id ? { ...n, label } : n)));
                invalidate();
              }}
              aria-label="ノードのラベル"
              className="mt-2 h-9 w-full rounded-full border border-black/10 px-4 type-caption outline-none focus:border-primary-focus focus:ring-1 focus:ring-primary-focus"
            />
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn btn-utility" onClick={() => setConnectFrom(selectedNode.id)}>
                <LinkIcon size={14} />
                接続
              </button>
              <button type="button" className="btn btn-pearl" onClick={removeSelected}>
                <TrashIcon size={14} />
                削除
              </button>
            </div>
          </>
        ) : selected?.kind === "edge" ? (
          <div className="flex items-center justify-between gap-3">
            <p className="type-caption">接続を選択中</p>
            <button type="button" className="btn btn-pearl" onClick={removeSelected}>
              <TrashIcon size={14} />
              削除
            </button>
          </div>
        ) : checks ? (
          <ul className="grid gap-x-4 gap-y-1 xl:grid-cols-2">
            {checks.map((c) => (
              <li key={c.label} className="flex gap-2 type-caption">
                <span className={`mt-[3px] grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${c.ok ? "bg-success" : "bg-danger"}`}>
                  {c.ok ? "✓" : "!"}
                </span>
                <span className={c.ok ? "text-ink-muted-80" : "text-ink"}>{c.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-caption text-ink-muted-80">
            ノードをクリックで選択、ドラッグで移動。選択して「接続」を押すと矢印を引けます。
          </p>
        )}
      </div>
    </>
  );
}

function NodeShape({
  node,
  selected,
  connecting,
  issue,
  onPointerDown,
}: {
  node: FlowNode;
  selected: boolean;
  connecting: boolean;
  issue: boolean;
  onPointerDown: (e: PointerEvent<SVGGElement>) => void;
}) {
  const { w, h } = nodeSize[node.type];
  const terminal = node.type === "start" || node.type === "end";
  const stroke = selected || connecting ? "#0071e3" : issue ? "#d70015" : "#1d1d1f";
  const strokeWidth = selected || connecting || issue ? 2 : 1.2;
  const fill = terminal ? "#1d1d1f" : "#ffffff";
  const textFill = terminal ? "#ffffff" : "#1d1d1f";
  const left = node.x - w / 2;
  const top = node.y - h / 2;

  let shape;
  if (terminal) {
    shape = <rect x={left} y={top} width={w} height={h} rx={h / 2} fill={fill} stroke={selected || connecting || issue ? stroke : fill} strokeWidth={strokeWidth} />;
  } else if (node.type === "decision") {
    shape = (
      <polygon
        points={`${node.x},${top} ${left + w},${node.y} ${node.x},${top + h} ${left},${node.y}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  } else if (node.type === "io") {
    const s = 12;
    shape = (
      <polygon
        points={`${left + s},${top} ${left + w},${top} ${left + w - s},${top + h} ${left},${top + h}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  } else {
    shape = <rect x={left} y={top} width={w} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }

  return (
    <g onPointerDown={onPointerDown} className="cursor-grab active:cursor-grabbing">
      {shape}
      <text x={node.x} y={node.y + 4.5} textAnchor="middle" fontSize={13} fill={textFill} className="pointer-events-none">
        {node.label}
      </text>
      {issue && (
        <g className="pointer-events-none">
          <circle cx={left + w - (node.type === "decision" ? 40 : 4)} cy={top + 4} r={8} fill="#d70015" />
          <text x={left + w - (node.type === "decision" ? 40 : 4)} y={top + 8} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">
            !
          </text>
        </g>
      )}
    </g>
  );
}

function PaletteGlyph({ type }: { type: "start" | "process" | "decision" | "io" }) {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden className="shrink-0">
      {type === "start" && <rect x="1" y="2" width="16" height="8" rx="4" fill="#1d1d1f" />}
      {type === "process" && <rect x="1.5" y="2" width="15" height="8" rx="1.5" fill="none" stroke="#1d1d1f" strokeWidth="1.3" />}
      {type === "decision" && <polygon points="9,0.8 17,6 9,11.2 1,6" fill="none" stroke="#1d1d1f" strokeWidth="1.3" />}
      {type === "io" && <polygon points="4,2 17,2 14,10 1,10" fill="none" stroke="#1d1d1f" strokeWidth="1.3" />}
    </svg>
  );
}

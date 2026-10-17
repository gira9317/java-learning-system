import { Handle, Position, type Edge, type Node, type NodeProps } from "@xyflow/react";
import type { FlowNodeType } from "@/lib/flow";
import { ShapeBody } from "./flow-shapes";

// React Flow で使う、フローチャートのノードと矢印の型

export type ShapeNodeData = { label: string; kind: FlowNodeType; issue?: boolean };
export type ShapeNode = Node<ShapeNodeData, "shape">;
export type BranchEdge = Edge<{ branch?: "true" | "false" }>;

// Tailwind v4 の important は末尾の ! で書く（React Flow の既定のスタイルより優先するため）
const handleClass = "size-2.5! border-2! border-white! bg-ink-muted-48! hover:bg-primary!";

/**
 * フローチャートのノード。上が入口、下が出口。
 * 条件分岐は下が True・右が False の 2 つの出口を持ち、どちらから引いたかで分岐が決まる
 * （フローチャートの慣例どおり、主な流れの「はい」を下に続ける）。
 * 開始には入口がなく、終了には出口がない。
 */
export function ShapeNodeView({ data, selected }: NodeProps<ShapeNode>) {
  const { kind } = data;
  return (
    <>
      {kind !== "start" && <Handle type="target" position={Position.Top} id="in" className={handleClass} />}
      <ShapeBody type={kind} label={data.label} selected={selected} issue={data.issue} />
      {kind === "decision" ? (
        <>
          <Handle type="source" position={Position.Bottom} id="true" className={handleClass}>
            <span className="pointer-events-none absolute top-1 left-3 type-fine font-semibold text-ink-muted-80">True</span>
          </Handle>
          <Handle type="source" position={Position.Right} id="false" className={handleClass}>
            <span className="pointer-events-none absolute -top-5 left-1 type-fine font-semibold text-ink-muted-80">False</span>
          </Handle>
        </>
      ) : (
        kind !== "end" && <Handle type="source" position={Position.Bottom} id="out" className={handleClass} />
      )}
    </>
  );
}

export const nodeTypes = { shape: ShapeNodeView };

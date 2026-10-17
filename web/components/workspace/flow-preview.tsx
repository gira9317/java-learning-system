import type { FlowContent } from "@/api/submissions-api";
import { edgePath, nodeSize } from "@/lib/flow";
import { NodeShape } from "./flow-shapes";

const PADDING = 40;

/** 提出されたフロー図の読み取り専用の表示（管理画面のレビュー用）。全体が収まるように縮尺を合わせる */
export function FlowPreview({ content }: { content: FlowContent }) {
  const { nodes, edges } = content;
  if (nodes.length === 0) {
    return <p className="p-6 type-caption text-ink-muted-48">ノードがありません。</p>;
  }

  const left = Math.min(...nodes.map((n) => n.x - nodeSize[n.type].w / 2)) - PADDING;
  const top = Math.min(...nodes.map((n) => n.y - nodeSize[n.type].h / 2)) - PADDING;
  const right = Math.max(...nodes.map((n) => n.x + nodeSize[n.type].w / 2)) + PADDING;
  const bottom = Math.max(...nodes.map((n) => n.y + nodeSize[n.type].h / 2)) + PADDING;

  return (
    <svg
      viewBox={`${left} ${top} ${right - left} ${bottom - top}`}
      className="h-full max-h-[640px] w-full"
      role="img"
      aria-label="提出されたフローチャート"
    >
      <defs>
        <marker id="preview-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" fill="#7a7a7a" />
        </marker>
      </defs>
      {edges.map((edge) => {
        const p = edgePath(edge, nodes);
        if (!p) return null;
        return (
          <g key={edge.id}>
            <path d={p.d} stroke="#7a7a7a" strokeWidth={1.4} fill="none" markerEnd="url(#preview-arrow)" />
            {edge.branch && p.labelX !== undefined && (
              <text
                x={p.labelX}
                y={p.labelY}
                textAnchor="start"
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
        <NodeShape key={node.id} node={node} />
      ))}
    </svg>
  );
}

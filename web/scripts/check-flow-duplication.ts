import assert from "node:assert/strict";
import type { ShapeNode, BranchEdge } from "../components/workspace/flow-node";
import { startFlowDuplication, finishFlowDuplication } from "../lib/flow-duplication";

const nodes: ShapeNode[] = [
  { id: "a", type: "shape", position: {x:10,y:20}, data: {kind:"decision",label:"条件"}, selected:true },
  { id: "b", type: "shape", position: {x:10,y:120}, data: {kind:"process",label:"処理"}, selected:true },
  { id: "outside", type: "shape", position: {x:300,y:20}, data: {kind:"end",label:"終了"} },
];
const edges: BranchEdge[] = [
  { id:"internal",source:"a",target:"b",sourceHandle:"true",targetHandle:"in",data:{branch:"true"} },
  { id:"external",source:"a",target:"outside",sourceHandle:"false",targetHandle:"in",data:{branch:"false"} },
];
const before = structuredClone({ nodes,edges });
let counter=100;
const nextId=(prefix:"n"|"e")=>`${prefix}${counter++}`;

function moved(plan: NonNullable<ReturnType<typeof startFlowDuplication>>, ids: string[]) {
  return plan.nodes.map(node=>ids.includes(node.id) ? {...node,position:{x:node.position.x+80,y:node.position.y+60}} : node);
}

const single=startFlowDuplication(nodes,edges,["a"],nextId)!;
assert.equal(single.nodes.length,4);
assert.equal(single.edges.length,2);
const duplicateId=single.swapIds.get("a")!;
assert.equal(single.edges.find(edge=>edge.id==="external")?.source,duplicateId);
const dropped=finishFlowDuplication(moved(single,["a"]),single.edges,single.swapIds);
assert.deepEqual(dropped.nodes.find(node=>node.id==="a")?.position,nodes[0].position);
assert.deepEqual(dropped.nodes.find(node=>node.id===duplicateId)?.position,{x:90,y:80});
assert.equal(dropped.nodes.find(node=>node.id===duplicateId)?.data.label,"条件");
assert.equal(dropped.nodes.find(node=>node.id===duplicateId)?.selected,true);
assert.equal(dropped.nodes.find(node=>node.id==="a")?.selected,false);
assert.deepEqual(dropped.edges,edges.map(edge=>({...edge,selected:false})));

const group=startFlowDuplication(nodes,edges,["a","b"],nextId)!;
assert.equal(group.nodes.length,5);
assert.equal(group.edges.length,3);
const finished=finishFlowDuplication(moved(group,["a","b"]),group.edges,group.swapIds);
for(const id of ["a","b","outside"])assert.deepEqual(finished.nodes.find(node=>node.id===id)?.position,nodes.find(node=>node.id===id)?.position);
const internal=finished.edges.find(edge=>edge.id!=="internal"&&edge.id!=="external")!;
assert.equal(internal.source,group.swapIds.get("a"));
assert.equal(internal.target,group.swapIds.get("b"));
assert.equal(internal.sourceHandle,"true");
assert.equal(internal.data?.branch,"true");
assert.equal(finished.edges.filter(edge=>edge.target==="outside").length,1);
assert.equal(finished.edges.find(edge=>edge.id==="external")?.source,"a");
const again=startFlowDuplication(finished.nodes,finished.edges,[internal.source,internal.target],nextId)!;
assert.equal(new Set(again.nodes.map(node=>node.id)).size,again.nodes.length);
assert.equal(new Set(again.edges.map(edge=>edge.id)).size,again.edges.length);
for(const edge of again.edges)assert.ok(again.nodes.some(node=>node.id===edge.source)&&again.nodes.some(node=>node.id===edge.target));
assert.deepEqual({nodes,edges},before);
assert.equal(startFlowDuplication(nodes,edges,[],nextId),null);
console.log("PASS: single/group Alt-drag duplication, original IDs/positions/connections, internal branches, repeated copies and immutable source graph");

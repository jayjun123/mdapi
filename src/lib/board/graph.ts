import type { Edge } from "reactflow";

export function wouldIntroduceCycle(params: {
  edges: Edge[];
  addEdge: { source: string; target: string };
}): boolean {
  const { edges, addEdge } = params;
  const adj = new Map<string, Set<string>>();

  function add(u: string, v: string) {
    const s = adj.get(u) ?? new Set<string>();
    s.add(v);
    adj.set(u, s);
  }

  for (const e of edges) {
    if (!e.source || !e.target) continue;
    add(e.source, e.target);
  }
  add(addEdge.source, addEdge.target);

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(u: string): boolean {
    if (visiting.has(u)) return true;
    if (visited.has(u)) return false;
    visiting.add(u);
    for (const v of adj.get(u) ?? []) {
      if (dfs(v)) return true;
    }
    visiting.delete(u);
    visited.add(u);
    return false;
  }

  for (const node of adj.keys()) {
    if (dfs(node)) return true;
  }
  return false;
}


import type { Edge, Node } from "reactflow";
import { chipDefinitionByType } from "@/lib/chip-registry/chipDefinitions";
import type { BoardChipInstance, ExecutionLogEntry } from "@/lib/board/boardTypes";
import { mockExecutors } from "@/lib/mock/mockExecutors";

export type ExecutionResult = {
  ok: boolean;
  logs: ExecutionLogEntry[];
  chipOutputs: Record<string, Record<string, unknown>>;
  finalResult?: unknown;
};

function topoSort(nodeIds: string[], edges: Edge[]) {
  const indeg = new Map<string, number>(nodeIds.map((id) => [id, 0]));
  const out = new Map<string, string[]>();
  for (const e of edges) {
    if (!e.source || !e.target) continue;
    out.set(e.source, [...(out.get(e.source) ?? []), e.target]);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }
  const q: string[] = [];
  for (const [id, d] of indeg) if (d === 0) q.push(id);
  const res: string[] = [];
  while (q.length) {
    const u = q.shift()!;
    res.push(u);
    for (const v of out.get(u) ?? []) {
      indeg.set(v, (indeg.get(v) ?? 0) - 1);
      if ((indeg.get(v) ?? 0) === 0) q.push(v);
    }
  }
  return res.length === nodeIds.length ? res : null;
}

export async function executeBoard(params: {
  nodes: Node[];
  edges: Edge[];
  chips: Record<string, BoardChipInstance>;
}): Promise<ExecutionResult> {
  const { nodes, edges, chips } = params;
  const logs: ExecutionLogEntry[] = [];
  const chipOutputs: Record<string, Record<string, unknown>> = {};

  const nodeIds = nodes.map((n) => n.id);
  const ordered = topoSort(nodeIds, edges) ?? nodeIds;

  const nodeIdToChipId = new Map(
    nodes.map((n) => [n.id, (n.data as unknown as { chipId?: string } | undefined)?.chipId])
  );

  function push(level: ExecutionLogEntry["level"], message: string, chipId?: string) {
    logs.push({
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      at: Date.now(),
      level,
      message,
      chipId,
    });
  }

  for (const nodeId of ordered) {
    const chipId = nodeIdToChipId.get(nodeId);
    if (!chipId) continue;
    const chip = chips[chipId];
    if (!chip) continue;
    const def = chipDefinitionByType.get(chip.chipType);
    if (!def || !def.executable) continue;

    const exec = mockExecutors[chip.chipType];
    if (!exec) {
      push("warn", `executor 없음: ${chip.chipType}`, chipId);
      continue;
    }

    const incoming = edges.filter((e) => e.target === nodeId);
    const inputs: Record<string, unknown> = {};
    for (const e of incoming) {
      const srcChipId = nodeIdToChipId.get(e.source);
      if (!srcChipId) continue;
      const srcOut = chipOutputs[srcChipId] ?? {};
      const srcVal = e.sourceHandle ? srcOut[e.sourceHandle] : undefined;
      const key = e.targetHandle ?? "in_any";
      if (inputs[key] === undefined) inputs[key] = srcVal;
      else if (Array.isArray(inputs[key])) (inputs[key] as unknown[]).push(srcVal);
      else inputs[key] = [inputs[key], srcVal];
    }

    push("info", `실행: ${chip.name}`, chipId);
    try {
      const r = await exec({ chip, inputs });
      chipOutputs[chipId] = r.outputs ?? {};
      for (const l of r.logs ?? []) push(l.level, l.message, chipId);
    } catch (e) {
      push("error", `실행 실패: ${String(e)}`, chipId);
      return { ok: false, logs, chipOutputs };
    }
  }

  // 최종 결과: result_panel_chip이 있다면 해당 출력 우선
  const resultChipId = Object.values(chips).find((c) => c.chipType === "result_panel_chip")?.id;
  const finalResult = resultChipId ? (chipOutputs[resultChipId]?.out_render ?? chipOutputs[resultChipId]) : undefined;

  return { ok: true, logs, chipOutputs, finalResult };
}


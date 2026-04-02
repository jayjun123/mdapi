import type { Edge, Node } from "reactflow";
import { chipDefinitionByType } from "@/lib/chip-registry/chipDefinitions";
import type { BoardChipInstance } from "@/lib/board/boardTypes";

export type BoardIssue = {
  level: "error" | "warn";
  code: string;
  message: string;
  chipId?: string;
};

export function validateBoard(params: {
  nodes: Node[];
  edges: Edge[];
  chips: Record<string, BoardChipInstance>;
}): { ok: boolean; issues: BoardIssue[] } {
  const { nodes, edges, chips } = params;
  const issues: BoardIssue[] = [];

  const nodeIdToChipId = new Map(
    nodes.map((n) => [n.id, (n.data as unknown as { chipId?: string } | undefined)?.chipId])
  );

  const startChips = nodes
    .map((n) => nodeIdToChipId.get(n.id))
    .filter(Boolean)
    .map((id) => chips[id!])
    .filter(Boolean)
    .filter((c) => chipDefinitionByType.get(c.chipType)?.category === "input" && chipDefinitionByType.get(c.chipType)?.executable);

  if (startChips.length === 0) {
    issues.push({
      level: "error",
      code: "NO_START",
      message: "시작칩(실행 가능한 입력칩)이 없습니다. 예: 텍스트 입력칩",
    });
  }

  for (const n of nodes) {
    const chipId = nodeIdToChipId.get(n.id);
    if (!chipId) continue;
    const chip = chips[chipId];
    if (!chip) continue;
    const def = chipDefinitionByType.get(chip.chipType);
    if (!def) continue;

    const requiredInputs = def.ports.filter((p) => p.direction === "INPUT" && p.required);
    for (const p of requiredInputs) {
      const has = edges.some((e) => e.target === n.id && e.targetHandle === p.id);
      if (!has) {
        issues.push({
          level: "error",
          code: "REQUIRED_INPUT",
          message: `「${def.name}」에 꼭 필요한 입력「${p.name}」에 선이 없습니다. 앞 칩의 출력을 이쪽으로 연결해야 이 칩이 동작하고 결과를 볼 수 있습니다.`,
          chipId,
        });
      }
    }
  }

  return { ok: issues.every((i) => i.level !== "error"), issues };
}


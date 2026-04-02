import type { Edge, Node } from "reactflow";
import type { BoardChipInstance } from "@/lib/board/boardTypes";
import type { ChipNodeData } from "@/store/useBoardStore";
import { chipDefinitionByType } from "@/lib/chip-registry/chipDefinitions";

export function sampleBoardSummaryDemo(): {
  nodes: Node<ChipNodeData>[];
  edges: Edge[];
  chips: Record<string, BoardChipInstance>;
} {
  const chips: Record<string, BoardChipInstance> = {};

  function makeChip(id: string, chipType: string, name?: string, config?: Record<string, unknown>) {
    const def = chipDefinitionByType.get(chipType);
    if (!def) throw new Error(`Unknown chipType: ${chipType}`);
    chips[id] = {
      id,
      chipType,
      name: name ?? def.name,
      config: { ...def.defaultConfig, ...(config ?? {}) },
      lastRun: { status: "ready", at: Date.now() },
    };
  }

  makeChip("chip_text_1", "text_input_chip", "텍스트 입력", {
    value: "이 글을 3문장으로 요약해줘. 우리는 비주얼 워크플로우 빌더 MVP를 만들고 있다.",
  });
  makeChip("chip_prompt_1", "prompt_builder_chip");
  makeChip("chip_llm_1", "llm_core_chip");
  makeChip("chip_result_1", "result_panel_chip");

  const nodes: Node<ChipNodeData>[] = [
    { id: "node_text_1", type: "chipNode", position: { x: 96, y: 128 }, data: { chipId: "chip_text_1" } },
    { id: "node_prompt_1", type: "chipNode", position: { x: 320, y: 112 }, data: { chipId: "chip_prompt_1" } },
    { id: "node_llm_1", type: "chipNode", position: { x: 560, y: 112 }, data: { chipId: "chip_llm_1" } },
    { id: "node_result_1", type: "chipNode", position: { x: 800, y: 88 }, data: { chipId: "chip_result_1" } },
  ];

  const edges: Edge[] = [
    {
      id: "edge_1",
      source: "node_text_1",
      sourceHandle: "out_text",
      target: "node_prompt_1",
      targetHandle: "in_text",
      data: { validationLevel: "allow" },
      style: { strokeWidth: 2 },
    },
    {
      id: "edge_2",
      source: "node_prompt_1",
      sourceHandle: "out_prompt",
      target: "node_llm_1",
      targetHandle: "in_prompt",
      data: { validationLevel: "allow" },
      style: { strokeWidth: 2 },
    },
    {
      id: "edge_3",
      source: "node_llm_1",
      sourceHandle: "out_text",
      target: "node_result_1",
      targetHandle: "in_any",
      data: { validationLevel: "warn" },
      style: { strokeWidth: 2 },
    },
  ];

  return { nodes, edges, chips };
}


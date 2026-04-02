"use client";

import { create } from "zustand";
import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type Edge, type EdgeChange, type Node, type NodeChange } from "reactflow";
import { chipDefinitionByType } from "@/lib/chip-registry/chipDefinitions";
import type { BoardChipInstance, ExecutionLogEntry, ValidationResult } from "@/lib/board/boardTypes";
import { makeId } from "@/lib/utils/ids";
import { validatePortConnection } from "@/lib/board/connectionRules";
import { wouldIntroduceCycle } from "@/lib/board/graph";
import { validateBoard } from "@/lib/board/validation";
import { executeBoard } from "@/lib/board/execution";
import { sampleBoardSummaryDemo } from "@/lib/mock/mockData";

export type ChipNodeData = {
  chipId: string;
};

type ConnectionPreview = {
  level: ValidationResult["level"];
  message: string;
  adapterType?: string;
};

type BoardState = {
  nodes: Node<ChipNodeData>[];
  edges: Edge[];

  chips: Record<string, BoardChipInstance>;
  selectedChipId: string | null;

  executionState: {
    running: boolean;
    lastResult?: unknown;
  };

  connectionPreview: ConnectionPreview | null;
  lastValidation: ValidationResult | null;
  logs: ExecutionLogEntry[];

  setSelectedChipId: (id: string | null) => void;
  setChipConfig: (chipId: string, patch: Record<string, unknown>) => void;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;

  addChipToBoard: (chipType: string, position: { x: number; y: number }) => void;
  removeSelected: () => void;

  validateConnection: (conn: Connection) => ValidationResult;
  setConnectionPreviewFromConnection: (conn: Connection | null) => void;
  tryConnect: (conn: Connection) => void;

  addLog: (entry: Omit<ExecutionLogEntry, "id" | "at">) => void;
  clearLogs: () => void;

  runBoard: () => Promise<void>;
};

export const useBoardStore = create<BoardState>((set, get) => ({
  ...sampleBoardSummaryDemo(),
  selectedChipId: null,
  executionState: { running: false },
  connectionPreview: null,
  lastValidation: null,
  logs: [],

  setSelectedChipId: (id) => set({ selectedChipId: id }),

  setChipConfig: (chipId, patch) =>
    set((s) => {
      const chip = s.chips[chipId];
      if (!chip) return s;
      return {
        chips: {
          ...s.chips,
          [chipId]: { ...chip, config: { ...chip.config, ...patch } },
        },
      };
    }),

  onNodesChange: (changes) =>
    set((s) => ({
      nodes: applyNodeChanges(changes, s.nodes),
    })),

  onEdgesChange: (changes) =>
    set((s) => ({
      edges: applyEdgeChanges(changes, s.edges),
    })),

  addChipToBoard: (chipType, position) => {
    const def = chipDefinitionByType.get(chipType);
    if (!def) return;
    const chipId = makeId("chip");
    const nodeId = makeId("node");

    const chip: BoardChipInstance = {
      id: chipId,
      chipType: def.type,
      name: def.name,
      config: { ...def.defaultConfig },
      lastRun: { status: "ready", at: Date.now() },
    };

    const node: Node<ChipNodeData> = {
      id: nodeId,
      type: "chipNode",
      position,
      data: { chipId },
      draggable: true,
      selectable: true,
    };

    set((s) => ({
      chips: { ...s.chips, [chipId]: chip },
      nodes: [...s.nodes, node],
      selectedChipId: chipId,
    }));
  },

  removeSelected: () => {
    const chipId = get().selectedChipId;
    if (!chipId) return;
    const nodeId = get().nodes.find((n) => n.data?.chipId === chipId)?.id;
    set((s) => {
      const nextChips = { ...s.chips };
      delete nextChips[chipId];
      const nextNodes = s.nodes.filter((n) => n.data?.chipId !== chipId);
      const nextEdges = nodeId ? s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId) : s.edges;
      return { chips: nextChips, nodes: nextNodes, edges: nextEdges, selectedChipId: null };
    });
  },

  validateConnection: (conn) => {
    const { source, sourceHandle, target, targetHandle } = conn;
    if (!source || !target || !sourceHandle || !targetHandle) {
      return { ok: false, level: "deny", code: "MISSING", message: "포트 정보가 부족합니다." };
    }

    const sourceChipId = get().nodes.find((n) => n.id === source)?.data?.chipId;
    const targetChipId = get().nodes.find((n) => n.id === target)?.data?.chipId;
    if (!sourceChipId || !targetChipId) {
      return { ok: false, level: "deny", code: "NODE_MISSING", message: "노드가 존재하지 않습니다." };
    }

    const sourceDef = chipDefinitionByType.get(get().chips[sourceChipId]?.chipType ?? "");
    const targetDef = chipDefinitionByType.get(get().chips[targetChipId]?.chipType ?? "");
    const sourcePort = sourceDef?.ports.find((p) => p.id === sourceHandle);
    const targetPort = targetDef?.ports.find((p) => p.id === targetHandle);
    if (!sourcePort || !targetPort) {
      return { ok: false, level: "deny", code: "PORT_MISSING", message: "포트가 존재하지 않습니다." };
    }

    const isDuplicate = get().edges.some(
      (e) => e.source === source && e.target === target && e.sourceHandle === sourceHandle && e.targetHandle === targetHandle,
    );

    const targetAlreadyConnected = get().edges.some((e) => e.target === target && e.targetHandle === targetHandle);

    const result = validatePortConnection({
      sourcePort,
      targetPort,
      isSameChip: sourceChipId === targetChipId,
      isDuplicateEdge: isDuplicate,
      targetAlreadyConnected,
    });

    if (result.level !== "deny") {
      const cycle = wouldIntroduceCycle({ edges: get().edges, addEdge: { source, target } });
      if (cycle) {
        return { ok: false, level: "deny", code: "CYCLE", message: "순환 참조(루프)는 허용되지 않습니다." };
      }
    }

    return result;
  },

  setConnectionPreviewFromConnection: (conn) => {
    if (!conn) return set({ connectionPreview: null });
    const r = get().validateConnection(conn);
    set({
      connectionPreview: { level: r.level, message: r.message, adapterType: r.adapterType },
      lastValidation: r,
    });
  },

  tryConnect: (conn) => {
    const r = get().validateConnection(conn);
    set({ lastValidation: r, connectionPreview: null });
    if (!r.ok) return;
    set((s) => ({
      edges: addEdge(
        {
          ...conn,
          id: makeId("edge"),
          animated: conn.sourceHandle?.startsWith("evt") ?? false,
          style: { strokeWidth: 2 },
          data: { validationLevel: r.level },
        },
        s.edges,
      ),
    }));
  },

  addLog: (entry) =>
    set((s) => ({
      logs: [
        ...s.logs,
        {
          id: makeId("log"),
          at: Date.now(),
          ...entry,
        },
      ],
    })),

  clearLogs: () => set({ logs: [] }),

  runBoard: async () => {
    const { nodes, edges, chips } = get();
    set({ executionState: { running: true, lastResult: undefined } });

    const v = validateBoard({ nodes, edges, chips });
    if (!v.ok) {
      for (const issue of v.issues) {
        get().addLog({ level: issue.level === "error" ? "error" : "warn", message: `[${issue.code}] ${issue.message}`, chipId: issue.chipId });
      }
      set({ executionState: { running: false, lastResult: undefined } });
      return;
    }

    // 상태 LED 초기화
    set((s) => {
      const next: Record<string, BoardChipInstance> = { ...s.chips };
      for (const [id, c] of Object.entries(next)) {
        next[id] = { ...c, lastRun: { status: "ready", at: Date.now() }, lastOutputs: undefined };
      }
      return { chips: next };
    });

    const r = await executeBoard({ nodes, edges, chips: get().chips });
    for (const l of r.logs) {
      get().addLog({ level: l.level, message: l.message, chipId: l.chipId });
    }

    // 결과/칩 출력 반영
    set((s) => {
      const next: Record<string, BoardChipInstance> = { ...s.chips };
      for (const [chipId, outs] of Object.entries(r.chipOutputs)) {
        const c = next[chipId];
        if (!c) continue;
        next[chipId] = { ...c, lastOutputs: outs, lastRun: { status: "ready", at: Date.now() } };
      }
      return { chips: next, executionState: { running: false, lastResult: r.finalResult } };
    });
  },
}));


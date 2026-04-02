"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  type ReactFlowInstance,
  type Connection,
} from "reactflow";
import "reactflow/dist/style.css";
import { BoardBackground } from "@/components/board/BoardBackground";
import { ChipNode } from "@/components/chips/ChipNode";
import { useBoardStore } from "@/store/useBoardStore";
import { VALIDATION_COLOR } from "@/lib/utils/colors";

type EdgeData = { validationLevel?: keyof typeof VALIDATION_COLOR };

function BreadboardCanvasInner() {
  const nodes = useBoardStore((s) => s.nodes);
  const edges = useBoardStore((s) => s.edges);
  const onNodesChange = useBoardStore((s) => s.onNodesChange);
  const onEdgesChange = useBoardStore((s) => s.onEdgesChange);
  const tryConnect = useBoardStore((s) => s.tryConnect);
  const lastValidation = useBoardStore((s) => s.lastValidation);
  const validateConnection = useBoardStore((s) => s.validateConnection);
  const setConnectionPreviewFromConnection = useBoardStore((s) => s.setConnectionPreviewFromConnection);
  const setSelectedChipId = useBoardStore((s) => s.setSelectedChipId);
  const addChipToBoard = useBoardStore((s) => s.addChipToBoard);

  const [rf, setRf] = useState<ReactFlowInstance | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const nodeTypes = useMemo(() => ({ chipNode: ChipNode }), []);

  const onConnect = useCallback(
    (conn: Connection) => {
      tryConnect(conn);
    },
    [tryConnect],
  );

  const isValidConnection = useCallback(
    (conn: Connection) => {
      setConnectionPreviewFromConnection(conn);
      return validateConnection(conn).ok;
    },
    [setConnectionPreviewFromConnection, validateConnection],
  );

  const onDragOver = useCallback((evt: React.DragEvent) => {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (evt: React.DragEvent) => {
      evt.preventDefault();
      const chipType = evt.dataTransfer.getData("application/x-chip-type");
      if (!chipType || !rf || !wrapperRef.current) return;

      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = rf.project({
        x: evt.clientX - bounds.left,
        y: evt.clientY - bounds.top,
      });

      const snapped = {
        x: Math.round(position.x / 16) * 16,
        y: Math.round(position.y / 16) * 16,
      };
      addChipToBoard(chipType, snapped);
    },
    [addChipToBoard, rf],
  );

  const connectionLineStyle = useMemo(() => {
    const level = lastValidation?.level ?? "allow";
    return {
      stroke: VALIDATION_COLOR[level],
      strokeWidth: 2,
    };
  }, [lastValidation?.level]);

  return (
    <div ref={wrapperRef} className="absolute inset-0" onDrop={onDrop} onDragOver={onDragOver}>
      <BoardBackground />
      <ReactFlow
        nodes={nodes}
        edges={edges.map((e) => {
          const level = (e.data as EdgeData | undefined)?.validationLevel ?? "allow";
          return {
            ...e,
            style: {
              ...(e.style ?? {}),
              stroke: VALIDATION_COLOR[level],
            },
          };
        })}
        nodeTypes={nodeTypes}
        onInit={setRf}
        onConnect={onConnect}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onPaneClick={() => setSelectedChipId(null)}
        onConnectEnd={() => setConnectionPreviewFromConnection(null)}
        isValidConnection={isValidConnection}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        snapToGrid
        snapGrid={[16, 16]}
        connectionLineStyle={connectionLineStyle}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} color="rgba(255,255,255,0.04)" />
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          nodeColor={() => "rgba(120,180,220,0.65)"}
          maskColor="rgba(0,0,0,0.35)"
          style={{ background: "rgba(0,0,0,0.25)" }}
        />
      </ReactFlow>
    </div>
  );
}

export function BreadboardCanvas() {
  return (
    <ReactFlowProvider>
      <BreadboardCanvasInner />
    </ReactFlowProvider>
  );
}


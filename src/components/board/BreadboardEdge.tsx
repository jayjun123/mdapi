"use client";

import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "reactflow";
import type { ReactFlowBoardEdgeData } from "@/core/board/reactFlowMapper";

function labelPill(text: string, accent: string) {
  return (
    <div
      style={{
        pointerEvents: "none",
        padding: "2px 7px",
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0.02,
        background: "rgba(15,23,42,0.92)",
        border: `1px solid ${accent}55`,
        color: accent,
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}

function BreadboardEdgeComponent(props: EdgeProps<ReactFlowBoardEdgeData>) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
    selected,
    data,
  } = props;

  const kind = data?.kind ?? "data";
  const accent = kind === "event" ? "#fbbf24" : "#4ade80";

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  /** 화살표 방향: 출발 쪽(출력) → 도착 쪽(입력) */
  const outX = sourceX + (labelX - sourceX) * 0.32;
  const outY = sourceY + (labelY - sourceY) * 0.32;
  const inX = labelX + (targetX - labelX) * 0.58;
  const inY = labelY + (targetY - labelY) * 0.58;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          strokeWidth: selected ? 3 : (style?.strokeWidth as number) ?? 2,
        }}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(${outX}px, ${outY}px) translate(-50%, -50%)`,
            zIndex: 10,
          }}
        >
          {labelPill("출력", accent)}
        </div>
        <div
          style={{
            position: "absolute",
            transform: `translate(${inX}px, ${inY}px) translate(-50%, -50%)`,
            zIndex: 10,
          }}
        >
          {labelPill("입력", accent)}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const BreadboardEdge = memo(BreadboardEdgeComponent);
export default BreadboardEdge;

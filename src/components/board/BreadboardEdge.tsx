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
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0.02,
        background: "rgba(40, 40, 48, 0.94)",
        border: `1px solid ${accent}55`,
        color: "#e4e4e7",
        boxShadow: "0 1px 6px rgba(0, 0, 0, 0.35)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: accent }}>{text}</span>
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
  const accent = kind === "event" ? "#ca8a04" : "#ea580c";
  const stroke =
    kind === "event"
      ? selected
        ? "#a16207"
        : "#d97706"
      : selected
        ? "#9a3412"
        : "#ea580c";

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
          stroke,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: selected ? 3.25 : (style?.strokeWidth as number) ?? 2.25,
          filter: selected ? "drop-shadow(0 0 3px rgba(234, 88, 12, 0.45))" : undefined,
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

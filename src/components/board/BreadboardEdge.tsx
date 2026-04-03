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
    animated,
  } = props;

  const kind = data?.kind ?? "data";
  /** reactFlowMapper에서 출발 칩별 팔레트·검증 색이 style.stroke로 전달됨 */
  const strokeFromMapper = typeof style?.stroke === "string" ? style.stroke : null;
  const stroke =
    strokeFromMapper ??
    (kind === "event" ? "#d97706" : "#ea580c");
  const accent = stroke;

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

  const baseW = selected ? 3.25 : ((style?.strokeWidth as number) ?? 2.25);

  /** 실행 중: 아래는 흐릿한 궤적, 위는 밝은 빛이 20초에 한 바퀴 이동 */
  if (animated) {
    const glow =
      "drop-shadow(0 0 5px rgba(255, 255, 250, 0.95)) drop-shadow(0 0 14px rgba(251, 191, 36, 0.75))";
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
            strokeWidth: baseW,
            strokeOpacity: 0.38,
          }}
          markerEnd={markerEnd}
        />
        <path
          id={`${id}-pulse`}
          d={edgePath}
          fill="none"
          className="react-flow__edge-path breadboard-edge-pulse-path"
          style={{
            stroke: "#fffef5",
            strokeWidth: baseW + 1.1,
            filter: glow,
          }}
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
          strokeWidth: baseW,
          filter: selected ? `drop-shadow(0 0 4px ${stroke}88)` : undefined,
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

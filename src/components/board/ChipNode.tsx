import React, { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { NodeProps } from 'reactflow';
import type { ReactFlowChipNodeData, ReactFlowChipPortData } from '@/core/board/reactFlowMapper';
import { PortHandle } from '@/components/board/PortHandle';

export type ChipNodeProps = NodeProps<ReactFlowChipNodeData>;

function ledColor(status: ReactFlowChipNodeData['runtime']['executionStatus']): string {
  switch (status) {
    case 'running':
      return '#38bdf8';
    case 'success':
      return '#22c55e';
    case 'warning':
      return '#f59e0b';
    case 'error':
      return '#ef4444';
    case 'ready':
      return '#a78bfa';
    case 'idle':
    default:
      return '#64748b';
  }
}

function categoryColor(category: ReactFlowChipNodeData['category']): string {
  switch (category) {
    case 'input':
      return '#0ea5e9';
    case 'ai':
      return '#8b5cf6';
    case 'logic':
      return '#f59e0b';
    case 'action':
      return '#10b981';
    case 'output':
      return '#ec4899';
    default:
      return '#94a3b8';
  }
}

function groupPorts(ports: ReactFlowChipPortData[]) {
  return {
    top: ports.filter((port) => port.placement === 'top'),
    right: ports.filter((port) => port.placement === 'right'),
    bottom: ports.filter((port) => port.placement === 'bottom'),
    left: ports.filter((port) => port.placement === 'left'),
  };
}

const SIDE_PORT_STEP = 28;
/** 통계 그리드·하단 패딩 위 최소 여백(px) */
const SIDE_PORT_FOOTER_CLEARANCE = 52;
/** 포트 스택이 노드 밖으로 밀리면 이 값 이상으로만 위로 당김 */
const SIDE_PORT_BOTTOM_MIN = 22;

function sidePortBottomOffsets(portsLen: number, nodeHeight: number): number[] {
  if (portsLen === 0) return [];
  const span = (portsLen - 1) * SIDE_PORT_STEP;
  const maxBottom = Math.max(SIDE_PORT_FOOTER_CLEARANCE + 8, nodeHeight - 18);
  let base = SIDE_PORT_FOOTER_CLEARANCE;
  if (base + span > maxBottom) {
    base = Math.max(SIDE_PORT_BOTTOM_MIN, maxBottom - span);
  }
  /** 정의 배열 순서 = 화면에서 위→아래 (첫 포트가 더 위). bottom 오프셋은 클수록 위쪽이므로 역순 부여 */
  return Array.from({ length: portsLen }, (_, i) => base + (portsLen - 1 - i) * SIDE_PORT_STEP);
}

function renderPortColumn(
  ports: ReactFlowChipPortData[],
  side: 'left' | 'right' | 'top' | 'bottom',
  disabled: boolean,
  sideBottomOffsets?: number[]
) {
  return ports.map((port, index) => {
    const baseStyle: CSSProperties =
      side === 'left' || side === 'right'
        ? {
            position: 'absolute',
            bottom:
              sideBottomOffsets?.[index] ?? SIDE_PORT_FOOTER_CLEARANCE + index * SIDE_PORT_STEP,
            [side]: 0,
          }
        : {
            position: 'absolute',
            left: 18 + index * 64,
            [side]: 0,
          };

    return (
      <div key={port.id} style={baseStyle}>
        <PortHandle port={port} disabled={disabled} compact={side === 'top' || side === 'bottom'} />
      </div>
    );
  });
}

function ChipNodeComponent({ data, selected, dragging }: ChipNodeProps) {
  const ports = useMemo(() => groupPorts(data.ports), [data.ports]);
  const accent = categoryColor(data.category);
  const led = ledColor(data.runtime.executionStatus);
  const disabled = Boolean(data.flags.disabled);

  const rootRef = useRef<HTMLDivElement>(null);
  const [nodeHeightPx, setNodeHeightPx] = useState(120);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setNodeHeightPx(h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const leftBottoms = useMemo(
    () => sidePortBottomOffsets(ports.left.length, nodeHeightPx),
    [ports.left.length, nodeHeightPx]
  );
  const rightBottoms = useMemo(
    () => sidePortBottomOffsets(ports.right.length, nodeHeightPx),
    [ports.right.length, nodeHeightPx]
  );

  const mono = 'ui-monospace, SFMono-Regular, "Cascadia Code", Consolas, monospace';

  return (
    <div
      ref={rootRef}
      style={{
        position: 'relative',
        minWidth: 96,
        minHeight: 64,
        width: '100%',
        height: '100%',
        borderRadius: 6,
        padding: '18px 14px 12px',
        background: disabled
          ? 'linear-gradient(180deg, #44403c 0%, #292524 55%, #1c1917 100%)'
          : 'linear-gradient(180deg, #3f3c3a 0%, #292524 42%, #1a1816 100%)',
        border: selected ? `2px solid ${accent}` : '1px solid rgba(28, 25, 23, 0.95)',
        boxShadow: selected
          ? `0 0 0 2px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.07), 0 12px 28px rgba(0,0,0,0.45)`
          : dragging
            ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 14px 32px rgba(0,0,0,0.5)'
            : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 20px rgba(0,0,0,0.4)',
        color: '#e7e5e4',
        overflow: 'visible',
        transition: 'box-shadow 160ms ease, border-color 160ms ease, transform 160ms ease',
        transform: dragging ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          transform: 'translateX(-50%)',
          width: 22,
          height: 8,
          background: '#1c1917',
          borderRadius: '0 0 10px 10px',
          boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 8,
          right: 8,
          top: 10,
          height: 2,
          borderRadius: 1,
          background: accent,
          opacity: 0.85,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 6,
          pointerEvents: 'none',
          background: `linear-gradient(135deg, ${accent}0f 0%, transparent 42%)`,
        }}
      />

      {renderPortColumn(ports.left, 'left', disabled, leftBottoms)}
      {renderPortColumn(ports.right, 'right', disabled, rightBottoms)}
      {renderPortColumn(ports.top, 'top', disabled)}
      {renderPortColumn(ports.bottom, 'bottom', disabled)}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                borderRadius: 3,
                background: '#1c1917',
                color: accent,
                fontSize: 12,
                fontWeight: 800,
                fontFamily: mono,
                border: `1px solid ${accent}55`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              {data.icon.slice(0, 2).toUpperCase()}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: '#fafaf9',
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: 0.02,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {data.title}
              </div>
              <div
                style={{
                  color: '#a8a29e',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: mono,
                  textTransform: 'uppercase',
                  letterSpacing: 0.06,
                }}
              >
                {data.chipType}
              </div>
            </div>
          </div>

          <div
            style={{
              color: '#d6d3d1',
              fontSize: 12,
              lineHeight: 1.35,
              minHeight: 28,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {data.description}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span
            title="상태 LED"
            style={{
              width: 10,
              height: 5,
              borderRadius: 1,
              background: led,
              boxShadow: `0 0 8px ${led}, inset 0 1px 0 rgba(255,255,255,0.25)`,
              border: '1px solid rgba(0,0,0,0.35)',
            }}
          />
          <span
            style={{
              padding: '3px 7px',
              borderRadius: 2,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.08,
              fontFamily: mono,
              background: '#1c1917',
              color: accent,
              border: `1px solid ${accent}44`,
              textTransform: 'uppercase',
            }}
          >
            {data.category}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        {data.executable ? (
          <span
            style={{
              padding: '2px 7px',
              borderRadius: 2,
              background: 'rgba(22, 101, 52, 0.35)',
              color: '#bbf7d0',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: mono,
              border: '1px solid rgba(34,197,94,0.35)',
            }}
          >
            EXECUTABLE
          </span>
        ) : null}
        {data.flags.isStartChip ? (
          <span
            style={{
              padding: '2px 7px',
              borderRadius: 2,
              background: 'rgba(12, 74, 110, 0.4)',
              color: '#bae6fd',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: mono,
              border: '1px solid rgba(14,165,233,0.35)',
            }}
          >
            START
          </span>
        ) : null}
        {disabled ? (
          <span
            style={{
              padding: '2px 7px',
              borderRadius: 2,
              background: 'rgba(127, 29, 29, 0.45)',
              color: '#fecaca',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: mono,
              border: '1px solid rgba(239,68,68,0.35)',
            }}
          >
            DISABLED
          </span>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 10,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 6,
        }}
      >
        <div
          style={{
            borderRadius: 3,
            padding: '6px 8px',
            background: 'rgba(0,0,0,0.22)',
            border: '1px solid rgba(120,113,108,0.35)',
          }}
        >
          <div style={{ color: '#a8a29e', fontSize: 10, fontFamily: mono, marginBottom: 3 }}>SIZE</div>
          <div style={{ color: '#fafaf9', fontSize: 12, fontWeight: 700, fontFamily: mono }}>{data.size}</div>
        </div>
        <div
          style={{
            borderRadius: 3,
            padding: '6px 8px',
            background: 'rgba(0,0,0,0.22)',
            border: '1px solid rgba(120,113,108,0.35)',
          }}
        >
          <div style={{ color: '#a8a29e', fontSize: 10, fontFamily: mono, marginBottom: 3 }}>PORTS</div>
          <div style={{ color: '#fafaf9', fontSize: 12, fontWeight: 700, fontFamily: mono }}>{data.ports.length}</div>
        </div>
        <div
          style={{
            borderRadius: 3,
            padding: '6px 8px',
            background: 'rgba(0,0,0,0.22)',
            border: '1px solid rgba(120,113,108,0.35)',
          }}
        >
          <div style={{ color: '#a8a29e', fontSize: 10, fontFamily: mono, marginBottom: 3 }}>STATE</div>
          <div style={{ color: '#fafaf9', fontSize: 12, fontWeight: 700, fontFamily: mono }}>
            {data.runtime.executionStatus}
          </div>
        </div>
      </div>
    </div>
  );
}

export const ChipNode = memo(ChipNodeComponent);
export default ChipNode;


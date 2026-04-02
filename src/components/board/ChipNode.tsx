import React, { memo, useMemo } from 'react';
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

function renderPortColumn(
  ports: ReactFlowChipPortData[],
  side: 'left' | 'right' | 'top' | 'bottom',
  disabled: boolean
) {
  return ports.map((port, index) => {
    const baseStyle: CSSProperties =
      side === 'left' || side === 'right'
        ? {
            position: 'absolute',
            top: 30 + index * 28,
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

  return (
    <div
      style={{
        position: 'relative',
        minWidth: 96,
        minHeight: 64,
        width: '100%',
        height: '100%',
        borderRadius: 18,
        padding: '14px 14px 12px',
        background: disabled
          ? 'linear-gradient(180deg, rgba(51,65,85,0.82), rgba(30,41,59,0.9))'
          : 'linear-gradient(180deg, rgba(15,23,42,0.97), rgba(30,41,59,0.95))',
        border: selected ? `2px solid ${accent}` : '1px solid rgba(148,163,184,0.28)',
        boxShadow: selected
          ? `0 0 0 3px ${accent}22, 0 18px 40px rgba(15, 23, 42, 0.34)`
          : dragging
            ? '0 16px 40px rgba(15, 23, 42, 0.38)'
            : '0 10px 26px rgba(15, 23, 42, 0.22)',
        color: '#e2e8f0',
        overflow: 'visible',
        transition: 'box-shadow 160ms ease, border-color 160ms ease, transform 160ms ease',
        transform: dragging ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 18,
          pointerEvents: 'none',
          background: `radial-gradient(circle at top right, ${accent}18 0%, transparent 34%)`,
        }}
      />

      {renderPortColumn(ports.left, 'left', disabled)}
      {renderPortColumn(ports.right, 'right', disabled)}
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
                width: 28,
                height: 28,
                borderRadius: 10,
                background: `${accent}22`,
                color: accent,
                fontSize: 14,
                fontWeight: 800,
                border: `1px solid ${accent}44`,
              }}
            >
              {data.icon.slice(0, 2).toUpperCase()}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: '#f8fafc',
                  fontSize: 16,
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {data.title}
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                {data.chipType}
              </div>
            </div>
          </div>

          <div
            style={{
              color: '#cbd5e1',
              fontSize: 13,
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
            style={{
              width: 12,
              height: 12,
              borderRadius: '999px',
              background: led,
              boxShadow: `0 0 12px ${led}`,
              border: '1px solid rgba(255,255,255,0.35)',
            }}
          />
          <span
            style={{
              padding: '4px 8px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.4,
              background: `${accent}1c`,
              color: accent,
              border: `1px solid ${accent}33`,
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
              padding: '3px 8px',
              borderRadius: 999,
              background: 'rgba(34,197,94,0.14)',
              color: '#86efac',
              fontSize: 12,
              fontWeight: 700,
              border: '1px solid rgba(34,197,94,0.24)',
            }}
          >
            EXECUTABLE
          </span>
        ) : null}
        {data.flags.isStartChip ? (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 999,
              background: 'rgba(14,165,233,0.14)',
              color: '#7dd3fc',
              fontSize: 12,
              fontWeight: 700,
              border: '1px solid rgba(14,165,233,0.26)',
            }}
          >
            START
          </span>
        ) : null}
        {disabled ? (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 999,
              background: 'rgba(239,68,68,0.14)',
              color: '#fca5a5',
              fontSize: 12,
              fontWeight: 700,
              border: '1px solid rgba(239,68,68,0.24)',
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
            borderRadius: 10,
            padding: '6px 8px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(148,163,184,0.12)',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 3 }}>SIZE</div>
          <div style={{ color: '#f8fafc', fontSize: 13, fontWeight: 700 }}>{data.size}</div>
        </div>
        <div
          style={{
            borderRadius: 10,
            padding: '6px 8px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(148,163,184,0.12)',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 3 }}>PORTS</div>
          <div style={{ color: '#f8fafc', fontSize: 13, fontWeight: 700 }}>{data.ports.length}</div>
        </div>
        <div
          style={{
            borderRadius: 10,
            padding: '6px 8px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(148,163,184,0.12)',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 3 }}>STATE</div>
          <div style={{ color: '#f8fafc', fontSize: 13, fontWeight: 700 }}>{data.runtime.executionStatus}</div>
        </div>
      </div>
    </div>
  );
}

export const ChipNode = memo(ChipNodeComponent);
export default ChipNode;


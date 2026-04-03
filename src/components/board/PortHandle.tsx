import React, { memo } from 'react';
import { Handle, type HandleProps } from 'reactflow';
import type { ReactFlowChipPortData } from '@/core/board/reactFlowMapper';
import { placementToPosition, toHandleId } from '@/core/board/reactFlowMapper';

export type PortHandleProps = {
  port: ReactFlowChipPortData;
  disabled?: boolean;
  compact?: boolean;
  connectionCount?: number;
  showDescription?: boolean;
};

function pinLegStyle(placement: ReactFlowChipPortData['placement']): React.CSSProperties {
  const metal =
    'linear-gradient(90deg, #52525e 0%, #a1a1aa 38%, #f4f4f5 50%, #9ca3af 62%, #3f3f46 100%)';
  switch (placement) {
    case 'top':
      return {
        width: 16,
        height: 5,
        background: metal,
        borderRadius: 1,
        boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
        flexShrink: 0,
      };
    case 'bottom':
      return {
        width: 16,
        height: 5,
        background: metal,
        borderRadius: 1,
        boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
        flexShrink: 0,
      };
    case 'right':
    case 'left':
    default:
      return {
        width: 5,
        height: 16,
        background: metal,
        borderRadius: 1,
        boxShadow: '1px 0 2px rgba(0,0,0,0.3)',
        flexShrink: 0,
      };
  }
}

function getPlacementStyle(placement: ReactFlowChipPortData['placement']): React.CSSProperties {
  switch (placement) {
    case 'top':
      return {
        top: -16,
        left: '50%',
        transform: 'translateX(-50%)',
        flexDirection: 'column',
        alignItems: 'center',
      };
    case 'bottom':
      return {
        bottom: -16,
        left: '50%',
        transform: 'translateX(-50%)',
        flexDirection: 'column-reverse',
        alignItems: 'center',
      };
    case 'right':
      return {
        right: -10,
        top: '50%',
        transform: 'translateY(-50%)',
        flexDirection: 'row-reverse',
        alignItems: 'center',
      };
    case 'left':
    default:
      return {
        left: -10,
        top: '50%',
        transform: 'translateY(-50%)',
        flexDirection: 'row',
        alignItems: 'center',
      };
  }
}

function getShapeStyle(shape: string, color: string): React.CSSProperties {
  switch (shape) {
    case 'triangle':
      return {
        width: 0,
        height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderBottom: `12px solid ${color}`,
        background: 'transparent',
        borderRadius: 0,
      };
    case 'diamond':
      return {
        width: 12,
        height: 12,
        background: color,
        transform: 'rotate(45deg)',
        borderRadius: 2,
      };
    case 'hex':
      return {
        width: 14,
        height: 14,
        background: color,
        clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
      };
    case 'square':
      return {
        width: 12,
        height: 12,
        background: color,
        borderRadius: 3,
      };
    case 'dashed-circle':
      return {
        width: 12,
        height: 12,
        border: `2px dashed ${color}`,
        borderRadius: '999px',
        background: 'rgba(255,255,255,0.85)',
      };
    case 'circle':
    default:
      return {
        width: 12,
        height: 12,
        background: color,
        borderRadius: '999px',
      };
  }
}

function getHandleType(direction: ReactFlowChipPortData['direction']): HandleProps['type'] {
  return direction === 'INPUT' ? 'target' : 'source';
}

function PortHandleComponent({
  port,
  disabled = false,
  compact = false,
  connectionCount,
  showDescription = false,
}: PortHandleProps) {
  const color = port.color;
  const placementStyle = getPlacementStyle(port.placement);
  const shapeStyle = getShapeStyle(port.shape, color);
  const typeLabel = port.required ? `${port.type} · required` : port.type;

  return (
    <div
      title={port.description ?? `${port.name} (${port.type})`}
      style={{
        position: 'absolute',
        display: 'flex',
        gap: 5,
        pointerEvents: 'none',
        zIndex: 3,
        ...placementStyle,
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          flexDirection:
            port.placement === 'top'
              ? 'column'
              : port.placement === 'bottom'
                ? 'column-reverse'
                : port.placement === 'right'
                  ? 'row-reverse'
                  : 'row',
          gap: compact ? 3 : 5,
        }}
      >
        {port.placement === 'left' ? <div style={pinLegStyle(port.placement)} aria-hidden /> : null}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: compact ? 4 : 6,
            padding: compact ? '2px 6px' : '4px 8px',
            borderRadius: compact ? 4 : 5,
            border: `1px solid ${disabled ? '#57534e' : `${color}66`}`,
            background: disabled ? 'rgba(68, 64, 60, 0.85)' : 'linear-gradient(180deg, #292524 0%, #1c1917 100%)',
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.35)`,
            opacity: disabled ? 0.55 : 1,
            minHeight: 22,
          }}
        >
          <span style={shapeStyle} />
          {!compact && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1.1 }}>
              <span style={{ color: '#e7e5e4', fontSize: 12, fontWeight: 700 }}>{port.name}</span>
              <span style={{ color: color, fontSize: 11, fontWeight: 600 }}>{typeLabel}</span>
              {showDescription && port.description ? (
                <span style={{ color: '#a8a29e', fontSize: 9 }}>{port.description}</span>
              ) : null}
            </div>
          )}
          {compact && <span style={{ color: '#e7e5e4', fontSize: 11, fontWeight: 700 }}>{port.type}</span>}
          {typeof connectionCount === 'number' ? (
            <span
              style={{
                marginLeft: 2,
                minWidth: 14,
                height: 14,
                padding: '0 4px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                color: '#d6d3d1',
                fontSize: 11,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {connectionCount}
            </span>
          ) : null}
        </div>
        {port.placement === 'right' ? <div style={pinLegStyle(port.placement)} aria-hidden /> : null}
      </div>

      <Handle
        id={toHandleId(port.id)}
        type={getHandleType(port.direction)}
        position={placementToPosition(port.placement)}
        isConnectable={!disabled}
        style={{
          width: 22,
          height: 22,
          opacity: 0,
          pointerEvents: disabled ? 'none' : 'auto',
          background: 'transparent',
          border: 'none',
        }}
      />
    </div>
  );
}

export const PortHandle = memo(PortHandleComponent);
export default PortHandle;


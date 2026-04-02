"use client";

import { useMemo } from 'react';
import type { BoardState } from '@/core/board/boardTypes';
import { getChipById } from '@/core/board/boardTypes';

export type BoardSelection = {
  chipIds: string[];
  edgeIds: string[];
};

export type ConnectionPreviewState = {
  color: string;
  label: string;
  reason?: string;
};

export type InspectorPanelProps = {
  board: BoardState;
  selection: BoardSelection;
  connectionPreview?: ConnectionPreviewState;
  onOpenChipConfig?: (chipId: string) => void;
  onFocusChip?: (chipId: string) => void;
  onFocusEdge?: (edgeId: string) => void;
  title?: string;
};

export function InspectorPanel({
  board,
  selection,
  connectionPreview,
  onOpenChipConfig,
  onFocusChip,
  onFocusEdge,
  title = 'Inspector',
}: InspectorPanelProps) {
  const selectedChips = useMemo(
    () => selection.chipIds.map((chipId) => getChipById(board, chipId)).filter(Boolean),
    [board, selection.chipIds]
  );

  const selectedEdges = useMemo(
    () => board.edges.filter((edge) => selection.edgeIds.includes(edge.id)),
    [board.edges, selection.edgeIds]
  );

  const primaryChip = selectedChips[0];
  const primaryEdge = selectedEdges[0];

  return (
    <section style={panelStyle}>
      <div style={headerStyle}>{title}</div>

      <div style={{ display: 'grid', gap: 10 }}>
        <SummaryGrid
          items={[
            { label: '선택 칩', value: String(selection.chipIds.length) },
            { label: '선택 연결', value: String(selection.edgeIds.length) },
            { label: '전체 칩', value: String(board.chips.length) },
            { label: '전체 연결', value: String(board.edges.length) },
          ]}
        />

        {connectionPreview ? (
          <div
            style={{
              borderRadius: 12,
              padding: '10px 12px',
              background: 'rgba(15,23,42,0.58)',
              border: `1px solid ${connectionPreview.color}55`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '999px',
                  background: connectionPreview.color,
                }}
              />
              <strong style={{ fontSize: 14, color: '#f8fafc' }}>연결 미리보기</strong>
            </div>
            <div style={{ color: '#e2e8f0', fontSize: 12 }}>{connectionPreview.label}</div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>reason: {connectionPreview.reason ?? 'N/A'}</div>
          </div>
        ) : null}

        {selection.chipIds.length === 0 && selection.edgeIds.length === 0 ? (
          <EmptyState text="칩이나 연결을 선택하면 상세 정보가 여기에 표시됩니다." />
        ) : null}

        {primaryChip ? (
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div>
                <div style={{ color: '#f8fafc', fontSize: 15, fontWeight: 800 }}>{primaryChip.name}</div>
                <div style={{ color: '#94a3b8', fontSize: 11 }}>{primaryChip.type}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {onFocusChip ? <ActionButton label="Focus" onClick={() => onFocusChip(primaryChip.id)} /> : null}
                {onOpenChipConfig ? <ActionButton label="Config" onClick={() => onOpenChipConfig(primaryChip.id)} /> : null}
              </div>
            </div>

            <SummaryGrid
              columns={primaryChip.type === 'prompt_builder' || primaryChip.type === 'prompt_builder_chip' ? 3 : 4}
              items={[
                { label: 'ID', value: primaryChip.id },
                { label: '카테고리', value: primaryChip.definition.category },
                { label: '사이즈', value: primaryChip.definition.size },
                { label: '상태', value: primaryChip.runtime.executionStatus },
                { label: 'LED', value: `${primaryChip.runtime.ledRun} / ${primaryChip.runtime.ledValid}` },
                { label: '시작칩', value: primaryChip.flags.isStartChip ? 'Yes' : 'No' },
              ]}
            />

            <div style={{ display: 'grid', gap: 8 }}>
              <SectionTitle text="포트" />
              <div style={{ display: 'grid', gap: 6 }}>
                {primaryChip.definition.ports.map((port) => (
                  <div key={port.id} style={subCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ color: '#f8fafc', fontSize: 14, fontWeight: 700 }}>{port.name}</span>
                      <span style={{ color: '#38bdf8', fontSize: 11 }}>{port.type}</span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                      {port.direction} · {port.placement ?? (port.direction === 'INPUT' ? 'left' : 'right')}
                      {port.required ? ' · required' : ''}
                      {port.multi ? ' · multi' : ''}
                    </div>
                    {port.description ? <div style={{ color: '#cbd5e1', fontSize: 13, marginTop: 4 }}>{port.description}</div> : null}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <SectionTitle text="설정(config)" />
              <pre style={preStyle}>{JSON.stringify(primaryChip.config, null, 2)}</pre>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <SectionTitle text="런타임" />
              <pre style={preStyle}>{JSON.stringify(primaryChip.runtime, null, 2)}</pre>
            </div>
          </div>
        ) : null}

        {primaryEdge ? (
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div>
                <div style={{ color: '#f8fafc', fontSize: 15, fontWeight: 800 }}>선택 연결</div>
                <div style={{ color: '#94a3b8', fontSize: 11 }}>{primaryEdge.id}</div>
              </div>
              {onFocusEdge ? <ActionButton label="Focus" onClick={() => onFocusEdge(primaryEdge.id)} /> : null}
            </div>

            <SummaryGrid
              items={[
                { label: '종류', value: primaryEdge.kind },
                { label: '검증', value: primaryEdge.validationLevel ?? 'N/A' },
                { label: '출발', value: `${primaryEdge.fromChipId}.${primaryEdge.fromPortId}` },
                { label: '도착', value: `${primaryEdge.toChipId}.${primaryEdge.toPortId}` },
              ]}
            />

            {primaryEdge.label ? (
              <div style={subCardStyle}>
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>label</div>
                <div style={{ color: '#e2e8f0', fontSize: 12 }}>{primaryEdge.label}</div>
              </div>
            ) : null}

            {primaryEdge.metadata ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <SectionTitle text="메타데이터" />
                <pre style={preStyle}>{JSON.stringify(primaryEdge.metadata, null, 2)}</pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SummaryGrid({
  items,
  columns = 4,
}: {
  items: Array<{ label: string; value: string }>;
  /** 한 줄에 몇 칸 (프롬프트 빌더칩 상세는 3) */
  columns?: 3 | 4;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 8,
      }}
    >
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} style={statCardStyle}>
          <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>{item.label}</div>
          <div style={{ color: '#f8fafc', fontSize: 14, fontWeight: 700, wordBreak: 'break-word' }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ text }: { text: string }) {
  return <div style={{ color: '#f8fafc', fontSize: 14, fontWeight: 800 }}>{text}</div>;
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: 'none',
        borderRadius: 10,
        padding: '8px 10px',
        background: '#1d4ed8',
        color: '#fff',
        fontWeight: 800,
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        borderRadius: 12,
        padding: '14px 16px',
        background: 'rgba(15,23,42,0.58)',
        border: '1px dashed rgba(148,163,184,0.24)',
        color: '#94a3b8',
        fontSize: 15,
        lineHeight: 1.5,
      }}
    >
      {text}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  borderRadius: 18,
  padding: 14,
  background: 'rgba(15,23,42,0.86)',
  border: '1px solid rgba(148,163,184,0.16)',
  boxShadow: '0 14px 34px rgba(2,8,23,0.22)',
};

const headerStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  color: '#f8fafc',
  marginBottom: 10,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 14,
  padding: 12,
  background: 'rgba(2,6,23,0.45)',
  border: '1px solid rgba(148,163,184,0.14)',
  display: 'grid',
  gap: 10,
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
};

const statCardStyle: React.CSSProperties = {
  borderRadius: 12,
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(148,163,184,0.12)',
};

const subCardStyle: React.CSSProperties = {
  borderRadius: 12,
  padding: '10px 12px',
  background: 'rgba(15,23,42,0.58)',
  border: '1px solid rgba(148,163,184,0.12)',
};

const preStyle: React.CSSProperties = {
  margin: 0,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  color: '#cbd5e1',
  fontSize: 13,
  lineHeight: 1.5,
  maxHeight: 220,
  overflow: 'auto',
  borderRadius: 12,
  padding: '10px 12px',
  background: 'rgba(2,6,23,0.65)',
  border: '1px solid rgba(148,163,184,0.16)',
};

export default InspectorPanel;


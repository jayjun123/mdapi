"use client";

import type { BoardExecutionReport } from '@/core/board/executor';
import type { BoardState } from '@/core/board/boardTypes';
import { getChipById } from '@/core/board/boardTypes';

export type ExecutionPanelProps = {
  report: BoardExecutionReport | null;
  isRunning?: boolean;
  title?: string;
  emptyText?: string;
  maxOutputs?: number;
  maxRecords?: number;
};

export function ExecutionPanel({
  report,
  isRunning = false,
  title = '실행 결과',
  emptyText = '아직 실행한 적이 없습니다. 보드에서 「실행」을 누르면 여기에 요약이 쌓입니다.',
  maxOutputs = 4,
  maxRecords = 12,
}: ExecutionPanelProps) {
  const runStatusLabel = isRunning ? '실행 중' : report ? (report.ok ? '끝남(성공)' : '끝남(일부 실패)') : '대기';

  return (
    <section
      style={{
        borderRadius: 18,
        padding: 14,
        background: 'rgba(15,23,42,0.86)',
        border: '1px solid rgba(148,163,184,0.16)',
        boxShadow: '0 14px 34px rgba(2,8,23,0.22)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <strong style={{ fontSize: 16, color: '#f8fafc' }}>{title}</strong>
        <span
          style={{
            padding: '4px 8px',
            borderRadius: 999,
            background: isRunning ? 'rgba(37,99,235,0.18)' : report?.ok ? 'rgba(34,197,94,0.14)' : 'rgba(148,163,184,0.12)',
            color: isRunning ? '#93c5fd' : report?.ok ? '#86efac' : '#cbd5e1',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {runStatusLabel}
        </span>
      </div>

      {!report ? (
        <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.55 }}>{emptyText}</div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, lineHeight: 1.55 }}>
            아래 숫자는 「몇 개 칩을 거쳤는지」「맨 끝 결과가 몇 개인지」입니다. 그 아래는{' '}
            <strong style={{ color: '#e2e8f0' }}>맨 끝에 보이는 결과</strong>와,{' '}
            <strong style={{ color: '#e2e8f0' }}>앞에서부터 순서대로 처리한 기록</strong>입니다.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            <StatCard
              label="처리한 칩"
              hint="실행이 돌아간 단계 수"
              value={String(report.records.length)}
            />
            <StatCard
              label="맨 끝 결과"
              hint="출력 칩에서 나온 항목 수"
              value={String(report.finalOutputs.length)}
            />
            <StatCard
              label="실행 전 검증 오류"
              hint="0이 아니면 실행이 막혔을 수 있음"
              value={String(report.validation?.errors.length ?? 0)}
            />
          </div>

          <div>
            <div style={{ color: '#f8fafc', fontSize: 14, fontWeight: 800, marginBottom: 4 }}>맨 끝에서 나온 값</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, lineHeight: 1.45 }}>
              보드의 마지막 칩(예: 결과 패널)에 도달해 화면에 쓸 데이터입니다. 글이면 그대로, 표·자료면 아래처럼
              정리된 형태로 보입니다.
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {report.finalOutputs.slice(0, maxOutputs).map((output) => (
                <div
                  key={output.chipId}
                  style={{
                    borderRadius: 12,
                    padding: 12,
                    background: 'rgba(2,6,23,0.65)',
                    border: '1px solid rgba(148,163,184,0.16)',
                  }}
                >
                  <div style={{ color: '#93c5fd', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>출력 칩</div>
                  <div style={{ color: '#f8fafc', fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{output.chipName}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>이 칩이 넘겨 준 내용</div>
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: '#e2e8f0',
                      fontSize: 14,
                      lineHeight: 1.55,
                      maxHeight: 220,
                      overflow: 'auto',
                    }}
                  >
                    {formatOutputValue(output.value)}
                  </pre>
                </div>
              ))}

              {report.finalOutputs.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
                  맨 끝 결과가 비어 있습니다. 중간에서 오류가 났거나, 출력 칩까지 선이 이어지지 않았을 수 있습니다.
                  위 「실행 전 검증 오류」와 검증 탭을 함께 확인해 보세요.
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <div style={{ color: '#f8fafc', fontSize: 14, fontWeight: 800, marginBottom: 4 }}>순서대로 처리한 기록</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, lineHeight: 1.45 }}>
              입력부터 한 칩씩 어떻게 지나갔는지입니다. 이름은 보드에 붙어 있는 칩 이름입니다.
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {report.records.slice(0, maxRecords).map((record) => {
                const name = chipDisplayName(report.board, record.chipId, record.chipType);
                return (
                  <div
                    key={`${record.chipId}-${record.startedAt}`}
                    style={{
                      borderRadius: 12,
                      padding: '10px 12px',
                      background: 'rgba(15,23,42,0.58)',
                      border: '1px solid rgba(148,163,184,0.12)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
                      <span style={{ color: '#f8fafc', fontSize: 14, fontWeight: 800 }}>{name}</span>
                      <span style={{ color: statusColor(record.status), fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {statusLabelKo(record.status)}
                      </span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>걸린 시간: {formatDuration(record.durationMs)}</div>
                    {record.warning ? (
                      <div style={{ color: '#fcd34d', fontSize: 13, marginTop: 6, lineHeight: 1.45 }}>
                        참고: {record.warning}
                      </div>
                    ) : null}
                    {record.error ? (
                      <div style={{ color: '#fca5a5', fontSize: 13, marginTop: 6, lineHeight: 1.45 }}>
                        문제: {record.error}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {report.records.length > maxRecords ? (
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
                처음 {maxRecords}개만 보입니다. (전체 {report.records.length}단계)
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

function chipDisplayName(board: BoardState, chipId: string, chipType: string): string {
  const chip = getChipById(board, chipId);
  return chip?.name ?? chipType;
}

function formatOutputValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '(내용 없음)';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms (1초 미만)`;
  return `${(ms / 1000).toFixed(2)}초`;
}

function statusLabelKo(status: string): string {
  switch (status) {
    case 'success':
      return '완료';
    case 'warning':
      return '완료(주의)';
    case 'error':
      return '실패';
    case 'running':
      return '실행 중';
    case 'idle':
      return '대기';
    default:
      return status;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'success':
      return '#86efac';
    case 'warning':
      return '#fcd34d';
    case 'error':
      return '#fca5a5';
    case 'running':
      return '#93c5fd';
    default:
      return '#cbd5e1';
  }
}

function StatCard({ label, hint, value }: { label: string; hint: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 12,
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(148,163,184,0.12)',
      }}
    >
      <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 2 }}>{label}</div>
      <div style={{ color: '#64748b', fontSize: 11, marginBottom: 6, lineHeight: 1.35 }}>{hint}</div>
      <div style={{ color: '#f8fafc', fontSize: 15, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

export default ExecutionPanel;


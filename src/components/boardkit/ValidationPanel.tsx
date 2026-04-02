"use client";

import type { BoardValidationReport } from '@/core/board/boardTypes';
import { summarizeValidationReport } from '@/core/board/validation';
import { validationCodeTitle } from '@/core/board/validationMessages';

export type ValidationPanelProps = {
  report: BoardValidationReport;
  maxErrors?: number;
  maxWarnings?: number;
  title?: string;
};

export function ValidationPanel({
  report,
  maxErrors = 5,
  maxWarnings = 4,
  title = '검증 상태',
}: ValidationPanelProps) {
  const summary = summarizeValidationReport(report);

  return (
    <section
      style={{
        borderRadius: 18,
        padding: 14,
        background: 'rgba(15,23,42,0.86)',
        border: report.ok ? '1px solid rgba(34,197,94,0.24)' : '1px solid rgba(239,68,68,0.24)',
        boxShadow: '0 14px 34px rgba(2,8,23,0.22)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '999px',
            background: report.ok ? '#22c55e' : '#ef4444',
            boxShadow: `0 0 10px ${report.ok ? '#22c55e' : '#ef4444'}`,
          }}
        />
        <strong style={{ fontSize: 16, color: '#f8fafc' }}>{title}</strong>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <ChipBadge label={`오류 ${report.errors.length}`} color="#ef4444" background="rgba(239,68,68,0.12)" />
        <ChipBadge label={`경고 ${report.warnings.length}`} color="#f59e0b" background="rgba(245,158,11,0.12)" />
        <ChipBadge label={`경로 ${report.executablePaths.length}`} color="#38bdf8" background="rgba(56,189,248,0.12)" />
      </div>

      <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
        {summary.map((line) => (
          <div key={line} style={{ color: '#cbd5e1', fontSize: 12 }}>
            • {line}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {report.errors.slice(0, maxErrors).map((issue) => (
          <IssueCard
            key={`error-${issue.code}-${issue.chipId ?? ''}-${issue.edgeId ?? ''}`}
            tone="error"
            title={validationCodeTitle(issue.code)}
            message={issue.message}
            meta={buildMeta(issue.chipId, issue.portId, issue.edgeId)}
          />
        ))}

        {report.warnings.slice(0, maxWarnings).map((issue) => (
          <IssueCard
            key={`warn-${issue.code}-${issue.chipId ?? ''}-${issue.edgeId ?? ''}`}
            tone="warn"
            title={validationCodeTitle(issue.code)}
            message={issue.message}
            meta={buildMeta(issue.chipId, issue.portId, issue.edgeId)}
          />
        ))}

        {report.errors.length === 0 && report.warnings.length === 0 ? (
          <div
            style={{
              borderRadius: 12,
              padding: '12px 14px',
              background: 'rgba(22,101,52,0.22)',
              border: '1px solid rgba(34,197,94,0.2)',
              color: '#bbf7d0',
              fontSize: 15,
            }}
          >
            현재 검증 이슈가 없습니다.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function buildMeta(chipId?: string, portId?: string, edgeId?: string): string | undefined {
  const parts = [chipId ? `chip: ${chipId}` : null, portId ? `port: ${portId}` : null, edgeId ? `edge: ${edgeId}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function ChipBadge({ label, color, background }: { label: string; color: string; background: string }) {
  return (
    <span
      style={{
        padding: '4px 8px',
        borderRadius: 999,
        background,
        color,
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}

function IssueCard({
  tone,
  title,
  message,
  meta,
}: {
  tone: 'error' | 'warn';
  title: string;
  message: string;
  meta?: string;
}) {
  const isError = tone === 'error';
  return (
    <div
      style={{
        borderRadius: 12,
        padding: '10px 12px',
        background: isError ? 'rgba(127,29,29,0.34)' : 'rgba(120,53,15,0.30)',
        border: isError ? '1px solid rgba(239,68,68,0.22)' : '1px solid rgba(245,158,11,0.22)',
      }}
    >
      <div style={{ color: isError ? '#fecaca' : '#fde68a', fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{title}</div>
      <div style={{ color: isError ? '#fee2e2' : '#fef3c7', fontSize: 14, lineHeight: 1.5 }}>{message}</div>
      {meta ? <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>{meta}</div> : null}
    </div>
  );
}

export default ValidationPanel;


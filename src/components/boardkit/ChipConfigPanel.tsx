"use client";

import { useEffect, useMemo, useState } from 'react';
import type { BoardChipInstance, ChipFlags } from '@/core/board/boardTypes';

export type ChipConfigPanelProps = {
  chip: BoardChipInstance | null;
  onSave?: (chip: BoardChipInstance) => void;
  onClose?: () => void;
  title?: string;
};

type EditableConfigValue = string;

function stringifyConfigValue(value: unknown): EditableConfigValue {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value == null) return '';
  return JSON.stringify(value, null, 2);
}

function parseConfigValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === '') return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (!Number.isNaN(Number(trimmed)) && trimmed !== '') return Number(trimmed);
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return raw;
    }
  }
  return raw;
}

export function ChipConfigPanel({ chip, onSave, onClose, title = 'Chip Config' }: ChipConfigPanelProps) {
  const [name, setName] = useState('');
  const [flags, setFlags] = useState<ChipFlags>({});
  const [configMap, setConfigMap] = useState<Record<string, EditableConfigValue>>({});
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!chip) {
      setName('');
      setFlags({});
      setConfigMap({});
      setJsonDraft('');
      setJsonError(null);
      return;
    }

    setName(chip.name);
    setFlags(chip.flags);
    setConfigMap(
      Object.fromEntries(Object.entries(chip.config).map(([key, value]) => [key, stringifyConfigValue(value)]))
    );
    setJsonDraft(JSON.stringify(chip.config, null, 2));
    setJsonError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [chip]);

  const configEntries = useMemo(() => Object.entries(configMap), [configMap]);

  const applyJsonToFields = () => {
    try {
      const parsed = JSON.parse(jsonDraft) as Record<string, unknown>;
      setConfigMap(Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, stringifyConfigValue(value)])));
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'JSON 파싱 실패');
    }
  };

  const applySave = () => {
    if (!chip) return;

    let parsedJsonConfig: Record<string, unknown> | null = null;
    if (jsonDraft.trim()) {
      try {
        parsedJsonConfig = JSON.parse(jsonDraft) as Record<string, unknown>;
        setJsonError(null);
      } catch (error) {
        setJsonError(error instanceof Error ? error.message : 'JSON 파싱 실패');
        return;
      }
    }

    const fieldConfig = Object.fromEntries(configEntries.map(([key, value]) => [key, parseConfigValue(value)]));
    const nextConfig = parsedJsonConfig ?? fieldConfig;

    onSave?.({
      ...chip,
      name,
      config: nextConfig,
      flags,
    });
  };

  const updateFlag = (key: keyof ChipFlags, checked: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: checked }));
  };

  return (
    <section style={panelStyle}>
      <div style={headerRowStyle}>
        <strong style={{ fontSize: 16, color: '#f8fafc' }}>{title}</strong>
        {onClose ? (
          <button type="button" onClick={onClose} style={closeButtonStyle}>
            닫기
          </button>
        ) : null}
      </div>

      {!chip ? (
        <div style={emptyStyle}>설정을 편집할 칩을 선택하세요.</div>
      ) : (
        <>
          <div style={scrollBodyStyle}>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>기본 정보</div>
                <Label text="이름">
                  <input value={name} onChange={(event) => setName(event.target.value)} style={inputStyle} />
                </Label>
                <ReadOnlyField label="타입" value={chip.type} />
                <ReadOnlyField label="카테고리" value={chip.definition.category} />
                <ReadOnlyField label="사이즈" value={chip.definition.size} />
              </div>

              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>플래그</div>
                <FlagRow label="Start Chip" checked={Boolean(flags.isStartChip)} onChange={(checked) => updateFlag('isStartChip', checked)} />
                <FlagRow label="Disabled" checked={Boolean(flags.disabled)} onChange={(checked) => updateFlag('disabled', checked)} />
                <FlagRow label="Allow Loopback" checked={Boolean(flags.allowLoopback)} onChange={(checked) => updateFlag('allowLoopback', checked)} />
                <FlagRow label="Draft Mode" checked={Boolean(flags.draftMode)} onChange={(checked) => updateFlag('draftMode', checked)} />
                <FlagRow label="Requires Approval" checked={Boolean(flags.requiresApproval)} onChange={(checked) => updateFlag('requiresApproval', checked)} />
              </div>

              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>개별 config 필드</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {configEntries.length === 0 ? <div style={emptySubStyle}>이 칩에는 기본 config가 없습니다.</div> : null}
                  {configEntries.map(([key, value]) => (
                    <Label key={key} text={key}>
                      <textarea
                        value={value}
                        onChange={(event) => setConfigMap((prev) => ({ ...prev, [key]: event.target.value }))}
                        style={{ ...inputStyle, minHeight: 64, maxHeight: 200, resize: 'vertical' }}
                      />
                    </Label>
                  ))}
                </div>
              </div>

              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>JSON 전체 편집</div>
                <textarea
                  value={jsonDraft}
                  onChange={(event) => setJsonDraft(event.target.value)}
                  style={{
                    ...inputStyle,
                    minHeight: 120,
                    maxHeight: 280,
                    resize: 'vertical',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={applyJsonToFields} style={secondaryButtonStyle}>
                    JSON → 필드 반영
                  </button>
                  {jsonError ? <span style={{ color: '#fca5a5', fontSize: 11 }}>{jsonError}</span> : null}
                </div>
              </div>
            </div>
          </div>

          <div style={footerRowStyle}>
            {onClose ? (
              <button type="button" onClick={onClose} style={secondaryButtonStyle}>
                취소
              </button>
            ) : null}
            <button type="button" onClick={applySave} style={primaryButtonStyle}>
              저장
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ color: '#cbd5e1', fontSize: 14, fontWeight: 700 }}>{text}</span>
      {children}
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <span style={{ color: '#cbd5e1', fontSize: 14, fontWeight: 700 }}>{label}</span>
      <div style={readonlyStyle}>{value}</div>
    </div>
  );
}

function FlagRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, color: '#e2e8f0', fontSize: 12 }}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

const panelStyle: React.CSSProperties = {
  borderRadius: 18,
  padding: 14,
  background: 'rgba(15,23,42,0.86)',
  border: '1px solid rgba(148,163,184,0.16)',
  boxShadow: '0 14px 34px rgba(2,8,23,0.22)',
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 auto',
  minHeight: 0,
  maxHeight: '100%',
  overflow: 'hidden',
  boxSizing: 'border-box',
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 10,
  flexShrink: 0,
};

const scrollBodyStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  paddingRight: 4,
  WebkitOverflowScrolling: 'touch',
};

const footerRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  flexShrink: 0,
  marginTop: 12,
  paddingTop: 12,
  borderTop: '1px solid rgba(148,163,184,0.14)',
};

const sectionStyle: React.CSSProperties = {
  borderRadius: 14,
  padding: 12,
  background: 'rgba(2,6,23,0.45)',
  border: '1px solid rgba(148,163,184,0.14)',
  display: 'grid',
  gap: 10,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  color: '#f8fafc',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 12,
  padding: '10px 12px',
  background: '#020617',
  color: '#e2e8f0',
  border: '1px solid rgba(148,163,184,0.22)',
  boxSizing: 'border-box',
  fontSize: 15,
  lineHeight: 1.5,
};

const readonlyStyle: React.CSSProperties = {
  borderRadius: 12,
  padding: '10px 12px',
  background: 'rgba(15,23,42,0.58)',
  color: '#cbd5e1',
  border: '1px solid rgba(148,163,184,0.12)',
};

const closeButtonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 10,
  padding: '8px 10px',
  background: '#334155',
  color: '#fff',
  fontWeight: 800,
  fontSize: 15,
  cursor: 'pointer',
};

const primaryButtonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 12,
  padding: '10px 12px',
  background: '#2563eb',
  color: '#fff',
  fontWeight: 800,
  fontSize: 15,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 12,
  padding: '10px 12px',
  background: '#334155',
  color: '#fff',
  fontWeight: 800,
  fontSize: 15,
  cursor: 'pointer',
};

const emptyStyle: React.CSSProperties = {
  borderRadius: 12,
  padding: '14px 16px',
  background: 'rgba(15,23,42,0.58)',
  border: '1px dashed rgba(148,163,184,0.24)',
  color: '#94a3b8',
  fontSize: 15,
};

const emptySubStyle: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: 14,
};

export default ChipConfigPanel;


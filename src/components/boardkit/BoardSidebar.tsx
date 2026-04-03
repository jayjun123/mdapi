"use client";

import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ChevronDown } from "lucide-react";
import { chipCategories, chipDefinitions, type ChipCategory } from "@/core/board/chipDefinitions";
import { cn } from "@/lib/utils";

export const BOARD_SIDEBAR_DRAG_MIME = "application/x-breadboard-chip-type";

export type BoardSidebarSharedProps = {
  isDirty?: boolean;
  chipCount?: number;
  edgeCount?: number;
  selectedChipCount?: number;
  selectedEdgeCount?: number;
  dragMimeType?: string;
};

export type BoardLibraryControls = {
  boardList: { id: string; name: string }[];
  activeBoardId: string;
  onSelectBoard: (id: string) => void;
  onCreateBoard: () => void;
  onRenameBoard: (id: string, name: string) => void;
  onDeleteBoard: (id: string) => void;
};

export type BoardSidebarControlsProps = BoardSidebarSharedProps & {
  onValidate?: () => void;
  onRun?: () => void | Promise<void>;
  onReset?: () => void;
  onCopyJson?: () => void | Promise<void>;
  onDownloadJson?: () => void;
  /** 실행 프로그램 구현용 마크다운 프롬프트 파일 저장 */
  onExportBuildPromptMd?: () => void;
  onImportJson?: (json: string) => void;
  isRunning?: boolean;
  /** 보드 목록·이름 변경·삭제(로컬 저장) */
  boardLibrary?: BoardLibraryControls;
  /** 좁은 열(우측 하단)용 컴팩트 UI */
  compact?: boolean;
  /** 왼쪽 하단 등에 끼워 넣을 때 높이를 내용에 맞춤 */
  embedded?: boolean;
  /** 처음에 버튼 영역까지 펼쳐 둠 (기본 false = 제목만) */
  defaultExpanded?: boolean;
};

export type BoardSidebarNaturalLanguageProps = BoardSidebarSharedProps & {
  compact?: boolean;
  embedded?: boolean;
  defaultExpanded?: boolean;
  text: string;
  onTextChange: (value: string) => void;
  onApply: () => void;
};

export type BoardSidebarPaletteProps = BoardSidebarSharedProps & {
  compact?: boolean;
};

export type BoardSidebarSummaryProps = BoardSidebarSharedProps & {
  compact?: boolean;
  /** 인스펙터 옆 도크에 넣을 때 바깥 카드 제거 */
  embedded?: boolean;
  /** false면 내부 "요약" 제목 숨김(오버레이 헤더와 중복 방지) */
  showHeading?: boolean;
};

function categoryAccent(category: ChipCategory): string {
  switch (category) {
    case "input":
      return "#0ea5e9";
    case "ai":
      return "#8b5cf6";
    case "logic":
      return "#f59e0b";
    case "action":
      return "#10b981";
    case "output":
      return "#ec4899";
    default:
      return "#94a3b8";
  }
}

function ToolbarButton({
  label,
  onClick,
  background,
  disabled = false,
  compact,
}: {
  label: string;
  onClick?: () => void | Promise<void>;
  background: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick?.()}
      disabled={disabled}
      style={{
        border: "none",
        borderRadius: compact ? 8 : 12,
        padding: compact ? "6px 8px" : "10px 12px",
        background: disabled ? "#475569" : background,
        color: "#fff",
        fontWeight: 800,
        fontSize: compact ? 11 : 15,
        cursor: disabled ? "not-allowed" : "pointer",
        width: "100%",
        lineHeight: 1.2,
      }}
    >
      {label}
    </button>
  );
}

export function BoardSidebarControls({
  onValidate,
  onRun,
  onReset,
  onCopyJson,
  onDownloadJson,
  onExportBuildPromptMd,
  onImportJson,
  isRunning = false,
  boardLibrary,
  compact = false,
  embedded = false,
  defaultExpanded = false,
}: BoardSidebarControlsProps) {
  const [controlsOpen, setControlsOpen] = useState(defaultExpanded);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importText, setImportText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleControls = () => {
    setControlsOpen((open) => {
      const next = !open;
      if (!next) setShowImportPanel(false);
      return next;
    });
  };

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      onImportJson?.(text);
      setShowImportPanel(false);
      setImportText("");
    } finally {
      event.target.value = "";
    }
  };

  const applyImportText = () => {
    if (!importText.trim()) return;
    onImportJson?.(importText);
    setImportText("");
    setShowImportPanel(false);
  };

  return (
    <aside
      style={{
        borderRadius: embedded ? 0 : compact ? 12 : 18,
        padding: embedded ? 0 : compact ? 8 : 14,
        background: embedded ? "transparent" : "rgba(15,23,42,0.92)",
        border: embedded ? "none" : "1px solid rgba(148,163,184,0.22)",
        boxShadow: embedded ? "none" : "0 14px 34px rgba(2,8,23,0.22)",
        display: "grid",
        gap: compact ? 8 : 14,
        height: "auto",
        minHeight: 0,
        width: "100%",
        overflowY: embedded ? "visible" : "auto",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleFileImport} />

      <section style={{ minHeight: 0, display: "grid", gap: compact ? 6 : 8 }}>
        <button
          type="button"
          onClick={toggleControls}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-600/60 bg-zinc-900/80 px-3 py-2.5 text-left transition-colors hover:bg-zinc-800/90"
          aria-expanded={controlsOpen}
          aria-controls="board-controls-actions"
        >
          <span
            style={{
              fontSize: compact ? 12 : 17,
              fontWeight: 800,
              color: "#f8fafc",
              letterSpacing: "0.04em",
            }}
          >
            BOARD CONTROLS
          </span>
          <ChevronDown
            className={cn("size-4 shrink-0 text-zinc-400 transition-transform duration-200", controlsOpen && "rotate-180")}
            aria-hidden
          />
        </button>

        {controlsOpen ? (
          <div id="board-controls-actions" style={{ display: "grid", gap: compact ? 6 : 8 }}>
            {boardLibrary ? (
              <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: compact ? 6 : 8 }}>
                <ToolbarButton compact={compact} label="새 보드" onClick={boardLibrary.onCreateBoard} background="#0d9488" />
                <ToolbarButton
                  compact={compact}
                  label="이 보드 삭제"
                  onClick={() => boardLibrary.onDeleteBoard(boardLibrary.activeBoardId)}
                  background="#b91c1c"
                />
              </div>
            ) : null}
            <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: compact ? 6 : 8 }}>
              <ToolbarButton compact={compact} label="검증" onClick={onValidate} background="#1d4ed8" />
              <ToolbarButton
                compact={compact}
                label={isRunning ? "실행중" : "실행"}
                onClick={onRun}
                background="#2563eb"
                disabled={isRunning}
              />
              <ToolbarButton compact={compact} label="초기화" onClick={onReset} background="#334155" />
              <ToolbarButton compact={compact} label="JSON복사" onClick={onCopyJson} background="#0f766e" />
              <ToolbarButton compact={compact} label="JSON저장" onClick={onDownloadJson} background="#7c3aed" />
              <ToolbarButton compact={compact} label="파일" onClick={() => fileInputRef.current?.click()} background="#a16207" />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: compact ? 6 : 8,
              }}
            >
              <button
                type="button"
                onClick={() => setShowImportPanel((prev) => !prev)}
                style={{
                  marginTop: 0,
                  width: "100%",
                  border: "none",
                  borderRadius: compact ? 8 : 12,
                  padding: compact ? "6px 8px" : "10px 12px",
                  background: "#be185d",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: compact ? 11 : 13,
                  cursor: "pointer",
                  lineHeight: 1.25,
                }}
              >
                {showImportPanel ? "닫기" : "텍스트 가져오기"}
              </button>
              <button
                type="button"
                onClick={() => void onExportBuildPromptMd?.()}
                disabled={!onExportBuildPromptMd}
                style={{
                  marginTop: 0,
                  width: "100%",
                  border: "none",
                  borderRadius: compact ? 8 : 12,
                  padding: compact ? "6px 8px" : "10px 12px",
                  background: onExportBuildPromptMd ? "#0e7490" : "#475569",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: compact ? 11 : 13,
                  cursor: onExportBuildPromptMd ? "pointer" : "not-allowed",
                  lineHeight: 1.25,
                }}
              >
                결과값 도출
              </button>
            </div>

            {showImportPanel ? (
              <div style={{ display: "grid", gap: compact ? 6 : 8, minHeight: 0 }}>
                <textarea
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  placeholder="JSON"
                  style={{
                    width: "100%",
                    minHeight: compact ? 48 : 120,
                    maxHeight: compact ? 72 : undefined,
                    resize: "vertical",
                    borderRadius: compact ? 8 : 12,
                    padding: compact ? 6 : 12,
                    background: "#020617",
                    color: "#e2e8f0",
                    border: "1px solid rgba(148,163,184,0.22)",
                    boxSizing: "border-box",
                    fontSize: compact ? 11 : 14,
                  }}
                />
                <ToolbarButton compact={compact} label="적용" onClick={applyImportText} background="#2563eb" />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </aside>
  );
}

export function BoardSidebarNaturalLanguage({
  compact = false,
  embedded = false,
  defaultExpanded = true,
  text,
  onTextChange,
  onApply,
}: BoardSidebarNaturalLanguageProps) {
  const [open, setOpen] = useState(defaultExpanded);

  return (
    <aside
      style={{
        borderRadius: embedded ? 0 : compact ? 12 : 18,
        padding: embedded ? 0 : compact ? 8 : 14,
        background: embedded ? "transparent" : "rgba(15,23,42,0.92)",
        border: embedded ? "none" : "1px solid rgba(148,163,184,0.22)",
        boxShadow: embedded ? "none" : "0 14px 34px rgba(2,8,23,0.22)",
        display: "grid",
        gap: compact ? 8 : 14,
        height: "auto",
        minHeight: 0,
        width: "100%",
        overflowY: embedded ? "visible" : "auto",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      <section style={{ minHeight: 0, display: "grid", gap: compact ? 6 : 8 }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-600/60 bg-zinc-900/80 px-3 py-2.5 text-left transition-colors hover:bg-zinc-800/90"
          aria-expanded={open}
          aria-controls="board-nl-actions"
        >
          <span
            style={{
              fontSize: compact ? 12 : 17,
              fontWeight: 800,
              color: "#f8fafc",
              letterSpacing: "0.04em",
            }}
          >
            TEXT TO BOARD
          </span>
          <ChevronDown
            className={cn("size-4 shrink-0 text-zinc-400 transition-transform duration-200", open && "rotate-180")}
            aria-hidden
          />
        </button>

        {open ? (
          <div id="board-nl-actions" style={{ display: "grid", gap: compact ? 6 : 8 }}>
            <p style={{ margin: 0, fontSize: compact ? 10 : 12, lineHeight: 1.45, color: "#94a3b8" }}>
              예: 신데렐라 책을 아이들이 좋아할 만한 그림으로 요약해 줘 — 키워드에 맞춰 칩을 골라 오른쪽에 이어 붙입니다. 이후 드래그·추가·삭제는 직접
              하시면 됩니다.
            </p>
            <textarea
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              placeholder="하고 싶은 일을 평소 말하듯 적어 보세요…"
              style={{
                width: "100%",
                minHeight: compact ? 56 : 88,
                resize: "vertical",
                borderRadius: compact ? 8 : 12,
                padding: compact ? 6 : 12,
                background: "#020617",
                color: "#e2e8f0",
                border: "1px solid rgba(148,163,184,0.22)",
                boxSizing: "border-box",
                fontSize: compact ? 11 : 14,
                lineHeight: 1.4,
              }}
            />
            <ToolbarButton compact={compact} label="보드에 배치" onClick={onApply} background="#9a3412" />
          </div>
        ) : null}
      </section>
    </aside>
  );
}

export function BoardSidebarSummary({
  isDirty = false,
  chipCount = 0,
  edgeCount = 0,
  selectedChipCount = 0,
  selectedEdgeCount = 0,
  compact = false,
  embedded = false,
  showHeading = true,
}: BoardSidebarSummaryProps) {
  return (
    <aside
      style={{
        borderRadius: embedded ? 0 : compact ? 12 : 18,
        padding: embedded ? 0 : compact ? 8 : 14,
        background: embedded ? "transparent" : "rgba(24, 24, 27, 0.75)",
        border: embedded ? "none" : "1px solid rgba(63, 63, 70, 0.5)",
        boxShadow: embedded ? "none" : "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.25)",
        display: "grid",
        gap: compact ? 8 : 14,
        height: embedded ? "auto" : "100%",
        minHeight: 0,
        width: "100%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <section
        style={{
          borderRadius: compact ? 10 : 12,
          padding: compact ? 8 : 12,
          background: "rgba(9, 9, 11, 0.55)",
          border: "1px solid rgba(63, 63, 70, 0.45)",
          flexShrink: 0,
        }}
      >
        {showHeading ? (
          <div style={{ fontSize: compact ? 12 : 15, fontWeight: 800, color: "#f8fafc", marginBottom: compact ? 4 : 8 }}>
            요약
          </div>
        ) : null}
        <InfoRow compact={compact} label="Dirty" value={isDirty ? "Y" : "N"} />
        <InfoRow compact={compact} label="칩" value={String(chipCount)} />
        <InfoRow compact={compact} label="연결" value={String(edgeCount)} />
        <InfoRow compact={compact} label="선택" value={`${selectedChipCount}/${selectedEdgeCount}`} />
      </section>
    </aside>
  );
}

export function BoardSidebarPalette(props: BoardSidebarPaletteProps) {
  const { dragMimeType = BOARD_SIDEBAR_DRAG_MIME, compact = false } = props;

  const [detailChipType, setDetailChipType] = useState<string | null>(null);
  const detailChip = useMemo(() => {
    if (!detailChipType) return null;
    return chipDefinitions.find((c) => c.type === detailChipType) ?? null;
  }, [detailChipType]);

  const groupedChips = useMemo(() => {
    return Object.entries(chipCategories).map(([categoryKey, title]) => ({
      categoryKey: categoryKey as ChipCategory,
      title,
      color: categoryAccent(categoryKey as ChipCategory),
      chips: chipDefinitions.filter((chip) => chip.category === categoryKey),
    }));
  }, []);

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, chipType: string) => {
    event.dataTransfer.setData(dragMimeType, chipType);
    event.dataTransfer.setData("text/plain", chipType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <>
      <aside
      style={{
        borderRadius: compact ? 12 : 18,
        padding: compact ? 8 : 14,
        background: "rgba(24, 24, 27, 0.75)",
        border: "1px solid rgba(63, 63, 70, 0.5)",
        boxShadow: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.25)",
        display: "grid",
        gap: compact ? 8 : 14,
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <section style={{ minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div
          style={{
            fontSize: compact ? 12 : 16,
            fontWeight: 800,
            color: "#f8fafc",
            marginBottom: 4,
            letterSpacing: "0.04em",
          }}
        >
          CHIP PALETTE
        </div>
        {!compact ? (
          <div style={{ color: "#94a3b8", fontSize: 15, marginBottom: 10 }}>드래그하여 캔버스에 놓기</div>
        ) : null}

        <div
          style={{
            display: "grid",
            gap: compact ? 8 : 14,
            overflowY: "auto",
            overflowX: "hidden",
            paddingRight: 2,
            minHeight: 0,
            flex: 1,
          }}
        >
          {groupedChips.map((group) => (
            <section key={group.categoryKey}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: compact ? 4 : 8 }}>
                <span
                  style={{
                    width: compact ? 6 : 10,
                    height: compact ? 6 : 10,
                    borderRadius: "999px",
                    background: group.color,
                    flexShrink: 0,
                  }}
                />
                <strong style={{ fontSize: compact ? 10 : 14, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {group.title}
                </strong>
              </div>

              <div style={{ display: "grid", gap: compact ? 4 : 8 }}>
                {group.chips.map((chip) => (
                  <button
                    key={chip.type}
                    type="button"
                    draggable
                    title={chip.description}
                    onDragStart={(event) => handleDragStart(event, chip.type)}
                    onDoubleClick={() => setDetailChipType(chip.type)}
                    style={{
                      textAlign: "left",
                      borderRadius: compact ? 8 : 14,
                      border: `1px solid ${group.color}33`,
                      background: "rgba(24, 24, 27, 0.9)",
                      padding: compact ? "4px 6px" : "10px 12px",
                      cursor: "grab",
                      color: "#e2e8f0",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: compact ? 10 : 14,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          minWidth: 0,
                        }}
                      >
                        {chip.name}
                      </span>
                      {!compact ? (
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            color: group.color,
                            background: `${group.color}20`,
                            flexShrink: 0,
                          }}
                        >
                          {chip.size}
                        </span>
                      ) : null}
                    </div>
                    {!compact ? (
                      <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 13, lineHeight: 1.45 }}>{chip.description}</div>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
      </aside>

      {detailChip ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setDetailChipType(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(860px, 96vw)",
              maxHeight: "min(84vh, 720px)",
              overflow: "hidden",
              borderRadius: 18,
              background: "rgba(15,23,42,0.96)",
              border: "1px solid rgba(148,163,184,0.22)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid rgba(148,163,184,0.16)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 18, color: "#f8fafc" }}>{detailChip.name}</strong>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#a1a1aa",
                      padding: "4px 8px",
                      borderRadius: 999,
                      border: "1px solid rgba(148,163,184,0.22)",
                      background: "rgba(2,6,23,0.35)",
                    }}
                  >
                    size: {detailChip.size}
                  </span>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700 }}>카테고리: {detailChip.category}</div>
              </div>
              <button
                type="button"
                onClick={() => setDetailChipType(null)}
                style={{
                  border: "none",
                  borderRadius: 12,
                  padding: "8px 10px",
                  background: "rgba(148,163,184,0.12)",
                  color: "#e2e8f0",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
                aria-label="상세설명 닫기"
              >
                닫기
              </button>
            </div>

            <div style={{ padding: 16, overflowY: "auto", maxHeight: "calc(84vh - 70px)" }}>
              <div style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
                {detailChip.description}
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ color: "#f8fafc", fontSize: 14, fontWeight: 900, marginBottom: 8 }}>포트 타입 뜻</div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45 }}>
                    <strong style={{ color: "#93c5fd" }}>EVT</strong>: 실행을 시작하는 신호(트리거)
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45 }}>
                    <strong style={{ color: "#93c5fd" }}>TXT</strong>: 글(문장/질문/응답 텍스트)
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45 }}>
                    <strong style={{ color: "#93c5fd" }}>NUM</strong>: 숫자 값(점수/개수/온도 등)
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45 }}>
                    <strong style={{ color: "#93c5fd" }}>BOOL</strong>: 참/거짓(켜짐/꺼짐)
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45 }}>
                    <strong style={{ color: "#93c5fd" }}>JSON</strong>: 표처럼 구조화된 데이터(객체/항목 묶음)
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45 }}>
                    <strong style={{ color: "#93c5fd" }}>LIST</strong>: 여러 개가 들어있는 목록(여러 줄)
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45 }}>
                    <strong style={{ color: "#93c5fd" }}>FILE</strong>: 파일(문서/원본 파일)
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45 }}>
                    <strong style={{ color: "#93c5fd" }}>IMG</strong>: 이미지(사진/캡처 1장)
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45 }}>
                    <strong style={{ color: "#93c5fd" }}>AUD</strong>: 오디오(말소리/녹음)
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45 }}>
                    <strong style={{ color: "#93c5fd" }}>URL</strong>: 웹 주소(링크)
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45 }}>
                    <strong style={{ color: "#93c5fd" }}>CODE</strong>: 코드 조각(프로그래밍 텍스트)
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45 }}>
                    <strong style={{ color: "#93c5fd" }}>DOC</strong>: 문서 형태(마크다운/글 한 편)
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.45 }}>
                    <strong style={{ color: "#93c5fd" }}>ANY</strong>: 어떤 데이터든 가능(단, 타입 안정성은 낮음)
                  </div>
                  <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>
                    입력/출력은 포트 카드에서 이미 표시됩니다(입력=INPUT, 출력=OUTPUT).
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ color: "#f8fafc", fontSize: 14, fontWeight: 900 }}>포트(연결 지점)</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {detailChip.ports.map((p) => (
                    <div
                      key={`${detailChip.type}:${p.id}`}
                      style={{
                        borderRadius: 14,
                        padding: 12,
                        border: "1px solid rgba(148,163,184,0.16)",
                        background: "rgba(2,6,23,0.38)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ color: "#93c5fd", fontWeight: 900, fontSize: 13 }}>
                          {p.direction === "INPUT" ? "입력" : "출력"} · {p.name} <span style={{ color: "#a1a1aa" }}>({p.type})</span>
                        </div>
                        <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>{p.id}</div>
                      </div>
                      {p.description ? (
                        <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>
                          {p.description}
                        </div>
                      ) : (
                        <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>
                          이 포트에 대한 추가 설명이 없습니다.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export type BoardSidebarProps = BoardSidebarControlsProps & BoardSidebarPaletteProps;

/** 전체(컨트롤+요약+팔레트) — 레거시 한 열 레이아웃 */
export function BoardSidebar(props: BoardSidebarProps) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <BoardSidebarControls {...props} compact={false} defaultExpanded />
      <BoardSidebarSummary {...props} compact={false} />
      <BoardSidebarPalette {...props} compact={false} />
    </div>
  );
}

function InfoRow({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: compact ? "2px 0" : "4px 0" }}>
      <span style={{ color: "#94a3b8", fontSize: compact ? 10 : 14 }}>{label}</span>
      <span style={{ color: "#f8fafc", fontSize: compact ? 10 : 14, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

export default BoardSidebar;

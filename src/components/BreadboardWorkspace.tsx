"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BoardCanvas } from "@/components/board/BoardCanvas";
import {
  BoardSidebarPalette,
  BoardSidebarControls,
  BoardSidebarSummary,
  BOARD_SIDEBAR_DRAG_MIME,
} from "@/components/boardkit/BoardSidebar";
import { ExecutionPanel } from "@/components/boardkit/ExecutionPanel";
import { ValidationPanel } from "@/components/boardkit/ValidationPanel";
import { InspectorPanel, type BoardSelection, type ConnectionPreviewState } from "@/components/boardkit/InspectorPanel";
import { ChipConfigPanel } from "@/components/boardkit/ChipConfigPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FlowNarrativePanel } from "@/components/inspector/FlowNarrativePanel";

import type { BoardChipInstance, BoardState } from "@/core/board/boardTypes";
import { autoConnectSelectedChips, disconnectEdgesAmongSelected } from "@/core/board/autoConnect";
import { validateBoard } from "@/core/board/validation";
import { executeBoard, type BoardExecutionReport } from "@/core/board/executor";
import { initialBoard as defaultBoard } from "@/core/board/initialBoard";
import { buildExecutablePromptMarkdown, safeBoardFileBase } from "@/core/board/buildExecutablePromptMd";
import { cloneBoardSerializable, deserializeBoardFromJson, serializeBoardToJson } from "@/core/board/boardSerializer";
import { useBoardHistory } from "@/hooks/useBoardHistory";
import type { UseBoardLibraryResult } from "@/hooks/useBoardLibrary";
import { ChevronDown, ChevronUp, LayoutList, Link2, Trash2, Unlink } from "lucide-react";

type Props = {
  initialBoard: BoardState;
  library: UseBoardLibraryResult;
};

export function BreadboardWorkspace({ initialBoard, library }: Props) {
  const history = useBoardHistory(initialBoard, { capacity: 80 });
  const board = history.present;

  const [selection, setSelection] = useState<BoardSelection>({ chipIds: [], edgeIds: [] });
  const [connectionPreview, setConnectionPreview] = useState<ConnectionPreviewState | undefined>(undefined);
  const [validationReport, setValidationReport] = useState(() => validateBoard(board));
  const [executionReport, setExecutionReport] = useState<BoardExecutionReport | null>(null);
  const [running, setRunning] = useState(false);

  const [chipConfigOpen, setChipConfigOpen] = useState(false);
  const [chipConfigChipId, setChipConfigChipId] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const selectedChip = useMemo(() => {
    if (!chipConfigChipId) return null;
    return board.chips.find((c) => c.id === chipConfigChipId) ?? null;
  }, [board.chips, chipConfigChipId]);

  const onBoardChange = useCallback(
    (next: BoardState) => {
      history.set(next);
      library.updateActiveBoard(next);
    },
    [history, library],
  );

  const onValidationChange = useCallback((r: ReturnType<typeof validateBoard>) => {
    setValidationReport(r);
  }, []);

  const onConnectionPreviewChange = useCallback((p: { color: string; label: string; reason?: string } | null) => {
    setConnectionPreview(p ?? undefined);
  }, []);

  const openChipConfig = useCallback((chipId: string) => {
    setChipConfigChipId(chipId);
    setChipConfigOpen(true);
  }, []);

  const updateChip = useCallback(
    (nextChip: BoardChipInstance) => {
      history.set((current) => {
        const nextBoard = {
          ...current,
          chips: current.chips.map((c) => (c.id === nextChip.id ? nextChip : c)),
        };
        library.updateActiveBoard(nextBoard);
        return nextBoard;
      });
    },
    [history, library],
  );

  const onValidate = useCallback(() => {
    setValidationReport(validateBoard(board));
  }, [board]);

  const onRun = useCallback(async () => {
    setRunning(true);
    try {
      const report = await executeBoard(board, { validateBeforeRun: true, continueOnError: false });
      setExecutionReport(report);
      if (report.validation) setValidationReport(report.validation);
      history.set(report.board, { skipIfEqual: false });
      library.updateActiveBoard(report.board);
    } finally {
      setRunning(false);
    }
  }, [board, history, library]);

  const onReset = useCallback(() => {
    const fresh = cloneBoardSerializable(defaultBoard, true);
    history.reset(fresh);
    library.replaceActiveBoard(fresh);
    setSelection({ chipIds: [], edgeIds: [] });
    setConnectionPreview(undefined);
    setExecutionReport(null);
    setValidationReport(validateBoard(fresh));
  }, [history, library]);

  const onCopyJson = useCallback(async () => {
    const json = serializeBoardToJson(board, true);
    await navigator.clipboard.writeText(json);
  }, [board]);

  const onDownloadJson = useCallback(() => {
    const json = serializeBoardToJson(board, true);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${board.name || "board"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [board]);

  const onExportBuildPromptMd = useCallback(() => {
    const md = buildExecutablePromptMarkdown(board);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeBoardFileBase(board.name)}_실행프로그램_프롬프트.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [board]);

  const onImportJson = useCallback(
    (json: string) => {
      const next = deserializeBoardFromJson(json, { strict: false, resetRuntime: true });
      const prevActiveId = library.activeId;
      library.replaceActiveBoard(next);
      if (next.id === prevActiveId) {
        history.reset(next);
      }
      setSelection({ chipIds: [], edgeIds: [] });
      setConnectionPreview(undefined);
      setExecutionReport(null);
      setValidationReport(validateBoard(next));
    },
    [history, library],
  );

  const handleRenameBoard = useCallback(
    (id: string, name: string) => {
      library.renameBoard(id, name);
      if (id === library.activeId) {
        history.replacePresent((b) => ({ ...b, name: name.trim() }));
      }
    },
    [history, library],
  );

  const handleSelectBoard = useCallback(
    (id: string) => {
      library.updateActiveBoard(history.present);
      library.selectBoard(id);
    },
    [history.present, library],
  );

  const handleCreateBoard = useCallback(() => {
    library.updateActiveBoard(history.present);
    library.createBoard();
  }, [history.present, library]);

  const handleDeleteBoard = useCallback(
    (id: string) => {
      if (typeof window !== "undefined" && !window.confirm("이 보드를 삭제할까요? 저장된 내용은 복구할 수 없습니다.")) {
        return;
      }
      library.updateActiveBoard(history.present);
      library.deleteBoard(id);
    },
    [history.present, library],
  );

  const handleAutoConnectSelection = useCallback(() => {
    const ids = selection.chipIds;
    if (ids.length < 2) return;
    const { board: next, added, skippedPairs } = autoConnectSelectedChips(board, ids);
    if (added === 0) {
      if (typeof window !== "undefined") {
        window.alert(
          "선택한 칩 사이에 새로 연결할 수 있는 호가 없습니다.\n포트 타입·이미 연결된 입력 등을 확인해 주세요.",
        );
      }
      return;
    }
    history.set(next);
    library.updateActiveBoard(next);
    if (skippedPairs > 0 && typeof window !== "undefined") {
      window.alert(`자동 연결 ${added}개 추가. ${skippedPairs}개 구간은 호환 포트가 없어 건너뜀.`);
    }
  }, [board, history, library, selection.chipIds]);

  const handleDisconnectSelection = useCallback(() => {
    const ids = selection.chipIds;
    if (ids.length < 2) return;
    const idSet = new Set(ids);
    const innerCount = board.edges.filter((e) => idSet.has(e.fromChipId) && idSet.has(e.toChipId)).length;
    if (innerCount === 0) {
      if (typeof window !== "undefined") {
        window.alert("선택한 칩들끼리만 이어진 연결선이 없습니다.");
      }
      return;
    }
    const next = disconnectEdgesAmongSelected(board, ids);
    history.set(next);
    library.updateActiveBoard(next);
  }, [board, history, library, selection.chipIds]);

  const performDeleteSelection = useCallback(
    (chipIds: string[], edgeIds: string[]) => {
      if (chipIds.length === 0 && edgeIds.length === 0) return;
      const chipSet = new Set(chipIds);
      const edgeSet = new Set(edgeIds);
      history.set((current) => {
        let chips = current.chips.filter((c) => !chipSet.has(c.id));
        let edges = current.edges.filter((e) => !chipSet.has(e.fromChipId) && !chipSet.has(e.toChipId));
        edges = edges.filter((e) => !edgeSet.has(e.id));
        const next: BoardState = { ...current, chips, edges };
        library.updateActiveBoard(next);
        return next;
      });
      if (chipConfigChipId && chipSet.has(chipConfigChipId)) {
        setChipConfigOpen(false);
        setChipConfigChipId(null);
      }
      setSelection({ chipIds: [], edgeIds: [] });
      setExecutionReport(null);
    },
    [chipConfigChipId, history, library],
  );

  const handleDeleteSelectedChips = useCallback(() => {
    const { chipIds, edgeIds } = selection;
    if (chipIds.length === 0 && edgeIds.length === 0) return;
    if (chipIds.length > 0 && typeof window !== "undefined") {
      const msg =
        chipIds.length === 1
          ? "선택한 칩 1개를 삭제할까요? 이 칩에 연결된 선도 함께 없어집니다."
          : `선택한 칩 ${chipIds.length}개를 삭제할까요? 관련 연결선도 함께 없어집니다.`;
      if (!window.confirm(msg)) return;
    }
    performDeleteSelection(chipIds, edgeIds);
  }, [performDeleteSelection, selection.chipIds, selection.edgeIds]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const chipIds = selection.chipIds;
      const edgeIds = selection.edgeIds;
      if (chipIds.length === 0 && edgeIds.length === 0) return;
      e.preventDefault();
      performDeleteSelection(chipIds, edgeIds);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [performDeleteSelection, selection.chipIds, selection.edgeIds]);

  const sidebarShared = {
    isDirty: history.past.length > 0,
    chipCount: board.chips.length,
    edgeCount: board.edges.length,
    selectedChipCount: selection.chipIds.length,
    selectedEdgeCount: selection.edgeIds.length,
    dragMimeType: BOARD_SIDEBAR_DRAG_MIME,
  } as const;

  return (
    <div className="grid h-dvh min-h-0 w-full grid-cols-[7.5fr_2.5fr] bg-zinc-950 text-zinc-50">
      <div className="grid min-h-0 min-w-0 grid-rows-[7fr_3fr] gap-0 border-r border-zinc-800/80">
        <div className="relative min-h-0 min-w-0 p-3 pb-2">
          <BoardCanvas
            board={board}
            onBoardChange={onBoardChange}
            onValidationChange={onValidationChange}
            onSelectionChange={setSelection}
            onConnectionPreviewChange={(p) =>
              onConnectionPreviewChange(p ? { color: p.color, label: p.label, reason: p.reason } : null)
            }
            showBoardHud
            editableBoardName
            onBoardNameChange={(name) => handleRenameBoard(library.activeId, name)}
            droppedChipTypeDataKey={BOARD_SIDEBAR_DRAG_MIME}
            showMiniMap
            showControls
            showValidationPanel={false}
            className="h-full w-full"
            style={{
              borderRadius: 12,
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 12px 40px rgba(0,0,0,0.35)",
            }}
          />

          {selection.chipIds.length >= 2 ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[21] flex justify-center px-3">
              <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-zinc-600/80 bg-zinc-950/95 px-2 py-1.5 shadow-xl ring-1 ring-white/5 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={handleAutoConnectSelection}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-sky-500"
                  title="인접 순서로 타입이 맞는 포트를 자동 연결 (6개·입력·기능·AI·출력 패턴이면 순서 고정)"
                >
                  <Link2 className="size-4 shrink-0" aria-hidden />
                  연결
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectSelection}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-500 bg-zinc-800/90 px-3 py-2 text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-700"
                  title="선택한 칩들 사이에만 있는 선만 제거"
                >
                  <Unlink className="size-4 shrink-0" aria-hidden />
                  분리
                </button>
              </div>
            </div>
          ) : null}

          {selection.chipIds.length > 0 || selection.edgeIds.length > 0 ? (
            <div className="pointer-events-none absolute bottom-3 right-3 z-[21]">
              <button
                type="button"
                onClick={handleDeleteSelectedChips}
                className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-red-500/50 bg-red-950/90 px-3 py-2 text-sm font-bold text-red-100 shadow-xl ring-1 ring-red-500/20 backdrop-blur-sm transition-colors hover:bg-red-900/90"
                title="선택한 칩·연결선 삭제 (Delete 키와 동일)"
              >
                <Trash2 className="size-4 shrink-0" aria-hidden />
                선택 삭제
              </button>
            </div>
          ) : null}

          <div className="pointer-events-none absolute inset-0 z-[20] overflow-visible">
            <div className="pointer-events-auto absolute right-2 top-2 flex max-w-[min(92vw,260px)] flex-col items-end gap-1">
              {summaryOpen ? (
                <div className="w-full rounded-lg border border-zinc-600/90 bg-zinc-950/95 shadow-2xl ring-1 ring-white/5 backdrop-blur-md">
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-800/90 px-3 py-2">
                    <span className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-zinc-300">
                      <LayoutList className="size-3.5 text-zinc-500" aria-hidden />
                      요약
                    </span>
                    <button
                      type="button"
                      onClick={() => setSummaryOpen(false)}
                      className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                      aria-label="요약 접기"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                  </div>
                  <div className="p-2 pt-1">
                    <BoardSidebarSummary embedded compact showHeading={false} {...sidebarShared} />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSummaryOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-600/90 bg-zinc-950/95 px-2.5 py-1.5 text-sm font-semibold text-zinc-200 shadow-lg ring-1 ring-white/5 backdrop-blur-md transition-colors hover:bg-zinc-900 hover:text-white"
                  aria-expanded={false}
                  aria-label="요약 펼치기"
                >
                  <LayoutList className="size-3.5 text-sky-500" aria-hidden />
                  요약
                  <ChevronDown className="size-3.5 text-zinc-500" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-t-xl border-t border-zinc-800/80 bg-zinc-900/50 px-0">
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden p-3">
            <Tabs defaultValue="inspector" className="flex min-h-0 min-w-0 flex-1 flex-col gap-0">
              <TabsList className="h-11 w-full shrink-0 justify-start rounded-lg border border-zinc-700/80 bg-zinc-950/80 p-1">
                <TabsTrigger value="inspector" className="text-sm sm:text-base">
                  인스펙터
                </TabsTrigger>
                <TabsTrigger value="validation" className="text-sm sm:text-base">
                  검증
                </TabsTrigger>
                <TabsTrigger value="execution" className="text-sm sm:text-base">
                  실행
                </TabsTrigger>
                <TabsTrigger value="flow" className="text-sm sm:text-base">
                  연결 설명
                </TabsTrigger>
                <TabsTrigger value="history" className="text-sm sm:text-base">
                  히스토리
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="mt-3 min-h-0 min-w-0 flex-1 pr-2 [&_[data-slot=scroll-area-viewport]]:max-h-full">
                <TabsContent value="inspector" className="m-0">
                  <InspectorPanel
                    board={board}
                    selection={selection}
                    connectionPreview={connectionPreview}
                    onOpenChipConfig={openChipConfig}
                    title="Inspector"
                  />
                </TabsContent>

                <TabsContent value="validation" className="m-0">
                  <ValidationPanel report={validationReport} />
                </TabsContent>

                <TabsContent value="execution" className="m-0">
                  <ExecutionPanel report={executionReport} isRunning={running} />
                </TabsContent>

                <TabsContent value="flow" className="m-0">
                  <FlowNarrativePanel board={board} />
                </TabsContent>

                <TabsContent value="history" className="m-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 disabled:opacity-40"
                      disabled={!history.canUndo}
                      onClick={() => history.undo()}
                    >
                      Undo
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 disabled:opacity-40"
                      disabled={!history.canRedo}
                      onClick={() => history.redo()}
                    >
                      Redo
                    </button>
                    <div className="text-base text-zinc-400">
                      history: {history.historyLength} (past {history.past.length} / future {history.future.length})
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden bg-zinc-950 p-3">
        <div className="max-h-[min(52vh,420px)] min-h-0 shrink-0 overflow-y-auto">
          <BoardSidebarControls
            defaultExpanded
            onValidate={onValidate}
            onRun={onRun}
            onReset={onReset}
            onCopyJson={onCopyJson}
            onDownloadJson={onDownloadJson}
            onExportBuildPromptMd={onExportBuildPromptMd}
            onImportJson={onImportJson}
            isRunning={running}
            boardLibrary={{
              boardList: library.boardList,
              activeBoardId: library.activeId,
              onSelectBoard: handleSelectBoard,
              onCreateBoard: handleCreateBoard,
              onRenameBoard: handleRenameBoard,
              onDeleteBoard: handleDeleteBoard,
            }}
            {...sidebarShared}
          />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <BoardSidebarPalette {...sidebarShared} />
        </div>
      </div>

      {chipConfigOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 sm:p-6">
          <div className="my-auto flex w-full min-h-0 max-h-[min(90dvh,880px)] max-w-[720px] flex-col overflow-hidden">
            <ChipConfigPanel
              chip={selectedChip}
              title="칩 설정"
              onClose={() => setChipConfigOpen(false)}
              onSave={(chip) => {
                updateChip(chip);
                setChipConfigOpen(false);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

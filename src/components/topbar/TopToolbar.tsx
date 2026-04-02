"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useBoardStore } from "@/store/useBoardStore";

export function TopToolbar() {
  const selectedChipId = useBoardStore((s) => s.selectedChipId);
  const removeSelected = useBoardStore((s) => s.removeSelected);
  const logs = useBoardStore((s) => s.logs);
  const lastValidation = useBoardStore((s) => s.lastValidation);
  const executionState = useBoardStore((s) => s.executionState);
  const runBoard = useBoardStore((s) => s.runBoard);

  const status = useMemo(() => {
    if (!lastValidation) return { label: "대기", variant: "secondary" as const };
    if (lastValidation.level === "allow") return { label: "연결 가능", variant: "secondary" as const };
    if (lastValidation.level === "warn") return { label: "경고", variant: "secondary" as const };
    if (lastValidation.level === "adapter") return { label: "변환 필요", variant: "secondary" as const };
    return { label: "불가", variant: "destructive" as const };
  }, [lastValidation]);

  return (
    <header className="flex items-center gap-3 border-b border-border bg-card/40 px-4 py-3 backdrop-blur">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-zinc-50">Breadboard AI Builder</div>
        <div className="text-[11px] text-zinc-400">비주얼 AI 워크플로우 MVP</div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Badge variant={status.variant} className="bg-white/5 text-zinc-200 border-white/10">
          {status.label}
        </Badge>
        <Badge variant="secondary" className="bg-white/5 text-zinc-200 border-white/10">
          logs {logs.length}
        </Badge>

        <Separator orientation="vertical" className="mx-1 h-6 bg-white/10" />

        <Button
          variant="secondary"
          className="bg-white/5 text-zinc-100 border border-white/10 hover:bg-white/10"
          disabled={executionState.running}
          onClick={runBoard}
        >
          {executionState.running ? "실행 중..." : "실행"}
        </Button>
        <Button
          variant="secondary"
          className="bg-white/5 text-zinc-100 border border-white/10 hover:bg-white/10"
          onClick={() => {
            // TODO: 저장(JSON export)
          }}
        >
          저장
        </Button>
        <Button
          variant="destructive"
          disabled={!selectedChipId}
          onClick={removeSelected}
          className="disabled:opacity-40"
        >
          삭제
        </Button>
      </div>
    </header>
  );
}


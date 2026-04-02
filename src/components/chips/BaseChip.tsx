"use client";

import { memo } from "react";
import { chipDefinitionByType } from "@/lib/chip-registry/chipDefinitions";
import { useBoardStore } from "@/store/useBoardStore";
import { PortHandle } from "@/components/board/PortHandle";
import { boardPortToReactFlowPort } from "@/core/board/reactFlowMapper";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function Led({ status }: { status?: string }) {
  const base =
    "h-2.5 w-2.5 rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_0_18px_rgba(0,0,0,0.5)]";
  switch (status) {
    case "ready":
      return <span className={cn(base, "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.55)]")} />;
    case "running":
      return <span className={cn(base, "bg-sky-400 animate-pulse shadow-[0_0_12px_rgba(56,189,248,0.55)]")} />;
    case "needs_config":
      return <span className={cn(base, "bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.55)]")} />;
    case "error":
      return <span className={cn(base, "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.55)]")} />;
    case "ai_running":
      return <span className={cn(base, "bg-violet-400 animate-pulse shadow-[0_0_12px_rgba(167,139,250,0.55)]")} />;
    default:
      return <span className={cn(base, "bg-zinc-500/60")} />;
  }
}

export const BaseChip = memo(function BaseChip({ chipId }: { chipId: string }) {
  const chip = useBoardStore((s) => s.chips[chipId]);
  const selectedChipId = useBoardStore((s) => s.selectedChipId);
  const setSelectedChipId = useBoardStore((s) => s.setSelectedChipId);

  const def = chipDefinitionByType.get(chip?.chipType ?? "");
  if (!chip || !def) return null;

  const selected = selectedChipId === chipId;
  const sizeClass =
    def.size === "S"
      ? "w-[96px] h-[64px]"
      : def.size === "M"
        ? "w-[128px] h-[80px]"
        : def.size === "L"
          ? "w-[160px] h-[96px]"
          : "w-[192px] h-[112px]";

  const inputs = def.ports.filter((p) => p.direction === "INPUT");
  const outputs = def.ports.filter((p) => p.direction === "OUTPUT");
  const resultPreview =
    chip.chipType === "result_panel_chip"
      ? chip.lastOutputs?.out_render ?? chip.lastOutputs?.in_any ?? undefined
      : undefined;

  return (
    <div
      className={cn(
        "group relative select-none rounded-xl border bg-gradient-to-b from-zinc-900/70 to-zinc-950/80",
        "shadow-[0_10px_24px_rgba(0,0,0,0.35)]",
        "backdrop-blur supports-[backdrop-filter]:bg-zinc-950/40",
        "border-white/10",
        selected ? "ring-2 ring-sky-400/70" : "ring-0",
        sizeClass,
      )}
      onMouseDown={() => setSelectedChipId(chipId)}
    >
      <div className="flex items-start justify-between gap-2 px-3 pt-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold tracking-wide text-zinc-50">{chip.name}</div>
          <div className="mt-0.5 line-clamp-1 text-[12px] text-zinc-400">{def.description}</div>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {def.executable ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-[11px] bg-white/5 text-zinc-200 border-white/10">
              exec
            </Badge>
          ) : null}
          <Led status={chip.lastRun?.status} />
        </div>
      </div>

      <div className="px-3 pb-2 pt-2">
        <div className="text-[12px] text-zinc-300/80">
          {inputs.length > 0 ? `${inputs.length} in` : "—"} · {outputs.length > 0 ? `${outputs.length} out` : "—"}
        </div>
        {resultPreview !== undefined ? (
          <div className="mt-1 line-clamp-2 text-[12px] leading-snug text-zinc-200/90">
            {typeof resultPreview === "string" ? resultPreview : JSON.stringify(resultPreview).slice(0, 140)}
          </div>
        ) : null}
      </div>

      {inputs.map((p) => (
        <PortHandle key={p.id} port={boardPortToReactFlowPort(p)} />
      ))}
      {outputs.map((p) => (
        <PortHandle key={p.id} port={boardPortToReactFlowPort(p)} />
      ))}
    </div>
  );
});


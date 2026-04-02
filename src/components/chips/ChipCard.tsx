"use client";

import { chipDefinitionByType } from "@/lib/chip-registry/chipDefinitions";
import { cn } from "@/lib/utils";

export function ChipCard({ chipType }: { chipType: string }) {
  const def = chipDefinitionByType.get(chipType);
  if (!def) return null;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-chip-type", def.type);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group cursor-grab active:cursor-grabbing select-none rounded-lg border border-white/10",
        "bg-gradient-to-b from-zinc-900/40 to-zinc-950/50",
        "px-3 py-2 shadow-[0_8px_18px_rgba(0,0,0,0.35)]",
        "hover:border-white/20 hover:from-zinc-900/55 hover:to-zinc-950/70",
      )}
      title="드래그해서 보드에 놓기"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold text-zinc-50">{def.name}</div>
          <div className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-zinc-400">{def.description}</div>
        </div>
        <div className="mt-0.5 shrink-0 text-[12px] text-zinc-400">{def.size}</div>
      </div>
    </div>
  );
}


"use client";

import { chipDefinitionByType } from "@/lib/chip-registry/chipDefinitions";
import { useBoardStore } from "@/store/useBoardStore";
import { Badge } from "@/components/ui/badge";
import { PORT_TYPE_COLOR } from "@/lib/utils/colors";

export function PortListPanel({ chipId }: { chipId: string }) {
  const chip = useBoardStore((s) => s.chips[chipId]);
  const def = chipDefinitionByType.get(chip?.chipType ?? "");
  if (!chip || !def) return null;

  return (
    <div className="space-y-2">
      {def.ports.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm text-zinc-100">
              {p.name} <span className="text-zinc-400">({p.id})</span>
            </div>
            <div className="text-[11px] text-zinc-400">
              {p.direction} · {p.placement ?? (p.direction === "INPUT" ? "left" : "right")}
              {p.required ? " · required" : ""}
              {p.multi ? " · multi" : ""}
            </div>
          </div>
          <Badge
            variant="secondary"
            className="border-white/10 bg-white/5 text-zinc-100"
            style={{ boxShadow: `0 0 0 1px ${PORT_TYPE_COLOR[p.type]} inset` }}
          >
            {p.type}
          </Badge>
        </div>
      ))}
    </div>
  );
}


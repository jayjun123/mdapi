"use client";

import { chipDefinitionByType } from "@/lib/chip-registry/chipDefinitions";
import { useBoardStore } from "@/store/useBoardStore";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

function isLongText(v: unknown) {
  return typeof v === "string" && (v.includes("\n") || v.length > 48);
}

export function ChipConfigPanel({ chipId }: { chipId: string }) {
  const chip = useBoardStore((s) => s.chips[chipId]);
  const setChipConfig = useBoardStore((s) => s.setChipConfig);
  const def = chipDefinitionByType.get(chip?.chipType ?? "");
  if (!chip || !def) return null;

  const entries = Object.entries(chip.config ?? {});
  if (entries.length === 0) {
    return <div className="text-sm text-zinc-400">이 칩은 설정 항목이 없습니다.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="bg-white/5 text-zinc-200 border-white/10">
          {def.type}
        </Badge>
        <Badge variant="secondary" className="bg-white/5 text-zinc-200 border-white/10">
          {def.category}
        </Badge>
        <Badge variant="secondary" className="bg-white/5 text-zinc-200 border-white/10">
          {def.size}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {entries.map(([k, v]) => {
          if (typeof v === "boolean") {
            return (
              <label key={k} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-sm text-zinc-200">{k}</div>
                <input
                  type="checkbox"
                  checked={v}
                  onChange={(e) => setChipConfig(chipId, { [k]: e.target.checked })}
                />
              </label>
            );
          }

          if (typeof v === "number") {
            return (
              <label key={k} className="space-y-1">
                <div className="text-sm text-zinc-200">{k}</div>
                <Input
                  type="number"
                  value={Number.isFinite(v) ? v : 0}
                  onChange={(e) => setChipConfig(chipId, { [k]: Number(e.target.value) })}
                  className="bg-zinc-950/40 border-white/10"
                />
              </label>
            );
          }

          if (typeof v === "string" && isLongText(v)) {
            return (
              <label key={k} className="space-y-1 md:col-span-2">
                <div className="text-sm text-zinc-200">{k}</div>
                <Textarea
                  value={v}
                  onChange={(e) => setChipConfig(chipId, { [k]: e.target.value })}
                  className="min-h-[84px] bg-zinc-950/40 border-white/10"
                />
              </label>
            );
          }

          return (
            <label key={k} className="space-y-1">
              <div className="text-sm text-zinc-200">{k}</div>
              <Input
                value={String(v ?? "")}
                onChange={(e) => setChipConfig(chipId, { [k]: e.target.value })}
                className="bg-zinc-950/40 border-white/10"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}


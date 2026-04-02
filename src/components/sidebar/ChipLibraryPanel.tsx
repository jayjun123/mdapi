"use client";

import { useMemo, useState } from "react";
import { chipDefinitions } from "@/lib/chip-registry/chipDefinitions";
import type { ChipCategory } from "@/lib/board/boardTypes";
import { ChipLibrarySection } from "@/components/sidebar/ChipLibrarySection";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const ORDER: ChipCategory[] = ["input", "ai", "logic", "action", "output"];

export function ChipLibraryPanel() {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const filtered = chipDefinitions.filter((d) => {
      if (!q.trim()) return true;
      const k = q.trim().toLowerCase();
      return d.name.toLowerCase().includes(k) || d.description.toLowerCase().includes(k) || d.type.toLowerCase().includes(k);
    });

    const byCat = new Map<ChipCategory, string[]>();
    for (const cat of ORDER) byCat.set(cat, []);
    for (const d of filtered) {
      byCat.get(d.category)?.push(d.type);
    }
    return byCat;
  }, [q]);

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <div className="text-sm font-semibold text-zinc-100">칩 보관함</div>
        <div className="mt-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색 (이름/설명/타입)"
            className="bg-zinc-950/40 border-white/10"
          />
        </div>
        <div className="mt-2 text-[11px] text-zinc-400">드래그해서 보드에 놓으세요.</div>
      </div>
      <div className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="space-y-5 px-3 pb-6">
            {ORDER.map((cat) => (
              <ChipLibrarySection key={cat} titleCategory={cat} chipTypes={groups.get(cat) ?? []} />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}


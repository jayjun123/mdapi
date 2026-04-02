"use client";

import { useMemo } from "react";
import { useBoardStore } from "@/store/useBoardStore";
import { chipDefinitionByType } from "@/lib/chip-registry/chipDefinitions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChipConfigPanel } from "@/components/inspector/ChipConfigPanel";
import { PortListPanel } from "@/components/inspector/PortListPanel";
import { ValidationPanel } from "@/components/inspector/ValidationPanel";
import { ScrollArea } from "@/components/ui/scroll-area";

export function BottomInspector() {
  const selectedChipId = useBoardStore((s) => s.selectedChipId);
  const chip = useBoardStore((s) => (selectedChipId ? s.chips[selectedChipId] : null));

  const header = useMemo(() => {
    if (!selectedChipId || !chip) return { title: "칩 선택 없음", subtitle: "보드에서 칩을 선택하면 상세가 표시됩니다." };
    const def = chipDefinitionByType.get(chip.chipType);
    return { title: chip.name, subtitle: def?.description ?? "" };
  }, [chip, selectedChipId]);

  return (
    <div className="h-[280px]">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-50">{header.title}</div>
          <div className="truncate text-[11px] text-zinc-400">{header.subtitle}</div>
        </div>
      </div>

      <Tabs defaultValue="config" className="h-[232px] px-4 pb-4">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="config">설정</TabsTrigger>
          <TabsTrigger value="ports">포트</TabsTrigger>
          <TabsTrigger value="validation">연결 규칙</TabsTrigger>
          <TabsTrigger value="logs">로그</TabsTrigger>
        </TabsList>

        <ScrollArea className="mt-3 h-[184px] pr-3">
          <TabsContent value="config" className="m-0">
            {selectedChipId ? <ChipConfigPanel chipId={selectedChipId} /> : <div className="text-sm text-zinc-400">칩을 선택하세요.</div>}
          </TabsContent>
          <TabsContent value="ports" className="m-0">
            {selectedChipId ? <PortListPanel chipId={selectedChipId} /> : <div className="text-sm text-zinc-400">칩을 선택하세요.</div>}
          </TabsContent>
          <TabsContent value="validation" className="m-0">
            <ValidationPanel />
          </TabsContent>
          <TabsContent value="logs" className="m-0">
            <LogsPanel />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function LogsPanel() {
  const logs = useBoardStore((s) => s.logs);
  if (logs.length === 0) return <div className="text-sm text-zinc-400">아직 로그가 없습니다.</div>;
  return (
    <div className="space-y-2">
      {logs.slice(-50).reverse().map((l) => (
        <div key={l.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <div className="text-[11px] text-zinc-400">
            {new Date(l.at).toLocaleTimeString()} · {l.level}
          </div>
          <div className="text-sm text-zinc-100">{l.message}</div>
        </div>
      ))}
    </div>
  );
}


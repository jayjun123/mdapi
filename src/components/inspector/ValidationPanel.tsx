"use client";

import { useBoardStore } from "@/store/useBoardStore";
import { Badge } from "@/components/ui/badge";

export function ValidationPanel() {
  const last = useBoardStore((s) => s.lastValidation);
  const preview = useBoardStore((s) => s.connectionPreview);

  const showing = preview
    ? { level: preview.level, message: preview.message, adapterType: preview.adapterType }
    : last
      ? { level: last.level, message: last.message, adapterType: last.adapterType }
      : null;

  if (!showing) return <div className="text-sm text-zinc-400">연결을 시도하면 규칙 결과가 표시됩니다.</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant={showing.level === "deny" ? "destructive" : "secondary"} className="bg-white/5 text-zinc-200 border-white/10">
          {showing.level}
        </Badge>
        {showing.adapterType ? (
          <Badge variant="secondary" className="bg-white/5 text-zinc-200 border-white/10">
            제안: {showing.adapterType}
          </Badge>
        ) : null}
      </div>
      <div className="text-sm text-zinc-200">{showing.message}</div>
    </div>
  );
}


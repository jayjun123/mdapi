"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { Copy, Download, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export type BuildPromptPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markdown: string;
  loading: boolean;
  error: string | null;
  onCopy: () => void | Promise<void>;
  onDownload: () => void;
  fileBaseName: string;
};

export function BuildPromptPreviewDialog({
  open,
  onOpenChange,
  markdown,
  loading,
  error,
  onCopy,
  onDownload,
  fileBaseName,
}: BuildPromptPreviewDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[200] bg-black/65 backdrop-blur-[2px]",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-[201] flex max-h-[min(90vh,800px)] w-[min(100vw-1.5rem,720px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-zinc-600 bg-zinc-950 shadow-2xl ring-1 ring-white/10 duration-200 outline-none",
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <DialogPrimitive.Title className="text-base font-bold tracking-tight text-zinc-100">
              결과값 미리보기
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-zinc-100" aria-label="닫기">
                <X className="size-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <DialogPrimitive.Description className="sr-only">
            실행 프로그램용 마크다운 프롬프트 미리보기. mock 실행 결과와 보드 JSON이 포함됩니다.
          </DialogPrimitive.Description>

          <div className="min-h-[200px] flex-1 px-3 py-2">
            {loading ? (
              <div className="flex h-[min(55vh,480px)] flex-col items-center justify-center gap-3 text-zinc-400">
                <Loader2 className="size-10 animate-spin text-sky-500" aria-hidden />
                <p className="text-sm">mock 실행 후 프롬프트를 만드는 중…</p>
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>
            ) : (
              <ScrollArea className="h-[min(55vh,480px)] rounded-lg border border-zinc-800 bg-zinc-900/50">
                <pre className="whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed text-zinc-300">{markdown}</pre>
              </ScrollArea>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-800 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              disabled={loading || !!error || !markdown}
              onClick={() => void onCopy()}
            >
              <Copy className="size-3.5" />
              클립보드 복사
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-1.5"
              disabled={loading || !!error || !markdown}
              onClick={onDownload}
            >
              <Download className="size-3.5" />
              {fileBaseName}.md 저장
            </Button>
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="ghost">
                닫기
              </Button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

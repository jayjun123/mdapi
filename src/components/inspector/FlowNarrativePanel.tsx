"use client";

import { useMemo } from "react";
import type { BoardState } from "@/core/board/boardTypes";
import { describeBoardFlowAndCapability } from "@/core/board/describeBoardFlow";

type Props = {
  board: BoardState;
};

export function FlowNarrativePanel({ board }: Props) {
  const { flow, capability } = useMemo(() => describeBoardFlowAndCapability(board), [board]);

  return (
    <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/60 p-5">
      <section className="space-y-3">
        <h3 className="text-base font-bold tracking-wide text-sky-400/95 sm:text-lg">연결 흐름</h3>
        <p className="text-lg leading-7 text-zinc-100 whitespace-pre-wrap sm:text-xl sm:leading-8">{flow}</p>
      </section>
      <section className="mt-8 space-y-3 border-t border-zinc-700/70 pt-8">
        <h3 className="text-base font-bold tracking-wide text-emerald-400/95 sm:text-lg">이 구조로 할 수 있는 일</h3>
        <p className="text-lg leading-7 text-zinc-100 sm:text-xl sm:leading-8">{capability}</p>
      </section>
    </div>
  );
}

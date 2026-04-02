"use client";

import { useMemo } from "react";
import type { BoardState } from "@/core/board/boardTypes";
import { describeBoardFlowNarrative } from "@/core/board/describeBoardFlow";

type Props = {
  board: BoardState;
};

export function FlowNarrativePanel({ board }: Props) {
  const text = useMemo(() => describeBoardFlowNarrative(board), [board]);

  return (
    <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/60 p-5">
      <p className="text-lg leading-7 text-zinc-100 whitespace-pre-wrap sm:text-xl sm:leading-8">{text}</p>
    </div>
  );
}

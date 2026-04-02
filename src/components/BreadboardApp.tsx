"use client";

import { BreadboardWorkspace } from "@/components/BreadboardWorkspace";
import { initialBoard as defaultBoard } from "@/core/board/initialBoard";
import { useBoardLibrary } from "@/hooks/useBoardLibrary";

export function BreadboardApp() {
  const library = useBoardLibrary(defaultBoard);

  return (
    <BreadboardWorkspace key={library.activeId} initialBoard={library.activeBoardSnapshot} library={library} />
  );
}

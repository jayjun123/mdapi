"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import type { BoardState } from "@/core/board/boardTypes";
import { cloneBoardSerializable } from "@/core/board/boardSerializer";
import { createEmptyBoard } from "@/core/board/initialBoard";
import { deserializeBoardFromJson, serializeBoardToJson } from "@/core/board/boardSerializer";

/** 브라우저 localStorage 키 — 보드 목록·활성 보드가 여기에 JSON으로 저장됩니다 */
// v2로 올려서, 예전(데모가 들어있던) 로컬 저장값이 기본 화면을 덮어쓰지 않게 합니다.
export const BOARD_LIBRARY_STORAGE_KEY = "breadboard-ai-builder:library:v2";

const STORAGE_KEY = BOARD_LIBRARY_STORAGE_KEY;

type LibraryItem = {
  id: string;
  name: string;
  board: BoardState;
};

export type BoardLibraryState = {
  activeId: string;
  items: LibraryItem[];
};

function cloneBoard(board: BoardState): BoardState {
  return cloneBoardSerializable(board, false);
}

function loadFromStorage(): BoardLibraryState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      v: number;
      activeId: string;
      boards: { id: string; data: string }[];
    };
    if (parsed.v !== 2 || !parsed.activeId || !Array.isArray(parsed.boards)) return null;
    const items: LibraryItem[] = [];
    for (const row of parsed.boards) {
      const board = deserializeBoardFromJson(row.data, { strict: false, resetRuntime: false });
      items.push({ id: board.id, name: board.name, board });
    }
    if (items.length === 0) return null;
    const activeExists = items.some((i) => i.id === parsed.activeId);
    return {
      activeId: activeExists ? parsed.activeId : items[0]!.id,
      items,
    };
  } catch {
    return null;
  }
}

function saveToStorage(state: BoardLibraryState): void {
  if (typeof window === "undefined") return;
  const payload = {
    v: 2 as const,
    activeId: state.activeId,
    boards: state.items.map((i) => ({ id: i.id, data: serializeBoardToJson(i.board, false) })),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export type UseBoardLibraryResult = {
  activeId: string;
  /** 현재 활성 보드의 마지막 저장 스냅샷(워크스페이스 마운트 시 초기값으로 사용) */
  activeBoardSnapshot: BoardState;
  boardList: { id: string; name: string }[];
  updateActiveBoard: (board: BoardState) => void;
  replaceActiveBoard: (board: BoardState) => void;
  selectBoard: (id: string) => void;
  createBoard: (name?: string) => string;
  renameBoard: (id: string, name: string) => void;
  deleteBoard: (id: string) => void;
};

export function useBoardLibrary(seed: BoardState): UseBoardLibraryResult {
  const [state, setState] = useState<BoardLibraryState>(() => ({
    activeId: seed.id,
    items: [{ id: seed.id, name: seed.name, board: cloneBoard(seed) }],
  }));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadFromStorage();
    startTransition(() => {
      if (loaded) setState(loaded);
      setHydrated(true);
    });
  }, []);

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => saveToStorage(state), 500);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [state, hydrated]);

  const activeBoardSnapshot = useMemo(() => {
    const found = state.items.find((i) => i.id === state.activeId);
    return found?.board ?? state.items[0]!.board;
  }, [state]);

  const boardList = useMemo(
    () => state.items.map((i) => ({ id: i.id, name: i.name })),
    [state.items],
  );

  const updateActiveBoard = useCallback((board: BoardState) => {
    setState((s) => ({
      ...s,
      items: s.items.map((i) =>
        i.id === board.id ? { id: board.id, name: board.name, board: cloneBoard(board) } : i,
      ),
    }));
  }, []);

  const replaceActiveBoard = useCallback((board: BoardState) => {
    const next = cloneBoard(board);
    setState((s) => {
      const nextItems = s.items.map((i) =>
        i.id === s.activeId ? { id: next.id, name: next.name, board: next } : i,
      );
      const byId = new Map<string, LibraryItem>();
      for (const it of nextItems) {
        byId.set(it.id, it);
      }
      return { activeId: next.id, items: Array.from(byId.values()) };
    });
  }, []);

  const selectBoard = useCallback((id: string) => {
    setState((s) => {
      if (!s.items.some((i) => i.id === id)) return s;
      return { ...s, activeId: id };
    });
  }, []);

  const createBoard = useCallback((name = "새 보드") => {
    const b = createEmptyBoard(name);
    setState((s) => ({
      activeId: b.id,
      items: [...s.items, { id: b.id, name: b.name, board: b }],
    }));
    return b.id;
  }, []);

  const renameBoard = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((s) => ({
      ...s,
      items: s.items.map((i) =>
        i.id === id ? { ...i, name: trimmed, board: { ...i.board, name: trimmed } } : i,
      ),
    }));
  }, []);

  const deleteBoard = useCallback((id: string) => {
    setState((s) => {
      const filtered = s.items.filter((i) => i.id !== id);
      if (filtered.length === 0) {
        const b = createEmptyBoard("새 보드");
        return { activeId: b.id, items: [{ id: b.id, name: b.name, board: b }] };
      }
      let activeId = s.activeId;
      if (s.activeId === id) {
        const idx = s.items.findIndex((i) => i.id === id);
        const pick = filtered[Math.max(0, idx - 1)] ?? filtered[0]!;
        activeId = pick.id;
      }
      return { activeId, items: filtered };
    });
  }, []);

  return {
    activeId: state.activeId,
    activeBoardSnapshot,
    boardList,
    updateActiveBoard,
    replaceActiveBoard,
    selectBoard,
    createBoard,
    renameBoard,
    deleteBoard,
  };
}

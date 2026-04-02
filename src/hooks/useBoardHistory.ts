"use client";

import { useCallback, useMemo, useState } from 'react';
import type { BoardState } from '@/core/board/boardTypes';
import { cloneBoardSerializable, serializeBoardToJson } from '@/core/board/boardSerializer';

export type BoardHistoryState = {
  past: BoardState[];
  present: BoardState;
  future: BoardState[];
};

export type UseBoardHistoryOptions = {
  capacity?: number;
  equality?: (a: BoardState, b: BoardState) => boolean;
};

export type UseBoardHistoryResult = {
  past: BoardState[];
  present: BoardState;
  future: BoardState[];
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
  set: (next: BoardState | ((current: BoardState) => BoardState), options?: { skipIfEqual?: boolean }) => void;
  replacePresent: (next: BoardState | ((current: BoardState) => BoardState)) => void;
  undo: () => BoardState | null;
  redo: () => BoardState | null;
  reset: (next: BoardState) => void;
  clear: () => void;
  jumpToPast: (index: number) => BoardState | null;
};

function defaultEquality(a: BoardState, b: BoardState): boolean {
  return serializeBoardToJson(a, false) === serializeBoardToJson(b, false);
}

function clone(board: BoardState): BoardState {
  return cloneBoardSerializable(board, false);
}

export function useBoardHistory(initialBoard: BoardState, options: UseBoardHistoryOptions = {}): UseBoardHistoryResult {
  const capacity = options.capacity ?? 100;
  const equality = options.equality ?? defaultEquality;

  const [history, setHistory] = useState<BoardHistoryState>(() => ({
    past: [],
    present: clone(initialBoard),
    future: [],
  }));

  const set = useCallback(
    (next: BoardState | ((current: BoardState) => BoardState), setOptions?: { skipIfEqual?: boolean }) => {
      setHistory((current) => {
        const resolved = typeof next === 'function' ? (next as (current: BoardState) => BoardState)(clone(current.present)) : next;
        const normalized = clone(resolved);
        const skipIfEqual = setOptions?.skipIfEqual ?? true;

        if (skipIfEqual && equality(current.present, normalized)) {
          return current;
        }

        const nextPast = [...current.past, clone(current.present)].slice(-capacity);
        return {
          past: nextPast,
          present: normalized,
          future: [],
        };
      });
    },
    [capacity, equality]
  );

  const replacePresent = useCallback((next: BoardState | ((current: BoardState) => BoardState)) => {
    setHistory((current) => {
      const resolved = typeof next === 'function' ? (next as (current: BoardState) => BoardState)(clone(current.present)) : next;
      return {
        ...current,
        present: clone(resolved),
      };
    });
  }, []);

  const undo = useCallback((): BoardState | null => {
    let snapshot: BoardState | null = null;

    setHistory((current) => {
      if (current.past.length === 0) return current;

      const previous = current.past[current.past.length - 1];
      snapshot = clone(previous);

      return {
        past: current.past.slice(0, -1),
        present: clone(previous),
        future: [clone(current.present), ...current.future],
      };
    });

    return snapshot;
  }, []);

  const redo = useCallback((): BoardState | null => {
    let snapshot: BoardState | null = null;

    setHistory((current) => {
      if (current.future.length === 0) return current;

      const [nextFuture, ...restFuture] = current.future;
      snapshot = clone(nextFuture);

      return {
        past: [...current.past, clone(current.present)].slice(-capacity),
        present: clone(nextFuture),
        future: restFuture,
      };
    });

    return snapshot;
  }, [capacity]);

  const reset = useCallback((next: BoardState) => {
    setHistory({
      past: [],
      present: clone(next),
      future: [],
    });
  }, []);

  const clear = useCallback(() => {
    setHistory((current) => ({
      past: [],
      present: clone(current.present),
      future: [],
    }));
  }, []);

  const jumpToPast = useCallback((index: number): BoardState | null => {
    let snapshot: BoardState | null = null;

    setHistory((current) => {
      if (index < 0 || index >= current.past.length) return current;

      const target = current.past[index];
      snapshot = clone(target);

      const nextPast = current.past.slice(0, index);
      const nextFuture = [clone(current.present), ...current.past.slice(index + 1).reverse(), ...current.future].map(clone);

      return {
        past: nextPast,
        present: clone(target),
        future: nextFuture,
      };
    });

    return snapshot;
  }, []);

  const computed = useMemo(
    () => ({
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      historyLength: history.past.length + 1 + history.future.length,
    }),
    [history.future.length, history.past.length]
  );

  return {
    ...history,
    ...computed,
    set,
    replacePresent,
    undo,
    redo,
    reset,
    clear,
    jumpToPast,
  };
}

export default useBoardHistory;


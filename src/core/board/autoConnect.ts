import type { ChipPortDefinition } from '@/core/board/chipDefinitions';
import type { BoardChipInstance, BoardEdge, BoardState, ChipPortRef, ValidationResult } from '@/core/board/boardTypes';
import { getChipById } from '@/core/board/boardTypes';
import { inferNewEdge, validateConnection } from '@/core/board/connectionRules';
import { cloneBoardSerializable } from '@/core/board/boardSerializer';
import { applyValidationToEdges } from '@/core/board/validation';

function sortChipsByFlowPosition(chips: BoardChipInstance[]): BoardChipInstance[] {
  return [...chips].sort((a, b) => {
    const dx = a.position.x - b.position.x;
    if (Math.abs(dx) > 2) return dx;
    return a.position.y - b.position.y;
  });
}

/**
 * 입력 1 · 기능(logic+action) 2 · AI 2 · 출력 1 = 총 6개일 때 카테고리 순서로 체인 정렬.
 * 개수가 맞지 않으면 null → 좌→우 정렬로 대체.
 */
export function orderChipsForAutoChain(board: BoardState, chipIds: string[]): BoardChipInstance[] {
  const chips = chipIds.map((id) => getChipById(board, id)).filter((c): c is BoardChipInstance => Boolean(c));
  if (chips.length < 2) return chips;

  if (chips.length === 6) {
    const input = chips.filter((c) => c.definition.category === 'input');
    const func = chips
      .filter((c) => c.definition.category === 'logic' || c.definition.category === 'action')
      .sort((a, b) => a.position.x - b.position.x);
    const ai = chips.filter((c) => c.definition.category === 'ai').sort((a, b) => a.position.x - b.position.x);
    const output = chips.filter((c) => c.definition.category === 'output');

    if (input.length === 1 && func.length === 2 && ai.length === 2 && output.length === 1) {
      return [input[0]!, func[0]!, func[1]!, ai[0]!, ai[1]!, output[0]!];
    }
  }

  return sortChipsByFlowPosition(chips);
}

function scorePortPair(
  fromPort: ChipPortDefinition,
  toPort: ChipPortDefinition,
  result: ValidationResult,
): number {
  if (result.level !== 'allow' && result.level !== 'warn') return -1;
  let s = result.level === 'allow' ? 100 : 70;
  if (fromPort.type === toPort.type) s += 40;
  if (fromPort.type !== 'EVT' && toPort.type !== 'EVT') s += 25;
  if (toPort.required) s += 8;
  const mainNames = ['out', 'answer', 'prompt', 'text', 'in', 'userInput', 'content', 'data'];
  if (mainNames.some((n) => fromPort.id.includes(n) || fromPort.name.toLowerCase().includes(n))) s += 5;
  if (mainNames.some((n) => toPort.id.includes(n) || toPort.name.toLowerCase().includes(n))) s += 5;
  return s;
}

function findBestPortPair(board: BoardState, fromChipId: string, toChipId: string): { from: ChipPortRef; to: ChipPortRef } | null {
  const fromChip = getChipById(board, fromChipId);
  const toChip = getChipById(board, toChipId);
  if (!fromChip || !toChip) return null;

  const outs = fromChip.definition.ports.filter((p) => p.direction === 'OUTPUT');
  const ins = toChip.definition.ports.filter((p) => p.direction === 'INPUT');

  let best: { from: ChipPortRef; to: ChipPortRef; score: number } | null = null;

  for (const fo of outs) {
    for (const ti of ins) {
      const fromRef: ChipPortRef = { chipId: fromChipId, portId: fo.id };
      const toRef: ChipPortRef = { chipId: toChipId, portId: ti.id };
      const result = validateConnection(board, fromRef, toRef);
      const sc = scorePortPair(fo, ti, result);
      if (sc < 0) continue;
      if (!best || sc > best.score) {
        best = { from: fromRef, to: toRef, score: sc };
      }
    }
  }

  return best ? { from: best.from, to: best.to } : null;
}

export type AutoConnectResult = {
  board: BoardState;
  added: number;
  skippedPairs: number;
};

/** 선택된 칩을 한 줄로 이어 붙일 때, 인접 칩끼리 타입이 맞는 최적의 포트 한 쌍씩 연결 */
export function autoConnectSelectedChips(board: BoardState, selectedChipIds: string[]): AutoConnectResult {
  const unique = [...new Set(selectedChipIds)];
  const ordered = orderChipsForAutoChain(board, unique);

  if (ordered.length < 2) {
    return { board: applyValidationToEdges(cloneBoardSerializable(board, false)), added: 0, skippedPairs: 0 };
  }

  let next = cloneBoardSerializable(board, false);
  let added = 0;
  let skippedPairs = 0;

  for (let i = 0; i < ordered.length - 1; i++) {
    const fromId = ordered[i]!.id;
    const toId = ordered[i + 1]!.id;
    const pair = findBestPortPair(next, fromId, toId);
    if (!pair) {
      skippedPairs += 1;
      continue;
    }

    const result = validateConnection(next, pair.from, pair.to);
    if (result.level !== 'allow' && result.level !== 'warn') {
      skippedPairs += 1;
      continue;
    }

    const edge = inferNewEdge(next, pair.from, pair.to);
    if (!edge) {
      skippedPairs += 1;
      continue;
    }

    edge.validationLevel = result.level === 'warn' ? 'warn' : 'allow';

    const nextEdges: BoardEdge[] = [...next.edges, edge];
    next = { ...next, edges: nextEdges };
    added += 1;
  }

  return {
    board: applyValidationToEdges(next),
    added,
    skippedPairs,
  };
}

/** 선택된 칩들 사이에만 놓인 엣지(양끝 모두 선택 범위)를 제거 */
export function disconnectEdgesAmongSelected(board: BoardState, selectedChipIds: string[]): BoardState {
  const set = new Set(selectedChipIds);
  const edges = board.edges.filter((e) => !(set.has(e.fromChipId) && set.has(e.toChipId)));
  return applyValidationToEdges({ ...board, edges });
}

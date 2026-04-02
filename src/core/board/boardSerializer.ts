import type { BoardChipInstance, BoardEdge, BoardLogEntry, BoardState, ChipFlags, ChipRuntimeState, XYPosition } from './boardTypes';
import { createBoardChipInstance, createEmptyRuntimeState } from './boardTypes';
import { getChipDefinition } from './chipDefinitions';

export const BOARD_SERIALIZER_VERSION = 1 as const;

export type SerializedBoardChip = {
  id: string;
  type: string;
  name: string;
  position: XYPosition;
  width?: number;
  height?: number;
  selected?: boolean;
  config: Record<string, unknown>;
  runtime?: ChipRuntimeState;
  flags?: ChipFlags;
};

export type SerializedBoardEdge = {
  id: string;
  fromChipId: string;
  fromPortId: string;
  toChipId: string;
  toPortId: string;
  kind: BoardEdge['kind'];
  selected?: boolean;
  animated?: boolean;
  validationLevel?: BoardEdge['validationLevel'];
  label?: string;
  metadata?: Record<string, unknown>;
};

export type SerializedBoardDocument = {
  version: typeof BOARD_SERIALIZER_VERSION;
  exportedAt: number;
  board: {
    id: string;
    name: string;
    viewport?: BoardState['viewport'];
    meta?: Record<string, unknown>;
    chips: SerializedBoardChip[];
    edges: SerializedBoardEdge[];
    logs: BoardLogEntry[];
  };
};

export type DeserializeBoardOptions = {
  fallbackName?: string;
  resetRuntime?: boolean;
  strict?: boolean;
};

function jsonSafeClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeRuntime(runtime?: ChipRuntimeState, resetRuntime = false): ChipRuntimeState {
  if (resetRuntime || !runtime) {
    return createEmptyRuntimeState();
  }
  return jsonSafeClone(runtime);
}

function normalizeFlags(flags?: ChipFlags): ChipFlags | undefined {
  return flags ? jsonSafeClone(flags) : undefined;
}

function normalizeChip(chip: BoardChipInstance): SerializedBoardChip {
  return {
    id: chip.id,
    type: chip.type,
    name: chip.name,
    position: jsonSafeClone(chip.position),
    width: chip.width,
    height: chip.height,
    selected: chip.selected,
    config: jsonSafeClone(chip.config),
    runtime: jsonSafeClone(chip.runtime),
    flags: normalizeFlags(chip.flags),
  };
}

function normalizeEdge(edge: BoardEdge): SerializedBoardEdge {
  return {
    id: edge.id,
    fromChipId: edge.fromChipId,
    fromPortId: edge.fromPortId,
    toChipId: edge.toChipId,
    toPortId: edge.toPortId,
    kind: edge.kind,
    selected: edge.selected,
    animated: edge.animated,
    validationLevel: edge.validationLevel,
    label: edge.label,
    metadata: edge.metadata ? jsonSafeClone(edge.metadata) : undefined,
  };
}

export function serializeBoard(board: BoardState): SerializedBoardDocument {
  return {
    version: BOARD_SERIALIZER_VERSION,
    exportedAt: Date.now(),
    board: {
      id: board.id,
      name: board.name,
      viewport: board.viewport ? jsonSafeClone(board.viewport) : undefined,
      meta: board.meta ? jsonSafeClone(board.meta) : undefined,
      chips: board.chips.map(normalizeChip),
      edges: board.edges.map(normalizeEdge),
      logs: jsonSafeClone(board.logs),
    },
  };
}

export function serializeBoardToJson(board: BoardState, pretty = true): string {
  return JSON.stringify(serializeBoard(board), null, pretty ? 2 : 0);
}

export function deserializeBoard(
  document: SerializedBoardDocument,
  options: DeserializeBoardOptions = {}
): BoardState {
  if (document.version !== BOARD_SERIALIZER_VERSION && options.strict) {
    throw new Error(`Unsupported board document version: ${document.version}`);
  }

  const chips = document.board.chips
    .map((serializedChip) => {
      const definition = getChipDefinition(serializedChip.type);
      if (!definition) {
        if (options.strict) {
          throw new Error(`Chip definition not found during deserialize: ${serializedChip.type}`);
        }
        return null;
      }

      const chip = createBoardChipInstance({
        id: serializedChip.id,
        definition,
        position: jsonSafeClone(serializedChip.position),
        name: serializedChip.name,
        config: jsonSafeClone(serializedChip.config),
        flags: normalizeFlags(serializedChip.flags),
      });

      chip.width = serializedChip.width ?? chip.width;
      chip.height = serializedChip.height ?? chip.height;
      chip.selected = serializedChip.selected;
      chip.runtime = normalizeRuntime(serializedChip.runtime, options.resetRuntime);
      return chip;
    })
    .filter(Boolean) as BoardChipInstance[];

  const chipIdSet = new Set(chips.map((chip) => chip.id));
  const edges = document.board.edges
    .filter((edge) => chipIdSet.has(edge.fromChipId) && chipIdSet.has(edge.toChipId))
    .map((edge) => ({
      id: edge.id,
      fromChipId: edge.fromChipId,
      fromPortId: edge.fromPortId,
      toChipId: edge.toChipId,
      toPortId: edge.toPortId,
      kind: edge.kind,
      selected: edge.selected,
      animated: edge.animated,
      validationLevel: edge.validationLevel,
      label: edge.label,
      metadata: edge.metadata ? jsonSafeClone(edge.metadata) : undefined,
    }));

  return {
    id: document.board.id,
    name: document.board.name || options.fallbackName || '불러온 보드',
    chips,
    edges,
    logs: jsonSafeClone(document.board.logs ?? []),
    viewport: document.board.viewport ? jsonSafeClone(document.board.viewport) : undefined,
    meta: document.board.meta ? jsonSafeClone(document.board.meta) : undefined,
  };
}

export function deserializeBoardFromJson(
  json: string,
  options: DeserializeBoardOptions = {}
): BoardState {
  const parsed = JSON.parse(json) as SerializedBoardDocument | BoardState;
  return deserializeBoardLike(parsed, options);
}

export function isSerializedBoardDocument(value: unknown): value is SerializedBoardDocument {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as SerializedBoardDocument;
  return candidate.version === BOARD_SERIALIZER_VERSION && Boolean(candidate.board);
}

export function isBoardStateLike(value: unknown): value is BoardState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as BoardState;
  return Array.isArray(candidate.chips) && Array.isArray(candidate.edges) && typeof candidate.id === 'string';
}

export function deserializeBoardLike(
  value: SerializedBoardDocument | BoardState,
  options: DeserializeBoardOptions = {}
): BoardState {
  if (isSerializedBoardDocument(value)) {
    return deserializeBoard(value, options);
  }

  if (isBoardStateLike(value)) {
    return deserializeBoard(serializeBoard(value), options);
  }

  throw new Error('Unsupported board payload');
}

export function cloneBoardSerializable(board: BoardState, resetRuntime = false): BoardState {
  return deserializeBoard(serializeBoard(board), { resetRuntime });
}

export function exportBoardSummary(board: BoardState): {
  id: string;
  name: string;
  chipCount: number;
  edgeCount: number;
  chipTypes: string[];
  exportedAt: number;
} {
  return {
    id: board.id,
    name: board.name,
    chipCount: board.chips.length,
    edgeCount: board.edges.length,
    chipTypes: [...new Set(board.chips.map((chip) => chip.type))],
    exportedAt: Date.now(),
  };
}

export function stripRuntimeFromBoard(board: BoardState): BoardState {
  const cloned = cloneBoardSerializable(board, true);
  cloned.logs = [];
  return cloned;
}

export function createImportableBoardPayload(board: BoardState): SerializedBoardDocument {
  return serializeBoard(stripRuntimeFromBoard(board));
}


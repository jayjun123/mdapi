import type {
  ChipDefinition,
  ChipPortDefinition,
  ChipSize,
  PortDirection,
  PortPlacement,
  PortType,
} from './chipDefinitions';

export type EdgeKind = 'data' | 'event';
export type ExecutionStatus = 'idle' | 'ready' | 'running' | 'success' | 'warning' | 'error';
export type LedState = 'OFF' | 'READY' | 'RUNNING' | 'NEED_CONFIG' | 'ERROR' | 'THINKING';
export type ValidationLevel = 'allow' | 'warn' | 'adapter' | 'deny';

export type XYPosition = {
  x: number;
  y: number;
};

export type ChipPortRef = {
  chipId: string;
  portId: string;
};

export type ChipRuntimeState = {
  ledRun: LedState;
  ledValid: LedState;
  executionStatus: ExecutionStatus;
  lastInput?: unknown;
  lastOutput?: unknown;
  lastError?: string;
  lastRunAt?: number;
};

export type ChipFlags = {
  isStartChip?: boolean;
  allowLoopback?: boolean;
  draftMode?: boolean;
  requiresApproval?: boolean;
  disabled?: boolean;
};

export type BoardChipInstance = {
  id: string;
  type: string;
  name: string;
  definition: ChipDefinition;
  position: XYPosition;
  width?: number;
  height?: number;
  selected?: boolean;
  config: Record<string, unknown>;
  runtime: ChipRuntimeState;
  flags: ChipFlags;
};

export type BoardEdge = {
  id: string;
  fromChipId: string;
  fromPortId: string;
  toChipId: string;
  toPortId: string;
  kind: EdgeKind;
  selected?: boolean;
  animated?: boolean;
  validationLevel?: ValidationLevel;
  label?: string;
  metadata?: Record<string, unknown>;
};

export type BoardLogEntry = {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  chipId?: string;
  edgeId?: string;
  message: string;
  data?: unknown;
};

export type BoardState = {
  id: string;
  name: string;
  chips: BoardChipInstance[];
  edges: BoardEdge[];
  logs: BoardLogEntry[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  meta?: Record<string, unknown>;
};

export type ValidationResult = {
  ok: boolean;
  level: ValidationLevel;
  code: string;
  message: string;
  adapterType?: string;
  details?: Record<string, unknown>;
};

export type BoardValidationIssue = {
  level: 'error' | 'warning';
  code: string;
  message: string;
  chipId?: string;
  portId?: string;
  edgeId?: string;
  details?: Record<string, unknown>;
};

export type BoardValidationReport = {
  ok: boolean;
  errors: BoardValidationIssue[];
  warnings: BoardValidationIssue[];
  executablePaths: string[][];
};

export type PortLookup = {
  chip: BoardChipInstance;
  port: ChipPortDefinition;
};

export const CHIP_SIZE_DIMENSIONS: Record<ChipSize, { width: number; height: number }> = {
  S: { width: 96, height: 72 },
  M: { width: 128, height: 118 },
  L: { width: 160, height: 132 },
  XL: { width: 192, height: 152 },
};

export function getChipById(board: BoardState, chipId: string): BoardChipInstance | undefined {
  return board.chips.find((chip) => chip.id === chipId);
}

export function getPortById(chip: BoardChipInstance, portId: string): ChipPortDefinition | undefined {
  return chip.definition.ports.find((port) => port.id === portId);
}

export function getPortLookup(board: BoardState, ref: ChipPortRef): PortLookup | undefined {
  const chip = getChipById(board, ref.chipId);
  if (!chip) return undefined;

  const port = getPortById(chip, ref.portId);
  if (!port) return undefined;

  return { chip, port };
}

export function getIncomingEdges(board: BoardState, chipId: string): BoardEdge[] {
  return board.edges.filter((edge) => edge.toChipId === chipId);
}

export function getOutgoingEdges(board: BoardState, chipId: string): BoardEdge[] {
  return board.edges.filter((edge) => edge.fromChipId === chipId);
}

export function getEdgesForPort(board: BoardState, ref: ChipPortRef): BoardEdge[] {
  return board.edges.filter(
    (edge) =>
      (edge.fromChipId === ref.chipId && edge.fromPortId === ref.portId) ||
      (edge.toChipId === ref.chipId && edge.toPortId === ref.portId)
  );
}

export function isPortConnected(board: BoardState, ref: ChipPortRef): boolean {
  return getEdgesForPort(board, ref).length > 0;
}

export function isInputPortFull(board: BoardState, ref: ChipPortRef): boolean {
  const lookup = getPortLookup(board, ref);
  if (!lookup) return false;
  if (lookup.port.direction !== 'INPUT') return false;
  if (lookup.port.multi) return false;

  return board.edges.some((edge) => edge.toChipId === ref.chipId && edge.toPortId === ref.portId);
}

export function edgeExists(board: BoardState, from: ChipPortRef, to: ChipPortRef): boolean {
  return board.edges.some(
    (edge) =>
      edge.fromChipId === from.chipId &&
      edge.fromPortId === from.portId &&
      edge.toChipId === to.chipId &&
      edge.toPortId === to.portId
  );
}

export function inferIsStartChip(chip: BoardChipInstance): boolean {
  if (typeof chip.flags.isStartChip === 'boolean') return chip.flags.isStartChip;
  return chip.definition.category === 'input';
}

export function inferEdgeKind(fromPortType: PortType, toPortType: PortType): EdgeKind {
  if (fromPortType === 'EVT' && toPortType === 'EVT') return 'event';
  return 'data';
}

export function createEmptyRuntimeState(): ChipRuntimeState {
  return {
    ledRun: 'OFF',
    ledValid: 'NEED_CONFIG',
    executionStatus: 'idle',
  };
}

export function createBoardChipInstance(params: {
  id: string;
  definition: ChipDefinition;
  position: XYPosition;
  name?: string;
  config?: Record<string, unknown>;
  flags?: ChipFlags;
}): BoardChipInstance {
  const { definition, id, position, config, flags, name } = params;
  const dims = CHIP_SIZE_DIMENSIONS[definition.size];

  return {
    id,
    type: definition.type,
    name: name ?? definition.name,
    definition,
    position,
    width: dims.width,
    height: dims.height,
    config: { ...definition.defaultConfig, ...(config ?? {}) },
    runtime: createEmptyRuntimeState(),
    flags: {
      isStartChip: definition.category === 'input',
      allowLoopback: false,
      draftMode: false,
      requiresApproval: false,
      disabled: false,
      ...(flags ?? {}),
    },
  };
}

export function buildChipAdjacency(board: BoardState, kind?: EdgeKind): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const chip of board.chips) {
    map.set(chip.id, []);
  }

  for (const edge of board.edges) {
    if (kind && edge.kind !== kind) continue;
    const next = map.get(edge.fromChipId) ?? [];
    next.push(edge.toChipId);
    map.set(edge.fromChipId, next);
  }

  return map;
}

export function hasDirectedCycle(board: BoardState, kind?: EdgeKind): boolean {
  const adjacency = buildChipAdjacency(board, kind);
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function dfs(node: string): boolean {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;

    visiting.add(node);
    for (const next of adjacency.get(node) ?? []) {
      if (dfs(next)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  for (const chip of board.chips) {
    if (dfs(chip.id)) return true;
  }

  return false;
}

export function cloneBoard(board: BoardState): BoardState {
  return {
    ...board,
    chips: board.chips.map((chip) => ({
      ...chip,
      position: { ...chip.position },
      config: { ...chip.config },
      runtime: { ...chip.runtime },
      flags: { ...chip.flags },
    })),
    edges: board.edges.map((edge) => ({ ...edge, metadata: edge.metadata ? { ...edge.metadata } : undefined })),
    logs: board.logs.map((log) => ({ ...log })),
    viewport: board.viewport ? { ...board.viewport } : undefined,
    meta: board.meta ? { ...board.meta } : undefined,
  };
}

export type PortTypeColorMap = Record<PortType, string>;
export type PortTypeShapeMap = Record<PortType, 'triangle' | 'circle' | 'hex' | 'diamond' | 'square' | 'dashed-circle'>;

export const PORT_TYPE_COLORS: PortTypeColorMap = {
  EVT: '#F5C542',
  TXT: '#59B8FF',
  NUM: '#FF9F43',
  BOOL: '#78E08F',
  JSON: '#9B7BFF',
  LIST: '#4ECDC4',
  FILE: '#7F8FA6',
  IMG: '#FF6FB5',
  AUD: '#C56CFF',
  URL: '#2EC4B6',
  CODE: '#FF5D5D',
  DOC: '#E9C46A',
  ANY: '#B0B7C3',
};

export const PORT_TYPE_SHAPES: PortTypeShapeMap = {
  EVT: 'triangle',
  TXT: 'circle',
  NUM: 'circle',
  BOOL: 'diamond',
  JSON: 'hex',
  LIST: 'hex',
  FILE: 'square',
  IMG: 'square',
  AUD: 'square',
  URL: 'circle',
  CODE: 'square',
  DOC: 'square',
  ANY: 'dashed-circle',
};

export function isRequiredInputPort(port: ChipPortDefinition): boolean {
  return port.direction === 'INPUT' && Boolean(port.required);
}

export function isEventPort(port: ChipPortDefinition): boolean {
  return port.type === 'EVT';
}

export function isPortDirection(port: ChipPortDefinition, direction: PortDirection): boolean {
  return port.direction === direction;
}

export function getPortPlacement(port: ChipPortDefinition): PortPlacement {
  return port.placement ?? (port.direction === 'INPUT' ? 'left' : 'right');
}


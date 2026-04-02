import type { Connection, Edge, EdgeChange, Node, NodeChange, XYPosition as ReactFlowXYPosition } from 'reactflow';
import { MarkerType, Position, applyEdgeChanges, applyNodeChanges } from 'reactflow';
import type {
  BoardChipInstance,
  BoardEdge,
  BoardState,
  ChipFlags,
  ChipRuntimeState,
  ValidationLevel,
  XYPosition,
} from './boardTypes';
import {
  CHIP_SIZE_DIMENSIONS,
  PORT_TYPE_COLORS,
  PORT_TYPE_SHAPES,
  createBoardChipInstance,
  createEmptyRuntimeState,
  getPortPlacement,
} from './boardTypes';
import { getChipDefinition, type ChipDefinition, type ChipPortDefinition, type PortPlacement } from './chipDefinitions';
import { getPreviewEdgeState, inferNewEdge, validateConnection } from './connectionRules';

export type ReactFlowChipPortData = {
  id: string;
  name: string;
  type: ChipPortDefinition['type'];
  direction: ChipPortDefinition['direction'];
  placement: PortPlacement;
  required: boolean;
  multi: boolean;
  color: string;
  shape: string;
  description?: string;
};

export type ReactFlowChipNodeData = {
  chipId: string;
  chipType: string;
  title: string;
  category: ChipDefinition['category'];
  icon: string;
  size: ChipDefinition['size'];
  description: string;
  executable: boolean;
  ports: ReactFlowChipPortData[];
  definition: ChipDefinition;
  config: Record<string, unknown>;
  runtime: ChipRuntimeState;
  flags: ChipFlags;
};

export type ReactFlowBoardEdgeData = {
  edgeId: string;
  kind: BoardEdge['kind'];
  validationLevel: ValidationLevel | undefined;
  label?: string;
  metadata?: Record<string, unknown>;
};

export type ReactFlowBoardSnapshot = {
  nodes: Array<Node<ReactFlowChipNodeData>>;
  edges: Array<Edge<ReactFlowBoardEdgeData>>;
};

export type EdgePreviewResult = {
  edge: Edge<ReactFlowBoardEdgeData> | null;
  valid: boolean;
  color: string;
  label: string;
  reason?: string;
};

const NODE_TYPE = 'breadboardChip';
/** 커스텀 엣지: 선 위에 출력/입력 라벨 */
export const BOARD_EDGE_TYPE = 'breadboardEdge';

export function toReactFlowPosition(position: XYPosition): ReactFlowXYPosition {
  return { x: position.x, y: position.y };
}

export function toBoardPosition(position: ReactFlowXYPosition): XYPosition {
  return { x: position.x, y: position.y };
}

export function toHandleId(portId: string): string {
  return `port:${portId}`;
}

export function fromHandleId(handleId?: string | null): string {
  if (!handleId) return '';
  return handleId.startsWith('port:') ? handleId.slice(5) : handleId;
}

export function placementToPosition(placement: PortPlacement): Position {
  switch (placement) {
    case 'top':
      return Position.Top;
    case 'bottom':
      return Position.Bottom;
    case 'right':
      return Position.Right;
    case 'left':
    default:
      return Position.Left;
  }
}

export function validationLevelToStroke(level?: ValidationLevel, kind: BoardEdge['kind'] = 'data'): string {
  if (level === 'allow') return kind === 'event' ? '#f5c542' : '#22c55e';
  if (level === 'warn') return '#eab308';
  if (level === 'adapter') return '#f97316';
  if (level === 'deny') return '#ef4444';
  return kind === 'event' ? '#f5c542' : '#7c8aa0';
}

export function validationLevelToAnimated(level?: ValidationLevel, kind: BoardEdge['kind'] = 'data'): boolean {
  if (level === 'deny') return false;
  if (level === 'adapter') return true;
  return kind === 'event';
}

export function boardPortToReactFlowPort(port: ChipPortDefinition): ReactFlowChipPortData {
  return {
    id: port.id,
    name: port.name,
    type: port.type,
    direction: port.direction,
    placement: getPortPlacement(port),
    required: Boolean(port.required),
    multi: Boolean(port.multi),
    color: PORT_TYPE_COLORS[port.type],
    shape: PORT_TYPE_SHAPES[port.type],
    description: port.description,
  };
}

export function boardChipToReactFlowNode(chip: BoardChipInstance): Node<ReactFlowChipNodeData> {
  const dimensions = CHIP_SIZE_DIMENSIONS[chip.definition.size];

  return {
    id: chip.id,
    type: NODE_TYPE,
    position: toReactFlowPosition(chip.position),
    selected: chip.selected,
    width: chip.width ?? dimensions.width,
    height: chip.height ?? dimensions.height,
    data: {
      chipId: chip.id,
      chipType: chip.type,
      title: chip.name,
      category: chip.definition.category,
      icon: chip.definition.icon,
      size: chip.definition.size,
      description: chip.definition.description,
      executable: chip.definition.executable,
      ports: chip.definition.ports.map(boardPortToReactFlowPort),
      definition: chip.definition,
      config: chip.config,
      runtime: chip.runtime,
      flags: chip.flags,
    },
  };
}

export function boardEdgeToReactFlowEdge(edge: BoardEdge): Edge<ReactFlowBoardEdgeData> {
  const stroke = validationLevelToStroke(edge.validationLevel, edge.kind);

  return {
    id: edge.id,
    type: BOARD_EDGE_TYPE,
    source: edge.fromChipId,
    sourceHandle: toHandleId(edge.fromPortId),
    target: edge.toChipId,
    targetHandle: toHandleId(edge.toPortId),
    selected: edge.selected,
    animated: edge.animated ?? validationLevelToAnimated(edge.validationLevel, edge.kind),
    label: edge.label,
    style: {
      stroke,
      strokeWidth: edge.kind === 'event' ? 2.5 : 2,
      strokeDasharray: edge.kind === 'event' ? '6 4' : undefined,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: stroke,
      width: 18,
      height: 18,
    },
    data: {
      edgeId: edge.id,
      kind: edge.kind,
      validationLevel: edge.validationLevel,
      label: edge.label,
      metadata: edge.metadata,
    },
  };
}

export function boardToReactFlow(board: BoardState): ReactFlowBoardSnapshot {
  return {
    nodes: board.chips.map(boardChipToReactFlowNode),
    edges: board.edges.map(boardEdgeToReactFlowEdge),
  };
}

export function reactFlowNodeToBoardChip(node: Node<ReactFlowChipNodeData>): BoardChipInstance {
  const definition = node.data?.definition ?? getChipDefinition(node.data?.chipType ?? '');
  if (!definition) {
    throw new Error(`Chip definition not found for node: ${node.id}`);
  }

  const chip = createBoardChipInstance({
    id: node.id,
    definition,
    position: toBoardPosition(node.position),
    name: node.data?.title ?? definition.name,
    config: node.data?.config ?? definition.defaultConfig,
    flags: node.data?.flags,
  });

  chip.runtime = node.data?.runtime ?? createEmptyRuntimeState();
  chip.selected = node.selected;
  chip.width = node.width ?? chip.width;
  chip.height = node.height ?? chip.height;
  return chip;
}

export function reactFlowEdgeToBoardEdge(edge: Edge<ReactFlowBoardEdgeData>): BoardEdge {
  const fromPortId = fromHandleId(edge.sourceHandle);
  const toPortId = fromHandleId(edge.targetHandle);

  if (!edge.source || !edge.target || !fromPortId || !toPortId) {
    throw new Error(`Invalid React Flow edge: ${edge.id}`);
  }

  return {
    id: edge.id,
    fromChipId: edge.source,
    fromPortId,
    toChipId: edge.target,
    toPortId,
    kind: edge.data?.kind ?? 'data',
    selected: edge.selected,
    animated: edge.animated,
    validationLevel: edge.data?.validationLevel,
    label: typeof edge.label === 'string' ? edge.label : edge.data?.label,
    metadata: edge.data?.metadata,
  };
}

export function reactFlowToBoard(params: {
  boardId: string;
  name: string;
  nodes: Array<Node<ReactFlowChipNodeData>>;
  edges: Array<Edge<ReactFlowBoardEdgeData>>;
  logs?: BoardState['logs'];
  viewport?: BoardState['viewport'];
  meta?: BoardState['meta'];
}): BoardState {
  return {
    id: params.boardId,
    name: params.name,
    chips: params.nodes.map(reactFlowNodeToBoardChip),
    edges: params.edges.map(reactFlowEdgeToBoardEdge),
    logs: params.logs ?? [],
    viewport: params.viewport,
    meta: params.meta,
  };
}

export function syncNodePositionsToBoard(board: BoardState, nodes: Array<Node<ReactFlowChipNodeData>>): BoardState {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  return {
    ...board,
    chips: board.chips.map((chip) => {
      const node = nodeMap.get(chip.id);
      if (!node) return chip;
      return {
        ...chip,
        position: toBoardPosition(node.position),
        selected: node.selected,
        width: node.width ?? chip.width,
        height: node.height ?? chip.height,
      };
    }),
  };
}

export function syncEdgesFromReactFlow(board: BoardState, edges: Array<Edge<ReactFlowBoardEdgeData>>): BoardState {
  return {
    ...board,
    edges: edges.map(reactFlowEdgeToBoardEdge),
  };
}

export function applyReactFlowChanges(
  snapshot: ReactFlowBoardSnapshot,
  nodeChanges: NodeChange[],
  edgeChanges: EdgeChange[]
): ReactFlowBoardSnapshot {
  return {
    nodes: applyNodeChanges(nodeChanges, snapshot.nodes),
    edges: applyEdgeChanges(edgeChanges, snapshot.edges),
  };
}

export function createReactFlowNodeForChip(
  chipType: string,
  params: {
    id: string;
    position: XYPosition;
    name?: string;
    config?: Record<string, unknown>;
    flags?: ChipFlags;
  }
): Node<ReactFlowChipNodeData> {
  const definition = getChipDefinition(chipType);
  if (!definition) {
    throw new Error(`Chip definition not found: ${chipType}`);
  }

  const chip = createBoardChipInstance({
    id: params.id,
    definition,
    position: params.position,
    name: params.name,
    config: params.config,
    flags: params.flags,
  });

  return boardChipToReactFlowNode(chip);
}

export function createBoardEdgeFromConnection(board: BoardState, connection: Connection): BoardEdge | null {
  if (!connection.source || !connection.target) return null;

  const sourcePortId = fromHandleId(connection.sourceHandle);
  const targetPortId = fromHandleId(connection.targetHandle);
  if (!sourcePortId || !targetPortId) return null;

  const newEdge = inferNewEdge(
    board,
    { chipId: connection.source, portId: sourcePortId },
    { chipId: connection.target, portId: targetPortId }
  );

  return newEdge;
}

export function createEdgePreview(board: BoardState, connection: Connection): EdgePreviewResult {
  if (!connection.source || !connection.target) {
    return {
      edge: null,
      valid: false,
      color: '#ef4444',
      label: '출발/도착 노드가 없습니다.',
      reason: 'MISSING_NODE',
    };
  }

  const sourcePortId = fromHandleId(connection.sourceHandle);
  const targetPortId = fromHandleId(connection.targetHandle);
  if (!sourcePortId || !targetPortId) {
    return {
      edge: null,
      valid: false,
      color: '#ef4444',
      label: '포트 핸들이 유효하지 않습니다.',
      reason: 'INVALID_HANDLE',
    };
  }

  const preview = getPreviewEdgeState(
    board,
    { chipId: connection.source, portId: sourcePortId },
    { chipId: connection.target, portId: targetPortId }
  );

  const edge = createBoardEdgeFromConnection(board, connection);
  if (!edge) {
    return {
      edge: null,
      valid: false,
      color: '#ef4444',
      label: '엣지를 생성할 수 없습니다.',
      reason: 'EDGE_BUILD_FAILED',
    };
  }

  edge.validationLevel = preview.result.level;
  edge.label = preview.label;

  return {
    edge: boardEdgeToReactFlowEdge(edge),
    valid: preview.result.level === 'allow' || preview.result.level === 'warn',
    color: preview.color,
    label: preview.label,
    reason: preview.result.code,
  };
}

export function canConnectReactFlowEdge(board: BoardState, connection: Connection): boolean {
  if (!connection.source || !connection.target) return false;
  const sourcePortId = fromHandleId(connection.sourceHandle);
  const targetPortId = fromHandleId(connection.targetHandle);
  if (!sourcePortId || !targetPortId) return false;

  const result = validateConnection(
    board,
    { chipId: connection.source, portId: sourcePortId },
    { chipId: connection.target, portId: targetPortId }
  );

  return result.level === 'allow' || result.level === 'warn';
}

export function mergeBoardIntoSnapshot(board: BoardState, snapshot?: Partial<ReactFlowBoardSnapshot>): ReactFlowBoardSnapshot {
  const base = boardToReactFlow(board);
  return {
    nodes: snapshot?.nodes ?? base.nodes,
    edges: snapshot?.edges ?? base.edges,
  };
}


import type { ChipPortDefinition } from './chipDefinitions';
import type {
  BoardEdge,
  BoardState,
  ChipPortRef,
  ValidationResult,
} from './boardTypes';
import {
  cloneBoard,
  edgeExists,
  getEdgesForPort,
  getPortLookup,
  hasDirectedCycle,
  inferEdgeKind,
  isInputPortFull,
} from './boardTypes';

export const ADAPTER_SUGGESTIONS: Record<string, string> = {
  'FILE->TXT': 'document_parser_chip',
  'IMG->TXT': 'vision_analysis_chip',
  'AUD->TXT': 'speech_to_text_chip',
  'TXT->JSON': 'text_to_json_chip',
  'JSON->TXT': 'json_formatter_chip',
  'LIST->TXT': 'list_join_chip',
};

export function allow(message: string, code = 'ALLOW', details?: Record<string, unknown>): ValidationResult {
  return { ok: true, level: 'allow', code, message, details };
}

export function warn(message: string, code = 'WARN', details?: Record<string, unknown>): ValidationResult {
  return { ok: true, level: 'warn', code, message, details };
}

export function adapter(message: string, adapterType: string, code = 'ADAPTER_REQUIRED'): ValidationResult {
  return { ok: false, level: 'adapter', code, message, adapterType };
}

export function deny(message: string, code = 'DENY', details?: Record<string, unknown>): ValidationResult {
  return { ok: false, level: 'deny', code, message, details };
}

export function getAdapterKey(fromType: string, toType: string): string {
  return `${fromType}->${toType}`;
}

export function findRequiredAdapter(fromType: string, toType: string): string | undefined {
  return ADAPTER_SUGGESTIONS[getAdapterKey(fromType, toType)];
}

export function isDirectlyCompatible(fromType: string, toType: string): boolean {
  if (fromType === toType) return true;
  if (fromType === 'ANY') return true;
  if (toType === 'ANY') return true;
  return false;
}

export function acceptsInput(port: ChipPortDefinition, incomingType: ChipPortDefinition['type']): boolean {
  if (port.accepts && port.accepts.length > 0) {
    return port.accepts.includes(incomingType) || port.accepts.includes('ANY');
  }

  return isDirectlyCompatible(incomingType, port.type);
}

export function isEventConnection(fromPort: ChipPortDefinition, toPort: ChipPortDefinition): boolean {
  return fromPort.type === 'EVT' && toPort.type === 'EVT';
}

export function wouldCreateIllegalDataCycle(board: BoardState, from: ChipPortRef, to: ChipPortRef): boolean {
  const temp = cloneBoard(board);
  temp.edges.push({
    id: '__temp_data_cycle__',
    fromChipId: from.chipId,
    fromPortId: from.portId,
    toChipId: to.chipId,
    toPortId: to.portId,
    kind: 'data',
  });

  // MVP 정책: 데이터 순환 참조는 기본 금지
  return hasDirectedCycle(temp, 'data');
}

export function wouldCreateIllegalEventCycle(board: BoardState, from: ChipPortRef, to: ChipPortRef): boolean {
  const temp = cloneBoard(board);
  temp.edges.push({
    id: '__temp_event_cycle__',
    fromChipId: from.chipId,
    fromPortId: from.portId,
    toChipId: to.chipId,
    toPortId: to.portId,
    kind: 'event',
  });

  // MVP 정책: 이벤트 루프도 기본 금지
  return hasDirectedCycle(temp, 'event');
}

export function validateConnection(board: BoardState, from: ChipPortRef, to: ChipPortRef): ValidationResult {
  const fromLookup = getPortLookup(board, from);
  const toLookup = getPortLookup(board, to);

  if (!fromLookup || !toLookup) {
    return deny('포트를 찾을 수 없습니다.', 'PORT_NOT_FOUND');
  }

  const fromChip = fromLookup.chip;
  const toChip = toLookup.chip;
  const fromPort = fromLookup.port;
  const toPort = toLookup.port;

  if (fromChip.flags.disabled || toChip.flags.disabled) {
    return deny('비활성화된 칩은 연결할 수 없습니다.', 'DISABLED_CHIP');
  }

  if (from.chipId === to.chipId && !fromChip.flags.allowLoopback) {
    return deny('같은 칩 내부 자기 연결은 허용되지 않습니다.', 'SELF_LOOP_FORBIDDEN');
  }

  if (fromPort.direction !== 'OUTPUT') {
    return deny('시작 포트는 OUTPUT 이어야 합니다.', 'INVALID_FROM_DIRECTION');
  }

  if (toPort.direction !== 'INPUT') {
    return deny('도착 포트는 INPUT 이어야 합니다.', 'INVALID_TO_DIRECTION');
  }

  if (edgeExists(board, from, to)) {
    return deny('이미 같은 연결이 존재합니다.', 'DUPLICATE_EDGE');
  }

  if (isInputPortFull(board, to)) {
    return deny('입력 포트가 이미 사용 중입니다.', 'INPUT_PORT_FULL');
  }

  const fromEdges = getEdgesForPort(board, from);
  if (!fromPort.multi && fromEdges.some((edge) => edge.fromChipId === from.chipId && edge.fromPortId === from.portId)) {
    return deny('이 출력 포트는 다중 연결을 지원하지 않습니다.', 'OUTPUT_PORT_FULL');
  }

  const isEvent = isEventConnection(fromPort, toPort);
  const mixedEvent = fromPort.type === 'EVT' || toPort.type === 'EVT';

  if (mixedEvent && !isEvent) {
    return deny('EVT 포트는 EVT 포트끼리만 연결할 수 있습니다.', 'EVENT_TYPE_MISMATCH');
  }

  if (isEvent) {
    if (wouldCreateIllegalEventCycle(board, from, to)) {
      return deny('이벤트 루프가 발생합니다.', 'ILLEGAL_EVENT_CYCLE');
    }

    return allow('이벤트 연결이 가능합니다.', 'EVENT_ALLOWED', {
      edgeKind: 'event',
    });
  }

  if (wouldCreateIllegalDataCycle(board, from, to)) {
    return deny('허용되지 않는 데이터 순환 참조가 발생합니다.', 'ILLEGAL_DATA_CYCLE');
  }

  if (acceptsInput(toPort, fromPort.type)) {
    if (fromPort.type === 'ANY' || toPort.type === 'ANY') {
      return warn('ANY 타입 연결입니다. 런타임 검증이 필요할 수 있습니다.', 'ANY_TYPE_WARNING', {
        edgeKind: 'data',
      });
    }

    return allow('직접 연결이 가능합니다.', 'DIRECT_COMPATIBLE', {
      edgeKind: 'data',
    });
  }

  const adapterType = findRequiredAdapter(fromPort.type, toPort.type);
  if (adapterType) {
    return adapter(`중간 변환칩(${adapterType})이 필요합니다.`, adapterType, 'ADAPTER_REQUIRED');
  }

  return deny(
    `${fromPort.type} → ${toPort.type} 타입 연결은 허용되지 않습니다.`,
    'DATA_TYPE_MISMATCH',
    { fromType: fromPort.type, toType: toPort.type }
  );
}

export function inferNewEdge(board: BoardState, from: ChipPortRef, to: ChipPortRef): BoardEdge | null {
  const fromLookup = getPortLookup(board, from);
  const toLookup = getPortLookup(board, to);
  if (!fromLookup || !toLookup) return null;

  return {
    id: `edge_${from.chipId}_${from.portId}_${to.chipId}_${to.portId}`,
    fromChipId: from.chipId,
    fromPortId: from.portId,
    toChipId: to.chipId,
    toPortId: to.portId,
    kind: inferEdgeKind(fromLookup.port.type, toLookup.port.type),
  };
}

export function getPreviewEdgeState(board: BoardState, from: ChipPortRef, to: ChipPortRef): {
  color: string;
  label: string;
  result: ValidationResult;
} {
  const result = validateConnection(board, from, to);

  if (result.level === 'allow') {
    return { color: '#22c55e', label: '연결 가능', result };
  }

  if (result.level === 'warn') {
    return { color: '#eab308', label: '경고와 함께 연결 가능', result };
  }

  if (result.level === 'adapter') {
    return { color: '#f97316', label: result.adapterType ?? '변환칩 필요', result };
  }

  return { color: '#ef4444', label: result.message, result };
}


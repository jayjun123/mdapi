import type {
  BoardEdge,
  BoardState,
  BoardValidationIssue,
  BoardValidationReport,
  ChipPortRef,
} from './boardTypes';
import {
  getChipById,
  getIncomingEdges,
  getOutgoingEdges,
  getPortById,
  inferIsStartChip,
  isRequiredInputPort,
} from './boardTypes';
import { validateConnection } from './connectionRules';
import { buildFriendlyRequiredInputMessage } from './validationMessages';

function makeIssue(
  level: 'error' | 'warning',
  code: string,
  message: string,
  details?: Record<string, unknown>,
  refs?: {
    chipId?: string;
    portId?: string;
    edgeId?: string;
  }
): BoardValidationIssue {
  return {
    level,
    code,
    message,
    details,
    chipId: refs?.chipId,
    portId: refs?.portId,
    edgeId: refs?.edgeId,
  };
}

function error(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  refs?: { chipId?: string; portId?: string; edgeId?: string }
): BoardValidationIssue {
  return makeIssue('error', code, message, details, refs);
}

function warning(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  refs?: { chipId?: string; portId?: string; edgeId?: string }
): BoardValidationIssue {
  return makeIssue('warning', code, message, details, refs);
}

export function validateChipIds(board: BoardState): BoardValidationIssue[] {
  const issues: BoardValidationIssue[] = [];
  const seen = new Set<string>();

  for (const chip of board.chips) {
    if (!chip.id) {
      issues.push(error('CHIP_ID_MISSING', '칩 ID가 비어 있습니다.', undefined, { chipId: chip.id }));
      continue;
    }

    if (seen.has(chip.id)) {
      issues.push(error('DUPLICATE_CHIP_ID', `중복된 칩 ID입니다: ${chip.id}`, { chipId: chip.id }, { chipId: chip.id }));
      continue;
    }

    seen.add(chip.id);
  }

  return issues;
}

export function validateEdgeIds(board: BoardState): BoardValidationIssue[] {
  const issues: BoardValidationIssue[] = [];
  const seen = new Set<string>();

  for (const edge of board.edges) {
    if (!edge.id) {
      issues.push(error('EDGE_ID_MISSING', '엣지 ID가 비어 있습니다.', undefined, { edgeId: edge.id }));
      continue;
    }

    if (seen.has(edge.id)) {
      issues.push(error('DUPLICATE_EDGE_ID', `중복된 엣지 ID입니다: ${edge.id}`, { edgeId: edge.id }, { edgeId: edge.id }));
      continue;
    }

    seen.add(edge.id);
  }

  return issues;
}

export function validateChipDefinitions(board: BoardState): BoardValidationIssue[] {
  const issues: BoardValidationIssue[] = [];

  for (const chip of board.chips) {
    if (!chip.definition) {
      issues.push(error('CHIP_DEFINITION_MISSING', '칩 정의가 없습니다.', undefined, { chipId: chip.id }));
      continue;
    }

    if (chip.type !== chip.definition.type) {
      issues.push(
        warning(
          'CHIP_TYPE_DEFINITION_MISMATCH',
          `chip.type(${chip.type}) 와 definition.type(${chip.definition.type}) 이 다릅니다.`,
          { chipType: chip.type, definitionType: chip.definition.type },
          { chipId: chip.id }
        )
      );
    }

    if (!Array.isArray(chip.definition.ports) || chip.definition.ports.length === 0) {
      issues.push(error('CHIP_PORTS_MISSING', '칩 포트 정의가 비어 있습니다.', undefined, { chipId: chip.id }));
      continue;
    }

    const portIds = new Set<string>();
    for (const port of chip.definition.ports) {
      if (!port.id) {
        issues.push(error('PORT_ID_MISSING', '포트 ID가 비어 있습니다.', undefined, { chipId: chip.id }));
        continue;
      }

      if (portIds.has(port.id)) {
        issues.push(
          error(
            'DUPLICATE_PORT_ID',
            `동일 칩 내부에 중복된 포트 ID가 있습니다: ${port.id}`,
            { portId: port.id },
            { chipId: chip.id, portId: port.id }
          )
        );
        continue;
      }

      portIds.add(port.id);
    }
  }

  return issues;
}

export function validateEdgeReferences(board: BoardState): BoardValidationIssue[] {
  const issues: BoardValidationIssue[] = [];

  for (const edge of board.edges) {
    const fromChip = getChipById(board, edge.fromChipId);
    const toChip = getChipById(board, edge.toChipId);

    if (!fromChip) {
      issues.push(
        error(
          'EDGE_FROM_CHIP_NOT_FOUND',
          `출발 칩을 찾을 수 없습니다: ${edge.fromChipId}`,
          { fromChipId: edge.fromChipId },
          { edgeId: edge.id }
        )
      );
      continue;
    }

    if (!toChip) {
      issues.push(
        error(
          'EDGE_TO_CHIP_NOT_FOUND',
          `도착 칩을 찾을 수 없습니다: ${edge.toChipId}`,
          { toChipId: edge.toChipId },
          { edgeId: edge.id }
        )
      );
      continue;
    }

    const fromPort = getPortById(fromChip, edge.fromPortId);
    const toPort = getPortById(toChip, edge.toPortId);

    if (!fromPort) {
      issues.push(
        error(
          'EDGE_FROM_PORT_NOT_FOUND',
          `출발 포트를 찾을 수 없습니다: ${edge.fromPortId}`,
          { chipId: edge.fromChipId, portId: edge.fromPortId },
          { chipId: edge.fromChipId, portId: edge.fromPortId, edgeId: edge.id }
        )
      );
      continue;
    }

    if (!toPort) {
      issues.push(
        error(
          'EDGE_TO_PORT_NOT_FOUND',
          `도착 포트를 찾을 수 없습니다: ${edge.toPortId}`,
          { chipId: edge.toChipId, portId: edge.toPortId },
          { chipId: edge.toChipId, portId: edge.toPortId, edgeId: edge.id }
        )
      );
      continue;
    }

    const boardWithoutCurrentEdge: BoardState = {
      ...board,
      edges: board.edges.filter((candidate) => candidate.id !== edge.id),
    };

    const result = validateConnection(
      boardWithoutCurrentEdge,
      { chipId: edge.fromChipId, portId: edge.fromPortId },
      { chipId: edge.toChipId, portId: edge.toPortId }
    );

    if (!result.ok && result.level === 'adapter') {
      issues.push(
        error(
          result.code,
          result.message,
          {
            adapterType: result.adapterType,
            fromPortType: fromPort.type,
            toPortType: toPort.type,
          },
          { edgeId: edge.id, chipId: edge.toChipId, portId: edge.toPortId }
        )
      );
      continue;
    }

    if (!result.ok) {
      issues.push(
        error(
          result.code,
          result.message,
          {
            fromPortType: fromPort.type,
            toPortType: toPort.type,
            kind: edge.kind,
          },
          { edgeId: edge.id, chipId: edge.toChipId, portId: edge.toPortId }
        )
      );
      continue;
    }

    if (result.level === 'warn') {
      issues.push(
        warning(
          result.code,
          result.message,
          {
            fromPortType: fromPort.type,
            toPortType: toPort.type,
            kind: edge.kind,
          },
          { edgeId: edge.id, chipId: edge.toChipId, portId: edge.toPortId }
        )
      );
    }
  }

  return issues;
}

export function validateRequiredInputs(board: BoardState): BoardValidationIssue[] {
  const issues: BoardValidationIssue[] = [];

  for (const chip of board.chips) {
    for (const port of chip.definition.ports) {
      if (!isRequiredInputPort(port)) continue;

      const hasIncoming = board.edges.some(
        (edge) => edge.toChipId === chip.id && edge.toPortId === port.id
      );

      if (!hasIncoming) {
        issues.push(
          error(
            'REQUIRED_INPUT_NOT_CONNECTED',
            buildFriendlyRequiredInputMessage(chip, port),
            { chipType: chip.type, portType: port.type },
            { chipId: chip.id, portId: port.id }
          )
        );
      }
    }
  }

  return issues;
}

export function validateStartChips(board: BoardState): BoardValidationIssue[] {
  const issues: BoardValidationIssue[] = [];
  const startChips = board.chips.filter((chip) => inferIsStartChip(chip));

  if (startChips.length === 0) {
    issues.push(
      error(
        'NO_START_CHIP',
        '실행을 시작할 입력칩이 없습니다. 텍스트 입력칩 등을 팔레트에서 보드에 놓은 뒤, 다음 칩으로 선을 이어 주세요.'
      )
    );
  }

  for (const chip of startChips) {
    const outgoing = getOutgoingEdges(board, chip.id);
    if (outgoing.length === 0) {
      issues.push(
        warning(
          'START_CHIP_NOT_CONNECTED',
          `「${chip.name}」에서 다음으로 가는 선이 없습니다. 오른쪽 출력을 다음 칩으로 연결해야 데이터가 흐르고 이후 결과를 볼 수 있습니다.`,
          { chipType: chip.type },
          { chipId: chip.id }
        )
      );
    }
  }

  return issues;
}

export function validateIsolatedChips(board: BoardState): BoardValidationIssue[] {
  const issues: BoardValidationIssue[] = [];

  for (const chip of board.chips) {
    const incoming = getIncomingEdges(board, chip.id);
    const outgoing = getOutgoingEdges(board, chip.id);

    if (incoming.length === 0 && outgoing.length === 0) {
      issues.push(
        warning(
          'ISOLATED_CHIP',
          `「${chip.name}」이(가) 다른 칩과 연결되어 있지 않습니다. 앞·뒤로 선을 이어 주거나, 쓰지 않으면 삭제하세요.`,
          { chipType: chip.type },
          { chipId: chip.id }
        )
      );
    }
  }

  return issues;
}

export function getStartChipIds(board: BoardState): string[] {
  return board.chips.filter((chip) => inferIsStartChip(chip)).map((chip) => chip.id);
}

export function getReachableChipIds(board: BoardState, startChipIds: string[] = getStartChipIds(board)): Set<string> {
  const visited = new Set<string>();
  const stack = [...startChipIds];

  while (stack.length > 0) {
    const chipId = stack.pop()!;
    if (visited.has(chipId)) continue;
    visited.add(chipId);

    for (const edge of board.edges) {
      if (edge.fromChipId === chipId && !visited.has(edge.toChipId)) {
        stack.push(edge.toChipId);
      }
    }
  }

  return visited;
}

export function validateReachability(board: BoardState): BoardValidationIssue[] {
  const issues: BoardValidationIssue[] = [];
  const startChipIds = getStartChipIds(board);

  if (startChipIds.length === 0) return issues;

  const reachable = getReachableChipIds(board, startChipIds);

  for (const chip of board.chips) {
    if (!reachable.has(chip.id)) {
      issues.push(
        warning(
          'UNREACHABLE_CHIP',
          `「${chip.name}」은(는) 시작 칩에서 선을 따라가도 닿지 않습니다. 시작 쪽과 이 칩을 이어 주거나, 이 칩이 필요 없으면 삭제하세요.`,
          { chipType: chip.type },
          { chipId: chip.id }
        )
      );
    }
  }

  return issues;
}

function nextChipIds(board: BoardState, chipId: string): string[] {
  return board.edges.filter((edge) => edge.fromChipId === chipId).map((edge) => edge.toChipId);
}

function isPathTerminal(board: BoardState, chipId: string): boolean {
  return nextChipIds(board, chipId).length === 0;
}

function collectPathsDfs(
  board: BoardState,
  chipId: string,
  path: string[],
  paths: string[][],
  localVisited: Set<string>
): void {
  if (localVisited.has(chipId)) {
    paths.push([...path, chipId]);
    return;
  }

  const updatedPath = [...path, chipId];
  const nextVisited = new Set(localVisited);
  nextVisited.add(chipId);

  if (isPathTerminal(board, chipId)) {
    paths.push(updatedPath);
    return;
  }

  for (const next of nextChipIds(board, chipId)) {
    collectPathsDfs(board, next, updatedPath, paths, nextVisited);
  }
}

export function getExecutablePaths(board: BoardState): string[][] {
  const startChipIds = getStartChipIds(board);
  const paths: string[][] = [];

  for (const startChipId of startChipIds) {
    collectPathsDfs(board, startChipId, [], paths, new Set<string>());
  }

  return paths;
}

export function validateExecutablePaths(board: BoardState): BoardValidationIssue[] {
  const issues: BoardValidationIssue[] = [];
  const paths = getExecutablePaths(board);

  if (board.chips.length > 0 && paths.length === 0) {
    issues.push(
      warning(
        'NO_EXECUTABLE_PATH',
        '시작 칩에서 끝까지 이어지는 실행 길이 없습니다. 입력부터 결과 패널 같은 출력 칩까지 선이 끊기지 않게 연결해 주세요.'
      )
    );
  }

  return issues;
}

export function getEdgeValidationLevel(board: BoardState, edge: BoardEdge): 'allow' | 'warn' | 'adapter' | 'deny' {
  const boardWithoutCurrentEdge: BoardState = {
    ...board,
    edges: board.edges.filter((candidate) => candidate.id !== edge.id),
  };

  const result = validateConnection(
    boardWithoutCurrentEdge,
    { chipId: edge.fromChipId, portId: edge.fromPortId },
    { chipId: edge.toChipId, portId: edge.toPortId }
  );

  return result.level;
}

export function applyValidationToEdges(board: BoardState): BoardState {
  return {
    ...board,
    edges: board.edges.map((edge) => ({
      ...edge,
      validationLevel: getEdgeValidationLevel(board, edge),
    })),
  };
}

export function getChipPortConnectionCount(board: BoardState, ref: ChipPortRef): number {
  return board.edges.filter(
    (edge) =>
      (edge.fromChipId === ref.chipId && edge.fromPortId === ref.portId) ||
      (edge.toChipId === ref.chipId && edge.toPortId === ref.portId)
  ).length;
}

export function validateBoard(board: BoardState): BoardValidationReport {
  const issues: BoardValidationIssue[] = [
    ...validateChipIds(board),
    ...validateEdgeIds(board),
    ...validateChipDefinitions(board),
    ...validateEdgeReferences(board),
    ...validateRequiredInputs(board),
    ...validateStartChips(board),
    ...validateIsolatedChips(board),
    ...validateReachability(board),
    ...validateExecutablePaths(board),
  ];

  const errors = issues.filter((issue) => issue.level === 'error');
  const warnings = issues.filter((issue) => issue.level === 'warning');

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    executablePaths: getExecutablePaths(board),
  };
}

export function canExecuteBoard(board: BoardState): boolean {
  return validateBoard(board).ok;
}

export function summarizeValidationReport(report: BoardValidationReport): string[] {
  const lines: string[] = [];

  if (report.ok) {
    lines.push('보드 검증 통과');
  } else {
    lines.push(`보드 검증 실패: 오류 ${report.errors.length}개`);
  }

  if (report.warnings.length > 0) {
    lines.push(`경고 ${report.warnings.length}개`);
  }

  if (report.executablePaths.length > 0) {
    lines.push(`실행 경로 ${report.executablePaths.length}개`);
  }

  return lines;
}


import type { BoardChipInstance, BoardState } from './boardTypes';
import { getChipById } from './boardTypes';
import { getReachableChipIds, getStartChipIds } from './validation';

/** 실행기와 동일한 위상 정렬(모든 칩 간 edge 기준). */
function getTopologicalOrder(board: BoardState): string[] {
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const chip of board.chips) {
    indegree.set(chip.id, 0);
    adjacency.set(chip.id, []);
  }

  for (const edge of board.edges) {
    adjacency.get(edge.fromChipId)?.push(edge.toChipId);
    indegree.set(edge.toChipId, (indegree.get(edge.toChipId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [chipId, count] of indegree.entries()) {
    if (count === 0) queue.push(chipId);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const chipId = queue.shift()!;
    order.push(chipId);

    for (const next of adjacency.get(chipId) ?? []) {
      const nextCount = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextCount);
      if (nextCount === 0) queue.push(next);
    }
  }

  if (order.length === board.chips.length) return order;

  const included = new Set(order);
  for (const chip of board.chips) {
    if (!included.has(chip.id)) order.push(chip.id);
  }

  return order;
}

function shortHint(description: string): string {
  const trimmed = description.trim();
  if (!trimmed) return '';
  const cut = trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
  return ` (${cut})`;
}

function openSentence(chip: BoardChipInstance): string {
  const label = `「${chip.name}」`;
  switch (chip.type) {
    case 'text_input':
      return `사용자가 ${label}에 글을 적으면, 그 입력이`;
    case 'file_input':
      return `${label}에서 파일을 고르면, 그 데이터가`;
    case 'camera_input':
      return `${label}에서 화면을 넘기면, 그 영상·프레임이`;
    case 'audio_input':
      return `${label}에서 소리를 넘기면, 그 오디오가`;
    case 'webhook_input':
      return `밖에서 웹훅으로 이벤트가 들어오면 ${label}이 받고, 그걸로`;
    default:
      if (chip.definition.category === 'input') {
        return `${label}${shortHint(chip.definition.description)}에서 나온 값이`;
      }
      return `${label}에서 실행이 시작되면`;
  }
}

function middleClause(chip: BoardChipInstance): string {
  const label = `「${chip.name}」`;
  switch (chip.definition.category) {
    case 'ai':
      return ` ${label}에서 프롬프트나 모델 처리를 거친 뒤`;
    case 'logic':
      return ` ${label}에서 조건·분기·변환을 한 번 더 거치고`;
    case 'action':
      return ` ${label}에서 실제 동작(호출·저장 등)이 일어나고`;
    case 'output':
      return ` ${label} 쪽으로 넘어가면서`;
    case 'input':
      return ` ${label}을 한 번 더 거치면서`;
    default:
      return ` ${label}을 지나`;
  }
}

function closingSentence(last: BoardChipInstance): string {
  const label = `「${last.name}」`;
  if (last.definition.category === 'output') {
    return ` 마지막엔 ${label}에 모여서, 사용자에게 보이는 문장·화면·로그 같은 결과로 이어져요.`;
  }
  return ` 끝은 ${label}까지 이렇게 한 줄로 잡혀 있어요.`;
}

/**
 * 현재 보드 연결을 실행 순서에 맞춰 구어체로 설명합니다.
 * (실행기가 도달 가능한 칩만 같은 순서로 나열합니다.)
 */
export function describeBoardFlowNarrative(board: BoardState): string {
  if (board.chips.length === 0) {
    return '아직 칩이 없어요. 오른쪽 팔레트에서 칩을 끌어다 놓고, 선으로 이어 보세요.';
  }

  const startIds = getStartChipIds(board);
  if (startIds.length === 0) {
    return '맨 앞에 둘 시작 칩(예: 텍스트 입력)이 없어요. 입력 쪽 칩을 하나 두고 연결해 주세요.';
  }

  const reachable = getReachableChipIds(board, startIds);
  const order = getTopologicalOrder(board).filter((id) => reachable.has(id));
  const chips = order.map((id) => getChipById(board, id)).filter(Boolean) as BoardChipInstance[];

  if (chips.length === 0) {
    return '시작 칩에서 이어지는 흐름이 비어 있어요. 출력 쪽까지 선을 이어 주세요.';
  }

  if (chips.length === 1) {
    const c = chips[0];
    return `${openSentence(c)} 여기서 바로 이 보드 안에서 쓰이게 돼요. 실행 버튼을 누르면 이 칩부터 돌아가요.`;
  }

  let body = openSentence(chips[0]);
  for (let i = 1; i < chips.length - 1; i += 1) {
    body += middleClause(chips[i]);
  }
  body += closingSentence(chips[chips.length - 1]);

  const unreachable = board.chips.filter((c) => !reachable.has(c.id));
  if (unreachable.length > 0) {
    const names = unreachable.map((c) => `「${c.name}」`).join(', ');
    body += `\n\n참고로 시작 흐름에서 닿지 않는 칩이 ${unreachable.length}개 있어요 (${names}). 실행할 때는 건너뛰어져요.`;
  }

  return body;
}

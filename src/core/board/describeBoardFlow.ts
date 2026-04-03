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

const LLM_LIKE = new Set([
  'llm_core',
  'ai_ollama',
  'ai_chatgpt',
  'ai_claude',
  'ai_gemini',
  'ai_copilot',
  'ai_perplexity',
  'ai_grok',
]);

function hasAnyLlmLike(types: Set<string>): boolean {
  for (const t of LLM_LIKE) {
    if (types.has(t)) return true;
  }
  return false;
}

/**
 * 연결된 칩 종류를 보고, 실행 시 사용자 입장에서 “무엇을 할 수 있는지”를 한국어로 요약합니다.
 */
export function describeBoardCapabilityNarrative(chips: BoardChipInstance[]): string {
  if (chips.length === 0) {
    return '';
  }

  if (chips.length === 1) {
    const only = chips[0]!;
    switch (only.type) {
      case 'camera_input':
        return '지금은 카메라 입력만 이어져 있어요. 실행하면 촬영·프레임이 이 칩에서 나가고, 뒤에 비전 분석·AI·결과 칩을 붙이면 “촬영 → 분석·생성 → 화면에 보기” 같은 흐름을 만들 수 있습니다.';
      case 'audio_input':
        return '지금은 오디오 입력만 이어져 있어요. 실행하면 소리 데이터가 나가고, 뒤에 음성 인식·AI·요약 칩을 붙이면 “말하기 → 글·답변” 흐름을 만들 수 있습니다.';
      case 'file_input':
        return '지금은 파일 입력만 이어져 있어요. 실행하면 올린 파일이 다음 단계로 넘어가고, 문서 파싱·AI·문서 생성 칩을 이으면 “파일 → 가공 → 결과” 흐름을 완성할 수 있습니다.';
      case 'text_input':
        return '지금은 텍스트 입력만 이어져 있어요. 실행하면 적은 글이 나가고, 프롬프트 빌더·AI·결과 칩을 붙이면 “질문·지시 → 답” 흐름을 만들 수 있습니다.';
      default:
        break;
    }
  }

  const types = new Set(chips.map((c) => c.type));
  const hasCam = types.has('camera_input');
  const hasAud = types.has('audio_input');
  const hasFile = types.has('file_input');
  const hasText = types.has('text_input');
  const hasUrl = types.has('url_input');
  const hasVision = types.has('vision_analysis');
  const hasPb = types.has('prompt_builder');
  const hasLlm = hasAnyLlmLike(types);
  const hasTrans = types.has('translator');
  const hasSearch = types.has('search_rag') || types.has('ai_perplexity');
  const hasDoc = types.has('document_generator');
  const hasResult = types.has('result_panel') || types.has('note_output');
  const hasCode = types.has('code_forge');
  const hasQa = types.has('question_answer');
  const hasSum = types.has('summarizer');
  const hasRephrase = types.has('rephraser');
  const hasApi = types.has('api_connector');
  const hasDb = types.has('db_rw');

  const ending =
    hasResult || hasDoc
      ? '마지막 출력·문서 칩에서 화면에 보이거나, 저장·내보내기에 쓸 수 있는 형태로 정리할 수 있습니다.'
      : '연결된 순서대로 중간 결과가 다음 칩으로 넘어가며, 실제 구현에서는 각 칩에 맞는 API·로직을 붙이면 됩니다.';

  // --- 우선순위가 높은 조합부터 구체적으로 ---
  if (hasCam && hasVision && (hasLlm || hasQa)) {
    return [
      '이 구조로 실행되면, 카메라로 촬영하거나 넘긴 영상·사진을 비전 분석으로 읽은 뒤, 이어지는 AI 칩에서 질문·지시에 맞게 설명·분류·재해석·생성(예: “이 장면을 설명해 줘”, “사진을 그림풍으로 바꾼다”는 식의 프롬프트)을 할 수 있습니다.',
      ending,
    ].join(' ');
  }

  if (hasCam && hasLlm && !hasVision) {
    return [
      '이 구조로 실행되면, 카메라에서 넘긴 이미지·프레임을 AI에 넣어 설명·요약·스타일·형태를 바꾸는 요청(예: 사진을 일러스트처럼 보이게)을 처리할 수 있습니다. 비전 분석 칩을 앞에 두면 화면을 글로 풀어서 다음 AI에 넘기기도 쉽습니다.',
      ending,
    ].join(' ');
  }

  if (hasAud && (hasLlm || hasSum)) {
    return [
      '이 구조로 실행되면, 마이크·오디오로 넣은 소리를 AI나 요약 칩으로 넘겨 글로 옮기거나, 질문에 맞게 답을 만들 수 있습니다.',
      ending,
    ].join(' ');
  }

  if (hasFile && hasLlm && hasDoc) {
    return [
      '이 구조로 실행되면, 올린 파일 내용을 AI로 다루고, 문서 생성 칩에서 보고서·초안 형태로 묶어 낼 수 있습니다.',
      ending,
    ].join(' ');
  }

  if (hasFile && hasVision) {
    return [
      '이 구조로 실행되면, 파일(이미지 등)을 비전 분석으로 읽고, 이어지는 단계에서 설명·추출·분류 등을 할 수 있습니다.',
      ending,
    ].join(' ');
  }

  if ((hasText || hasUrl) && hasPb && hasLlm && hasResult) {
    return [
      '이 구조로 실행되면, 사람이 적은 글(또는 주소)을 프롬프트 빌더로 묶어 AI에 넣고, 결과 패널에서 답·초안을 바로 확인하는 흐름을 만들 수 있습니다.',
      ending,
    ].join(' ');
  }

  if (hasSearch && hasLlm) {
    return [
      '이 구조로 실행되면, 검색·근거 수집 단계를 거쳐 AI가 출처를 염두에 둔 답을 만들거나, 리서치형 질문에 맞춰 정리할 수 있습니다.',
      ending,
    ].join(' ');
  }

  if (hasTrans && hasResult) {
    return [
      '이 구조로 실행되면, 앞에서 넘어온 글을 번역 칩에서 다른 언어로 바꾸고, 결과 쪽에서 확인할 수 있습니다.',
      ending,
    ].join(' ');
  }

  if (hasCode && (hasLlm || hasText)) {
    return [
      '이 구조로 실행되면, 지시나 코드 관련 입력을 코드 포지칩으로 넘겨 생성·수정·설명을 하고, 이어지는 출력으로 볼 수 있습니다.',
      ending,
    ].join(' ');
  }

  if (hasApi || hasDb) {
    return [
      '이 구조로 실행되면, 외부 API 호출이나 DB 읽기·쓰기 단계를 끼워 넣어, AI나 다른 칩과 합쳐 업무 데이터를 주고받는 흐름을 만들 수 있습니다.',
      ending,
    ].join(' ');
  }

  if (hasRephrase && hasResult) {
    return [
      '이 구조로 실행되면, 문장 다듬기 칩으로 톤·말투를 고친 뒤, 결과에서 최종 문장을 확인할 수 있습니다.',
      ending,
    ].join(' ');
  }

  if (hasSum && hasLlm) {
    return [
      '이 구조로 실행되면, 긴 글을 요약 칩과 AI로 줄이거나 핵심만 뽑아, 보고·검토용으로 쓸 수 있습니다.',
      ending,
    ].join(' ');
  }

  if (hasLlm && hasResult) {
    return [
      '이 구조로 실행되면, 앞 단계에서 넘어온 내용을 AI로 처리해 답·글·정리본을 만들고, 결과 패널(또는 메모 출력)에서 확인할 수 있습니다.',
      ending,
    ].join(' ');
  }

  if (hasVision && !hasCam) {
    return [
      '이 구조로 실행되면, 이미지·화면 자료를 비전 분석으로 텍스트로 풀고, 이어지는 칩에서 그걸 가지고 질문·분류·저장 등을 할 수 있습니다.',
      ending,
    ].join(' ');
  }

  return [
    '이 구조로 실행되면, 연결해 둔 입력부터 출력까지 순서대로 데이터가 흐르며, 칩 종류에 맞게 실제 프로그램에서는 API·저장·화면 표시를 붙이면 됩니다. 위 연결 설명과 함께 보면 “어디서 무엇이 나와 어디로 가는지”를 구현에 옮기기 쉽습니다.',
    ending,
  ].join(' ');
}

function getNarrativeFlowChips(board: BoardState): {
  chips: BoardChipInstance[];
  reachable: Set<string>;
  errorMessage: string | null;
} {
  if (board.chips.length === 0) {
    return { chips: [], reachable: new Set(), errorMessage: 'empty' };
  }

  const startIds = getStartChipIds(board);
  if (startIds.length === 0) {
    return { chips: [], reachable: new Set(), errorMessage: 'no_start' };
  }

  const reachable = getReachableChipIds(board, startIds);
  const order = getTopologicalOrder(board).filter((id) => reachable.has(id));
  const chips = order.map((id) => getChipById(board, id)).filter(Boolean) as BoardChipInstance[];

  if (chips.length === 0) {
    return { chips: [], reachable, errorMessage: 'no_reachable' };
  }

  return { chips, reachable, errorMessage: null };
}

/**
 * 현재 보드 연결을 실행 순서에 맞춰 구어체로 설명합니다.
 * (실행기가 도달 가능한 칩만 같은 순서로 나열합니다.)
 */
export function describeBoardFlowNarrative(board: BoardState): string {
  const { chips, reachable, errorMessage } = getNarrativeFlowChips(board);

  if (errorMessage === 'empty') {
    return '아직 칩이 없어요. 오른쪽 팔레트에서 칩을 끌어다 놓고, 선으로 이어 보세요.';
  }
  if (errorMessage === 'no_start') {
    return '맨 앞에 둘 시작 칩(예: 텍스트 입력)이 없어요. 입력 쪽 칩을 하나 두고 연결해 주세요.';
  }
  if (errorMessage === 'no_reachable') {
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

/** 연결 설명 패널용: 흐름 설명 + 할 수 있는 일(같은 도달 칩 기준). */
export function describeBoardFlowAndCapability(board: BoardState): { flow: string; capability: string } {
  const { chips, errorMessage } = getNarrativeFlowChips(board);

  if (errorMessage === 'empty') {
    return {
      flow: '아직 칩이 없어요. 오른쪽 팔레트에서 칩을 끌어다 놓고, 선으로 이어 보세요.',
      capability: '칩을 배치하고 연결하면, 여기에 “이 구조로 할 수 있는 일”이 자동으로 채워집니다.',
    };
  }
  if (errorMessage === 'no_start') {
    return {
      flow: '맨 앞에 둘 시작 칩(예: 텍스트 입력)이 없어요. 입력 쪽 칩을 하나 두고 연결해 주세요.',
      capability: '시작 칩이 있어야 어떤 작업을 할 수 있는지 요약할 수 있어요.',
    };
  }
  if (errorMessage === 'no_reachable') {
    return {
      flow: '시작 칩에서 이어지는 흐름이 비어 있어요. 출력 쪽까지 선을 이어 주세요.',
      capability: '시작에서 끝까지 이어지면, 그 경로에 맞춰 할 수 있는 일을 적어 드립니다.',
    };
  }

  const flow = describeBoardFlowNarrative(board);
  const capability = describeBoardCapabilityNarrative(chips);
  return { flow, capability };
}

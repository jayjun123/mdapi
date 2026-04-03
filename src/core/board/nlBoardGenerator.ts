import type { BoardState, ChipPortRef, XYPosition } from './boardTypes';
import { cloneBoard, createBoardChipInstance } from './boardTypes';
import { getChipDefinition } from './chipDefinitions';
import { inferNewEdge, validateConnection } from './connectionRules';

export type NlFlowKind =
  | 'kids_illustration'
  | 'translate'
  | 'research'
  | 'ollama'
  | 'copilot'
  | 'grok'
  | 'gemini'
  | 'claude'
  | 'chatgpt'
  | 'generic';

const FLOW_LABELS: Record<NlFlowKind, string> = {
  kids_illustration: '동화·그림 요약(유아·어린이용 일러스트 컨셉 + 문서)',
  translate: '번역',
  research: '출처 중심 조사(Perplexity 스타일)',
  ollama: '로컬 실행(Ollama)',
  copilot: '업무 문서(M365 Copilot 스타일)',
  grok: '실시간·최신 이슈(Grok 스타일)',
  gemini: '멀티모달·긴 맥락(Gemini 스타일)',
  claude: '문서 완성도(Claude 스타일)',
  chatgpt: '범용(ChatGPT 스타일)',
  generic: '범용(ChatGPT 스타일)',
};

export function describeNlFlowKind(kind: NlFlowKind): string {
  return FLOW_LABELS[kind];
}

export function detectNlFlowKind(text: string): NlFlowKind {
  const t = text.trim();
  if (!t) return 'generic';

  if (/번역|translate|영어로|일본어로|중국어로|한글로|스페인어|프랑스어로/i.test(t)) {
    return 'translate';
  }
  if (/출처|근거|인용|citation|perplexity|팩트체크|검색해서 답|시장조사/i.test(t)) {
    return 'research';
  }
  if (/ollama|올라마|로컬\s*llm|내\s*pc|내\s*컴퓨터|클라우드\s*안/i.test(t)) {
    return 'ollama';
  }
  if (/copilot|코파일럿|엑셀|아웃룩|팀즈|365|마이크로소프트\s*365|m365/i.test(t)) {
    return 'copilot';
  }
  if (/\bgrok\b|지록|xai|엑스에이아이/i.test(t)) {
    return 'grok';
  }
  if (/gemini|지메니|딥\s*리서치|백만\s*토큰|긴\s*문서\s*한\s*번에/i.test(t)) {
    return 'gemini';
  }
  if (/claude|클로드|아티팩트/i.test(t)) {
    return 'claude';
  }
  if (/\bchatgpt\b|\bgpt\b|오픈\s*ai|openai/i.test(t)) {
    return 'chatgpt';
  }

  const hasVisual = /그림|일러스트|삽화|그려|이미지|illustrat/i.test(t);
  const hasKidStory =
    /아이|어린이|유아|키즈|동화|책|신데렐라|재밌|좋아할|그림책/i.test(t);
  if ((hasVisual && hasKidStory) || (/(신데렐라|동화)/.test(t) && /(요약|그림|일러스트)/.test(t))) {
    return 'kids_illustration';
  }

  return 'generic';
}

function computeAnchor(board: BoardState): XYPosition {
  if (board.chips.length === 0) {
    return { x: 72, y: 140 };
  }
  let maxRight = 0;
  let minY = Infinity;
  for (const c of board.chips) {
    const w = c.width ?? 160;
    maxRight = Math.max(maxRight, c.position.x + w);
    minY = Math.min(minY, c.position.y);
  }
  if (!Number.isFinite(minY)) minY = 140;
  return { x: maxRight + 72, y: minY };
}

function safeConnect(board: BoardState, from: ChipPortRef, to: ChipPortRef): void {
  const v = validateConnection(board, from, to);
  if (!v.ok) return;
  const edge = inferNewEdge(board, from, to);
  if (!edge) return;
  board.edges.push(edge);
}

type ChipSpec = {
  type: string;
  name?: string;
  config?: Record<string, unknown>;
};

function appendChipRow(board: BoardState, anchor: XYPosition, specs: ChipSpec[]): string[] {
  const base = `nl_${Date.now()}`;
  const ids: string[] = [];
  let x = anchor.x;
  const y = anchor.y;
  const gap = 40;

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i]!;
    const def = getChipDefinition(spec.type);
    if (!def) continue;
    const id = `${base}_${spec.type}_${i}`;
    const chip = createBoardChipInstance({
      id,
      definition: def,
      position: { x, y },
      name: spec.name,
      config: spec.config,
    });
    board.chips.push(chip);
    ids.push(id);
    x += (chip.width ?? 160) + gap;
  }
  return ids;
}

export type AppendNlFlowResult = {
  board: BoardState;
  message: string;
  flowKind: NlFlowKind;
  newChipIds: string[];
};

export function appendNaturalLanguageFlow(board: BoardState, userPrompt: string): AppendNlFlowResult {
  const trimmed = userPrompt.trim();
  const flowKind = detectNlFlowKind(trimmed);
  const next = cloneBoard(board);
  const anchor = computeAnchor(next);

  const kidsTemplate =
    '아래는 사용자가 구어체로 적은 요청입니다. 유아·초등 저학년이 좋아할 만한 그림(색, 분위기, 장면별 묘사)과 이야기 핵심 요약(3~5문장)을 한국어로 작성하는 지시문을 완성하세요.\n\n요청:\n{{userInput}}';

  const researchTemplate =
    '웹 검색을 전제로, 출처 번호가 붙은 형태의 답변 초안을 한국어로 작성하세요.\n\n질문:\n{{userInput}}';

  const copilotTemplate =
    'Microsoft 365 업무 맥락(메일·문서·표)을 가정하고, 바로 업무에 쓸 수 있는 초안을 한국어로 작성하세요.\n\n요청:\n{{userInput}}';

  const grokTemplate =
    '실시간 웹 정보를 참고한다는 전제로, 최신성이 중요한 질문에 답하는 초안을 한국어로 작성하세요.\n\n질문:\n{{userInput}}';

  let specs: ChipSpec[] = [];
  let connections: Array<{ fromIdIdx: number; fromPort: string; toIdIdx: number; toPort: string }> = [];

  if (flowKind === 'translate') {
    specs = [
      { type: 'text_input', name: '말로 적은 요청', config: { defaultText: trimmed, label: '입력' } },
      { type: 'translator', name: '번역', config: { targetLang: '영어' } },
      { type: 'result_panel', name: '결과', config: { title: '번역 결과' } },
    ];
    connections = [
      { fromIdIdx: 0, fromPort: 'out', toIdIdx: 1, toPort: 'text' },
      { fromIdIdx: 1, fromPort: 'out', toIdIdx: 2, toPort: 'in' },
    ];
  } else if (flowKind === 'research') {
    specs = [
      { type: 'text_input', name: '질문', config: { defaultText: trimmed, label: '입력' } },
      { type: 'prompt_builder', name: '조사용 프롬프트', config: { template: researchTemplate } },
      { type: 'ai_perplexity', name: 'Perplexity 스타일' },
      { type: 'result_panel', name: '결과', config: { title: '출처형 답' } },
    ];
    connections = [
      { fromIdIdx: 0, fromPort: 'out', toIdIdx: 1, toPort: 'userInput' },
      { fromIdIdx: 1, fromPort: 'prompt', toIdIdx: 2, toPort: 'prompt' },
      { fromIdIdx: 2, fromPort: 'answer', toIdIdx: 3, toPort: 'in' },
    ];
  } else if (flowKind === 'ollama') {
    specs = [
      { type: 'text_input', name: '입력', config: { defaultText: trimmed, label: '입력' } },
      { type: 'prompt_builder', name: '프롬프트', config: { template: '{{userInput}}' } },
      { type: 'ai_ollama', name: 'Ollama(로컬)' },
      { type: 'result_panel', name: '결과', config: { title: '로컬 응답' } },
    ];
    connections = [
      { fromIdIdx: 0, fromPort: 'out', toIdIdx: 1, toPort: 'userInput' },
      { fromIdIdx: 1, fromPort: 'prompt', toIdIdx: 2, toPort: 'prompt' },
      { fromIdIdx: 2, fromPort: 'answer', toIdIdx: 3, toPort: 'in' },
    ];
  } else if (flowKind === 'copilot') {
    specs = [
      { type: 'text_input', name: '업무 요청', config: { defaultText: trimmed, label: '입력' } },
      { type: 'prompt_builder', name: '업무 프롬프트', config: { template: copilotTemplate } },
      { type: 'ai_copilot', name: 'Copilot 스타일' },
      {
        type: 'document_generator',
        name: '문서 초안',
        config: { title: '업무 초안', format: 'markdown' },
      },
      { type: 'result_panel', name: '결과', config: { title: '문서 미리보기' } },
    ];
    connections = [
      { fromIdIdx: 0, fromPort: 'out', toIdIdx: 1, toPort: 'userInput' },
      { fromIdIdx: 1, fromPort: 'prompt', toIdIdx: 2, toPort: 'prompt' },
      { fromIdIdx: 2, fromPort: 'answer', toIdIdx: 3, toPort: 'content' },
      { fromIdIdx: 3, fromPort: 'doc', toIdIdx: 4, toPort: 'in' },
    ];
  } else if (flowKind === 'grok') {
    specs = [
      { type: 'text_input', name: '질문', config: { defaultText: trimmed, label: '입력' } },
      { type: 'prompt_builder', name: '실시간 질의', config: { template: grokTemplate } },
      { type: 'ai_grok', name: 'Grok 스타일' },
      { type: 'result_panel', name: '결과', config: { title: '최신성 위주 답' } },
    ];
    connections = [
      { fromIdIdx: 0, fromPort: 'out', toIdIdx: 1, toPort: 'userInput' },
      { fromIdIdx: 1, fromPort: 'prompt', toIdIdx: 2, toPort: 'prompt' },
      { fromIdIdx: 2, fromPort: 'answer', toIdIdx: 3, toPort: 'in' },
    ];
  } else if (flowKind === 'gemini') {
    specs = [
      { type: 'text_input', name: '자료·질문', config: { defaultText: trimmed, label: '입력' } },
      { type: 'prompt_builder', name: '긴 맥락 프롬프트', config: { template: '{{userInput}}' } },
      { type: 'ai_gemini', name: 'Gemini 스타일' },
      { type: 'result_panel', name: '결과', config: { title: '멀티모달·긴 맥락' } },
    ];
    connections = [
      { fromIdIdx: 0, fromPort: 'out', toIdIdx: 1, toPort: 'userInput' },
      { fromIdIdx: 1, fromPort: 'prompt', toIdIdx: 2, toPort: 'prompt' },
      { fromIdIdx: 2, fromPort: 'answer', toIdIdx: 3, toPort: 'in' },
    ];
  } else if (flowKind === 'claude') {
    specs = [
      { type: 'text_input', name: '원문·지시', config: { defaultText: trimmed, label: '입력' } },
      {
        type: 'prompt_builder',
        name: '문서용 프롬프트',
        config: {
          template:
            '아래 내용을 바탕으로 보고서·기획서에 넣기 좋은 정리된 글을 한국어로 작성하세요.\n\n{{userInput}}',
        },
      },
      { type: 'ai_claude', name: 'Claude 스타일' },
      {
        type: 'document_generator',
        name: '문서',
        config: { title: '정리 문서', format: 'markdown' },
      },
      { type: 'result_panel', name: '결과', config: { title: '문서 보기' } },
    ];
    connections = [
      { fromIdIdx: 0, fromPort: 'out', toIdIdx: 1, toPort: 'userInput' },
      { fromIdIdx: 1, fromPort: 'prompt', toIdIdx: 2, toPort: 'prompt' },
      { fromIdIdx: 2, fromPort: 'answer', toIdIdx: 3, toPort: 'content' },
      { fromIdIdx: 3, fromPort: 'doc', toIdIdx: 4, toPort: 'in' },
    ];
  } else if (flowKind === 'kids_illustration') {
    specs = [
      { type: 'text_input', name: '말로 적은 요청', config: { defaultText: trimmed, label: '입력' } },
      { type: 'prompt_builder', name: '그림·요약 지시문', config: { template: kidsTemplate } },
      { type: 'ai_gemini', name: 'Gemini 스타일(그림 컨셉)' },
      {
        type: 'document_generator',
        name: '동화 요약 문서',
        config: { title: '그림 아이디어 & 요약', format: 'markdown' },
      },
      { type: 'result_panel', name: '미리보기', config: { title: '아이들용 요약' } },
    ];
    connections = [
      { fromIdIdx: 0, fromPort: 'out', toIdIdx: 1, toPort: 'userInput' },
      { fromIdIdx: 1, fromPort: 'prompt', toIdIdx: 2, toPort: 'prompt' },
      { fromIdIdx: 2, fromPort: 'answer', toIdIdx: 3, toPort: 'content' },
      { fromIdIdx: 3, fromPort: 'doc', toIdIdx: 4, toPort: 'in' },
    ];
  } else {
    specs = [
      { type: 'text_input', name: '입력', config: { defaultText: trimmed, label: '입력' } },
      { type: 'prompt_builder', name: '프롬프트', config: { template: '{{userInput}}' } },
      { type: 'ai_chatgpt', name: 'ChatGPT 스타일' },
      { type: 'result_panel', name: '결과', config: { title: '응답' } },
    ];
    connections = [
      { fromIdIdx: 0, fromPort: 'out', toIdIdx: 1, toPort: 'userInput' },
      { fromIdIdx: 1, fromPort: 'prompt', toIdIdx: 2, toPort: 'prompt' },
      { fromIdIdx: 2, fromPort: 'answer', toIdIdx: 3, toPort: 'in' },
    ];
  }

  const newChipIds = appendChipRow(next, anchor, specs);
  if (newChipIds.length !== specs.length) {
    return {
      board: next,
      message: '칩 정의를 불러오지 못했습니다. chipDefinitions를 확인하세요.',
      flowKind,
      newChipIds,
    };
  }

  const idAt = (idx: number) => newChipIds[idx]!;

  for (const c of connections) {
    safeConnect(next, { chipId: idAt(c.fromIdIdx), portId: c.fromPort }, { chipId: idAt(c.toIdIdx), portId: c.toPort });
  }

  const message =
    trimmed.length === 0
      ? '문장이 비어 있어 기본 범용 흐름만 배치했습니다. 텍스트 입력칩에 내용을 적어 주세요.'
      : `「${FLOW_LABELS[flowKind]}」에 맞춰 칩을 이어 붙였습니다. 위치·칩 추가·연결은 자유롭게 바꿀 수 있습니다.`;

  return { board: next, message, flowKind, newChipIds };
}

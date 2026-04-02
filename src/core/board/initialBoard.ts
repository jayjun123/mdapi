import type { BoardEdge, BoardState } from './boardTypes';
import { createBoardChipInstance } from './boardTypes';
import { inferNewEdge, validateConnection } from './connectionRules';
import { getChipDefinition } from './chipDefinitions';

function requireChip(type: string) {
  const definition = getChipDefinition(type);
  if (!definition) {
    throw new Error(`Chip definition not found: ${type}`);
  }
  return definition;
}

function connect(board: BoardState, fromChipId: string, fromPortId: string, toChipId: string, toPortId: string): BoardEdge {
  const result = validateConnection(
    board,
    { chipId: fromChipId, portId: fromPortId },
    { chipId: toChipId, portId: toPortId }
  );

  if (result.level === 'deny' || result.level === 'adapter') {
    throw new Error(`[${result.code}] ${result.message}`);
  }

  const edge = inferNewEdge(
    board,
    { chipId: fromChipId, portId: fromPortId },
    { chipId: toChipId, portId: toPortId }
  );

  if (!edge) {
    throw new Error(`Failed to infer edge: ${fromChipId}.${fromPortId} -> ${toChipId}.${toPortId}`);
  }

  board.edges.push(edge);
  return edge;
}

export function createEmptyBoard(name = '새 보드'): BoardState {
  return {
    id: `board_${Date.now()}`,
    name,
    chips: [],
    edges: [],
    logs: [],
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
    },
    meta: {
      version: 1,
      createdAt: Date.now(),
    },
  };
}

export function createDemoBoard(): BoardState {
  const board = createEmptyBoard('AI 문서 생성 데모');

  const textInput = createBoardChipInstance({
    id: 'chip_text_input_1',
    definition: requireChip('text_input'),
    position: { x: 80, y: 180 },
    config: {
      label: '사용자 질문',
      defaultText: '무드라 밴드를 활용한 AI 인터랙션 아이디어 5개를 정리해줘.',
    },
  });

  const promptBuilder = createBoardChipInstance({
    id: 'chip_prompt_builder_1',
    definition: requireChip('prompt_builder'),
    position: { x: 300, y: 180 },
    config: {
      label: '기획 프롬프트',
      systemPrefix: '너는 제품 기획자다. 간결하고 실행 가능하게 답변해라.',
      template: '다음 요청을 5개의 실행 아이디어로 정리해줘.\n\n요청: {{userInput}}',
    },
  });

  const llmCore = createBoardChipInstance({
    id: 'chip_llm_core_1',
    definition: requireChip('llm_core'),
    position: { x: 560, y: 180 },
    config: {
      label: 'LLM 코어',
      model: 'mock-gpt',
      temperature: 0.3,
      maxTokens: 700,
    },
  });

  const documentGenerator = createBoardChipInstance({
    id: 'chip_document_generator_1',
    definition: requireChip('document_generator'),
    position: { x: 840, y: 180 },
    config: {
      label: '문서 생성',
      title: 'Mudra AI Ideas',
      format: 'markdown',
    },
  });

  const resultPanel = createBoardChipInstance({
    id: 'chip_result_panel_1',
    definition: requireChip('result_panel'),
    position: { x: 1120, y: 160 },
    config: {
      label: '결과 패널',
      title: '최종 결과',
      viewMode: 'markdown',
    },
  });

  board.chips.push(textInput, promptBuilder, llmCore, documentGenerator, resultPanel);

  connect(board, 'chip_text_input_1', 'out', 'chip_prompt_builder_1', 'userInput');
  connect(board, 'chip_text_input_1', 'meta', 'chip_llm_core_1', 'context');
  connect(board, 'chip_prompt_builder_1', 'prompt', 'chip_llm_core_1', 'prompt');
  connect(board, 'chip_llm_core_1', 'answer', 'chip_document_generator_1', 'content');
  connect(board, 'chip_llm_core_1', 'structured', 'chip_document_generator_1', 'data');
  connect(board, 'chip_document_generator_1', 'doc', 'chip_result_panel_1', 'in');
  connect(board, 'chip_text_input_1', 'out', 'chip_result_panel_1', 'title');

  return board;
}

export function createRoutingDemoBoard(): BoardState {
  const board = createEmptyBoard('라우팅 데모');

  const inputChip = createBoardChipInstance({
    id: 'chip_text_input_router',
    definition: requireChip('text_input'),
    position: { x: 80, y: 120 },
    config: {
      label: '문의 입력',
      defaultText: '가격과 도입 비용을 알려줘',
    },
  });

  const classifierChip = createBoardChipInstance({
    id: 'chip_classifier_1',
    definition: requireChip('classifier'),
    position: { x: 320, y: 120 },
  });

  const routerChip = createBoardChipInstance({
    id: 'chip_router_1',
    definition: requireChip('router'),
    position: { x: 560, y: 120 },
    config: {
      label: '문의 라우터',
      mapping: {
        general: 'A',
        support: 'B',
        sales: 'C',
      },
    },
  });

  const resultPanel = createBoardChipInstance({
    id: 'chip_result_panel_router',
    definition: requireChip('result_panel'),
    position: { x: 840, y: 100 },
    config: {
      title: '라우팅 결과',
      viewMode: 'json',
    },
  });

  board.chips.push(inputChip, classifierChip, routerChip, resultPanel);

  connect(board, 'chip_text_input_router', 'out', 'chip_classifier_1', 'text');
  connect(board, 'chip_classifier_1', 'label', 'chip_router_1', 'routeKey');
  connect(board, 'chip_text_input_router', 'out', 'chip_router_1', 'in');
  connect(board, 'chip_router_1', 'C', 'chip_result_panel_router', 'in');
  connect(board, 'chip_text_input_router', 'out', 'chip_result_panel_router', 'title');

  return board;
}

export const initialBoard = createDemoBoard();
export const sampleBoards = {
  initialBoard,
  routingBoard: createRoutingDemoBoard(),
};


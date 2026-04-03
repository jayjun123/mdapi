import type {
  BoardChipInstance,
  BoardEdge,
  BoardLogEntry,
  BoardState,
  ChipPortRef,
  ExecutionStatus,
} from './boardTypes';
import {
  cloneBoard,
  createEmptyRuntimeState,
  getChipById,
  getOutgoingEdges,
} from './boardTypes';
import { getReachableChipIds, getStartChipIds, validateBoard } from './validation';

export type PortOutputMap = Record<string, unknown>;
export type ChipOutputRegistry = Record<string, PortOutputMap>;

export type ExecutorExternalInputs = Record<string, unknown>;

export type ExecutorOptions = {
  validateBeforeRun?: boolean;
  continueOnError?: boolean;
  externalInputs?: ExecutorExternalInputs;
  now?: number;
};

export type ChipExecutionContext = {
  board: BoardState;
  chip: BoardChipInstance;
  inputs: PortOutputMap;
  edgeInputs: Array<{
    edge: BoardEdge;
    sourceChipId: string;
    sourcePortId: string;
    targetPortId: string;
    value: unknown;
  }>;
  allOutputs: ChipOutputRegistry;
  options: ExecutorOptions;
  now: number;
};

export type ChipExecutionResult = {
  outputs?: PortOutputMap;
  status?: ExecutionStatus;
  warning?: string;
  error?: string;
};

export type ChipExecutor = (context: ChipExecutionContext) => ChipExecutionResult | Promise<ChipExecutionResult>;

export type ChipExecutionRecord = {
  chipId: string;
  chipType: string;
  status: ExecutionStatus;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  outputs: PortOutputMap;
  warning?: string;
  error?: string;
};

export type BoardExecutionReport = {
  ok: boolean;
  board: BoardState;
  order: string[];
  outputsByChip: ChipOutputRegistry;
  records: ChipExecutionRecord[];
  validation?: ReturnType<typeof validateBoard>;
  finalOutputs: Array<{
    chipId: string;
    chipName: string;
    value: unknown;
  }>;
};

const keywordClassifier = [
  { label: 'support', words: ['error', 'bug', '문의', '도움', '문제', '고장'] },
  { label: 'sales', words: ['price', 'buy', '구매', '가격', '도입', '견적'] },
  { label: 'gesture', words: ['gesture', 'hand', 'mudra', '제스처', '카메라'] },
];

function safeNow(options: ExecutorOptions): number {
  return options.now ?? Date.now();
}

function makeLog(level: 'info' | 'warn' | 'error', message: string, chipId?: string, data?: unknown): BoardLogEntry {
  const ts = Date.now();
  return {
    id: `log_${ts}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: ts,
    level,
    chipId,
    message,
    data,
  };
}

function normalizeText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function firstDefined<T = unknown>(...values: T[]): T | undefined {
  return values.find((value) => value !== undefined);
}

function collectChipInputs(board: BoardState, chipId: string, outputsByChip: ChipOutputRegistry): {
  inputs: PortOutputMap;
  edgeInputs: ChipExecutionContext['edgeInputs'];
} {
  const inputs: PortOutputMap = {};
  const edgeInputs: ChipExecutionContext['edgeInputs'] = [];

  for (const edge of board.edges) {
    if (edge.toChipId !== chipId) continue;
    // 프롬프트 정책: 이벤트선과 데이터선은 분리한다.
    // 입력 데이터 전달은 data edge만 기본 대상으로 한다.
    if (edge.kind === 'event') continue;

    const sourceOutputs = outputsByChip[edge.fromChipId];
    if (!sourceOutputs) continue;

    const value = sourceOutputs[edge.fromPortId];
    if (value === undefined) continue;

    inputs[edge.toPortId] = value;
    edgeInputs.push({
      edge,
      sourceChipId: edge.fromChipId,
      sourcePortId: edge.fromPortId,
      targetPortId: edge.toPortId,
      value,
    });
  }

  return { inputs, edgeInputs };
}

function getTerminalChipIds(board: BoardState): string[] {
  return board.chips
    .filter((chip) => getOutgoingEdges(board, chip.id).length === 0)
    .map((chip) => chip.id);
}

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

function applyOutputsToRuntime(chip: BoardChipInstance, outputs: PortOutputMap, warning?: string): void {
  chip.runtime.lastOutput = outputs;
  chip.runtime.executionStatus = warning ? 'warning' : 'success';
  chip.runtime.ledRun = warning ? 'THINKING' : 'READY';
  chip.runtime.ledValid = 'READY';
  chip.runtime.lastRunAt = Date.now();
  chip.runtime.lastError = warning;
}

function applyErrorToRuntime(chip: BoardChipInstance, errorMessage: string): void {
  chip.runtime.executionStatus = 'error';
  chip.runtime.ledRun = 'ERROR';
  chip.runtime.ledValid = 'ERROR';
  chip.runtime.lastError = errorMessage;
  chip.runtime.lastRunAt = Date.now();
}

function mockAiProviderExecutor(positioningLine: string): ChipExecutor {
  return ({ chip, inputs }) => {
    const prompt = normalizeText(inputs.prompt);
    const context = inputs.context;
    const answer = [
      `### ${chip.config.label ?? chip.name}`,
      '',
      positioningLine,
      '',
      `프롬프트 일부: ${prompt.slice(0, 220)}`,
      context ? '(문맥 JSON이 함께 전달된 것으로 가정합니다.)' : '',
      '',
      '실제 서비스 API를 여기에 연결하면 됩니다. 지금은 mock 실행입니다.',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      outputs: {
        answer,
        structured: {
          provider: chip.config.provider,
          hasContext: Boolean(context),
          promptLength: prompt.length,
          mock: true,
        },
        needTool: /search|find|lookup|검색|찾아|최신|뉴스|perplexity|deep/i.test(prompt),
      },
    };
  };
}

const chipExecutors: Record<string, ChipExecutor> = {
  text_input: ({ chip, options }) => {
    const direct = options.externalInputs?.[chip.id];
    const text = normalizeText(firstDefined(direct, chip.config.defaultText, ''));
    return {
      outputs: {
        out: text,
        meta: {
          source: direct !== undefined ? 'external' : 'config',
          length: text.length,
          label: chip.config.label ?? chip.name,
        },
      },
    };
  },

  prompt_builder: ({ chip, inputs }) => {
    const template = normalizeText(firstDefined(inputs.template, chip.config.template, '{{userInput}}'));
    const userInput = normalizeText(firstDefined(inputs.userInput, ''));
    const vars = typeof inputs.vars === 'object' && inputs.vars !== null ? (inputs.vars as Record<string, unknown>) : {};
    const baseMap: Record<string, string> = {
      userInput,
      ...Object.fromEntries(Object.entries(vars).map(([key, value]) => [key, normalizeText(value)])),
    };

    const rendered = template.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key: string) => baseMap[key] ?? '');
    const systemPrefix = normalizeText(chip.config.systemPrefix ?? '');
    const prompt = systemPrefix ? `${systemPrefix}\n\n${rendered}` : rendered;

    return { outputs: { prompt } };
  },

  llm_core: ({ chip, inputs }) => {
    const prompt = normalizeText(inputs.prompt);
    const context = inputs.context;
    const answer = [
      `### ${chip.config.label ?? chip.name} 응답`,
      '',
      `입력 프롬프트: ${prompt.slice(0, 220)}`,
      '',
      '이 응답은 실제 모델 호출 대신 mock 실행 결과입니다.',
      '프로덕션에서는 여기서 LLM API 또는 자체 추론 엔진을 연결하면 됩니다.',
    ].join('\n');

    return {
      outputs: {
        answer,
        structured: {
          summary: prompt.slice(0, 120),
          hasContext: Boolean(context),
          promptLength: prompt.length,
        },
        needTool: /search|find|lookup|검색|찾아/.test(prompt),
      },
    };
  },

  ai_ollama: mockAiProviderExecutor(
    '로컬 PC에서 오픈 모델을 돌리는 전제입니다. 민감한 데이터를 클라우드로 덜내려는 흐름에 맞춥니다.',
  ),
  ai_chatgpt: mockAiProviderExecutor(
    '범용 챗·문서·분석까지 한곳에서 처리하는 스타일을 가정합니다. 프로젝트·파일 업로드 등은 별도 앱 기능으로 보시면 됩니다.',
  ),
  ai_claude: mockAiProviderExecutor(
    '긴 글 정리·기획 문구·단계적 설명에 강한 스타일을 가정합니다. 문서 초안·아티팩트형 결과물 파이프라인에 붙이기 좋습니다.',
  ),
  ai_gemini: mockAiProviderExecutor(
    '멀티모달·긴 컨텍스트·리서치형 질문을 염두에 둔 스타일입니다. 긴 자료·이미지 설명을 한꺼번에 다루는 흐름에 맞춥니다.',
  ),
  ai_copilot: mockAiProviderExecutor(
    'Word·Excel·Outlook·Teams 같은 업무 앱과 맞물리는 “일용 AI”를 가정합니다. 조직 데이터·권한은 실제 제품에서 처리합니다.',
  ),
  ai_perplexity: mockAiProviderExecutor(
    '웹을 검색해 출처가 달린 답을 주는 스타일을 가정합니다. 시장조사·팩트 확인용 1차 조사에 맞춥니다.',
  ),
  ai_grok: mockAiProviderExecutor(
    '실시간 웹·최신 이슈 탐색에 초점을 둔 스타일을 가정합니다. 트렌드·뉴스형 질문에 맞춥니다.',
  ),

  search_rag: ({ chip, inputs }) => {
    const query = normalizeText(inputs.query);
    const results = query
      ? [
          { title: `${query} - result 1`, snippet: 'mock 검색 결과 1', source: chip.config.source ?? 'mock-web' },
          { title: `${query} - result 2`, snippet: 'mock 검색 결과 2', source: chip.config.source ?? 'mock-web' },
        ]
      : [];

    return {
      outputs: {
        results,
        summary: query ? `검색 요약: ${query} 관련 결과 ${results.length}개` : '검색어가 비어 있습니다.',
        docs: { query, topK: chip.config.topK ?? 5, results },
      },
      warning: query ? undefined : 'query 입력이 없어 빈 검색 결과를 반환했습니다.',
    };
  },

  translator: ({ chip, inputs }) => {
    const text = normalizeText(inputs.text);
    const targetLang = normalizeText(firstDefined(inputs.targetLang, chip.config.targetLang, '영어'));
    const out = text
      ? `(${targetLang}) 번역(모의 결과): ${text}`
      : '(입력 글이 비어 있어 번역할 내용이 없습니다.)';
    return {
      outputs: {
        out,
        meta: {
          targetLang,
          inputLength: text.length,
          mock: true,
        },
      },
    };
  },

  rephraser: ({ chip, inputs }) => {
    const text = normalizeText(inputs.text);
    const style = normalizeText(firstDefined(inputs.style, chip.config.style, '더 자연스럽게'));
    const out = text
      ? `(${style}) 다시 쓴 문장(모의 결과): ${text}`
      : '(입력 문장이 비어 있습니다.)';
    return {
      outputs: {
        out,
        meta: { style, inputLength: text.length, mock: true },
      },
    };
  },

  question_answer: ({ chip, inputs }) => {
    const question = normalizeText(inputs.question);
    const context = normalizeText(inputs.context);
    const answer = [
      `### ${chip.config.label ?? chip.name} 답변(모의 결과)`,
      '',
      context ? `- 문맥(참고 자료): ${context.slice(0, 220)}\n` : '- 문맥: (없음)\n',
      `- 질문: ${question.slice(0, 220)}`,
      '',
      '이 답변은 실제 모델 호출 대신 mock 결과입니다. (프로덕션에서는 LLM API로 연결하세요.)',
    ].join('\n');
    return {
      outputs: {
        answer,
        meta: { hasContext: Boolean(context), questionLength: question.length, mock: true },
      },
    };
  },

  classifier: ({ chip, inputs }) => {
    const text = normalizeText(firstDefined(inputs.text, inputs.json, inputs.image, ''));
    const lowered = text.toLowerCase();
    const matched = keywordClassifier.find((rule) => rule.words.some((word) => lowered.includes(word.toLowerCase())));
    const classes = chip.config.classes;
    const firstClass =
      Array.isArray(classes) && typeof classes[0] === 'string' ? classes[0] : undefined;
    const label = matched?.label ?? firstClass ?? 'general';
    const score = matched ? 0.91 : 0.6;

    return {
      outputs: {
        label,
        score,
        result: { label, score, raw: text.slice(0, 200) },
      },
    };
  },

  router: ({ chip, inputs }) => {
    const routeKey = normalizeText(inputs.routeKey);
    const mapping = (chip.config.mapping ?? {}) as Record<string, string>;
    const route = mapping[routeKey] ?? 'default';
    const payload = inputs.in;

    return {
      outputs: {
        A: route === 'A' ? payload : undefined,
        B: route === 'B' ? payload : undefined,
        C: route === 'C' ? payload : undefined,
        default: route === 'default' ? payload : undefined,
      },
    };
  },

  document_generator: ({ chip, inputs }) => {
    const content = normalizeText(firstDefined(inputs.content, inputs.data, ''));
    const title = normalizeText(chip.config.title ?? 'Generated Document');
    const format = normalizeText(chip.config.format ?? 'markdown');
    const doc = `# ${title}\n\n${content}`;

    return {
      outputs: {
        doc,
        file: `memory://${title.toLowerCase().replace(/\s+/g, '-')}.${format === 'markdown' ? 'md' : 'txt'}`,
        meta: { title, format, length: doc.length },
      },
    };
  },

  result_panel: ({ chip, inputs }) => ({
    outputs: {
      display: firstDefined(inputs.in, inputs.title, null),
      meta: {
        title: firstDefined(inputs.title, chip.config.title, chip.name),
        viewMode: chip.config.viewMode ?? 'auto',
      },
    },
  }),

  number_input: ({ chip }) => {
    const v = chip.config.value;
    const n = typeof v === 'number' && !Number.isNaN(v) ? v : Number(v) || 0;
    return { outputs: { out: n } };
  },

  boolean_input: ({ chip }) => ({
    outputs: { out: Boolean(chip.config.value) },
  }),

  json_input: ({ chip }) => ({
    outputs: {
      data:
        typeof chip.config.payload === 'object' && chip.config.payload !== null
          ? chip.config.payload
          : { raw: chip.config.payload },
    },
  }),

  url_input: ({ chip }) => {
    const href = normalizeText(chip.config.defaultUrl ?? 'https://example.com');
    return { outputs: { url: href, asText: href } };
  },

  color_picker_input: ({ chip }) => {
    const hex = normalizeText(chip.config.hex ?? '#64748b');
    return {
      outputs: {
        hex,
        meta: { hex, label: chip.config.label ?? 'color' },
      },
    };
  },

  summarizer: ({ chip, inputs }) => {
    const text = normalizeText(inputs.text);
    const max = typeof chip.config.maxSentences === 'number' ? chip.config.maxSentences : 3;
    const sentences = text.split(/[.!?]\s+/).filter(Boolean).slice(0, max);
    const summary = sentences.length ? sentences.join('. ') + (sentences.length ? '.' : '') : text.slice(0, 240);
    const bullets = sentences.length ? sentences : [text.slice(0, 120) || '(빈 텍스트)'];
    return {
      outputs: {
        summary,
        bullets,
        meta: { length: text.length, sentences: sentences.length },
      },
    };
  },

  sentiment: ({ chip, inputs }) => {
    const text = normalizeText(inputs.text).toLowerCase();
    const pos = ['좋', '굿', 'happy', 'great', 'love', '최고'];
    const neg = ['나쁨', '별로', 'bad', 'hate', '실망', '최악'];
    const p = pos.some((w) => text.includes(w));
    const n = neg.some((w) => text.includes(w));
    const label = p ? 'positive' : n ? 'negative' : 'neutral';
    const score = p ? 0.82 : n ? 0.18 : 0.5;
    return {
      outputs: {
        label,
        score,
        detail: { label, score, locale: chip.config.locale ?? 'ko', sample: text.slice(0, 160) },
      },
    };
  },

  keyword_extract: ({ inputs, chip }) => {
    const text = normalizeText(inputs.text);
    const minLen = typeof chip.config.minLength === 'number' ? chip.config.minLength : 2;
    const words = text.split(/\s+/).filter((w) => w.length >= minLen);
    const uniq = [...new Set(words)];
    return {
      outputs: {
        keywords: uniq.slice(0, 24),
        hits: { count: uniq.length, tokens: uniq.slice(0, 12) },
      },
    };
  },

  embedding_stub: ({ chip, inputs }) => {
    const text = normalizeText(inputs.text);
    const dim = typeof chip.config.dim === 'number' ? Math.min(32, Math.max(2, chip.config.dim)) : 8;
    const vec = Array.from({ length: dim }, (_, i) => {
      const c = text.charCodeAt(i % text.length) || 32;
      return Math.round((Math.sin(c + i) * 0.5 + 0.5) * 1000) / 1000;
    });
    return { outputs: { vector: vec, dims: dim } };
  },

  list_first: ({ inputs }) => {
    const items = inputs.items;
    const list = Array.isArray(items) ? items : [];
    const first = list[0];
    return { outputs: { first: first ?? null, empty: list.length === 0 } };
  },

  bool_not: ({ inputs }) => {
    const v = inputs.in;
    const b = typeof v === 'boolean' ? v : Boolean(v);
    return { outputs: { out: !b } };
  },

  json_merge: ({ inputs }) => {
    const a = typeof inputs.a === 'object' && inputs.a !== null ? (inputs.a as Record<string, unknown>) : {};
    const b = typeof inputs.b === 'object' && inputs.b !== null ? (inputs.b as Record<string, unknown>) : {};
    return { outputs: { merged: { ...a, ...b } } };
  },

  regex_match: ({ chip, inputs }) => {
    const text = normalizeText(inputs.text);
    const raw = normalizeText(chip.config.pattern ?? '.*');
    let matches: string[] = [];
    let ok = false;
    try {
      const re = new RegExp(raw, 'g');
      matches = text.match(re) ?? [];
      ok = matches.length > 0;
    } catch {
      matches = [];
    }
    return { outputs: { matches, ok } };
  },

  http_mock: ({ chip, inputs }) => {
    const path = normalizeText(inputs.path);
    const body = inputs.body;
    return {
      outputs: {
        response: {
          ok: true,
          mock: true,
          path: path || '/',
          echo: body ?? null,
          label: chip.config.label ?? 'mock',
        },
        status: 200,
      },
    };
  },

  csv_serializer: ({ chip, inputs }) => {
    const rows = inputs.rows;
    const arr = Array.isArray(rows) ? rows : [];
    const delim = normalizeText(chip.config.delimiter ?? ',') || ',';
    const lines: string[] = [];
    if (arr.length) {
      const first = arr[0];
      if (typeof first === 'object' && first !== null) {
        const keys = Object.keys(first as object);
        lines.push(keys.join(delim));
        for (const row of arr) {
          const o = row as Record<string, unknown>;
          lines.push(keys.map((k) => normalizeText(o[k])).join(delim));
        }
      } else {
        lines.push(arr.map((v) => normalizeText(v)).join(delim));
      }
    }
    const csv = lines.join('\n');
    return { outputs: { csv, lines: lines.length } };
  },

  markdown_table: ({ chip, inputs }) => {
    const rows = inputs.rows;
    const arr = Array.isArray(rows) ? rows : [];
    const header = Boolean(chip.config.hasHeader ?? true);
    const lines: string[] = [];
    if (arr.length === 0) {
      return { outputs: { md: '(빈 표)' } };
    }
    const firstRow = arr[0];
    if (Array.isArray(firstRow)) {
      const cols = firstRow.length;
      if (header && arr.length > 1) {
        lines.push(`| ${(firstRow as unknown[]).map((c) => normalizeText(c)).join(' | ')} |`);
        lines.push(`| ${Array(cols).fill('---').join(' | ')} |`);
        for (let i = 1; i < arr.length; i++) {
          const r = arr[i] as unknown[];
          lines.push(`| ${r.map((c) => normalizeText(c)).join(' | ')} |`);
        }
      } else {
        for (const r of arr) {
          const row = r as unknown[];
          lines.push(`| ${row.map((c) => normalizeText(c)).join(' | ')} |`);
        }
      }
    } else {
      lines.push('| 값 |');
      lines.push('| --- |');
      for (const r of arr) {
        lines.push(`| ${normalizeText(r)} |`);
      }
    }
    return { outputs: { md: lines.join('\n') } };
  },

  note_output: ({ chip, inputs }) => ({
    outputs: {
      saved: firstDefined(inputs.in, inputs.title, ''),
      title: firstDefined(inputs.title, chip.config.title, chip.name),
    },
  }),

  compare_text: ({ inputs }) => {
    const a = normalizeText(inputs.a);
    const b = normalizeText(inputs.b);
    const equal = a === b;
    const distance = levenshtein(a, b);
    return { outputs: { equal, distance } };
  },
};

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j] + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[m]![n]!;
}

export function registerChipExecutor(type: string, executor: ChipExecutor): void {
  chipExecutors[type] = executor;
}

export function getChipExecutor(type: string): ChipExecutor | undefined {
  return chipExecutors[type];
}

export function createExecutionSnapshot(board: BoardState): BoardState {
  const cloned = cloneBoard(board);
  cloned.logs = [];

  for (const chip of cloned.chips) {
    chip.runtime = createEmptyRuntimeState();
  }

  return cloned;
}

export async function executeChip(
  board: BoardState,
  chipId: string,
  outputsByChip: ChipOutputRegistry,
  options: ExecutorOptions = {}
): Promise<ChipExecutionRecord> {
  const chip = getChipById(board, chipId);
  if (!chip) {
    throw new Error(`Chip not found: ${chipId}`);
  }

  const now = safeNow(options);
  const startedAt = Date.now();
  chip.runtime.executionStatus = 'running';
  chip.runtime.ledRun = 'RUNNING';
  chip.runtime.ledValid = 'READY';

  const { inputs, edgeInputs } = collectChipInputs(board, chipId, outputsByChip);
  chip.runtime.lastInput = inputs;

  const executor = getChipExecutor(chip.type);
  if (!executor) {
    const warningMessage = `실행기 미구현 칩입니다: ${chip.type}`;
    chip.runtime.executionStatus = 'warning';
    chip.runtime.ledRun = 'THINKING';
    chip.runtime.lastError = warningMessage;

    return {
      chipId: chip.id,
      chipType: chip.type,
      status: 'warning',
      startedAt,
      finishedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      outputs: {},
      warning: warningMessage,
    };
  }

  try {
    const result = await executor({
      board,
      chip,
      inputs,
      edgeInputs,
      allOutputs: outputsByChip,
      options,
      now,
    });

    const outputs = result.outputs ?? {};
    outputsByChip[chip.id] = outputs;
    applyOutputsToRuntime(chip, outputs, result.warning);

    return {
      chipId: chip.id,
      chipType: chip.type,
      status: result.status ?? (result.warning ? 'warning' : 'success'),
      startedAt,
      finishedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      outputs,
      warning: result.warning,
      error: result.error,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown execution error';
    applyErrorToRuntime(chip, message);
    throw error;
  }
}

export async function executeBoard(board: BoardState, options: ExecutorOptions = {}): Promise<BoardExecutionReport> {
  const runtimeBoard = createExecutionSnapshot(board);
  const validation = options.validateBeforeRun === false ? undefined : validateBoard(runtimeBoard);

  if (validation && !validation.ok && !options.continueOnError) {
    runtimeBoard.logs.push(makeLog('error', '보드 검증 실패로 실행을 중단했습니다.', undefined, validation.errors));
    return {
      ok: false,
      board: runtimeBoard,
      order: [],
      outputsByChip: {},
      records: [],
      validation,
      finalOutputs: [],
    };
  }

  // 프롬프트 정책: 시작칩에서 시작해 도달 가능한 경로만 실행한다.
  const startChipIds = getStartChipIds(runtimeBoard);
  const reachable = startChipIds.length > 0 ? getReachableChipIds(runtimeBoard, startChipIds) : new Set<string>();

  const order = getTopologicalOrder(runtimeBoard).filter((chipId) => reachable.has(chipId));
  const outputsByChip: ChipOutputRegistry = {};
  const records: ChipExecutionRecord[] = [];

  for (const chipId of order) {
    const chip = getChipById(runtimeBoard, chipId);
    if (!chip || chip.flags.disabled) continue;

    try {
      const record = await executeChip(runtimeBoard, chipId, outputsByChip, options);
      records.push(record);

      if (record.warning) {
        runtimeBoard.logs.push(makeLog('warn', record.warning, chipId, record.outputs));
      } else {
        runtimeBoard.logs.push(makeLog('info', `${chip.name} 실행 완료`, chipId, record.outputs));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown execution error';
      runtimeBoard.logs.push(makeLog('error', message, chipId));
      records.push({
        chipId,
        chipType: chip.type,
        status: 'error',
        startedAt: Date.now(),
        finishedAt: Date.now(),
        durationMs: 0,
        outputs: {},
        error: message,
      });

      if (!options.continueOnError) {
        return {
          ok: false,
          board: runtimeBoard,
          order,
          outputsByChip,
          records,
          validation,
          finalOutputs: [],
        };
      }
    }
  }

  const terminalChipIds = getTerminalChipIds(runtimeBoard).filter((chipId) => reachable.has(chipId));
  const finalOutputs = terminalChipIds.map((chipId) => {
    const chip = getChipById(runtimeBoard, chipId)!;
    const outputs = outputsByChip[chipId] ?? {};
    const value = firstDefined(outputs.display, outputs.doc, outputs.answer, outputs.out, outputs.result, outputs);
    return {
      chipId,
      chipName: chip.name,
      value,
    };
  });

  return {
    ok: records.every((record) => record.status !== 'error'),
    board: runtimeBoard,
    order,
    outputsByChip,
    records,
    validation,
    finalOutputs,
  };
}

export function getChipOutput(outputsByChip: ChipOutputRegistry, chipId: string, portId: string): unknown {
  return outputsByChip[chipId]?.[portId];
}

export function getConnectedTargetRefs(board: BoardState, from: ChipPortRef): ChipPortRef[] {
  return board.edges
    .filter((edge) => edge.fromChipId === from.chipId && edge.fromPortId === from.portId)
    .map((edge) => ({ chipId: edge.toChipId, portId: edge.toPortId }));
}

export function summarizeExecution(report: BoardExecutionReport): string[] {
  const lines: string[] = [];
  lines.push(report.ok ? '실행 성공' : '실행 실패');
  lines.push(`실행 칩 수: ${report.records.length}`);

  if (report.validation) {
    lines.push(`검증 오류: ${report.validation.errors.length}개`);
    lines.push(`검증 경고: ${report.validation.warnings.length}개`);
  }

  if (report.finalOutputs.length > 0) {
    lines.push(`최종 출력 수: ${report.finalOutputs.length}`);
  }

  return lines;
}


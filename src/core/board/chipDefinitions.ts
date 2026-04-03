export type PortType =
  | 'EVT'
  | 'TXT'
  | 'NUM'
  | 'BOOL'
  | 'JSON'
  | 'LIST'
  | 'FILE'
  | 'IMG'
  | 'AUD'
  | 'URL'
  | 'CODE'
  | 'DOC'
  | 'ANY';

export type PortDirection = 'INPUT' | 'OUTPUT';
export type PortPlacement = 'top' | 'left' | 'right' | 'bottom';
export type ChipCategory = 'input' | 'ai' | 'logic' | 'action' | 'output';
export type ChipSize = 'S' | 'M' | 'L' | 'XL';

export type ChipPortDefinition = {
  id: string;
  name: string;
  type: PortType;
  direction: PortDirection;
  required?: boolean;
  multi?: boolean;
  accepts?: PortType[];
  placement?: PortPlacement;
  description?: string;
};

export type ChipDefinition = {
  type: string;
  name: string;
  category: ChipCategory;
  size: ChipSize;
  description: string;
  icon: string;
  executable: boolean;
  defaultConfig: Record<string, unknown>;
  ports: ChipPortDefinition[];
  tags?: string[];
};

const input = (
  id: string,
  name: string,
  type: PortType,
  placement: PortPlacement = 'left',
  options: Partial<ChipPortDefinition> = {}
): ChipPortDefinition => ({
  id,
  name,
  type,
  direction: 'INPUT',
  placement,
  required: false,
  multi: false,
  ...options,
});

const output = (
  id: string,
  name: string,
  type: PortType,
  placement: PortPlacement = 'right',
  options: Partial<ChipPortDefinition> = {}
): ChipPortDefinition => ({
  id,
  name,
  type,
  direction: 'OUTPUT',
  placement,
  required: false,
  multi: true,
  ...options,
});

export const chipDefinitions: ChipDefinition[] = [
  {
    type: 'text_input',
    name: '텍스트 입력칩',
    category: 'input',
    size: 'M',
    description:
      '사람이 직접 글을 적는 칩입니다. 질문·지시·메모를 넣으면 그 내용이 이어진 다음 칩들로 전달됩니다.',
    icon: 'Keyboard',
    executable: true,
    defaultConfig: {
      label: '입력',
      placeholder: '질문이나 명령을 입력하세요',
      defaultText: '',
    },
    ports: [
      input('reset', 'EVT.reset', 'EVT', 'top', { description: '적어 둔 글을 지우라는 신호' }),
      output('out', 'TXT.out', 'TXT', 'right', { description: '적어 둔 글 전체' }),
      output('meta', 'JSON.meta', 'JSON', 'right', { description: '언제 썼는지 등 부가 정보' }),
    ],
    tags: ['starter', 'text', 'mvp'],
  },
  {
    type: 'file_input',
    name: '파일 입력칩',
    category: 'input',
    size: 'M',
    description:
      '컴퓨터에 있는 파일을 고르면 그 파일이 다음 단계로 넘어갑니다. 보고서·사진·표 파일 등을 붙일 때 씁니다.',
    icon: 'FileUp',
    executable: false,
    defaultConfig: {
      label: '파일',
      accept: ['.pdf', '.docx', '.txt', '.csv', '.png', '.jpg'],
    },
    ports: [
      input('open', 'EVT.open', 'EVT', 'top'),
      output('file', 'FILE.out', 'FILE'),
      output('preview', 'TXT.preview', 'TXT'),
      output('info', 'JSON.fileInfo', 'JSON'),
    ],
    tags: ['file', 'upload'],
  },
  {
    type: 'camera_input',
    name: '카메라 입력칩',
    category: 'input',
    size: 'L',
    description:
      '웹캠이나 카메라로 찍은 화면(사진 한 장씩)을 받아 다음 칩으로 넘깁니다. 얼굴·물건 인식 전에 씁니다.',
    icon: 'Camera',
    executable: false,
    defaultConfig: {
      label: '카메라',
      deviceId: '',
      resolution: '1280x720',
    },
    ports: [
      input('start', 'EVT.start', 'EVT', 'top'),
      input('stop', 'EVT.stop', 'EVT', 'top'),
      output('frame', 'IMG.frame', 'IMG'),
      output('state', 'JSON.cameraState', 'JSON'),
    ],
    tags: ['vision', 'stream'],
  },
  {
    type: 'audio_input',
    name: '음성 입력칩',
    category: 'input',
    size: 'M',
    description:
      '마이크로 말하거나 녹음한 소리를 다음 칩으로 넘깁니다. 음성을 글로 바꾸거나 분석할 때 앞에 둡니다.',
    icon: 'Mic',
    executable: false,
    defaultConfig: {
      label: '마이크',
      sampleRate: 16000,
    },
    ports: [
      input('record', 'EVT.record', 'EVT', 'top'),
      input('stop', 'EVT.stop', 'EVT', 'top'),
      output('audio', 'AUD.out', 'AUD'),
      output('meta', 'JSON.audioMeta', 'JSON'),
    ],
    tags: ['audio', 'speech'],
  },
  {
    type: 'webhook_input',
    name: '웹훅 입력칩',
    category: 'input',
    size: 'M',
    description:
      '다른 웹사이트나 프로그램이 “지금 일어났어요”라고 보낸 알림을 받아, 그때부터 이 보드의 흐름을 시작하게 합니다.',
    icon: 'Webhook',
    executable: false,
    defaultConfig: {
      label: 'Webhook',
      path: '/api/webhook/demo',
      method: 'POST',
    },
    ports: [
      output('trigger', 'EVT.trigger', 'EVT'),
      output('payload', 'JSON.payload', 'JSON'),
      output('attachment', 'FILE.attachment', 'FILE'),
    ],
    tags: ['event', 'integration'],
  },
  {
    type: 'prompt_builder',
    name: '프롬프트 빌더칩',
    category: 'ai',
    size: 'L',
    description:
      '여러 칩에서 온 글·자료를 한 덩어리 “질문/지시문”으로 묶습니다. AI 칩에 넣기 좋게 문장을 완성할 때 씁니다.',
    icon: 'MessageSquareCode',
    executable: true,
    defaultConfig: {
      label: 'Prompt',
      template: '{{userInput}}',
      systemPrefix: '',
    },
    ports: [
      input('build', 'EVT.build', 'EVT', 'top'),
      input('template', 'TXT.template', 'TXT', 'left'),
      input('vars', 'JSON.vars', 'JSON', 'left'),
      input('userInput', 'TXT.userInput', 'TXT', 'left', { required: true }),
      output('prompt', 'TXT.prompt', 'TXT', 'right'),
    ],
    tags: ['mvp', 'prompt'],
  },
  {
    type: 'llm_core',
    name: 'LLM 코어칩',
    category: 'ai',
    size: 'XL',
    description:
      '묶인 질문이나 지시를 받아 AI가 답변·설명·요약 같은 글을 만듭니다. 이 보드에서 “생각해서 답하는” 핵심 칩입니다.',
    icon: 'BrainCircuit',
    executable: true,
    defaultConfig: {
      label: 'LLM',
      model: 'mock-gpt',
      temperature: 0.4,
      maxTokens: 512,
    },
    ports: [
      input('run', 'EVT.run', 'EVT', 'top'),
      input('prompt', 'TXT.prompt', 'TXT', 'left', { required: true }),
      input('context', 'JSON.context', 'JSON', 'left'),
      input('config', 'JSON.modelConfig', 'JSON', 'left'),
      output('answer', 'TXT.answer', 'TXT', 'right'),
      output('structured', 'JSON.structured', 'JSON', 'right'),
      output('needTool', 'BOOL.needTool', 'BOOL', 'right'),
    ],
    tags: ['mvp', 'ai', 'core'],
  },
  {
    type: 'search_rag',
    name: '검색/RAG 칩',
    category: 'ai',
    size: 'L',
    description:
      '질문과 관련된 글이나 문서를 찾아 곁들여 줍니다. AI가 빈둥대지 않고 자료를 보며 답하게 만들 때 씁니다.',
    icon: 'SearchCode',
    executable: true,
    defaultConfig: {
      label: 'Search',
      source: 'mock-web',
      topK: 5,
    },
    ports: [
      input('search', 'EVT.search', 'EVT', 'top'),
      input('query', 'TXT.query', 'TXT', 'left', { required: true }),
      input('source', 'URL.source', 'URL', 'left'),
      output('results', 'LIST.results', 'LIST', 'right'),
      output('summary', 'TXT.summary', 'TXT', 'right'),
      output('docs', 'JSON.docs', 'JSON', 'right'),
    ],
    tags: ['mvp', 'search', 'rag'],
  },
  {
    type: 'memory',
    name: '메모리칩',
    category: 'ai',
    size: 'M',
    description:
      '대화나 중간 결과를 잠깐 저장해 두었다가, 뒤에 오는 칩에서 다시 꺼내 쓰게 합니다. “아까 말한 것 기억해”에 가깝습니다.',
    icon: 'MemoryStick',
    executable: false,
    defaultConfig: {
      label: 'Memory',
      namespace: 'default',
    },
    ports: [
      input('save', 'EVT.save', 'EVT', 'top'),
      input('note', 'TXT.note', 'TXT', 'left'),
      input('memoryIn', 'JSON.memoryIn', 'JSON', 'left'),
      output('recall', 'TXT.recall', 'TXT', 'right'),
      output('memoryOut', 'JSON.memoryOut', 'JSON', 'right'),
    ],
    tags: ['memory', 'state'],
  },
  {
    type: 'vision_analysis',
    name: '비전 분석칩',
    category: 'ai',
    size: 'L',
    description:
      '사진·스크린샷이 무엇인지 말로 설명하거나, 안에 있는 물건·글자를 짚어 줍니다. 카메라 입력 뒤에 두면 좋습니다.',
    icon: 'ScanEye',
    executable: false,
    defaultConfig: {
      label: 'Vision',
      mode: 'caption',
    },
    ports: [
      input('scan', 'EVT.scan', 'EVT', 'top'),
      input('image', 'IMG.in', 'IMG', 'left', { required: true }),
      input('instruction', 'TXT.instruction', 'TXT', 'left'),
      output('caption', 'TXT.caption', 'TXT', 'right'),
      output('objects', 'JSON.objects', 'JSON', 'right'),
      output('detected', 'BOOL.detected', 'BOOL', 'right'),
    ],
    tags: ['vision', 'image'],
  },
  {
    type: 'code_forge',
    name: '코드 포지칩',
    category: 'ai',
    size: 'XL',
    description:
      '하고 싶은 기능을 평범한 말로 쓰면, 프로그램 코드 초안을 만들어 줍니다. 직접 코딩하기 전 아이디어 확인용으로 씁니다.',
    icon: 'CodeXml',
    executable: false,
    defaultConfig: {
      label: 'Code Forge',
      targetRuntime: 'typescript',
      strictMode: true,
    },
    ports: [
      input('build', 'EVT.build', 'EVT', 'top'),
      input('spec', 'TXT.spec', 'TXT', 'left', { required: true }),
      input('schema', 'JSON.schema', 'JSON', 'left'),
      output('code', 'CODE.out', 'CODE', 'right'),
      output('manifest', 'JSON.manifest', 'JSON', 'right'),
      output('readme', 'TXT.readme', 'TXT', 'right'),
    ],
    tags: ['generate', 'future'],
  },
  {
    type: 'classifier',
    name: '분류기칩',
    category: 'logic',
    size: 'M',
    description:
      '글·그림·자료를 보고 “상담/판매/일반”처럼 종류를 나눕니다. 뒤에서 길을 갈라 보낼 때 앞에 두면 편합니다.',
    icon: 'Tags',
    executable: true,
    defaultConfig: {
      label: 'Classifier',
      mode: 'keyword',
      classes: ['general', 'support', 'sales'],
    },
    ports: [
      input('classify', 'EVT.classify', 'EVT', 'top'),
      input('text', 'TXT.in', 'TXT', 'left'),
      input('image', 'IMG.in', 'IMG', 'left'),
      input('json', 'JSON.in', 'JSON', 'left'),
      output('label', 'TXT.label', 'TXT', 'right'),
      output('score', 'NUM.score', 'NUM', 'right'),
      output('result', 'JSON.result', 'JSON', 'right'),
    ],
    tags: ['mvp', 'logic'],
  },
  {
    type: 'condition_branch',
    name: '조건 분기칩',
    category: 'logic',
    size: 'S',
    description:
      '조건이 맞으면(켜짐) 한 줄로, 아니면(꺼짐) 다른 줄로 데이터를 보냅니다. “만약 ~이면 이렇게”를 만드는 칩입니다.',
    icon: 'GitBranch',
    executable: false,
    defaultConfig: {
      label: 'If',
    },
    ports: [
      input('if', 'BOOL.if', 'BOOL', 'left', { required: true }),
      input('in', 'ANY.in', 'ANY', 'left'),
      output('true', 'ANY.true', 'ANY', 'right'),
      output('false', 'ANY.false', 'ANY', 'right'),
    ],
    tags: ['branch'],
  },
  {
    type: 'router',
    name: '라우터칩',
    category: 'logic',
    size: 'M',
    description:
      '붙은 이름이나 분류 결과(예: general, support)에 따라 A·B·C·기본 네 갈래 중 한 줄로만 보냅니다.',
    icon: 'Route',
    executable: true,
    defaultConfig: {
      label: 'Router',
      mapping: {
        general: 'A',
        support: 'B',
        sales: 'C',
      },
    },
    ports: [
      input('routeKey', 'TXT.routeKey', 'TXT', 'left', { required: true }),
      input('in', 'ANY.in', 'ANY', 'left'),
      output('A', 'ANY.A', 'ANY', 'right'),
      output('B', 'ANY.B', 'ANY', 'right'),
      output('C', 'ANY.C', 'ANY', 'right'),
      output('default', 'ANY.default', 'ANY', 'right'),
    ],
    tags: ['mvp', 'routing'],
  },
  {
    type: 'loop',
    name: '반복 실행칩',
    category: 'logic',
    size: 'M',
    description:
      '여러 개가 들어 있는 목록을 한 개씩 순서대로 꺼내 다음 칩으로 넘깁니다. 같은 작업을 목록 전체에 반복할 때 씁니다.',
    icon: 'Repeat',
    executable: false,
    defaultConfig: {
      label: 'Loop',
      concurrency: 1,
    },
    ports: [
      input('run', 'EVT.run', 'EVT', 'top'),
      input('items', 'LIST.items', 'LIST', 'left', { required: true }),
      output('each', 'JSON.each', 'JSON', 'right'),
      output('out', 'LIST.out', 'LIST', 'right'),
      output('count', 'NUM.count', 'NUM', 'right'),
    ],
    tags: ['iteration'],
  },
  {
    type: 'merge',
    name: '병합칩',
    category: 'logic',
    size: 'S',
    description:
      '서로 다른 칩에서 온 입력 여러 개를 하나의 덩어리로 합칩니다. 나중 칩이 한 번에 받게 정리할 때 씁니다.',
    icon: 'Merge',
    executable: false,
    defaultConfig: {
      label: 'Merge',
      mode: 'json',
    },
    ports: [
      input('in1', 'ANY.in1', 'ANY', 'left'),
      input('in2', 'ANY.in2', 'ANY', 'left'),
      input('in3', 'ANY.in3', 'ANY', 'bottom'),
      output('merged', 'JSON.merged', 'JSON', 'right'),
      output('joined', 'TXT.joined', 'TXT', 'right'),
    ],
    tags: ['combine'],
  },
  {
    type: 'api_connector',
    name: 'API 커넥터칩',
    category: 'action',
    size: 'L',
    description:
      '정해진 인터넷 주소(서비스)에 “이 데이터로 요청해 주세요”라고 보내고, 돌아온 결과를 다음 칩으로 넘깁니다.',
    icon: 'PlugZap',
    executable: false,
    defaultConfig: {
      label: 'API',
      endpoint: '',
      method: 'POST',
      authRequired: false,
      authToken: '',
    },
    ports: [
      input('call', 'EVT.call', 'EVT', 'top'),
      input('endpoint', 'URL.endpoint', 'URL', 'left'),
      input('payload', 'JSON.payload', 'JSON', 'left'),
      input('auth', 'TXT.auth', 'TXT', 'left'),
      output('response', 'JSON.response', 'JSON', 'right'),
      output('raw', 'TXT.raw', 'TXT', 'right'),
      output('status', 'NUM.status', 'NUM', 'right'),
    ],
    tags: ['integration', 'http'],
  },
  {
    type: 'db_rw',
    name: 'DB 읽기/쓰기칩',
    category: 'action',
    size: 'L',
    description:
      '데이터 저장소(자료 창고)에서 정보를 읽어 오거나, 새 정보를 저장합니다. 회원 목록·기록 조회 같은 데 씁니다.',
    icon: 'Database',
    executable: false,
    defaultConfig: {
      label: 'DB',
      mode: 'read',
      connectionId: '',
    },
    ports: [
      input('exec', 'EVT.exec', 'EVT', 'top'),
      input('query', 'TXT.query', 'TXT', 'left'),
      input('record', 'JSON.record', 'JSON', 'left'),
      output('rows', 'LIST.rows', 'LIST', 'right'),
      output('result', 'JSON.result', 'JSON', 'right'),
      output('success', 'BOOL.success', 'BOOL', 'right'),
    ],
    tags: ['database', 'storage'],
  },
  {
    type: 'document_generator',
    name: '문서 생성칩',
    category: 'action',
    size: 'L',
    description:
      '넣은 글과 표 형태 자료를 보기 좋은 문서 한 편으로 만듭니다. 보고서 초안·웹에 올리기 좋은 글 형태로 쓸 수 있습니다.',
    icon: 'FileText',
    executable: true,
    defaultConfig: {
      label: 'Document',
      format: 'markdown',
      title: 'Generated Document',
    },
    ports: [
      input('generate', 'EVT.generate', 'EVT', 'top'),
      input('content', 'TXT.content', 'TXT', 'left'),
      input('data', 'JSON.data', 'JSON', 'left'),
      input('template', 'TXT.template', 'TXT', 'left'),
      output('doc', 'DOC.out', 'DOC', 'right'),
      output('file', 'URL.file', 'URL', 'right'),
      output('meta', 'JSON.meta', 'JSON', 'right'),
    ],
    tags: ['mvp', 'document'],
  },
  {
    type: 'result_panel',
    name: '결과 패널칩',
    category: 'output',
    size: 'XL',
    description:
      '흐름 맨 끝에서 최종 결과를 크게 화면에 보여 줍니다. 글·표·문서가 들어오면 사람이 읽기 좋게 정리해 둡니다.',
    icon: 'PanelRightOpen',
    executable: true,
    defaultConfig: {
      label: 'Result',
      viewMode: 'auto',
      title: '결과',
    },
    ports: [
      input('refresh', 'EVT.refresh', 'EVT', 'top'),
      input('in', 'ANY.in', 'ANY', 'left', {
        required: true,
        accepts: ['TXT', 'JSON', 'LIST', 'DOC', 'ANY'],
      }),
      input('title', 'TXT.title', 'TXT', 'left'),
    ],
    tags: ['mvp', 'output', 'terminal'],
  },
  {
    type: 'number_input',
    name: '숫자 입력칩',
    category: 'input',
    size: 'S',
    description:
      '숫자를 입력하거나 슬라이더로 고르면 그 값이 다음 칩으로 넘어갑니다. 개수·비율·온도 같은 값을 넣을 때 씁니다.',
    icon: 'Hash',
    executable: true,
    defaultConfig: { label: '값', value: 42, min: 0, max: 1000, step: 1 },
    ports: [
      input('reset', 'EVT.reset', 'EVT', 'top'),
      output('out', 'NUM.out', 'NUM', 'right', { description: '지금 설정된 숫자' }),
    ],
    tags: ['numeric', 'form'],
  },
  {
    type: 'boolean_input',
    name: '켜기/끄기 입력칩',
    category: 'input',
    size: 'S',
    description:
      '켜짐/꺼짐 스위치 값을 다음 칩으로 넘깁니다. 조건 분기칩과 이어 “맞을 때만 실행”을 만들 때 씁니다.',
    icon: 'ToggleLeft',
    executable: true,
    defaultConfig: { label: '스위치', value: false },
    ports: [
      input('flip', 'EVT.flip', 'EVT', 'top'),
      output('out', 'BOOL.out', 'BOOL', 'right'),
    ],
    tags: ['bool', 'form'],
  },
  {
    type: 'json_input',
    name: '표 데이터(JSON) 입력칩',
    category: 'input',
    size: 'M',
    description:
      '여러 항목이 표·목록처럼 묶인 자료를 통째로 다음 칩으로 넘깁니다. 앱이나 다른 도구에서 보낸 구조화된 데이터를 받을 때 씁니다.',
    icon: 'Braces',
    executable: true,
    defaultConfig: { label: '페이로드', payload: { version: 1, items: [] } },
    ports: [
      input('reload', 'EVT.reload', 'EVT', 'top'),
      output('data', 'JSON.data', 'JSON', 'right'),
    ],
    tags: ['json', 'data'],
  },
  {
    type: 'url_input',
    name: 'URL 입력칩',
    category: 'input',
    size: 'S',
    description:
      '웹사이트 주소(링크)를 적어 두면 그 주소가 다음 칩으로 넘어갑니다. 검색·페이지 불러오기 전에 주소를 고정할 때 씁니다.',
    icon: 'Link2',
    executable: true,
    defaultConfig: { label: 'URL', defaultUrl: 'https://example.com' },
    ports: [
      output('url', 'URL.out', 'URL', 'right', { description: '링크로 쓰는 주소' }),
      output('asText', 'TXT.href', 'TXT', 'right', { description: '그대로 복사해 쓸 수 있는 주소 글자' }),
    ],
    tags: ['url', 'web'],
  },
  {
    type: 'color_picker_input',
    name: '색 입력칩',
    category: 'input',
    size: 'S',
    description:
      '색상 팔레트에서 고른 색을 다음 칩으로 넘깁니다. 배경색·강조색처럼 글자나 설정값으로 쓸 수 있습니다.',
    icon: 'Palette',
    executable: true,
    defaultConfig: { label: '색', hex: '#38bdf8' },
    ports: [
      output('hex', 'TXT.hex', 'TXT', 'right'),
      output('meta', 'JSON.color', 'JSON', 'right'),
    ],
    tags: ['ui', 'design'],
  },
  {
    type: 'translator',
    name: '번역칩',
    category: 'ai',
    size: 'M',
    description:
      '입력 글을 다른 언어로 바꿉니다. (지금은 연습용 mock이라 결과는 형식만 흉내 냅니다.)',
    icon: 'Languages',
    executable: true,
    defaultConfig: { label: 'Translator', targetLang: '영어' },
    ports: [
      input('text', 'TXT.in', 'TXT', 'left', { required: true }),
      input('targetLang', 'TXT.lang', 'TXT', 'left'),
      output('out', 'TXT.out', 'TXT', 'right'),
      output('meta', 'JSON.meta', 'JSON', 'right'),
    ],
    tags: ['nlp', 'translate'],
  },
  {
    type: 'rephraser',
    name: '문장 다듬기칩',
    category: 'ai',
    size: 'M',
    description:
      '문장을 더 자연스럽게 다시 씁니다. (지금은 연습용 mock이라 결과는 형식만 흉내 냅니다.)',
    icon: 'Wand2',
    executable: true,
    defaultConfig: { label: 'Rephraser', style: '더 자연스럽게' },
    ports: [
      input('text', 'TXT.in', 'TXT', 'left', { required: true }),
      input('style', 'TXT.style', 'TXT', 'left'),
      output('out', 'TXT.out', 'TXT', 'right'),
      output('meta', 'JSON.meta', 'JSON', 'right'),
    ],
    tags: ['nlp', 'rewrite'],
  },
  {
    type: 'question_answer',
    name: '질문답변칩',
    category: 'ai',
    size: 'M',
    description:
      '질문을 받아 답을 만들어 냅니다. 앞에서 가져온 자료(문맥)를 같이 넣을 수 있습니다.',
    icon: 'CircleHelp',
    executable: true,
    defaultConfig: { label: 'Q&A' },
    ports: [
      input('question', 'TXT.question', 'TXT', 'left', { required: true }),
      input('context', 'TXT.context', 'TXT', 'left'),
      output('answer', 'TXT.answer', 'TXT', 'right'),
      output('meta', 'JSON.meta', 'JSON', 'right'),
    ],
    tags: ['qa', 'nlp'],
  },
  {
    type: 'ai_ollama',
    name: 'Ollama(로컬) 칩',
    category: 'ai',
    size: 'L',
    description:
      '내 PC에서 오픈 모델을 돌리는 흐름을 가정합니다. 민감한 글이 클라우드로 안 나가게 할 때 쓰기 좋다는 뜻으로 배치해 두었고, 지금은 mock 응답입니다.',
    icon: 'CP',
    executable: true,
    defaultConfig: { label: 'Ollama', provider: 'ollama', modelPreset: 'local-open', temperature: 0.4, maxTokens: 512 },
    ports: [
      input('run', 'EVT.run', 'EVT', 'top'),
      input('prompt', 'TXT.prompt', 'TXT', 'left', { required: true }),
      input('context', 'JSON.context', 'JSON', 'left'),
      input('config', 'JSON.modelConfig', 'JSON', 'left'),
      output('answer', 'TXT.answer', 'TXT', 'right'),
      output('structured', 'JSON.structured', 'JSON', 'right'),
      output('needTool', 'BOOL.needTool', 'BOOL', 'right'),
    ],
    tags: ['ai', 'provider', 'local'],
  },
  {
    type: 'ai_chatgpt',
    name: 'ChatGPT 스타일 칩',
    category: 'ai',
    size: 'L',
    description:
      '범용 질의응답·글쓰기·분석까지 한 서비스에서 처리하는 느낌을 담은 칩입니다. 실제 OpenAI 연동은 별도 API 설정이 필요하며, 지금은 mock입니다.',
    icon: 'CH',
    executable: true,
    defaultConfig: { label: 'ChatGPT', provider: 'openai', modelPreset: 'gpt-mock', temperature: 0.4, maxTokens: 512 },
    ports: [
      input('run', 'EVT.run', 'EVT', 'top'),
      input('prompt', 'TXT.prompt', 'TXT', 'left', { required: true }),
      input('context', 'JSON.context', 'JSON', 'left'),
      input('config', 'JSON.modelConfig', 'JSON', 'left'),
      output('answer', 'TXT.answer', 'TXT', 'right'),
      output('structured', 'JSON.structured', 'JSON', 'right'),
      output('needTool', 'BOOL.needTool', 'BOOL', 'right'),
    ],
    tags: ['ai', 'provider', 'cloud'],
  },
  {
    type: 'ai_claude',
    name: 'Claude 스타일 칩',
    category: 'ai',
    size: 'L',
    description:
      '긴 문서 정리·기획 문구·단계적 사고에 강한 흐름을 가정합니다. 아티팩트나 문서 초안 파이프라인 앞뒤에 두기 좋고, 지금은 mock입니다.',
    icon: 'CL',
    executable: true,
    defaultConfig: { label: 'Claude', provider: 'anthropic', modelPreset: 'claude-mock', temperature: 0.4, maxTokens: 512 },
    ports: [
      input('run', 'EVT.run', 'EVT', 'top'),
      input('prompt', 'TXT.prompt', 'TXT', 'left', { required: true }),
      input('context', 'JSON.context', 'JSON', 'left'),
      input('config', 'JSON.modelConfig', 'JSON', 'left'),
      output('answer', 'TXT.answer', 'TXT', 'right'),
      output('structured', 'JSON.structured', 'JSON', 'right'),
      output('needTool', 'BOOL.needTool', 'BOOL', 'right'),
    ],
    tags: ['ai', 'provider', 'document'],
  },
  {
    type: 'ai_gemini',
    name: 'Gemini 스타일 칩',
    category: 'ai',
    size: 'L',
    description:
      '멀티모달·긴 컨텍스트·리서치형 작업을 염두에 둔 칩입니다. 긴 자료·이미지 설명을 한 번에 다루는 흐름에 붙이기 좋고, 지금은 mock입니다.',
    icon: 'GM',
    executable: true,
    defaultConfig: { label: 'Gemini', provider: 'google', modelPreset: 'gemini-mock', temperature: 0.4, maxTokens: 512 },
    ports: [
      input('run', 'EVT.run', 'EVT', 'top'),
      input('prompt', 'TXT.prompt', 'TXT', 'left', { required: true }),
      input('context', 'JSON.context', 'JSON', 'left'),
      input('config', 'JSON.modelConfig', 'JSON', 'left'),
      output('answer', 'TXT.answer', 'TXT', 'right'),
      output('structured', 'JSON.structured', 'JSON', 'right'),
      output('needTool', 'BOOL.needTool', 'BOOL', 'right'),
    ],
    tags: ['ai', 'provider', 'multimodal'],
  },
  {
    type: 'ai_copilot',
    name: 'M365 Copilot 스타일 칩',
    category: 'ai',
    size: 'L',
    description:
      'Word·Excel·Teams 등 업무 앱과 맞물리는 “일용 AI”를 가정합니다. 메일 초안·표 정리 같은 회사 업무 흐름에 붙이기 좋고, 지금은 mock입니다.',
    icon: 'MS',
    executable: true,
    defaultConfig: { label: 'Copilot', provider: 'microsoft', modelPreset: 'm365-mock', temperature: 0.3, maxTokens: 512 },
    ports: [
      input('run', 'EVT.run', 'EVT', 'top'),
      input('prompt', 'TXT.prompt', 'TXT', 'left', { required: true }),
      input('context', 'JSON.context', 'JSON', 'left'),
      input('config', 'JSON.modelConfig', 'JSON', 'left'),
      output('answer', 'TXT.answer', 'TXT', 'right'),
      output('structured', 'JSON.structured', 'JSON', 'right'),
      output('needTool', 'BOOL.needTool', 'BOOL', 'right'),
    ],
    tags: ['ai', 'provider', 'work'],
  },
  {
    type: 'ai_perplexity',
    name: 'Perplexity 스타일 칩',
    category: 'ai',
    size: 'L',
    description:
      '검색과 답변 사이: 출처를 붙인 요약 답을 기대할 때 쓰는 칩입니다. 시장조사·팩트 확인용 파이프라인에 두기 좋고, 지금은 mock입니다.',
    icon: 'PP',
    executable: true,
    defaultConfig: { label: 'Perplexity', provider: 'perplexity', modelPreset: 'search-mock', temperature: 0.2, maxTokens: 512 },
    ports: [
      input('run', 'EVT.run', 'EVT', 'top'),
      input('prompt', 'TXT.prompt', 'TXT', 'left', { required: true }),
      input('context', 'JSON.context', 'JSON', 'left'),
      input('config', 'JSON.modelConfig', 'JSON', 'left'),
      output('answer', 'TXT.answer', 'TXT', 'right'),
      output('structured', 'JSON.structured', 'JSON', 'right'),
      output('needTool', 'BOOL.needTool', 'BOOL', 'right'),
    ],
    tags: ['ai', 'provider', 'search'],
  },
  {
    type: 'ai_grok',
    name: 'Grok 스타일 칩',
    category: 'ai',
    size: 'L',
    description:
      '실시간 웹·최신 이슈 탐색에 초점을 둔 흐름을 가정합니다. 뉴스·트렌드 질문을 빠르게 훑을 때 붙이기 좋고, 지금은 mock입니다.',
    icon: 'GK',
    executable: true,
    defaultConfig: { label: 'Grok', provider: 'xai', modelPreset: 'grok-mock', temperature: 0.5, maxTokens: 512 },
    ports: [
      input('run', 'EVT.run', 'EVT', 'top'),
      input('prompt', 'TXT.prompt', 'TXT', 'left', { required: true }),
      input('context', 'JSON.context', 'JSON', 'left'),
      input('config', 'JSON.modelConfig', 'JSON', 'left'),
      output('answer', 'TXT.answer', 'TXT', 'right'),
      output('structured', 'JSON.structured', 'JSON', 'right'),
      output('needTool', 'BOOL.needTool', 'BOOL', 'right'),
    ],
    tags: ['ai', 'provider', 'realtime'],
  },
  {
    type: 'summarizer',
    name: '요약칩',
    category: 'ai',
    size: 'M',
    description:
      '긴 글을 짧은 요약으로 줄이거나, 핵심 문장만 뽑아 줍니다. 보고서·채팅 로그를 빠르게 훑을 때 씁니다.',
    icon: 'Shrink',
    executable: true,
    defaultConfig: { label: '요약', maxSentences: 3 },
    ports: [
      input('run', 'EVT.run', 'EVT', 'top'),
      input('text', 'TXT.in', 'TXT', 'left', { required: true }),
      output('summary', 'TXT.summary', 'TXT', 'right'),
      output('bullets', 'LIST.bullets', 'LIST', 'right'),
      output('meta', 'JSON.meta', 'JSON', 'right'),
    ],
    tags: ['nlp', 'summary'],
  },
  {
    type: 'sentiment',
    name: '감성 분석칩',
    category: 'ai',
    size: 'M',
    description:
      '문장 분위기가 긍정적인지 부정적인지 대략 나누어 줍니다. 고객 의견·후기를 빠르게 가늠할 때 씁니다.',
    icon: 'Smile',
    executable: true,
    defaultConfig: { label: '감성', locale: 'ko' },
    ports: [
      input('analyze', 'EVT.analyze', 'EVT', 'top'),
      input('text', 'TXT.in', 'TXT', 'left', { required: true }),
      output('label', 'TXT.label', 'TXT', 'right'),
      output('score', 'NUM.score', 'NUM', 'right'),
      output('detail', 'JSON.detail', 'JSON', 'right'),
    ],
    tags: ['nlp', 'sentiment'],
  },
  {
    type: 'keyword_extract',
    name: '키워드 추출칩',
    category: 'ai',
    size: 'M',
    description:
      '긴 글에서 핵심이 될 만한 단어만 골라 목록으로 줍니다. 검색어·태그를 자동으로 뽑을 때 씁니다.',
    icon: 'Highlighter',
    executable: true,
    defaultConfig: { label: '키워드', minLength: 2 },
    ports: [
      input('extract', 'EVT.extract', 'EVT', 'top'),
      input('text', 'TXT.in', 'TXT', 'left', { required: true }),
      output('keywords', 'LIST.keywords', 'LIST', 'right'),
      output('hits', 'JSON.hits', 'JSON', 'right'),
    ],
    tags: ['nlp', 'keywords'],
  },
  {
    type: 'embedding_stub',
    name: '임베딩(스텁)칩',
    category: 'ai',
    size: 'L',
    description:
      '글을 컴퓨터가 비교·검색하기 쉬운 숫자 목록처럼 바꿉니다. 지금은 연습용 가짜 변환이며, 나중에 실제 검색 엔진과 연결할 수 있습니다.',
    icon: 'Axis3D',
    executable: true,
    defaultConfig: { label: '임베딩', dim: 8 },
    ports: [
      input('encode', 'EVT.encode', 'EVT', 'top'),
      input('text', 'TXT.in', 'TXT', 'left', { required: true }),
      output('vector', 'JSON.vector', 'JSON', 'right'),
      output('dims', 'NUM.dims', 'NUM', 'right'),
    ],
    tags: ['embedding', 'vector'],
  },
  {
    type: 'list_first',
    name: '리스트 첫 요소칩',
    category: 'logic',
    size: 'S',
    description:
      '여러 개가 들어 있는 목록에서 첫 번째 항목만 떼어 넘깁니다. 목록이 비었는지 여부도 함께 알려 줍니다.',
    icon: 'ListStart',
    executable: true,
    defaultConfig: { label: 'head' },
    ports: [
      input('take', 'EVT.take', 'EVT', 'top'),
      input('items', 'LIST.items', 'LIST', 'left', { required: true }),
      output('first', 'JSON.first', 'JSON', 'right'),
      output('empty', 'BOOL.empty', 'BOOL', 'right'),
    ],
    tags: ['list', 'util'],
  },
  {
    type: 'bool_not',
    name: 'NOT 게이트칩',
    category: 'logic',
    size: 'S',
    description:
      '켜짐을 꺼짐으로, 꺼짐을 켜짐으로 바꿉니다. 조건을 한 번 뒤집어 “아닐 때만” 실행하고 싶을 때 씁니다.',
    icon: 'CircleSlash',
    executable: true,
    defaultConfig: { label: 'NOT' },
    ports: [
      input('in', 'BOOL.in', 'BOOL', 'left', { required: true }),
      output('out', 'BOOL.out', 'BOOL', 'right'),
    ],
    tags: ['gate', 'bool'],
  },
  {
    type: 'json_merge',
    name: 'JSON 병합칩',
    category: 'logic',
    size: 'M',
    description:
      '두 덩어리의 표 형태 자료를 하나로 합칩니다. 같은 이름이 겹치면 나중에 이어진 쪽 값이 우선합니다.',
    icon: 'Combine',
    executable: true,
    defaultConfig: { label: 'merge', deep: false },
    ports: [
      input('a', 'JSON.a', 'JSON', 'left'),
      input('b', 'JSON.b', 'JSON', 'left'),
      output('merged', 'JSON.out', 'JSON', 'right'),
    ],
    tags: ['json', 'transform'],
  },
  {
    type: 'regex_match',
    name: '정규식 매칭칩',
    category: 'logic',
    size: 'M',
    description:
      '미리 정한 글자 패턴(예: 숫자만, 이메일 모양)에 맞는 부분만 찾아 줍니다. 형식 검사·추출에 씁니다.',
    icon: 'Regex',
    executable: true,
    defaultConfig: { label: 'Regex', pattern: '\\d+' },
    ports: [
      input('match', 'EVT.match', 'EVT', 'top'),
      input('text', 'TXT.in', 'TXT', 'left', { required: true }),
      output('matches', 'LIST.matches', 'LIST', 'right'),
      output('ok', 'BOOL.matched', 'BOOL', 'right'),
    ],
    tags: ['text', 'regex'],
  },
  {
    type: 'http_mock',
    name: 'HTTP Mock칩',
    category: 'action',
    size: 'M',
    description:
      '진짜 인터넷 서버 없이도 미리 정해 둔 가짜 답을 돌려 줍니다. 배선이 맞는지 시험할 때 씁니다.',
    icon: 'Globe',
    executable: true,
    defaultConfig: { label: 'Mock API', latencyMs: 0 },
    ports: [
      input('call', 'EVT.call', 'EVT', 'top'),
      input('path', 'TXT.path', 'TXT', 'left'),
      input('body', 'JSON.body', 'JSON', 'left'),
      output('response', 'JSON.response', 'JSON', 'right'),
      output('status', 'NUM.status', 'NUM', 'right'),
    ],
    tags: ['http', 'mock'],
  },
  {
    type: 'csv_serializer',
    name: 'CSV 직렬화칩',
    category: 'action',
    size: 'M',
    description:
      '표 형태 데이터를 엑셀·스프레드시트에 붙여 넣기 좋은 쉼표로 이어진 글자로 바꿉니다.',
    icon: 'Table',
    executable: true,
    defaultConfig: { label: 'CSV', delimiter: ',' },
    ports: [
      input('serialize', 'EVT.serialize', 'EVT', 'top'),
      input('rows', 'LIST.rows', 'LIST', 'left', { required: true }),
      output('csv', 'TXT.csv', 'TXT', 'right'),
      output('lines', 'NUM.lines', 'NUM', 'right'),
    ],
    tags: ['csv', 'export'],
  },
  {
    type: 'markdown_table',
    name: '마크다운 표칩',
    category: 'action',
    size: 'M',
    description:
      '표 데이터를 문서에 넣기 쉬운 “칸이 있는 표 모양 글”로 바꿉니다. 블로그·메모 앱에 붙일 때 편합니다.',
    icon: 'Table2',
    executable: true,
    defaultConfig: { label: '표', hasHeader: true },
    ports: [
      input('build', 'EVT.build', 'EVT', 'top'),
      input('rows', 'LIST.rows', 'LIST', 'left', { required: true }),
      output('md', 'TXT.markdown', 'TXT', 'right'),
    ],
    tags: ['markdown', 'table'],
  },
  {
    type: 'note_output',
    name: '메모 출력칩',
    category: 'output',
    size: 'M',
    description:
      '중간 확인용 메모나 짧은 기록을 화면에 남깁니다. 큰 결과 패널 없이도 “여기까지 왔다”를 보여 줄 때 씁니다.',
    icon: 'StickyNote',
    executable: true,
    defaultConfig: { label: '메모', pinned: false },
    ports: [
      input('in', 'TXT.note', 'TXT', 'left', { required: true }),
      input('title', 'TXT.title', 'TXT', 'left'),
    ],
    tags: ['memo', 'output'],
  },
  {
    type: 'compare_text',
    name: '텍스트 비교칩',
    category: 'logic',
    size: 'S',
    description:
      '두 문장이 완전히 같은지 다른지 가립니다. 철자가 얼마나 다른지(거리)도 숫자로 알려 줄 수 있습니다.',
    icon: 'Equal',
    executable: true,
    defaultConfig: { label: '비교', ignoreCase: false },
    ports: [
      input('a', 'TXT.a', 'TXT', 'left'),
      input('b', 'TXT.b', 'TXT', 'left'),
      output('equal', 'BOOL.equal', 'BOOL', 'right'),
      output('distance', 'NUM.levenshtein', 'NUM', 'right'),
    ],
    tags: ['diff', 'text'],
  },
];

export const chipDefinitionMap = Object.fromEntries(
  chipDefinitions.map((chip) => [chip.type, chip])
) as Record<string, ChipDefinition>;

export const chipCategories: Record<ChipCategory, string> = {
  input: '입력칩',
  ai: 'AI칩',
  logic: '로직칩',
  action: '연결/실행칩',
  output: '출력칩',
};

export function getChipDefinition(type: string): ChipDefinition | undefined {
  return chipDefinitionMap[type];
}

export function getChipDefinitionsByCategory(category: ChipCategory): ChipDefinition[] {
  return chipDefinitions.filter((chip) => chip.category === category);
}


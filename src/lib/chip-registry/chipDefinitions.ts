import type { ChipDefinition } from "@/lib/board/boardTypes";

export const chipDefinitions: ChipDefinition[] = [
  // 입력칩 (5)
  {
    type: "text_input_chip",
    name: "텍스트 입력",
    category: "input",
    size: "M",
    description:
      "사람이 직접 글을 적는 칩입니다. 질문·지시를 넣으면 이어진 다음 칩들로 전달됩니다.",
    icon: "type",
    ports: [
      { id: "out_text", name: "text", type: "TXT", direction: "OUTPUT", placement: "right" },
    ],
    defaultConfig: { value: "" },
    executable: true,
  },
  {
    type: "file_input_chip",
    name: "파일 입력",
    category: "input",
    size: "M",
    description:
      "컴퓨터에서 파일을 고르면 그 파일이 다음 단계로 넘어갑니다. 보고서·사진·표를 붙일 때 씁니다.",
    icon: "file",
    ports: [{ id: "out_file", name: "file", type: "FILE", direction: "OUTPUT", placement: "right" }],
    defaultConfig: {},
    executable: false,
  },
  {
    type: "camera_input_chip",
    name: "카메라 입력",
    category: "input",
    size: "M",
    description:
      "웹캠·카메라로 찍은 화면을 다음 칩으로 넘깁니다. 사진을 분석·설명하기 전에 둡니다.",
    icon: "camera",
    ports: [{ id: "out_img", name: "image", type: "IMG", direction: "OUTPUT", placement: "right" }],
    defaultConfig: {},
    executable: false,
  },
  {
    type: "voice_input_chip",
    name: "음성 입력",
    category: "input",
    size: "M",
    description:
      "마이크로 말하거나 녹음한 소리를 다음 칩으로 넘깁니다. 음성을 글로 바꾸거나 분석할 때 앞에 둡니다.",
    icon: "mic",
    ports: [{ id: "out_aud", name: "audio", type: "AUD", direction: "OUTPUT", placement: "right" }],
    defaultConfig: {},
    executable: false,
  },
  {
    type: "webhook_input_chip",
    name: "웹훅 입력",
    category: "input",
    size: "M",
    description:
      "다른 웹·프로그램이 보낸 알림으로 흐름을 시작합니다. “지금 일어났어요” 신호를 받는 입구입니다.",
    icon: "webhook",
    ports: [
      { id: "out_evt", name: "evt", type: "EVT", direction: "OUTPUT", placement: "right" },
      { id: "out_json", name: "payload", type: "JSON", direction: "OUTPUT", placement: "right" },
    ],
    defaultConfig: {},
    executable: false,
  },

  // AI칩 (6)
  {
    type: "prompt_builder_chip",
    name: "프롬프트 빌더",
    category: "ai",
    size: "L",
    description:
      "여러 입력을 한 덩어리 질문·지시문으로 묶습니다. AI 칩에 넣기 좋게 문장을 완성할 때 씁니다.",
    icon: "sparkles",
    ports: [
      { id: "in_text", name: "text", type: "TXT", direction: "INPUT", required: true, placement: "left" },
      { id: "out_prompt", name: "prompt", type: "TXT", direction: "OUTPUT", placement: "right" },
    ],
    defaultConfig: { template: "다음을 요약해줘:\n\n{{text}}" },
    executable: true,
  },
  {
    type: "llm_core_chip",
    name: "LLM 코어",
    category: "ai",
    size: "L",
    description:
      "질문·지시를 받아 AI가 답변·설명 같은 글을 만듭니다. 이 보드에서 답을 내는 핵심 칩입니다. (지금은 연습용 가짜 응답)",
    icon: "bot",
    ports: [
      { id: "in_prompt", name: "prompt", type: "TXT", direction: "INPUT", required: true, placement: "left" },
      { id: "out_text", name: "text", type: "TXT", direction: "OUTPUT", placement: "right" },
    ],
    defaultConfig: { model: "mock-gpt", mode: "summary" },
    executable: true,
  },
  {
    type: "search_rag_chip",
    name: "검색/RAG",
    category: "ai",
    size: "L",
    description:
      "질문과 관련된 자료를 찾아 곁들여 줍니다. AI가 자료를 보며 답하게 할 때 씁니다. (지금은 연습용)",
    icon: "search",
    ports: [
      { id: "in_query", name: "query", type: "TXT", direction: "INPUT", required: true, placement: "left" },
      { id: "out_context", name: "context", type: "TXT", direction: "OUTPUT", placement: "right" },
    ],
    defaultConfig: { source: "mock", topK: 3 },
    executable: true,
  },
  {
    type: "memory_chip",
    name: "메모리",
    category: "ai",
    size: "M",
    description:
      "중간 내용을 잠깐 저장해 두었다가 뒤 칩에서 다시 꺼내 씁니다. “아까 말한 것 기억”에 가깝습니다.",
    icon: "database",
    ports: [
      { id: "in_json", name: "in", type: "JSON", direction: "INPUT", placement: "left" },
      { id: "out_json", name: "out", type: "JSON", direction: "OUTPUT", placement: "right" },
    ],
    defaultConfig: {},
    executable: false,
  },
  {
    type: "vision_analysis_chip",
    name: "비전 분석",
    category: "ai",
    size: "L",
    description:
      "그림·스크린샷이 무엇인지 설명하거나 안의 물건·글자를 짚어 줍니다. (앞으로 더 붙일 예정)",
    icon: "scan",
    ports: [
      { id: "in_img", name: "image", type: "IMG", direction: "INPUT", placement: "left" },
      { id: "out_txt", name: "text", type: "TXT", direction: "OUTPUT", placement: "right" },
    ],
    defaultConfig: {},
    executable: false,
  },
  {
    type: "code_forge_chip",
    name: "코드 포지",
    category: "ai",
    size: "L",
    description:
      "하고 싶은 기능을 평범한 말로 쓰면 프로그램 코드 초안을 만듭니다. 코딩 전 아이디어 확인용입니다.",
    icon: "code",
    ports: [
      { id: "in_spec", name: "spec", type: "TXT", direction: "INPUT", placement: "left" },
      { id: "out_code", name: "code", type: "CODE", direction: "OUTPUT", placement: "right" },
    ],
    defaultConfig: {},
    executable: false,
  },

  // 로직칩 (5)
  {
    type: "classifier_chip",
    name: "분류기",
    category: "logic",
    size: "M",
    description:
      "글을 보고 종류(예: 상담/판매)를 나눕니다. 뒤에서 길을 갈라 보낼 때 앞에 두면 편합니다. (연습용)",
    icon: "filter",
    ports: [
      { id: "in_text", name: "text", type: "TXT", direction: "INPUT", required: true, placement: "left" },
      { id: "out_label", name: "label", type: "TXT", direction: "OUTPUT", placement: "right" },
    ],
    defaultConfig: { positiveKeywords: "good,excellent,great", negativeKeywords: "bad,terrible,poor" },
    executable: true,
  },
  {
    type: "condition_branch_chip",
    name: "조건 분기",
    category: "logic",
    size: "M",
    description:
      "조건이 맞으면 한 줄로, 아니면 다른 줄로 보냅니다. “만약 ~이면 이렇게”를 만드는 칩입니다.",
    icon: "git-branch",
    ports: [
      { id: "in_cond", name: "cond", type: "BOOL", direction: "INPUT", placement: "left" },
      { id: "out_true", name: "true", type: "EVT", direction: "OUTPUT", placement: "right" },
      { id: "out_false", name: "false", type: "EVT", direction: "OUTPUT", placement: "right" },
    ],
    defaultConfig: {},
    executable: false,
  },
  {
    type: "router_chip",
    name: "라우터",
    category: "logic",
    size: "M",
    description:
      "붙은 이름·분류에 따라 A·B 등 다른 줄로만 보냅니다. (연습용)",
    icon: "route",
    ports: [
      { id: "in_label", name: "label", type: "TXT", direction: "INPUT", required: true, placement: "left" },
      { id: "out_a", name: "A", type: "EVT", direction: "OUTPUT", placement: "right" },
      { id: "out_b", name: "B", type: "EVT", direction: "OUTPUT", placement: "right" },
      { id: "out_label", name: "label", type: "TXT", direction: "OUTPUT", placement: "right" },
    ],
    defaultConfig: { rule: "positive->A;negative->B;other->B" },
    executable: true,
  },
  {
    type: "loop_chip",
    name: "반복 실행",
    category: "logic",
    size: "M",
    description:
      "목록을 한 개씩 순서대로 꺼내 다음 칩으로 넘깁니다. 같은 작업을 여러 번 할 때 씁니다.",
    icon: "repeat",
    ports: [
      { id: "in_list", name: "list", type: "LIST", direction: "INPUT", placement: "left" },
      { id: "out_item", name: "item", type: "ANY", direction: "OUTPUT", placement: "right" },
    ],
    defaultConfig: {},
    executable: false,
  },
  {
    type: "merge_chip",
    name: "병합",
    category: "logic",
    size: "M",
    description:
      "여러 칩에서 온 입력을 하나의 덩어리로 합칩니다. 다음 칩이 한 번에 받게 정리할 때 씁니다.",
    icon: "merge",
    ports: [
      { id: "in_a", name: "A", type: "ANY", direction: "INPUT", placement: "left", multi: true },
      { id: "out_any", name: "out", type: "ANY", direction: "OUTPUT", placement: "right" },
    ],
    defaultConfig: {},
    executable: false,
  },

  // 연결/실행칩 (3)
  {
    type: "api_connector_chip",
    name: "API 커넥터",
    category: "action",
    size: "L",
    description:
      "정해진 인터넷 주소에 요청을 보내고, 돌아온 결과를 다음 칩으로 넘깁니다.",
    icon: "plug",
    ports: [
      { id: "in_url", name: "url", type: "URL", direction: "INPUT", placement: "left" },
      { id: "in_json", name: "body", type: "JSON", direction: "INPUT", placement: "left" },
      { id: "out_json", name: "response", type: "JSON", direction: "OUTPUT", placement: "right" },
    ],
    defaultConfig: { method: "GET" },
    executable: false,
  },
  {
    type: "db_rw_chip",
    name: "DB 읽기/쓰기",
    category: "action",
    size: "L",
    description:
      "데이터 저장소에서 읽거나 새 정보를 저장합니다. 목록·기록 조회에 씁니다.",
    icon: "hard-drive",
    ports: [
      { id: "in_json", name: "query", type: "JSON", direction: "INPUT", placement: "left" },
      { id: "out_json", name: "result", type: "JSON", direction: "OUTPUT", placement: "right" },
    ],
    defaultConfig: {},
    executable: false,
  },
  {
    type: "document_generator_chip",
    name: "문서 생성",
    category: "action",
    size: "L",
    description:
      "넣은 글·자료를 보기 좋은 문서 한 편으로 만듭니다. 보고서 초안·웹용 글 형태로 쓸 수 있습니다.",
    icon: "file-text",
    ports: [
      { id: "in_text", name: "text", type: "TXT", direction: "INPUT", required: true, placement: "left" },
      { id: "out_doc", name: "doc", type: "DOC", direction: "OUTPUT", placement: "right" },
      { id: "out_txt", name: "text", type: "TXT", direction: "OUTPUT", placement: "right" },
    ],
    defaultConfig: { title: "Generated Document" },
    executable: true,
  },

  // 출력칩 (1)
  {
    type: "result_panel_chip",
    name: "결과 패널",
    category: "output",
    size: "XL",
    description:
      "흐름 맨 끝에서 최종 결과를 크게 보여 줍니다. 글·표·문서를 사람이 읽기 좋게 정리합니다.",
    icon: "panel-bottom",
    ports: [{ id: "in_any", name: "in", type: "ANY", direction: "INPUT", placement: "left", required: true }],
    defaultConfig: {},
    executable: true,
  },
];

export const chipDefinitionByType = new Map(chipDefinitions.map((d) => [d.type, d]));


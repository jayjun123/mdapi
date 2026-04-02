import type { BoardChipInstance } from './boardTypes';
import type { ChipPortDefinition, PortType } from './chipDefinitions';

/** 검증 패널 등에서 오류 코드 대신 보여 줄 짧은 한글 제목 */
export const VALIDATION_CODE_TITLE_KO: Record<string, string> = {
  REQUIRED_INPUT_NOT_CONNECTED: '필수 입력이 비어 있음',
  NO_START_CHIP: '시작 칩 없음',
  START_CHIP_NOT_CONNECTED: '시작 칩이 끊김',
  ISOLATED_CHIP: '연결 없는 칩',
  UNREACHABLE_CHIP: '흐름에 안 닿는 칩',
  NO_EXECUTABLE_PATH: '실행 경로 없음',
  CHIP_ID_MISSING: '칩 ID 오류',
  DUPLICATE_CHIP_ID: '칩 ID 중복',
  EDGE_ID_MISSING: '연결선 ID 오류',
  DUPLICATE_EDGE_ID: '연결선 ID 중복',
  CHIP_DEFINITION_MISSING: '칩 정의 없음',
  CHIP_TYPE_DEFINITION_MISMATCH: '칩 타입 불일치',
  CHIP_PORTS_MISSING: '포트 정의 없음',
  PORT_ID_MISSING: '포트 ID 오류',
  DUPLICATE_PORT_ID: '포트 ID 중복',
  EDGE_FROM_CHIP_NOT_FOUND: '연결선(출발 칩) 오류',
  EDGE_TO_CHIP_NOT_FOUND: '연결선(도착 칩) 오류',
  EDGE_FROM_PORT_NOT_FOUND: '연결선(출발 포트) 오류',
  EDGE_TO_PORT_NOT_FOUND: '연결선(도착 포트) 오류',
  DISABLED_CHIP: '비활성 칩',
  SELF_LOOP_FORBIDDEN: '같은 칩 안 연결 불가',
  DUPLICATE_EDGE: '중복 연결',
  OUTPUT_PORT_FULL: '출력 포트 가득 참',
  EVENT_TYPE_MISMATCH: '신호 타입 불일치',
  PORT_NOT_FOUND: '포트 없음',
  ADAPTER_REQUIRED: '중간 변환 칩 필요',
  INVALID_FROM_DIRECTION: '출발 방향 오류',
  INVALID_TO_DIRECTION: '도착 방향 오류',
  INPUT_PORT_FULL: '입력 포트 사용 중',
  ILLEGAL_EVENT_CYCLE: '신호 순환 불가',
  ILLEGAL_DATA_CYCLE: '데이터 순환 불가',
  ANY_TYPE_WARNING: '임의(ANY) 연결 경고',
  DATA_TYPE_MISMATCH: '데이터 타입 불일치',
  EVENT_ALLOWED: '신호 연결 허용',
  DIRECT_COMPATIBLE: '연결 허용',
};

export function validationCodeTitle(code: string): string {
  return VALIDATION_CODE_TITLE_KO[code] ?? code;
}

function portTypeWhatYouNeed(t: PortType): string {
  switch (t) {
    case 'TXT':
      return '글(텍스트)';
    case 'IMG':
      return '사진·이미지';
    case 'LIST':
      return '목록(여러 줄)';
    case 'BOOL':
      return '켜짐/꺼짐';
    case 'JSON':
      return '표 형태 자료';
    case 'ANY':
      return '보여 줄 내용·데이터';
    case 'NUM':
      return '숫자';
    case 'FILE':
      return '파일';
    case 'URL':
      return '웹 주소';
    case 'CODE':
      return '코드';
    case 'DOC':
      return '문서';
    case 'AUD':
      return '소리·녹음';
    case 'EVT':
      return '실행 신호';
    default:
      return '데이터';
  }
}

/**
 * 필수 입력이 비었을 때: 무엇을 연결해야 하고, 결과가 나오려면 무엇이 필요한지 설명합니다.
 */
export function buildFriendlyRequiredInputMessage(chip: BoardChipInstance, port: ChipPortDefinition): string {
  const L = `「${chip.name}」`;
  const key = `${chip.type}:${port.id}`;

  const specific: Record<string, string> = {
    'result_panel:in': `${L}에 화면에 보여 줄 본문이 들어와야 결과가 나옵니다. 바로 앞 칩 오른쪽에서 나오는 글·표·응답(예: 감성 분석의 글·점수, API 응답)을 이 칩 왼쪽 큰 입력에 선으로 연결하세요. 제목만 연결되어 있으면 본문이 비어 실행할 수 없습니다.`,

    'prompt_builder:userInput': `${L}에 넣을 사용자 글이 필요합니다. 텍스트 입력칩 등에서 나오는 줄을 userInput 쪽에 연결하면, 그 내용이 프롬프트에 끼워 넣어집니다.`,

    'llm_core:prompt': `${L}에 AI에게 보낼 질문·지시 문장이 필요합니다. 프롬프트 빌더나 텍스트 입력 등에서 나오는 글을 prompt 입력에 연결하세요.`,

    'search_rag:query': `${L}에 검색할 질문 문장이 필요합니다. 텍스트 입력 등에서 나오는 글을 query 입력에 연결하세요.`,

    'vision_analysis:image': `${L}에 분석할 사진이 필요합니다. 카메라 입력칩·파일 입력칩 등에서 나오는 이미지를 image 입력에 연결하세요.`,

    'code_forge:spec': `${L}에 만들고 싶은 기능을 말로 적은 글이 필요합니다. 텍스트 입력 등에서 나오는 줄을 spec 입력에 연결하세요.`,

    'condition_branch:if': `${L}에 맞다/틀리다(켜짐/꺼짐) 값이 필요합니다. 켜기/끄기 입력칩 등 BOOL 출력을 if 입력에 연결하세요.`,

    'router:routeKey': `${L}에 어디로 보낼지 정하는 이름(글자)이 필요합니다. 분류기 등에서 나오는 라벨을 routeKey에 연결하세요.`,

    'loop:items': `${L}에 한 줄씩 처리할 목록이 필요합니다. 검색 결과 목록 등 LIST 출력을 items 입력에 연결하세요.`,

    'sentiment:text': `${L}에 분석할 문장이 필요합니다. 텍스트 입력·API 응답 등에서 나오는 글을 text 입력에 연결하세요.`,

    'summarizer:text': `${L}에 줄일 원문이 필요합니다. 텍스트 입력 등에서 나오는 글을 text 입력에 연결하세요.`,

    'keyword_extract:text': `${L}에 키워드를 뽑을 글이 필요합니다. 텍스트 입력 등에서 나오는 글을 text 입력에 연결하세요.`,

    'embedding_stub:text': `${L}에 바꿀 글이 필요합니다. 텍스트 입력 등에서 나오는 글을 text 입력에 연결하세요.`,

    'list_first:items': `${L}에 목록이 필요합니다. 앞 칩에서 나오는 LIST를 items 입력에 연결하세요.`,

    'bool_not:in': `${L}에 뒤집을 켜짐/꺼짐 값이 필요합니다. 켜기/끄기 입력칩 등 BOOL 출력을 연결하세요.`,

    'regex_match:text': `${L}에 패턴을 찾을 글이 필요합니다. 텍스트 입력 등에서 나오는 글을 text 입력에 연결하세요.`,

    'csv_serializer:rows': `${L}에 표로 바꿀 목록이 필요합니다. 앞 칩에서 나오는 LIST를 rows 입력에 연결하세요.`,

    'markdown_table:rows': `${L}에 표로 만들 목록이 필요합니다. 앞 칩에서 나오는 LIST를 rows 입력에 연결하세요.`,

    'note_output:in': `${L}에 화면에 남길 메모 글이 필요합니다. 텍스트 입력 등에서 나오는 줄을 연결하세요.`,
  };

  if (specific[key]) return specific[key];

  const need = portTypeWhatYouNeed(port.type);
  return `${L}의「${port.name}」입력에 아직 선이 없습니다. ${need}가 들어오도록 바로 앞 칩의 출력을 이쪽으로 연결해야 이 칩이 동작하고 결과가 나옵니다.`;
}

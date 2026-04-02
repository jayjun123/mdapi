import { serializeBoardToJson } from './boardSerializer';
import { describeBoardFlowNarrative } from './describeBoardFlow';
import type { BoardState } from './boardTypes';
import { validateBoard } from './validation';

/**
 * 보드 상태를 다른 AI에게 전달해 실행 가능한 프로그램(스크립트·API·CLI 등)을 만들게 할 때 쓰는 마크다운 프롬프트를 만듭니다.
 */
export function buildExecutablePromptMarkdown(board: BoardState): string {
  const narrative = describeBoardFlowNarrative(board);
  const validation = validateBoard(board);
  const json = serializeBoardToJson(board, true);

  const validationSummary =
    validation.ok
      ? '검증 통과(실행 전 기준).'
      : `검증 오류 ${validation.errors.length}개, 경고 ${validation.warnings.length}개. 아래 JSON과 흐름을 참고해 구현 시 누락된 연결·입력을 보완하세요.`;

  return `# 보드 → 실행 프로그램 구현 요청

이 문서는 **시각적 AI 보드(칩·연결선)** 설계를 다른 AI가 읽고, **실제로 돌아가는 프로그램**으로 옮기기 위한 프롬프트입니다.

---

## 당신(구현 AI)의 역할

- 아래 **흐름 설명**과 **보드 JSON**을 근거로, 동일한 데이터 흐름과 단계를 갖는 **실행 파일 또는 프로젝트**를 만드세요.
- 언어·런타임은 **하나만** 골라 일관되게 작성하세요 (예: Node.js(TypeScript), Python 3, 단일 HTML+JS는 제외 권장).
- 보드의 각 칩은 **처리 단계**에 대응합니다. 칩 \`type\`과 \`config\`를 읽어 입력→출력 매핑을 코드로 구현하세요.
- 이 도구의 일부 칩은 **모의(mock)** 동작일 수 있습니다. 실제 서비스라면 **환경 변수**로 API 키·URL을 받고, 실패 시 명확한 오류 메시지를 내세요.

---

## 보드 메타

| 항목 | 값 |
|------|-----|
| 이름 | ${board.name || '(이름 없음)'} |
| 칩 수 | ${board.chips.length} |
| 연결 수 | ${board.edges.length} |
| 검증 | ${validationSummary} |

---

## 흐름 설명 (사람이 읽기 쉬운 요약)

${narrative}

---

## 구현 시 반드시 포함할 것

1. **엔트리 포인트**: \`README.md\`에 설치·실행 방법 (\`npm start\`, \`python main.py\` 등).
2. **입력**: 보드의 **입력칩**에 해당하는 데이터 소스(표준 입력, 파일, CLI 인자, 환경 변수 등)를 명시.
3. **단계**: 위 JSON의 \`chips\` 순서와 \`edges\` 연결을 존중해, 위상 순서대로 처리.
4. **출력**: **출력칩**(예: 결과 패널)에 해당하는 결과를 표준 출력·파일·HTTP 응답 중 하나로 보내기.
5. **오류 처리**: 필수 입력 누락·외부 API 실패 시 비정상 종료 코드와 메시지.

---

## 기계가 읽는 보드 JSON (단일 진실 소스)

아래 JSON이 칩 ID·타입·설정·연결의 근거입니다.

\`\`\`json
${json}
\`\`\`

---

## 산출물 형식 (권장)

- 소스 코드 파일들 + \`README.md\`
- 의존성 목록 (\`package.json\` / \`requirements.txt\` 등)
- 가능하면 **한 번의 명령**으로 샘플 입력에 대해 끝까지 실행되는 예시

---

## 제약

- 보드에 없는 단계를 임의로 많이 추가하지 말 것. 필요하면 **왜 필요한지** 주석으로 한 줄 설명.
- JSON의 \`chip.id\`는 구현에서 **상수/모듈 이름** 참고용으로만 쓰고, 하드코딩이 과도해지면 단계 번호로 리팩터해도 됨.

`;
}

export function safeBoardFileBase(name: string): string {
  const trimmed = name.trim() || 'board';
  return trimmed.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 80);
}

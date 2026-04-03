import { serializeBoardToJson } from './boardSerializer';
import { describeBoardFlowAndCapability } from './describeBoardFlow';
import type { BoardExecutionReport } from './executor';
import type { BoardLogEntry, BoardState, BoardValidationIssue, BoardValidationReport } from './boardTypes';
import { validateBoard } from './validation';

export type BuildExecutablePromptMarkdownOptions = {
  /**
   * 에디터 mock 실행 결과. 넣으면 **수락 기준·골든 레퍼런스** 섹션이 생성됩니다.
   * 보내기 직전에 `executeBoard`로 맞추면 JSON과 실행 스냅샷이 일치합니다.
   */
  executionReport?: BoardExecutionReport | null;
  /** mock 실행 후 쌓인 `report.board.logs` 등. 기본 true */
  includeBoardLogs?: boolean;
  /** 포함할 최대 로그 줄 수 */
  boardLogsMax?: number;
};

function escapeMdInline(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function stringifyValue(value: unknown, maxLen: number): string {
  try {
    if (value === undefined) return '(undefined)';
    if (typeof value === 'string') {
      return value.length > maxLen ? `${value.slice(0, maxLen)}\n…(문자열 잘림, 총 ${value.length}자)` : value;
    }
    const s = JSON.stringify(value, null, 2) ?? String(value);
    return s.length > maxLen ? `${s.slice(0, maxLen)}\n…(잘림)` : s;
  } catch {
    return String(value);
  }
}

function formatValidationIssues(title: string, issues: BoardValidationIssue[]): string {
  if (issues.length === 0) return '';
  const lines: string[] = [`### ${title} (${issues.length}개)\n`];
  for (const i of issues) {
    const refs = [
      i.chipId ? `칩 \`${i.chipId}\`` : '',
      i.portId ? `포트 \`${i.portId}\`` : '',
      i.edgeId ? `연결 \`${i.edgeId}\`` : '',
    ]
      .filter(Boolean)
      .join(', ');
    lines.push(`- **\`${i.code}\`** — ${escapeMdInline(i.message)}${refs ? ` (${refs})` : ''}`);
  }
  return `${lines.join('\n')}\n`;
}

function formatValidationDetail(report: BoardValidationReport): string {
  const parts: string[] = [];
  parts.push(formatValidationIssues('검증 오류', report.errors));
  parts.push(formatValidationIssues('검증 경고', report.warnings));
  if (report.executablePaths.length > 0) {
    parts.push('### 실행 가능 경로 (시작칩 → …)\n');
    for (const path of report.executablePaths) {
      parts.push(`- \`${path.join(' → ')}\``);
    }
    parts.push('');
  }
  const body = parts.filter(Boolean).join('\n');
  return body || '_검증 이슈 없음._\n';
}

function formatBoardLogs(logs: BoardLogEntry[], max: number): string {
  if (logs.length === 0) return '_로그 없음._\n';
  const slice = logs.slice(-max);
  const lines: string[] = [`(최근 ${slice.length}개 / 전체 ${logs.length}개)\n`];
  for (const log of slice) {
    const chip = log.chipId ? ` \`${log.chipId}\`` : '';
    lines.push(`- **${log.level}**${chip} — ${escapeMdInline(log.message)}`);
    if (log.data !== undefined) {
      lines.push(`\n  \`\`\`json\n  ${stringifyValue(log.data, 1200).replace(/\n/g, '\n  ')}\n  \`\`\``);
    }
  }
  return `${lines.join('\n')}\n`;
}

function formatExecutionGoldenReference(report: BoardExecutionReport): string {
  const lines: string[] = [];

  lines.push(`- **mock 실행 성공 여부**: ${report.ok ? '예 (`ok`)' : '아니오 — 아래 오류·검증을 반드시 읽고 구현에서 보완할 것'}`);
  lines.push(`- **위상 실행 순서 (칩 id)**: ${report.order.length ? report.order.map((id) => `\`${id}\``).join(' → ') : '_(실행 안 됨 — 검증 실패 등)_'}`);
  lines.push('');

  if (report.finalOutputs.length > 0) {
    lines.push('### 최종 출력 (에디터가 잡은 “끝단” 값 — 수락 기준)\n');
    lines.push(
      '구현한 CLI/서비스는 **동일 보드 의미**에서 이와 **같은 형태**(객체 키·배열 구조)로 결과를 내는 것을 목표로 하세요. mock이라 내용이 단순해도 됩니다.\n',
    );
    for (const fo of report.finalOutputs) {
      lines.push(`#### ${escapeMdInline(fo.chipName)} (\`${fo.chipId}\`)\n`);
      lines.push('```json');
      lines.push(stringifyValue(fo.value, 12000));
      lines.push('```\n');
    }
  } else if (!report.ok) {
    lines.push('### 최종 출력\n');
    lines.push('_실행이 끝까지 가지 않아 최종 출력이 없습니다. 검증·실패 원인을 먼저 해결한 뒤의 출력을 목표로 하세요._\n');
  }

  if (report.records.length > 0) {
    lines.push('### 칩별 mock 실행 기록 (단계별 입출력 참고)\n');
    for (const r of report.records) {
      const head = `${r.chipId} (\`${r.chipType}\`) — **${r.status}** (${r.durationMs}ms)`;
      lines.push(`#### ${head}\n`);
      if (r.error) lines.push(`- 오류: ${escapeMdInline(r.error)}\n`);
      if (r.warning) lines.push(`- 경고: ${escapeMdInline(r.warning)}\n`);
      const outKeys = Object.keys(r.outputs);
      if (outKeys.length > 0) {
        lines.push('출력 포트:');
        lines.push('```json');
        lines.push(stringifyValue(r.outputs, 8000));
        lines.push('```\n');
      }
    }
  }

  if (report.outputsByChip && Object.keys(report.outputsByChip).length > 0) {
    lines.push('### 칩별 누적 출력 맵 (`outputsByChip`)\n');
    lines.push('```json');
    lines.push(stringifyValue(report.outputsByChip, 20000));
    lines.push('```\n');
  }

  return lines.join('\n');
}

/**
 * 보드 상태를 다른 AI에게 전달해 실행 가능한 프로그램을 만들게 할 때 쓰는 마크다운 프롬프트를 만듭니다.
 * `options.executionReport`를 넣으면 mock 결과·로그·검증 상세가 포함되어 전달 품질이 크게 올라갑니다.
 */
export function buildExecutablePromptMarkdown(board: BoardState, options: BuildExecutablePromptMarkdownOptions = {}): string {
  const { executionReport = null, includeBoardLogs = true, boardLogsMax = 48 } = options;

  const { flow: narrative, capability } = describeBoardFlowAndCapability(board);
  const validation = validateBoard(board);
  const json = serializeBoardToJson(board, true);

  const validationSummary = validation.ok
    ? '검증 통과(실행 전 기준).'
    : `검증 오류 ${validation.errors.length}개, 경고 ${validation.warnings.length}개. 구현 시 아래 상세 이슈를 반영하세요.`;

  const generatedAt = new Date().toISOString();

  const logsSource =
    executionReport?.board?.logs?.length ? executionReport.board.logs : board.logs;
  const logsSection =
    includeBoardLogs && logsSource.length > 0
      ? `## 보드 런타임 로그 (참고)

${formatBoardLogs(logsSource, boardLogsMax)}`
      : includeBoardLogs
        ? `## 보드 런타임 로그 (참고)

_로그 없음._\n`
        : '';

  const executionBlock = executionReport
    ? `## 에디터 mock 실행 스냅샷 (골든 레퍼런스)

> 이 블록은 **현재 보드 JSON**에 대해 에디터에서 mock 실행을 돌린 결과입니다.  
> 구현 AI는 **아래 JSON 스키마·연결**을 따르되, **최종 출력**은 가능하면 이 스냅샷과 **의미·구조가 맞도록** 구현하세요.  
> mock 칩은 값이 단순할 수 있습니다. 실서비스는 환경 변수·API로 대체하되, **데이터 경로**는 보존하세요.

${formatExecutionGoldenReference(executionReport)}
`
    : `## 에디터 mock 실행 스냅샷

_실행 리포트가 없습니다. \`buildExecutablePromptMarkdown(board, { executionReport })\`에 \`executeBoard\` 결과를 넘기면 단계별 출력이 채워집니다._\n`;

  return `# 보드 → 실행 프로그램 구현 요청 (고신뢰 프롬프트)

이 문서는 **시각적 AI 보드(칩·연결선)** 설계와, 가능한 경우 **에디터 mock 실행 결과**를 묶어 다른 AI가 **실제로 돌아가는 프로젝트**로 옮기기 위한 자료입니다.

- **생성 시각 (UTC)**: \`${generatedAt}\`
- **보드 id**: \`${board.id}\`

---

## 당신(구현 AI)의 역할

1. 아래 **흐름 설명**, **검증 상세**, **보드 JSON**, 그리고 (있을 경우) **mock 실행 스냅샷**을 **모두** 근거로 삼으세요.
2. 동일한 **데이터 흐름**(위상 순서·포트 타입·연결)을 갖는 **실행 가능한 프로젝트**를 만드세요.
3. 언어·런타임은 **하나만** 골라 일관되게 작성하세요 (예: Node.js + TypeScript, Python 3).
4. **mock 실행 스냅샷**이 있으면, 그 안의 **최종 출력·칩별 출력**을 **수락 테스트·골든 레퍼런스**로 취급하세요 (값은 단순해도 **형태**를 맞출 것).
5. 일부 칩은 에디터에서만 mock입니다. 실제 서비스라면 **환경 변수**로 키·URL을 받고, 실패 시 명확한 오류를 내세요.

---

## 보드 메타

| 항목 | 값 |
|------|-----|
| 이름 | ${board.name || '(이름 없음)'} |
| 칩 수 | ${board.chips.length} |
| 연결 수 | ${board.edges.length} |
| 검증(요약) | ${validationSummary} |

---

## 검증 상세 (구현 전 반드시 확인)

${formatValidationDetail(validation)}

---

## 흐름 설명 (사람이 읽기 쉬운 요약)

${narrative}

### 이 구조로 할 수 있는 일

${capability}

---

${executionBlock}

---

${logsSection}

---

## 구현 시 반드시 포함할 것

1. **README.md**: 설치·실행·환경 변수·샘플 입력 방법.
2. **입력**: 보드의 **시작/입력 칩**에 대응하는 소스(CLI 인자, stdin, 파일, env)를 명시.
3. **파이프라인**: JSON의 \`edges\`(데이터 연결)와 \`chips\`를 따라 **위상 순서**로 처리. 이벤트 연결(\`kind: "event"\`)은 에디터 정책에 맞게 동기/비동기 중 하나로 문서화.
4. **출력**: **최종 단계 칩**의 출력이 mock 스냅샷과 호환되는 형태로 나오게 할 것 (스냅샷 없으면 JSON의 출력 포트 정의를 따름).
5. **오류**: 검증 오류에 해당하는 상태는 **비정상 종료 코드**와 메시지로 표현.
6. **테스트(권장)**: mock 스냅샷의 \`finalOutputs\` 또는 \`outputsByChip\`을 기준으로 **스냅샷 테스트 1개 이상**.

---

## 기계가 읽는 보드 JSON (단일 진실 소스)

\`\`\`json
${json}
\`\`\`

---

## 산출물 형식 (권장)

- 소스 코드 + \`README.md\`
- 의존성 파일 (\`package.json\` / \`requirements.txt\` 등)
- **한 번의 명령**으로 샘플이 끝까지 도는 예시
- (가능하면) mock 스냅샷과 비교하는 테스트 또는 \`./your-cli < sample.json\` 예시

---

## 제약

- 보드에 없는 단계를 임의로 많이 추가하지 말 것. 필요하면 주석으로 한 줄 근거.
- \`chip.id\`는 참고용; 과도한 하드코딩은 단계 인덱스로 리팩터 가능.
- 이 문서의 mock 결과는 **에디터 내부 동작**이며, 외부 API를 대체해도 **입출력 계약**은 유지할 것.

`;
}

export function safeBoardFileBase(name: string): string {
  const trimmed = name.trim() || 'board';
  return trimmed.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 80);
}

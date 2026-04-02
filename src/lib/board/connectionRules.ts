import type { ChipPort, PortType, ValidationResult } from "@/lib/board/boardTypes";

const ADAPTER_SUGGESTIONS: Array<{
  from: PortType;
  to: PortType;
  adapterType: string;
  message: string;
}> = [
  { from: "FILE", to: "TXT", adapterType: "document_parser_chip", message: "FILE → TXT 변환칩이 필요합니다." },
  { from: "IMG", to: "TXT", adapterType: "vision_analysis_chip", message: "IMG → TXT 변환칩이 필요합니다." },
  { from: "AUD", to: "TXT", adapterType: "speech_to_text_chip", message: "AUD → TXT 변환칩이 필요합니다." },
  { from: "TXT", to: "JSON", adapterType: "text_to_json_chip", message: "TXT → JSON 변환칩이 필요합니다." },
  { from: "JSON", to: "TXT", adapterType: "json_to_text_chip", message: "JSON → TXT 변환칩이 필요합니다." },
];

export function validatePortConnection(params: {
  sourcePort: ChipPort;
  targetPort: ChipPort;
  isSameChip: boolean;
  isDuplicateEdge: boolean;
  targetAlreadyConnected: boolean;
}): ValidationResult {
  const { sourcePort, targetPort, isSameChip, isDuplicateEdge, targetAlreadyConnected } = params;

  if (isSameChip) {
    return { ok: false, level: "deny", code: "SELF_CONNECT", message: "같은 칩 내부 연결은 허용되지 않습니다." };
  }

  if (isDuplicateEdge) {
    return { ok: false, level: "deny", code: "DUPLICATE", message: "동일한 연결은 중복될 수 없습니다." };
  }

  if (sourcePort.direction !== "OUTPUT" || targetPort.direction !== "INPUT") {
    return { ok: false, level: "deny", code: "DIR", message: "OUTPUT → INPUT만 연결 가능합니다." };
  }

  if (targetPort.multi !== true && targetAlreadyConnected) {
    return { ok: false, level: "deny", code: "SINGLE_INPUT", message: "이 입력 포트는 하나의 연결만 허용합니다." };
  }

  if (sourcePort.type === "EVT" || targetPort.type === "EVT") {
    if (sourcePort.type === "EVT" && targetPort.type === "EVT") {
      return { ok: true, level: "allow", code: "EVT_OK", message: "이벤트 연결" };
    }
    return { ok: false, level: "deny", code: "EVT_ONLY", message: "EVT는 EVT끼리만 연결 가능합니다." };
  }

  if (sourcePort.type === targetPort.type) {
    return { ok: true, level: "allow", code: "TYPE_OK", message: "연결 가능" };
  }

  if (sourcePort.type === "ANY" || targetPort.type === "ANY") {
    return {
      ok: true,
      level: "warn",
      code: "ANY_WARN",
      message: "ANY 연결은 허용되지만 타입 안정성이 낮습니다.",
    };
  }

  const adapter = ADAPTER_SUGGESTIONS.find((a) => a.from === sourcePort.type && a.to === targetPort.type);
  if (adapter) {
    return {
      ok: false,
      level: "adapter",
      code: "ADAPTER_REQUIRED",
      message: adapter.message,
      adapterType: adapter.adapterType,
    };
  }

  return { ok: false, level: "deny", code: "TYPE_DENY", message: "포트 타입이 호환되지 않습니다." };
}


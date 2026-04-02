import type { PortType } from "@/lib/board/boardTypes";

export const PORT_TYPE_COLOR: Record<PortType, string> = {
  EVT: "#F5C542",
  TXT: "#59B8FF",
  NUM: "#FF9F43",
  BOOL: "#78E08F",
  JSON: "#9B7BFF",
  LIST: "#4ECDC4",
  FILE: "#7F8FA6",
  IMG: "#FF6FB5",
  AUD: "#C56CFF",
  URL: "#2EC4B6",
  CODE: "#FF5D5D",
  DOC: "#E9C46A",
  ANY: "#B0B7C3",
};

export const VALIDATION_COLOR: Record<
  "allow" | "warn" | "adapter" | "deny",
  string
> = {
  allow: "#2ecc71",
  warn: "#f1c40f",
  adapter: "#e67e22",
  deny: "#e74c3c",
};


import type { BoardChipInstance } from "@/lib/board/boardTypes";

export type ExecutorContext = {
  chip: BoardChipInstance;
  inputs: Record<string, unknown>;
};

export type ExecutorResult = {
  outputs: Record<string, unknown>;
  logs?: Array<{ level: "info" | "warn" | "error"; message: string }>;
};

function mergeTemplate(template: string, vars: Record<string, unknown>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => String(vars[k] ?? ""));
}

export const mockExecutors: Record<string, (ctx: ExecutorContext) => Promise<ExecutorResult>> = {
  text_input_chip: async ({ chip }) => {
    const value = String(chip.config.value ?? "");
    return { outputs: { out_text: value } };
  },

  prompt_builder_chip: async ({ chip, inputs }) => {
    const template = String(chip.config.template ?? "{{text}}");
    const merged = mergeTemplate(template, { text: inputs.in_text });
    return { outputs: { out_prompt: merged } };
  },

  search_rag_chip: async ({ chip, inputs }) => {
    const q = String(inputs.in_query ?? "");
    const topK = Number(chip.config.topK ?? 3);
    const items = Array.from({ length: Math.max(1, Math.min(5, topK)) }, (_, i) => `- [mock] ${q} 관련 근거 ${i + 1}`);
    return { outputs: { out_context: `검색 결과(모의):\n${items.join("\n")}` } };
  },

  llm_core_chip: async ({ chip, inputs }) => {
    const prompt = String(inputs.in_prompt ?? "");
    const mode = String(chip.config.mode ?? "summary");
    const head = prompt.trim().replace(/\s+/g, " ").slice(0, 180);
    const answer = mode === "summary" ? `요약(모의): ${head}` : `응답(모의): ${head}`;
    return { outputs: { out_text: answer } };
  },

  classifier_chip: async ({ chip, inputs }) => {
    const text = String(inputs.in_text ?? "").toLowerCase();
    const pos = String(chip.config.positiveKeywords ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const neg = String(chip.config.negativeKeywords ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const label = pos.some((k) => text.includes(k)) ? "positive" : neg.some((k) => text.includes(k)) ? "negative" : "other";
    return { outputs: { out_label: label } };
  },

  router_chip: async ({ chip, inputs }) => {
    const label = String(inputs.in_label ?? "other");
    const rule = String(chip.config.rule ?? "");
    // MVP: "positive->A;negative->B;other->B" 형태만 가볍게 파싱
    const map = new Map<string, "A" | "B">();
    for (const part of rule.split(";").map((s) => s.trim()).filter(Boolean)) {
      const [k, v] = part.split("->").map((s) => s.trim());
      if (!k || (v !== "A" && v !== "B")) continue;
      map.set(k, v);
    }
    const route = map.get(label) ?? map.get("other") ?? "B";
    return {
      outputs: {
        out_label: label,
        out_a: route === "A" ? true : undefined,
        out_b: route === "B" ? true : undefined,
      },
    };
  },

  document_generator_chip: async ({ chip, inputs }) => {
    const title = String(chip.config.title ?? "Generated Document");
    const body = String(inputs.in_text ?? "");
    const doc = `# ${title}\n\n${body}\n`;
    return { outputs: { out_doc: doc, out_txt: doc } };
  },

  result_panel_chip: async ({ inputs }) => {
    return { outputs: { out_render: inputs.in_any } };
  },
};


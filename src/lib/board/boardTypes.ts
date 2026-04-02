import { z } from "zod";

export const PortTypeSchema = z.enum([
  "EVT",
  "TXT",
  "NUM",
  "BOOL",
  "JSON",
  "LIST",
  "FILE",
  "IMG",
  "AUD",
  "URL",
  "CODE",
  "DOC",
  "ANY",
]);

export type PortType = z.infer<typeof PortTypeSchema>;

export const PortDirectionSchema = z.enum(["INPUT", "OUTPUT"]);
export type PortDirection = z.infer<typeof PortDirectionSchema>;

export const ChipCategorySchema = z.enum(["input", "ai", "logic", "action", "output"]);
export type ChipCategory = z.infer<typeof ChipCategorySchema>;

export const ChipSizeSchema = z.enum(["S", "M", "L", "XL"]);
export type ChipSize = z.infer<typeof ChipSizeSchema>;

export const ChipPortSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: PortTypeSchema,
  direction: PortDirectionSchema,
  required: z.boolean().optional(),
  multi: z.boolean().optional(),
  accepts: z.array(PortTypeSchema).optional(),
  placement: z.enum(["top", "left", "right", "bottom"]).optional(),
});

export type ChipPort = z.infer<typeof ChipPortSchema>;

export const ChipDefinitionSchema = z.object({
  type: z.string(),
  name: z.string(),
  category: ChipCategorySchema,
  size: ChipSizeSchema,
  description: z.string(),
  icon: z.string(),
  ports: z.array(ChipPortSchema),
  defaultConfig: z.record(z.string(), z.any()),
  executable: z.boolean(),
});

export type ChipDefinition = z.infer<typeof ChipDefinitionSchema>;

export type BoardChipInstance = {
  id: string;
  chipType: string;
  name: string;
  config: Record<string, unknown>;
  lastOutputs?: Record<string, unknown>;
  lastRun?: {
    status: "idle" | "ready" | "running" | "needs_config" | "error" | "ai_running";
    message?: string;
    at: number;
  };
};

export type ExecutionLogEntry = {
  id: string;
  at: number;
  level: "info" | "warn" | "error";
  message: string;
  chipId?: string;
};

export type ValidationResult = {
  ok: boolean;
  level: "allow" | "warn" | "adapter" | "deny";
  code: string;
  message: string;
  adapterType?: string;
};


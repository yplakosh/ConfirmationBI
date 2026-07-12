import { z } from "zod";

export const ValidationStyleSchema = z.enum([
  "strong",
  "cautious",
  "external-factors",
]);

export const GenerateValidationRequestSchema = z.object({
  decision: z.string().trim().min(3).max(280),
  style: ValidationStyleSchema,
});

export const ValidationMetricSchema = z.object({
  id: z.string().min(1).max(48),
  label: z.string().min(3).max(64),
  shortLabel: z.string().min(3).max(32),
  value: z.string().min(1).max(16),
  delta: z.string().min(1).max(40),
});

export const ValidationChartPointSchema = z.object({
  label: z.string().min(1).max(16),
  value: z.number().min(0).max(100),
});

export const GeneratedValidationContentSchema = z.object({
  confidence: z.number().min(75).max(99.9),
  executiveSummary: z.string().min(80).max(700),
  metrics: z.array(ValidationMetricSchema).length(5),
  chart: z.array(ValidationChartPointSchema).min(7).max(9),
});

// OpenAI Structured Outputs supports a strict JSON Schema subset. Keep the
// model-facing string fields unconstrained, then apply the stricter application
// schema after parsing the response.
export const OpenAIGeneratedValidationContentSchema = z.object({
  confidence: z.number().min(75).max(99.9),
  executiveSummary: z.string(),
  metrics: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        shortLabel: z.string(),
        value: z.string(),
        delta: z.string(),
      }),
    )
    .length(5),
  chart: z
    .array(
      z.object({
        label: z.string(),
        value: z.number().min(0).max(100),
      }),
    )
    .min(7)
    .max(9),
});

export const ValidationResultSchema = GeneratedValidationContentSchema.extend({
  id: z.string().min(1),
  decision: z.string().min(3).max(280),
  style: ValidationStyleSchema,
  createdAt: z.string().datetime(),
});

export const GenerateValidationResponseSchema = z.object({
  result: ValidationResultSchema,
  source: z.enum(["openai", "demo"]),
  model: z.string().min(1),
  cached: z.boolean().optional(),
  notice: z.string().min(1).max(180).optional(),
  sharePath: z.string().regex(/^\/v\/[0-9a-f-]{36}$/).optional(),
});

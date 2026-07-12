import type { z } from "zod";

import type {
  GenerateValidationRequestSchema,
  GenerateValidationResponseSchema,
  ValidationChartPointSchema,
  ValidationMetricSchema,
  ValidationResultSchema,
  ValidationStyleSchema,
} from "./validation.schema";

export type ValidationStyle = z.infer<typeof ValidationStyleSchema>;

export interface ValidationStyleOption {
  id: ValidationStyle;
  label: string;
  description: string;
}

export type ValidationMetric = z.infer<typeof ValidationMetricSchema>;
export type ValidationChartPoint = z.infer<typeof ValidationChartPointSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type GenerateValidationRequest = z.infer<
  typeof GenerateValidationRequestSchema
>;
export type GenerateValidationResponse = z.infer<
  typeof GenerateValidationResponseSchema
>;

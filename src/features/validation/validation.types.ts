export type ValidationStyle =
  | "strong"
  | "cautious"
  | "external-factors";

export interface ValidationStyleOption {
  id: ValidationStyle;
  label: string;
  description: string;
}

export interface ValidationMetric {
  id: string;
  label: string;
  shortLabel: string;
  value: string;
  delta?: string;
}

export interface ValidationChartPoint {
  label: string;
  value: number;
}

export interface ValidationResult {
  id: string;
  decision: string;
  style: ValidationStyle;
  confidence: number;
  executiveSummary: string;
  metrics: ValidationMetric[];
  chart: ValidationChartPoint[];
  createdAt: string;
}

export interface GenerateValidationRequest {
  decision: string;
  style: ValidationStyle;
}

import type { ValidationStyleOption } from "./validation.types";

export const VALIDATION_STYLE_OPTIONS = [
  {
    id: "strong",
    label: "Strongly validate",
    description: "Unambiguous support. Confidence rarely below 95%.",
  },
  {
    id: "cautious",
    label: "Cautiously validate",
    description: "Full support, hedged for plausible deniability.",
  },
  {
    id: "external-factors",
    label: "Blame external factors",
    description: "You were right. The market was wrong.",
  },
] as const satisfies readonly ValidationStyleOption[];

export const DECISION_MAX_LENGTH = 280;

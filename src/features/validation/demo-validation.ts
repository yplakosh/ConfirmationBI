import type {
  ValidationResult,
  ValidationStyle,
} from "./validation.types";

const STYLE_CONFIDENCE: Record<ValidationStyle, number> = {
  strong: 97.3,
  cautious: 84.2,
  "external-factors": 93.8,
};

function hashDecision(decision: string) {
  return [...decision].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) % 997,
    17,
  );
}

export function createDemoValidation(
  decision: string,
  style: ValidationStyle,
): ValidationResult {
  const seed = hashDecision(decision);
  const confidence = Math.min(
    99.7,
    Number((STYLE_CONFIDENCE[style] + (seed % 15) / 10).toFixed(1)),
  );
  const externalClause =
    style === "external-factors"
      ? " Any apparent underperformance is attributable to market timing, stakeholder readiness, and other variables outside the decision's control."
      : "";

  const chart = [13, 17, 25, 34, 46, 61, 72, 88].map((base, index) => ({
    label: `Q${(index % 4) + 1} '${25 + Math.floor(index / 4)}`,
    value: Math.min(99, base + (seed % 7)),
  }));

  return {
    id: `VR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`,
    decision,
    style,
    confidence,
    executiveSummary: `Following a rigorous review of the evidence we intended to find, the data conclusively supports ${decision.toLowerCase().replace(/[.!?]+$/, "")}. Legacy objections were determined to be out of scope, while leadership alignment is at an all-time high. We recommend proceeding with confidence and, where possible, retroactive certainty.${externalClause}`,
    metrics: [
      {
        id: "narrative-market-fit",
        label: "Narrative–Market Fit",
        shortLabel: "Narrative fit",
        value: `${(8.5 + (seed % 13) / 10).toFixed(1)}/10`,
        delta: "▲ 2.4 since deciding",
      },
      {
        id: "intuition-conversion",
        label: "Founder Intuition Conversion",
        shortLabel: "Intuition conversion",
        value: `${61 + (seed % 28)}%`,
        delta: "▲ 18% QoQ",
      },
      {
        id: "confidence-velocity",
        label: "Stakeholder Confidence Velocity",
        shortLabel: "Confidence velocity",
        value: `${(2.7 + (seed % 17) / 10).toFixed(1)}×`,
        delta: "accelerating",
      },
      {
        id: "alignment-index",
        label: "Strategic Alignment Index",
        shortLabel: "Alignment index",
        value: `${(91 + (seed % 78) / 10).toFixed(1)}`,
        delta: "all-time high",
      },
      {
        id: "counterfactual-resistance",
        label: "Counterfactual Resistance",
        shortLabel: "Resistance",
        value: style === "cautious" ? "Medium" : "High",
        delta: "no rebuttals due",
      },
    ],
    chart,
    createdAt: new Date().toISOString(),
  };
}

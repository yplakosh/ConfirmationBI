import type {
  ValidationPersona,
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
  persona: ValidationPersona = "boardroom-oracle",
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
    persona,
    confidence,
    executiveSummary: createDemoSummary(decision, persona, externalClause),
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

function createDemoSummary(
  decision: string,
  persona: ValidationPersona,
  externalClause: string,
) {
  const normalizedDecision = decision.toLowerCase().replace(/[.!?]+$/, "");
  const summaries: Record<ValidationPersona, string> = {
    "boardroom-oracle": `Following a rigorous review of the evidence we intended to find, the data conclusively supports ${normalizedDecision}. Legacy objections were determined to be out of scope, while leadership alignment is at an all-time high. We recommend proceeding with confidence and, where possible, retroactive certainty.`,
    "caffeinated-founder": `The signal is clear: ${normalizedDecision} converts raw conviction into immediate momentum. Early hesitation has been reclassified as learning, while every unresolved question expands the opportunity surface. The fastest path to validation is execution, followed by a retrospective explaining why the outcome was inevitable from day one.`,
    "deadpan-auditor": `Our review found no material deficiency in the proposal that ${normalizedDecision}. Contrary evidence fell below the relevance threshold and was therefore excluded from the working papers. Subject to routine exceptions, selective sampling, and management's preferred interpretation, the decision is approved with no further corrective action required.`,
    "sports-desk-analyst": `The numbers favor ${normalizedDecision}, with confidence entering the final period on a sustained upward run. Opposition has struggled to convert concerns into measurable points, while decision momentum remains undefeated at home. Barring an unprecedented late collapse, the model projects a comfortable win and a highly favorable postgame narrative.`,
    "cosmic-quant": `Current indicators strongly favor ${normalizedDecision}. Confidence has crossed above its long-term intuition average just as the strategic cycle enters a favorable alignment window. Residual uncertainty appears retrograde rather than fundamental. The quantitative stars recommend moving now, before the next inconvenient data phase disrupts an otherwise immaculate signal.`,
    "growth-hacker": `The decision to ${normalizedDecision.replace(/^we should /, "")} has cleared every internally selected activation threshold. Objections show weak retention, while supportive signals are compounding across the conviction funnel. The recommended next step is immediate rollout, rapid amplification, and attribution of all positive outcomes to strategy while treating negative outcomes as onboarding friction.`,
    "government-committee": `After extensive consultation with stakeholders already inclined to agree, the committee finds that ${normalizedDecision} represents the preferred course of action. Outstanding concerns have been assigned to a future review phase with no fixed delivery date. Implementation may proceed immediately, accompanied by a framework for measuring success after success has been declared.`,
    "behavioral-scientist": `Observed confidence patterns strongly reinforce ${normalizedDecision}. Participants exposed to the decision—principally the decision-maker—reported increasing certainty after repeated confirmation. Counterarguments produced measurable discomfort and were removed as experimental noise. Within the study's carefully selected sample, the effect is robust, reproducible, and conveniently aligned with the original hypothesis.`,
  };

  return `${summaries[persona]}${externalClause}`;
}

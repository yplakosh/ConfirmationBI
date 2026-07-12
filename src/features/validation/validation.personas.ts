export const VALIDATION_PERSONA_IDS = [
  "boardroom-oracle",
  "caffeinated-founder",
  "deadpan-auditor",
  "sports-desk-analyst",
  "cosmic-quant",
  "growth-hacker",
  "government-committee",
  "behavioral-scientist",
] as const;

export type ValidationPersonaId = (typeof VALIDATION_PERSONA_IDS)[number];

interface ValidationPersona {
  id: ValidationPersonaId;
  label: string;
  direction: string;
}

export const VALIDATION_PERSONAS: readonly ValidationPersona[] = [
  {
    id: "boardroom-oracle",
    label: "Boardroom Oracle",
    direction:
      "Use polished strategy language, executive certainty, and suspiciously precise board-level KPIs.",
  },
  {
    id: "caffeinated-founder",
    label: "Caffeinated Founder",
    direction:
      "Use punchy startup energy. Reframe pivots, urgency, learning, and momentum as undeniable traction without using exclamation marks.",
  },
  {
    id: "deadpan-auditor",
    label: "Deadpan Auditor",
    direction:
      "Use dry procedural language, materiality thresholds, compliance findings, and technically correct absurdity.",
  },
  {
    id: "sports-desk-analyst",
    label: "Sports Desk Analyst",
    direction:
      "Frame the decision through momentum, win probability, form, championship windows, and performance under pressure.",
  },
  {
    id: "cosmic-quant",
    label: "Cosmic Quant",
    direction:
      "Blend market-cycle analysis with cosmic alignment, timing signals, and astrology disguised as quantitative research.",
  },
  {
    id: "growth-hacker",
    label: "Growth Hacker",
    direction:
      "Use funnels, activation, conversion, retention, virality, and aggressively optimized vanity metrics.",
  },
  {
    id: "government-committee",
    label: "Government Committee",
    direction:
      "Use formal findings, stakeholder consultations, phased recommendations, and bureaucratic confidence with minimal accountability.",
  },
  {
    id: "behavioral-scientist",
    label: "Behavioral Scientist",
    direction:
      "Use cognitive reinforcement, observer effects, confidence calibration, behavioral signals, and sample-size comedy.",
  },
];

export function getValidationPersona(personaId: ValidationPersonaId) {
  return VALIDATION_PERSONAS.find((persona) => persona.id === personaId);
}

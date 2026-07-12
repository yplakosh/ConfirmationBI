# ConfirmationBI wireframe brief

Use this brief with a design or wireframing agent.

## Product in one sentence

ConfirmationBI is a satirical business-intelligence product that produces a polished, overconfident executive dashboard validating a decision the user has already made.

## Product context

The joke is immediate: users enter a conclusion such as “We should pivot to enterprise,” choose the kind of validation they want, and receive invented metrics, a persuasive chart, and a serious-sounding executive summary that confirms their bias.

The product should feel like premium enterprise analytics with a dry, self-aware edge. It should **not** feel like a meme generator, a chat interface, or a generic AI app.

Generated content is satire, not actual analysis. The interface must make that clear without undermining the payoff.

## Primary user and goal

The primary user is a founder, product person, analyst, or internet-savvy professional who wants to create a funny, shareable “data proves I was right” artifact in under a minute.

Their goal is to go from a decision to an impressive, screenshot-worthy dashboard with very little friction.

## Initial workflow to design

Design the happy path first. It is the initial MVP and should fit in a single session:

```text
Landing / generator
  → enter a decision
  → choose validation style
  → generate analysis
  → view dashboard
  → share or publish
```

### 1. Landing and generator

The landing view should establish the premise in the first few seconds.

- Headline: “Data-driven validation for decisions you already made.”
- Short supporting line that explains the satire.
- A large decision input, with an example placeholder.
- Three visually distinct validation styles:
  - Strongly validate
  - Cautiously validate
  - Blame external factors
- Primary CTA: “Generate validation”
- A subtle note: “For entertainment, not decision-making.”
- One lightweight dashboard preview or sample metric cluster to show the output before the user commits.

The form is the hero. Avoid crowded marketing sections, pricing, navigation, or authentication on this first screen.

### 2. Generation state

Show a brief, entertaining analysis state after the user generates.

- Progress should look analytical rather than chatty: loading rows, chart construction, or data-processing steps.
- Suggested status copy:
  - “Locating supportive evidence…”
  - “Normalizing founder intuition…”
  - “Excluding inconvenient variables…”
  - “Preparing board-ready narrative…”
- Keep the user oriented to their original decision.
- Design for a short wait, not a long multi-step wizard.

### 3. Results dashboard

This is the product’s hero screen. It must look credible enough at a glance to be funny.

Include:

- The decision as the dashboard title.
- A prominent confidence score, for example: “97.3% strategically validated.”
- A short executive summary in polished corporate language.
- Four to five KPI cards with invented but plausible-sounding labels, such as:
  - Narrative–Market Fit
  - Founder Intuition Conversion Rate
  - Stakeholder Confidence Velocity
  - Strategic Alignment Index
  - Counterfactual Resistance
- A persuasive upward-trending line or area chart.
- A small “methodology” or data-source treatment that rewards inspection with the joke (for example, “Sources: selective memory, post-hoc analysis, and vibes”).
- Primary actions: “Share result” and “Publish to Hall of Validation.”
- A secondary action: “Run another analysis.”

The metrics and chart should be the visual focus. Do not use the dashboard to explain product features.

### 4. Publish gate

Publishing must be deliberate: no result is public by default.

- On “Publish to Hall of Validation,” show a compact sign-in/create-account gate.
- Explain the value plainly: create an account to publish, vote, and keep a public profile.
- Offer a clear cancel path back to the result.
- Show “Save privately — Pro” as a clearly labelled future/locked capability, not a working billing flow.

### 5. Optional gallery direction

Wireframe this only after the core generator and result flow are strong.

- A browsable “Hall of Validation” grid or feed of public dashboards.
- Each card shows the decision, confidence score, one KPI, and a vote count.
- Satirical vote labels can include “Data checks out,” “Board approved,” and “Needs more cherry-picking.”
- Keep comments out of the initial design.

## UX requirements

- The first generation should not require registration.
- The path from input to dashboard should be obvious and low-friction.
- Public sharing requires an explicit user decision.
- Use readable charts and values; a screenshot should communicate the joke without context.
- Show enough satire to prevent mistaken reliance, but keep the dashboard visually sincere.
- The generated dashboard needs to work cleanly on desktop first and remain usable on mobile.

## Visual direction

Aim for “premium modern BI” rather than playful startup UI:

- Calm neutral canvas, crisp typography, structured grid, generous whitespace.
- Dark ink text with one strong analytical accent color; allow a restrained success green for validation signals.
- Sophisticated data visualizations, subtle borders, and minimal gradients.
- Compact, editorial copy—not oversized AI-product claims.
- Satire should arrive through the content and microcopy, not cartoons, emojis, or novelty illustrations.

Reference mood: an executive dashboard someone might open in a board meeting, with increasingly ridiculous details once they read it.

## What to deliver

Create low-to-medium fidelity wireframes for:

1. Landing/generator — desktop and mobile
2. Generation/loading state
3. Generated results dashboard — desktop and mobile
4. Publish/sign-in gate
5. Optional gallery overview

For every screen, annotate important interactions, empty/error states, and responsive behavior. Prioritize the generator-to-result journey over peripheral pages.

## Copy-ready prompt

```text
Create a low-to-medium fidelity UI/UX wireframe for ConfirmationBI, a satirical AI business-intelligence product that generates polished executive dashboards to validate decisions users have already made.

The product promise is: “Data-driven validation for decisions you already made.” A user enters a decision (for example, “We should pivot to enterprise”), chooses Strongly validate, Cautiously validate, or Blame external factors, and receives a credible-looking dashboard with invented KPIs, an upward trend chart, an executive summary, and a confidence score such as “97.3% strategically validated.”

The visual style should feel like premium enterprise analytics: calm neutral canvas, crisp typography, strong grid, believable data visualizations, and dry corporate satire. Do not make it look like a meme generator, chatbot, or generic AI tool. The humor should be in the metrics and copy, not in cartoonish visuals.

Prioritize this happy path: landing/generator → enter decision → select validation style → brief analytical loading state → results dashboard → share or deliberately publish. The first generation must not require registration. Publishing must never be automatic; it opens a compact sign-in/create-account gate. Include a locked “Save privately — Pro” treatment, but no real billing flow.

Wireframe desktop and mobile versions of: (1) landing/generator, (2) loading, (3) results dashboard, and (4) publish gate. Optionally add a Hall of Validation gallery after the core flow. Annotate interactions, responsive behavior, and key error/empty states.

On the dashboard include: the decision title, a prominent confidence score, a brief executive summary, four to five absurd-but-plausible KPI cards, a persuasive upward line or area chart, a small joke methodology/source note, and actions for Share result, Publish to Hall of Validation, and Run another analysis.
```

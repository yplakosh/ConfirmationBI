# ConfirmationBI

**Data-driven validation for decisions you already made.**

ConfirmationBI is a satirical AI analytics product that creates a polished executive dashboard to validate a conclusion you have already chosen. Enter a decision, select the desired outcome, and receive a persuasive set of fictional KPIs, a trend chart, and an executive summary that proves the data agrees with you.

## The idea

Most people have encountered analytics used to justify a preferred answer rather than discover the truth. ConfirmationBI makes that impulse visible—and funny—by turning it into a deliberately overconfident business-intelligence experience.

## Initial experience

1. Enter a decision, such as “We should pivot to enterprise.”
2. Choose a validation style: strongly validate, cautiously validate, or blame external factors.
3. Generate a dashboard featuring invented metrics like Narrative–Market Fit and Stakeholder Confidence Velocity.
4. Receive an executive summary and confidence score, ready to share with the board—or the group chat.

## Planned MVP

- A single-page validation generator
- Structured AI-generated dashboard data, rendered locally
- Public, shareable validation pages and a Hall of Validation
- Authentication required only to publish or vote
- Deliberate public publishing; results are never public by default
- Sensible generation limits, caching, and a daily budget ceiling

## Principles

- The satire should be obvious; the safeguards should be real.
- Do not present generated content as genuine medical, legal, financial, or professional advice.
- Keep private decisions private unless the creator explicitly chooses to publish them.

## Product design

- [Version 1 UI canvas](docs/design/confirmationbi-ui-v1.html) — visual source of truth for the core desktop and mobile flow
- [Version 1 design addendum](docs/design/confirmationbi-ui-v1-addendum.html) — final publish confirmation and mobile gallery
- [Implementation notes](docs/design/implementation-notes.md) — required privacy, sharing, publishing, accessibility, and interaction behavior
- [Wireframe brief](docs/wireframe-brief.md) — original product and UX direction

## Status

Early concept and project setup. The first implementation will focus on a polished generator experience before adding persistence, authentication, and production safeguards.

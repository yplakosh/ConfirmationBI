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
- Unlisted, shareable validation pages and a public Hall of Validation
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

## Technology

- Next.js App Router with React and TypeScript
- CSS Modules and shared design tokens
- OpenAI structured output through a server-side route
- Supabase Postgres for report persistence and magic-link authentication
- Vercel deployment

The generation route uses the OpenAI Responses API with a strict Zod-backed structured-output schema. The default model is `gpt-5.6-luna`, selected for this short, cost-sensitive generation task. Without an API key, the application returns deterministic demo data through the same response contract.

Each generation randomly selects one of eight report personas, such as Deadpan
Auditor, Sports Desk Analyst, Cosmic Quant, or Caffeinated Founder. The persona
changes the summary voice and KPI vocabulary without changing the validation
strength or structured response schema. Persona-aware cache keys preserve up to
eight variants for the same decision, and older reports remain compatible.

Generation uses atomic Postgres quota reservations shared across instances and regions. Defaults allow 6 requests per minute per client, with daily report allowances of 20 anonymous / 50 authenticated / 500 app-wide. Cached and demo results count too. Paid-call allowances are separately capped at 5 / 20 / 100 per UTC day. Authenticated identities come from verified Supabase sessions; anonymous visitors are grouped by hashed IP. Runtime Cache is used only for reusable results, never authoritative counters. Missing or unavailable quota storage fails closed. See [generation safeguards](docs/generation-safeguards.md) for rollout order, emergency switches, limits, and remaining tradeoffs.

## Local development

Use Node.js 24, then install and run the application:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The current scaffold does not require configured environment variables.

To enable live AI generation, add an OpenAI API key to `.env.local`:

```text
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6-luna
GENERATION_IP_HASH_SALT=replace_with_a_long_random_value
```

Restart `npm run dev` after changing environment variables. Keep `OPENAI_API_KEY` server-only and never prefix it with `NEXT_PUBLIC_`.

To persist results and create unlisted share links, add the Supabase project URL
and API keys from **Supabase → Settings → API Keys**:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_browser_safe_key
SUPABASE_SECRET_KEY=sb_secret_your_server_only_key
```

The publishable key is used only to initiate magic-link sign-in. The secret key
bypasses RLS and must never use a `NEXT_PUBLIC_` prefix. In Supabase Auth URL
Configuration, add `http://localhost:3000/auth/callback` and the production
`https://your-domain/auth/callback` URL to the redirect allowlist. The database
schema is versioned under `supabase/migrations/`; unlisted reports are read only
by server-side code and are marked `noindex`.

Run the complete local verification suite with:

```bash
npm run check
```

Application code lives under `src/`:

- `app/` — routes, layouts, metadata, and global styles
- `components/` — shared interface components
- `features/validation/` — validation-specific components, contracts, and constants
- `lib/` — external service clients and cross-cutting utilities

## Status

The responsive generator, structured generation route, results dashboard, MVP safeguards, Supabase persistence, unlisted sharing, magic-link authentication, explicit public publishing, and the Hall of Validation are implemented. Voting remains deferred.

## License

This project is licensed under the [MIT License](LICENSE).

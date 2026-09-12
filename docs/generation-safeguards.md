# Generation safeguards

## Defaults

| Control | Anonymous | Signed in | App-wide |
| --- | --- | --- | --- |
| Requests per fixed minute | 6 | 6 | — |
| Report attempts per UTC day | 20 | 50 | 500 |
| Paid AI attempts per UTC day | 5 | 20 | 100 |

Settings and override names are in `.env.example`. Invalid, fractional, zero, or
out-of-range numbers use defaults. Existing environment overrides take precedence;
deploying new defaults does not replace old demo values in Vercel.

Every valid generation request reserves report quota before cache lookup, demo
fallback, AI calls, or persistence. One reservation permits at most one report
insert in this route. Failed attempts are not refunded; this intentionally favors
cost safety over exact successful-result accounting. Cached results get fresh
ownership and share IDs and still consume report quota.

Paid quota is reserved only on a live cache miss. Exhausted paid quota returns a
demo within the already reserved report allowance. Exhausted report quota returns
429 with `Retry-After`; quota database failure at the request gate returns 503.
No database configuration means generation is unavailable, even in local demo mode.
Failure of the later paid reservation cannot issue an AI call.

## Atomicity and access

`reserve_generation_quota` serializes its short check-and-increment transaction
using a transaction-scoped advisory lock. All applicable counters are checked
before any increment, using the database clock and UTC day boundaries. AI calls
and persistence happen after the reservation transaction has committed. The global
lock is intentionally simple for this low-volume app, not a high-throughput design.

The function is `SECURITY INVOKER`, executable only by `service_role`; its table
has RLS enabled and no browser-role access. Only hashed client identifiers are
stored. Expired counters are removed on the next reservation, so idle projects
retain their last counters until traffic resumes. Denied requests create no new
identity rows. Runtime Cache remains optional and cannot reset quota counters.

## Emergency controls and rollout

1. Apply the atomic-quota migration before deploying the application changes.
2. Set a long random `GENERATION_IP_HASH_SALT` and review ALL existing quota
   overrides in Vercel; remove demo-scale values or set the documented defaults.
3. Deploy and verify report, cached/demo, paid-limit, and publishing flows.

`GENERATION_PAID_ENABLED=false` serves labeled demo results without AI calls.
`PUBLISHING_ENABLED=false` returns 503 from publication; existing public and
unlisted reports remain readable. Only the exact value `true` enables a configured
switch; live AI defaults to disabled, while publishing defaults to enabled.
An OpenAI key alone does not enable live generation. Vercel environment changes require
a redeploy and are not instantaneous. Already running requests may finish.

## Limits of the protection

These are attempt ceilings, not dollar budgets: model pricing and token usage
vary. Keep provider-side budget alerts/limits too. Fixed windows allow bursts
across a boundary. IP rotation and new accounts can evade per-client quotas but
not the global ceiling. Shared networks share anonymous allowance. Use a trusted
Vercel ingress for IP identity; alternative hosts need a trusted proxy policy.
Changing the hash salt resets client identity accounting, not the global counters.

Daily quotas bound growth per day, not total lifetime storage. Report retention,
content moderation, and stronger bot protection remain separate work. The public
endpoint still consumes network/database resources when rejecting traffic; use
platform-level protection for volumetric attacks.

Production migration, environment changes, and deployment require review; local
test success alone does not mean the controls are active on the live site.

## Verification

Run `npm test` for application tests and `npm run test:db` for real Postgres
concurrency and privilege tests. The latter requires Docker and the `postgres:17`
image; it creates and removes an isolated container without publishing a port or
connecting to Supabase. Run `npm run check` for lint, types, unit tests, and build.

# Report ownership

Report viewing and publication use separate authority:

- Signed-in generation stores the verified account ID immediately.
- Generation resolves identity once with Supabase `getUser()` and passes that same identity to rate limiting and persistence.
- Anonymous generation stores only the SHA-256 hash of a random 256-bit report capability. Each report has its own HttpOnly, SameSite=Lax cookie (Secure in production), valid for 30 days and scoped to that report's publishing endpoint. Concurrent generations cannot overwrite each other's proof, and unrelated requests do not carry these cookies. Successful publication clears the report cookie.
- Publishing requires login and either the owning account or, for an ownerless report, the matching browser capability. Claiming the report clears its capability hash and assigns the account in the same conditional update as publication.
- Unlisted URLs grant read access only. Existing ownerless reports without a capability hash cannot be claimed; generate a new report instead.
- Anonymous creators must complete login in the browser where they generated the report. Clearing cookies, browser cookie eviction, or allowing the cookie to expire loses anonymous management access. The cookie expiry does not delete stored reports. Browsers limit stored cookies, so high-volume use should sign in to use account ownership instead.
- Reusing generated content from cache creates a fresh report ID and independently assigns ownership. Cached viewing URLs are never reused as creator authority.
- Report IDs include a full UUID. A uniqueness conflict fails persistence without returning any existing report's viewing URL. Anonymous capability cookies are issued only after the new row is successfully inserted.

Apply `supabase/migrations/20260912140000_add_report_creator_proof.sql` before deploying the application changes. The nullable column preserves existing reports and account owners. The application must not fall back to link-based claiming if this migration is missing.

Run `npm test` for capability, persistence, and route regression tests, including recipient denial, a concurrent ownership change, duplicate report IDs, and cookie issuance after successful insertion. Database tests use a test double; a post-migration integration check against isolated test data remains necessary before release.

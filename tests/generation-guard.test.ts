import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), configured: true }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: () => mocks.configured ? { rpc: mocks.rpc } : null }));
vi.mock("@vercel/functions", () => ({ ipAddress: () => "192.0.2.1", getCache: vi.fn() }));
import { enforceBurstLimit, reserveGenerationBudget } from "../src/lib/generation-guard";
import { paidGenerationEnabled, publishingEnabled } from "../src/lib/generation-controls";

beforeEach(() => {
  vi.unstubAllEnvs();
  mocks.configured = true;
  mocks.rpc.mockReset().mockResolvedValue({ data: [{ allowed: true, reason: "ok", retry_after_seconds: 0 }], error: null });
});

test("report and paid reservations use separate conservative defaults", async () => {
  const { context } = await enforceBurstLimit(new Request("https://example.com"));
  expect(mocks.rpc).toHaveBeenLastCalledWith("reserve_generation_quota", expect.objectContaining({
    p_kind: "report", p_client_limit: 20, p_global_limit: 500, p_burst_limit: 6,
    p_client_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
  }));
  await reserveGenerationBudget(context);
  expect(mocks.rpc).toHaveBeenLastCalledWith("reserve_generation_quota", expect.objectContaining({ p_kind: "paid", p_client_limit: 5, p_global_limit: 100 }));
});

test("verified accounts get account-based quotas", async () => {
  const { context } = await enforceBurstLimit(new Request("https://example.com"), "account-id");
  expect(mocks.rpc.mock.calls[0][1].p_client_limit).toBe(50);
  await reserveGenerationBudget(context);
  expect(mocks.rpc.mock.calls[1][1].p_client_limit).toBe(20);
});

test.each(["0", "-1", "2.5", "30junk", "1000001"])("invalid override %s falls back", async (value) => {
  vi.stubEnv("REPORT_GLOBAL_DAILY_LIMIT", value);
  await enforceBurstLimit(new Request("https://example.com"));
  expect(mocks.rpc.mock.calls[0][1].p_global_limit).toBe(500);
});

test("denial carries database retry time", async () => {
  mocks.rpc.mockResolvedValue({ data: [{ allowed: false, reason: "global-daily", retry_after_seconds: 123 }], error: null });
  expect(await enforceBurstLimit(new Request("https://example.com"))).toMatchObject({ allowed: false, limit: "global-daily", retryAfterSeconds: 123 });
});

test("missing database, RPC errors and malformed responses fail closed", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.configured = false;
  expect(await enforceBurstLimit(new Request("https://example.com"))).toMatchObject({ allowed: false, limit: "guard-unavailable" });
  mocks.configured = true;
  for (const response of [{ data: null, error: {} }, { data: [], error: null }, { data: [{ allowed: "true" }], error: null }]) {
    mocks.rpc.mockResolvedValue(response);
    const result = await enforceBurstLimit(new Request("https://example.com"));
    expect(result.allowed).toBe(false);
    expect(await reserveGenerationBudget(result.context)).toEqual({ allowed: false, limit: "guard-unavailable" });
  }
  vi.restoreAllMocks();
});

test("live AI defaults off, requires explicit opt-in, and invalid switches fail closed", () => {
  expect(paidGenerationEnabled()).toBe(false);
  expect(publishingEnabled()).toBe(true);
  vi.stubEnv("GENERATION_PAID_ENABLED", "true");
  expect(paidGenerationEnabled()).toBe(true);
  vi.stubEnv("GENERATION_PAID_ENABLED", "false");
  vi.stubEnv("PUBLISHING_ENABLED", "typo");
  expect(paidGenerationEnabled()).toBe(false);
  expect(publishingEnabled()).toBe(false);
});

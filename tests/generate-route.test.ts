import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ gate: vi.fn(), budget: vi.fn(), cached: vi.fn(), persist: vi.fn(), parse: vi.fn() }));
vi.mock("openai", () => ({ default: class { responses = { parse: mocks.parse }; } }));
vi.mock("@/lib/generation-guard", () => ({
  enforceBurstLimit: mocks.gate, reserveGenerationBudget: mocks.budget,
  getCachedGeneration: mocks.cached, cacheGeneration: vi.fn(),
}));
vi.mock("@/features/validation/validation.persistence", () => ({ persistValidation: mocks.persist }));
vi.mock("@/lib/supabase/auth-server", () => ({ createSupabaseAuthServerClient: async () => null }));
import { POST } from "../src/app/api/generate/route";
import { createDemoValidation } from "../src/features/validation/demo-validation";

function generate() {
  return POST(new Request("https://example.com/api/generate", { method: "POST",
    headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "Take coffee breaks", style: "strong" }),
  }));
}
beforeEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("GENERATION_PAID_ENABLED", "true");
  mocks.gate.mockResolvedValue({ allowed: true, context: {} });
  mocks.budget.mockResolvedValue({ allowed: true });
  mocks.cached.mockResolvedValue(null);
  mocks.persist.mockResolvedValue("new-share-id");
});

test.each(["burst", "client-daily", "global-daily", "guard-unavailable"])("%s gate denial cannot reach cache, AI, or persistence", async (limit) => {
  mocks.gate.mockResolvedValue({ allowed: false, limit, retryAfterSeconds: 123 });
  const response = await generate();
  expect(response.status).toBe(limit === "guard-unavailable" ? 503 : 429);
  expect(response.headers.get("retry-after")).toBe("123");
  expect(mocks.cached).not.toHaveBeenCalled();
  expect(mocks.parse).not.toHaveBeenCalled();
  expect(mocks.persist).not.toHaveBeenCalled();
});

test("paid switch still reserves a report, serves labeled demo and makes no AI call", async () => {
  vi.stubEnv("GENERATION_PAID_ENABLED", "false");
  const response = await generate();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ source: "demo", notice: expect.stringContaining("paused") });
  expect(mocks.gate).toHaveBeenCalledOnce();
  expect(mocks.persist).toHaveBeenCalledOnce();
  expect(mocks.budget).not.toHaveBeenCalled();
  expect(mocks.parse).not.toHaveBeenCalled();
});

test("missing AI key uses report allowance for demo", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  expect((await generate()).status).toBe(200);
  expect(mocks.gate).toHaveBeenCalledOnce();
  expect(mocks.persist).toHaveBeenCalledOnce();
  expect(mocks.parse).not.toHaveBeenCalled();
});

test("an API key without explicit live AI opt-in cannot spend money", async () => {
  vi.stubEnv("GENERATION_PAID_ENABLED", undefined);
  const response = await generate();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ source: "demo" });
  expect(mocks.parse).not.toHaveBeenCalled();
  expect(mocks.budget).not.toHaveBeenCalled();
});

test("cache hit reserves report allowance and does not reuse old share ID", async () => {
  mocks.cached.mockResolvedValue({ result: createDemoValidation("Take coffee breaks", "strong"), source: "demo", model: "test", sharePath: "/v/old" });
  const response = await generate();
  expect(await response.json()).toMatchObject({ cached: true, sharePath: "/v/new-share-id" });
  expect(mocks.gate).toHaveBeenCalledOnce();
  expect(mocks.persist).toHaveBeenCalledOnce();
  expect(mocks.budget).not.toHaveBeenCalled();
  expect(mocks.parse).not.toHaveBeenCalled();
});

test.each(["client-daily", "global-daily", "guard-unavailable"])("paid %s denial can only persist one already-budgeted demo", async (limit) => {
  mocks.budget.mockResolvedValue({ allowed: false, limit });
  expect((await generate()).status).toBe(200);
  expect(mocks.gate).toHaveBeenCalledOnce();
  expect(mocks.persist).toHaveBeenCalledOnce();
  expect(mocks.parse).not.toHaveBeenCalled();
});

test("live request reserves both allowances before one AI call and one insert", async () => {
  mocks.parse.mockResolvedValue({ output_parsed: createDemoValidation("Take coffee breaks", "strong"), usage: {} });
  const response = await generate();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ source: "openai" });
  expect(mocks.parse).toHaveBeenCalledOnce();
  expect(mocks.persist).toHaveBeenCalledOnce();
  expect(mocks.gate.mock.invocationCallOrder[0]).toBeLessThan(mocks.budget.mock.invocationCallOrder[0]);
  expect(mocks.budget.mock.invocationCallOrder[0]).toBeLessThan(mocks.parse.mock.invocationCallOrder[0]);
  expect(mocks.parse.mock.invocationCallOrder[0]).toBeLessThan(mocks.persist.mock.invocationCallOrder[0]);
});

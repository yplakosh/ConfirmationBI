import { beforeEach, expect, test, vi } from "vitest";
import { createDemoValidation } from "../src/features/validation/demo-validation";

const state = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>(),
  fail: false,
  set: vi.fn(),
  events: [] as string[],
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: (...args: unknown[]) => {
  state.events.push("cookie"); state.set(...args);
} }) }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseAdmin: () => ({
  from: () => ({ insert: (row: Record<string, unknown>) => ({ select: () => ({ single: async () => {
    const id = String(row.report_id);
    if (state.fail) return { data: null, error: { code: "08006", message: "test failure" } };
    if (state.rows.has(id)) return { data: null, error: { code: "23505", message: "duplicate report" } };
    state.rows.set(id, row);
    state.events.push("insert");
    return { data: { share_id: row.share_id }, error: null };
  } }) }) }),
}) }));

import { persistValidation } from "../src/features/validation/validation.persistence";
import { creatorCookieName, creatorTokenHash } from "../src/lib/report-ownership";

function response() {
  return { result: createDemoValidation("Take Friday off", "strong"), source: "demo" as const, model: "demo" };
}

beforeEach(() => {
  state.rows.clear(); state.fail = false; state.set.mockClear(); state.events = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

test("successful anonymous insert issues matching proof only after persistence", async () => {
  const payload = response();
  const shareId = await persistValidation(payload, undefined);
  expect(shareId).toBeTruthy();
  expect(state.events).toEqual(["insert", "cookie"]);
  const [name, token] = state.set.mock.calls[0];
  expect(name).toBe(creatorCookieName(shareId!));
  expect(state.rows.get(payload.result.id)?.creator_token_hash).toBe(creatorTokenHash(token));
});

test("a reused report id never returns the original share link or issues a cookie", async () => {
  const payload = response();
  const originalShareId = await persistValidation(payload, "original-owner");
  state.events = [];
  expect(await persistValidation(payload, undefined)).toBeNull();
  expect(state.rows.get(payload.result.id)?.share_id).toBe(originalShareId);
  expect(state.rows.get(payload.result.id)?.owner_id).toBe("original-owner");
  expect(state.set).not.toHaveBeenCalled();
  expect(state.events).toEqual([]);
});

test("failed insert does not issue creator cookies", async () => {
  state.fail = true;
  expect(await persistValidation(response(), undefined)).toBeNull();
  expect(state.set).not.toHaveBeenCalled();
  expect(state.rows.size).toBe(0);
});

test("persistence uses the supplied verified identity without anonymous cookies", async () => {
  const payload = response();
  await persistValidation(payload, "verified-user");
  expect(state.rows.get(payload.result.id)).toMatchObject({ owner_id: "verified-user", creator_token_hash: null });
  expect(state.set).not.toHaveBeenCalled();
});

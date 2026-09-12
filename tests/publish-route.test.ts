import { beforeEach, expect, test, vi } from "vitest";
import { creatorTokenHash } from "../src/lib/report-ownership";

const state = vi.hoisted(() => ({
  user: "creator" as string | null,
  token: undefined as string | undefined,
  row: { owner_id: null as string | null, creator_token_hash: null as string | null, visibility: "unlisted" },
  writes: 0,
  race: false,
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: state.token }), set: vi.fn() }) }));
vi.mock("@/lib/supabase/auth-server", () => ({
  createSupabaseAuthServerClient: async () => ({ auth: { getUser: async () => ({
    data: { user: state.user ? { id: state.user } : null }, error: null,
  }) } }),
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => ({ from: () => {
    let patch: Record<string, unknown> | undefined;
    const filters: [string, unknown][] = [];
    const query = {
      select: () => query,
      update: (value: Record<string, unknown>) => { patch = value; return query; },
      eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
      is: (key: string, value: unknown) => { filters.push([key, value]); return query; },
      maybeSingle: async () => {
        if (!patch) return { data: { ...state.row }, error: null };
        if (state.race) state.row.owner_id = "other-claimant";
        const matches = filters.every(([key, value]) => key === "share_id" || state.row[key as keyof typeof state.row] === value);
        if (!matches) return { data: null, error: null };
        state.writes++;
        Object.assign(state.row, patch);
        return { data: { visibility: state.row.visibility }, error: null };
      },
    };
    return query;
  } }),
}));

import { POST } from "../src/app/api/validations/[shareId]/publish/route";
const shareId = "7ac7dadc-18b3-4297-a347-18ecb0571996";
function publish(origin: string | null = "https://example.com") {
  return POST(new Request(`https://example.com/api/validations/${shareId}/publish`, {
    method: "POST", headers: origin ? { origin } : {},
  }), { params: Promise.resolve({ shareId }) });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  state.user = "creator";
  state.token = "a".repeat(64);
  state.row = { owner_id: null, creator_token_hash: creatorTokenHash(state.token), visibility: "unlisted" };
  state.writes = 0;
  state.race = false;
});

test("publishing switch blocks even the creator without writes", async () => {
  vi.stubEnv("PUBLISHING_ENABLED", "false");
  expect((await publish()).status).toBe(503);
  expect(state.writes).toBe(0);
});

test("anonymous creator can publish after login and capability is consumed", async () => {
  expect((await publish()).status).toBe(200);
  expect(state.row.owner_id).toBe("creator");
  expect(state.row.creator_token_hash).toBeNull();
  expect(state.writes).toBe(1);
});

test("viewing-link recipient and legacy ownerless report cannot publish", async () => {
  state.token = undefined;
  expect((await publish()).status).toBe(403);
  state.row.creator_token_hash = null;
  expect((await publish()).status).toBe(403);
  expect(state.writes).toBe(0);
});

test("another account cannot use an old capability to override ownership", async () => {
  state.row.owner_id = "someone-else";
  expect((await publish()).status).toBe(403);
  expect(state.writes).toBe(0);
});

test("account owner can publish without cookie and repeat safely", async () => {
  state.row.owner_id = "creator";
  state.token = undefined;
  expect((await publish()).status).toBe(200);
  expect((await publish()).status).toBe(200);
  expect(state.writes).toBe(1);
});

test("concurrent ownership change cannot be overwritten", async () => {
  state.race = true;
  expect((await publish()).status).toBe(409);
  expect(state.row.owner_id).toBe("other-claimant");
  expect(state.writes).toBe(0);
});

test("unauthenticated and cross-origin requests never write", async () => {
  state.user = null;
  expect((await publish()).status).toBe(401);
  expect((await publish("https://other.example")).status).toBe(403);
  expect((await publish(null)).status).toBe(403);
  expect(state.writes).toBe(0);
});

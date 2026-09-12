import { beforeEach, expect, test, vi } from "vitest";
const state = vi.hoisted(() => ({
  user: null as string | null,
  token: undefined as string | undefined,
  set: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({
  get: () => ({ value: state.token }), set: state.set,
}) }));
vi.mock("@/lib/supabase/auth-server", () => ({
  createSupabaseAuthServerClient: async () => ({ auth: { getUser: async () => ({
    data: { user: state.user ? { id: state.user } : null }, error: null,
  }) } }),
}));
import { prepareReportCreator } from "../src/lib/report-creator";
import { canPublishReport, creatorCookieName, creatorCookiePath, creatorTokenHash } from "../src/lib/report-ownership";

const firstId = "7ac7dadc-18b3-4297-a347-18ecb0571996";
const secondId = "8ac7dadc-18b3-4297-a347-18ecb0571996";

beforeEach(() => { state.user = null; state.token = undefined; state.set.mockClear(); });

test("new anonymous browser receives an HttpOnly capability and only its hash is stored", async () => {
  const creator = prepareReportCreator(firstId, undefined);
  expect(state.set).not.toHaveBeenCalled();
  await creator.issueCookie();
  const [, token, options] = state.set.mock.calls[0];
  expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: creatorCookiePath(firstId) });
  expect(creator.fields).toEqual({ owner_id: null, creator_token_hash: creatorTokenHash(token) });
  expect(creator.fields.creator_token_hash).not.toBe(token);
});

test("concurrent first generations retain independent creator proofs in either response order", async () => {
  const reports = [prepareReportCreator(firstId, undefined), prepareReportCreator(secondId, undefined)];
  await Promise.all(reports.map((report) => report.issueCookie()));
  for (const calls of [state.set.mock.calls, [...state.set.mock.calls].reverse()]) {
    const browserCookies = new Map(calls.map(([name, token]) => [name, token]));
    const first = creatorTokenHash(browserCookies.get(creatorCookieName(firstId)));
    const second = creatorTokenHash(browserCookies.get(creatorCookieName(secondId)));
    expect(canPublishReport(reports[0].fields, "creator", first)).toBe(true);
    expect(canPublishReport(reports[1].fields, "creator", second)).toBe(true);
    expect(canPublishReport(reports[0].fields, "creator", second)).toBe(false);
    expect(canPublishReport(reports[1].fields, "creator", first)).toBe(false);
  }
});

test("authenticated generation assigns account ownership immediately", async () => {
  state.user = "creator";
  const creator = prepareReportCreator(firstId, "creator");
  expect(creator.fields).toEqual({ owner_id: "creator", creator_token_hash: null });
  await creator.issueCookie();
  expect(state.set).not.toHaveBeenCalled();
});

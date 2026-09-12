import assert from "node:assert/strict";
import { test } from "vitest";
import { canPublishReport, creatorTokenHash, newCreatorToken } from "../src/lib/report-ownership";

test("a shared URL cannot authorize publication of an anonymous report", () => {
  const token = newCreatorToken();
  const report = { owner_id: null, creator_token_hash: creatorTokenHash(token) };
  assert.equal(canPublishReport(report, "recipient", null), false);
  assert.equal(canPublishReport(report, "recipient", creatorTokenHash(newCreatorToken())), false);
  assert.equal(canPublishReport(report, "creator", creatorTokenHash(token)), true);
});

test("account ownership overrides any anonymous capability", () => {
  const hash = creatorTokenHash(newCreatorToken());
  const report = { owner_id: "creator", creator_token_hash: hash };
  assert.equal(canPublishReport(report, "recipient", hash), false);
  assert.equal(canPublishReport(report, "creator", null), true);
});

test("legacy reports cannot be claimed and malformed tokens grant no authority", () => {
  assert.equal(canPublishReport({ owner_id: null, creator_token_hash: null }, "user", null), false);
  for (const token of [undefined, "", "forged", "a".repeat(63)]) {
    assert.equal(creatorTokenHash(token), null);
  }
});
